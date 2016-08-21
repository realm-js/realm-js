(function(___env___){
/* ****** Setup ****** */
var __scope__ = ___env___.scope;
var $isBackend = ___env___.isBackend;
var __ts__ = ___env___.ts;


/* ******* realm/utils.ts ******* */
__ts__.module("realm/utils.js", function(exports, require){
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

/* ******* realm/each.ts ******* */
__ts__.module("realm/each.js", function(exports, require){
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

/* ******* realm/chain.ts ******* */
__ts__.module("realm/chain.js", function(exports, require){
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

/* ******* realm/core/RealmModule.ts ******* */
__ts__.module("realm/core/RealmModule.js", function(exports, require){
"use strict";
const utils_1 = require('../utils');
class RealmModule {
    constructor(name, b, c, ts_module = false) {
        this.name = name;
        this.ts_module = ts_module;
        if (utils_1.default.isFunction(b)) {
            this.closure = b;
        }
        if (utils_1.default.isArray(b)) {
            this.dependencies = b;
            if (!utils_1.default.isFunction(c)) {
                throw new Error("Module must have a closure!");
            }
            this.closure = c;
        }
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

/* ******* realm/core/Storage.ts ******* */
__ts__.module("realm/core/Storage.js", function(exports, require){
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

/* ******* realm/core/RequireArgumentParser.ts ******* */
__ts__.module("realm/core/RequireArgumentParser.js", function(exports, require){
"use strict";
const utils_1 = require('../utils');
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
        return {
            target: this.target,
            injections: this.injections,
            locals: this.locals
        };
    }
}
exports.RequireArgumentParser = (input) => {
    let parser = new _RequireArgumentParser(input);
    return parser.format();
};

});

/* ******* realm/core/Core.ts ******* */
__ts__.module("realm/core/Core.js", function(exports, require){
"use strict";
const each_1 = require('../each');
const Storage_1 = require('./Storage');
const RealmModule_1 = require('./RealmModule');
const RequireArgumentParser_1 = require('./RequireArgumentParser');
let _module = (name, b, c) => {
    Storage_1.default.set(name, new RealmModule_1.default(name, b, c));
};
let _ts_module = (name, b, c) => {
    Storage_1.default.set(name, new RealmModule_1.default(name, b, c, true));
};
let _resolve = (opts, injection) => {
    let mod = Storage_1.default.get(injection);
    if (injection in opts.locals) {
        return opts.locals[injection];
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
        let _exports = {};
        let _env = {};
        for (let index = 0; index < opts.injections.length; index++) {
            _env[opts.injections[index]] = results[index];
        }
        opts.target(...[_exports, x => _env[x]]);
        return _exports;
    }
    ;
    return opts.target(...results);
};
let _require = (a, b, c, mod) => {
    let opts = RequireArgumentParser_1.RequireArgumentParser([a, b, c]);
    return each_1.Each(opts.injections, injection => _resolve(opts, injection))
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
const each_1 = require('./realm/each');
const chain_1 = require('./realm/chain');
const utils_1 = require('./realm/utils');
const Storage_1 = require('./realm/core/Storage');
const Core_1 = require('./realm/core/Core');
const RequireArgumentParser_1 = require('./realm/core/RequireArgumentParser');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlYWxtL3V0aWxzLnRzIiwicmVhbG0vZWFjaC50cyIsInJlYWxtL2NoYWluLnRzIiwicmVhbG0vY29yZS9SZWFsbU1vZHVsZS50cyIsInJlYWxtL2NvcmUvU3RvcmFnZS50cyIsInJlYWxtL2NvcmUvUmVxdWlyZUFyZ3VtZW50UGFyc2VyLnRzIiwicmVhbG0vY29yZS9Db3JlLnRzIiwicmVhbG0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7QUFDckMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUNyQyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQ3hDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7QUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25ELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7QUFDNUMsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUM7QUFDcEMsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUM7QUFDcEMsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDO0FBQzlCLE1BQU0sTUFBTSxHQUFHLDRCQUE0QixDQUFDO0FBRzVDO0lBR0UsT0FBTyxTQUFTLENBQUMsSUFBUztRQUN4QixNQUFNLENBQUMsSUFBSSxLQUFLLFNBQVM7ZUFDcEIsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVU7WUFDbEMsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQztJQUNyQyxDQUFDO0lBR0QsT0FBTyxRQUFRLENBQUMsS0FBVTtRQUN4QixNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDO0lBQy9DLENBQUM7SUFFRCxPQUFPLFVBQVUsQ0FBQyxLQUFVO1FBQzFCLElBQUks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QUFDO0FBQ3BCLFdBQUcsR0FBRyxRQUFRLENBQUM7Ozs7Ozs7QUNwRTFCLHVCQUFtQixjQUFjLENBQUMsQ0FBQTtBQUNsQyx3QkFBK0IsZUFBZSxDQUFDLENBQUE7QUFDL0Msd0JBQWtCLGVBQWUsQ0FBQyxDQUFBO0FBRWxDLDBCQUFvQixzQkFBc0IsQ0FBQyxDQUFBO0FBQzNDLHVCQUErQixtQkFBbUIsQ0FBQyxDQUFBO0FBQ25ELHdDQUFvRCxvQ0FBb0MsQ0FBQyxDQUFBO0FBRTVFLGFBQUssR0FBRztJQUNsQixNQUFNLEVBQUcsVUFBRztJQUNaLFNBQVMsRUFBRyxhQUFNO0lBQ2xCLE9BQU8sRUFBRyxVQUFHO0lBQ2IscUJBQXFCLEVBQUcsNkNBQXFCO0lBQzdDLElBQUksRUFBRyxXQUFJO0lBQ1gsS0FBSyxFQUFHLGFBQUs7SUFDYixTQUFTLEVBQUcsaUJBQVM7SUFDckIsS0FBSyxFQUFHLGVBQUs7SUFDYixLQUFLLEVBQUcsaUJBQU8sQ0FBQyxLQUFLO0NBQ3ZCLENBQUEiLCJmaWxlIjoicmVhbG0uanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBmdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5jb25zdCBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5jb25zdCBmdW5jVG9TdHJpbmcgPSBmdW5jUHJvdG8udG9TdHJpbmc7XG5jb25zdCBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuY29uc3Qgb2JqZWN0Q3RvclN0cmluZyA9IGZ1bmNUb1N0cmluZy5jYWxsKE9iamVjdCk7XG5jb25zdCBvYmplY3RUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuY29uc3Qgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5jb25zdCBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbmNvbnN0IGZ1bmNUYWcyID0gJ1tGdW5jdGlvbl0nO1xuY29uc3QgZ2VuVGFnID0gJ1tvYmplY3QgR2VuZXJhdG9yRnVuY3Rpb25dJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBVdGlscyB7XG5cbiAgLy8gaXNQcm9taXNlKClcbiAgc3RhdGljIGlzUHJvbWlzZShpdGVtOiBhbnkpIHtcbiAgICByZXR1cm4gaXRlbSAhPT0gdW5kZWZpbmVkXG4gICAgICAmJiB0eXBlb2YgaXRlbS50aGVuID09PSAnZnVuY3Rpb24nICYmXG4gICAgICB0eXBlb2YgaXRlbS5jYXRjaCA9PT0gJ2Z1bmN0aW9uJztcbiAgfVxuXG4gIC8vIGlzTm90U2V0ICh1bmRlZmluZWQgYW5kIG51bGwgd2lsbCByZXR1cm4gdHJ1ZSlcbiAgc3RhdGljIGlzTm90U2V0KGlucHV0OiBhbnkpIHtcbiAgICByZXR1cm4gaW5wdXQgPT09IHVuZGVmaW5lZCB8fCBpbnB1dCA9PT0gbnVsbDtcbiAgfVxuXG4gIHN0YXRpYyBpc0Z1bmN0aW9uKHZhbHVlOiBhbnkpIHtcbiAgICB2YXIgdGFnID0gdGhpcy5pc09iamVjdCh2YWx1ZSkgPyBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKSA6ICcnO1xuICAgIHJldHVybiB0YWcgPT09IGZ1bmNUYWcyIHx8IHRhZyA9PSBmdW5jVGFnIHx8IHRhZyA9PSBnZW5UYWc7XG4gIH1cblxuICAvL2lzT2JqZWN0XG4gIHN0YXRpYyBpc09iamVjdChpbnB1dDogYW55KSB7XG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgaW5wdXQ7XG4gICAgcmV0dXJuICEhaW5wdXQgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbiAgfVxuXG4gIC8vaXNIb3N0T2JqZWN0XG4gIHN0YXRpYyBpc0hvc3RPYmplY3QodmFsdWUpIHtcbiAgICAvLyBNYW55IGhvc3Qgb2JqZWN0cyBhcmUgYE9iamVjdGAgb2JqZWN0cyB0aGF0IGNhbiBjb2VyY2UgdG8gc3RyaW5nc1xuICAgIC8vIGRlc3BpdGUgaGF2aW5nIGltcHJvcGVybHkgZGVmaW5lZCBgdG9TdHJpbmdgIG1ldGhvZHMuXG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsICYmIHR5cGVvZiB2YWx1ZS50b1N0cmluZyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSAhISh2YWx1ZSArICcnKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHsgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy9vdmVyQXJnXG4gIHN0YXRpYyBvdmVyQXJnKGZ1bmMsIHRyYW5zZm9ybSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICByZXR1cm4gZnVuYyh0cmFuc2Zvcm0oYXJnKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIGlzT2JqZWN0TGlrZVxuICBzdGF0aWMgaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gICAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xuICB9XG5cbiAgLy8gRmxhdHRlbiBhcmd1bWV0bnNcbiAgLy8gZmxhdHRlbignYScsICdiJywgWydjJ10pIC0+IFsnYScsICdiJywgJ2MnXVxuICBzdGF0aWMgZmxhdHRlbihkYXRhOiBhbnkpIHtcbiAgICByZXR1cm4gW10uY29uY2F0LmFwcGx5KFtdLCBkYXRhKTtcbiAgfVxuXG4gIC8vIHNldHMgaGlkZGVuIHByb3BlcnR5XG4gIHN0YXRpYyBzZXRIaWRkZW5Qcm9wZXJ0eShvYmo6IE9iamVjdCwga2V5OiBzdHJpbmcsIHZhbHVlOiBPYmplY3QpOiBhbnkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogdmFsdWVcbiAgICB9KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBzdGF0aWMgaXNTdHJpbmcodmFsdWU6IGFueSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xuICB9XG5cbiAgLy8gaXNBcnJheVxuICBzdGF0aWMgaXNBcnJheShpbnB1dDogYW55KSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaW5wdXQpO1xuICB9XG5cbiAgLy8gaXNQbGFpbk9iamVjdFxuICBzdGF0aWMgaXNQbGFpbk9iamVjdCh2YWx1ZSkge1xuICAgIGlmICghdGhpcy5pc09iamVjdExpa2UodmFsdWUpIHx8XG4gICAgICBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKSAhPSBvYmplY3RUYWcgfHwgdGhpcy5pc0hvc3RPYmplY3QodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBwcm90byA9IHRoaXMub3ZlckFyZyhPYmplY3QuZ2V0UHJvdG90eXBlT2YsIE9iamVjdCkodmFsdWUpO1xuICAgIGlmIChwcm90byA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHZhciBDdG9yID0gaGFzT3duUHJvcGVydHkuY2FsbChwcm90bywgJ2NvbnN0cnVjdG9yJykgJiYgcHJvdG8uY29uc3RydWN0b3I7XG4gICAgcmV0dXJuICh0eXBlb2YgQ3RvciA9PSAnZnVuY3Rpb24nICYmXG4gICAgICBDdG9yIGluc3RhbmNlb2YgQ3RvciAmJiBmdW5jVG9TdHJpbmcuY2FsbChDdG9yKSA9PSBvYmplY3RDdG9yU3RyaW5nKTtcbiAgfVxuXG4gIC8vIGdldHMgcGFyYW1ldGVyIG5hbWVzXG4gIHN0YXRpYyBnZXRQYXJhbWV0ZXJOYW1lc0Zyb21GdW5jdGlvbihmdW5jOiBhbnkpIHtcbiAgICB2YXIgU1RSSVBfQ09NTUVOVFMgPSAvKChcXC9cXC8uKiQpfChcXC9cXCpbXFxzXFxTXSo/XFwqXFwvKSkvbWc7XG4gICAgdmFyIEFSR1VNRU5UX05BTUVTID0gLyhbXlxccyxdKykvZztcbiAgICB2YXIgZm5TdHIgPSBmdW5jLnRvU3RyaW5nKCkucmVwbGFjZShTVFJJUF9DT01NRU5UUywgJycpO1xuICAgIHZhciByZXN1bHQgPSBmblN0ci5zbGljZShmblN0ci5pbmRleE9mKCcoJykgKyAxLCBmblN0ci5pbmRleE9mKCcpJykpLm1hdGNoKEFSR1VNRU5UX05BTUVTKTtcbiAgICBpZiAocmVzdWx0ID09PSBudWxsKVxuICAgICAgcmVzdWx0ID0gW107XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG4iLCJpbXBvcnQgdXRpbHMgZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBFYWNoIGZ1bmN0aW9uXG4gKiBJdGVyYXRlcyBhbnkgb2JqZWN0cyBpbmNsdWRpbmcgUHJvbWlzZXNcbiAqL1xuZXhwb3J0IHZhciBFYWNoID0gKGFyZ3Y6IGFueSwgY2I6IHsgKC4uLmFyZ3MpOiBhbnkgfSkgPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSBbXTtcbiAgICAgICAgY29uc3QgaXNPYmplY3QgPSB1dGlscy5pc1BsYWluT2JqZWN0KGFyZ3YpO1xuICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IC0xO1xuICAgICAgICBsZXQgaXRlcmF0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCBhcmd2Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGxldCBrZXkgPSBpc09iamVjdCA/IE9iamVjdC5rZXlzKGFyZ3YpW2luZGV4XSA6IGluZGV4O1xuICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IGlzT2JqZWN0ID8gYXJndltrZXldIDogYXJndltpbmRleF07XG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZXMgbmVlZCB0byBiZSByZXNvbHZlZFxuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnRoZW4oZGF0YSA9PiB7IHJlc3VsdHMucHVzaChkYXRhKTsgaXRlcmF0ZSgpOyB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXMgPSBjYiguLi5bdmFsdWUsIGtleV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAodXRpbHMuaXNQcm9taXNlKHJlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSByZXR1cm4gcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdGUoKTtcbiAgICB9KTtcbn1cbiIsImltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IEVhY2ggfSBmcm9tICcuL2VhY2gnO1xuXG5leHBvcnQgY2xhc3MgQ2hhaW5hYmxlIHtcbiAgICBwcm90ZWN0ZWQgJGZpbmFsaXplZDogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHByb3RlY3RlZCAka2lsbGVkOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHJvdGVjdGVkICRtYW51YWw6IGFueTtcbiAgICBwcm90ZWN0ZWQgJGNvbGxlY3Rpb246IE9iamVjdCA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogcHJvdGVjdGVkIC0gYnJlYWtcbiAgICAgKlxuICAgICAqIEBwYXJhbSAge2FueX0gbWFudWFsIDogQW55IG9iamVjdFxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGJyZWFrKG1hbnVhbDogYW55KTogdm9pZCB7XG4gICAgICAgIHRoaXMuJGZpbmFsaXplZCA9IHRydWU7XG4gICAgICAgIHRoaXMuJG1hbnVhbCA9IG1hbnVhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBwcm90ZWN0ZWQgLSBraWxsXG4gICAgICogS2lsbHMgdGhlIGNoYWluXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQga2lsbCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy4kZmluYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy4ka2lsbGVkID0gdHJ1ZTtcbiAgICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGFuZCBjcmVhdGVzIGV4dHJhIHByb3BlcnRpZXMgZm9yIHRoZSBjbGFzc1xuICogU3VwcG9ydHMgbm9uLXR5cGVzY3JpcHQgdXNhZ2VcbiAqIEZvciB0eXBlc2NyaXB0IENoYWluYWJsZSBjbGFzcyBpZiByZXF1aXJlZFxuICovXG5sZXQgQ2hhaW5DbGFzc0NvbnRydWN0b3IgPSAoaW5wdXQ6IGFueSkgPT4ge1xuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIENoYWluYWJsZSkge1xuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuICAgIFxuICAgIGxldCBpbnN0YW5jZTogT2JqZWN0ID0ge307XG4gICAgLy8gaWYgdGhhdCdzIGZ1bmN0aW9uJ1xuICAgIGlmICh1dGlscy5pc0Z1bmN0aW9uKGlucHV0KSkge1xuICAgICAgICBpbnN0YW5jZSA9IG5ldyBpbnB1dCgpO1xuICAgICAgICBpZiggaW5zdGFuY2UgaW5zdGFuY2VvZiBDaGFpbmFibGUgKXtcbiAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodXRpbHMuaXNPYmplY3QoaW5wdXQpKSB7XG4gICAgICAgIGluc3RhbmNlID0gaW5wdXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2hhaW4gcmVxdWlyZXMgYSBDbGFzcyBvciBhbiBJbnN0YW5jZVwiKVxuICAgIH1cbiAgICBpbnN0YW5jZVsnJGNvbGxlY3Rpb24nXSA9IHt9O1xuICAgIGluc3RhbmNlWydicmVhayddID0gbWFudWFsID0+IHtcbiAgICAgICAgdXRpbHMuc2V0SGlkZGVuUHJvcGVydHkoaW5zdGFuY2UsICckZmluYWxpemVkJywgdHJ1ZSk7XG4gICAgICAgIHV0aWxzLnNldEhpZGRlblByb3BlcnR5KGluc3RhbmNlLCAnJG1hbnVhbCcsIG1hbnVhbCk7XG4gICAgfVxuICAgIGluc3RhbmNlWydraWxsJ10gPSAoKSA9PiB7XG4gICAgICAgIHV0aWxzLnNldEhpZGRlblByb3BlcnR5KGluc3RhbmNlLCAnJGZpbmFsaXplZCcsIHRydWUpO1xuICAgICAgICB1dGlscy5zZXRIaWRkZW5Qcm9wZXJ0eShpbnN0YW5jZSwgJyRraWxsZWQnLCB0cnVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG4vKipcbiAqIENoYWluIGNsYXNzXG4gKiBFeGVjdXRlcyBtZXRob2RzIGluIG9yZGVyXG4gKi9cbmV4cG9ydCBjb25zdCBDaGFpbiA9IChjbHM6IGFueSkgPT4ge1xuICAgIGxldCBpbnN0YW5jZSA9IENoYWluQ2xhc3NDb250cnVjdG9yKGNscyk7XG4gICAgbGV0IHByb3BzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICBsZXQgdGFza3MgPSBbXTtcblxuICAgIC8vIGNvbGxlY3RpbmcgcHJvcHMgYW5kIGNoZWNraW5nIGZvciBzZXR0ZXJzXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcHJvcGVydHlOYW1lID0gcHJvcHNbaV07XG4gICAgICAgIGlmICghKHByb3BlcnR5TmFtZSBpbiBbXCJmb3JtYXRcIiwgJ2tpbGwnLCAnYnJlYWsnXSkpIHtcbiAgICAgICAgICAgIGxldCBpc1NldHRlciA9IHByb3BlcnR5TmFtZS5tYXRjaCgvXnNldCguKikkLyk7XG4gICAgICAgICAgICBsZXQgc2V0dGVyTmFtZSA9IG51bGw7XG4gICAgICAgICAgICBpZiAoaXNTZXR0ZXIpIHtcbiAgICAgICAgICAgICAgICBzZXR0ZXJOYW1lID0gaXNTZXR0ZXJbMV1cbiAgICAgICAgICAgICAgICBzZXR0ZXJOYW1lID0gc2V0dGVyTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHNldHRlck5hbWUuc2xpY2UoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YXNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBwcm9wOiBwcm9wZXJ0eU5hbWUsXG4gICAgICAgICAgICAgICAgc2V0dGVyOiBzZXR0ZXJOYW1lLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTdG9yZSBpdCB0byB0aGUgcHJvcGVydHkgb2YgdGhlIGNsYXNzJ1xuICAgIGxldCBzdG9yZSA9IGZ1bmN0aW9uIChwcm9wLCB2YWwpOiB2b2lkIHtcbiAgICAgICAgaW5zdGFuY2UuJGNvbGxlY3Rpb25bcHJvcF0gPSB2YWw7XG4gICAgICAgIGluc3RhbmNlW3Byb3BdID0gdmFsO1xuICAgIH1cblxuICAgIC8vIEV2YWx1YXRlXG4gICAgbGV0IGV2YWx1YXRlID0gZnVuY3Rpb24gKHRhc2spOiBhbnkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gaW5zdGFuY2VbdGFzay5wcm9wXS5hcHBseShpbnN0YW5jZSk7XG4gICAgICAgIGlmICh0YXNrLnNldHRlcikge1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlzUHJvbWlzZShyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKHJlcyA9PiB7IHN0b3JlKHRhc2suc2V0dGVyLCByZXMpIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHN0b3JlKHRhc2suc2V0dGVyLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gQ2FsbGluZyB0YXNrcyBpbiBvcmRlciB0aGV5IGhhdmUgYmVlbiBjcmVhdGVkXG4gICAgcmV0dXJuIEVhY2godGFza3MsICh0YXNrOiBhbnkpID0+IHtcbiAgICAgICAgcmV0dXJuICFpbnN0YW5jZS4kZmluYWxpemVkID8gZXZhbHVhdGUodGFzaykgOiBmYWxzZTtcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKHV0aWxzLmlzRnVuY3Rpb24oaW5zdGFuY2VbXCJmb3JtYXRcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZhbHVhdGUoe1xuICAgICAgICAgICAgICAgIHByb3A6IFwiZm9ybWF0XCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSkudGhlbihzcGVjaWFsRm9ybWF0ID0+IHtcbiAgICAgICAgaWYgKGluc3RhbmNlLiRraWxsZWQpIHJldHVybjtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS4kbWFudWFsKSB7XG4gICAgICAgICAgICBpZiAoc3BlY2lhbEZvcm1hdCkgcmV0dXJuIHNwZWNpYWxGb3JtYXQ7XG4gICAgICAgICAgICByZXR1cm4gaW5zdGFuY2UuJGNvbGxlY3Rpb247XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLiRtYW51YWw7XG4gICAgfSk7XG59XG4iLCJpbXBvcnQgdXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWFsbU1vZHVsZSB7XG4gICAgcHJpdmF0ZSBkZXBlbmRlbmNpZXM6IHN0cmluZ1tdO1xuICAgIHByaXZhdGUgY2xvc3VyZTogeyAoLi4uYXJncyk6IGFueSB9O1xuICAgIHByaXZhdGUgY2FjaGVkIDogYW55O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtICB7YW55fSBhXG4gICAgICogQHBhcmFtICB7YW55fSBiXG4gICAgICogQHBhcmFtICB7YW55fSBjXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgbmFtZTogc3RyaW5nLCBcbiAgICAgICAgYjogYW55LCBcbiAgICAgICAgYzogYW55LCBcbiAgICAgICAgcHJpdmF0ZSB0c19tb2R1bGUgPSBmYWxzZSkge1xuXG4gICAgICAgIGlmICh1dGlscy5pc0Z1bmN0aW9uKGIpKSB7XG4gICAgICAgICAgICB0aGlzLmNsb3N1cmUgPSBiO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1dGlscy5pc0FycmF5KGIpKSB7XG4gICAgICAgICAgICB0aGlzLmRlcGVuZGVuY2llcyA9IGI7XG4gICAgICAgICAgICBpZiAoIXV0aWxzLmlzRnVuY3Rpb24oYykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb2R1bGUgbXVzdCBoYXZlIGEgY2xvc3VyZSFcIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xvc3VyZSA9IGM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcHVibGljIGlzVHlwZVNjcmlwdCgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy50c19tb2R1bGU7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFRlbGxzIGlmIGEgbW9kdWxlIHdhcyBjYWNoZWRcbiAgICAgKiBAcmV0dXJucyBib29sZWFuXG4gICAgICovXG4gICAgcHVibGljIGlzQ2FjaGVkKCkgOiBib29sZWFuXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZWQgIT09IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2l2ZXMgY2FjaGVkIG9iamVjdFxuICAgICAqIEByZXR1cm5zIGFueVxuICAgICAqL1xuICAgIHB1YmxpYyBnZXRDYWNoZSgpIDogYW55XG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZWQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHMgY2FjaGVkXG4gICAgICogQHBhcmFtICB7YW55fSBvYmpcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0Q2FjaGUob2JqIDogYW55KSA6IGFueVxuICAgIHtcbiAgICAgICAgdGhpcy5jYWNoZWQgPSBvYmo7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgLyoqIFxuICAgICAqIEdpdmVzIHN0cmluZyBuYW1lIG9mIGEgbW9kdWxlXG4gICAgICogQHJldHVybnMgc3RyaW5nXG4gICAgICovXG4gICAgcHVibGljIGdldE5hbWUoKSA6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSAoc3RyaW5ncykgb2YgZGVwZW5kZW5jaWVzXG4gICAgICogQHJldHVybnMgc3RyaW5nXG4gICAgICovXG4gICAgcHVibGljIGdldERlcGVuZGVuY2llcygpIDogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXBlbmRlbmNpZXM7XG4gICAgfVxuXG4gICAgXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIGNsb3N1cmVcbiAgICAgKiBAcmV0dXJucyBhbnlcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0Q2xvc3VyZSgpIDogeyAoLi4uYXJncyk6IGFueSB9IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xvc3VyZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdG9SZXF1aXJlKGxvY2FscyA6IE9iamVjdCkgOiBBcnJheTxhbnk+XG4gICAge1xuICAgICAgICByZXR1cm4gW3RoaXMuZGVwZW5kZW5jaWVzLCB0aGlzLmNsb3N1cmUsIGxvY2Fsc107XG4gICAgfVxufSIsImltcG9ydCBSZWFsbU1vZHVsZSBmcm9tICcuL1JlYWxtTW9kdWxlJztcblxuaW1wb3J0IHtTdWtrYX0gZnJvbSAnYic7XG5cbi8vIERlZmluZSBlbnZpcm9ubWVudCBpdCdzIGVpdGhlciBnbG9iYWwgbm9kZSBtb2R1bGVzIG9yIHdpbmRvd1xuY29uc3QgZW52aXJvbm1lbnQgPSAkaXNCYWNrZW5kID8gZ2xvYmFsIDogd2luZG93O1xuXG4vLyBDcmVhdGluZyBvciBnZXR0aW5nIHRoZSBlbnZpcm9ubWVudFxuZW52aXJvbm1lbnQuX19yZWFsbV9fID0gZW52aXJvbm1lbnQuX19yZWFsbV9fIHx8IHt9O1xuXG4vKipcbiAqIFN0b3JhZ2VcbiAqIFNldHMgYW5kIHJldHJldmllcyBtb2R1bGVzIGZyb20gY2FjaGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RvcmFnZSB7XG4gICAgc3RhdGljIHNldChuYW1lOiBzdHJpbmcsIG9iajogUmVhbG1Nb2R1bGUpOiB2b2lkIHtcbiAgICAgICAgZW52aXJvbm1lbnQuX19yZWFsbV9fW25hbWVdID0gb2JqO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0KG5hbWU6IHN0cmluZykgOiBSZWFsbU1vZHVsZSB7XG4gICAgICAgIHJldHVybiBlbnZpcm9ubWVudC5fX3JlYWxtX19bbmFtZV07XG4gICAgfVxuICAgIHN0YXRpYyBmbHVzaCgpOiB2b2lkXG4gICAge1xuICAgICAgICBlbnZpcm9ubWVudC5fX3JlYWxtX18gPSB7fTtcbiAgICB9XG59IiwiaW1wb3J0IHV0aWxzIGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBSZXF1aXJlT3B0aW9uc1xue1xuICAgIHRhcmdldCA6IHsgKC4uLmFyZ3MpIDogYW55IH07XG4gICAgaW5qZWN0aW9ucyA6IHN0cmluZ1tdO1xuICAgIGxvY2FscyA6IHt9O1xufVxuXG4vKipcbiAqIHJlcXVpcmUoZnVuY3Rpb24oYSl7IH0pXG4gKiByZXF1aXJlKGZ1bmN0aW9uKCl7fSwge2xvY2FsIDogMX0pXG4gKiBcbiAqIHJlcXVpcmUoW10sIGZ1bmN0aW9uKCl7fSApXG4gKiByZXF1aXJlKFtdLCBmdW5jdGlvbigpe30sIHtsb2NhbCA6IDF9KVxuICogXG4gKiByZXF1aXJlKCdtZXRob2QnLCBmdW5jdGlvbihteXN0dWZmKXsgfSlcbiAqIHJlcXVpcmUoJ21ldGhvZCcsIGZ1bmN0aW9uKG15c3R1ZmYpeyB9LCB7IGxvY2FsIDogMX0pXG4gKi9cbmNsYXNzIF9SZXF1aXJlQXJndW1lbnRQYXJzZXIgIHtcbiAgICBcbiAgICAvLyBkZW5vcm1hbGl6ZWQgYXJndW1lbnRzXG4gICAgcHJpdmF0ZSBmaXJzdDogYW55O1xuICAgIHByaXZhdGUgc2Vjb25kOiBhbnk7XG4gICAgcHJpdmF0ZSB0aGlyZDogYW55O1xuXG4gICAgLy8gVGhlIGFjdHVhbCB0YXJnZXRcbiAgICBwcml2YXRlIHRhcmdldCA6IHsgKC4uLmFyZ3MpIDogYW55IH07XG5cbiAgICAvLyBJbmplY3Rpb25zIChkZXBlbmRlbmNpZXMpXG4gICAgcHJpdmF0ZSBpbmplY3Rpb25zIDogc3RyaW5nW107XG5cbiAgICAvLyBMb2NhbCB2YXJpYWJsZXNcbiAgICBwcml2YXRlIGxvY2FscyA6IHt9ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCBkZWZhdWx0IHZhbHVlIFxuICAgICAqIFRvIGhhdmUgZWFzaWVyIGFjY2VzcyB0byB0aGVtXG4gICAgICogRHVlIHRvIGxpbWl0ZWQgYW1vdW50IG9mIGFyZ3VtZW50cyAoMykgd2UgZGVub3JtYWxpemUgaXRcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGlucHV0OiBhbnlbXSkge1xuICAgICAgICB0aGlzLmZpcnN0ID0gaW5wdXRbMF07XG4gICAgICAgIHRoaXMuc2Vjb25kID0gaW5wdXRbMV07XG4gICAgICAgIHRoaXMudGhpcmQgPSBpbnB1dFsyXTtcbiAgICAgICAgdGhpcy5pc0Z1bmN0aW9uKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ292ZXIgZmlyc3QgY2FzZSBpZiBhIGZpcnN0IGFyZ3VtZW50IGlzIGEgZnVuY3Rpb24gKGNsb3N1cmUpXG4gICAgICogXG4gICAgICogcmVxdWlyZShmdW5jdGlvbihhKXsgfSlcbiAgICAgKiByZXF1aXJlKGZ1bmN0aW9uKCl7fSwge2xvY2FsIDogMX0pXG4gICAgICovXG4gICAgaXNGdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIGlmICghdXRpbHMuaXNGdW5jdGlvbih0aGlzLmZpcnN0KSl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50YXJnZXQgPSB0aGlzLmZpcnN0O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pbmplY3Rpb25zID0gXG4gICAgICAgICAgICB1dGlscy5nZXRQYXJhbWV0ZXJOYW1lc0Zyb21GdW5jdGlvbih0aGlzLnRhcmdldCk7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gaGFzIHRvIGJlIGEgcGxhbmUgb2JlamN0ICggeyBmb28gOiBiYXIgfSApXG4gICAgICAgIGlmICggdGhpcy5maXJzdCAmJiB1dGlscy5pc1BsYWluT2JqZWN0KHRoaXMuc2Vjb25kKSl7XG4gICAgICAgICAgICB0aGlzLmxvY2FscyA9IHRoaXMuc2Vjb25kO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmluYWxseSBpbnN0ZWFkIG9mIGFycmF5IHRvIGRlZmluZSBhbm5vdGF0aW9uc1xuICAgICAqIFdlIG1pZ2h0IHBhc3Mgb25seSBvbmUgc3RyaW5nIChhbm5vdGF0aW9uKVxuICAgICAqL1xuICAgIGlzU3RyaW5nKClcbiAgICB7XG4gICAgICAgIGlmICggIXV0aWxzLmlzU3RyaW5nKHRoaXMuZmlyc3QpICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNBcnJheSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlyc3QgPSBbdGhpcy5maXJzdF07XG4gICAgICAgIHJldHVybiB0aGlzLmlzQXJyYXkoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3ZlciBhIGNhc2Ugd2hlbiBmaXJzdCBhcmd1bWVudCBpcyBhbiBhcnJheVxuICAgICAqIFNlY29uZCBhcmd1bWVudCBtdXN0IGJlIHByZXNlbnRcbiAgICAgKiByZXF1aXJlKFtdLCBmdW5jdGlvbigpe30gKVxuICAgICAqIHJlcXVpcmUoW10sIGZ1bmN0aW9uKCl7fSwge2xvY2FsIDogMX0pXG4gICAgICovXG4gICAgaXNBcnJheSgpXG4gICAge1xuICAgICAgICBpZiAoIXV0aWxzLmlzQXJyYXkodGhpcy5maXJzdCkpIHJldHVybjtcbiAgICAgICAgLy8gc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgdGhlciBcbiAgICAgICAgaWYoICF1dGlscy5pc0Z1bmN0aW9uKHRoaXMuc2Vjb25kKSl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBmdW5jdGlvbi9jbG9zdXJlIVwiKTtcbiAgICAgICAgfSBcbiAgICAgICAgdGhpcy5pbmplY3Rpb25zID0gdGhpcy5maXJzdDtcbiAgICAgICAgdGhpcy50YXJnZXQgPSB0aGlzLnNlY29uZDtcblxuICAgICAgICAvLyBXZSBtaWdodCBwYXNzIGxvY2FscyBhcyBhIHRoaXJkIGFyZ3VtZW50XG4gICAgICAgIGlmKCB1dGlscy5pc1BsYWluT2JqZWN0KHRoaXMudGhpcmQpICl7XG4gICAgICAgICAgICB0aGlzLmxvY2FscyA9IHRoaXMudGhpcmQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXR0aW5nIHRoZSBvdXRwdXRcbiAgICAgKi9cbiAgICBmb3JtYXQoKSA6IFJlcXVpcmVPcHRpb25zXG4gICAge1xuICAgICBcbiAgICAgICAgaWYgKCAhdXRpbHMuaXNGdW5jdGlvbih0aGlzLnRhcmdldCkgKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJlcXVpcmUgbWV0aG9kIHJlcXVpcmVzIGEgY2xvc3VyZSFcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDxSZXF1aXJlT3B0aW9ucz4ge1xuICAgICAgICAgICAgdGFyZ2V0IDogdGhpcy50YXJnZXQsXG4gICAgICAgICAgICBpbmplY3Rpb25zIDogdGhpcy5pbmplY3Rpb25zLFxuICAgICAgICAgICAgbG9jYWxzIDogdGhpcy5sb2NhbHNcbiAgICAgICAgfSBcbiAgICB9XG59XG5cblxuXG5leHBvcnQgdmFyIFJlcXVpcmVBcmd1bWVudFBhcnNlciA9IChpbnB1dDogYW55KSA6IFJlcXVpcmVPcHRpb25zID0+IHtcbiAgICBsZXQgcGFyc2VyID0gbmV3IF9SZXF1aXJlQXJndW1lbnRQYXJzZXIoaW5wdXQpO1xuICAgIHJldHVybiBwYXJzZXIuZm9ybWF0KCk7XG59IiwiaW1wb3J0IHV0aWxzIGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IENoYWluLCBDaGFpbmFibGUgfSBmcm9tICcuLi9jaGFpbic7XG5pbXBvcnQgeyBFYWNoIH0gZnJvbSAnLi4vZWFjaCc7XG5pbXBvcnQgU3RvcmFnZSBmcm9tICcuL1N0b3JhZ2UnO1xuaW1wb3J0IFJlYWxtTW9kdWxlIGZyb20gJy4vUmVhbG1Nb2R1bGUnO1xuaW1wb3J0IHsgUmVxdWlyZUFyZ3VtZW50UGFyc2VyLCBSZXF1aXJlT3B0aW9ucyB9IGZyb20gJy4vUmVxdWlyZUFyZ3VtZW50UGFyc2VyJztcblxuXG5sZXQgX21vZHVsZSA9IChuYW1lOiBzdHJpbmcsIGI6IGFueSwgYzogYW55KSA9PiB7XG4gICAgU3RvcmFnZS5zZXQobmFtZSwgbmV3IFJlYWxtTW9kdWxlKG5hbWUsIGIsIGMpKTtcbn1cblxubGV0IF90c19tb2R1bGUgPSAobmFtZTogc3RyaW5nLCBiOiBhbnksIGM6IGFueSkgPT4ge1xuICAgIFN0b3JhZ2Uuc2V0KG5hbWUsIG5ldyBSZWFsbU1vZHVsZShuYW1lLCBiLCBjLCB0cnVlKSk7XG59XG5cbmxldCBfcmVzb2x2ZSA9IChvcHRzOiBSZXF1aXJlT3B0aW9ucywgaW5qZWN0aW9uOiBzdHJpbmcpID0+IHtcbiAgICAvLyBUcnlpbmcgdG8gZ2V0IG1vZHVsZVxuICAgIGxldCBtb2Q6IFJlYWxtTW9kdWxlID0gU3RvcmFnZS5nZXQoaW5qZWN0aW9uKTtcblxuICAgIC8vIERlYWwgd2l0aCBsb2NhbHNcbiAgICAvLyBXZSBkb24ndCB3YW50IGFsbG93IHBhc3NpbmcgYW55IHByb21pc2VzIGludG8gbG9jYWwgdmFyaWFibGVzXG4gICAgLy8gT3RoZXJ3aXNlIGl0IHdpbGwgYmUgc3BvaWxlZCB3aXRoIHN1c3BpY2lvdXMgXCJ1bmtub3duXCIgc3R1ZmZcbiAgICBpZiAoaW5qZWN0aW9uIGluIG9wdHMubG9jYWxzKSB7XG4gICAgICAgIHJldHVybiBvcHRzLmxvY2Fsc1tpbmplY3Rpb25dO1xuICAgIH1cblxuICAgIGlmIChtb2QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb2R1bGUgXCIgKyBpbmplY3Rpb24gKyBcIiBpcyBub3QgcmVnaXN0ZXJlZCFcXG4gPj4gXCIgKyBvcHRzLnRhcmdldCk7XG4gICAgfVxuICAgIC8vIHRyeWluZyB0byBmZXRjaCBmcm9tIGNhY2hlXG4gICAgaWYgKG1vZC5pc0NhY2hlZCgpKSB7XG4gICAgICAgIHJldHVybiBtb2QuZ2V0Q2FjaGUoKTtcbiAgICB9XG4gICAgLy8gUmVjdXJzaXZlbHkgcmVxdWlyZSBkZXBlbmRlbmNpZXMgXG4gICAgcmV0dXJuIF9yZXF1aXJlKG1vZC5nZXREZXBlbmRlbmNpZXMoKSwgbW9kLmdldENsb3N1cmUoKSwgb3B0cy5sb2NhbHMsIG1vZClcbiAgICAgICAgLnRoZW4oeCA9PiBtb2Quc2V0Q2FjaGUoeCkpO1xufVxuXG5sZXQgX2FwcGx5ID0gKG9wdHM6IFJlcXVpcmVPcHRpb25zLCByZXN1bHRzIDogQXJyYXk8YW55PiwgbW9kPyA6IFJlYWxtTW9kdWxlKSA9PiBcbntcbiAgICAvLyBoYW5kbGUgdHlwZXNjcmlwdCBtb2R1bGVzIGRpZmZlcmVudGx5XG4gICAgLy8gYmFzaWNhbGx5IHdlIGFwcGx5aW5nIG9ubHkgMiB2YXJpYWJsZXMgLSB7ZXhwb3J0cywgcmVxdWlyZX1cbiAgICBpZiggbW9kICE9PSB1bmRlZmluZWQgJiYgbW9kLmlzVHlwZVNjcmlwdCgpICl7XG4gICAgICAgIGxldCBfZXhwb3J0cyA9IHt9O1xuICAgICAgICBsZXQgX2VudiA9IHt9O1xuICAgICAgICBmb3IoIGxldCBpbmRleCA9IDA7IGluZGV4IDwgb3B0cy5pbmplY3Rpb25zLmxlbmd0aDsgaW5kZXgrKyl7XG4gICAgICAgICAgICBfZW52W29wdHMuaW5qZWN0aW9uc1tpbmRleF1dID0gcmVzdWx0c1tpbmRleF07XG4gICAgICAgIH1cbiAgICAgICAgb3B0cy50YXJnZXQoLi4uW19leHBvcnRzLCB4ID0+IF9lbnZbeF1dKVxuICAgICAgICByZXR1cm4gX2V4cG9ydHM7XG4gICAgfTtcbiAgICByZXR1cm4gb3B0cy50YXJnZXQoLi4ucmVzdWx0cykgXG59XG5cbmxldCBfcmVxdWlyZSA9IChhLCBiPywgYz8sIG1vZD8gOiBSZWFsbU1vZHVsZSk6IGFueSA9PiB7XG4gICAgbGV0IG9wdHM6IFJlcXVpcmVPcHRpb25zID0gUmVxdWlyZUFyZ3VtZW50UGFyc2VyKFthLCBiLCBjXSk7XG4gICAgXG4gICAgcmV0dXJuIEVhY2gob3B0cy5pbmplY3Rpb25zLCBpbmplY3Rpb24gPT4gX3Jlc29sdmUob3B0cywgaW5qZWN0aW9uKSlcbiAgICAgICAgLnRoZW4oKHRvQXBwbHk6IEFycmF5PGFueT4pID0+IHtcbiAgICAgICAgICAgIHJldHVybiBfYXBwbHkob3B0cywgdG9BcHBseSwgbW9kICk7XG4gICAgICAgIH0pO1xufVxuXG5cblxuZXhwb3J0IGxldCBtb2QgPSBfbW9kdWxlO1xuZXhwb3J0IGxldCB0c19tb2QgPSBfdHNfbW9kdWxlO1xuZXhwb3J0IGxldCByZXEgPSBfcmVxdWlyZTtcbiIsImltcG9ydCB7RWFjaH0gZnJvbSAnLi9yZWFsbS9lYWNoJztcbmltcG9ydCB7Q2hhaW4sIENoYWluYWJsZX0gZnJvbSAnLi9yZWFsbS9jaGFpbic7XG5pbXBvcnQgdXRpbHMgZnJvbSAnLi9yZWFsbS91dGlscyc7XG5pbXBvcnQgUmVhbG1Nb2R1bGUgZnJvbSAnLi9yZWFsbS9jb3JlL1JlYWxtTW9kdWxlJztcbmltcG9ydCBTdG9yYWdlIGZyb20gJy4vcmVhbG0vY29yZS9TdG9yYWdlJztcbmltcG9ydCB7cmVxLCBtb2QsIHRzX21vZH0gZnJvbSAnLi9yZWFsbS9jb3JlL0NvcmUnO1xuaW1wb3J0IHtSZXF1aXJlQXJndW1lbnRQYXJzZXIsIFJlcXVpcmVPcHRpb25zfSBmcm9tICcuL3JlYWxtL2NvcmUvUmVxdWlyZUFyZ3VtZW50UGFyc2VyJztcblxuZXhwb3J0IGNvbnN0IHJlYWxtID0ge1xuICAgbW9kdWxlIDogbW9kLFxuICAgdHNfbW9kdWxlIDogdHNfbW9kLFxuICAgcmVxdWlyZSA6IHJlcSxcbiAgIFJlcXVpcmVBcmd1bWVudFBhcnNlciA6IFJlcXVpcmVBcmd1bWVudFBhcnNlcixcbiAgIGVhY2ggOiBFYWNoLFxuICAgY2hhaW4gOiBDaGFpbixcbiAgIENoYWluYWJsZSA6IENoYWluYWJsZSxcbiAgIHV0aWxzIDogdXRpbHMsXG4gICBmbHVzaCA6IFN0b3JhZ2UuZmx1c2hcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
