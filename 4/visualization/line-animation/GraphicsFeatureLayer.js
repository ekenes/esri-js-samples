define([
  "esri/layers/FeatureLayer",
  "esri/symbols/SimpleMarkerSymbol",

  "modules/spatialStats",
  "modules/filterUtils",
  "esri/core/lang",
], function(
  FeatureLayer, SimpleMarkerSymbol, spatialStats, filterUtils, lang
){

  var allFeatures = [];
  var eventsLayer = null;

  function getAllFeatures (layer){
    var q = layer.createQuery();
    return layer.load()
      .then(function(){
        return layer.queryFeatures(q);
      })
      .then(function(response){
        allFeatures = response.features;
        return allFeatures;
      }).otherwise(e => { console.log(e) });
  }

  function createLayer(portalItemId){
    eventsLayer = new FeatureLayer({
      portalItem: {
        id: portalItemId
      },
      outFields: ["*"],
      // definitionExpression: "GENERATION <= 2"
    });
    return eventsLayer;
  }

  function addHappenedUniqueValues(renderer){
    var r = renderer.clone();
    r.addUniqueValueInfo({
      value: "0-past",
      symbol: new SimpleMarkerSymbol({
        color: [85, 255, 0, 0.15],
        size: "8px",
        outline: {
          color: [85, 255, 0, 0.25],
          width: 0.5
        }
      })
    });

    r.addUniqueValueInfo({
      value: "m-past",
      symbol: new SimpleMarkerSymbol({
        color: [255, 0, 0, 0.15],
        size: "8px",
        outline: {
          color: [255, 0, 0, 0.25],
          width: 0.5
        }
      })
    });

    r.addUniqueValueInfo({
      value: "p-past",
      symbol: new SimpleMarkerSymbol({
        color: [0, 197, 255, 0.15],
        size: "8px",
        outline: {
          color: [0, 197, 255, 0.25],
          width: 0.5
        }
      })
    });

    return r;
  }

  var getEventsLayer = function(portalItemId){

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
        renderer: renderer,
        title: "Significant Events"
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

  var getGenerationsLayer = function(){}

  var getPeopleLayer = function(layer, features){
    return filterUtils.fetchUniqueValues(eventsLayer, "ID")
      .then(function(ids){
        console.log(ids);

        var gmcFeatures = ids.map( (id, i) => {
          var events = filterUtils.filterEventsForPerson(features, id);

          var gmc = spatialStats.geographicMeanCenter(events, true);

          var birthEvent = filterUtils.getBirthEvents(events)[0];
          var marriageEvent = filterUtils.getMarriageEvents(events)[0];
          var deathEvent = filterUtils.getDeathEvents(events)[0];

          var distBirthMarriage = birthEvent && marriageEvent ? spatialStats.distanceBetweenFeatures([birthEvent, marriageEvent], "kilometers") : -1;
          var distBirthDeath = birthEvent && deathEvent ? spatialStats.distanceBetweenFeatures([birthEvent, deathEvent], "kilometers") : -1;

          gmc.attributes.OBJECTID = i;
          gmc.attributes.ID = id;
          gmc.attributes.NAME = birthEvent ? lang.clone(birthEvent.attributes.NAME) : "";
          gmc.attributes.SURNAME = birthEvent ? lang.clone(birthEvent.attributes.SURNAME) : "";
          gmc.attributes.GENERATION = birthEvent ? lang.clone(birthEvent.attributes.GENERATION) : "";
          gmc.attributes.GEN_0_SIDE = birthEvent ? lang.clone(birthEvent.attributes.GEN_0_SIDE) : "";
          gmc.attributes.MOTHER = birthEvent ? lang.clone(birthEvent.attributes.MOTHER) : "";
          gmc.attributes.FATHER = birthEvent ? lang.clone(birthEvent.attributes.FATHER) : "";
          gmc.attributes.SPOUSE = marriageEvent ? lang.clone(marriageEvent.attributes.SPOUSE) : "";
          gmc.attributes.DIST_BIRTH_DEATH = distBirthDeath;
          gmc.attributes.DIST_BIRTH_MARRIAGE = distBirthMarriage;

          return gmc;
        });

        var layer = new FeatureLayer({
          title: "GMC by person",
          source: gmcFeatures,
          fields: [{
            name: "OBJECTID",
            alias: "OBJECTID",
            type: "oid"
          }, {
            name: "ID",
            alias: "ID",
            type: "string"
          }, {
            name: "NAME",
            alias: "NAME",
            type: "string"
          }, {
            name: "SURNAME",
            alias: "SURNAME",
            type: "string"
          }, {
            name: "GENERATION",
            alias: "GENERATION",
            type: "number"
          }, {
            name: "GEN_0_SIDE",
            alias: "GEN_0_SIDE",
            type: "string"
          }, {
            name: "MOTHER",
            alias: "MOTHER",
            type: "string"
          }, {
            name: "FATHER",
            alias: "FATHER",
            type: "string"
          }, {
            name: "DIST_BIRTH_DEATH",
            alias: "DIST_BIRTH_DEATH",
            type: "number"
          }, {
            fieldName: "DIST_BIRTH_MARRIAGE",
            alias: "DIST_BIRTH_MARRIAGE",
            type: "number"
          }],
          objectIdField: "OBJECTID",
          geometryType: "point",
          spatialReference: eventsLayer.spatialReference.clone(),
          renderer: {
            type: "simple",
            symbol: {
              type: "simple-marker",
              color: [255,0,0],
              size: 10,
              outline: {
                width: 1,
                color: [255,0,0]
              }
            }
          },
          popupTemplate: {
            title: "{NAME} {SURNAME}",
            content: "MOTHER: {MOTHER}; FATHER: {FATHER};<br>"
               + "b2d: {DIST_BIRTH_DEATH};" // b2m: {DIST_BIRTH_MARRIAGE}"
            // content: [{
            //   type: "fields",
            //   fieldInfos: [{
            //     fieldName: "GENERATION",
            //     // label: ""
            //   }, {
            //     fieldName: "GEN_0_SIDE",
            //     // label: ""
            //   }, {
            //     fieldName: "MOTHER",
            //     // label: ""
            //   }, {
            //     fieldName: "FATHER",
            //     // label: ""
            //   }, {
            //     fieldName: "DIST_BIRTH_DEATH",
            //     // label: ""
            //   }, {
            //     fieldName: "DIST_BIRTH_MARRIAGE",
            //     // label: ""
            //   }]
            // }]
          }
        })

        return {
          layer: layer
        };
      });
  }

  return {
    getEventsLayer: getEventsLayer,
    getGenerationsLayer: getGenerationsLayer,
    getPeopleLayer: getPeopleLayer
  };

});