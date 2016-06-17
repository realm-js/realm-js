# realm-js
RealmJs is a brand new universal transpiler with built-in dependency injection.

# Features
   * 100% Universal
   * Improved import system - Packages, aliases
   * Promise based
   * EC7 friendly - decorators
   * Automatic environment separation (backend, frontend, universal)
   * Backend encapsulation / Bridges
   * Extremely fast compilation (50-70ms) to transpile a big project

## Usage

```js
"use realm";

import FeedParser, GoogleFeed from app.blogs;

class Application {
   static main() {
      GoogleFeed.getFeed("Official Google Blogs").then(function(entries) {
         var entries = FeedParser.getEntries(entries);
         console.log(entries);
      });
   }
}
export Application;
```

## Try it now!

```js
git clone git@github.com:realm-js/realm-riot-example.git
cd realm-riot-example
gulp start
```
ToDo service is isolated. Frontend can access the interface, however code per se is hidden from the end users.

</body>
## Header types

Univeral mode. File will be put into universal.js
```js
"use realm";
```

Frontend mode. File will be put into frontend.js
```js
"use realm frontend";
```

Frontend mode without wrapping. File will be put into frontend.js
```js
"use realm frontend-raw";
```


Backend mode. File will be put into backend.js
```js
"use realm backend";
```

Backend mode without wrapping. File will be put into backend.js
```js
"use realm backend-raw";
```

Bridge mode, the source will be put into backend.js, interface into frontend.js
```js
"use realm bridge";
```

## Using Bridges
Sometimes you need to have your code encapsulated. Say, secured calls involving authentication;
In this case, bridge is the most suitable case.

Before proceeding, you need to install realm-router (it will actually proxy frontend requests)
Set up you express application like so:

```js
var router = require("realm-router");
realm.require('realm.router.Express', function(router) {
   app.use(router(["realm.router.bridge"]))
})
```

Include realm-router frontend build file into your html file. And start bridging!

```js
"use realm bridge";
class Auth {
   static login()
   {

   }
}
export Auth
```
Remember that only static methods are exposed.



## Transpiler
Universal transpiler will output 3 files: backend, frontend, universal
```js
gulp.task('build-universal', function() {
   return realm.transpiler2.universal(__dirname + "/test-universal/", "test_build/").then(function(changes) {
      console.log(changes)
   })
});
```


### Install
```
npm install realm-js --save
```

## Under the hood

You can use realm-js without transpiler
### Creating modules/services
```js
realm.module("MyFirstModule", function() {
   return new Promise(function(resolve, reject){
      return resolve({hello : "world"})
   });
});
realm.module("MySecondModule", function(MyFirstModule) {
   console.log(MyFirstModule);
});
```

### Require a module
Code:
```js
realm.require(function(MySecondModule){
   console.log(MySecondModule)
});
```

Will resolve all required dependencies. The ouput:
```js
{hello: "world"}
```

### Require a package
You can require a package if you like.

```js
realm.requirePackage("app.components").then(function(components){

});
```

### Annotation
Clearly, if you don't use ec6, or any other transpilers, you need to annotate modules
```js
realm.module("myModule", ["moduleA", "moduleB"], function(moduleA, moduleB){

})
```


### A simple import
If a module does not belong to any package:
```js
import Module
```

If a module belongs to a package:
```js
import Module from app
```

Giving it alias
```js
import Module as mod from app
```

Explicit module name (not recommended)
```js
```
## Contribute
Please, contribute. The code isn't in its best shape but rocks!
