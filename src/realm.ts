import {Each} from './realm/each';
import {Chain, Chainable} from './realm/chain';
import utils from './realm/utils';
import RealmModule from './realm/core/RealmModule';
import Storage from './realm/core/Storage';
import {req, mod, ts_mod} from './realm/core/Core';
import {RequireArgumentParser, RequireOptions} from './realm/core/RequireArgumentParser';

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
