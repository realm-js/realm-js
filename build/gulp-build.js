(function(___scope___) { "use strict"; var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;

realm.module("mypackage.HelloWorld",[],function(){ var $_exports;/* @#realm-source:/test-gulp/mypackage/HelloWorld.js#*/

class HelloWorld {

}

$_exports = HelloWorld;

hello("aaa")(HelloWorld,undefined);
return $_exports;
});
console.log(" i am rougue");


})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('realm-js') : window.realm}}());