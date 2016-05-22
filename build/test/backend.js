
(function(___scope___) { var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;

realm.module("test.bridges.User",[],function(){ var $_exports;


class User {

   static getUsers() {

   }
}

$_exports = User;

return $_exports;
});
"use realm backend-raw";

console.log("hello backend raw!");

realm.module("myapp.models.Group",[],function(){ var $_exports;

class Group {

}

$_exports = Group;

return $_exports;
});

})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('realm-js') : self.realm}}(this));