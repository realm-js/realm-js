
(function(___scope___) { var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;

realm.module("test.bridges.User",["realm.router.BridgeRequest"],function(BridgeRequest){ var $_exports;
$_exports = {
'getUsers': function(){return BridgeRequest.connect("test.bridges.User", arguments)}
}
return $_exports;
});

})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('realm-js') : self.realm}}(this));