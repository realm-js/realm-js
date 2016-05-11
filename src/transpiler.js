var _ = require('lodash');
var es = require('event-stream');
var _ = require('lodash');
var walk = require('walk');
var path = require('path');
var fs = require("fs");
var through = require('through2');

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

var wrapContents = function(data, isDev) {

   var content = ['(function(___scope___) { var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;\n'];
   content.push(data);
   var p = isDev ? "./index.js" : 'realm-js';
   content.push("\n})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('" + p +
      "') : self.realm}}(this));");
   return content.join('');
}
var transpileString = function(input, opts) {
   opts = opts || {};
   var auto = opts.auto;
   var modulePath = opts.modulePath;
   var fileContent = input;
   var moduleName;
   var lines = fileContent.split("\n");
   var newLines = [];
   var injections = [];
   var useRealm = false;

   var moduleResult;
   for (var i in lines) {
      var line = lines[i];
      var skipLine = false;

      var _useRealm = line.match(/^"use realm"/);
      if (_useRealm) {
         skipLine = true;
         useRealm = true;
      }
      // custom module name
      var moduleMatched;
      if ((moduleMatched = line.match(/^module\s+([a-z0-9.$_]+)/i))) {
         modulePath = moduleMatched[1];
         skipLine = true;
      }

      // exports
      var _exports = line.match(/^(export\s+)(.*)/);
      if (_exports && useRealm) {
         if (modulePath) {
            line = line.replace(_exports[1], "\n$_exports = ");
         }
      }

      // IMPORT
      if (line.match(/^import/ig) && useRealm) {
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
      var fn = ["realm.module(" + '"' + modulePath + '",[']
      var annotations = _.map(injections, function(item) {
         return '"' + (item.packageName ? item.packageName + "." : '') + item.name + '"';
      });
      var moduleNames = _.map(injections, function(item) {
         return item.alias;
      });
      fn.push(annotations.join(", "));
      fn.push("], \n\tfunction(");
      fn.push(moduleNames.join(", "))
      fn.push("){ var $_exports;");
      newLines.splice(0, 0, fn.join(''));
      newLines.push("return $_exports;");
      newLines.push("});")
   }
   return newLines.join('\n');

}

function cleanUpModulePath(path){
   if( path[0] === "/"){
      path = path.slice(1, path.length)
   }
   return path.replace(/\//,".");
}

module.exports = function(opts) {
   var _opts = opts || {};
   var target = opts.target;
   var base = opts.base;
   var self = this;

   if (opts.wrap) {
      return es.map(function(file, cb) {
         var fileContent = file.contents.toString()
         file.contents = new Buffer(wrapContents(fileContent, opts.dev));
         cb(null, file);
      });
   }
   var preffix = opts.preffix;
   var contents = [];
   var latestFile;

   function bufferContents(file, enc, cb) {
      var f = file.path;
      var fileName = path.basename(f)

      latestFile = file;
      var baseFileName = f.split(base)[1];
      if (baseFileName) {
         var p = baseFileName.split("/" + fileName);
         var _package = p.length === 2 ? p[0] : null;


         var moduleName = path.basename(fileName, '.js');
         var __dir = moduleName;
         if (_package) {
            _package = cleanUpModulePath(_package)
            __dir = _package + "." + __dir;
         }
         if (preffix) {
            __dir = preffix + "." + __dir;
         }
         var data = transpileString(file.contents.toString(), {
            modulePath: __dir
         });
         contents.push(data);
      }
      cb();
   }

   function endStream(cb) {
      var joinedFile = latestFile.clone({
         contents: false
      });
      joinedFile.path = path.join(latestFile.base, target);
      joinedFile.contents = new Buffer(contents.join('\n'));
      this.push(joinedFile);
      cb();
   }
   return through.obj(bufferContents, endStream);
}
