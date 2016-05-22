var realm = require('./index.js');
var fs = require('fs');

var ts = realm.transpiler2;

ts.universal(__dirname + "/test-universal", __dirname + "/build/test")
