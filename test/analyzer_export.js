var should = require('should');
var realm = require('../index.js');
var fs = require('fs');
var anaylizer = require("../src/transpiler/analyzer.js");

var helper = require('./helper.js');
var cases = helper.loadCases('analyzer_export');

describe('Analyzer export test', function() {

   it("Should Export a single class via variable", function() {
      var data = anaylizer(cases.a);
      data.realmType.should.equal("module");
      data.lines.should.deepEqual(['class MyClass {}', '\n$_exports = MyClass;', ''])
   });

   it("Should Export a single class", function() {
      var data = anaylizer(cases.b);
      data.realmType.should.equal("module");

      data.lines.should.deepEqual(['\n$_exports = MyClass {}', ''])
   });
   it("Should not use realm at all", function() {
      var data = anaylizer(cases.c);
      data.should.deepEqual({
         lines: 'export MyClass {}\n'
      });
   });
});
