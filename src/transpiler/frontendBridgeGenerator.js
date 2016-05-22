var generator = require('./generator.js');
var _ = require('lodash')

module.exports = function(analyzed) {
   var lines = ['$_exports = {'];
   var methods = [];
   _.each(analyzed.exposed, function(exposedName) {
      var method = []
      method.push("'" + exposedName + "': function(){");
      method.push('return BridgeRequest.connect("' + analyzed.name + '", arguments)');
      method.push("}")
      methods.push(method.join(''));
   });
   lines.push(methods.join(',\n'));
   lines.push('}')
   var data = {
      name: analyzed.name,
      annotations: ['"realm.router.BridgeRequest"'],
      moduleNames: ['BridgeRequest'],
      lines: lines
   }
   return generator(data)

}
