"use realm";

import SomeStuff from test.route;

class Permission {
   static inject($req, $attrs, SomeStuff) {
      return {
         "permission yee": "hello world",
         something: SomeStuff,
         attrs: $attrs
      }
   }
}

export Permission;
