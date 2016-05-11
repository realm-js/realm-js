var pathToRegexp = require('path-to-regexp');
var _ = require('lodash');
var realm = require('../realm').realm;
var query_getter = require('./query_getter.js');
var NiceTrace = require("./traceback.js");
var Promise = require("promise");
var logger = require("log4js").getLogger("realm.router");
var Promise = require("promise");
var Convenience = require("./convenience.js");
var RestFul = [];
var Options = {};

realm.module("realm.router.path", function() {
   return function(path) {
      return function(target, property, descriptor) {
         RestFul.push({
            path: path,
            handler: target
         });
      }
   }
});

realm.module("realm.router.Decorator", function() {
   return function(decorator) {
      return function() {
         var args = _.flatten(arguments);
         return function(target, property, descriptor) {
            target.__decorators = target.__decorators || {};
            var collection;
            if (!property) {
               if (!target.__decorators.cls) {
                  target.__decorators.cls = [];
               }
               collection = target.__decorators.cls;
            } else {
               if (!target.__decorators.properties) {
                  target.__decorators.properties = [];
               }
               if (!target.__decorators.properties[property]) {
                  target.__decorators.properties[property] = [];
               }
               collection = target.__decorators.properties[property];
            }
            collection.push({
               decorator: decorator,
               attrs: args
            });
         }
      };
   }
});

realm.module("realm.router.cors", function() {
   return function(path) {
      return function(target, property, descriptor) {
         target.__cors = true;
      }
   }
});

realm.module("realm.router.assert", function() {
   var _throw = function(code, msg) {
      throw {
         status: code,
         message: msg
      };
   }
   return {
      bad_request: function(message) {
         return _throw(400, message || "Bad request");
      },
      unauthorized: function(message) {
         return _throw(401, message || "Unauthorized");
      },
      not_found: function(message) {
         return _throw(404, message || "Not Found");
      }
   }
});

var getResourceCandidate = function(resources, startIndex, url) {
   for (var i = startIndex; i < resources.length; i++) {
      var item = resources[i];
      var keys = [];
      var re = pathToRegexp(item.path, keys);
      params = re.exec(url);
      if (params) {
         return {
            params: params,
            keys: keys,
            handler: item.handler,
            nextIndex: i + 1
         };
      }
   }
};

// Register local services
// Will be available only on rest service construct
var restLocalServices = function(info, params, req, res) {
   var services = {
      $req: req,
      $res: res,
      $params: params,
      // Next function tries to get next
      $next: function() {
         var resources = RestFul;
         var data = getResourceCandidate(resources, info.nextIndex, req.path);
         if (data) {
            return callCurrentResource(data, req, res);
         }
      }
   };
   return services;
};

var callCurrentResource = function(info, req, res) {

   // Extract params
   var mergedParams = {};
   var params = info.params;
   var handler = info.handler;

   _.each(info.keys, function(data, index) {
      var i = index + 1;
      if (params[i] !== null && params[i] !== undefined) {
         var parameterValue = params[i];
         if (parameterValue.match(/^\d{1,4}$/)) {
            parameterValue = parseInt(parameterValue);
         }
         mergedParams[data.name] = parameterValue;
      }
   });
   // Define method name
   var method = req.method.toLowerCase();
   var targetMethod;
   if (handler[method]) {
      targetMethod = handler[method];
   }
   // If there is nothing to execute
   if (!targetMethod) {
      return res.status(501).send({
         error: 501,
         message: "Not implemented"
      });
   }

   if (method === "options" && handler.__cors === true) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Session");
      return res.send({});
   }
   // setting cors headers for any other method
   if (handler.__cors) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Session");
   }

   function promised() {
      return new Promise(function(ok, fail) {
         return ok();
      });
   }

   function mergeServices(services, results) {
      var items = _.compact(results);
      _.each(items, function(dict) {
         if (_.isPlainObject(dict)) {
            _.each(dict, function(value, key) {
               services[key] = value;
            });
         }
      });
   }

   /**
    * decorateObject - decorateObject
    *
    * @param  {type} obj    description
    * @param  {type} method description
    * @return {type}        description
    */
   function decorateObject(obj, method) {

      return new Promise(function(resolve, reject) {
         var services = restLocalServices(info, mergedParams, req, res);

         if (!obj.__decorators) {
            return resolve(services);
         }
         return promised()
            .then(function() {
               if (obj.__decorators.cls) {
                  return realm.each(obj.__decorators.cls, function(item) {
                     services.$attrs = item.attrs || {};
                     return realm.require(item.decorator, services);
                  }).then(function(results) {
                     mergeServices(services, results);
                  });
               }
            }).then(function() {
               var props = obj.__decorators.properties;
               if (props && props[method]) {
                  var items = props[method];
                  return realm.each(items, function(item) {
                     services.$attrs = item.attrs || {};
                     return realm.require(item.decorator, services);
                  }).then(function(results) {
                     mergeServices(services, results);
                  });
               }
            }).then(function() {
               return resolve(services);
            })
            .catch(reject);
      })
   }

   /**
    * requireAndCallDestination - description
    *
    * @return {type}  description
    */
   function requireAndCallDestination() {
      decorateObject(handler, method)
         .then(function(services) {
            return realm.require(targetMethod, services).then(function(result) {
               if (result !== undefined) {
                  return res.send(result);
               }
            })
         }).catch(function(e) {
            var err = {
               status: 500,
               message: "Error"
            };

            logger.fatal(e.stack || e);
            // If we have a direct error

            if (e.status) {
               return res.status(e.status).send(e);
            }
            if (Options.prettyErrors && e.stack) {
               return res.status(500).send(NiceTrace(e));
            }
            return res.status(500).send({
               status: 500,
               message: "Server Error"
            });
         });
   };
   return requireAndCallDestination();
};

var express = function(req, res, next) {

   var resources = RestFul;
   var data = getResourceCandidate(resources, 0, req.path);
   if (!data) {
      return next();
   }
   return callCurrentResource(data, req, res);
};

module.exports = {
   init: function(_package) {
      return realm.requirePackage(_package);
   },
   express: function(_package, opts) {
      opts = opts || {};
      if (opts.prettyErrors) {
         Options.prettyErrors = true;
      }
      this.init(_package).then(function(_packages) {
         logger.info("Package '%s' has been successfully required", _package);
         logger.info("Injested %s routes", _.keys(_packages).length);
      }).catch(function(e) {
         logger.fatal(e.stack || e);
      })
      return express;
   }
};
