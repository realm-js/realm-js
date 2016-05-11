"use realm";

import Decorator from realm.router;

export Decorator($attrs => {
   return {
      $access: $attrs
   }
});
