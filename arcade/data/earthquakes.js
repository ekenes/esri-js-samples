define([
  "esri/layers/FeatureLayer",
  "esri/dijit/PopupTemplate",
  "esri/request",
  "esri/config",
], function (
  FeatureLayer,
  PopupTemplate, esriRequest, esriConfig
){

  var url = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/";
  esriConfig.defaults.io.corsEnabledServers.push(url);

  var geometryType = "esriGeometryPoint";

  var sr = {
    wkid: 4326
  };

  var fields = [
  {
    name: "ObjectID",
    alias: "ObjectID",
    type: "esriFieldTypeOID"
  }, {
    name: "title",
    alias: "title",
    type: "esriFieldTypeString",
    length: 255
  }, {
    name: "type",
    alias: "type",
    type: "esriFieldTypeString",
    length: 255
  }, {
    name: "place",
    alias: "place",
    type: "esriFieldTypeString",
    length: 255
  }, {
    name: "depth",
    alias: "depth",
    type: "esriFieldTypeString",
    length: 255
  }, {
    name: "time",
    alias: "time",
    type: "esriFieldTypeDate"
  }, {
    name: "tz",
    alias: "time_zone",
    type: "esriFieldTypeDouble"
  }, {
    name: "mag",
    alias: "Magnitude",
    type: "esriFieldTypeDouble"
  }, {
    name: "url",
    alias: "url",
    type: "esriFieldTypeString",
    length: 255
  }, {
    name: "mmi",
    alias: "intensity",
    type: "esriFieldTypeDouble"
  }, {
    name: "felt",
    alias: "Number of felt reports",
    type: "esriFieldTypeDouble"
  }, {
    name: "sig",
    alias: "significance",
    type: "esriFieldTypeDouble"
  }];

  var requestParams = {
    url: url + "all_month.geojson",
    handleAs: "json"
  };

  var requestData = esriRequest(requestParams);

  return requestData.then(function(response){
    console.log(response);
    // sort earthquakes by magnitude
    // large magnitude earthquakes on bottom, small ones on top
    return response.features.sort(function(a, b){
      return b.properties.mag - a.properties.mag;
    });
  }).then(function(geoJson){

    return geoJson.map(function(feature, i){
      var lon = feature.geometry.coordinates[0];
      var lat = feature.geometry.coordinates[1];

      var geom = {
        spatialReference: sr,
        x: lon,
        y: lat
      };

      return {
        geometry: geom,
        attributes: {
          ObjectID: i,
          title: feature.properties.title,
          type: feature.properties.type,
          place: feature.properties.place,
          depth: feature.geometry.coordinates[2] + " km",
          time: feature.properties.time,
          tz: feature.properties.tz,
          mag: feature.properties.mag,
          mmi: feature.properties.mmi,
          felt: feature.properties.felt,
          sig: feature.properties.sig,
          url: feature.properties.url
        }
      };

    });
  }).then(function(esriFeatures){
    console.log("esri features: ", esriFeatures);
    return {
      features: esriFeatures,
      geometryType: geometryType,
      spatialReference: sr
    };
  }).then(function(featureSet){

    var layerDef = {
      geometryType: geometryType,
      fields: fields,
      spatialReference: sr,
      objectIdFieldName: "ObjectID"
    };

    var earthquakeLayer = new FeatureLayer({
      layerDefinition: layerDef,
      featureSet: featureSet
    }, {
      mode: FeatureLayer.MODE_SNAPSHOT,
      infoTemplate: new PopupTemplate({
        title: "{title}",
        description: "<b>Location:</b> {place}<br>" +
          "<b>Date and time:</b> {time}<br>" +
          "<b>Magnitude (0-10): </b> {mag}<br>" +
          "<b>Intensity (1-10): </b> {mmi}<br>" +
          "<b>Depth: </b> {depth}<br>" +
          "<b>Number who reported feeling the quake: </b> {felt}<br>" +
          "<b>Significance: </b> {sig}<br><br>" +
          "<a href='{url}'>View more information provided by the USGS</a>",
        fieldInfos: [{
          fieldName: "time",
          format: {
            dateFormat: "shortDateShortTime"
          }
        }, {
          fieldName: "felt",
          format: {
            digitSeparator: true,
            places: 0
          }
        }]
      })
    });

    return earthquakeLayer;
  });
});