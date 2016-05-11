var should = require('should');
var realm = require('../index.js');
var Promise = require("promise");
realm.service("$serviceSome", function() {
   return {
      data: new Date()
   }
});
realm.module("$moduleA", function($serviceSome) {
   console.log("Execute module a", $serviceSome);
   return Math.random();
});

realm.module("$moduleB", function() {
   return 1;
});

describe('Modules should be cached', function() {

   var randomNumber;
   it('Should give a random number', function(done) {
      realm.require(function($moduleA) {
         randomNumber = $moduleA;
         randomNumber.should.be.greaterThan(0)

         done();
      }).catch(done)
   });

   it('Require is second time should give the same number', function(done) {
      realm.require(function($moduleA) {

         randomNumber.should.equal($moduleA);

         done();
      }).catch(done)
   });

});
