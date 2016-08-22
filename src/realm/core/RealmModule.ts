import utils from '../utils';

export default class RealmModule {
    private dependencies: string[];
    private closure: { (...args): any };
    private cached : any;
    private name : string;
    private alias : string;

    /**
     * @param  {any} a
     * @param  {any} b
     * @param  {any} c
     */
    constructor(
        
        name: string, 
        b: any, 
        c: any, 
        private ts_module = false) {
        this.name = name;
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

        if ( name.indexOf('@') > -1 ){
            let s =  name.split('@');
            [this.name, this.alias] = name.split('@');
        }
    }
    
    public isTypeScript()
    {
        return this.ts_module;
    }
    
    /**
     * Tells if a module was cached
     * @returns boolean
     */
    public isCached() : boolean
    {
        return this.cached !== undefined;
    }
    /**
     * Gives cached object
     * @returns any
     */
    public getCache() : any
    {
        return this.cached;
    }
    
    /**
     * Sets cached
     * @param  {any} obj
     */
    public setCache(obj : any) : any
    {
        this.cached = obj;
        return obj;
    }

    /** 
     * Gives string name of a module
     * @returns string
     */
    public getName() : string {
        return this.name;
    }

    /**
     * Returns an array (strings) of dependencies
     * @returns string
     */
    public getDependencies() : string[] {
        return this.dependencies;
    }

    
    
    
    /**
     * Returns a closure
     * @returns any
     */
    public getClosure() : { (...args): any } {
        return this.closure;
    }

    public toRequire(locals : Object) : Array<any>
    {
        return [this.dependencies, this.closure, locals];
    }
}