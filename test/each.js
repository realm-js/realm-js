var should = require('should');
var realm = require('../index.js');
var Promise = require("promise");

describe('Testing promise each', function() {

	it('Should iterate just promises', function(done) {
		var promise1 = new Promise(function(resolve, reject) {
			return resolve("1");
		});
		var promise2 = new Promise(function(resolve, reject) {
			return resolve("2");
		});

		realm.each([promise1, promise2]).then(function(values) {
			values[0].should.be.equal("1");
			values[1].should.be.equal("2");
			done();
		});
	});
	it('Should iterate each with promises', function(done) {
		var data = ["pukka", "sukka", "kukka"];

		realm.each(data, function(value) {
			return new Promise(function(resolve, reject) {
				resolve(value);
			});
		}).then(function(response) {
			should.deepEqual(data, response);
			done();
		}).catch(function(e) {
			console.log(e);
		});
	});

});
