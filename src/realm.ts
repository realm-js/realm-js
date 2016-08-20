import {Each} from './realm/each';
import {Chain, Chainable} from './realm/chain';
import utils from './realm/utils';
import {req, mod} from './realm/core/Core';
import {RequireArgumentParser, RequireOptions} from './realm/core/RequireArgumentParser';

export const realm = {
   RequireArgumentParser : RequireArgumentParser,
   each : Each,
   chain : Chain,
   Chainable : Chainable,
   utils : utils,
   module : mod,
   require : req
}
