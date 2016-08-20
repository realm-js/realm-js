import utils from '../utils';

export default class RealmModule {
    private name: string;
    private dependencies: string[];
    private closure: { (...args): any };
    private cached : any;

    constructor(a: any, b: any, c: any) {
        if (!utils.isString(a)) {
            throw new Error("Module first argument must be string!")
        }
        this.name = a;

        if (utils.isFunction(b)) {
            this.closure = b;
        }
        if (utils.isArray(b)) {
            this.dependencies = b;
            if (!utils.isFunction(c)) {
                throw new Error("Module must have a closure!")
            }
            this.closure = c;
        }
    }
    public isCached()
    {
        return this.cached !== undefined;
    }

    public getCache()
    {
        return this.cached;
    }
    
    public setCache(obj : any)
    {
        this.cached = obj;
    }
    public getName() {
        return this.name;
    }
    public getDependencies() {
        return this.dependencies;
    }
    public getClosure() {
        return this.closure;
    }

    public toRequire(locals : Object) : Array<any>
    {
        return [this.dependencies, this.closure, locals];
    }
}