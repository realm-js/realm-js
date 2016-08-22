const should = require('should');
const realm = require('../build/realm.js').realm;
const each = realm.each;
const parser = realm.RequireArgumentParser;


let dep2Object = (list) => {
    var data = [];
    for (let i = 0; i < list.length; i++) {
        var item = list[i];
        data.push({ name: item.name, alias: item.alias })
    }
    return data;
}
describe('RequireArgumentParser test', function () {

    it('First is a function (1 argument)', function () {
        let result = parser([(a) => { }]);
        result.target.should.be.type('function')
        console.log(result.dependencies);
        dep2Object(result.dependencies).should.deepEqual([{ name: 'a', alias: 'a' }])
        result.locals.should.deepEqual({})


    });

    it('First is a function (2 argument3)', function () {
        let result = parser([(a, b) => { }, { foo: 'bar' }]);

        result.target.should.be.type('function')

        dep2Object(result.dependencies).should.deepEqual([{ name: 'a', alias: 'a' }, { name: 'b', alias: 'b' }])
        result.locals.should.deepEqual({ foo: 'bar' })

    });

    it('First is a string (1 argument)', function () {
        try {
            parser(['hello'])
            done('should not be here')
        } catch (e) {
            e.message.should.equal('Second argument must be function/closure!');
        }
    });

    it('First is a string (2 argument3)', function () {
        let result = parser(['hello', (a, b) => { }])

        result.target.should.be.type('function')

        dep2Object(result.dependencies).should.deepEqual([{ name: 'hello', alias: 'hello' }])
        result.locals.should.deepEqual({})

    });
    it('First is a string (3 arguments)', function () {
        let result = parser(['hello', (a, b) => { }, { bar: 'foo' }]);
        result.target.should.be.type('function')
        dep2Object(result.dependencies).should.deepEqual([{ name: 'hello', alias: 'hello' }])
        result.locals.should.deepEqual({ bar: 'foo' })

    });

    it('First is a string - second something else', function (done) {

        try {
            parser(['hello', 1])
            done('should not be here')
        } catch (e) {
            e.message.should.equal('Second argument must be function/closure!');
            done()
        }
    });

    it('First is array (2 argument)', function () {
        let result = parser([['hello', 'world'], (a, b) => { }])


        result.target.should.be.type('function')
        dep2Object(result.dependencies).should.deepEqual([{ name: 'hello', alias: 'hello' }, { name: 'world', alias: 'world' }])
        result.locals.should.deepEqual({})

    });
    it('First is array (3 arguments)', function () {
        let result = parser([['hello', 'world'], (a, b) => { }, { bar: 'foo' }])


        result.target.should.be.type('function')
        dep2Object(result.dependencies).should.deepEqual([{ name: 'hello', alias: 'hello' }, { name: 'world', alias: 'world' }])
        result.locals.should.deepEqual({ bar: 'foo' })

    });

    it('First is a string - second something else', function (done) {

        try {
            parser([['hello'], 1])
            done('should not be here')
        } catch (e) {
            e.message.should.equal('Second argument must be function/closure!');
            done()
        }
    });

    it('Wrong attributes (should not match anything and fail)', function (done) {
        try {
            parser([{}, 1, 2])
            done('should not be here')
        } catch (e) {
            e.message.should.equal('Require method requires a closure!');
            done()
        }
    });

});
