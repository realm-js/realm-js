import RealmModule from './RealmModule';

import {Sukka} from 'b';

// Define environment it's either global node modules or window
const environment = $isBackend ? global : window;

// Creating or getting the environment
environment.__realm__ = environment.__realm__ || {};

/**
 * Storage
 * Sets and retrevies modules from cache
 */
export default class Storage {
    static set(name: string, obj: RealmModule): void {
        environment.__realm__[name] = obj;
    }
    static get(name: string) : RealmModule {
        return environment.__realm__[name];
    }
    static flush(): void
    {
        environment.__realm__ = {};
    }
}