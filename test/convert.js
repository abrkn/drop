/* global describe, it */
var convert = require('../convert')
, expect = require('expect.js')

describe('convert', function() {
    describe('toTheirPayment', function() {
        it('supports XRP', function() {
            var ours = {
                amount: '0.100000',
                currency: 'XRP'
            }

            var theirs = convert.toTheirPayment(ours)

            expect(theirs).to.be('100000')
        })
    })
})
