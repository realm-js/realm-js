var walk = require('walk')
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var mkdirp = require("mkdirp");

var lib = {
   universal: universal,
   analyzer: require('./transpiler/analyzer.js'),
   generator: require('./transpiler/generator.js'),
   frontendBridgeGenerator: require('./transpiler/frontendBridgeGenerator.js')
}

function extractModuleName(fname, root) {
   fname = fname.replace(/\.js$/i, '')
   var name = fname.split(root)[1];
   if (name[0] === "/") {
      name = name.slice(1, name.length)
   }

   name = name.split("/").join('.');
   return name;
}

var Writer = function(dest) {
   if (!fs.existsSync(dest)) {
      mkdirp.sync(dest)
   }
   var files = {
      universal: path.join(dest, 'universal.js'),
      backend: path.join(dest, 'backend.js'),
      frontend: path.join(dest, 'frontend.js')
   }
   _.each(files, function(file) {
      if (fs.existsSync(file)) {
         fs.unlinkSync(file);
      }
   });
   var universalFile = fs.openSync(files.universal, 'a');
   var backendFile = fs.openSync(files.backend, 'a');
   var frontendFile = fs.openSync(files.frontend, 'a');
   // writing headers

   return {
      writeAll: function(content) {
         this.universal(content);
         this.backend(content);
         this.frontend(content);
      },
      writeHeaders: function() {
         var header = '(function(___scope___) { var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;\n';
         this.writeAll(header);
      },
      universal: function(contents) {
         fs.writeSync(universalFile, "\n" + contents)
      },
      backend: function(contents) {
         fs.writeSync(backendFile, "\n" + contents)
      },
      frontend: function(contents) {
         fs.writeSync(frontendFile, "\n" + contents)
      },
      close: function(isDev) {
         var p = isDev ? "./index.js" : 'realm-js';
         var footer = "\n})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('" + p +
            "') : self.realm}}(this));";
         this.writeAll(footer);
         fs.closeSync(universalFile);
         fs.closeSync(backendFile);
         fs.closeSync(frontendFile);
      }
   }
}
var universal = function(directory, dest, opts) {
   opts = opts || {};
   var isDev = opts.isDev;

   var walker = walk.walk(directory);
   var writer = Writer(dest);
   writer.writeHeaders();
   return new Promise(function(resolve, reject) {
      walker.on("file", function(root, fileStats, next) {
         var fname = path.join(root, fileStats.name);
         var name = extractModuleName(fname, directory);
         var contents = fs.readFileSync(fname).toString();

         var res = lib.analyzer(contents, {
            name: name
         });

         // A file without realm "use case"
         if (!res.name) {
            writer.universal(contents);
            return next();
         }
         if (res.type === 'universal') {
            writer.universal(lib.generator(res));
            return next();
         }
         if (res.type === 'backend') {
            writer.backend(lib.generator(res));
            return next();
         }

         if (res.type === 'backend-raw') {
            writer.backend(contents);
            return next();
         }
         if (res.type === 'frontend') {
            writer.frontend(lib.generator(res));
            return next();
         }
         if (res.type === 'frontend-raw') {
            writer.frontend(contents);
            return next();
         }

         if (res.type === 'bridge') {
            writer.frontend(lib.frontendBridgeGenerator(res))
            writer.backend(lib.generator(res));
            return next();
         }
      });

      walker.on("end", function() {
         writer.close();
         return resolve();
      });
   });
}

lib.universal = universal;
module.exports = lib;
