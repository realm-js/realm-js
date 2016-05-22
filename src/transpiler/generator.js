var _ = require('lodash')

module.exports = function(input) {
   var lines = input.lines;
   var fn = ["realm.module(" + '"' + input.name + '",[']
   fn.push(input.annotations.join(", "));
   fn.push("],function(");
   fn.push(input.moduleNames.join(", "))
   fn.push("){ var $_exports;");
   lines.splice(0, 0, fn.join(''));
   lines.push("return $_exports;");
   lines.push("});")
   return lines.join('\n');
}
