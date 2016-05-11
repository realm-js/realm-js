var express = require('express');
var app = express();
var realm = require("./index.js");

app.use('/build', express.static(__dirname + '/build'));

app.use('/re.js', realm.serve.express());

app.use('/bower_components', express.static(__dirname + '/bower_components'));


require('./test-backend.js');


app.use(realm.router.express("test.route", {prettyErrors : true, injectors : 'test.injectors'}))

var port = process.env.PORT || 3051;
var server = app.listen(port, function() {
   var host = server.address().address;
   console.log('Example app listening at http://%s:%s', host, port);
});
