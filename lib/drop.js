var _ = require('underscore')
, WebSocket = require('ws')
, debug = require('debug')('drop')
, assert = require('assert')
, util = require('util')
, EventEmitter = require('events').EventEmitter
, Q = require('q')
, Amount = require('./Amount')

// construct with string to set uri only
// or { uri: 'wss://s1.ripple.com' }
// optional callback
var Drop = module.exports = function(opts, cb) {
    if (_.isFunction(opts)) {
        cb = opts
        opts = null
    }

    this.opts = _.defaults(_.isString(opts) ? { uri: opts } : opts || {}, {
        uri: 'wss://s1.ripple.com:51233',
        secrets: {}
    })

    this.queue = []
    this.sent = []
    this.subs = {
        server: [],
        ledger: [],
        transactions: [],
        accounts: {}
    }

    debug('connecting to %s', this.opts.uri)
    this.socket = new WebSocket(this.opts.uri, cb)
    this.socket.on('open', this.onOpen.bind(this))
    this.socket.on('message', this.onMessage.bind(this))
    this.socket.on('close', this.onClose.bind(this))
    this.socket.on('error', this.onError.bind(this))
    cb && this.socket.once('open', cb)
}

util.inherits(Drop, EventEmitter)

Drop.Amount = Amount

Drop.prototype.onOpen = function() {
    debug('socket open')

    this.queue.forEach(function(item) {
        this.send(item.message, item.deferred)
    }, this)
}

Drop.prototype.onClose = function() {
    debug('socket closed')
}

// TODO: function is too long
Drop.prototype.onMessage = function(data, flags) {
    var message = JSON.parse(data)
    , deferred = this.sent[message.id]
    this.sent[message.id] = null

    debug('socket message %s', util.inspect(message, null, 100))

    if (message.type == 'response') {
        if (message.status == 'error') {
            var error = new Error(message.error_message)
            error.code = message.error_code
            error.name = message.error
            return deferred.reject(error)
        }

        if (message.status == 'success') {
            debug('message is a success response, resolving deferred to %j', message.result)
            return deferred.resolve(message.result)
        }

        throw new Error('not implemented status ' + message.status)
    }

    if (_.isUndefined(message.type)) {
        throw new Error('message type is undefined, not sure how to handle it')
    }

    var subs = []

    if (~['ledgerClosed'].indexOf(message.type)) {
        subs = subs.concat(this.subs.ledger)
    }

    if (~['account'].indexOf(message.type)) {
        _.each(this.subs.accounts, function(cb, addr) {
            if (message.transaction.Account == addr ||
                message.transaction.Destination == addr) {
                subs.push(cb)
            }
        })
    }

    if (!subs.length) {
        return debug('received message of type %s to which there are no subs', message.type)
    }

    subs.forEach(function(s) {
        s(message)
    })
}

Drop.prototype.onError = function(err) {
    debug('socket error %j', er)
}

Drop.prototype.send = function(message, deferred) {
    deferred || (deferred = Q.defer())

    if (this.socket.readyState != WebSocket.OPEN) {
        debug('queueing message')
        this.queue.push({ message: message, deferred: deferred })
        return deferred.promise
    }

    this.sent[message.id = this.sent.length] = deferred

    var censored = util.inspect(message, null, 10).replace(/secret\: [^\s]+/g, 'secret: *** SECRET ***')
    debug('sending %s', censored)

    this.socket.send(JSON.stringify(message))

    return deferred.promise
}

Drop.prototype.ping = function(streams) {
    var now = +new Date()

    return this.send({
        command: 'ping'
    }).then(function(response) {
        return +new Date() - now
    })
}

// subs = {
//   accounts: { '123': cb1, '234': cb2 }
//   server: cb
//   ledger: cb
//   transactions: cb
// }
// ledgerIndex optional
Drop.prototype.subscribe = function(subs, ledgerIndex) {
    var that = this
    var request = {
        command: 'subscribe'
    }

    if (!_.isUndefined(ledgerIndex)) {
        request.ledger_index = ledgerIndex
    }

    ['server', 'ledger', 'transactions'].forEach(function(name) {
        if (subs[name]) {
            (request.streams || (request.streams = [])).push(name)
        }
    })

    if (subs.accounts) {
        request.accounts = []
        _.keys(subs.accounts).forEach(function(a) {
            request.accounts.push(a)
        })
    }

    return this.send(request)
    .then(function(result) {
        ['server', 'ledger', 'transactions'].forEach(function(name) {
            if (!subs[name]) return
            that.subs[name].push(subs[name])
        })

        if (subs.accounts) {
            _.each(subs.accounts, function(v, k) {
                that.subs.accounts[k] = v
            })
        }

        return result
    })
}

Drop.prototype.account = function(account) {
    return this.send({
        command: 'account_info',
        ident: account
    })
}

Drop.prototype.transact = function(tx) {
    assert(this.opts.secrets[tx.Account])
    assert(tx.TransactionType)

    var tx_json = _.defaults(tx, {
        Flags: 0
    })

    debug('tx_json %s', util.inspect(tx_json, null, 4))

    return this.send({
        command: 'submit',
        secret: this.opts.secrets[tx.Account],
        tx_json: tx_json
    })
    .then(function(result) {
        if (result.engine_result == 'tesSUCCESS') {
            return result.tx_json
        }

        var error = new Error(result.engine_result_message)
        error.name = result.engine_result
        error.code = result.engine_result_code
        throw error
    })
}

function splitAddress(s) {
    var m = s.match(/^([^:]+)(?::(\d+))?$/)
    return {
        address: m[1],
        tag: m[2] ? +m[2] : null
    }
}

Drop.prototype.payment = function(from, to, amount) {
    var fromSplit = splitAddress(from)
    , toSplit = splitAddress(to)
    , tx = {
        TransactionType: 'Payment',
        Account: fromSplit.address,
        Amount: new Amount(amount),
        Destination: toSplit.address,
    }
    if (fromSplit.tag != null) tx.SourceTag = fromSplit.tag
    if (toSplit.tag != null) tx.DestinationTag = toSplit.tag
    return this.transact(tx)
}

Drop.prototype.createOffer = function(account, from, to) {
    return this.transact({
        TransactionType: 'OfferCreate',
        TakerGets: new Amount(from),
        TakerPays: new Amount(to),
        Account: account,
    })
}

Drop.prototype.accountLines = function(account) {
    return this.send({
        command: 'account_lines',
        account: account
    }).get('lines')
}

Drop.prototype.transaction = function(hash) {
    return this.send({
        command: 'tx',
        transaction: hash
    })
}

Drop.prototype.accountTransactions = function(account, min, max) {
    var msg = {
        command: 'account_tx',
        account: account
    }

    if (arguments.length == 3 && min != max) {
        msg.ledger_index = -1
        msg.ledger_min = min
        msg.ledger_max = max
    } else if (arguments.length == 2) {
        msg.ledger_index = min
    }

    return this.send(msg).then(function(msg) {
        return msg.transactions || []
    })
}

Drop.prototype.subscribeBook = function(from, to, fromIssuer, toIssuer) {
    var book = {
        CurrencyIn: from,
        CurrencyOut: to
    }

    if (fromIssuer) book.IssuerIn = fromIssuer
    if (toIssuer) book.IssuerOut = toIssuer

    return this.send({
        command: 'subscribe',
        books: [book]
    })
}

Drop.prototype.ledger = function(ledger, full) {
    return this.send({
        command: 'ledger',
        ledger: ledger,
        full: full || false
    }).get('ledger')
}

Drop.prototype.cancelOffer = function(account, seq) {
    return this.transact({
        TransactionType: 'OfferCancel',
        Account: account,
        OfferSequence: seq
    })
}

Drop.prototype.accountOffers = function(account) {
    return this.send({
        command: 'account_offers',
        account: account
    }).get('offers')
}
