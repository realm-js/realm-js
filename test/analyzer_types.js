var should = require('should');
var realm = require('../index.js');
var fs = require('fs');
var anaylizer = require("../src/transpiler/analyzer.js");

var helper = require('./helper.js');
var cases = helper.loadCases('analyzer_types');

describe('Detecting types', function() {
   it("Should detect univeral type with starting header", function() {
      var data = anaylizer(cases.a);
      data.type.should.equal("universal");
   });

   it("Should detect univeral type few lines above", function() {
      var data = anaylizer(cases.b);
      data.type.should.equal("universal");
   });

   it("Should detect frontend type", function() {
      var data = anaylizer(cases.c);
      data.type.should.equal("frontend");
   });

   it("Should detect backend type", function() {
      var data = anaylizer(cases.d);
      data.type.should.equal("backend");
   });

   it("Should detect frontend raw", function() {
      var data = anaylizer(cases.e);
      data.type.should.equal("frontend-raw");
   })

   it("Should detect backend raw", function() {
      var data = anaylizer(cases.f);
      data.type.should.equal("backend-raw");
   })
});
