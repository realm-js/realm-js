var fs = require('fs');
var contents;
module.exports = {
   express: function(req, res, next) {
      var self = this;
      return function(req, res, next) {
         res.setHeader('content-type', 'text/javascript');
         return res.end(self.getContents());
      }
   },
   getContents: function() {
      contents = contents || fs.readFileSync(__dirname + "/realm.js").toString();
      return contents;
   }

}
