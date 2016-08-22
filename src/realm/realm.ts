import {Each} from './each';
import {Chain, Chainable} from './chain';
import utils from './utils';
import RealmModule from './core/RealmModule';
import Storage from './core/Storage';
import {req, mod, ts_mod} from './core/Core';
import {RequireArgumentParser, RequireOptions} from './core/RequireArgumentParser';

export const realm = {
   module : mod,
   ts_module : ts_mod,
   require : req,
   RequireArgumentParser : RequireArgumentParser,
   each : Each,
   chain : Chain,
   Chainable : Chainable,
   utils : utils,
   flush : Storage.flush
}
