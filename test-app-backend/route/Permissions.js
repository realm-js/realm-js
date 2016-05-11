"use realm";

import inject from realm.router;
import SomeStuff from test.route;

@inject(SomeStuff)

class Permission {
   static inject($req, $attrs, SomeStuff)
   {
      return {"permission yee": "hello world", something : SomeStuff, attrs :$attrs}
   }
}

export Permission;
