define([
  "esri/config",
  "app/AggregateCubes",
  "esri/Map",
  "esri/views/SceneView",
  "esri/widgets/Legend",
  "esri/widgets/LayerList",
  "esri/widgets/Home",
  "esri/layers/FeatureLayer",
  "esri/layers/CSVLayer",
  "esri/core/workers",
  "esri/core/promiseUtils"
], function(
  esriConfig, AggregateCubes, Map,
  SceneView, Legend, LayerList, Home, 
  FeatureLayer, CSVLayer, workers, promiseUtils
) {

  var quakesUrl = "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Oklahoma_earthquakes/FeatureServer/0";
  var quakesCsvUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv";
  esriConfig.request.corsEnabledServers.push(quakesCsvUrl);

  var resolution = 2000;  // meters
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

  var csvLayer = new CSVLayer({
    url: quakesCsvUrl,
    elevationInfo: {
      mode: "absolute-height",
      featureExpressionInfo: {
        expression: "-1 * Number($feature.depth)"
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
          material: { color: "red" },
          resource: { primitive: "sphere" },
          width: 750
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
      layers: [ pointLayer ],
      ground: "world-elevation"
    }),
    viewingMode: "local",
    clippingArea: kansasExtent,
    extent: kansasExtent,
    popup: {
      collapsed: true
    },
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


    var aggregationParams = {
      layer: pointLayer,
      extent: kansasExtent,
      resolution: resolution,
      levels: levels
    };

    generate3DAggregation(aggregationParams);



    // view.ui.add("ui-controls", "bottom-right");

    // var startButton = document.getElementById("clip-extent-btn");
    // var clearButton = document.getElementById("clear-btn");

    // clearButton.addEventListener("click", function(){
    //   // view.viewingMode = "global";
    //   view.clippingArea = null;
    //   view.goTo({
    //     tilt: 45,
    //     zoom: 3
    //   });
    // });

    // startButton.addEventListener("click", function(){
    //   view.whenLayerView(csvLayer)
    //     .then(function(layerView){


    //     // view.viewingMode = "local";
    //     view.clippingArea = view.extent.clone();
        
    //     var aggregationParams = {
    //       layer: layerView.layer,
    //       layerView: layerView,
    //       extent: view.extent.toJSON(), //kansasExtent,
    //       resolution: resolution,
    //       levels: levels
    //     };
    
    //     generate3DAggregation(aggregationParams);

    //   });
    // });

  }

  function generate3DAggregation(params){
    var aggCubes = new AggregateCubes();

    aggCubes.execute(params)
      .then(function(response){
        var aggregateCubeLayer = response.gridLayer;
        view.map.add(aggregateCubeLayer);

        // createBinFilter(aggregateCubeLayer, response.stats);
      });
  }

  function createBinFilter(layer, stats){
    var allFeatures = layer.source.toArray();
    var countFilter = document.createElement("input");
    countFilter.setAttribute("type", "range");
    countFilter.min = 0;
    countFilter.max = stats.max;
    countFilter.value = 0;

    var uiDiv = document.getElementById("ui-controls");
    uiDiv.appendChild(countFilter);

    countFilter.addEventListener("change", function(event){
      // console.log(event.target.value);
      var filteredFeatures = filterFeatureCountGreaterThan(allFeatures, parseInt(event.target.value));
      console.log(filteredFeatures.length);
      // layer.source.removeAll();
      view.map.layers.getItemAt(1).source = filteredFeatures;
    });
  }

  function filterFeatureCountGreaterThan(features, lowerBound){
    return features.filter(function(feature){
      return feature.attributes.count >= lowerBound;
    });
  }
  return App;
});
