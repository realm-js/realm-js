var mod = require(__dirname + '/src/realm.js');

mod.realm.serve = require(__dirname + '/src/serve.js');
mod.realm.transpiler2 = require(__dirname + '/src/transpiler2.js');
var realm = mod.realm;

realm.module("realm.utils.appRoot", function() {
   return require('app-root-path');
});

realm.module("realm.utils.fs", function() {
   return require('fs');
});

realm.module("realm.utils.lodash", function() {
   return require('lodash');
});
realm.module("realm.utils.walk", function() {
   return require('walk');
});

realm.module("realm.utils.mkdirp", function() {
   return require('mkdirp');
});

realm.module("realm.utils.swig", function() {
   return require('swig');
});

module.exports = realm;
