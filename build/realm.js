(function(___env___){
/* ****** Setup ****** */
var __scope__ = ___env___.scope;
var $isBackend = ___env___.isBackend;
var __ts__ = ___env___.ts;


/* ******* utils.ts ******* */
__ts__.module("utils.js", function(exports, require){
"use strict";
const funcProto = Function.prototype;
const objectProto = Object.prototype;
const funcToString = funcProto.toString;
const hasOwnProperty = objectProto.hasOwnProperty;
const objectCtorString = funcToString.call(Object);
const objectToString = objectProto.toString;
const objectTag = '[object Object]';
const funcTag = '[object Function]';
const funcTag2 = '[Function]';
const genTag = '[object GeneratorFunction]';
class Utils {
    static isPromise(item) {
        return item !== undefined
            && typeof item.then === 'function' &&
            typeof item.catch === 'function';
    }
    static isNotSet(input) {
        return input === undefined || input === null;
    }
    static isFunction(value) {
        var tag = this.isObject(value) ? objectToString.call(value) : '';
        return tag === funcTag2 || tag == funcTag || tag == genTag;
    }
    static isObject(input) {
        var type = typeof input;
        return !!input && (type == 'object' || type == 'function');
    }
    static isHostObject(value) {
        var result = false;
        if (value != null && typeof value.toString != 'function') {
            try {
                result = !!(value + '');
            }
            catch (e) { }
        }
        return result;
    }
    static overArg(func, transform) {
        return function (arg) {
            return func(transform(arg));
        };
    }
    static isObjectLike(value) {
        return !!value && typeof value == 'object';
    }
    static flatten(data) {
        return [].concat.apply([], data);
    }
    static setHiddenProperty(obj, key, value) {
        Object.defineProperty(obj, key, {
            enumerable: false,
            value: value
        });
        return value;
    }
    static isString(value) {
        return typeof value === 'string';
    }
    static isArray(input) {
        return Array.isArray(input);
    }
    static isPlainObject(value) {
        if (!this.isObjectLike(value) ||
            objectToString.call(value) != objectTag || this.isHostObject(value)) {
            return false;
        }
        var proto = this.overArg(Object.getPrototypeOf, Object)(value);
        if (proto === null) {
            return true;
        }
        var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
        return (typeof Ctor == 'function' &&
            Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
    }
    static getParameterNamesFromFunction(func) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;
        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if (result === null)
            result = [];
        return result;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Utils;

});

/* ******* each.ts ******* */
__ts__.module("each.js", function(exports, require){
"use strict";
const utils_1 = require('./utils');
exports.Each = (argv, cb) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const isObject = utils_1.default.isPlainObject(argv);
        let index = -1;
        let iterate = () => {
            index++;
            if (index < argv.length) {
                let key = isObject ? Object.keys(argv)[index] : index;
                let value = isObject ? argv[key] : argv[index];
                if (utils_1.default.isPromise(value)) {
                    value.then(data => { results.push(data); iterate(); }).catch(reject);
                }
                else {
                    let res = cb(...[value, key]);
                    if (utils_1.default.isPromise(res)) {
                        res.then((a) => {
                            results.push(a);
                            iterate();
                        }).catch(reject);
                    }
                    else {
                        results.push(res);
                        iterate();
                    }
                }
            }
            else
                return resolve(results);
        };
        return iterate();
    });
};

});

/* ******* chain.ts ******* */
__ts__.module("chain.js", function(exports, require){
"use strict";
const utils_1 = require('./utils');
const each_1 = require('./each');
class Chainable {
    constructor() {
        this.$finalized = false;
        this.$killed = false;
        this.$collection = {};
    }
    break(manual) {
        this.$finalized = true;
        this.$manual = manual;
    }
    kill() {
        this.$finalized = true;
        this.$killed = true;
    }
}
exports.Chainable = Chainable;
let ChainClassContructor = (input) => {
    if (input instanceof Chainable) {
        return input;
    }
    let instance = {};
    if (utils_1.default.isFunction(input)) {
        instance = new input();
        if (instance instanceof Chainable) {
            return instance;
        }
    }
    else if (utils_1.default.isObject(input)) {
        instance = input;
    }
    else {
        throw new Error("Chain requires a Class or an Instance");
    }
    instance['$collection'] = {};
    instance['break'] = manual => {
        utils_1.default.setHiddenProperty(instance, '$finalized', true);
        utils_1.default.setHiddenProperty(instance, '$manual', manual);
    };
    instance['kill'] = () => {
        utils_1.default.setHiddenProperty(instance, '$finalized', true);
        utils_1.default.setHiddenProperty(instance, '$killed', true);
    };
    return instance;
};
exports.Chain = (cls) => {
    let instance = ChainClassContructor(cls);
    let props = Object.getOwnPropertyNames(instance.constructor.prototype);
    let tasks = [];
    for (var i = 1; i < props.length; i++) {
        let propertyName = props[i];
        if (!(propertyName in ["format", 'kill', 'break'])) {
            let isSetter = propertyName.match(/^set(.*)$/);
            let setterName = null;
            if (isSetter) {
                setterName = isSetter[1];
                setterName = setterName.charAt(0).toLowerCase() + setterName.slice(1);
            }
            tasks.push({
                prop: propertyName,
                setter: setterName,
            });
        }
    }
    let store = function (prop, val) {
        instance.$collection[prop] = val;
        instance[prop] = val;
    };
    let evaluate = function (task) {
        var result = instance[task.prop].apply(instance);
        if (task.setter) {
            if (utils_1.default.isPromise(result)) {
                return result.then(res => { store(task.setter, res); });
            }
            else
                store(task.setter, result);
        }
        return result;
    };
    return each_1.Each(tasks, (task) => {
        return !instance.$finalized ? evaluate(task) : false;
    }).then(() => {
        if (utils_1.default.isFunction(instance["format"])) {
            return evaluate({
                prop: "format"
            });
        }
    }).then(specialFormat => {
        if (instance.$killed)
            return;
        if (!instance.$manual) {
            if (specialFormat)
                return specialFormat;
            return instance.$collection;
        }
        else
            return instance.$manual;
    });
};

});

/* ******* core/RequireArgumentParser.ts ******* */
__ts__.module("core/RequireArgumentParser.js", function(exports, require){
"use strict";
const utils_1 = require('../utils');
class RequireOptions {
    constructor(target, dependencies, locals) {
        this.target = target;
        this.dependencies = dependencies;
        this.locals = locals;
    }
}
exports.RequireOptions = RequireOptions;
class Dependency {
    constructor(name, alias = name) {
        this.name = name;
        this.alias = alias;
    }
}
exports.Dependency = Dependency;
class DependencyFromInjection {
    static create(injections) {
        let dependencies = [];
        for (let i = 0; i < injections.length; i++) {
            let name = injections[i];
            if (name instanceof Dependency) {
                dependencies.push(name);
            }
            else {
                let alias = name;
                if (name.indexOf('@') > -1) {
                    [name, alias] = name.split('@');
                }
                dependencies.push(new Dependency(name, alias));
            }
        }
        return dependencies;
    }
}
exports.DependencyFromInjection = DependencyFromInjection;
class _RequireArgumentParser {
    constructor(input) {
        this.input = input;
        this.locals = {};
        this.first = input[0];
        this.second = input[1];
        this.third = input[2];
        this.isFunction();
    }
    isFunction() {
        if (!utils_1.default.isFunction(this.first)) {
            return this.isString();
        }
        this.target = this.first;
        this.injections =
            utils_1.default.getParameterNamesFromFunction(this.target);
        if (this.first && utils_1.default.isPlainObject(this.second)) {
            this.locals = this.second;
        }
    }
    isString() {
        if (!utils_1.default.isString(this.first)) {
            return this.isArray();
        }
        this.first = [this.first];
        return this.isArray();
    }
    isArray() {
        if (!utils_1.default.isArray(this.first))
            return;
        if (!utils_1.default.isFunction(this.second)) {
            throw new Error("Second argument must be function/closure!");
        }
        this.injections = this.first;
        this.target = this.second;
        if (utils_1.default.isPlainObject(this.third)) {
            this.locals = this.third;
        }
    }
    format() {
        if (!utils_1.default.isFunction(this.target)) {
            throw new Error("Require method requires a closure!");
        }
        let deps = DependencyFromInjection.create(this.injections);
        let opts = new RequireOptions(this.target, deps, this.locals);
        return opts;
    }
}
exports.RequireArgumentParser = (input) => {
    let parser = new _RequireArgumentParser(input);
    return parser.format();
};

});

/* ******* core/RealmModule.ts ******* */
__ts__.module("core/RealmModule.js", function(exports, require){
"use strict";
const utils_1 = require('../utils');
const RequireArgumentParser_1 = require('./RequireArgumentParser');
class RealmModule {
    constructor(name, b, c, ts_module = false) {
        this.ts_module = ts_module;
        this.name = name;
        if (utils_1.default.isFunction(b)) {
            this.closure = b;
        }
        let injections = [];
        if (utils_1.default.isArray(b)) {
            injections = b;
            if (!utils_1.default.isFunction(c)) {
                throw new Error("Module must have a closure!");
            }
            this.closure = c;
        }
        this.dependencies = RequireArgumentParser_1.DependencyFromInjection.create(injections);
    }
    isTypeScript() {
        return this.ts_module;
    }
    isCached() {
        return this.cached !== undefined;
    }
    getCache() {
        return this.cached;
    }
    setCache(obj) {
        this.cached = obj;
        return obj;
    }
    getName() {
        return this.name;
    }
    getDependencies() {
        return this.dependencies;
    }
    getClosure() {
        return this.closure;
    }
    toRequire(locals) {
        return [this.dependencies, this.closure, locals];
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RealmModule;

});

/* ******* core/Storage.ts ******* */
__ts__.module("core/Storage.js", function(exports, require){
"use strict";
const environment = $isBackend ? global : window;
environment.__realm__ = environment.__realm__ || {};
class Storage {
    static set(name, obj) {
        environment.__realm__[name] = obj;
    }
    static get(name) {
        return environment.__realm__[name];
    }
    static flush() {
        environment.__realm__ = {};
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Storage;

});

/* ******* core/Core.ts ******* */
__ts__.module("core/Core.js", function(exports, require){
"use strict";
const each_1 = require('../each');
const Storage_1 = require('./Storage');
const RealmModule_1 = require('./RealmModule');
const RequireArgumentParser_1 = require('./RequireArgumentParser');
let _module = (name, b, c) => {
    let localModule = new RealmModule_1.default(name, b, c);
    Storage_1.default.set(localModule.getName(), localModule);
};
let _ts_module = (name, b, c) => {
    let localModule = new RealmModule_1.default(name, b, c, true);
    Storage_1.default.set(localModule.getName(), localModule);
};
let _resolve = (opts, injection) => {
    let mod = Storage_1.default.get(injection.name);
    if (injection.alias in opts.locals) {
        return opts.locals[injection.alias];
    }
    if (mod === undefined) {
        throw new Error("Module " + injection + " is not registered!\n >> " + opts.target);
    }
    if (mod.isCached()) {
        return mod.getCache();
    }
    return _require(mod.getDependencies(), mod.getClosure(), opts.locals, mod)
        .then(x => mod.setCache(x));
};
let _apply = (opts, results, mod) => {
    if (mod !== undefined && mod.isTypeScript()) {
        let [_exports, _env] = [{}, {}];
        for (let index = 0; index < opts.dependencies.length; index++) {
            _env[opts.dependencies[index].alias] = results[index];
        }
        opts.target(...[_exports, x => _env[x]]);
        return _exports;
    }
    ;
    return opts.target(...results);
};
let _require = (a, b, c, mod) => {
    let opts = RequireArgumentParser_1.RequireArgumentParser([a, b, c]);
    return each_1.Each(opts.dependencies, injection => _resolve(opts, injection))
        .then((toApply) => {
        return _apply(opts, toApply, mod);
    });
};
exports.mod = _module;
exports.ts_mod = _ts_module;
exports.req = _require;

});

/* ******* realm.ts ******* */
__ts__.module("realm.js", function(exports, require){
"use strict";
const each_1 = require('./each');
const chain_1 = require('./chain');
const utils_1 = require('./utils');
const Storage_1 = require('./core/Storage');
const Core_1 = require('./core/Core');
const RequireArgumentParser_1 = require('./core/RequireArgumentParser');
exports.realm = {
    module: Core_1.mod,
    ts_module: Core_1.ts_mod,
    require: Core_1.req,
    RequireArgumentParser: RequireArgumentParser_1.RequireArgumentParser,
    each: each_1.Each,
    chain: chain_1.Chain,
    Chainable: chain_1.Chainable,
    utils: utils_1.default,
    flush: Storage_1.default.flush
};

});

__ts__.expose(__scope__, "realm");})(function($scope, $isBackend) { var ts = {register: {},pathJoin: function() { var parts = []; for (var i = 0, l = arguments.length; i < l; i++) {parts = parts.concat(arguments[i].split("/")); } var newParts = []; for (i = 0, l = parts.length; i < l; i++) {var part = parts[i];if (!part || part === ".") { continue}if (part === "..") { newParts.pop();} else { newParts.push(part);} } if (parts[0] === "") {newParts.unshift("") } return newParts.join("/") || (newParts.length ? "/" : ".");},module: function(name, fn) { var _exports = {}; var relative = "./"; var rel = name.match(/^(.*)\/[\w]+\.js$/); if (rel) {relative = rel[1]; } fn(_exports, this.require.bind({self: this,path: name,relative: relative })); this.register[name] = _exports;},require: function(name) { var self = this.self; var path = this.path; var relative = this.relative; if (name[0] === ".") {var target = ts.pathJoin(relative, name) + ".js";if (self.register[target]) { return self.register[target];} } else {return require(name); }},expose: function(scope, path) { path = path.match(/\.js^/) ? path : path + ".js"; var e = this.register[path]; if (e !== undefined) {var useAmd = !$isBackend && typeof define == 'function' && define.amd;for (var key in e) { var value = e[key]; if (useAmd) {define(key, [], function() { return value;}); } else {$scope[key] = value }} } else {throw new Error('Module "' + path + '" Cannot be exposed! Make sure you export variables correctly and the module is present'); }} }; return {isBackend: $isBackend,scope: $scope,ts : ts }}(typeof exports !== "undefined" ? exports : this, typeof exports !== "undefined"));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWxzLnRzIiwiZWFjaC50cyIsImNoYWluLnRzIiwiY29yZS9SZXF1aXJlQXJndW1lbnRQYXJzZXIudHMiLCJjb3JlL1JlYWxtTW9kdWxlLnRzIiwiY29yZS9TdG9yYWdlLnRzIiwiY29yZS9Db3JlLnRzIiwicmVhbG0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7QUFDckMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUNyQyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQ3hDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7QUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25ELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7QUFDNUMsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUM7QUFDcEMsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUM7QUFDcEMsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDO0FBQzlCLE1BQU0sTUFBTSxHQUFHLDRCQUE0QixDQUFDO0FBRzVDO0lBR0UsT0FBTyxTQUFTLENBQUMsSUFBUztRQUN4QixNQUFNLENBQUMsSUFBSSxLQUFLLFNBQVM7ZUFDcEIsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVU7WUFDbEMsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQztJQUNyQyxDQUFDO0lBR0QsT0FBTyxRQUFRLENBQUMsS0FBVTtRQUN4QixNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDO0lBQy9DLENBQUM7SUFFRCxPQUFPLFVBQVUsQ0FBQyxLQUFVO1FBQzFCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdB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QUMsQ0FBQyxFQUFFLENBQUUsRUFBRSxDQUFFLEVBQUUsR0FBa0I7SUFFekMsSUFBSSxJQUFJLEdBQW1CLDZDQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVELE1BQU0sQ0FBQyxXQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxTQUFTLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNqRSxJQUFJLENBQUMsQ0FBQyxPQUFtQjtRQUN0QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFFLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDLENBQUE7QUFJVSxXQUFHLEdBQUcsT0FBTyxDQUFDO0FBQ2QsY0FBTSxHQUFHLFVBQVUsQ0FBQztBQUNwQixXQUFHLEdBQUcsUUFBUSxDQUFDOzs7Ozs7O0FDeEUxQix1QkFBbUIsUUFBUSxDQUFDLENBQUE7QUFDNUIsd0JBQStCLFNBQVMsQ0FBQyxDQUFBO0FBQ3pDLHdCQUFrQixTQUFTLENBQUMsQ0FBQTtBQUU1QiwwQkFBb0IsZ0JBQWdCLENBQUMsQ0FBQTtBQUNyQyx1QkFBK0IsYUFBYSxDQUFDLENBQUE7QUFDN0Msd0NBQW9ELDhCQUE4QixDQUFDLENBQUE7QUFFdEUsYUFBSyxHQUFHO0lBQ2xCLE1BQU0sRUFBRyxVQUFHO0lBQ1osU0FBUyxFQUFHLGFBQU07SUFDbEIsT0FBTyxFQUFHLFVBQUc7SUFDYixxQkFBcUIsRUFBRyw2Q0FBcUI7SUFDN0MsSUFBSSxFQUFHLFdBQUk7SUFDWCxLQUFLLEVBQUcsYUFBSztJQUNiLFNBQVMsRUFBRyxpQkFBUztJQUNyQixLQUFLLEVBQUcsZUFBSztJQUNiLEtBQUssRUFBRyxpQkFBTyxDQUFDLEtBQUs7Q0FDdkIsQ0FBQSIsImZpbGUiOiJyZWFsbS5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbmNvbnN0IG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcbmNvbnN0IGZ1bmNUb1N0cmluZyA9IGZ1bmNQcm90by50b1N0cmluZztcbmNvbnN0IGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHk7XG5jb25zdCBvYmplY3RDdG9yU3RyaW5nID0gZnVuY1RvU3RyaW5nLmNhbGwoT2JqZWN0KTtcbmNvbnN0IG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5jb25zdCBvYmplY3RUYWcgPSAnW29iamVjdCBPYmplY3RdJztcbmNvbnN0IGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xuY29uc3QgZnVuY1RhZzIgPSAnW0Z1bmN0aW9uXSc7XG5jb25zdCBnZW5UYWcgPSAnW29iamVjdCBHZW5lcmF0b3JGdW5jdGlvbl0nO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFV0aWxzIHtcblxuICAvLyBpc1Byb21pc2UoKVxuICBzdGF0aWMgaXNQcm9taXNlKGl0ZW06IGFueSkge1xuICAgIHJldHVybiBpdGVtICE9PSB1bmRlZmluZWRcbiAgICAgICYmIHR5cGVvZiBpdGVtLnRoZW4gPT09ICdmdW5jdGlvbicgJiZcbiAgICAgIHR5cGVvZiBpdGVtLmNhdGNoID09PSAnZnVuY3Rpb24nO1xuICB9XG5cbiAgLy8gaXNOb3RTZXQgKHVuZGVmaW5lZCBhbmQgbnVsbCB3aWxsIHJldHVybiB0cnVlKVxuICBzdGF0aWMgaXNOb3RTZXQoaW5wdXQ6IGFueSkge1xuICAgIHJldHVybiBpbnB1dCA9PT0gdW5kZWZpbmVkIHx8IGlucHV0ID09PSBudWxsO1xuICB9XG5cbiAgc3RhdGljIGlzRnVuY3Rpb24odmFsdWU6IGFueSkge1xuICAgIHZhciB0YWcgPSB0aGlzLmlzT2JqZWN0KHZhbHVlKSA/IG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpIDogJyc7XG4gICAgcmV0dXJuIHRhZyA9PT0gZnVuY1RhZzIgfHwgdGFnID09IGZ1bmNUYWcgfHwgdGFnID09IGdlblRhZztcbiAgfVxuXG4gIC8vaXNPYmplY3RcbiAgc3RhdGljIGlzT2JqZWN0KGlucHV0OiBhbnkpIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBpbnB1dDtcbiAgICByZXR1cm4gISFpbnB1dCAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xuICB9XG5cbiAgLy9pc0hvc3RPYmplY3RcbiAgc3RhdGljIGlzSG9zdE9iamVjdCh2YWx1ZSkge1xuICAgIC8vIE1hbnkgaG9zdCBvYmplY3RzIGFyZSBgT2JqZWN0YCBvYmplY3RzIHRoYXQgY2FuIGNvZXJjZSB0byBzdHJpbmdzXG4gICAgLy8gZGVzcGl0ZSBoYXZpbmcgaW1wcm9wZXJseSBkZWZpbmVkIGB0b1N0cmluZ2AgbWV0aG9kcy5cbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKHZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHZhbHVlLnRvU3RyaW5nICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9ICEhKHZhbHVlICsgJycpO1xuICAgICAgfSBjYXRjaCAoZSkgeyB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvL292ZXJBcmdcbiAgc3RhdGljIG92ZXJBcmcoZnVuYywgdHJhbnNmb3JtKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgIHJldHVybiBmdW5jKHRyYW5zZm9ybShhcmcpKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gaXNPYmplY3RMaWtlXG4gIHN0YXRpYyBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG4gIH1cblxuICAvLyBGbGF0dGVuIGFyZ3VtZXRuc1xuICAvLyBmbGF0dGVuKCdhJywgJ2InLCBbJ2MnXSkgLT4gWydhJywgJ2InLCAnYyddXG4gIHN0YXRpYyBmbGF0dGVuKGRhdGE6IGFueSkge1xuICAgIHJldHVybiBbXS5jb25jYXQuYXBwbHkoW10sIGRhdGEpO1xuICB9XG5cbiAgLy8gc2V0cyBoaWRkZW4gcHJvcGVydHlcbiAgc3RhdGljIHNldEhpZGRlblByb3BlcnR5KG9iajogT2JqZWN0LCBrZXk6IHN0cmluZywgdmFsdWU6IE9iamVjdCk6IGFueSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZVxuICAgIH0pO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHN0YXRpYyBpc1N0cmluZyh2YWx1ZTogYW55KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG4gIH1cblxuICAvLyBpc0FycmF5XG4gIHN0YXRpYyBpc0FycmF5KGlucHV0OiBhbnkpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpbnB1dCk7XG4gIH1cblxuICAvLyBpc1BsYWluT2JqZWN0XG4gIHN0YXRpYyBpc1BsYWluT2JqZWN0KHZhbHVlKSB7XG4gICAgaWYgKCF0aGlzLmlzT2JqZWN0TGlrZSh2YWx1ZSkgfHxcbiAgICAgIG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpICE9IG9iamVjdFRhZyB8fCB0aGlzLmlzSG9zdE9iamVjdCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHByb3RvID0gdGhpcy5vdmVyQXJnKE9iamVjdC5nZXRQcm90b3R5cGVPZiwgT2JqZWN0KSh2YWx1ZSk7XG4gICAgaWYgKHByb3RvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIEN0b3IgPSBoYXNPd25Qcm9wZXJ0eS5jYWxsKHByb3RvLCAnY29uc3RydWN0b3InKSAmJiBwcm90by5jb25zdHJ1Y3RvcjtcbiAgICByZXR1cm4gKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiZcbiAgICAgIEN0b3IgaW5zdGFuY2VvZiBDdG9yICYmIGZ1bmNUb1N0cmluZy5jYWxsKEN0b3IpID09IG9iamVjdEN0b3JTdHJpbmcpO1xuICB9XG5cbiAgLy8gZ2V0cyBwYXJhbWV0ZXIgbmFtZXNcbiAgc3RhdGljIGdldFBhcmFtZXRlck5hbWVzRnJvbUZ1bmN0aW9uKGZ1bmM6IGFueSkge1xuICAgIHZhciBTVFJJUF9DT01NRU5UUyA9IC8oKFxcL1xcLy4qJCl8KFxcL1xcKltcXHNcXFNdKj9cXCpcXC8pKS9tZztcbiAgICB2YXIgQVJHVU1FTlRfTkFNRVMgPSAvKFteXFxzLF0rKS9nO1xuICAgIHZhciBmblN0ciA9IGZ1bmMudG9TdHJpbmcoKS5yZXBsYWNlKFNUUklQX0NPTU1FTlRTLCAnJyk7XG4gICAgdmFyIHJlc3VsdCA9IGZuU3RyLnNsaWNlKGZuU3RyLmluZGV4T2YoJygnKSArIDEsIGZuU3RyLmluZGV4T2YoJyknKSkubWF0Y2goQVJHVU1FTlRfTkFNRVMpO1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwpXG4gICAgICByZXN1bHQgPSBbXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cbiIsImltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIEVhY2ggZnVuY3Rpb25cbiAqIEl0ZXJhdGVzIGFueSBvYmplY3RzIGluY2x1ZGluZyBQcm9taXNlc1xuICovXG5leHBvcnQgdmFyIEVhY2ggPSAoYXJndjogYW55LCBjYjogeyAoLi4uYXJncyk6IGFueSB9KSA9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IFtdO1xuICAgICAgICBjb25zdCBpc09iamVjdCA9IHV0aWxzLmlzUGxhaW5PYmplY3QoYXJndik7XG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gLTE7XG4gICAgICAgIGxldCBpdGVyYXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIGlmIChpbmRleCA8IGFyZ3YubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGtleSA9IGlzT2JqZWN0ID8gT2JqZWN0LmtleXMoYXJndilbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gaXNPYmplY3QgPyBhcmd2W2tleV0gOiBhcmd2W2luZGV4XTtcbiAgICAgICAgICAgICAgICAvLyBQcm9taXNlcyBuZWVkIHRvIGJlIHJlc29sdmVkXG4gICAgICAgICAgICAgICAgaWYgKHV0aWxzLmlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUudGhlbihkYXRhID0+IHsgcmVzdWx0cy5wdXNoKGRhdGEpOyBpdGVyYXRlKCk7IH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlcyA9IGNiKC4uLlt2YWx1ZSwga2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc1Byb21pc2UocmVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHJldHVybiByZXNvbHZlKHJlc3VsdHMpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0ZSgpO1xuICAgIH0pO1xufVxuIiwiaW1wb3J0IHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRWFjaCB9IGZyb20gJy4vZWFjaCc7XG5cblxuXG5leHBvcnQgY2xhc3MgQ2hhaW5hYmxlIHtcbiAgICBwcm90ZWN0ZWQgJGZpbmFsaXplZDogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHByb3RlY3RlZCAka2lsbGVkOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHJvdGVjdGVkICRtYW51YWw6IGFueTtcbiAgICBwcm90ZWN0ZWQgJGNvbGxlY3Rpb246IE9iamVjdCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogcHJvdGVjdGVkIC0gYnJlYWtcbiAgICAgKlxuICAgICAqIEBwYXJhbSAge2FueX0gbWFudWFsIDogQW55IG9iamVjdFxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGJyZWFrKG1hbnVhbDogYW55KTogdm9pZCB7XG4gICAgICAgIHRoaXMuJGZpbmFsaXplZCA9IHRydWU7XG4gICAgICAgIHRoaXMuJG1hbnVhbCA9IG1hbnVhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBwcm90ZWN0ZWQgLSBraWxsXG4gICAgICogS2lsbHMgdGhlIGNoYWluXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQga2lsbCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy4kZmluYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy4ka2lsbGVkID0gdHJ1ZTtcbiAgICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGFuZCBjcmVhdGVzIGV4dHJhIHByb3BlcnRpZXMgZm9yIHRoZSBjbGFzc1xuICogU3VwcG9ydHMgbm9uLXR5cGVzY3JpcHQgdXNhZ2VcbiAqIEZvciB0eXBlc2NyaXB0IENoYWluYWJsZSBjbGFzcyBpZiByZXF1aXJlZFxuICovXG5sZXQgQ2hhaW5DbGFzc0NvbnRydWN0b3IgPSAoaW5wdXQ6IGFueSkgPT4ge1xuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIENoYWluYWJsZSkge1xuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuICAgIFxuICAgIGxldCBpbnN0YW5jZTogT2JqZWN0ID0ge307XG4gICAgLy8gaWYgdGhhdCdzIGZ1bmN0aW9uJ1xuICAgIGlmICh1dGlscy5pc0Z1bmN0aW9uKGlucHV0KSkge1xuICAgICAgICBpbnN0YW5jZSA9IG5ldyBpbnB1dCgpO1xuICAgICAgICBpZiggaW5zdGFuY2UgaW5zdGFuY2VvZiBDaGFpbmFibGUgKXtcbiAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodXRpbHMuaXNPYmplY3QoaW5wdXQpKSB7XG4gICAgICAgIGluc3RhbmNlID0gaW5wdXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2hhaW4gcmVxdWlyZXMgYSBDbGFzcyBvciBhbiBJbnN0YW5jZVwiKVxuICAgIH1cbiAgICBpbnN0YW5jZVsnJGNvbGxlY3Rpb24nXSA9IHt9O1xuICAgIGluc3RhbmNlWydicmVhayddID0gbWFudWFsID0+IHtcbiAgICAgICAgdXRpbHMuc2V0SGlkZGVuUHJvcGVydHkoaW5zdGFuY2UsICckZmluYWxpemVkJywgdHJ1ZSk7XG4gICAgICAgIHV0aWxzLnNldEhpZGRlblByb3BlcnR5KGluc3RhbmNlLCAnJG1hbnVhbCcsIG1hbnVhbCk7XG4gICAgfVxuICAgIGluc3RhbmNlWydraWxsJ10gPSAoKSA9PiB7XG4gICAgICAgIHV0aWxzLnNldEhpZGRlblByb3BlcnR5KGluc3RhbmNlLCAnJGZpbmFsaXplZCcsIHRydWUpO1xuICAgICAgICB1dGlscy5zZXRIaWRkZW5Qcm9wZXJ0eShpbnN0YW5jZSwgJyRraWxsZWQnLCB0cnVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG4vKipcbiAqIENoYWluIGNsYXNzXG4gKiBFeGVjdXRlcyBtZXRob2RzIGluIG9yZGVyXG4gKi9cbmV4cG9ydCBjb25zdCBDaGFpbiA9IChjbHM6IGFueSkgPT4ge1xuICAgIGxldCBpbnN0YW5jZSA9IENoYWluQ2xhc3NDb250cnVjdG9yKGNscyk7XG4gICAgbGV0IHByb3BzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICBsZXQgdGFza3MgPSBbXTtcblxuICAgIC8vIGNvbGxlY3RpbmcgcHJvcHMgYW5kIGNoZWNraW5nIGZvciBzZXR0ZXJzXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcHJvcGVydHlOYW1lID0gcHJvcHNbaV07XG4gICAgICAgIGlmICghKHByb3BlcnR5TmFtZSBpbiBbXCJmb3JtYXRcIiwgJ2tpbGwnLCAnYnJlYWsnXSkpIHtcbiAgICAgICAgICAgIGxldCBpc1NldHRlciA9IHByb3BlcnR5TmFtZS5tYXRjaCgvXnNldCguKikkLyk7XG4gICAgICAgICAgICBsZXQgc2V0dGVyTmFtZSA9IG51bGw7XG4gICAgICAgICAgICBpZiAoaXNTZXR0ZXIpIHtcbiAgICAgICAgICAgICAgICBzZXR0ZXJOYW1lID0gaXNTZXR0ZXJbMV1cbiAgICAgICAgICAgICAgICBzZXR0ZXJOYW1lID0gc2V0dGVyTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHNldHRlck5hbWUuc2xpY2UoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YXNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBwcm9wOiBwcm9wZXJ0eU5hbWUsXG4gICAgICAgICAgICAgICAgc2V0dGVyOiBzZXR0ZXJOYW1lLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTdG9yZSBpdCB0byB0aGUgcHJvcGVydHkgb2YgdGhlIGNsYXNzJ1xuICAgIGxldCBzdG9yZSA9IGZ1bmN0aW9uIChwcm9wLCB2YWwpOiB2b2lkIHtcbiAgICAgICAgaW5zdGFuY2UuJGNvbGxlY3Rpb25bcHJvcF0gPSB2YWw7XG4gICAgICAgIGluc3RhbmNlW3Byb3BdID0gdmFsO1xuICAgIH1cblxuICAgIC8vIEV2YWx1YXRlXG4gICAgbGV0IGV2YWx1YXRlID0gZnVuY3Rpb24gKHRhc2spOiBhbnkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gaW5zdGFuY2VbdGFzay5wcm9wXS5hcHBseShpbnN0YW5jZSk7XG4gICAgICAgIGlmICh0YXNrLnNldHRlcikge1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlzUHJvbWlzZShyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKHJlcyA9PiB7IHN0b3JlKHRhc2suc2V0dGVyLCByZXMpIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHN0b3JlKHRhc2suc2V0dGVyLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gQ2FsbGluZyB0YXNrcyBpbiBvcmRlciB0aGV5IGhhdmUgYmVlbiBjcmVhdGVkXG4gICAgcmV0dXJuIEVhY2godGFza3MsICh0YXNrOiBhbnkpID0+IHtcbiAgICAgICAgcmV0dXJuICFpbnN0YW5jZS4kZmluYWxpemVkID8gZXZhbHVhdGUodGFzaykgOiBmYWxzZTtcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKHV0aWxzLmlzRnVuY3Rpb24oaW5zdGFuY2VbXCJmb3JtYXRcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZhbHVhdGUoe1xuICAgICAgICAgICAgICAgIHByb3A6IFwiZm9ybWF0XCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSkudGhlbihzcGVjaWFsRm9ybWF0ID0+IHtcbiAgICAgICAgaWYgKGluc3RhbmNlLiRraWxsZWQpIHJldHVybjtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS4kbWFudWFsKSB7XG4gICAgICAgICAgICBpZiAoc3BlY2lhbEZvcm1hdCkgcmV0dXJuIHNwZWNpYWxGb3JtYXQ7XG4gICAgICAgICAgICByZXR1cm4gaW5zdGFuY2UuJGNvbGxlY3Rpb247XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLiRtYW51YWw7XG4gICAgfSk7XG59XG4iLCJpbXBvcnQgdXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgUmVxdWlyZU9wdGlvbnNcbntcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgdGFyZ2V0IDogeyAoLi4uYXJncykgOiBhbnkgfSwgcHVibGljIGRlcGVuZGVuY2llcyA6IERlcGVuZGVuY3lbXSxwdWJsaWMgbG9jYWxzIDoge30pe31cbn1cblxuZXhwb3J0IGNsYXNzIERlcGVuZGVuY3lcbntcbiAgICBjb25zdHJ1Y3RvciggcHVibGljIG5hbWUgOiBzdHJpbmcsIHB1YmxpYyBhbGlhcyA6IHN0cmluZyA9IG5hbWUpe31cbn1cblxuLyoqXG4gKiBDcmVhdGUgRGVwZW5kZW5jeSBvYmplY3QgZnJvIGEgbGlzdCBvZiBzdHJpbmdzXG4gKiBbJ2EnLCAnYkBTb21lQWxpYXMnXVxuICovXG5leHBvcnQgY2xhc3MgRGVwZW5kZW5jeUZyb21JbmplY3Rpb24ge1xuICAgIHN0YXRpYyBjcmVhdGUoaW5qZWN0aW9ucyA6IHN0cmluZ1tdKSA6IERlcGVuZGVuY3lbXVxuICAgIHtcbiAgICAgICAgbGV0IGRlcGVuZGVuY2llcyA9IFtdO1xuICAgICAgICBmb3IoIGxldCBpID0gMDsgaTwgaW5qZWN0aW9ucy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBsZXQgbmFtZSA6IHN0cmluZyB8IERlcGVuZGVuY3kgPSBpbmplY3Rpb25zW2ldO1xuICAgICAgICAgICAgaWYgKCBuYW1lIGluc3RhbmNlb2YgRGVwZW5kZW5jeSl7XG4gICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcy5wdXNoKG5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgYWxpYXMgPSBuYW1lO1xuICAgICAgICAgICAgICAgIGlmKCBuYW1lLmluZGV4T2YoJ0AnKSA+IC0xICApe1xuICAgICAgICAgICAgICAgICAgICBbbmFtZSwgYWxpYXNdID0gbmFtZS5zcGxpdCgnQCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXMucHVzaChuZXcgRGVwZW5kZW5jeShuYW1lLCBhbGlhcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGVwZW5kZW5jaWVzO1xuICAgIH1cbn1cblxuLyoqXG4gKiByZXF1aXJlKGZ1bmN0aW9uKGEpeyB9KVxuICogcmVxdWlyZShmdW5jdGlvbigpe30sIHtsb2NhbCA6IDF9KVxuICogXG4gKiByZXF1aXJlKFtdLCBmdW5jdGlvbigpe30gKVxuICogcmVxdWlyZShbXSwgZnVuY3Rpb24oKXt9LCB7bG9jYWwgOiAxfSlcbiAqIFxuICogcmVxdWlyZSgnbWV0aG9kJywgZnVuY3Rpb24obXlzdHVmZil7IH0pXG4gKiByZXF1aXJlKCdtZXRob2QnLCBmdW5jdGlvbihteXN0dWZmKXsgfSwgeyBsb2NhbCA6IDF9KVxuICovXG5jbGFzcyBfUmVxdWlyZUFyZ3VtZW50UGFyc2VyICB7XG4gICAgXG4gICAgLy8gZGVub3JtYWxpemVkIGFyZ3VtZW50c1xuICAgIHByaXZhdGUgZmlyc3Q6IGFueTtcbiAgICBwcml2YXRlIHNlY29uZDogYW55O1xuICAgIHByaXZhdGUgdGhpcmQ6IGFueTtcblxuICAgIC8vIFRoZSBhY3R1YWwgdGFyZ2V0XG4gICAgcHJpdmF0ZSB0YXJnZXQgOiB7ICguLi5hcmdzKSA6IGFueSB9O1xuXG4gICAgLy8gSW5qZWN0aW9ucyAoZGVwZW5kZW5jaWVzKVxuICAgIHByaXZhdGUgaW5qZWN0aW9ucyA6IHN0cmluZ1tdO1xuXG4gICAgLy8gTG9jYWwgdmFyaWFibGVzXG4gICAgcHJpdmF0ZSBsb2NhbHMgOiB7fSA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogU2V0dXAgZGVmYXVsdCB2YWx1ZSBcbiAgICAgKiBUbyBoYXZlIGVhc2llciBhY2Nlc3MgdG8gdGhlbVxuICAgICAqIER1ZSB0byBsaW1pdGVkIGFtb3VudCBvZiBhcmd1bWVudHMgKDMpIHdlIGRlbm9ybWFsaXplIGl0XG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBpbnB1dDogYW55W10pIHtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZmlyc3QgPSBpbnB1dFswXTtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBpbnB1dFsxXTtcbiAgICAgICAgdGhpcy50aGlyZCA9IGlucHV0WzJdO1xuICAgICAgICB0aGlzLmlzRnVuY3Rpb24oKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3ZlciBmaXJzdCBjYXNlIGlmIGEgZmlyc3QgYXJndW1lbnQgaXMgYSBmdW5jdGlvbiAoY2xvc3VyZSlcbiAgICAgKiBcbiAgICAgKiByZXF1aXJlKGZ1bmN0aW9uKGEpeyB9KVxuICAgICAqIHJlcXVpcmUoZnVuY3Rpb24oKXt9LCB7bG9jYWwgOiAxfSlcbiAgICAgKi9cbiAgICBpc0Z1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgaWYgKCF1dGlscy5pc0Z1bmN0aW9uKHRoaXMuZmlyc3QpKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuZmlyc3Q7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmluamVjdGlvbnMgPSBcbiAgICAgICAgICAgIHV0aWxzLmdldFBhcmFtZXRlck5hbWVzRnJvbUZ1bmN0aW9uKHRoaXMudGFyZ2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBoYXMgdG8gYmUgYSBwbGFuZSBvYmVqY3QgKCB7IGZvbyA6IGJhciB9IClcbiAgICAgICAgaWYgKCB0aGlzLmZpcnN0ICYmIHV0aWxzLmlzUGxhaW5PYmplY3QodGhpcy5zZWNvbmQpKXtcbiAgICAgICAgICAgIHRoaXMubG9jYWxzID0gdGhpcy5zZWNvbmQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaW5hbGx5IGluc3RlYWQgb2YgYXJyYXkgdG8gZGVmaW5lIGFubm90YXRpb25zXG4gICAgICogV2UgbWlnaHQgcGFzcyBvbmx5IG9uZSBzdHJpbmcgKGFubm90YXRpb24pXG4gICAgICovXG4gICAgaXNTdHJpbmcoKVxuICAgIHtcbiAgICAgICAgaWYgKCAhdXRpbHMuaXNTdHJpbmcodGhpcy5maXJzdCkgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc0FycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXJzdCA9IFt0aGlzLmZpcnN0XTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNBcnJheSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvdmVyIGEgY2FzZSB3aGVuIGZpcnN0IGFyZ3VtZW50IGlzIGFuIGFycmF5XG4gICAgICogU2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgcHJlc2VudFxuICAgICAqIHJlcXVpcmUoW10sIGZ1bmN0aW9uKCl7fSApXG4gICAgICogcmVxdWlyZShbXSwgZnVuY3Rpb24oKXt9LCB7bG9jYWwgOiAxfSlcbiAgICAgKi9cbiAgICBpc0FycmF5KClcbiAgICB7XG4gICAgICAgIGlmICghdXRpbHMuaXNBcnJheSh0aGlzLmZpcnN0KSkgcmV0dXJuO1xuICAgICAgICAvLyBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSB0aGVyIFxuICAgICAgICBpZiggIXV0aWxzLmlzRnVuY3Rpb24odGhpcy5zZWNvbmQpKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGZ1bmN0aW9uL2Nsb3N1cmUhXCIpO1xuICAgICAgICB9IFxuICAgICAgICB0aGlzLmluamVjdGlvbnMgPSB0aGlzLmZpcnN0O1xuICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuc2Vjb25kO1xuXG4gICAgICAgIC8vIFdlIG1pZ2h0IHBhc3MgbG9jYWxzIGFzIGEgdGhpcmQgYXJndW1lbnRcbiAgICAgICAgaWYoIHV0aWxzLmlzUGxhaW5PYmplY3QodGhpcy50aGlyZCkgKXtcbiAgICAgICAgICAgIHRoaXMubG9jYWxzID0gdGhpcy50aGlyZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHRpbmcgdGhlIG91dHB1dFxuICAgICAqL1xuICAgIGZvcm1hdCgpIDogUmVxdWlyZU9wdGlvbnNcbiAgICB7XG4gICAgIFxuICAgICAgICBpZiAoICF1dGlscy5pc0Z1bmN0aW9uKHRoaXMudGFyZ2V0KSApe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVxdWlyZSBtZXRob2QgcmVxdWlyZXMgYSBjbG9zdXJlIVwiKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZGVwcyA9IERlcGVuZGVuY3lGcm9tSW5qZWN0aW9uLmNyZWF0ZSh0aGlzLmluamVjdGlvbnMpO1xuICAgICAgICBsZXQgb3B0cyA9IG5ldyBSZXF1aXJlT3B0aW9ucyh0aGlzLnRhcmdldCwgZGVwcywgdGhpcy5sb2NhbHMpO1xuICAgICAgICByZXR1cm4gb3B0cztcbiAgICB9XG59XG5cblxuXG5leHBvcnQgdmFyIFJlcXVpcmVBcmd1bWVudFBhcnNlciA9IChpbnB1dDogYW55KSA6IFJlcXVpcmVPcHRpb25zID0+IHtcbiAgICBsZXQgcGFyc2VyID0gbmV3IF9SZXF1aXJlQXJndW1lbnRQYXJzZXIoaW5wdXQpO1xuICAgIHJldHVybiBwYXJzZXIuZm9ybWF0KCk7XG59IiwiaW1wb3J0IHV0aWxzIGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7RGVwZW5kZW5jeUZyb21JbmplY3Rpb24sIERlcGVuZGVuY3l9IGZyb20gJy4vUmVxdWlyZUFyZ3VtZW50UGFyc2VyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWFsbU1vZHVsZSB7XG4gICAgcHJpdmF0ZSBkZXBlbmRlbmNpZXM6IERlcGVuZGVuY3lbXTtcbiAgICBwcml2YXRlIGNsb3N1cmU6IHsgKC4uLmFyZ3MpOiBhbnkgfTtcbiAgICBwcml2YXRlIGNhY2hlZCA6IGFueTtcbiAgICBwcml2YXRlIG5hbWUgOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBhbGlhcyA6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSAge2FueX0gYVxuICAgICAqIEBwYXJhbSAge2FueX0gYlxuICAgICAqIEBwYXJhbSAge2FueX0gY1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBcbiAgICAgICAgbmFtZTogc3RyaW5nLCBcbiAgICAgICAgYjogYW55LCBcbiAgICAgICAgYzogYW55LCBcbiAgICAgICAgcHJpdmF0ZSB0c19tb2R1bGUgPSBmYWxzZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICBpZiAodXRpbHMuaXNGdW5jdGlvbihiKSkge1xuICAgICAgICAgICAgdGhpcy5jbG9zdXJlID0gYjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgaW5qZWN0aW9ucyA9IFtdO1xuICAgICAgICBpZiAodXRpbHMuaXNBcnJheShiKSkge1xuICAgICAgICAgICAgaW5qZWN0aW9ucyA9IGI7XG4gICAgICAgICAgICBpZiAoIXV0aWxzLmlzRnVuY3Rpb24oYykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb2R1bGUgbXVzdCBoYXZlIGEgY2xvc3VyZSFcIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xvc3VyZSA9IGM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzID0gRGVwZW5kZW5jeUZyb21JbmplY3Rpb24uY3JlYXRlKGluamVjdGlvbnMpO1xuICAgIH1cbiAgICBcbiAgICBwdWJsaWMgaXNUeXBlU2NyaXB0KClcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLnRzX21vZHVsZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVGVsbHMgaWYgYSBtb2R1bGUgd2FzIGNhY2hlZFxuICAgICAqIEByZXR1cm5zIGJvb2xlYW5cbiAgICAgKi9cbiAgICBwdWJsaWMgaXNDYWNoZWQoKSA6IGJvb2xlYW5cbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlZCAhPT0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHaXZlcyBjYWNoZWQgb2JqZWN0XG4gICAgICogQHJldHVybnMgYW55XG4gICAgICovXG4gICAgcHVibGljIGdldENhY2hlKCkgOiBhbnlcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0cyBjYWNoZWRcbiAgICAgKiBAcGFyYW0gIHthbnl9IG9ialxuICAgICAqL1xuICAgIHB1YmxpYyBzZXRDYWNoZShvYmogOiBhbnkpIDogYW55XG4gICAge1xuICAgICAgICB0aGlzLmNhY2hlZCA9IG9iajtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICAvKiogXG4gICAgICogR2l2ZXMgc3RyaW5nIG5hbWUgb2YgYSBtb2R1bGVcbiAgICAgKiBAcmV0dXJucyBzdHJpbmdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0TmFtZSgpIDogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IChzdHJpbmdzKSBvZiBkZXBlbmRlbmNpZXNcbiAgICAgKiBAcmV0dXJucyBzdHJpbmdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0RGVwZW5kZW5jaWVzKCkgOiBEZXBlbmRlbmN5W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXBlbmRlbmNpZXM7XG4gICAgfVxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBjbG9zdXJlXG4gICAgICogQHJldHVybnMgYW55XG4gICAgICovXG4gICAgcHVibGljIGdldENsb3N1cmUoKSA6IHsgKC4uLmFyZ3MpOiBhbnkgfSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNsb3N1cmU7XG4gICAgfVxuXG4gICAgcHVibGljIHRvUmVxdWlyZShsb2NhbHMgOiBPYmplY3QpIDogQXJyYXk8YW55PlxuICAgIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmRlcGVuZGVuY2llcywgdGhpcy5jbG9zdXJlLCBsb2NhbHNdO1xuICAgIH1cbn0iLCJpbXBvcnQgUmVhbG1Nb2R1bGUgZnJvbSAnLi9SZWFsbU1vZHVsZSc7XG5cblxuLy8gRGVmaW5lIGVudmlyb25tZW50IGl0J3MgZWl0aGVyIGdsb2JhbCBub2RlIG1vZHVsZXMgb3Igd2luZG93XG5jb25zdCBlbnZpcm9ubWVudCA9ICRpc0JhY2tlbmQgPyBnbG9iYWwgOiB3aW5kb3c7XG5cbi8vIENyZWF0aW5nIG9yIGdldHRpbmcgdGhlIGVudmlyb25tZW50XG5lbnZpcm9ubWVudC5fX3JlYWxtX18gPSBlbnZpcm9ubWVudC5fX3JlYWxtX18gfHwge307XG5cbi8qKlxuICogU3RvcmFnZVxuICogU2V0cyBhbmQgcmV0cmV2aWVzIG1vZHVsZXMgZnJvbSBjYWNoZVxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdG9yYWdlIHtcbiAgICBzdGF0aWMgc2V0KG5hbWU6IHN0cmluZywgb2JqOiBSZWFsbU1vZHVsZSk6IHZvaWQge1xuICAgICAgICBlbnZpcm9ubWVudC5fX3JlYWxtX19bbmFtZV0gPSBvYmo7XG4gICAgfVxuICAgIHN0YXRpYyBnZXQobmFtZTogc3RyaW5nKSA6IFJlYWxtTW9kdWxlIHtcbiAgICAgICAgcmV0dXJuIGVudmlyb25tZW50Ll9fcmVhbG1fX1tuYW1lXTtcbiAgICB9XG4gICAgc3RhdGljIGZsdXNoKCk6IHZvaWRcbiAgICB7XG4gICAgICAgIGVudmlyb25tZW50Ll9fcmVhbG1fXyA9IHt9O1xuICAgIH1cbn0iLCJpbXBvcnQgdXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgQ2hhaW4sIENoYWluYWJsZSB9IGZyb20gJy4uL2NoYWluJztcbmltcG9ydCB7IEVhY2ggfSBmcm9tICcuLi9lYWNoJztcbmltcG9ydCBTdG9yYWdlIGZyb20gJy4vU3RvcmFnZSc7XG5pbXBvcnQgUmVhbG1Nb2R1bGUgZnJvbSAnLi9SZWFsbU1vZHVsZSc7XG5pbXBvcnQgeyBSZXF1aXJlQXJndW1lbnRQYXJzZXIsIFJlcXVpcmVPcHRpb25zLCBEZXBlbmRlbmN5IH0gZnJvbSAnLi9SZXF1aXJlQXJndW1lbnRQYXJzZXInO1xuXG5cbmxldCBfbW9kdWxlID0gKG5hbWU6IHN0cmluZywgYjogYW55LCBjOiBhbnkpID0+IHtcbiAgICBsZXQgbG9jYWxNb2R1bGUgPSBuZXcgUmVhbG1Nb2R1bGUobmFtZSwgYiwgYyk7XG4gICAgU3RvcmFnZS5zZXQobG9jYWxNb2R1bGUuZ2V0TmFtZSgpLCBsb2NhbE1vZHVsZSk7XG59XG5cbmxldCBfdHNfbW9kdWxlID0gKG5hbWU6IHN0cmluZywgYjogYW55LCBjOiBhbnkpID0+IHtcbiAgICBcbiAgICBsZXQgbG9jYWxNb2R1bGUgPSAgbmV3IFJlYWxtTW9kdWxlKG5hbWUsIGIsIGMsIHRydWUpO1xuICAgIFN0b3JhZ2Uuc2V0KGxvY2FsTW9kdWxlLmdldE5hbWUoKSxsb2NhbE1vZHVsZSk7XG59XG5cbmxldCBfcmVzb2x2ZSA9IChvcHRzOiBSZXF1aXJlT3B0aW9ucywgaW5qZWN0aW9uOiBEZXBlbmRlbmN5KSA9PiB7XG4gICAgXG4gICAgLy8gVHJ5aW5nIHRvIGdldCBtb2R1bGVcbiAgICBsZXQgbW9kOiBSZWFsbU1vZHVsZSA9IFN0b3JhZ2UuZ2V0KGluamVjdGlvbi5uYW1lKTtcbiAgICBcbiAgICAvLyBEZWFsIHdpdGggbG9jYWxzXG4gICAgLy8gV2UgZG9uJ3Qgd2FudCBhbGxvdyBwYXNzaW5nIGFueSBwcm9taXNlcyBpbnRvIGxvY2FsIHZhcmlhYmxlc1xuICAgIC8vIE90aGVyd2lzZSBpdCB3aWxsIGJlIHNwb2lsZWQgd2l0aCBzdXNwaWNpb3VzIFwidW5rbm93blwiIHN0dWZmXG4gICAgaWYgKGluamVjdGlvbi5hbGlhcyBpbiBvcHRzLmxvY2Fscykge1xuICAgICAgICByZXR1cm4gb3B0cy5sb2NhbHNbaW5qZWN0aW9uLmFsaWFzXTtcbiAgICB9XG5cbiAgICBpZiAobW9kID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9kdWxlIFwiICsgaW5qZWN0aW9uICsgXCIgaXMgbm90IHJlZ2lzdGVyZWQhXFxuID4+IFwiICsgb3B0cy50YXJnZXQpO1xuICAgIH1cbiAgICAvLyB0cnlpbmcgdG8gZmV0Y2ggZnJvbSBjYWNoZVxuICAgIGlmIChtb2QuaXNDYWNoZWQoKSkge1xuICAgICAgICByZXR1cm4gbW9kLmdldENhY2hlKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIFJlY3Vyc2l2ZWx5IHJlcXVpcmUgZGVwZW5kZW5jaWVzIFxuICAgIHJldHVybiBfcmVxdWlyZShtb2QuZ2V0RGVwZW5kZW5jaWVzKCksIG1vZC5nZXRDbG9zdXJlKCksIG9wdHMubG9jYWxzLCBtb2QpXG4gICAgICAgIC50aGVuKHggPT4gbW9kLnNldENhY2hlKHgpKTtcbn1cblxubGV0IF9hcHBseSA9IChvcHRzOiBSZXF1aXJlT3B0aW9ucywgcmVzdWx0cyA6IEFycmF5PGFueT4sIG1vZD8gOiBSZWFsbU1vZHVsZSkgPT4gXG57XG4gICAgLy8gaGFuZGxlIHR5cGVzY3JpcHQgbW9kdWxlcyBkaWZmZXJlbnRseVxuICAgIC8vIGJhc2ljYWxseSB3ZSBhcHBseWluZyBvbmx5IDIgdmFyaWFibGVzIC0ge2V4cG9ydHMsIHJlcXVpcmV9XG4gICAgaWYoIG1vZCAhPT0gdW5kZWZpbmVkICYmIG1vZC5pc1R5cGVTY3JpcHQoKSApe1xuICAgICAgICBsZXQgW19leHBvcnRzLCBfZW52XSA9IFt7fSwge31dO1xuICAgICAgICBmb3IoIGxldCBpbmRleCA9IDA7IGluZGV4IDwgb3B0cy5kZXBlbmRlbmNpZXMubGVuZ3RoOyBpbmRleCsrKXtcbiAgICAgICAgICAgIF9lbnZbb3B0cy5kZXBlbmRlbmNpZXNbaW5kZXhdLmFsaWFzXSA9IHJlc3VsdHNbaW5kZXhdO1xuICAgICAgICB9XG4gICAgICAgIG9wdHMudGFyZ2V0KC4uLltfZXhwb3J0cywgeCA9PiBfZW52W3hdIF0pXG4gICAgICAgIHJldHVybiBfZXhwb3J0cztcbiAgICB9O1xuICAgIHJldHVybiBvcHRzLnRhcmdldCguLi5yZXN1bHRzKSBcbn1cblxubGV0IF9yZXF1aXJlID0gKGEsIGI/LCBjPywgbW9kPyA6IFJlYWxtTW9kdWxlKTogYW55ID0+IHtcbiAgICBcbiAgICBsZXQgb3B0czogUmVxdWlyZU9wdGlvbnMgPSBSZXF1aXJlQXJndW1lbnRQYXJzZXIoW2EsIGIsIGNdKTtcbiAgICByZXR1cm4gRWFjaChvcHRzLmRlcGVuZGVuY2llcywgaW5qZWN0aW9uID0+IF9yZXNvbHZlKG9wdHMsIGluamVjdGlvbikpXG4gICAgICAgIC50aGVuKCh0b0FwcGx5OiBBcnJheTxhbnk+KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gX2FwcGx5KG9wdHMsIHRvQXBwbHksIG1vZCApO1xuICAgICAgICB9KTtcbn1cblxuXG5cbmV4cG9ydCBsZXQgbW9kID0gX21vZHVsZTtcbmV4cG9ydCBsZXQgdHNfbW9kID0gX3RzX21vZHVsZTtcbmV4cG9ydCBsZXQgcmVxID0gX3JlcXVpcmU7XG4iLCJpbXBvcnQge0VhY2h9IGZyb20gJy4vZWFjaCc7XG5pbXBvcnQge0NoYWluLCBDaGFpbmFibGV9IGZyb20gJy4vY2hhaW4nO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IFJlYWxtTW9kdWxlIGZyb20gJy4vY29yZS9SZWFsbU1vZHVsZSc7XG5pbXBvcnQgU3RvcmFnZSBmcm9tICcuL2NvcmUvU3RvcmFnZSc7XG5pbXBvcnQge3JlcSwgbW9kLCB0c19tb2R9IGZyb20gJy4vY29yZS9Db3JlJztcbmltcG9ydCB7UmVxdWlyZUFyZ3VtZW50UGFyc2VyLCBSZXF1aXJlT3B0aW9uc30gZnJvbSAnLi9jb3JlL1JlcXVpcmVBcmd1bWVudFBhcnNlcic7XG5cbmV4cG9ydCBjb25zdCByZWFsbSA9IHtcbiAgIG1vZHVsZSA6IG1vZCxcbiAgIHRzX21vZHVsZSA6IHRzX21vZCxcbiAgIHJlcXVpcmUgOiByZXEsXG4gICBSZXF1aXJlQXJndW1lbnRQYXJzZXIgOiBSZXF1aXJlQXJndW1lbnRQYXJzZXIsXG4gICBlYWNoIDogRWFjaCxcbiAgIGNoYWluIDogQ2hhaW4sXG4gICBDaGFpbmFibGUgOiBDaGFpbmFibGUsXG4gICB1dGlscyA6IHV0aWxzLFxuICAgZmx1c2ggOiBTdG9yYWdlLmZsdXNoXG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
