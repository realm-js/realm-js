var should = require('should');
var realm = require('../index.js');
var Promise = require("promise");

describe('Testing chain', function() {

   it('Should initiate chain', function(done) {

      class MyChain {
         setFoo() {
            return "foo";
         }
         setBar() {
            return "bar";
         }
      }

      realm.chain(MyChain).then(function(result) {
         result.should.deepEqual({
            foo: "foo",
            bar: "bar"
         })
         done();
      }).catch(done);

   });

   it('Should initiate chain, but without storing non-setter', function(done) {

      class MyChain {
         setFoo() {
            return "foo";
         }
         setBar() {
            return "bar";
         }
         justPassing() {
            return {
               "a": 1
            }
         }
      }

      realm.chain(MyChain).then(function(result) {
         result.should.deepEqual({
            foo: "foo",
            bar: "bar"
         })
         done();
      }).catch(done);

   });

   it('Formatter should be executed', function(done) {

      class MyChain {
         setFoo() {
            return "foo";
         }
         setBar() {
            return "bar";
         }
         format() {
            return {
               coo: this.foo
            }
         }
      }

      realm.chain(MyChain).then(function(result) {
         result.should.deepEqual({
            coo: "foo"
         })
         done();
      }).catch(done);
   });

   it('Regular methods should be executed', function(done) {

      class MyChain {
         setFoo() {
            return "foo";
         }
         setBar() {
            return "bar";
         }
         justHello() {
            this.iWasThere = 1;
         }
         format() {
            return {
               there: this.iWasThere,
               coo: this.foo
            }
         }
      }

      realm.chain(MyChain).then(function(result) {
         result.should.deepEqual({
            coo: "foo",
            there: 1
         })
         done();
      }).catch(done);
   });

   it('Should understand promises', function(done) {

      class MyChain {
         setFoo() {
            return "foo";
         }
         setBar() {
            return new Promise(function(resolve, reject) {
               setTimeout(function() {
                  return resolve("bar1")
               }, 1)
            })
         }
      }

      realm.chain(MyChain).then(function(result) {
         result.should.deepEqual({
            foo: "foo",
            bar: "bar1"
         })
         done();
      }).catch(done);
   });

});
