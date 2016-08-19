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
    static flatten() {
        return [].concat.apply([], arguments);
    }
    static setHiddenProperty(obj, key, value) {
        Object.defineProperty(obj, key, {
            enumerable: false,
            value: value
        });
        return value;
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

/* ******* realm.ts ******* */
__ts__.module("realm.js", function(exports, require){
"use strict";
const each_1 = require('./realm/each');
const chain_1 = require('./realm/chain');
const utils_1 = require('./realm/utils');
exports.realm = {
    each: each_1.Each,
    chain: chain_1.Chain,
    Chainable: chain_1.Chainable,
    utils: utils_1.default
};

});

__ts__.expose(__scope__, "realm");})(function($scope, $isBackend) { var ts = {register: {},pathJoin: function() { var parts = []; for (var i = 0, l = arguments.length; i < l; i++) {parts = parts.concat(arguments[i].split("/")); } var newParts = []; for (i = 0, l = parts.length; i < l; i++) {var part = parts[i];if (!part || part === ".") { continue}if (part === "..") { newParts.pop();} else { newParts.push(part);} } if (parts[0] === "") {newParts.unshift("") } return newParts.join("/") || (newParts.length ? "/" : ".");},module: function(name, fn) { var _exports = {}; var relative = "./"; var rel = name.match(/^(.*)\/[\w]+\.js$/); if (rel) {relative = rel[1]; } fn(_exports, this.require.bind({self: this,path: name,relative: relative })); this.register[name] = _exports;},require: function(name) { var self = this.self; var path = this.path; var relative = this.relative; if (name[0] === ".") {var target = ts.pathJoin(relative, name) + ".js";if (self.register[target]) { return self.register[target];} } else {return require(name); }},expose: function(scope, path) { path = path.match(/\.js^/) ? path : path + ".js"; var e = this.register[path]; if (e !== undefined) {var useAmd = !$isBackend && typeof define == 'function' && define.amd;for (var key in e) { var value = e[key]; if (useAmd) {define(key, [], function() { return value;}); } else {$scope[key] = value }} } else {throw new Error('Module "' + path + '" Cannot be exposed! Make sure you export variables correctly and the module is present'); }} }; return {isBackend: $isBackend,scope: $scope,ts : ts }}(typeof exports !== "undefined" ? exports : this, typeof exports !== "undefined"));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlYWxtL3V0aWxzLnRzIiwicmVhbG0vZWFjaC50cyIsInJlYWxtL2NoYWluLnRzIiwicmVhbG0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7QUFDckMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUNyQyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQ3hDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7QUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25ELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7QUFDNUMsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUM7QUFDcEMsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsNEJBQTRCLENBQUM7QUFHNUM7SUFHSSxPQUFPLFNBQVMsQ0FBQyxJQUFVO1FBQ3pCLE1BQU0sQ0FBQyxJQUFJLEtBQUssU0FBUztlQUNsQixPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVTtZQUNoQyxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxDQUFDO0lBQ3pDLENBQUM7SUFHRCxPQUFPLFFBQVEsQ0FBQyxLQUFXO1FBRXZCLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUM7SUFDakQsQ0FBQztJQUVELE9BQU8sVUFBVSxDQUFDLEtBQVc7UUFFMUIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNqRSxNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sSUFBSSxHQUFHLElBQUksTUFBTSxD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QyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQ2hDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFBOzs7Ozs7O0FDM0hELHVCQUFtQixjQUFjLENBQUMsQ0FBQTtBQUNsQyx3QkFBK0IsZUFBZSxDQUFDLENBQUE7QUFDL0Msd0JBQWtCLGVBQWUsQ0FBQyxDQUFBO0FBRXJCLGFBQUssR0FBRztJQUNsQixJQUFJLEVBQUcsV0FBSTtJQUNYLEtBQUssRUFBRyxhQUFLO0lBQ2IsU0FBUyxFQUFHLGlCQUFTO0lBQ3JCLEtBQUssRUFBRyxlQUFLO0NBQ2YsQ0FBQSIsImZpbGUiOiJyZWFsbS5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbmNvbnN0IG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcbmNvbnN0IGZ1bmNUb1N0cmluZyA9IGZ1bmNQcm90by50b1N0cmluZztcbmNvbnN0IGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHk7XG5jb25zdCBvYmplY3RDdG9yU3RyaW5nID0gZnVuY1RvU3RyaW5nLmNhbGwoT2JqZWN0KTtcbmNvbnN0IG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5jb25zdCBvYmplY3RUYWcgPSAnW29iamVjdCBPYmplY3RdJztcbmNvbnN0IGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xuY29uc3QgZ2VuVGFnID0gJ1tvYmplY3QgR2VuZXJhdG9yRnVuY3Rpb25dJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBVdGlscyB7XG5cbiAgICAvLyBpc1Byb21pc2UoKVxuICAgIHN0YXRpYyBpc1Byb21pc2UoaXRlbSA6IGFueSkge1xuICAgICAgcmV0dXJuIGl0ZW0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICYmIHR5cGVvZiBpdGVtLnRoZW4gPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgIHR5cGVvZiBpdGVtLmNhdGNoID09PSAnZnVuY3Rpb24nO1xuICAgIH1cblxuICAgIC8vIGlzTm90U2V0ICh1bmRlZmluZWQgYW5kIG51bGwgd2lsbCByZXR1cm4gdHJ1ZSlcbiAgICBzdGF0aWMgaXNOb3RTZXQoaW5wdXQgOiBhbnkpXG4gICAge1xuICAgICAgICByZXR1cm4gaW5wdXQgPT09IHVuZGVmaW5lZCB8fCBpbnB1dCA9PT0gbnVsbDtcbiAgICB9XG5cbiAgICBzdGF0aWMgaXNGdW5jdGlvbih2YWx1ZSA6IGFueSlcbiAgICB7XG4gICAgICAgdmFyIHRhZyA9IHRoaXMuaXNPYmplY3QodmFsdWUpID8gb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgOiAnJztcbiAgICAgICByZXR1cm4gdGFnID09IGZ1bmNUYWcgfHwgdGFnID09IGdlblRhZztcbiAgICB9XG5cbiAgICAvL2lzT2JqZWN0XG4gICAgc3RhdGljICBpc09iamVjdChpbnB1dCA6IGFueSlcbiAgICB7XG4gICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgaW5wdXQ7XG4gICAgICAgcmV0dXJuICEhaW5wdXQgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICAvL2lzSG9zdE9iamVjdFxuICAgIHN0YXRpYyAgaXNIb3N0T2JqZWN0KHZhbHVlKSB7XG4gICAgICAvLyBNYW55IGhvc3Qgb2JqZWN0cyBhcmUgYE9iamVjdGAgb2JqZWN0cyB0aGF0IGNhbiBjb2VyY2UgdG8gc3RyaW5nc1xuICAgICAgLy8gZGVzcGl0ZSBoYXZpbmcgaW1wcm9wZXJseSBkZWZpbmVkIGB0b1N0cmluZ2AgbWV0aG9kcy5cbiAgICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICAgIGlmICh2YWx1ZSAhPSBudWxsICYmIHR5cGVvZiB2YWx1ZS50b1N0cmluZyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzdWx0ID0gISEodmFsdWUgKyAnJyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8vb3ZlckFyZ1xuICAgIHN0YXRpYyAgb3ZlckFyZyhmdW5jLCB0cmFuc2Zvcm0pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihhcmcpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmModHJhbnNmb3JtKGFyZykpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBpc09iamVjdExpa2VcbiAgICBzdGF0aWMgIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICAgICAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xuICAgIH1cblxuICAgIC8vIEZsYXR0ZW4gYXJndW1ldG5zXG4gICAgLy8gZmxhdHRlbignYScsICdiJywgWydjJ10pIC0+IFsnYScsICdiJywgJ2MnXVxuICAgIHN0YXRpYyBmbGF0dGVuKClcbiAgICB7XG4gICAgICByZXR1cm4gW10uY29uY2F0LmFwcGx5KFtdLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBcbiAgICAvLyBzZXRzIGhpZGRlbiBwcm9wZXJ0eVxuICAgIHN0YXRpYyBzZXRIaWRkZW5Qcm9wZXJ0eShvYmo6IE9iamVjdCwga2V5IDogc3RyaW5nLCB2YWx1ZSA6IE9iamVjdCkgOiBhbnlcbiAgICB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBpc0FycmF5XG4gICAgc3RhdGljIGlzQXJyYXkoaW5wdXQgOiBhbnkpXG4gICAge1xuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaW5wdXQpO1xuICAgIH1cblxuICAgIC8vIGlzUGxhaW5PYmplY3RcbiAgICBzdGF0aWMgIGlzUGxhaW5PYmplY3QodmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5pc09iamVjdExpa2UodmFsdWUpIHx8XG4gICAgICAgICAgb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT0gb2JqZWN0VGFnIHx8IHRoaXMuaXNIb3N0T2JqZWN0KHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgcHJvdG8gPSB0aGlzLm92ZXJBcmcoT2JqZWN0LmdldFByb3RvdHlwZU9mLCBPYmplY3QpKHZhbHVlKTtcbiAgICAgIGlmIChwcm90byA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBDdG9yID0gaGFzT3duUHJvcGVydHkuY2FsbChwcm90bywgJ2NvbnN0cnVjdG9yJykgJiYgcHJvdG8uY29uc3RydWN0b3I7XG4gICAgICByZXR1cm4gKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgQ3RvciBpbnN0YW5jZW9mIEN0b3IgJiYgZnVuY1RvU3RyaW5nLmNhbGwoQ3RvcikgPT0gb2JqZWN0Q3RvclN0cmluZyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuXG5cbi8qKlxuICogRWFjaCBmdW5jdGlvblxuICogSXRlcmF0ZXMgYW55IG9iamVjdHMgaW5jbHVkaW5nIFByb21pc2VzXG4gKi9cbmV4cG9ydCB2YXIgRWFjaCA9IChhcmd2OiBhbnksIGNiOiB7ICguLi5hcmdzKTogYW55IH0pID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZXN1bHRzID0gW107XG4gICAgICAgIGNvbnN0IGlzT2JqZWN0ID0gdXRpbHMuaXNPYmplY3QoYXJndik7XG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gLTE7XG4gICAgICAgIGxldCBpdGVyYXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIGlmIChpbmRleCA8IGFyZ3YubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGtleSA9IGlzT2JqZWN0ID8gT2JqZWN0LmtleXMoYXJndilbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gaXNPYmplY3QgPyBhcmd2W2tleV0gOiBhcmd2W2luZGV4XTtcbiAgICAgICAgICAgICAgICAvLyBQcm9taXNlcyBuZWVkIHRvIGJlIHJlc29sdmVkXG4gICAgICAgICAgICAgICAgaWYgKHV0aWxzLmlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUudGhlbigoZGF0YSkgPT4geyByZXN1bHRzLnB1c2goZGF0YSk7IGl0ZXJhdGUoKTsgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcmVzID0gY2IoLi4uW3ZhbHVlLCBrZXldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHV0aWxzLmlzUHJvbWlzZShyZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMudGhlbihhID0+IHsgcmVzdWx0cy5wdXNoKGEpOyAgaXRlcmF0ZSgpOyB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgcmV0dXJuIHJlc29sdmUocmVzdWx0cyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRlKCk7XG4gICAgfSk7XG59XG4iLCJpbXBvcnQgdXRpbHMgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBFYWNoIH0gZnJvbSAnLi9lYWNoJztcblxuZXhwb3J0IGNsYXNzIENoYWluYWJsZSB7XG4gICAgcHJvdGVjdGVkICRmaW5hbGl6ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwcm90ZWN0ZWQgJGtpbGxlZDogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHByb3RlY3RlZCAkbWFudWFsOiBhbnk7XG4gICAgcHJvdGVjdGVkICRjb2xsZWN0aW9uOiBPYmplY3QgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIHByb3RlY3RlZCAtIGJyZWFrXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHthbnl9IG1hbnVhbCA6IEFueSBvYmplY3RcbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBicmVhayhtYW51YWw6IGFueSk6IHZvaWQge1xuICAgICAgICB0aGlzLiRmaW5hbGl6ZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLiRtYW51YWwgPSBtYW51YWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcHJvdGVjdGVkIC0ga2lsbFxuICAgICAqIEtpbGxzIHRoZSBjaGFpblxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGtpbGwoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuJGZpbmFsaXplZCA9IHRydWU7XG4gICAgICAgIHRoaXMuJGtpbGxlZCA9IHRydWU7XG4gICAgfVxufVxuXG5cbi8qKlxuICogVmFsaWRhdGVzIGFuZCBjcmVhdGVzIGV4dHJhIHByb3BlcnRpZXMgZm9yIHRoZSBjbGFzc1xuICogU3VwcG9ydHMgbm9uLXR5cGVzY3JpcHQgdXNhZ2VcbiAqIEZvciB0eXBlc2NyaXB0IENoYWluYWJsZSBjbGFzcyBpZiByZXF1aXJlZFxuICovXG5sZXQgQ2hhaW5DbGFzc0NvbnRydWN0b3IgPSAoaW5wdXQ6IGFueSkgPT4ge1xuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIENoYWluYWJsZSkge1xuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuXG4gICAgbGV0IGluc3RhbmNlOiBPYmplY3QgPSB7fTtcbiAgICAvLyBpZiB0aGF0J3MgZnVuY3Rpb24nXG4gICAgaWYgKHV0aWxzLmlzRnVuY3Rpb24oaW5wdXQpKSB7XG4gICAgICAgIGluc3RhbmNlID0gbmV3IGlucHV0KCk7XG4gICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdChpbnB1dCkpIHtcbiAgICAgICAgaW5zdGFuY2UgPSBpbnB1dDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDaGFpbiByZXF1aXJlcyBhIENsYXNzIG9yIGFuIEluc3RhbmNlXCIpXG4gICAgfVxuICAgIGluc3RhbmNlWyckY29sbGVjdGlvbiddID0ge307XG4gICAgaW5zdGFuY2VbJ2JyZWFrJ10gPSBtYW51YWwgPT4ge1xuICAgICAgICB1dGlscy5zZXRIaWRkZW5Qcm9wZXJ0eShpbnN0YW5jZSwgJyRmaW5hbGl6ZWQnLCB0cnVlKTtcbiAgICAgICAgdXRpbHMuc2V0SGlkZGVuUHJvcGVydHkoaW5zdGFuY2UsICckbWFudWFsJywgbWFudWFsKTtcbiAgICB9XG4gICAgaW5zdGFuY2VbJ2tpbGwnXSA9ICgpID0+IHtcbiAgICAgICAgdXRpbHMuc2V0SGlkZGVuUHJvcGVydHkoaW5zdGFuY2UsICckZmluYWxpemVkJywgdHJ1ZSk7XG4gICAgICAgIHV0aWxzLnNldEhpZGRlblByb3BlcnR5KGluc3RhbmNlLCAnJGtpbGxlZCcsIHRydWUpO1xuICAgIH1cbiAgICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbi8qKlxuICogQ2hhaW4gY2xhc3NcbiAqIEV4ZWN1dGVzIG1ldGhvZHMgaW4gb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IENoYWluID0gKGNsczogYW55KSA9PiB7XG4gICAgbGV0IGluc3RhbmNlID0gQ2hhaW5DbGFzc0NvbnRydWN0b3IoY2xzKTtcbiAgICBsZXQgcHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICAgIGxldCB0YXNrcyA9IFtdO1xuXG4gICAgLy8gY29sbGVjdGluZyBwcm9wcyBhbmQgY2hlY2tpbmcgZm9yIHNldHRlcnNcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBwcm9wZXJ0eU5hbWUgPSBwcm9wc1tpXTtcbiAgICAgICAgaWYgKCEocHJvcGVydHlOYW1lIGluIFtcImZvcm1hdFwiLCAna2lsbCcsICdicmVhayddKSkge1xuICAgICAgICAgICAgbGV0IGlzU2V0dGVyID0gcHJvcGVydHlOYW1lLm1hdGNoKC9ec2V0KC4qKSQvKTtcbiAgICAgICAgICAgIGxldCBzZXR0ZXJOYW1lID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChpc1NldHRlcikge1xuICAgICAgICAgICAgICAgIHNldHRlck5hbWUgPSBpc1NldHRlclsxXVxuICAgICAgICAgICAgICAgIHNldHRlck5hbWUgPSBzZXR0ZXJOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc2V0dGVyTmFtZS5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAgICAgICAgIHByb3A6IHByb3BlcnR5TmFtZSxcbiAgICAgICAgICAgICAgICBzZXR0ZXI6IHNldHRlck5hbWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFN0b3JlIGl0IHRvIHRoZSBwcm9wZXJ0eSBvZiB0aGUgY2xhc3MnXG4gICAgbGV0IHN0b3JlID0gZnVuY3Rpb24gKHByb3AsIHZhbCk6IHZvaWQge1xuICAgICAgICBpbnN0YW5jZS4kY29sbGVjdGlvbltwcm9wXSA9IHZhbDtcbiAgICAgICAgaW5zdGFuY2VbcHJvcF0gPSB2YWw7XG4gICAgfVxuXG4gICAgLy8gRXZhbHVhdGVcbiAgICBsZXQgZXZhbHVhdGUgPSBmdW5jdGlvbiAodGFzayk6IGFueSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBpbnN0YW5jZVt0YXNrLnByb3BdLmFwcGx5KGluc3RhbmNlKTtcbiAgICAgICAgaWYgKHRhc2suc2V0dGVyKSB7XG4gICAgICAgICAgICBpZiAodXRpbHMuaXNQcm9taXNlKHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRoZW4ocmVzID0+IHsgc3RvcmUodGFzay5zZXR0ZXIsIHJlcykgfSk7XG4gICAgICAgICAgICB9IGVsc2Ugc3RvcmUodGFzay5zZXR0ZXIsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBDYWxsaW5nIHRhc2tzIGluIG9yZGVyIHRoZXkgaGF2ZSBiZWVuIGNyZWF0ZWRcbiAgICByZXR1cm4gRWFjaCh0YXNrcywgKHRhc2s6IGFueSkgPT4ge1xuICAgICAgICByZXR1cm4gIWluc3RhbmNlLiRmaW5hbGl6ZWQgPyBldmFsdWF0ZSh0YXNrKSA6IGZhbHNlO1xuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBpZiAodXRpbHMuaXNGdW5jdGlvbihpbnN0YW5jZVtcImZvcm1hdFwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBldmFsdWF0ZSh7XG4gICAgICAgICAgICAgICAgcHJvcDogXCJmb3JtYXRcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KS50aGVuKHNwZWNpYWxGb3JtYXQgPT4ge1xuICAgICAgICBpZiAoaW5zdGFuY2UuJGtpbGxlZCkgcmV0dXJuO1xuICAgICAgICBpZiAoIWluc3RhbmNlLiRtYW51YWwpIHtcbiAgICAgICAgICAgIGlmIChzcGVjaWFsRm9ybWF0KSByZXR1cm4gc3BlY2lhbEZvcm1hdDtcbiAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZS4kY29sbGVjdGlvbjtcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICByZXR1cm4gaW5zdGFuY2UuJG1hbnVhbDtcbiAgICB9KTtcbn1cbiIsImltcG9ydCB7RWFjaH0gZnJvbSAnLi9yZWFsbS9lYWNoJztcbmltcG9ydCB7Q2hhaW4sIENoYWluYWJsZX0gZnJvbSAnLi9yZWFsbS9jaGFpbic7XG5pbXBvcnQgdXRpbHMgZnJvbSAnLi9yZWFsbS91dGlscyc7XG5cbmV4cG9ydCBjb25zdCByZWFsbSA9IHtcbiAgIGVhY2ggOiBFYWNoLFxuICAgY2hhaW4gOiBDaGFpbixcbiAgIENoYWluYWJsZSA6IENoYWluYWJsZSxcbiAgIHV0aWxzIDogdXRpbHNcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
