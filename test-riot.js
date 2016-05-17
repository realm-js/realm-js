(function(___scope___) { var $isBackend = ___scope___.isNode; var realm  = ___scope___.realm;
"use strict";

realm.module("test.menu", ["utils.Agent"], function (Agent) {
	var $_exports;
	riot.tag2('menu', 'this is my menu <ul><li>Menu1</li><li>Menu2</li></ul>', '', '', function (opts) {});

	return $_exports;
});
realm.module("test.ui-base", [], function () {
	var $_exports;
	riot.tag2('ui-base', '<div style="border:1px solid red"><yield></yield></div>', '', '', function (opts) {});

	return $_exports;
});
})(function(self){ var isNode = typeof exports !== 'undefined'; return { isNode : isNode, realm : isNode ? require('./index.js') : self.realm}}(this));