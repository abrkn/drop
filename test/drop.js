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
})
