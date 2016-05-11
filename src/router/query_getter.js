var realm = require("../realm.js").realm;
var Convenience = require("./convenience.js");

var _ = require('lodash')
var __get = function(opt, defaultValue) {
   var s = opt.split("@");
   var name = s[0];
   var p = s[1];

   var isRequired = false;
   var intRequested = false;

   var xpathSplit = name.split('.');
   var value;

   var spitError = function(code, message) {
      throw {
         status: code || 400,
         message: message,
         validation: true
      };
   }

   if (xpathSplit.length > 1) {
      value = this[xpathSplit[0]];

      if (_.isPlainObject(value)) {
         var valueValid = true;
         for (var i = 1; i < xpathSplit.length; i++) {
            if (valueValid === true) {
               var x = xpathSplit[i];
               if (value !== undefined) {
                  value = value[x];
               } else {
                  valueValid = false
               }
            }
         }
      } else {
         value = undefined;
      }

   } else {
      value = this[name];
   }

   var params = {};
   if (p !== undefined) {
      params = Convenience.parse(p, {
         cache: true,
         dict: true
      });
   };

   if (params.required && (value === undefined || value === "")) {
      spitError(400, params.required.attrs[0] || (name + " is required"))
   }

   if (params.bool) {

      if (value === undefined) {
         return false;
      }
      value = value.toString();

      if (value === "1" || value === "true") {
         return true;
      }
      return false;
   }
   if (params.min) {
      var minSymols = (params.min.attrs[0] * 1 || 0);

      if (value === undefined || value.toString().length < minSymols) {
         var eMessage = params.min.attrs[1] || "Expected to have at least " + minSymols + " in " + name;
         spitError(400, eMessage)
      }
   }

   if (params.max) {
      var maxSymbols = (params.max.attrs[0] * 1 || 255);
      if (value === undefined || value.toString().length > maxSymbols) {
         var eMessage = params.max.attrs[1] || "Expected to have not more than " + maxSymbols + " in " + name;
         spitError(400, eMessage);
      }
   }
   // momentjs
   if (params.moment) {
      var format = params.moment.attrs[0];
      var eMessage = params.moment.attrs[1] || "Invalid moment format.";
      if (value !== undefined) {

         try {
            return moment(value, format);
         } catch (e) {
            spitError(400, eMessage);
         }
      } else {
         spitError(400, eMessage);
      }
   }

   if (params.email) {
      if (value !== undefined) {
         var eMessage = params.email.attrs[0] || "Email is in wrong format";
         var re =
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
         if (!re.test(value)) {
            spitError(400, eMessage);
         }
      }
   }

   if (params.phone) {
      var validateTelephoneRegEx =
         /(00|\+)(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{3,14}$/;
      if (!validateTelephoneRegEx.test(value)) {
         var eMessage = params.phone.attrs[0] || "Phone is in wrong format";
         spitError(400, eMessage);
      }
   }

   // Integer validation
   if (params.int) {
      if (value !== undefined) {
         var eMessage = params.int.attrs[0] || (name + " is in wrong format (int required)");
         value = value.toString();
         if (!value.match(/^\d+$/)) {
            spitError(400, eMessage);
         }
         value = value * 1;
      }
   }

   if (params.date) {
      if (value !== undefined) {
         var eMessage = params.date.attrs[0] || (name + " is in wrong format");
         value = value.toString();
         try {
            value = new Date(value)
         } catch (e) {
            spitError(400, eMessage);
         }
      }
   }

   if (_.isFunction(defaultValue)) {
      return defaultValue(value)
   }
   return value !== undefined ? value : defaultValue;
}


realm.service("$query", function($req){
   return {
      attrs : $req.query,
      get : __get.bind($req.query)
   }
});
realm.service("$body", function($req){
   return {
      attrs : $req.body,
      get : __get.bind($req.body)
   }
});
