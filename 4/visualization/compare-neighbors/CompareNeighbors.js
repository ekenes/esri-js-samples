define([
  "esri/core/workers",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/renderers/smartMapping/creators/color",
  "esri/geometry/SpatialReference",
], function(
  workers,
  SimpleRenderer, 
  SimpleMarkerSymbol, 
  SimpleFillSymbol, 
  colorRendererCreator, 
  SpatialReference 
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
      console.log("query results: ", response);
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

    var avg = Math.round(stopsAvg*100) / 100;
    var max = Math.round(diffStopsMax*100) / 100;
    var min = Math.round(diffStopsMin*100) / 100;
    var diffStatsMin = Math.round(diffStats.min*100) / 100;
    var diffStatsMax = Math.round(diffStats.max*100) / 100;
    
    var diffRenderer = new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        outline: {
          width: 0.5,
          color: [ 0,77,168,0.3 ]
        }
      }),
      visualVariables: [{
        type: "color",
        field: function (graphic) {
          var attributes = graphic.attributes;
          var match = find(featureInfos, function(info){
            return attributes.OBJECTID === info.feature.attributes.OBJECTID;
          });
          return match[config.diffVariable];
        },
        legendOptions: {
          title: "Geographies where the % of the population that doesn't have formal education differs from the same demographic in neighboring municipalities"
        },
        stops: [
          { value: diffStatsMin, color: "#ab4026", label: (diffStatsMin) + "% (min)" },  //-16
          { value: min, color:[255,255,255,0.6], label: (min) + "% (-1σ)" },  // d7a497
          { value: avg, color: [255,255,255,0.6], label: avg + " (similar)" },
          { value: max, color: [255,255,255,0.6], label: (max) + "% (+1σ)" },  // 4f6789
          { value: diffStatsMax, color: "#3c567b", label: (diffStatsMax) + "% (max)" }  // 27
        ]
      }]
    });   
    
    var valueStats = params.valueStats;
    
    var sizeVisualVariable = {
      type: "size",
      field: function(graphic){
        var field = graphic.attributes[config.fieldName];
        var normalizationField = graphic.attributes[config.normalizationFieldName];
        var value = normalizationField ? (field/normalizationField)*100 : field;
        return value;
      },
      legendOptions: { title: "% population without formal education" },
      stops: [
        { value: Math.round(valueStats.avg*100)/100, size: 4 },  //+1σ
        { value: Math.round(valueStats.max*100)/100, size: 50 }  // 27
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
      visualVariables: [sizeVisualVariable, {
        type: "color",
        field: function (graphic) {
          var attributes = graphic.attributes;
          var match = find(featureInfos, function(info){
            return attributes.OBJECTID === info.feature.attributes.OBJECTID;
          });
          return match[config.diffVariable];
        },
        legendOptions: {
          title: "Geographies where the % of the population that doesn't have formal education differs from the same demographic in neighboring municipalities"
        },
        stops: [
          { value: diffStatsMin, color: "#ab4026", label: (diffStatsMin) + "% (min)" },  //-16
          { value: min, color: [255,255,255,0.6], label: (min) + "% (-1σ)" },  // d7a497
          { value: avg, color: [255,255,255,0.6], label: avg + " (similar)" },
          { value: max, color: [255,255,255,0.6], label: (max) + "% (+1σ)" },  // 4f6789
          { value: diffStatsMax, color: "#3c567b", label: (diffStatsMax) + "% (max)" }  // 27
        ]
      }]
    });
    
    return colorRendererCreator.createContinuousRenderer({
      layer: layer,
      field: config.fieldName,
      normalizationField: config.normalizationFieldName,
      basemap: "gray",
      theme: "high-to-low",
    }).then(function(response){
      return {
        originalRenderer: response.renderer,
        diffRenderer: diffRenderer,
        bivariateRenderer: bivariateRenderer,
        sizeVisualVariable: sizeVisualVariable
      };
    });
    
  }

  function find(items, callback, thisArg) {
    var n = items.length;
    for (var i = 0; i < n; i++) {
      var value = items[i];

      if (callback.call(thisArg, value, i, items)) {
        return value;
      }
    }

    return undefined;
  }


  return CompareNeighbors;
});