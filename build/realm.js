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
        return tag == funcTag || tag == genTag;
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
        const isObject = utils_1.default.isObject(argv);
        let index = -1;
        let iterate = () => {
            index++;
            if (index < argv.length) {
                let key = isObject ? Object.keys(argv)[index] : index;
                let value = isObject ? argv[key] : argv[index];
                if (utils_1.default.isPromise(value)) {
                    value.then((data) => { results.push(data); iterate(); }).catch(reject);
                }
                else {
                    let res = cb(...[value, key]);
                    if (utils_1.default.isPromise(res)) {
                        res.then(a => { results.push(a); iterate(); }).catch(reject);
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
    constructor(a, b, c) {
        if (!utils_1.default.isString(a)) {
            throw new Error("Module first argument must be string!");
        }
        this.name = a;
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
    isCached() {
        return this.cached !== undefined;
    }
    getCache() {
        return this.cached;
    }
    setCache(obj) {
        this.cached = obj;
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
let _mod = (name, b, c) => {
    Storage_1.default.set(name, new RealmModule_1.default(name, b, c));
};
let _req = (a, b, c) => {
    let opts = RequireArgumentParser_1.RequireArgumentParser([a, b, c]);
    return each_1.Each(opts.injections, (injection) => {
        let mod = Storage_1.default.get(injection);
        if (mod.isCached()) {
            return mod.getCache();
        }
        return _req(mod.getDependencies(), mod.getClosure(), opts.locals)
            .then((response) => {
            mod.setCache(response);
            return response;
        });
    }).then((toApply) => {
        return opts.target(...toApply);
    });
};
exports.mod = _mod;
exports.req = _req;

});

/* ******* realm.ts ******* */
__ts__.module("realm.js", function(exports, require){
"use strict";
const each_1 = require('./realm/each');
const chain_1 = require('./realm/chain');
const utils_1 = require('./realm/utils');
const Core_1 = require('./realm/core/Core');
const RequireArgumentParser_1 = require('./realm/core/RequireArgumentParser');
exports.realm = {
    RequireArgumentParser: RequireArgumentParser_1.RequireArgumentParser,
    each: each_1.Each,
    chain: chain_1.Chain,
    Chainable: chain_1.Chainable,
    utils: utils_1.default,
    module: Core_1.mod,
    require: Core_1.req
};

});

__ts__.expose(__scope__, "realm");})(function($scope, $isBackend) { var ts = {register: {},pathJoin: function() { var parts = []; for (var i = 0, l = arguments.length; i < l; i++) {parts = parts.concat(arguments[i].split("/")); } var newParts = []; for (i = 0, l = parts.length; i < l; i++) {var part = parts[i];if (!part || part === ".") { continue}if (part === "..") { newParts.pop();} else { newParts.push(part);} } if (parts[0] === "") {newParts.unshift("") } return newParts.join("/") || (newParts.length ? "/" : ".");},module: function(name, fn) { var _exports = {}; var relative = "./"; var rel = name.match(/^(.*)\/[\w]+\.js$/); if (rel) {relative = rel[1]; } fn(_exports, this.require.bind({self: this,path: name,relative: relative })); this.register[name] = _exports;},require: function(name) { var self = this.self; var path = this.path; var relative = this.relative; if (name[0] === ".") {var target = ts.pathJoin(relative, name) + ".js";if (self.register[target]) { return self.register[target];} } else {return require(name); }},expose: function(scope, path) { path = path.match(/\.js^/) ? path : path + ".js"; var e = this.register[path]; if (e !== undefined) {var useAmd = !$isBackend && typeof define == 'function' && define.amd;for (var key in e) { var value = e[key]; if (useAmd) {define(key, [], function() { return value;}); } else {$scope[key] = value }} } else {throw new Error('Module "' + path + '" Cannot be exposed! Make sure you export variables correctly and the module is present'); }} }; return {isBackend: $isBackend,scope: $scope,ts : ts }}(typeof exports !== "undefined" ? exports : this, typeof exports !== "undefined"));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlYWxtL3V0aWxzLnRzIiwicmVhbG0vZWFjaC50cyIsInJlYWxtL2NoYWluLnRzIiwicmVhbG0vY29yZS9SZWFsbU1vZHVsZS50cyIsInJlYWxtL2NvcmUvU3RvcmFnZS50cyIsInJlYWxtL2NvcmUvUmVxdWlyZUFyZ3VtZW50UGFyc2VyLnRzIiwicmVhbG0vY29yZS9Db3JlLnRzIiwicmVhbG0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7QUFDckMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUNyQyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQ3hDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7QUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25ELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7QUFDNUMsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUM7QUFDcEMsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsNEJBQTRCLENBQUM7QUFHNUM7SUFHRSxPQUFPLFNBQVMsQ0FBQyxJQUFTO1FBQ3hCLE1BQU0sQ0FBQyxJQUFJLEtBQUssU0FBUztlQUNwQixPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVTtZQUNsQyxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxDQUFDO0lBQ3JDLENBQUM7SUFHRCxPQUFPLFFBQVEsQ0FBQyxLQUFVO1FBQ3hCLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUM7SUFDL0MsQ0FBQztJQUVELE9BQU8sVUFBVSxDQUFDLEtBQVU7UUFDMUIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxL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LENBQUEiLCJmaWxlIjoicmVhbG0uanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBmdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5jb25zdCBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5jb25zdCBmdW5jVG9TdHJpbmcgPSBmdW5jUHJvdG8udG9TdHJpbmc7XG5jb25zdCBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuY29uc3Qgb2JqZWN0Q3RvclN0cmluZyA9IGZ1bmNUb1N0cmluZy5jYWxsKE9iamVjdCk7XG5jb25zdCBvYmplY3RUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuY29uc3Qgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5jb25zdCBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbmNvbnN0IGdlblRhZyA9ICdbb2JqZWN0IEdlbmVyYXRvckZ1bmN0aW9uXSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVXRpbHMge1xuXG4gIC8vIGlzUHJvbWlzZSgpXG4gIHN0YXRpYyBpc1Byb21pc2UoaXRlbTogYW55KSB7XG4gICAgcmV0dXJuIGl0ZW0gIT09IHVuZGVmaW5lZFxuICAgICAgJiYgdHlwZW9mIGl0ZW0udGhlbiA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgdHlwZW9mIGl0ZW0uY2F0Y2ggPT09ICdmdW5jdGlvbic7XG4gIH1cblxuICAvLyBpc05vdFNldCAodW5kZWZpbmVkIGFuZCBudWxsIHdpbGwgcmV0dXJuIHRydWUpXG4gIHN0YXRpYyBpc05vdFNldChpbnB1dDogYW55KSB7XG4gICAgcmV0dXJuIGlucHV0ID09PSB1bmRlZmluZWQgfHwgaW5wdXQgPT09IG51bGw7XG4gIH1cblxuICBzdGF0aWMgaXNGdW5jdGlvbih2YWx1ZTogYW55KSB7XG4gICAgdmFyIHRhZyA9IHRoaXMuaXNPYmplY3QodmFsdWUpID8gb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgOiAnJztcbiAgICByZXR1cm4gdGFnID09IGZ1bmNUYWcgfHwgdGFnID09IGdlblRhZztcbiAgfVxuXG4gIC8vaXNPYmplY3RcbiAgc3RhdGljIGlzT2JqZWN0KGlucHV0OiBhbnkpIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBpbnB1dDtcbiAgICByZXR1cm4gISFpbnB1dCAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xuICB9XG5cbiAgLy9pc0hvc3RPYmplY3RcbiAgc3RhdGljIGlzSG9zdE9iamVjdCh2YWx1ZSkge1xuICAgIC8vIE1hbnkgaG9zdCBvYmplY3RzIGFyZSBgT2JqZWN0YCBvYmplY3RzIHRoYXQgY2FuIGNvZXJjZSB0byBzdHJpbmdzXG4gICAgLy8gZGVzcGl0ZSBoYXZpbmcgaW1wcm9wZXJseSBkZWZpbmVkIGB0b1N0cmluZ2AgbWV0aG9kcy5cbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKHZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHZhbHVlLnRvU3RyaW5nICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9ICEhKHZhbHVlICsgJycpO1xuICAgICAgfSBjYXRjaCAoZSkgeyB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvL292ZXJBcmdcbiAgc3RhdGljIG92ZXJBcmcoZnVuYywgdHJhbnNmb3JtKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgIHJldHVybiBmdW5jKHRyYW5zZm9ybShhcmcpKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gaXNPYmplY3RMaWtlXG4gIHN0YXRpYyBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG4gIH1cblxuICAvLyBGbGF0dGVuIGFyZ3VtZXRuc1xuICAvLyBmbGF0dGVuKCdhJywgJ2InLCBbJ2MnXSkgLT4gWydhJywgJ2InLCAnYyddXG4gIHN0YXRpYyBmbGF0dGVuKGRhdGE6IGFueSkge1xuICAgIHJldHVybiBbXS5jb25jYXQuYXBwbHkoW10sIGRhdGEpO1xuICB9XG5cbiAgLy8gc2V0cyBoaWRkZW4gcHJvcGVydHlcbiAgc3RhdGljIHNldEhpZGRlblByb3BlcnR5KG9iajogT2JqZWN0LCBrZXk6IHN0cmluZywgdmFsdWU6IE9iamVjdCk6IGFueSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZVxuICAgIH0pO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHN0YXRpYyBpc1N0cmluZyh2YWx1ZTogYW55KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG4gIH1cblxuICAvLyBpc0FycmF5XG4gIHN0YXRpYyBpc0FycmF5KGlucHV0OiBhbnkpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpbnB1dCk7XG4gIH1cblxuICAvLyBpc1BsYWluT2JqZWN0XG4gIHN0YXRpYyBpc1BsYWluT2JqZWN0KHZhbHVlKSB7XG4gICAgaWYgKCF0aGlzLmlzT2JqZWN0TGlrZSh2YWx1ZSkgfHxcbiAgICAgIG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpICE9IG9iamVjdFRhZyB8fCB0aGlzLmlzSG9zdE9iamVjdCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHByb3RvID0gdGhpcy5vdmVyQXJnKE9iamVjdC5nZXRQcm90b3R5cGVPZiwgT2JqZWN0KSh2YWx1ZSk7XG4gICAgaWYgKHByb3RvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIEN0b3IgPSBoYXNPd25Qcm9wZXJ0eS5jYWxsKHByb3RvLCAnY29uc3RydWN0b3InKSAmJiBwcm90by5jb25zdHJ1Y3RvcjtcbiAgICByZXR1cm4gKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiZcbiAgICAgIEN0b3IgaW5zdGFuY2VvZiBDdG9yICYmIGZ1bmNUb1N0cmluZy5jYWxsKEN0b3IpID09IG9iamVjdEN0b3JTdHJpbmcpO1xuICB9XG5cbiAgLy8gZ2V0cyBwYXJhbWV0ZXIgbmFtZXNcbiAgc3RhdGljIGdldFBhcmFtZXRlck5hbWVzRnJvbUZ1bmN0aW9uKGZ1bmM6IGFueSkge1xuICAgIHZhciBTVFJJUF9DT01NRU5UUyA9IC8oKFxcL1xcLy4qJCl8KFxcL1xcKltcXHNcXFNdKj9cXCpcXC8pKS9tZztcbiAgICB2YXIgQVJHVU1FTlRfTkFNRVMgPSAvKFteXFxzLF0rKS9nO1xuICAgIHZhciBmblN0ciA9IGZ1bmMudG9TdHJpbmcoKS5yZXBsYWNlKFNUUklQX0NPTU1FTlRTLCAnJyk7XG4gICAgdmFyIHJlc3VsdCA9IGZuU3RyLnNsaWNlKGZuU3RyLmluZGV4T2YoJygnKSArIDEsIGZuU3RyLmluZGV4T2YoJyknKSkubWF0Y2goQVJHVU1FTlRfTkFNRVMpO1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwpXG4gICAgICByZXN1bHQgPSBbXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cbiIsImltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIEVhY2ggZnVuY3Rpb25cbiAqIEl0ZXJhdGVzIGFueSBvYmplY3RzIGluY2x1ZGluZyBQcm9taXNlc1xuICovXG5leHBvcnQgdmFyIEVhY2ggPSAoYXJndjogYW55LCBjYjogeyAoLi4uYXJncyk6IGFueSB9KSA9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IFtdO1xuICAgICAgICBjb25zdCBpc09iamVjdCA9IHV0aWxzLmlzT2JqZWN0KGFyZ3YpO1xuICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IC0xO1xuICAgICAgICBsZXQgaXRlcmF0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCBhcmd2Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGxldCBrZXkgPSBpc09iamVjdCA/IE9iamVjdC5rZXlzKGFyZ3YpW2luZGV4XSA6IGluZGV4O1xuICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IGlzT2JqZWN0ID8gYXJndltrZXldIDogYXJndltpbmRleF07XG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZXMgbmVlZCB0byBiZSByZXNvbHZlZFxuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnRoZW4oKGRhdGEpID0+IHsgcmVzdWx0cy5wdXNoKGRhdGEpOyBpdGVyYXRlKCk7IH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlcyA9IGNiKC4uLlt2YWx1ZSwga2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc1Byb21pc2UocmVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnRoZW4oYSA9PiB7IHJlc3VsdHMucHVzaChhKTsgIGl0ZXJhdGUoKTsgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHJldHVybiByZXNvbHZlKHJlc3VsdHMpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0ZSgpO1xuICAgIH0pO1xufVxuIiwiaW1wb3J0IHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRWFjaCB9IGZyb20gJy4vZWFjaCc7XG5cbmV4cG9ydCBjbGFzcyBDaGFpbmFibGUge1xuICAgIHByb3RlY3RlZCAkZmluYWxpemVkOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHJvdGVjdGVkICRraWxsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwcm90ZWN0ZWQgJG1hbnVhbDogYW55O1xuICAgIHByb3RlY3RlZCAkY29sbGVjdGlvbjogT2JqZWN0ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBwcm90ZWN0ZWQgLSBicmVha1xuICAgICAqXG4gICAgICogQHBhcmFtICB7YW55fSBtYW51YWwgOiBBbnkgb2JqZWN0XG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgYnJlYWsobWFudWFsOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgdGhpcy4kZmluYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy4kbWFudWFsID0gbWFudWFsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHByb3RlY3RlZCAtIGtpbGxcbiAgICAgKiBLaWxscyB0aGUgY2hhaW5cbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBraWxsKCk6IHZvaWQge1xuICAgICAgICB0aGlzLiRmaW5hbGl6ZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLiRraWxsZWQgPSB0cnVlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgYW5kIGNyZWF0ZXMgZXh0cmEgcHJvcGVydGllcyBmb3IgdGhlIGNsYXNzXG4gKiBTdXBwb3J0cyBub24tdHlwZXNjcmlwdCB1c2FnZVxuICogRm9yIHR5cGVzY3JpcHQgQ2hhaW5hYmxlIGNsYXNzIGlmIHJlcXVpcmVkXG4gKi9cbmxldCBDaGFpbkNsYXNzQ29udHJ1Y3RvciA9IChpbnB1dDogYW55KSA9PiB7XG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgQ2hhaW5hYmxlKSB7XG4gICAgICAgIHJldHVybiBpbnB1dDtcbiAgICB9XG4gICAgXG4gICAgbGV0IGluc3RhbmNlOiBPYmplY3QgPSB7fTtcbiAgICAvLyBpZiB0aGF0J3MgZnVuY3Rpb24nXG4gICAgaWYgKHV0aWxzLmlzRnVuY3Rpb24oaW5wdXQpKSB7XG4gICAgICAgIGluc3RhbmNlID0gbmV3IGlucHV0KCk7XG4gICAgICAgIGlmKCBpbnN0YW5jZSBpbnN0YW5jZW9mIENoYWluYWJsZSApe1xuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdChpbnB1dCkpIHtcbiAgICAgICAgaW5zdGFuY2UgPSBpbnB1dDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDaGFpbiByZXF1aXJlcyBhIENsYXNzIG9yIGFuIEluc3RhbmNlXCIpXG4gICAgfVxuICAgIGluc3RhbmNlWyckY29sbGVjdGlvbiddID0ge307XG4gICAgaW5zdGFuY2VbJ2JyZWFrJ10gPSBtYW51YWwgPT4ge1xuICAgICAgICB1dGlscy5zZXRIaWRkZW5Qcm9wZXJ0eShpbnN0YW5jZSwgJyRmaW5hbGl6ZWQnLCB0cnVlKTtcbiAgICAgICAgdXRpbHMuc2V0SGlkZGVuUHJvcGVydHkoaW5zdGFuY2UsICckbWFudWFsJywgbWFudWFsKTtcbiAgICB9XG4gICAgaW5zdGFuY2VbJ2tpbGwnXSA9ICgpID0+IHtcbiAgICAgICAgdXRpbHMuc2V0SGlkZGVuUHJvcGVydHkoaW5zdGFuY2UsICckZmluYWxpemVkJywgdHJ1ZSk7XG4gICAgICAgIHV0aWxzLnNldEhpZGRlblByb3BlcnR5KGluc3RhbmNlLCAnJGtpbGxlZCcsIHRydWUpO1xuICAgIH1cbiAgICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbi8qKlxuICogQ2hhaW4gY2xhc3NcbiAqIEV4ZWN1dGVzIG1ldGhvZHMgaW4gb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IENoYWluID0gKGNsczogYW55KSA9PiB7XG4gICAgbGV0IGluc3RhbmNlID0gQ2hhaW5DbGFzc0NvbnRydWN0b3IoY2xzKTtcbiAgICBsZXQgcHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICAgIGxldCB0YXNrcyA9IFtdO1xuXG4gICAgLy8gY29sbGVjdGluZyBwcm9wcyBhbmQgY2hlY2tpbmcgZm9yIHNldHRlcnNcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBwcm9wZXJ0eU5hbWUgPSBwcm9wc1tpXTtcbiAgICAgICAgaWYgKCEocHJvcGVydHlOYW1lIGluIFtcImZvcm1hdFwiLCAna2lsbCcsICdicmVhayddKSkge1xuICAgICAgICAgICAgbGV0IGlzU2V0dGVyID0gcHJvcGVydHlOYW1lLm1hdGNoKC9ec2V0KC4qKSQvKTtcbiAgICAgICAgICAgIGxldCBzZXR0ZXJOYW1lID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChpc1NldHRlcikge1xuICAgICAgICAgICAgICAgIHNldHRlck5hbWUgPSBpc1NldHRlclsxXVxuICAgICAgICAgICAgICAgIHNldHRlck5hbWUgPSBzZXR0ZXJOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc2V0dGVyTmFtZS5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAgICAgICAgIHByb3A6IHByb3BlcnR5TmFtZSxcbiAgICAgICAgICAgICAgICBzZXR0ZXI6IHNldHRlck5hbWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFN0b3JlIGl0IHRvIHRoZSBwcm9wZXJ0eSBvZiB0aGUgY2xhc3MnXG4gICAgbGV0IHN0b3JlID0gZnVuY3Rpb24gKHByb3AsIHZhbCk6IHZvaWQge1xuICAgICAgICBpbnN0YW5jZS4kY29sbGVjdGlvbltwcm9wXSA9IHZhbDtcbiAgICAgICAgaW5zdGFuY2VbcHJvcF0gPSB2YWw7XG4gICAgfVxuXG4gICAgLy8gRXZhbHVhdGVcbiAgICBsZXQgZXZhbHVhdGUgPSBmdW5jdGlvbiAodGFzayk6IGFueSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBpbnN0YW5jZVt0YXNrLnByb3BdLmFwcGx5KGluc3RhbmNlKTtcbiAgICAgICAgaWYgKHRhc2suc2V0dGVyKSB7XG4gICAgICAgICAgICBpZiAodXRpbHMuaXNQcm9taXNlKHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRoZW4ocmVzID0+IHsgc3RvcmUodGFzay5zZXR0ZXIsIHJlcykgfSk7XG4gICAgICAgICAgICB9IGVsc2Ugc3RvcmUodGFzay5zZXR0ZXIsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBDYWxsaW5nIHRhc2tzIGluIG9yZGVyIHRoZXkgaGF2ZSBiZWVuIGNyZWF0ZWRcbiAgICByZXR1cm4gRWFjaCh0YXNrcywgKHRhc2s6IGFueSkgPT4ge1xuICAgICAgICByZXR1cm4gIWluc3RhbmNlLiRmaW5hbGl6ZWQgPyBldmFsdWF0ZSh0YXNrKSA6IGZhbHNlO1xuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBpZiAodXRpbHMuaXNGdW5jdGlvbihpbnN0YW5jZVtcImZvcm1hdFwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBldmFsdWF0ZSh7XG4gICAgICAgICAgICAgICAgcHJvcDogXCJmb3JtYXRcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KS50aGVuKHNwZWNpYWxGb3JtYXQgPT4ge1xuICAgICAgICBpZiAoaW5zdGFuY2UuJGtpbGxlZCkgcmV0dXJuO1xuICAgICAgICBpZiAoIWluc3RhbmNlLiRtYW51YWwpIHtcbiAgICAgICAgICAgIGlmIChzcGVjaWFsRm9ybWF0KSByZXR1cm4gc3BlY2lhbEZvcm1hdDtcbiAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZS4kY29sbGVjdGlvbjtcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICByZXR1cm4gaW5zdGFuY2UuJG1hbnVhbDtcbiAgICB9KTtcbn1cbiIsImltcG9ydCB1dGlscyBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlYWxtTW9kdWxlIHtcbiAgICBwcml2YXRlIG5hbWU6IHN0cmluZztcbiAgICBwcml2YXRlIGRlcGVuZGVuY2llczogc3RyaW5nW107XG4gICAgcHJpdmF0ZSBjbG9zdXJlOiB7ICguLi5hcmdzKTogYW55IH07XG4gICAgcHJpdmF0ZSBjYWNoZWQgOiBhbnk7XG5cbiAgICBjb25zdHJ1Y3RvcihhOiBhbnksIGI6IGFueSwgYzogYW55KSB7XG4gICAgICAgIGlmICghdXRpbHMuaXNTdHJpbmcoYSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vZHVsZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIHN0cmluZyFcIilcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm5hbWUgPSBhO1xuXG4gICAgICAgIGlmICh1dGlscy5pc0Z1bmN0aW9uKGIpKSB7XG4gICAgICAgICAgICB0aGlzLmNsb3N1cmUgPSBiO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1dGlscy5pc0FycmF5KGIpKSB7XG4gICAgICAgICAgICB0aGlzLmRlcGVuZGVuY2llcyA9IGI7XG4gICAgICAgICAgICBpZiAoIXV0aWxzLmlzRnVuY3Rpb24oYykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb2R1bGUgbXVzdCBoYXZlIGEgY2xvc3VyZSFcIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xvc3VyZSA9IGM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGlzQ2FjaGVkKClcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlZCAhPT0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDYWNoZSgpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZWQ7XG4gICAgfVxuICAgIFxuICAgIHB1YmxpYyBzZXRDYWNoZShvYmogOiBhbnkpXG4gICAge1xuICAgICAgICB0aGlzLmNhY2hlZCA9IG9iajtcbiAgICB9XG4gICAgcHVibGljIGdldE5hbWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWU7XG4gICAgfVxuICAgIHB1YmxpYyBnZXREZXBlbmRlbmNpZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRlcGVuZGVuY2llcztcbiAgICB9XG4gICAgcHVibGljIGdldENsb3N1cmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNsb3N1cmU7XG4gICAgfVxuXG4gICAgcHVibGljIHRvUmVxdWlyZShsb2NhbHMgOiBPYmplY3QpIDogQXJyYXk8YW55PlxuICAgIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmRlcGVuZGVuY2llcywgdGhpcy5jbG9zdXJlLCBsb2NhbHNdO1xuICAgIH1cbn0iLCJpbXBvcnQgUmVhbG1Nb2R1bGUgZnJvbSAnLi9SZWFsbU1vZHVsZSc7XG5cbi8vIERlZmluZSBlbnZpcm9ubWVudCBpdCdzIGVpdGhlciBnbG9iYWwgbm9kZSBtb2R1bGVzIG9yIHdpbmRvd1xuY29uc3QgZW52aXJvbm1lbnQgPSAkaXNCYWNrZW5kID8gZ2xvYmFsIDogd2luZG93O1xuXG4vLyBDcmVhdGluZyBvciBnZXR0aW5nIHRoZSBlbnZpcm9ubWVudFxuZW52aXJvbm1lbnQuX19yZWFsbV9fID0gZW52aXJvbm1lbnQuX19yZWFsbV9fIHx8IHt9O1xuXG4vKipcbiAqIFN0b3JhZ2VcbiAqIFNldHMgYW5kIHJldHJldmllcyBtb2R1bGVzIGZyb20gY2FjaGVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RvcmFnZSB7XG4gICAgc3RhdGljIHNldChuYW1lOiBzdHJpbmcsIG9iajogUmVhbG1Nb2R1bGUpOiB2b2lkIHtcbiAgICAgICAgZW52aXJvbm1lbnQuX19yZWFsbV9fW25hbWVdID0gb2JqO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0KG5hbWU6IHN0cmluZykgOiBSZWFsbU1vZHVsZSB7XG4gICAgICAgIHJldHVybiBlbnZpcm9ubWVudC5fX3JlYWxtX19bbmFtZV07XG4gICAgfVxufSIsImltcG9ydCB1dGlscyBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVxdWlyZU9wdGlvbnNcbntcbiAgICB0YXJnZXQgOiB7ICguLi5hcmdzKSA6IGFueSB9O1xuICAgIGluamVjdGlvbnMgOiBzdHJpbmdbXTtcbiAgICBsb2NhbHMgOiB7fTtcbn1cblxuLyoqXG4gKiByZXF1aXJlKGZ1bmN0aW9uKGEpeyB9KVxuICogcmVxdWlyZShmdW5jdGlvbigpe30sIHtsb2NhbCA6IDF9KVxuICogXG4gKiByZXF1aXJlKFtdLCBmdW5jdGlvbigpe30gKVxuICogcmVxdWlyZShbXSwgZnVuY3Rpb24oKXt9LCB7bG9jYWwgOiAxfSlcbiAqIFxuICogcmVxdWlyZSgnbWV0aG9kJywgZnVuY3Rpb24obXlzdHVmZil7IH0pXG4gKiByZXF1aXJlKCdtZXRob2QnLCBmdW5jdGlvbihteXN0dWZmKXsgfSwgeyBsb2NhbCA6IDF9KVxuICovXG5jbGFzcyBfUmVxdWlyZUFyZ3VtZW50UGFyc2VyICB7XG4gICAgXG4gICAgLy8gZGVub3JtYWxpemVkIGFyZ3VtZW50c1xuICAgIHByaXZhdGUgZmlyc3Q6IGFueTtcbiAgICBwcml2YXRlIHNlY29uZDogYW55O1xuICAgIHByaXZhdGUgdGhpcmQ6IGFueTtcblxuICAgIC8vIFRoZSBhY3R1YWwgdGFyZ2V0XG4gICAgcHJpdmF0ZSB0YXJnZXQgOiB7ICguLi5hcmdzKSA6IGFueSB9O1xuXG4gICAgLy8gSW5qZWN0aW9ucyAoZGVwZW5kZW5jaWVzKVxuICAgIHByaXZhdGUgaW5qZWN0aW9ucyA6IHN0cmluZ1tdO1xuXG4gICAgLy8gTG9jYWwgdmFyaWFibGVzXG4gICAgcHJpdmF0ZSBsb2NhbHMgOiB7fSA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogU2V0dXAgZGVmYXVsdCB2YWx1ZSBcbiAgICAgKiBUbyBoYXZlIGVhc2llciBhY2Nlc3MgdG8gdGhlbVxuICAgICAqIER1ZSB0byBsaW1pdGVkIGFtb3VudCBvZiBhcmd1bWVudHMgKDMpIHdlIGRlbm9ybWFsaXplIGl0XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoaW5wdXQ6IGFueVtdKSB7XG4gICAgICAgIHRoaXMuZmlyc3QgPSBpbnB1dFswXTtcbiAgICAgICAgdGhpcy5zZWNvbmQgPSBpbnB1dFsxXTtcbiAgICAgICAgdGhpcy50aGlyZCA9IGlucHV0WzJdO1xuICAgICAgICB0aGlzLmlzRnVuY3Rpb24oKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3ZlciBmaXJzdCBjYXNlIGlmIGEgZmlyc3QgYXJndW1lbnQgaXMgYSBmdW5jdGlvbiAoY2xvc3VyZSlcbiAgICAgKiBcbiAgICAgKiByZXF1aXJlKGZ1bmN0aW9uKGEpeyB9KVxuICAgICAqIHJlcXVpcmUoZnVuY3Rpb24oKXt9LCB7bG9jYWwgOiAxfSlcbiAgICAgKi9cbiAgICBpc0Z1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgaWYgKCF1dGlscy5pc0Z1bmN0aW9uKHRoaXMuZmlyc3QpKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuZmlyc3Q7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmluamVjdGlvbnMgPSBcbiAgICAgICAgICAgIHV0aWxzLmdldFBhcmFtZXRlck5hbWVzRnJvbUZ1bmN0aW9uKHRoaXMudGFyZ2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBoYXMgdG8gYmUgYSBwbGFuZSBvYmVqY3QgKCB7IGZvbyA6IGJhciB9IClcbiAgICAgICAgaWYgKCB0aGlzLmZpcnN0ICYmIHV0aWxzLmlzUGxhaW5PYmplY3QodGhpcy5zZWNvbmQpKXtcbiAgICAgICAgICAgIHRoaXMubG9jYWxzID0gdGhpcy5zZWNvbmQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaW5hbGx5IGluc3RlYWQgb2YgYXJyYXkgdG8gZGVmaW5lIGFubm90YXRpb25zXG4gICAgICogV2UgbWlnaHQgcGFzcyBvbmx5IG9uZSBzdHJpbmcgKGFubm90YXRpb24pXG4gICAgICovXG4gICAgaXNTdHJpbmcoKVxuICAgIHtcbiAgICAgICAgaWYgKCAhdXRpbHMuaXNTdHJpbmcodGhpcy5maXJzdCkgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc0FycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXJzdCA9IFt0aGlzLmZpcnN0XTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNBcnJheSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvdmVyIGEgY2FzZSB3aGVuIGZpcnN0IGFyZ3VtZW50IGlzIGFuIGFycmF5XG4gICAgICogU2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgcHJlc2VudFxuICAgICAqIHJlcXVpcmUoW10sIGZ1bmN0aW9uKCl7fSApXG4gICAgICogcmVxdWlyZShbXSwgZnVuY3Rpb24oKXt9LCB7bG9jYWwgOiAxfSlcbiAgICAgKi9cbiAgICBpc0FycmF5KClcbiAgICB7XG4gICAgICAgIGlmICghdXRpbHMuaXNBcnJheSh0aGlzLmZpcnN0KSkgcmV0dXJuO1xuICAgICAgICAvLyBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSB0aGVyIFxuICAgICAgICBpZiggIXV0aWxzLmlzRnVuY3Rpb24odGhpcy5zZWNvbmQpKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGZ1bmN0aW9uL2Nsb3N1cmUhXCIpO1xuICAgICAgICB9IFxuICAgICAgICB0aGlzLmluamVjdGlvbnMgPSB0aGlzLmZpcnN0O1xuICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuc2Vjb25kO1xuXG4gICAgICAgIC8vIFdlIG1pZ2h0IHBhc3MgbG9jYWxzIGFzIGEgdGhpcmQgYXJndW1lbnRcbiAgICAgICAgaWYoIHV0aWxzLmlzUGxhaW5PYmplY3QodGhpcy50aGlyZCkgKXtcbiAgICAgICAgICAgIHRoaXMubG9jYWxzID0gdGhpcy50aGlyZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHRpbmcgdGhlIG91dHB1dFxuICAgICAqL1xuICAgIGZvcm1hdCgpIDogUmVxdWlyZU9wdGlvbnNcbiAgICB7XG4gICAgICAgIGlmICggIXV0aWxzLmlzRnVuY3Rpb24odGhpcy50YXJnZXQpICl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSZXF1aXJlIG1ldGhvZCByZXF1aXJlcyBhIGNsb3N1cmUhXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiA8UmVxdWlyZU9wdGlvbnM+IHtcbiAgICAgICAgICAgIHRhcmdldCA6IHRoaXMudGFyZ2V0LFxuICAgICAgICAgICAgaW5qZWN0aW9ucyA6IHRoaXMuaW5qZWN0aW9ucyxcbiAgICAgICAgICAgIGxvY2FscyA6IHRoaXMubG9jYWxzXG4gICAgICAgIH0gXG4gICAgfVxufVxuXG5cblxuZXhwb3J0IHZhciBSZXF1aXJlQXJndW1lbnRQYXJzZXIgPSAoaW5wdXQ6IGFueSkgOiBSZXF1aXJlT3B0aW9ucyA9PiB7XG4gICAgbGV0IHBhcnNlciA9IG5ldyBfUmVxdWlyZUFyZ3VtZW50UGFyc2VyKGlucHV0KTtcbiAgICByZXR1cm4gcGFyc2VyLmZvcm1hdCgpO1xufSIsImltcG9ydCB1dGlscyBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgeyBDaGFpbiwgQ2hhaW5hYmxlIH0gZnJvbSAnLi4vY2hhaW4nO1xuaW1wb3J0IHsgRWFjaCB9IGZyb20gJy4uL2VhY2gnO1xuaW1wb3J0IFN0b3JhZ2UgZnJvbSAnLi9TdG9yYWdlJztcbmltcG9ydCBSZWFsbU1vZHVsZSBmcm9tICcuL1JlYWxtTW9kdWxlJztcbmltcG9ydCB7IFJlcXVpcmVBcmd1bWVudFBhcnNlciwgUmVxdWlyZU9wdGlvbnMgfSBmcm9tICcuL1JlcXVpcmVBcmd1bWVudFBhcnNlcic7XG5cbmxldCBfbW9kID0gKG5hbWU6IHN0cmluZywgYjogYW55LCBjOiBhbnkpID0+IHtcbiAgICBTdG9yYWdlLnNldChuYW1lLCBuZXcgUmVhbG1Nb2R1bGUobmFtZSwgYiwgYykpO1xufVxuXG5cbmxldCBfcmVxID0gKGEsIGI/LCBjPykgPT4ge1xuICAgIGxldCBvcHRzOiBSZXF1aXJlT3B0aW9ucyA9IFJlcXVpcmVBcmd1bWVudFBhcnNlcihbYSwgYiwgY10pO1xuICAgIHJldHVybiBFYWNoKG9wdHMuaW5qZWN0aW9ucywgKGluamVjdGlvbjogc3RyaW5nKSA9PiB7XG4gICAgICAgIC8vIGdldHRpbmcgcmVnaXN0ZXJlZCBtb2R1bGVcbiAgICAgICAgbGV0IG1vZDogUmVhbG1Nb2R1bGUgPSBTdG9yYWdlLmdldChpbmplY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgLy8gdHJ5aW5nIHRvIGZldGNoIHN0dWZmIGZyb20gY2FjaGVcbiAgICAgICAgaWYgKCBtb2QuaXNDYWNoZWQoKSApe1xuICAgICAgICAgICAgcmV0dXJuIG1vZC5nZXRDYWNoZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfcmVxKG1vZC5nZXREZXBlbmRlbmNpZXMoKSwgbW9kLmdldENsb3N1cmUoKSwgb3B0cy5sb2NhbHMpXG4gICAgICAgICAgICAudGhlbigocmVzcG9uc2U6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIG1vZC5zZXRDYWNoZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICAgICAgfSk7XG4gICAgfSkudGhlbigodG9BcHBseTogQXJyYXk8YW55PikgPT4ge1xuICAgICAgICAvLyBDYWxsaW5nIHRoZSB0YXJnZXRcbiAgICAgICAgcmV0dXJuIG9wdHMudGFyZ2V0KC4uLnRvQXBwbHkpO1xuICAgIH0pO1xuXG59XG5leHBvcnQgbGV0IG1vZCA9IF9tb2Q7XG5leHBvcnQgbGV0IHJlcSA9IF9yZXE7XG4iLCJpbXBvcnQge0VhY2h9IGZyb20gJy4vcmVhbG0vZWFjaCc7XG5pbXBvcnQge0NoYWluLCBDaGFpbmFibGV9IGZyb20gJy4vcmVhbG0vY2hhaW4nO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4vcmVhbG0vdXRpbHMnO1xuaW1wb3J0IHtyZXEsIG1vZH0gZnJvbSAnLi9yZWFsbS9jb3JlL0NvcmUnO1xuaW1wb3J0IHtSZXF1aXJlQXJndW1lbnRQYXJzZXIsIFJlcXVpcmVPcHRpb25zfSBmcm9tICcuL3JlYWxtL2NvcmUvUmVxdWlyZUFyZ3VtZW50UGFyc2VyJztcblxuZXhwb3J0IGNvbnN0IHJlYWxtID0ge1xuICAgUmVxdWlyZUFyZ3VtZW50UGFyc2VyIDogUmVxdWlyZUFyZ3VtZW50UGFyc2VyLFxuICAgZWFjaCA6IEVhY2gsXG4gICBjaGFpbiA6IENoYWluLFxuICAgQ2hhaW5hYmxlIDogQ2hhaW5hYmxlLFxuICAgdXRpbHMgOiB1dGlscyxcbiAgIG1vZHVsZSA6IG1vZCxcbiAgIHJlcXVpcmUgOiByZXFcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
