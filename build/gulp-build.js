(function(___scope___) { var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;

realm.module("mypackage.HelloWorld",[],function(){ var $_exports;

class HelloWorld {

}

$_exports = HelloWorld;

return $_exports;
});
console.log(" i am rougue");


})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('realm-js') : window.realm}}());