var _ = require('underscore')
, Amount = module.exports = function(value, currency, issuer) {
    if (!arguments.length) return
    if (_.isObject(value)) {
        this.value = value.value
        this.currency = value.currency
        this.issuer = value.issuer
    } else {
        var m
        if (_.isString(value) && (m = value.match(/^([\d\.]+)(?:\s([A-Z]{3})(?:\/(r\w{33}))?)?/))) {
            this.value = m[1]
            this.currency = m[2]
            this.issuer = m[3]
        } else {
            this.value = '' + value
            this.currency = currency
            this.issuer = issuer
        }
    }
}

Amount.prototype.toString = function() {
    return this.value +
           (this.currency && this.currency != 'XRP' ? ' ' + this.currency : '') +
           (this.issuer ? ' /' + this.issuer : '')
}

Amount.prototype.toJSON = function() {
    var result = {
        value: this.value
    }

    if (this.currency && this.currency != 'XRP') {
        result.currency = this.currency
    }

    this.issuer && (result.issuer = this.issuer)
    return result
}
