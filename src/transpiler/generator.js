var _ = require('lodash')

module.exports = function(input) {
   var lines = input.lines;
   var rt = input.realmType || "module";
   var fn = ["realm." + rt + "(" + '"' + input.name + '",[']
   fn.push(input.annotations.join(", "));
   fn.push("],function(");
   fn.push(input.moduleNames.join(", "))
   fn.push("){ var $_exports;");
   if (input.source) {
      fn.push("/* @#realm-source:" + input.source + "#*/");
   }
   lines.splice(0, 0, fn.join(''));
   lines.push("return $_exports;");
   lines.push("});")
   return lines.join('\n');
}
