var _ = require('lodash')
, WebSocket = require('ws')
, debug = require('debug')('drop')
, assert = require('assert')
, util = require('util')
, EventEmitter = require('events').EventEmitter
, convert = require('./convert')

// construct with string to set uri only
// or { uri: 'wss://s1.ripple.com' }
// optional callback
var Drop = module.exports = function(opts, cb) {
    _.bindAll(this)

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
    this.socket.on('open', this.onOpen)
    this.socket.on('message', this.onMessage)
    this.socket.on('close', this.onClose)
    this.socket.on('error', this.onError)
    cb && this.socket.once('open', cb)
}

util.inherits(Drop, EventEmitter)

Drop.prototype.close = function() {
    this.socket.close()
    this.socket = null
}

Drop.prototype.onOpen = function() {
    var that = this

    debug('socket open')

    this.emit('open')

    debug('sending %s queued message(s)', this.queue.length)

    this.queue.forEach(function(item) {
        that.send(item.message, item.callback)
    })
}

Drop.prototype.onClose = function() {
    debug('socket closed')
    this.emit('close')
}

// TODO: function is too long
Drop.prototype.onMessage = function(data) {
    var message = JSON.parse(data)
    , cb = this.sent[message.id]
    this.sent[message.id] = null

    debug('socket message %s',
        censor(util.inspect(message, null, 100)))

    if (message.type == 'response') {
        if (message.status == 'error') {
            var err = new Error(message.error_message)
            err.code = message.error_code
            err.name = message.error
            return cb(err)
        }

        if (message.status == 'success') {
            return cb(null, message.result)
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

    if (~['transaction'].indexOf(message.type)) {
        _.each(this.subs.accounts, function(cb, addr) {
            if (message.transaction.Account == addr ||
                message.transaction.Destination == addr
            ) {
                subs.push(cb)
            }

            message = convert.fromTheirTransaction(message.transaction)
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
    console.error('socket error %j', err.message)
    this.emit('error', err)
}

// returns true if message was sent, false is queued
Drop.prototype.send = function(message, cb) {
    if (this.socket.readyState != WebSocket.OPEN) {
        debug('queueing message')
        this.queue.push({ message: message, callback: cb })
        return false
    }

    this.sent[message.id = this.sent.length] = cb

    var censored = censor(util.inspect(message, null, 10))
    debug('sending %s', censored)

    this.socket.send(JSON.stringify(message))

    return true
}

function censor(s) {
    return s.replace(/secret\: ['"]?[A-Za-z0-9]+["']?/g, 'secret: *** SECRET ***')
}

Drop.prototype.ping = function(cb) {
    var now = +new Date()
    this.send({ command: 'ping' }, function(err) {
        cb(err, err ? null : new Date() - now)
    })
}

// subs = {
//   accounts: { '123': cb1, '234': cb2 }
//   server: cb
//   ledger: cb
//   transactions: cb
// }
// ledgerIndex optional
// or subscribe(address, messageCb, cb)
Drop.prototype.subscribe = function(subs, ledgerIndex, cb) {
    var that = this
    , request = {
        command: 'subscribe'
    }

    if (cb === undefined) {
        cb = ledgerIndex
    } else {
        request.ledger_index = ledgerIndex
    }

    if (typeof subs == 'string') {
        var accounts = {}
        accounts[subs] = ledgerIndex

        subs = {
            accounts: accounts
        }
    }

    var types = ['server', 'ledger', 'transactions']

    types.forEach(function(name) {
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

    this.send(request, function(err) {
        if (err) return cb && cb(err)

        var types = ['server', 'ledger', 'transactions']

        types.forEach(function(name) {
            if (!subs[name]) return
            that.subs[name].push(subs[name])
        })

        if (subs.accounts) {
            _.each(subs.accounts, function(v, k) {
                that.subs.accounts[k] = v
            })
        }

        cb && cb()
    })
}

Drop.prototype.account = function(account, cb) {
    this.send({
        command: 'account_info',
        ident: account
    }, cb)
}

Drop.prototype.submit = function(tx, cb) {
    assert(this.opts.secrets[tx.Account])
    assert(tx.TransactionType)

    var tx_json = _.defaults(tx, {
        Flags: 0
    })

    debug('tx_json %s', util.inspect(tx_json, null, 4))

    this.send({
        command: 'submit',
        secret: this.opts.secrets[tx.Account],
        tx_json: tx_json
    }, function(err, res) {
        if (err) return cb(err)

        if (res.engine_result == 'tesSUCCESS') {
            // TODO: Translate to ours
            return cb(null, res.tx_json.hash, res.tx_json.Sequence)
        }

        err = new Error(res.engine_result_message)
        err.name = res.engine_result
        err.code = res.engine_result_code
        return cb(err)
    })
}

Drop.prototype.payment = function(from, to, amount, cb) {
    assert(from)
    assert(to)
    assert(amount)
    assert(cb)

    var fromSplit = convert.splitAddress(from)
    , toSplit = convert.splitAddress(to)
    , tx = {
        TransactionType: 'Payment',
        Account: fromSplit.address,
        Amount: convert.toTheirPayment(amount),
        Destination: toSplit.address
    }
    if (fromSplit.tag !== null) tx.SourceTag = fromSplit.tag
    if (toSplit.tag !== null) tx.DestinationTag = toSplit.tag
    debug('submitting payment...')
    this.submit(tx, cb)
}

Drop.prototype.offer = function(account, from, to, cb) {
    this.submit({
        TransactionType: 'OfferCreate',
        TakerGets: convert.toTheirTakesGets(from),
        TakerPays: convert.toTheirTakesGets(to),
        Account: account
    }, cb)
}

Drop.prototype.lines = function(account, cb) {
    return this.send({
        command: 'account_lines',
        account: account
    }, function(err, res) {
        cb(err, err ? null : res.lines)
    })
}

Drop.prototype.transaction = function(hash, cb) {
    // TODO: Translate to our
    this.send({
        command: 'tx',
        transaction: hash
    }, cb)
}

Drop.prototype.transactions = function(account, min, max, cb) {
    var req = {
        command: 'account_tx',
        account: account
    }

    req.ledger_index_min = min || -1
    req.ledger_index_max = max || -1

    this.send(req, function(err, res) {
        if (err) return cb(err)

        cb(null, res.transactions.map(convert.fromTheirTransaction))
    })
}

Drop.prototype.subscribeBook = function(from, to, fromIssuer, toIssuer, cb) {
    var book = {
        CurrencyIn: from,
        CurrencyOut: to
    }

    if (fromIssuer) book.IssuerIn = fromIssuer
    if (toIssuer) book.IssuerOut = toIssuer

    this.send({
        command: 'subscribe',
        books: [book]
    }, cb)
}

Drop.prototype.ledger = function(ledger, full, cb) {
    if (full === undefined) {
        cb = ledger
        full = false
        ledger = 'validated'
    } else if (cb === undefined) {
        cb = full
    }

    this.send({
        command: 'ledger',
        ledger: ledger,
        full: full || false
    }, function(err, res) {
        cb(err, err ? null : {
            index: res.ledger.ledger_index
        })
    })
}

Drop.prototype.cancel = function(account, seq, cb) {
    this.submit({
        TransactionType: 'OfferCancel',
        Account: account,
        OfferSequence: seq
    }, cb)
}

Drop.prototype.offers = function(account, cb) {
    this.send({
        command: 'account_offers',
        account: account
    }, function(err, res) {

        cb(err, err ? null : res.offers.map(convert.fromTheirOffer))
    })
}
