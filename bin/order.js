var argv = require('optimist')
.demand(['secret', 'address', 'from', 'to'])
.argv
, Q = require('q')
, Drop = require('../lib/drop')
, drop = new Drop()

drop.opts.secrets[argv.address] = argv.secret

function cancel() {
    console.log('cancelling all offers')
    return drop.accountOffers(argv.address)
    .then(function(offers) {
        return Q.all(offers.map(function(o) {
            console.log('cancelling %j', o)
            return drop.cancelOffer(argv.address, o.seq)
        }))
    })
}

function send() {
    return drop.createOffer(argv.address, argv.from, argv.to)
}

var p = argv.cancel ? cancel : send

p()
.then(function(tx) {
    console.log('all good %j', tx)
})
.fail(function(err) {
    console.error(err)
})
.fin(function() {
    drop.socket.terminate()
})
.done()
