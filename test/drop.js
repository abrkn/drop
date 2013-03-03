var Drop = require('../lib/drop')
, expect = require('expect.js')
, andyAddr = 'rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi'
, dropAddr = 'ra2Mv6bbtoBtQt1AqPd232MN7Yf4zo1QCX'
, defaults = {
    secrets: {
        'ra2Mv6bbtoBtQt1AqPd232MN7Yf4zo1QCX': 'ssd5TpRAshGAF2Mg9GxZNSpKXaDr8'
    }
}

describe('drop', function() {
    describe('constructor', function() {
        it('has a default uri', function() {
            var r = new Drop(defaults)
            expect(r.opts.uri).to.eql('wss://s1.ripple.com:51233')
            r.socket.terminate()
        })

        it('connects on startup', function() {
            var r = new Drop(defaults)
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
            var r = new Drop(defaults)
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
            var r = new Drop(defaults)
            r.send({ command: 'ping' })
            .fin(done)
        })

        it('rejects on error', function(done) {
            this.timeout(10e3)
            var r = new Drop(defaults)
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
            var r = new Drop(defaults)
            r.subscribe(function() { })
            expect(r.queue[0].message.streams).to.eql(['server'])
            r.socket.terminate()
        })

        it('eventually receives a ledgerClosed when subing to ledger', function(done) {
            this.timeout(120e3)

            var r = new Drop(defaults)

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

            var r = new Drop(defaults)
            r.account(dropAddr)
            .then(function(result) {
                expect(result.account_data.Account).to.be(dropAddr)
                r.socket.terminate()
                done()
            })
            .fail(done)
        })
    })

    describe('payment', function() {
        it('fails when attempting to send to self', function(done) {
            this.timeout(10e3)

            var r = new Drop(defaults)
            r.payment(
                dropAddr,
                dropAddr,
                1e8)
            .fail(function(err) {
                expect(err.message).to.match(/to self/)
                done()
            })
        })

        it('can send xrp to andy', function(done) {
            this.timeout(10e3)

            var r = new Drop(defaults)
            r.payment(
                dropAddr,
                andyAddr,
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
            var r = new Drop(defaults)
            r.accountLines(dropAddr)
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
            var r = new Drop(defaults)
            r.accountTransactions(dropAddr, 0, 403707)
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
            var r = new Drop(defaults)
            r.transaction('2E5D2E21E9D40DEAA2BD1C322A43974A32289A94E01A4B1F5BABFF98A78E5914')
            .then(function(tx) {
                expect(tx.Account).to.be(dropAddr)
                r.socket.terminate()
                done()
            })
            .fail(done)
        })
    })

    // getting internal errors
    /*
    describe('subscribeBook', function() {
        it('can fetch xrp/btc book', function(done) {
            this.timeout(10e3)
            var r = new Drop(defaults)
            r.subscribeBook('XRP', 'BTC', null, dropAddr, function(result) {
                console.log(result)
            })
            .done()
        })
    })
    */

    describe('createOffer', function() {
        it('fails when trying BTC/stamp to XRP because unfunded', function(done) {
            this.timeout(10e3)
            var r = new Drop(defaults)
            r.createOffer(
                dropAddr,
                '1 BTC/rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
                '10000000000000 XRP'
            )
            .fail(function(err) {
                expect(err.message).to.match(/balance to fund/)
                done()
            })
            .done()
        })

        it('is upset when trying 1 XRP for 2 XRP', function(done) {
            this.timeout(10e3)
            var r = new Drop(defaults)
            r.createOffer(
                dropAddr,
                '1 XRP',
                '2 XRP'
            )
            .fail(function(err) {
                expect(err.message).to.match(/bad offer/i)
                done()
            })
            .done()
        })
    })
})
