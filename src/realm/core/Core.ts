import utils from '../utils';
import { Chain, Chainable } from '../chain';
import { Each } from '../each';
import Storage from './Storage';
import RealmModule from './RealmModule';
import { RequireArgumentParser, RequireOptions, Dependency } from './RequireArgumentParser';


let _module = (name: string, b: any, c: any) => {
    let localModule = new RealmModule(name, b, c);
    Storage.set(localModule.getName(), localModule);
}

let _ts_module = (name: string, b: any, c: any) => {
    
    let localModule =  new RealmModule(name, b, c, true);
    Storage.set(localModule.getName(),localModule);
}

let _resolve = (opts: RequireOptions, injection: Dependency) => {
    
    // Trying to get module
    let mod: RealmModule = Storage.get(injection.name);
    
    // Deal with locals
    // We don't want allow passing any promises into local variables
    // Otherwise it will be spoiled with suspicious "unknown" stuff
    if (injection.alias in opts.locals) {
        return opts.locals[injection.alias];
    }

    if (mod === undefined) {
        throw new Error("Module " + injection + " is not registered!\n >> " + opts.target);
    }
    // trying to fetch from cache
    if (mod.isCached()) {
        return mod.getCache();
    }
    
    // Recursively require dependencies 
    return _require(mod.getDependencies(), mod.getClosure(), opts.locals, mod)
        .then(x => mod.setCache(x));
}

let _apply = (opts: RequireOptions, results : Array<any>, mod? : RealmModule) => 
{
    // handle typescript modules differently
    // basically we applying only 2 variables - {exports, require}
    if( mod !== undefined && mod.isTypeScript() ){
        let [_exports, _env] = [{}, {}];
        for( let index = 0; index < opts.dependencies.length; index++){
            _env[opts.dependencies[index].alias] = results[index];
        }
        opts.target(...[_exports, x => _env[x] ])
        return _exports;
    };
    return opts.target(...results) 
}

let _require = (a, b?, c?, mod? : RealmModule): any => {
    
    let opts: RequireOptions = RequireArgumentParser([a, b, c]);
    return Each(opts.dependencies, injection => _resolve(opts, injection))
        .then((toApply: Array<any>) => {
            return _apply(opts, toApply, mod );
        });
}



export let mod = _module;
export let ts_mod = _ts_module;
export let req = _require;
