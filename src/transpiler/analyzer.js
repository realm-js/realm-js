var _ = require('lodash')
var Parser = function() {

   this.prevHas = function(token) {
      var rules = _.flatten(arguments);
      for (var i in rules) {
         if (_.indexOf(this.stack, token) > -1)
            return true
      }
      return false;
   }
   this.not = function(token) {
      var self = this;
      var rules = _.flatten(arguments);
      for (var i in rules) {
         if (_.indexOf(this.stack, rules[i]) > -1 || self.current === rules[i])
            return false
      }
      return true;
   }

   this.prev = function(token) {
      return this.stack[this.stack.length - 1] === token;
   }
   this.parse = function(list, cb) {
      var self = this;
      self.stack = [];
      cb = cb.bind(this);
      _.each(list, function(token) {
         self.current = token;
         cb(token);
         self.stack.push(token)
      });
   }
}

module.exports = function(fileContent, opts) {
   opts = opts || {};
   var lines = fileContent.split("\n");
   var newLines = [];
   var injections = [];
   var useRealm = false;
   var moduleType = 'universal';
   var exposed = [];
   var modulePath = opts.name || "noname";
   var moduleResult;
   var rogueDecorators = [];
   var decorators = [];
   var waitingExposed = false;
   var currentClass;
   var realmType = 'module';
   for (var i in lines) {
      var line = lines[i];
      var skipLine = false;

      var _useRealm = line.match(/^\s*"use realm\s*(backend|backend-raw|bridge|frontend|frontend-raw)?"/);
      if (_useRealm) {
         if (_useRealm[1]) {
            moduleType = _useRealm[1];
         }
         skipLine = true;
         useRealm = true;
      }
      // custom module name
      var moduleMatched;
      if ((moduleMatched = line.match(/^\s*(module|service)\s+([a-z0-9.$_]+)/i))) {
         modulePath = moduleMatched[2];
         realmType = moduleMatched[1]
         skipLine = true;
      }

      if (currentClass) {
         if (rogueDecorators.length > 0) {
            var methodMatched;
            if ((methodMatched = line.match(/^\s*(static\s*)?([a-z0-9$_]+)/i))) {
               var method = methodMatched[2];
               _.each(rogueDecorators, function(d) {
                  decorators.push({
                     cls: currentClass,
                     method: method,
                     decorator: d
                  })
               });
               rogueDecorators = [];
            }
         }

      }
      // process classes and decorators
      var classMatched;
      if ((classMatched = line.match(/(([^\s]+)\s*=\s*)?(\s*)class\s+([a-z0-9$_]+)/i))) {
         currentClass = classMatched[2] || classMatched[4];
         if (rogueDecorators.length) {
            _.each(rogueDecorators, function(d) {
               decorators.push({
                  cls: currentClass,
                  decorator: d
               })
            });
            rogueDecorators = [];
         }
      }

      var decoratorMatched;
      if ((decoratorMatched = line.match(/^\s*@([a-z0-9]+\(.*)$/i))) {
         rogueDecorators.push(decoratorMatched[1]);
         skipLine = true;
      }

      // waiting for exposed method
      // Exposed methods must be static
      var staticExposed;
      if (moduleType === 'bridge') {
         if ((staticExposed = line.match(/^\s*static\s*([^\s^\(]+)/i))) {
            exposed.push(staticExposed[1])
            waitingExposed = false;
         }
      }

      // exports
      var _exports = line.match(/^\s*(export\s+)(.*)/);
      if (_exports && useRealm) {
         if (modulePath) {
            line = line.replace(_exports[1], "\n$_exports = ");
         }
      }

      // IMPORT
      if (line.match(/^\s*import/ig) && useRealm) {
         skipLine = true;
         var parser = new Parser();
         var tokens = line.match(/([a-z0-9$_.]+)/ig)
         var names = [];
         parser.parse(tokens, function(token) {
            if (this.prev("as")) {
               return names[names.length - 1].alias = token;
            }
            if (this.prevHas("import") && this.not('from') && token !== "as") {
               return names.push({
                  name: token,
                  alias: token
               });
            }
            if (this.prev("from")) {
               return _.each(names, function(name) {
                  name.packageName = token;
               });
            }
         });
         _.each(names, function(item) {
            injections.push(item);
         });
      }
      if (skipLine === false) {
         newLines.push(line);
      }
   }

   if (useRealm) {

      var annotations = _.map(injections, function(item) {
         return '"' + (item.packageName ? item.packageName + "." : '') + item.name + '"';
      });
      var moduleNames = _.map(injections, function(item) {
         return item.alias;
      });
      _.each(decorators, function(decorator) {
         newLines.push(decorator.decorator + '(' + decorator.cls + ',' + (decorator.method ? '"' + decorator.method + '"' : 'undefined') + ');');
      });
      return {
         name: modulePath,
         realmType: realmType,
         type: moduleType,
         exposed: exposed,
         annotations: annotations,
         moduleNames: moduleNames,
         lines: newLines
      }
   }
   return {
      lines: newLines.join('\n')
   }
}
