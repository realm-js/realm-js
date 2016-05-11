var should = require('should');
var realm = require(__dirname + '/../index.js');
var Promise = require("promise");

realm.service("ns.serviceA", function() {
	return 1;
});
realm.service("ns.serviceB", function() {
	return 2;
});

realm.service("$a", function() {
	return "Response from $a";
});

realm.service("$stringVarService", ["$a"], function($a) {
	return $a;
});

realm.service("$b", function($a) {
	return $a;
});

realm.service("$c", function($a, $b) {
	return {
		a: $a,
		b: $b
	};
});

realm.service("$d", function($a) {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			resolve({
				some: $a
			});
		}, 50);
	});
});

realm.service("$e", function($local) {

	return $local;
});

describe('Work flow', function() {

	it('Should simple call the service without dependencies', function(done) {
		realm.require(function($a) {
			$a.should.be.equal("Response from $a");
		}).catch(function(error) {
			console.log(error);
		}).then(function() {
			done();
		});
	});

	it('Should require one from string', function(done) {
		realm.require('$a', function($a) {
			$a.should.be.equal("Response from $a");
			done();
		});
	});

	it('Should require couple from string', function(done) {
		realm.require(['$a', '$c'], function($a, $c) {
			$a.should.be.equal("Response from $a");
			$c.a.should.be.equal("Response from $a");
			done();
		});
	});

	it('Should call service with one dependency', function(done) {
		realm.require(function($b) {
			$b.should.be.equal("Response from $a");
			done();
		});
	});

	it('Should should require service with string arguments defined', function(done) {
		realm.require(function($stringVarService) {
			$stringVarService.should.be.equal("Response from $a");
			done();
		});
	});

	it('Should call service with 2 dependencies', function(done) {
		realm.require(function($c) {
			$c.a.should.be.equal("Response from $a");
			$c.b.should.be.equal("Response from $a");
			done();
		});
	});

	it('Should call service $d that is async', function(done) {
		realm.require(function($d) {
			$d.some.should.be.equal("Response from $a");
			done();
		});
	});

	it('Should Pass local argument with 2 arguments', function(done) {
		realm.require(function($e) {
			console.log($e);
			$e.should.be.equal("hello");
			done();
		}, {
			$local: "hello"
		}).catch(done);
	});

	it('Should fail without local argument', function(done) {
		realm.require(function($e) {
			$e.should.be.equal("hello");

		}).then(function() {
			done("Should not come here");
		}).catch(function() {
			done();
		});
	});

	it('Should Pass local argument with 3 arguments and return result', function(done) {
		realm.require(function($e) {
			$e.should.be.equal("hello");
			return "some";
		}, {
			$local: "hello"
		}).then(function(res) {
			res.should.be.equal("some");
			done();
		});
	});

	it('Should Pass local argument with 3 arguments and return result asynchronously', function(done) {
		realm.require(function($e) {
			$e.should.be.equal("hello");
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					resolve("some");
				}, 1);
			});
		}, {
			$local: "hello"
		}).then(function(res) {
			res.should.be.equal("some");
			done();
		});
	});

	it('Should require by a string name', function(done) {
		realm.require("$a", function(injectedVar) {
			injectedVar.should.be.equal("Response from $a");
		}).then(function() {
			done();
		});
	});

	it('Should require package', function(done) {
		realm.requirePackage("ns").then(function(data) {
			data['ns.serviceA'].should.equal(1);
			data['ns.serviceB'].should.equal(2);
			done();
		});
	});
});
