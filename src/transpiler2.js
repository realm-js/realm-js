var walk = require('walk')
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var mkdirp = require("mkdirp");
var es = require('event-stream');
var through = require('through2');

var lib = {
   universal: universal,
   analyzer: require('./transpiler/analyzer.js'),
   generator: require('./transpiler/generator.js'),
   frontendBridgeGenerator: require('./transpiler/frontendBridgeGenerator.js')
}

/**
 * extractModuleName - Extracting realn module name
 * Getting rid of extension, replacing / with .
 * If preffix is set, add it there
 *
 * @param  {type} fname   description
 * @param  {type} root    description
 * @param  {type} preffix description
 * @return {type}         description
 */
function extractModuleName(fname, root, preffix) {
   fname = fname.replace(/\.js$/i, '')
   var name = fname.split(root)[1];
   if (name[0] === "/") {
      name = name.slice(1, name.length)
   }
   name = name.split("/").join('.');
   if (preffix) {
      name = preffix + "." + name;
   }
   return name;
}

function getRealmHeader() {
   return '(function(___scope___) { "use strict"; var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;\n';
}

function getRealmFooter(isDev) {
   var p = isDev ? "./index.js" : 'realm-js';
   return "\n})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('" + p +
      "') : window.realm}}());";
}

var modifiedFiles = {};

var gulp = function(directory, target, opts) {
   opts = opts || {};
   var isDev = opts.isDev;
   var preffix = opts.preffix;
   var contents = [getRealmHeader()];
   var latestFile;

   function bufferContents(file, enc, cb) {
      var fname = file.path;
      var name = extractModuleName(fname, directory, preffix);
      var fcontents = file.contents.toString();
      var res = lib.analyzer(fcontents, {
         name: name
      });

      contents.push(res.name ? lib.generator(res) : fcontents)
      latestFile = file;
      cb();
   }

   function endStream(cb) {
      var joinedFile = latestFile.clone({
         contents: false
      });
      joinedFile.path = path.join(latestFile.base, target);
      contents.push(getRealmFooter(isDev))
      joinedFile.contents = new Buffer(contents.join('\n'));
      this.push(joinedFile);
      cb();
   }
   return through.obj(bufferContents, endStream);
}

var universal = function(directory, dest, opts) {
   opts = opts || {};
   var isDev = opts.isDev;
   var changes = {};
   var walker = walk.walk(directory);
   var preffix = opts.preffix;
   var files = {
      universal: path.join(dest, 'universal.js'),
      backend: path.join(dest, 'backend.js'),
      frontend: path.join(dest, 'frontend.js')
   }
   var data = {
      universal: [],
      backend: [],
      frontend: []
   };
   return new Promise(function(resolve, reject) {
      walker.on("file", function(root, fileStats, next) {
         if (fileStats.name.indexOf(".js") === -1) {
            return next();
         }
         var fname = path.join(root, fileStats.name);

         // extracting real module name
         var name = extractModuleName(fname, directory, preffix);
         var contents = fs.readFileSync(fname).toString();
         var res = lib.analyzer(contents, {
            name: name
         });

         // check if this file has been modified
         var isModified = modifiedFiles[fname] !== fileStats.mtime.getTime();
         modifiedFiles[fname] = fileStats.mtime.getTime();

         // A file without realm "use case"
         if (!res.name) {
            data.universal.push(contents);
            if (isModified) {
               changes.universal = true;
            }
            return next();
         }
         if (res.type === 'universal') {
            data.universal.push(lib.generator(res))
            if (isModified) {
               changes.universal = true;
            }
            return next();
         }
         if (res.type === 'backend') {
            data.backend.push(lib.generator(res));
            if (isModified) {
               changes.backend = true;
            }
            return next();
         }

         if (res.type === 'backend-raw') {
            if (isModified) {
               changes.backend = true;
            }
            data.backend.push(contents);
            return next();
         }
         if (res.type === 'frontend') {
            if (isModified) {
               changes.frontend = true;
            }
            data.frontend.push(lib.generator(res));
            return next();
         }
         if (res.type === 'frontend-raw') {
            if (isModified) {
               changes.frontend = true;
            }
            data.frontend.push(contents);
            return next();
         }
         if (res.type === 'bridge') {
            if (isModified) {
               changes.frontend = true;
               changes.backend = true;
            }
            data.frontend.push(lib.frontendBridgeGenerator(res));
            data.backend.push(lib.generator(res));
            return next();
         }
      });
      walker.on("end", function() {
         var wrap = function(cnt) {
            return getRealmHeader() + "\n" + cnt.join('\n') + "\n" + getRealmFooter(isDev);
         }
         if (changes.backend) {
            fs.writeFileSync(files.backend, wrap(data.backend));
         }
         if (changes.frontend) {
            fs.writeFileSync(files.frontend, wrap(data.frontend));
         }
         if (changes.universal) {
            fs.writeFileSync(files.universal, wrap(data.universal));
         }
         return resolve(changes);
      });
   });
}

lib.universal = universal;
lib.gulp = gulp;
module.exports = lib;
