(function(isNode, $storage, Exports) {
   var domain = {};
   var global;

   // Lodash is required
   var _ = isNode ? require('lodash') : Exports._;

   // Promise is required
   var Promise = isNode ? require('promise') : Exports.Promise;

   // Global storage for modules
   var global = isNode ? $storage : {};

   var log = isNode ? require('log4js').getLogger("realm") : undefined;
   var logger = {
      fatal: function(msg) {
         if (log) {
            return log.fatal(msg);
         }
         return console.error(msg);
      }
   }

   // to keep it in sync with old version (wires-domain)
   global.__wires_services_cached__ = global.__wires_services_cached__ || {};

   function getParamNames(func) {
      var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
      var ARGUMENT_NAMES = /([^\s,]+)/g;
      var fnStr = func.toString().replace(STRIP_COMMENTS, '');
      var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
      if (result === null)
         result = [];
      return result;
   };

   var isPromise = function(v) {
      return v && _.isFunction(v.then) && _.isFunction(v.catch);
   };

   // Extracts arguments and defined target for the require function
   function getInputArguments(args) {
      var out = {};
      out.localServices = {};
      if (args.length > 0) {
         out.source = args[0];
         out.target = args[0];
         if (_.isPlainObject(args[0])) {
            var opts = args[0];
            out.target = opts.target;
            out.source = opts.source;
            out.instance = opts.instance;
         }
         // call(func, callback)
         if (args.length > 1) {
            var argsDefined = _.isString(args[0]) || _.isArray(args[0]);
            if (argsDefined) {
               if (_.isArray(args[0])) {
                  out.source = args[0];
               } else {
                  out.source = _.isString(args[0]) ? [args[0]] : args[0];
               }
               if (_.isFunction(args[1])) {
                  out.target = args[1];
               }
               if (_.isFunction(args[2])) {
                  out.target = args[2];
               }
            } else {

               if (_.isFunction(args[1])) {
                  out.callReady = args[1];
               }
               if (_.isPlainObject(args[1])) {
                  out.localServices = args[1];
               }
            }
         }
         if (args.length === 3) {
            if (_.isPlainObject(args[1])) {
               out.localServices = args[1];
            }
            if (_.isFunction(args[2])) {
               out.callReady = args[2];
            }
         }
      }
      out.target = out.target || function() {};
      out.source = out.source ? out.source : out.target;
      out.callReady = out.callReady || function() {};
      return out;
   };

   var domainEach = function(argv, cb) {
      return new Promise(function(resolve, reject) {
         var callbacks = [];
         var results = [];
         var isObject = _.isPlainObject(argv);
         var index = -1;
         var iterate = function() {
            index++;
            if (index < _.size(argv)) {
               var key;
               var value;
               if (isObject) {
                  key = _.keys(argv)[index];
                  value = argv[key];
               } else {
                  key = index;
                  value = argv[index];
               }
               if (isPromise(value)) {
                  value.then(function(data) {
                     results.push(data);
                     iterate();
                  }).catch(reject);
               } else {
                  var res = cb.call(cb, value, key);
                  if (isPromise(res)) {
                     res.then(function(a) {
                        results.push(a);
                        iterate();
                     }).catch(reject);
                  } else {
                     results.push(res);
                     iterate();
                  }
               }
            } else {
               return resolve(results);
            }
         };
         iterate();
      });
   }
   var Realm = {
      each: domainEach,
      service: function() {
         this.register.apply(this, arguments);
      },
      start: function(moduleName) {
         return Realm.require(moduleName, function(target) {
            if (target && _.isFunction(target.main)) {
               target.main();
            }
         });
      },
      module: function(name, func, opts) {
         opts = opts || {};
         opts.cache = true;
         this.register.apply(this, [name, func, opts, true]);
      },
      register: function(name, arg1, arg2, cache) {
         var localArgs = null;
         var target = arg1;
         if (_.isArray(arg1)) {
            localArgs = arg1;
            target = arg2;
         }
         global.__wires_services__ = global.__wires_services__ || {};
         global.__wires_services__[name] = {
            name: name,
            target: target,
            args: localArgs,
            cache: cache
         };
      },
      isRegistered: function(name) {
         return global.__wires_services__ && global.__wires_services__[name] !== undefined;
      },

      requirePackage: function(name) {
         var _packageServices = {}
         var self = this;
         return domainEach(global.__wires_services__, function(service, serviceName) {
            var _package = serviceName.indexOf(name) === 0 ? name : false;
            if (_package[1]) {
               return self.require([serviceName], function(serviceInstance) {
                  _packageServices[serviceName] = serviceInstance
               })
            }
         }).then(function() {
            return _packageServices;
         });
      },
      storeModule: function(name, inst) {
         global.__wires_services_cached__[name] = inst;
      },
      require: function() {
         var data = getInputArguments(arguments);

         var self = this;
         var localServices = data.localServices;
         var variables = _.isArray(data.source) ? data.source : getParamNames(data.source);

         var target = data.target;
         var callReady = data.callReady;
         var instance = data.instance;
         var globalServices = global.__wires_services__;

         var resultPromise = new Promise(function(resolve, reject) {
            var args = [];
            var avialableServices = _.merge(localServices, globalServices);

            for (var i in variables) {
               var v = variables[i];
               var variableName = variables[i];
               if (!avialableServices[variableName]) {
                  logger.fatal("Error while injecting variable '" + variableName + "' into function \n" +
                     data.source.toString());
                  return reject({
                     status: 500,
                     message: "Service with name '" + variableName + "' was not found "
                  });
               }
               args.push(avialableServices[variableName]);
            }

            var results = [];
            return domainEach(args, function(item) {
               if (item.cache && global.__wires_services_cached__[item.name] !== undefined) {
                  return global.__wires_services_cached__[item.name];
               }
               var argService = item.target;
               var requiredArgs = item.args;

               if (_.isFunction(argService)) {
                  var promised;
                  var currentArgs = [];
                  if (requiredArgs) {
                     currentArgs = [requiredArgs, localServices, argService];
                  } else {
                     currentArgs = [argService, localServices];
                  }
                  return self.require.apply(self, currentArgs).then(function(dest) {
                     if (item.cache) {
                        self.storeModule(item.name, dest);
                     }
                     return dest;
                  });
               } else {
                  return argService || item;
               }
            }).then(function(results) {

               return target.apply(instance || results, results);
            }).then(resolve).catch(reject);
         });
         return resultPromise;
      }
   }
   Exports.realm = Realm;
})(typeof module !== 'undefined' && module.exports,
   typeof module !== 'undefined' && module.exports ? global : this, this);
