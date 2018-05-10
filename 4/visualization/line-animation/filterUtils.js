define([
  "esri/geometry/Point",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/renderers/smartMapping/statistics/uniqueValues",
  "esri/core/lang"
], function(
  Point,
  geometryEngine,
  Graphic,
  uniqueValues,
  lang
){

  var filterPeopleByGeneration = function(features, generation){
    return features.filter(f => { return f.attributes.GENERATION === generation});
  }

  var filterPeopleBySide = function(features, side){
    return features.filter(f => { return f.attributes.GEN_0_SIDE === side});
  }
  
  var filterEventsForPerson = function (features, id){
    return features.filter(f => { return f.attributes.ID === id });
  };

  var getBirthEvents = function (features){
    return features.filter(f => { return f.attributes.EVENT === "birth" });
  };

  var getMarriageEvents = function (features){
    return features.filter(f => { return f.attributes.EVENT === "marriage" });
  };

  var getDeathEvents = function (features){
    return features.filter(f => { return f.attributes.EVENT === "death" });
  };

  var fetchUniqueValues = function (layer, fieldName){
    return uniqueValues({
      layer: layer,
      field: fieldName
    }).then(r => { return r.uniqueValueInfos.map(info => { return info.value }) });
  };

  


  return {
    filterPeopleByGeneration: filterPeopleByGeneration,
    filterPeopleBySide: filterPeopleBySide,
    filterEventsForPerson: filterEventsForPerson,
    getBirthEvents: getBirthEvents,
    getMarriageEvents: getMarriageEvents,
    getDeathEvents: getDeathEvents,
    fetchUniqueValues: fetchUniqueValues
  };

});