var should = require('should');
var realm = require('../build/realm.js').realm;
var each = realm.each;

describe('Realm require test', function(done) {

	it('Should require a typescript module', function(done) {
		realm.ts_module("a", [], (exports, require) => {
            exports.myVariable = 1;
        });
        realm.require((a) => {
            a.should.deepEqual({myVariable : 1});
            realm.flush();
            done();
        }).catch(done);
	});

    it('Should successfully use local "require" with [REGULAR] module', function(done) {
		
        realm.module("a", [], () => {
            return "a";
        });
        realm.ts_module("b", ['a'], (exports, require) => {
            exports.data = require('a');
        });
        realm.require((b) => {
            b.should.deepEqual({data : 'a'});
            realm.flush();
            done();
        }).catch(done);
	});

    it('Should successfully use local "require" with [TYPESCRIPT] module', function(done) {
		
        realm.ts_module("a", [], (exports, require) => {
            exports.hello = 100;
        });
        realm.ts_module("b", ['a'], (exports, require) => {
            exports.data = require('a');
        });
        realm.require((b) => {
            b.should.deepEqual({data : {hello : 100}});
            realm.flush();
            done();
        }).catch(done);
	});

 	
});
