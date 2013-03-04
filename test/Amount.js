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
            expect(a.value).to.be('100')
            expect(a.currency).to.not.be.ok()
            expect(a.issuer).to.not.be.ok()
        })

        it('accepts full string', function() {
            var a = new Amount('300.888888 USD/rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
            expect(a.currency).to.be('USD')
            expect(a.issuer).to.be('rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
            expect(a.value).to.be('300.888888')
        })

        it('accepts integer arg', function() {
            var a = new Amount(42)
            expect(a.value).to.be('42')
        })
    })

    describe('toString', function() {
        it('makes with only number for XRP', function() {
            var a = new Amount(1, 'XRP')
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
    })
})
