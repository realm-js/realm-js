var should = require('should');
var realm = require('../index.js');
var Promise = require("promise");

describe('Realm flow', function() {

   it('Should pass the flow', function(done) {
      var doFirst = function() {
         return {
            hello: 1
         }
      }

      var doSecond = function(input) {
         return {
            hello: input.hello + 1
         }
      }
      return realm.merge(doFirst, doSecond).then(function(data) {

         data.hello.should.equal(2);
         done()
      }).catch(done)

   });

});
