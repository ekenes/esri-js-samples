define([
  "esri/core/promiseUtils",

  "esri/geometry/geometryEngine",
  "esri/geometry/support/jsonUtils"
], function(
  promiseUtils,
  geometryEngine, jsonUtils
) {

  var CompareNeighbors = function() {};

  CompareNeighbors.prototype = {
    execute: function(params) {
      var features = params.features;
      var config = params.config;

      var featureInfos = createFeatureInfos({
        features: features,
        config: config
      });

      var diffStats = getFeatureInfoStats({
        featureInfos: featureInfos,
        config: params.config
      });

      var valueStats = getValueStats({
        featureInfos: featureInfos,
        config: params.config
      });

      return promiseUtils.resolve({
        data: {
          featureInfos: featureInfos,
          diffStats: diffStats,
          valueStats: valueStats,
          config: config
        }
      });
    }
  }

  function createFeatureInfos(params){
    var features = params.features.map(function(feature) {
      return {
        attributes: feature.attributes,
        geometry: jsonUtils.fromJSON(feature.geometry)
      };
    });
    var fieldName = params.config.fieldName;
    var normalizationFieldName = params.config.normalizationFieldName;
    var valueExpression = params.config.valueExpression;

    featureInfos = features.map(visualizeDissimilarFeatures);

    function visualizeDissimilarFeatures(graphic){

      var idField = graphic.attributes.OBJECTID;
      var field = (fieldName) && graphic.attributes[fieldName] ? graphic.attributes[fieldName] : 0;
      var normalizationField = (normalizationFieldName) && graphic.attributes[normalizationFieldName] ? graphic.attributes[normalizationFieldName] : 1;
      var geometry = graphic.geometry;

      var value = (valueExpression) ? valueExpression : Math.round((field / normalizationField)*10000) / 100;

      var borderingFeatureInfos = features.filter(function(feature){
        return geometryEngine.intersects(geometry, feature.geometry)
          && idField !== feature.attributes.OBJECTID;
      }).map(function(feature){

        var idField = feature.attributes.OBJECTID;
        var field = feature.attributes[fieldName] ? feature.attributes[fieldName] : 0;
        var normalizationField = feature.attributes[normalizationFieldName] ? feature.attributes[normalizationFieldName] : 1;
        var value = Math.round((field / normalizationField)*10000) / 100;

        return {
          id: idField,
          value: value
        };

      });

      var borderingValues = getValuesArray(borderingFeatureInfos);
      var average = getAverage(borderingValues);
      var max = getMax(borderingValues);
      var min = getMin(borderingValues);
      var stddev = getStandardDeviation(borderingValues);
      var count = getCount(borderingValues);

      function getDifference (value, subtractBy){
        return value - subtractBy;
      }

      var featureInfo = {
        feature: graphic,
        value: value,
        diffAverage: getDifference(value, average),
        diffMax: getDifference(value, max),
        aboveNeighbors: getDifference(value, average) > 0,
        touches: borderingFeatureInfos,
        touchesStats: {
          average: average,
          max: max,
          min: min,
          stddev: stddev,
          count: count
        }
      };

      return featureInfo;
    }

    featureInfos.forEach(function(featureInfo) {
      featureInfo.feature.geometry = featureInfo.feature.geometry.toJSON();
    });

    return featureInfos;
  }

  function getFeatureInfoStats(params) {
    var featureInfos = params.featureInfos;
    var statsFor = params.config.diffVariable;

    var valuesCollection = featureInfos.map(function(info){
      return info[statsFor];
    });

    var stats = {
      min: getMin(valuesCollection),
      max: getMax(valuesCollection),
      avg: getAverage(valuesCollection),
      stddev: getStandardDeviation(valuesCollection),
      count: getCount(valuesCollection)
    };

    return stats;
  }

  function getValueStats(params) {
    var featureInfos = params.featureInfos;
    var field = params.config.fieldName;
    var normalizationField = params.config.normalizationFieldName;

    var valuesCollection = featureInfos.map(function(info){
      var fieldValue = info.feature.attributes[field];
      var normalizationFieldValue = info.feature.attributes[normalizationField];
      var value = (normalizationFieldValue) ? (fieldValue/normalizationFieldValue)*100 : fieldValue;
      return value;
    });

    var stats = {
      min: getMin(valuesCollection),
      max: getMax(valuesCollection),
      avg: getAverage(valuesCollection),
      stddev: getStandardDeviation(valuesCollection),
      count: getCount(valuesCollection)
    };

    return stats;
  }

  function getMax(a){
    var max = a.length ? -Infinity : 0;
    a.forEach(function(val){
      if (val >= max){
        max = val;
      }
    });
    return max;
  }

  function getMin(a){
    var min = a.length ? Infinity : 0;
    a.forEach(function(val){
      if (val <= min){
        min = val;
      }
    });
    return min;
  }

  function getAverage(a){
    var sum = 0;
    var num = a.length ? a.length : 1;
    a.forEach(function(val){
      sum += val;
    });
    return sum / num;
  }

  function getValuesArray(a){
    return a.map(function(item){
      return item.value;
    });
  }

  function getStandardDeviation(a){
    var avg = getAverage(a);

    var squareDiffs = a.map(function(value){
      var diff = value - avg;
      var sqrDiff = diff * diff;
      return sqrDiff;
    });

    var avgSquareDiff = getAverage(squareDiffs);

    var stdDev = Math.sqrt(avgSquareDiff);
    return stdDev;
  }

  function getCount(a){
    return a.length;
  }

  return CompareNeighbors;

});