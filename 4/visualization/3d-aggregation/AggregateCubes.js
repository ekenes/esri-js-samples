define([
  "esri/core/workers",
  "esri/geometry/SpatialReference",
  "esri/geometry/Extent",
  "esri/layers/FeatureLayer",
  "esri/Graphic",
  "esri/geometry/Point",
  "esri/tasks/support/Query",
], function(
  workers,
  SpatialReference,
  Extent,
  FeatureLayer,
  Graphic,
  Point,
  Query
){

  var AggregateCubes = function AggregateCubes() {};

  AggregateCubes.prototype = {
    execute: function (params) {
      var layer = params.layer;
      var layerView = params.layerView;
      var extent = params.extent;
      var resolution = params.resolution;
      var levels = params.levels;
      var allFeatures = [];

      return layer.load()
        .then(function() {
          return queryFeatures({
            layer: layer,
            layerView: layerView,
            allFeatures: allFeatures,
            geometry: extent,
            resolution: resolution,
            levels: levels
          });
        })
        .then(executeWorker)
        .then(createLayer)
        .otherwise(function(error){
          console.log("error: ", error);
        });
    }
  };

  function queryFeatures(params){
    var layer = params.layer;
    var layerView = params.layerView;
    var geometry = params.geometry;
    var resolution = params.resolution;
    var levels = params.levels;
    var allFeatures = params.allFeatures;
    var num = params.num ? params.num : 2000;
    var exceededTransferLimit = typeof params.exceededTransferLimit === "undefined" ? true : params.exceededTransferLimit;
    var start = params.start ? params.start : 0;

    if(layerView){
      var q = new Query({
        geometry: new Extent(geometry),
        spatialRelationship: "intersects"
      });
      return layerView.queryFeatures()
        .then(function(features){
          var jsonFeatures = features.map(function(feature){
            var jsonFeature = feature.toJSON();
            delete jsonFeature.popupTemplate;
            return jsonFeature;
          });
          return {
            layer: layerView.layer,
            pointFeatures: jsonFeatures,
            extent: geometry,
            resolution: resolution,
            levels: levels
          };
        });
    }

    if(!exceededTransferLimit){
      return {
        layer: layer,
        pointFeatures: allFeatures,
        extent: geometry,
        resolution: resolution,
        levels: levels
      };
    }

    var query = layer.createQuery();
    query.start = start;
    query.num = num;
    query.outSpatialReference = new SpatialReference({ wkid: 3857 });
    query.geometry = new Extent(geometry);
    query.spatialRelationship = "intersects";

    return layer.queryFeatures(query)
      .then(function(response){
        var json = response.toJSON();
        json.features.forEach(function(feature) {
          delete feature.popupTemplate;
        });
        allFeatures.push.apply(allFeatures, json.features);
        return queryFeatures({
          layer: layer,
          allFeatures: allFeatures,
          num: num,
          start: start+2000,
          exceededTransferLimit: response.exceededTransferLimit,
          geometry: geometry,
          resolution: resolution,
          levels: levels
        });
      }, function(e){
        console.error("query error: ", e);
      });
  }

  function executeWorker(params) {
    var layer = params.layer;
    delete params.layer;

    var connection;
    return workers.open(this, "app/AggregateCubesWorker")
      .then(function(conn) {
        connection = conn;
        return connection.invoke("execute", params)
      })
      .then(function(results) {
        connection.close();
        var aggregatePoints = results.aggregatePoints.map(function(graphicJson){
          return new Graphic({
            attributes: graphicJson.attributes,
            geometry: new Point(graphicJson.geometry)
          });
        });
        return {
          features: aggregatePoints,
          stats: results.statsByField.count
        };
      });
  }

  function createLayer(params) {
    var features = params.features;
    var stats = params.stats;
    var resolutionKm = features[0].attributes.resolution;

    var minStop = (stats.avg - stats.stddev*2) < stats.min ? stats.min : stats.avg - stats.stddev*2;
    var maxStop = (stats.avg + stats.stddev*2) > stats.max ? stats.max : stats.avg + stats.stddev*2;
    var avgStop = stats.avg;

    var gridLayer = new FeatureLayer({
      source: features,
      opacity: 0.7, 
      title: (resolutionKm/1000) + "km cubed bins",
      elevationInfo: {
        mode: "relative-to-ground",
        offset: 50
      },
      geometryType: "point",
      spatialReference: { wkid: 3857 },
      objectIdField: "ObjectID",
      fields: [{
        name: "ObjectID",
        alias: "ObjectID",
        type: "oid"
      }, {
        name: "row",
        alias: "row",
        type: "double"
      }, {
        name: "column",
        alias: "column",
        type: "double"
      }, {
        name: "shelf",
        alias: "shelf",
        type: "double"
      }, {
        name: "resolution",
        alias: "resolution",
        type: "double"
      }, {
        name: "xmin",
        alias: "xmin",
        type: "double"
      }, {
        name: "xmax",
        alias: "xmax",
        type: "double"
      }, {
        name: "ymin",
        alias: "ymin",
        type: "double"
      }, {
        name: "ymax",
        alias: "ymax",
        type: "double"
      }, {
        name: "zmin",
        alias: "zmin",
        type: "double"
      }, {
        name: "zmax",
        alias: "zmax",
        type: "double"
      }, {
        name: "count",
        alias: "count",
        type: "double"
      }],
      popupTemplate: {
        title: "{count} earthquakes occurred in this bin",
        // content: "{ObjectID}, {count}"
      },
      popupEnabled: true,
      hasZ: true,
      returnZ: true,
      renderer: {
        type: "simple",
        symbol: {
          type: "point-3d",
          symbolLayers: [{
            type: "object",
            resource: { primitive: "cube" }
          }]
        },
        visualVariables: [{
          type: "size",
          field: "resolution",
          valueUnit: "meters",
          axis: "all",
          legendOptions: {
            showLegend: false
          }
        }, {
          type: "color",
          field: "count",
          legendOptions: {
            title: "Count"
          },
          stops: [  // 0 2 10 25 30 50
            { value: 0, color: [254, 240, 217, 0] },
            { value: minStop, color: [254, 240, 217, 0.05], label: "< " + Math.round(minStop)},
            { value: avgStop - ((avgStop - minStop) * 0.5), color: [253, 204, 138, 0.7] },
            { value: avgStop, color: [252, 141, 89, 1], label: Math.round(avgStop)},
            { value: avgStop + ((maxStop - avgStop) * 0.5), color: [227, 74, 51, 1] },
            { value: maxStop, color: [179, 0, 0, 1], label: "> " + Math.round(maxStop) }
          ]
        }]
      }
    });

    return {
      gridLayer: gridLayer,
      stats: stats
    }

  }


  return AggregateCubes;
});