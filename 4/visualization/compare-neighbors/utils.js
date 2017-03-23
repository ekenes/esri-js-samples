define([
  "dojo/dom"
], function(dom){

  var utils = {
    find: function (items, callback, thisArg) {
      var n = items.length;
      for (var i = 0; i < n; i++) {
        var value = items[i];

        if (callback.call(thisArg, value, i, items)) {
          return value;
        }
      }

      return undefined;
    },

    getConfigParams: function () {
      var fieldName = dom.byId("field-name").value;
      var normFieldName = dom.byId("normalization-field-name").value;
      var diffVariable = "diffAverage"; //diffMax, diffAverage

      return {
        diffVariable: diffVariable,
        fieldName: fieldName,
        normalizationFieldName: normFieldName ? normFieldName : null
      };
    },

    round: function round(num, places) {
      var configParams = this.getConfigParams();

      var p = configParams.normalizationFieldName ? 2 : 0;
      return Math.round(num*Math.pow(10,places+p))/Math.pow(10,places);
    },

    showPercentageUnits: function(points) {
      var units = "";
      var configParams = this.getConfigParams();

      if(configParams.normalizationFieldName){
        units = points ? " pp" : "%";
      }
      return units;
    }

  };

  return utils;
});