define([
  "esri/core/workers",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/renderers/smartMapping/creators/color",
  "esri/geometry/SpatialReference",
  "app/utils"
], function(
  workers,
  SimpleRenderer,
  SimpleMarkerSymbol,
  SimpleFillSymbol,
  colorRendererCreator,
  SpatialReference,
  utils
){

  var CompareNeighbors = function CompareNeighbors() {};

  CompareNeighbors.prototype = {
    execute: function (params) {
      var layer = params.layer;
      var config = params.config;
      var allFeatures = [];

      return layer.load()
        .then(function() {
          return queryFeatures({
            layer: layer,
            allFeatures: allFeatures,
            config: config
          });
        })
        .then(executeWorker)
        .then(createRenderers)
        .otherwise(function(error){
          console.log("error: ", error);
        });
    }
  };

  function queryFeatures(params){
    var layer = params.layer;
    var allFeatures = params.allFeatures;
    var config = params.config;
    var num = params.num ? params.num : 2000;
    var exceededTransferLimit = typeof params.exceededTransferLimit === "undefined" ? true : params.exceededTransferLimit;
    var start = params.start ? params.start : 0;

    if(!exceededTransferLimit){
      return {
        layer: layer,
        features: allFeatures,
        config: config
      };
    }

    var query = layer.createQuery();
    query.start = start;
    query.num = num;
    query.outSpatialReference = new SpatialReference({ wkid: 3857 });

    return layer.queryFeatures(query)
      .then(function(response){
        var json = response.toJSON();
        json.features.forEach(function(feature) {
          delete feature.popupTemplate;
        });
        allFeatures.push.apply(allFeatures, json.features);
        return queryFeatures({
          config: config,
          layer: layer,
          allFeatures: allFeatures,
          num: num,
          start: start+2000,
          exceededTransferLimit: response.exceededTransferLimit
        });
      });
  }

  function executeWorker(params) {
    var layer = params.layer;
    delete params.layer;

    var connection;
    return workers.open(this, "app/CompareNeighborsWorker")
      .then(function(conn) {
        connection = conn;
        return connection.invoke("execute", params)
      })
      .then(function(results) {
        connection.close();
        results.layer = layer;
        return results;
      });
  }

  function createRenderers(params) {
    var featureInfos = params.featureInfos;
    var diffStats = params.diffStats;
    var config = params.config;
    var layer = params.layer;

    var diffStopsMax = (diffStats.stddev + diffStats.avg) < diffStats.max ? (diffStats.stddev + diffStats.avg) : diffStats.max;
    var diffStopsMin = (diffStats.avg - diffStats.stddev) > diffStats.min ? (diffStats.avg - diffStats.stddev) : diffStats.min;
    var stopsAvg = diffStats.avg;

    var diffStatsMin = diffStats.min;
    var diffStatsMax = diffStats.max;

    var colorVisualVariable = {
      type: "color",
      field: function (graphic) {
        var attributes = graphic.attributes;
        var match = utils.find(featureInfos, function(info){
          return attributes.OBJECTID === info.feature.attributes.OBJECTID;
        });
        return match[config.diffVariable];
      },
      legendOptions: {
        title: "Based on the selected value, features shaded with a color other than white differ beyond the normal variance that exists between a typical feature and its neighbors."
      },
      stops: [
        { value: diffStopsMin*2, color: "#ab4026", label: utils.round(diffStopsMin*2,2) + utils.showPercentageUnits(true) + " (-2σ)" },
        { value: diffStopsMin, color:[255,255,255,0.6], label: utils.round(diffStopsMin,2) + utils.showPercentageUnits(true) + " (-σ)" },
        { value: stopsAvg, color: [255,255,255,0.6], label: utils.round(stopsAvg,2) + utils.showPercentageUnits(true) + " (similar)" },
        { value: diffStopsMax, color: [255,255,255,0.6], label: utils.round(diffStopsMax,2) + utils.showPercentageUnits(true) + " (+σ)" },
        { value: diffStopsMax*2, color: "#3c567b", label: utils.round(diffStopsMax*2,2) + utils.showPercentageUnits(true) + " (+2σ)" }
      ]
    };

    var diffRenderer = new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        outline: {
          width: 0.5,
          color: [ 0,77,168,0.3 ]
        }
      }),
      visualVariables: [ colorVisualVariable ]
    });

    var valueStats = params.valueStats;

    var sizeVisualVariable = {
      type: "size",
      field: config.fieldName,
      normalizationField: config.normalizationFieldName,
      stops: [
        { value: valueStats.avg, size: 4, label: utils.round(valueStats.avg,2) + utils.showPercentageUnits() },  //+1σ
        { value: valueStats.max, size: 50, label: utils.round(valueStats.max,2) + utils.showPercentageUnits() }  // 27
      ]
    };

    var bivariateRenderer = new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        color: "gray",
        size: 5,
        outline: {
          width: 0.5,
          color: [ 0,77,168,0.3 ]
        }
      }),
      visualVariables: [sizeVisualVariable, colorVisualVariable]
    });

    return colorRendererCreator.createContinuousRenderer({
      layer: layer,
      field: config.fieldName,
      normalizationField: config.normalizationFieldName,
      basemap: "gray",
      theme: "high-to-low",
    }).then(function(response){

      return {
        layer: layer,
        featureInfos: featureInfos,
        originalRenderer: response.renderer,
        diffRenderer: diffRenderer,
        bivariateRenderer: bivariateRenderer,
        sizeVisualVariable: sizeVisualVariable
      };
    });

  }


  return CompareNeighbors;
});