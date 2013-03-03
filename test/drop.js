var Drop = require('../lib/drop')
, expect = require('expect.js')

describe('drop', function() {
    describe('constructor', function() {
        it('has a default uri', function() {
            var r = new Drop()
            expect(r.opts.uri).to.eql('wss://s1.ripple.com:51233')
            r.socket.terminate()
        })

        it('connects on startup', function() {
            var r = new Drop()
            expect(r.socket.readyState == 'connecting')
            r.socket.terminate()
        })

        it('can connect to the default server', function(done) {
            this.timeout(10e3)
            var r = new Drop({}, function() {
                r.socket.terminate()
                done()
            })
        })
    })

    describe('send', function() {
        it('queues when not connected', function() {
            var r = new Drop()
            r.send({})
            expect(r.queue.length).to.be(1)
            r.socket.terminate()
        })

        it('sends immediately when connected', function(done) {
            this.timeout(10e3)
            var r = new Drop(function() {
                r.send({})
                expect(r.queue.length).to.be(0)
                expect(r.sent.length).to.be(1)
                r.socket.terminate()
                done()
            })
        })

        it('resolves the promise', function(done) {
            this.timeout(10e3)
            var r = new Drop()
            r.send({ command: 'ping' })
            .fin(done)
        })

        it('rejects on error', function(done) {
            this.timeout(10e3)
            var r = new Drop()
            r.send({ command: 'doesnotexist' })
            .fail(function(err) {
                expect(err.name).to.be('unknownCmd')
                done()
            })
        })
    })

    describe('subscribe', function() {
        it('defaults to server', function() {
            this.timeout(10e3)
            var r = new Drop()
            r.subscribe(function() { })
            expect(r.queue[0].message.streams).to.eql(['server'])
            r.socket.terminate()
        })

        it('eventually receives a ledgerClosed when subing to ledger', function(done) {
            this.timeout(120e3)

            var r = new Drop()

            // the .done will cause any exception to be thrown
            r.subscribe('ledger', function(type, result) {
                // ledger info received
                expect(type).to.be('ledgerClosed')
                expect(result).to.be.ok()
                r.socket.terminate()
                done()
            }).done()
        })
    })

    describe('account', function() {
        it('can fetch andys account details', function(done) {
            this.timeout(10e3)

            var r = new Drop()
            r.account('rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
            .then(function(result) {
                expect(result.account_data.Account).to.be('rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
                r.socket.terminate()
                done()
            })
            .fail(done)
        })
    })

    describe('payment', function() {
        it('fails when attempting to send to self', function(done) {
            this.timeout(10e3)

            var r = new Drop()
            r.payment(
                'ssd5TpRAshGAF2Mg9GxZNSpKXaDr8',
                'ra2Mv6bbtoBtQt1AqPd232MN7Yf4zo1QCX',
                'ra2Mv6bbtoBtQt1AqPd232MN7Yf4zo1QCX',
                1e8)
            .fail(function(err) {
                expect(err.message).to.match(/to self/)
                done()
            })
        })

        it('can send xrp to andy', function(done) {
            this.timeout(10e3)

            var r = new Drop()
            r.payment(
                'ssd5TpRAshGAF2Mg9GxZNSpKXaDr8',
                'ra2Mv6bbtoBtQt1AqPd232MN7Yf4zo1QCX',
                'rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi',
                1)
            .then(function(result) {
                expect(result.tx_json.hash).to.be.a('string')
                r.socket.terminate()
                done()
            })
            .fail(done)
        })
    })

    describe('accountLines', function() {
        it('can fetch lines for andy', function(done) {
            this.timeout(10e3)
            var r = new Drop()
            r.accountLines('rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi')
            .then(function(result) {
                expect(result).to.be.an('array')
                r.socket.terminate()
                done()
            })
            .fail(done)
        })
    })

    describe('accountTransactions', function() {
        it('can fetch andys transactions', function(done) {
            this.timeout(10e3)
            var r = new Drop()
            r.accountTransactions('rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi', 0, 403707)
            .then(function(result) {
                expect(result).to.be.an('array')
                r.socket.terminate()
                done()
            })
            .fail(done)
        })
    })

    describe('transaction', function() {
        it('can fetch a known tx', function(done) {
            this.timeout(10e3)
            var r = new Drop()
            r.transaction('2E5D2E21E9D40DEAA2BD1C322A43974A32289A94E01A4B1F5BABFF98A78E5914')
            .then(function(tx) {
                expect(tx.Account).to.be('ra2Mv6bbtoBtQt1AqPd232MN7Yf4zo1QCX')
                r.socket.terminate()
                done()
            })
            .fail(done)
        })
    })
})
