var mod = require(__dirname + '/src/realm.js');

mod.realm.transpiler = require(__dirname + '/src/transpiler.js');
mod.realm.serve = require(__dirname + '/src/serve.js');
mod.realm.router = require(__dirname + '/src/router/router.js');
module.exports = mod.realm;
