var _ = require('underscore')

// The constructor is invoked in a few different ways:
// - The only argument is an object, which has atleast the property value and optionally currency and issuer
// - The only argument is a string or integer, which will be interpreted as drops
// - The only argument is a string that specifies currency and possibly issuer in the form 1.00 BTC/snowcoin
// - Two or more arguments are specified (value, currency, issuer)
// - There are no arguments, nothing will be set and the amount is invalid
var Amount = module.exports = function(value, currency, issuer) {
    if (_.isUndefined(value)) return
    if (_.isObject(value)) {
        this.value = value.value
        this.currency = value.currency
        this.issuer = value.issuer
    } else {
        if (arguments.length == 1 && _.isString(value)) {
            var m = value.match(/^([\d\.]+)(?:\s([A-Z]{3})(?:\/(r\w{32,}))?)?/)
            this.value = m[1]
            m[2] && (this.currency = m[2])
            m[3] && (this.issuer = m[3])
            this.currency || (this.value = this.value / 1e6 + '')
        } else {
            this.value = value + ''
            currency && (this.currency = currency)
            issuer && (this.issuer = issuer)
            this.currency || (this.value = this.value / 1e6 + '')
        }
    }
}

Amount.prototype.toString = function() {
    if (!this.currency) {
        if (this.issuer) throw new Error('XRP cannot have issuer')
        return this.value * 1e6 + ''
    }

    return this.value + ' ' +
        this.currency + ' ' +
       (this.issuer ? ' /' + this.issuer : '')
}

Amount.prototype.toJSON = function() {
    if (!this.currency) {
        return this.value * 1e6 + ''
    }

    var result = {
        value: this.value,
        currency: this.currency
    }

    this.issuer && (result.issuer = this.issuer)
    return result
}
