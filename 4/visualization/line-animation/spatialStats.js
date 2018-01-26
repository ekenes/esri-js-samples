define([
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/core/lang"
], function(
  Point,
  Polyline,
  geometryEngine,
  Graphic,
  lang
){

  /**
   * Returns the geographic mean center of an array of Point features as a 
   * Point graphic.
   * 
   * @param {esri/Graphic[]} features - Point features.
   * @param {boolean} [weightByDate] - The name of a positive numeric field for which
   *   to weight the geographic mean center.
   * @param {string[]} [dimensionFields] - The names of numeric fields to average in the 
   *   resulting feature.
   * @param {number} [yearsInFuture] - The number of years in the future if all else remains the same.
   *   Use this param for predicting future 
   * 
   * @return {esri/Graphic} A graphic whose geometry represents the geographic mean center
   *   of the input points.
   */
   var geographicMeanCenter = function (features, weightByDate, dimensionFields, yearsInFuture){
    let xTotal = 0;
    let yTotal = 0;
    let numPoints = features.length;
    let weightedDenominator = numPoints;
    let age = 0;
    let sr = features[0].geometry.spatialReference.clone();
    let dimensionFieldValues = {};
    let yearsFuture = yearsInFuture ? yearsInFuture : 0;

    if(dimensionFields){
      dimensionFields.forEach( (field, i) => {
        if(typeof features[0].attributes[field] === "number"){
          dimensionFieldValues[field] = 0;
        }
      });
    }
    
    features.forEach(f => {
      let geometry = f.geometry;
      let weight = 1;

      if(weightByDate){
        if(f.attributes.age){
          weight = f.attributes.age;
        } else {
          let start = f.attributes.DATE;
          let end = f.attributes.END_DATE;
          if(start && end){
            weight = end > start ? getDays(end - start) : getDays((Date.now() + (yearsFuture * 31536000000)) - start);
          }
          age += weight;
        }

      }
      xTotal += (geometry.x * weight);
      yTotal += (geometry.y * weight);
      weightedDenominator += weight > 1 ? weight : 0;

      for (let name in dimensionFieldValues){
        dimensionFieldValues[name] += f.attributes[name];
      };
    });

    for (let name in dimensionFieldValues){
      dimensionFieldValues["avg_"+name] = dimensionFieldValues[name] / numPoints;
      delete dimensionFieldValues[name];
    }

    let avgX = xTotal / weightedDenominator;
    let avgY = yTotal / weightedDenominator;

    dimensionFieldValues.age = age;
    dimensionFieldValues.gmcX = avgX;
    dimensionFieldValues.gmcY = avgY;
    dimensionFieldValues.numPoints = numPoints;

    var gmcPoint = new Graphic({
      geometry: new Point({
        x: avgX,
        y: avgY,
        spatialReference: sr
      }),
      attributes: dimensionFieldValues
    });

    let totalDistanceToGMC = 0;

    features.forEach(f => {
      totalDistanceToGMC += distanceBetweenFeatures([gmcPoint,f],"kilometers");
    });

    gmcPoint.attributes["avg_dist_points_gmc"] = Math.round(totalDistanceToGMC / numPoints);

    return gmcPoint;
  }

  function getDays(milliseconds){
    return milliseconds / 1000 / 60 / 60 / 24;
  }

  /**
   * Calculates the distance between two features. Distances are rounded
   * to nearest unit. Precision is intended to be low.
   * @param {esri/Graphic[]} features - An array of to features.
   * @param {string} [units=meters] - The unit of measurement.
   * @return {number} The distance between the two features in the specified units.
   */
  var distanceBetweenFeatures = function (features, units){
    var geom1 = features[0].geometry;
    var geom2 = features[1].geometry;
    var u = units ? units : "meters";
    var polyline = new Polyline({
      paths: [[
        [ geom1.x, geom1.y ],
        [ geom2.x, geom2.y ]
      ]],
      spatialReference: geom1.spatialReference.clone()
    });
    return Math.round(geometryEngine.geodesicLength(polyline, u));
  }


  return {
    geographicMeanCenter: geographicMeanCenter,
    distanceBetweenFeatures: distanceBetweenFeatures
  };

});