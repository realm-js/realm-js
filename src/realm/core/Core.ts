import utils from '../utils';
import { Chain, Chainable } from '../chain';
import { Each } from '../each';
import Storage from './Storage';
import RealmModule from './RealmModule';
import { RequireArgumentParser, RequireOptions } from './RequireArgumentParser';

let _mod = (name: string, b: any, c: any) => {
    Storage.set(name, new RealmModule(name, b, c));
}


let _req = (a, b?, c?) => {
    let opts: RequireOptions = RequireArgumentParser([a, b, c]);
    return Each(opts.injections, (injection: string) => {
        // getting registered module
        let mod: RealmModule = Storage.get(injection);
        
        // trying to fetch stuff from cache
        if ( mod.isCached() ){
            return mod.getCache();
        }
        return _req(mod.getDependencies(), mod.getClosure(), opts.locals)
            .then((response: any) => {
                mod.setCache(response);
                return response;
            });
    }).then((toApply: Array<any>) => {
        // Calling the target
        return opts.target(...toApply);
    });

}
export let mod = _mod;
export let req = _req;
