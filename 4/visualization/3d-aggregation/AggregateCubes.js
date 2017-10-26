define([
  "esri/core/workers",
  "esri/geometry/SpatialReference",
  "esri/geometry/Extent",
  "esri/layers/FeatureLayer",
  "esri/Graphic",
  "esri/geometry/Point"
], function(
  workers,
  SpatialReference,
  Extent,
  FeatureLayer,
  Graphic,
  Point
){

  var AggregateCubes = function AggregateCubes() {};

  AggregateCubes.prototype = {
    execute: function (params) {
      var layer = params.layer;
      var extent = params.extent;
      var resolution = params.resolution;
      var levels = params.levels;
      var allFeatures = [];

      return layer.load()
        .then(function() {
          return queryFeatures({
            layer: layer,
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
    var geometry = params.geometry;
    var resolution = params.resolution;
    var levels = params.levels;
    var allFeatures = params.allFeatures;
    var num = params.num ? params.num : 2000;
    var exceededTransferLimit = typeof params.exceededTransferLimit === "undefined" ? true : params.exceededTransferLimit;
    var start = params.start ? params.start : 0;

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
    // query.geometry = geometry;

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
        return aggregatePoints;
      });
  }

  function createLayer(features) {
    var resolutionKm = features[0].attributes.resolution;

    var gridLayer = new FeatureLayer({
      source: features,
      opacity: 0.7, 
      title: (resolutionKm/1000) + "km cubed bins",
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
        title: "{count}",
        content: "{ObjectID}, {count}"
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
            { value: 2, color: [254, 240, 217, 0.05]/*0.05, label: "< 2" */},
            { value: 5, color: [253, 204, 138, 0.7]/*0.7*/, label: "< 10"  },
            { value: 10, color: [252, 141, 89, 1], label: "20" },
            { value: 15, color: [227, 74, 51, 1] },
            { value: 20, color: [179, 0, 0, 1], label: "> 50" }
          ]
        }]
      }
    });

    return {
      gridLayer: gridLayer
    }

  }


  return AggregateCubes;
});