var should = require('should');
var realm = require('../build/realm.js').realm;
var each = realm.each;

describe('Realm require test', function(done) {

	it('Should require a simple module', function(done) {
		realm.module("a", [], () => {
            return 1;
        });
        realm.require((a) => {
            a.should.equal(1);

            realm.flush();
            done();
        }).catch(done);
	});

    it('Should require a simple module with dependency', function(done) {
		realm.module("bb", [], () => {
            return 2;
        });
        realm.module("a", ['bb'], (b) => {
            return b;
        });
        realm.require((a) => {
            a.should.equal(2);
            
            realm.flush();
            done();
        }).catch(done);
	});
    it('Should require a module that returns a Promise', function(done) {
		
        realm.module("a", [], () => {
            return new Promise(resolve => resolve(100));
        });
        realm.require((a) => {
            a.should.equal(100);
            
            realm.flush();
            done();
        }).catch(done);
	});

    it('Should cache a module', function(done) {
        let random;
        realm.module("a", [], () => {
            random = Math.random();
            return new Promise(resolve => resolve(random));
        });
        realm.require((a) => {
            a.should.equal(random);
            realm.require((a) => {
                a.should.equal(random);
                realm.flush();
                done();
            });
        }).catch(done);
	});

    it('Should require a module with local variable', function(done) {
        
        realm.module("a", ['z'], (z) => {
            return new Promise(resolve => resolve(z));
        });
        realm.require((a) => {
            a.should.equal(999);
            realm.flush();
            done();
        }, {
            z : 999
        }).catch(done);
	});

    it('Should respect require annotations', function(done) {
		realm.module("a", [], () => {
            return 1;
        });
        realm.require(['a'], (myModuleA) => {
            myModuleA.should.equal(1);

            realm.flush();
            done();
        }).catch(done);
	});

    it('Should respect require annotations and local variables', function(done) {
		realm.module("a", [], () => {
            return 1;
        });
        realm.require(['a', 't'], (myModuleA, localInjectionT) => {
            myModuleA.should.equal(1);
            localInjectionT.should.equal(444);
            realm.flush();
            done();
        }, {
            t : 444
        }).catch(done);
	});
	
});
