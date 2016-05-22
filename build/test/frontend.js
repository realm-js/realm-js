
realm.module("test.bridges.User",["realm.bridge.Request"],function(Request){ var $_exports;
$_exports = {
'getUsers': function(){return Request("test.bridges.User", arguments)}
}
return $_exports;
});