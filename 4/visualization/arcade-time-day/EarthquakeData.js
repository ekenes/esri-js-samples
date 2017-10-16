define([
  "esri/layers/FeatureLayer",
  "esri/request",
  "esri/config",
], function (
  FeatureLayer, esriRequest, esriConfig
){

  var getFieldInfos = function(){
    return [{
      name: "ObjectID",
      alias: "ObjectID",
      type: "oid"
    }, {
      name: "title",
      alias: "title",
      type: "string"
    }, {
      name: "type",
      alias: "type",
      type: "string"
    }, {
      name: "place",
      alias: "place",
      type: "string"
    }, {
      name: "depth",
      alias: "depth",
      type: "string"
    }, {
      name: "time",
      alias: "time",
      type: "date"
    }, {
      name: "mag",
      alias: "Magnitude",
      type: "double"
    }, {
      name: "url",
      alias: "url",
      type: "string"
    }, {
      name: "mmi",
      alias: "intensity",
      type: "double"
    }, {
      name: "felt",
      alias: "Number of felt reports",
      type: "double"
    }, {
      name: "sig",
      alias: "significance",
      type: "double"
    }, {
      name: "tz",
      alias: "Time zone offset",
      type: "double"
    }];

  }

  function getPopupInfo(){
    return {
      title: "{title}",
      content: [{
        type: "fields",
        fieldInfos: [{
          fieldName: "time",
          label: "Time at browser location",
        }, {
          fieldName: "expression/arcade-time-epicenter",
        }, {
          fieldName: "expression/arcade-time-utc",
        }, {
          fieldName: "mag",
          label: "Magnitude"
        }, {
          fieldName: "depth",
          label: "Depth"
        }, {
          fieldName: "url",
          label: "More info"
        }]
      }],
      fieldInfos: [{
        fieldName: "time",
        format: {
          dateFormat: "short-date-short-time"
        }
      }],
      expressionInfos: [{
        name: "arcade-time-utc",
        title: "UTC time of event",
        expression: "Text(ToUTC($feature.time), 'M/D/Y, h:m a')"
      }, {
        name: "arcade-time-epicenter",
        title: "Time at epicenter",
        expression: "Text(DateAdd(ToUTC($feature.time), $feature.tz, 'minutes'), 'M/D/Y, h:m a')"
      }]
    };
  }
    
  function fetchFeatures (url){
    esriConfig.request.corsEnabledServers.push(url);
    return esriRequest(url, {
      responseType: "json"
    })
    .then(toEsriFeatures)
    .then(createLayer);
  };
    
  function toEsriFeatures (response){
      
    // raw GeoJSON data
    var geoJson = response.data;
    
    // Create an array of Graphics from each GeoJSON feature
    return geoJson.features.map(function(feature, i) {
      var lat = feature.geometry.coordinates[1];
      var lon = feature.geometry.coordinates[0];
      var z = -1000 * feature.geometry.coordinates[2];

      var attributes = feature.properties;
      attributes.ObjectID = i;
      attributes.depth = feature.geometry.coordinates[2] + " km";
      return {
        geometry: {
          x: lon,
          y: lat,
          z: z,
          type: "point",
          spatialReference: { wkid: 4326 }
        },
        attributes: attributes
      };
    });

  };

  function createLayer (features){
    var layer = FeatureLayer({
      source: features,
      fields: getFieldInfos(),
      popupTemplate: getPopupInfo(),
      objectIdField: "ObjectID",
      spatialReference: {wkid: 4326},
      geometryType: "point"
    });
    return layer.load();
  }
    
  return {
    getFeatureLayer: function(params){
      var time = params.time;
      var mag = params.mag;
      var validTimeResolutions = [ "hour", "day", "week", "month" ];
      var validMagFilters = [ "all", "1.0", "2.5", "4.5", "significant" ];

      var baseUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/";
      var url = baseUrl + mag + "_" + time + ".geojson";
      return fetchFeatures(url);
    }
  };

});