
(function(___scope___) { var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;

realm.module("myapp.HelloWorld",[],function(){ var $_exports;

class HelloWorld {

}

return $_exports;
});

})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('realm-js') : self.realm}}(this));