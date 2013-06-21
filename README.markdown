drop
===

[Ripple](https://ripple.com) library for node.js

[![Build Status](https://travis-ci.org/abrkn/drop.png)](https://travis-ci.org/abrkn/drop)

CLI
---

`npm install -g drop`

Account and secret can be specified with the `--account` and `--secret` options.

### Subscribe

`drop subscribe --account rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi`

Subscribe to transactions to/from account. Transactions are printed to the console.

Cancel with CTRL-C.

### Ping

Ping the Ripple server. Outputs ping time in milliseconds.

```
drop ping
121 ms
```

### Account transactions

```
// Fetch transactions for account between ledger index 5000 and 7000.
drop transactions 5000 7000
{ ... }

// Fetch transactions from ledger 5000 to last validated ledger.
drop transactions 5000
```


### Create offer

```
// Create an offer to give 7000 XRP for someone's 1.5 BTC/rJHygWcTLVpSXkowott6kzgZU6viQSVYM1.
// Note that BTC/xxx means BTC issued by xxx.
drop offer 7000 XRP 1.5 BTC/rJHygWcTLVpSXkowott6kzgZU6viQSVYM1
1234
```

Outputs the sequence number of the offer to the console.

### Cancel offer

```
// Cancel order with sequence number 1234.
drop cancel 1234
OK
```

### Send

Send funds to another account. Outputs transaction hash.

```
// Send 10.5 XRP to rJHygWcTLVpSXkowott6kzgZU6viQSVYM1 with a destination tag of 16
drop send 10.5XRP rJHygWcTLVpSXkowott6kzgZU6viQSVYM1
DF59AD3758CAE8C01E950D586FCA40BFA4F0AD7DDD12380B5DDDA46DECE42042

// Send 3500 XRP to rJHygWcTLVpSXkowott6kzgZU6viQSVYM1 with a destination tag of 16
drop send 3500 XRP rJHygWcTLVpSXkowott6kzgZU6viQSVYM1:16
DF59AD3758CAE8C01E950D586FCA40BFA4F0AD7DDD12380B5DDDA46DECE42042

// Send 750.1 BTC issued by rJHygWcTLVpSXkowott6kzgZU6viQSVYM1 to rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi
drop send 750.1 BTC/rJHygWcTLVpSXkowott6kzgZU6viQSVYM1 rG4muW7MgLqFV1VgzJ7sJ6ADr3xAAPujVi
```

API
---

See `bin/drop` for example code.

Test
---

`npm test`
