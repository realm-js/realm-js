var fs = require('fs');

var HELPER = {
   loadCases: function(folder) {
      var cases = {};
      var files = fs.readdirSync(__dirname + "/files/" + folder);
      for (var i in files) {
         var f = files[i];

         var name = f.split(".");
         var contents = fs.readFileSync(__dirname + "/files/" + folder + "/" + f).toString();
         cases[name[0]] = contents;
      }

      return cases;
   }
}
module.exports = HELPER;
