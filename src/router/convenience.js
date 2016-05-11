var _ = require('lodash');
var jsep = require("jsep");

// Validate syntax parser
// Without a key:
// minLength(1), maxLength(2), email
// With key
// email -> minLength(1), maxLength(2), email
var _cached = {};
module.exports = {
   parse: function(str, opts) {
      opts = opts || {};
      var cache = opts.cache || false;
      var dict = opts.dict || false;

      if (cache === true) {
         if (_cached[str]) {
            return _cached[str];
         }
      }

      var funcs = [];
      try {
         var parse_tree = jsep(str);

         // flatten the tree
         var elements = [];
         if (parse_tree.type === "Compound") {
            elements = parse_tree.body;
         }
         if (parse_tree.type === "Identifier" || parse_tree.type === "CallExpression") {
            elements = [parse_tree];
         }
         _.each(elements, function(element) {
            if (element.type === "CallExpression") {
               funcs.push({
                  name: element.callee.name,
                  attrs: _.map(element.arguments, 'value')
               });
            }
            if (element.type === "Identifier") {
               funcs.push({
                  name: element.name
               });
            }
         });
      } catch (e) {
         console.log(e.stack)
         console.error("Error while parsing " + str);
         console.error(e);
      }
      // return as dictionary
      if (dict === true) {

         var data = {};
         _.each(funcs, function(item) {
            data[item.name] = {
               attrs: item.attrs || []
            };
         });
         funcs = data;
      }
      if (cache === true) {
         return _cached[str] = funcs;
      }

      return funcs;
   }
};
