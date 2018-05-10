define([
  "esri/layers/FeatureLayer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/Graphic",
  "esri/geometry/Polyline",
  "esri/geometry/geometryEngine",

  "modules/spatialStats",
  "modules/filterUtils",
  "esri/core/lang",
], function(
  FeatureLayer, SimpleMarkerSymbol, Graphic, Polyline, geometryEngine, spatialStats, filterUtils, lang
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
      // definitionExpression: "GENERATION <= 1"
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

  var getGenerationsLayer = function(features, splitBySide){

    let fieldsToSummarize = [
      "DIST_BIRTH_DEATH",
      "DIST_BIRTH_MARRIAGE",
      "numPoints",
      "age"
    ];

    let gmcFeatures = [];
    // gmcFeatures.push(filterUtils.filterPeopleByGeneration(features, 0)[0]);
    
    let objId = 0;

    for(let i = 1; i <= 6; i++){

      let generationFeatures = [];

      if(i === 1){
        let gen0 = filterUtils.filterPeopleByGeneration(features, 0);
        let gen1 = filterUtils.filterPeopleByGeneration(features, 1);
        generationFeatures = gen0.concat(gen1);
      } else {
        generationFeatures = filterUtils.filterPeopleByGeneration(features, i);
      }
      
      if(!splitBySide || i === 1){
        let gmc = spatialStats.geographicMeanCenter(generationFeatures, false, fieldsToSummarize);
        gmc.attributes.OBJECTID = objId++;
        gmc.attributes.GENERATION = i;
        gmc.attributes.isGMC = true;
        gmcFeatures.push(gmc);
      } else {
        let maternalFeatures = filterUtils.filterPeopleBySide(generationFeatures, "m");
        let gmcM = spatialStats.geographicMeanCenter(maternalFeatures, false, fieldsToSummarize);
        gmcM.attributes.OBJECTID = objId++;
        gmcM.attributes.GENERATION = i;
        gmcM.attributes.GEN_0_SIDE = "m";
        gmcM.attributes.isGMC = true;
        gmcFeatures.push(gmcM);

        let paternalFeatures = filterUtils.filterPeopleBySide(generationFeatures, "p");
        let gmcP = spatialStats.geographicMeanCenter(paternalFeatures, false, fieldsToSummarize);
        gmcP.attributes.OBJECTID = objId++;
        gmcP.attributes.GENERATION = i;
        gmcP.attributes.GEN_0_SIDE = "p";
        gmcP.attributes.isGMC = true;
        gmcFeatures.push(gmcP);
      }
    }

    const expressionInfos = [{
      name: "title",
      title: "Generation",
      expression: `
        var side = IIF(IsEmpty($feature.GEN_0_SIDE), "", $feature.GEN_0_SIDE);
        var gen = $feature.GENERATION;
        var finalDigit = Number(Right(gen, 1));
        var genSuffix = WHEN(
          finalDigit == 1, 'st',
          finalDigit == 2, 'nd',
          finalDigit == 3, 'rd',
          'th'
        );
        gen + genSuffix + ' generation ' + WHEN(side == 'm', 'maternal', side == 'p', 'paternal', '');
      `
    }]

    let layer = new FeatureLayer({
      title: "GMC by generation",
      source: gmcFeatures,
      fields: [{
        name: "OBJECTID",
        alias: "OBJECTID",
        type: "oid"
      }, {
        name: "GENERATION",
        alias: "GENERATION",
        type: "number"
      }, {
        name: "GEN_0_SIDE",
        alias: "Side of generation 0's family",
        type: "string"
      }, {
        name: "DIST_BIRTH_DEATH",
        alias: "DIST_BIRTH_DEATH",
        type: "number"
      }, {
        name: "DIST_BIRTH_MARRIAGE",
        alias: "DIST_BIRTH_MARRIAGE",
        type: "number"
      }, {
        name: "avg_dist_points_gmc",
        alias: "avg_dist_points_gmc",
        type: "number"
      }, {
        name: "avg_DIST_BIRTH_DEATH",
        alias: "avg_DIST_BIRTH_DEATH",
        type: "number"
      }, {
        name: "avg_DIST_BIRTH_MARRIAGE",
        alias: "avg_DIST_BIRTH_MARRIAGE",
        type: "number"
      }, {
        name: "avg_numPoints",
        alias: "avg_numPoints",
        type: "number"
      }],
      objectIdField: "OBJECTID",
      geometryType: "point",
      spatialReference: eventsLayer.spatialReference.clone(),
      renderer: {
        type: "unique-value",
        valueExpression: `
          var g = $feature.GENERATION;
          var s = $feature.GEN_0_SIDE;
          IIF(g<=1, '0-1', s);
        `,
        defaultSymbol: {
          type: "simple-marker",
          color: "gray",
          style: "diamond",
          size: 16,
          outline: {
            width: 6,
            color: "light-gray"
          }
        },
        uniqueValueInfos: [{
          value: "0-1",
          symbol: {
            type: "simple-marker",
            style: "diamond",
            color: "#8eebb7",
            size: 16,
            outline: {
              width: 6,
              color: [ 81, 177, 132, 0.5 ]
            }
          },
          label: "First generation"
        }, {
          value: "m",
          symbol: {
            type: "simple-marker",
            style: "diamond",
            color: "#fb9fe0",
            size: 16,
            outline: {
              width: 6,
              color: [ 247, 96, 199, 0.5 ]
            }
          },
          label: "Maternal side"
        }, {
          value: "p",
          symbol: {
            type: "simple-marker",
            style: "diamond",
            color: "#97b9d3",
            size: 16,
            outline: {
              width: 6,
              color: [ 129, 150, 216, 0.5 ]
            }
          },
          label: "Paternal side"
        }]
      },
      popupTemplate: {
        title: "{expression/title}",
        content: "birth to death: {avg_DIST_BIRTH_DEATH}; birth to marriage: {avg_DIST_BIRTH_MARRIAGE}",
        expressionInfos: expressionInfos,
        content: [{
          type: "fields",
          fieldInfos: [{
            fieldName: "GENERATION",
            // label: ""
          }, {
            fieldName: "GEN_0_SIDE",
            // label: ""
          }, {
            fieldName: "avg_DIST_BIRTH_DEATH",
            // label: ""
          }, {
            fieldName: "avg_DIST_BIRTH_MARRIAGE",
            // label: ""
          }, {
            fieldName: "avg_dist_points_gmc",
            // label: ""
          }]
        }]
      }
    });
    
    return {
      layer: layer,
      features: gmcFeatures
    }
  }

  var getPeopleLayer = function(features){
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

          gmc.attributes.isGMC = true;
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
            name: "DIST_BIRTH_MARRIAGE",
            alias: "DIST_BIRTH_MARRIAGE",
            type: "number"
          }, {
            name: "avg_dist_points_gmc",
            alias: "Average distance to events",
            type: "number"
          }],
          objectIdField: "OBJECTID",
          geometryType: "point",
          spatialReference: eventsLayer.spatialReference.clone(),
          renderer: {
            type: "unique-value",
            valueExpression: `
              var g = $feature.GENERATION;
              var s = $feature.GEN_0_SIDE;
              IIF(g==0, 'beginning', s);
            `,
            defaultSymbol: {
              type: "simple-marker",
              color: "gray",
              size: 6,
              outline: {
                width: 3,
                color: "light-gray"
              }
            },
            uniqueValueInfos: [{
              value: "beginning",
              symbol: {
                type: "simple-marker",
                color: "#8eebb7",
                size: 6,
                outline: {
                  width: 3,
                  color: [ 81, 177, 132, 0.5 ]
                }
              },
              label: "First generation"
            }, {
              value: "m",
              symbol: {
                type: "simple-marker",
                color: "#fb9fe0",
                size: 6,
                outline: {
                  width: 3,
                  color: [ 247, 96, 199, 0.5 ]
                }
              },
              label: "Maternal side"
            }, {
              value: "p",
              symbol: {
                type: "simple-marker",
                color: "#97b9d3",
                size: 6,
                outline: {
                  width: 3,
                  color: [ 129, 150, 216, 0.5 ]
                }
              },
              label: "Paternal side"
            }],
            visualVariables: [{
              type: "size",
              field: "avg_dist_points_gmc",
              minSize: 6,
              maxSize: 50,
              minDataValue: 0,
              maxDataValue: 4000
            }]
          },
          popupTemplate: {
            title: "{NAME} {SURNAME}",
            content:  // "MOTHER: {MOTHER}; FATHER: {FATHER};<br>"
              // + "dist to events: {avg_dist_points_gmc};" // b2m: {DIST_BIRTH_MARRIAGE}"
            // }, 
            [{
              type: "fields",
              fieldInfos: [{
                fieldName: "GENERATION",
                // label: ""
              }, {
                fieldName: "GEN_0_SIDE",
                // label: ""
              }, {
                fieldName: "MOTHER",
                // label: ""
              }, {
                fieldName: "FATHER",
                // label: ""
              }, {
                fieldName: "DIST_BIRTH_DEATH",
                // label: ""
              }, {
                fieldName: "avg_dist_points_gmc",
                label: "Avg distance to events (km)"
              }, {
                fieldName: "DIST_BIRTH_MARRIAGE",
                // label: ""
              }]
            }]
          }
        });

        return {
          layer: layer,
          features: gmcFeatures
        };
      });
  };

  var connectPersonGMCtoEvents = function(gmcFeature){

    let allEvents = allFeatures;
    let id = gmcFeature.attributes.ID;
    let eventFeatures = filterUtils.filterEventsForPerson(allEvents, id);

    let connectors = eventFeatures.map(f => {

      var straightLine = new Polyline({
        paths: [[
          [ f.geometry.x, f.geometry.y ],
          [ gmcFeature.geometry.x, gmcFeature.geometry.y ]
        ]],
        spatialReference: eventsLayer.spatialReference.clone()
      });

      var connector = new Graphic({
        attributes: {
          personId: id,
        },
        geometry: geometryEngine.geodesicDensify(straightLine, 100, "kilometers"),
        symbol: {
          type: "simple-line",
          color: [ 255, 255, 255, 0.3 ],
          width: 1
        }
      });

      return connector;
    });

    return {
      gmcFeature: gmcFeature,
      events: eventFeatures,
      connectors: connectors 
    };
  };


  var connectGenerationToPeople = function(genGMCfeature, peopleGMCfeatures, matchSide){

    var peopleFeatures = peopleGMCfeatures.filter(person => {
      var personGen = person.attributes.GENERATION === 0 ? 1 : person.attributes.GENERATION;
      var sideMatch = personGen <= 1 || person.attributes.GEN_0_SIDE === genGMCfeature.attributes.GEN_0_SIDE;
      var genMatch = personGen === genGMCfeature.attributes.GENERATION;

      return matchSide ? sideMatch && genMatch : sideMatch;
    });

    let connectors = peopleFeatures.map(f => {

      var straightLine = new Polyline({
        paths: [[
          [ f.geometry.x, f.geometry.y ],
          [ genGMCfeature.geometry.x, genGMCfeature.geometry.y ]
        ]],
        spatialReference: eventsLayer.spatialReference.clone()
      });

      var connector = new Graphic({
        attributes: {
          GENERATION: genGMCfeature.attributes.GENERATION,
        },
        geometry: geometryEngine.geodesicDensify(straightLine, 100, "kilometers"),
        symbol: {
          type: "simple-line",
          color: [ 255, 255, 255, 0.3 ],
          width: 1
        }
      });

      return connector;
    });

    return {
      gmcFeature: genGMCfeature,
      people: peopleFeatures,
      connectors: connectors 
    };
  }


  return {
    connectGenerationToPeople: connectGenerationToPeople,
    connectPersonGMCtoEvents: connectPersonGMCtoEvents,
    getEventsLayer: getEventsLayer,
    getGenerationsLayer: getGenerationsLayer,
    getPeopleLayer: getPeopleLayer
  };

});