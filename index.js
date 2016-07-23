var mod = require(__dirname + '/src/realm.js');

mod.realm.serve = require(__dirname + '/src/serve.js');
mod.realm.transpiler2 = require(__dirname + '/src/transpiler2.js');
module.exports = mod.realm;
