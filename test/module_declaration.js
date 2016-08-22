var should = require('should');
var builder = require('../build/gulp-plugin.js').builder;
const ModuleDeclarationParser = builder.ModuleDeclarationParser;
const fs = require('fs');

let testContents = fs.readFileSync(__dirname + '/_test.txt').toString();

describe('Testing builder', function() {

    it('Should parse', function(){


      //  ModuleDeclarationParser.modify(testContents, 'realm/core')
        
    });

});
