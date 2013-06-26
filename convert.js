var assert = require('assert')
, num = require('num')
, _ = require('lodash')

function removeTrailingZeroes(s) {
    return s.replace(/\.?0+$/, '')
}

exports.fromTheirAmount = function(a) {
    assert(a)
    if (typeof a == 'string') {
        var n = num(a, 6)
        assert(!n.lt(0))

        return {
            amount: removeTrailingZeroes(n.toString()),
            currency: 'XRP'
        }
    } else {
        assert(a.currency)
        assert(a.value)
        assert.notEqual(a.currency, 'XRP')
        var res = {
            amount: removeTrailingZeroes(a.value),
            currency: a.currency
        }
        a.issuer && (res.issuer = a.issuer)
        return res
    }
}

exports.fromTheirTransaction = function(t) {
    assert(t)
    if (t.tx) t = t.tx

    assert(t.hash !== undefined)
    assert(t.Sequence !== undefined)
    assert(t.Fee !== undefined)
    assert(t.date !== undefined)

    var res = {
        hash: t.hash,
        seq: t.Sequence,
        fee: t.Fee,
        from: t.Account,
        timestamp: t.date
    }

    if (t.ledger_index) {
        t.ledger = t.ledger_index
    }

    if (t.TransactionType == 'Payment') {
        _.extend(res, exports.fromTheirAmount(t.Amount))
        res.type = 'payment'
        if (t.SourceTag !== undefined) res.st = t.SourceTag
        if (t.DestinationTag !== undefined) res.dt = t.DestinationTag
        res.to = t.Destination
    } else if (t.TransactionType == 'OfferCreate') {
        res.type = 'offer'
        res.have = exports.fromTheirAmount(t.TakerGets)
        res.want = exports.fromTheirAmount(t.TakerPays)
    } else if (t.TransactionType == 'OfferCancel') {
        res.type = 'cancel offer'
        res.hash = t.hash
        res.seq = t.Sequence
    } else if (t.TransactionType == 'TrustSet') {
        res.type = 'set trust'
        _.extend(res, exports.fromTheirAmount(t.LimitAmount))
    } else {
        throw new Error('Unknown transaction type ' + t.TransactionType)
    }

    return res
}

exports.fromTheirOffer = function(o) {
    assert(o.flags !== undefined)
    assert(o.seq !== undefined)
    assert(o.taker_gets)
    assert(o.taker_pays)

    return {
        seq: o.seq,
        have: exports.fromTheirAmount(o.taker_gets),
        want: exports.fromTheirAmount(o.taker_pays)
    }
}

exports.toTheirPayment = function(our) {
    assert(our.currency)
    assert(our.amount)

    if (our.currency == 'XRP') {
        var n = num(our.amount).mul(1e6)
        n.set_precision(0)
        return n.toString()
    }

    var res = {
        value: removeTrailingZeroes(our.amount),
        currency: our.currency
    }

    if (our.issuer) res.issuer = our.issuer

    return res
}

exports.toTheirTakesGets = function(our) {
    assert(our.currency)
    assert(our.amount)

    if (our.currency == 'XRP') {
        var n = num(our.amount).mul(1e6)
        n.set_precision(0)
        return n.toString()
    }

    assert(our.issuer)

    var res = {
        value: removeTrailingZeroes(our.amount),
        currency: our.currency,
        issuer: our.issuer
    }

    return res
}

exports.splitAddress = function(s) {
    assert(s)
    var m = s.match(/^([^:]+)(?::(\d+))?$/)
    assert(m)

    return {
        address: m[1],
        tag: m[2] ? +m[2] : null
    }
}
