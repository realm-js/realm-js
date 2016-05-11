
var realm = require("../realm.js").realm;
var _ = require('lodash')
var parsetrace = require('parsetrace');

var swig  = require('swig');

module.exports = function(e){
   var error = parsetrace(e, { sources: true }).object();
   return swig.renderFile(__dirname + '/traceback.html', {
       error:  error
   });
}
