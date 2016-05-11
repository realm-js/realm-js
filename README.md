# realm-js
RealmJs is a new dependency injection/module handling tool for Node.js and javascript projects. The library is universal (isomorphic). You can easily share modules between frontend and backend accordingly.

## Introduction
Real.js comes with an absolutely superb transpiler, which resembles es6 imports. It essentially has the same syntax with few improvements

```js
"use realm";

import myModule from myapp;
import lodash as _ from myapp.utils;

class MySuperClass {

}
export MySuperClass;
```

Realm transpiler goes through files and converts, say MySuperClass.js file into
```js
realm.module("test.MySuperClass", ["myapp.myModule", "myapp.utils.lodash"], function (myModule, _) {
   class MySuperClass {

   }
  return MySuperClass;
});
```

Add babel7 and your are unstoppable!


### Install
```
npm install realm-js --save
```

Check a simple [project](test-app-backend) and see what it compiles into [test-backend.js](test-backend.js) (with a little help from babel es7)

If you want to serve realm.js you can just use express middleware

```js
app.use('/ream.js', realm.serve.express());
```
To get contents (for build)
```js
realm.serve.getContents()
```

## Under the hood

### Creating modules/services
Everything revolves around es6 promises:
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

## Porting your favorite libraries
Universal wrapper has a parameter called $isBackend.
So, if you want to import lodash (my favorite) or any other libaries. you can register them like so:

```js
domain.module("shared._", function() {
   return $isBackend ? require("lodash") : window._;
});
domain.module("shared.realm", function() {
   return $isBackend ? require("realm-js") : window.realm;
});

```

## Using the realm transpiler

The current transpiler is a very simple regExp like script. (I am not sure if i can call transpiler though).
I have been using this library for years, and decided to release just now. I've tried to create a babel plugin, but this thing is just ginormous and i simply don't have time for that. If you feel like, go ahead!

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


### Gulp
```js
realm.transpiler({
      preffix: "test",
      base : "test-app-backend",
      target : "./test-backend.js"
})
```

Wrapping into a universal function
```js
realm.transpiler({wrap : true})
```

## Bulding

You can use babel to transpile your code into anything you like. (RealmJs transpiler should come first)

Here is a sample build task;

```js
gulp.task("build-backend", function() {
   return gulp.src("test-app-backend/**/*.js").pipe(realm.transpiler({
         preffix: "test",
         base : "test-app-backend",
         target : "./test-backend.js"
      }))
      .pipe(babel({
         presets: ["es2016"],
         plugins: ["transform-decorators-legacy"]
      }))
      .pipe(realm.transpiler({wrap : true}))
      .pipe(gulp.dest("./"));
});
```

## Contribute
Please, contribute. The code isn't in its best shape but rocks!
