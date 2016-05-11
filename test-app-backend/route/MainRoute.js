"use realm";

import path, assert, cors from realm.router;

import Permissions from test.route;
import access from test.decorators;

@cors()
@path("/")

class MainRoute {

   @access("view:2")
   static get($query, $access) {
      return {
         hello: $access
      };
   }

   static post() {

   }
};

export MainRoute;
