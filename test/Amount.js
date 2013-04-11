var Amount = require('../lib/Amount')
, expect = require('expect.js')

describe('Amount', function() {
    describe('constructor', function() {
        it('supports zero arguments', function() {
            var a = new Amount()
            expect(a.currency).to.not.be.ok()
            expect(a.issuer).to.not.be.ok()
            expect(a.value).to.not.be.ok()
        })

        it('supports single number arg', function() {
            var a = new Amount(100)
            expect(a.value).to.be(100 / 1e6 + '')
            expect(a.currency).to.not.be.ok()
            expect(a.issuer).to.not.be.ok()
        })

        it('supports issuer in string', function() {
            var a = new Amount('0.1 BTC/rnipVEZ2hi6qh7BedivFR13rXHYdpzhKfc')
            expect(a.value).to.be('0.1')
            expect(a.currency).to.be('BTC')
            expect(a.issuer).to.be('rnipVEZ2hi6qh7BedivFR13rXHYdpzhKfc')
        })

        it('accepts full string', function() {
            var a = new Amount('300.888888 USD/rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
            expect(a.currency).to.be('USD')
            expect(a.issuer).to.be('rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
            expect(a.value).to.be('300.888888')
        })

        it('accepts integer arg', function() {
            var a = new Amount(42)
            expect(a.value).to.be(42 / 1e6 + '')
        })
    })

    describe('toString', function() {
        it('makes with only number for XRP', function() {
            var a = new Amount('1')
            expect(a.toString()).to.be('1')
        })
    })

    describe('toJSON', function() {
        it('passes spec', function() {
            var a = new Amount(100, 'USD', 'rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
            , actual = a.toJSON()
            expect(actual.value).to.be('100')
            expect(actual.currency).to.be('USD')
            expect(actual.issuer).to.be('rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
        })

        it('writes XRP as drops, not JSON', function() {
            var a = new Amount(100, 'XRP', null)
            , actual = a.toJSON()
            expect(actual).to.be('' + 100e6)
        })
    })

    it('supports example 1', function() {
        var a = new Amount('1 BTC/rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B')
        expect(a.value).to.be('1')
        expect(a.currency).to.be('BTC')
        expect(a.issuer).to.be('rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B')

        var j = JSON.parse(JSON.stringify(a))
        expect(j.value).to.be('1')
        expect(j.currency).to.be('BTC')
        expect(j.issuer).to.be('rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B')
    })
})
