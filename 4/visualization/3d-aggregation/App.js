define([
  "esri/config",
  "app/AggregateCubes",
  "esri/Map",
  "esri/views/SceneView",
  "esri/widgets/Legend",
  "esri/widgets/LayerList",
  "esri/widgets/Home",
  "esri/layers/FeatureLayer",
  "esri/core/workers",
  "esri/core/promiseUtils"
], function(
  esriConfig, AggregateCubes, Map,
  SceneView, Legend, LayerList, Home, 
  FeatureLayer, workers, promiseUtils
) {

  var quakesUrl = "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Oklahoma_earthquakes/FeatureServer/0";
  
  var resolution = 5000;  // meters
  var levels = -5;

  var kansasExtent = {
    xmax: -10834217,
    xmin: -10932882,
    ymax: 4493918,
    ymin: 4432667,
    spatialReference: {
      wkid: 3857
    }
  };

  var pointLayer = new FeatureLayer({
    url: quakesUrl,
    outFields: [ "depth" ],
    elevationInfo: {
      mode: "absolute-height",
      featureExpressionInfo: {
        expression: "-$feature.depth"
      },
      unit: "kilometers"
    },
    title: "earthquake location",
    renderer: {
      type: "simple",
      symbol: {
        type: "point-3d",
        symbolLayers: [{
          type: "object",
          material: { color: "white" },
          resource: { primitive: "sphere" },
          width: 75
        }]
      }
    }
  });

  esriConfig.workers.loaderConfig = {
    paths: {
      app: window.location.href.replace(/\/[^/]+$/, "")
    }
  };

  var view = new SceneView({
    container: "viewDiv",
    map: new Map({
      basemap: "topo",
      layers: [ pointLayer ]
    }),
    viewingMode: "local",
    clippingArea: kansasExtent,
    extent: kansasExtent,
    constraints: {
      collision: {
        enabled: false
      },
      tilt: {
        max: 179.99
      }
    },
    environment: {
      atmosphere: null,
      starsEnabled: false
    }
  });

  var App = function App() {};

  App.prototype = {
    run: function() {
      view.then(start);
    }
  };

  function start (){
    var legend = new Legend({
      view: view
    });
    var layerList = new LayerList({
      view: view
    });
    var home = new Home({
      view: view
    });

    view.ui.add(legend, "bottom-left");
    view.ui.add(layerList, "top-right");
    view.ui.add(home, "top-left");

    var aggCubes = new AggregateCubes();
    aggCubes.execute({
      layer: pointLayer,
      extent: kansasExtent,
      resolution: resolution,
      levels: levels
    }).then(function(response){
      var aggregateCubeLayer = response.gridLayer;

      view.map.add(aggregateCubeLayer);
    });
  }
  return App;
});
