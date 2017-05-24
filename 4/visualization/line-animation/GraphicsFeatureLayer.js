define([
  "esri/layers/FeatureLayer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/core/lang",
], function(
  FeatureLayer, SimpleMarkerSymbol, lang
){

  function getAllFeatures (layer){
    var q = layer.createQuery();
    return layer.load().queryFeatures(q)
      .then(function(response){
        return response.features;
      });
  }

  function createLayer(portalItemId){
    return new FeatureLayer({
      portalItem: {
        id: portalItemId
      },
      outFields: ["*"],
      definitionExpression: "GENERATION <= 1"
    });
  }

  function addHappenedUniqueValues(renderer){
    var r = renderer.clone();
    r.addUniqueValueInfo({
      value: "0-past",
      symbol: new SimpleMarkerSymbol({
        color: [85, 255, 0, 0.25],
        size: "8px",
        outline: {
          color: [85, 255, 0, 0.5],
          width: 1
        }
      })
    });

    r.addUniqueValueInfo({
      value: "m-past",
      symbol: new SimpleMarkerSymbol({
        color: [255, 0, 0, 0.25],
        size: "8px",
        outline: {
          color: [255, 0, 0, 0.5],
          width: 1
        }
      })
    });

    r.addUniqueValueInfo({
      value: "p-past",
      symbol: new SimpleMarkerSymbol({
        color: [0, 197, 255, 0.25],
        size: "8px",
        outline: {
          color: [0, 197, 255, 0.5],
          width: 1
        }
      })
    });

    return r;
  }

  var getLayer = function(portalItemId){

    var layer = createLayer(portalItemId);

    return getAllFeatures(layer)
      .then(function(features){

      var renderer = addHappenedUniqueValues(layer.renderer);

      var graphicsFeatureLayer = new FeatureLayer({
        source: [],//features,
        fields: lang.clone(layer.fields),
        objectIdField: lang.clone(layer.objectIdField),
        geometryType: lang.clone(layer.geometryType),
        spatialReference: layer.spatialReference.clone(),
        renderer: renderer
      });

      return graphicsFeatureLayer.load()
        .then(function(){

        return {
          layer: graphicsFeatureLayer,
          features: features
        };

      });

    });

  };

  return {
    getLayer: getLayer
  };

});