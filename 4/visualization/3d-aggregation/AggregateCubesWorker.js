define([
  "esri/core/promiseUtils",
  "esri/Graphic",
  "esri/geometry/support/jsonUtils",
  "esri/geometry/support/webMercatorUtils"
], function(
  promiseUtils,
  Graphic, jsonUtils, webMercatorUtils
) {

  var AggregateCubesWorker = function() {};

  AggregateCubesWorker.prototype = {
    execute: function(params) {
      var pointFeatures = params.pointFeatures;
      var extent = params.extent;
      var resolution = params.resolution;
      var levels = params.levels;

      var grid = create3DGrid(extent, resolution, levels);

      var gridCellsWithStats = grid.map(function(cell){
        var stats = getStatsInCube(pointFeatures, cell);
        cell.attributes.count = stats.count;
        return cell.toJSON();
      }).filter(function(cell){
        return cell.attributes.count > 0;
      });
      var counts = getValuesArray(gridCellsWithStats, "count");

      return promiseUtils.resolve({
        data: {
          aggregatePoints: gridCellsWithStats,
          statsByField: {
            count: {
              min: getMin(counts),
              max: getMax(counts),
              avg: getAverage(counts),
              stddev: getStandardDeviation(counts),
              count: getCount(counts)
            }
          }
        }
      });
    }
  }

  function create3DGrid(extent, resolution, levels){
    var centroids = [];
    var gridCells2D = [];
    var xmin = extent.xmin;
    var xmax = extent.xmax;
    var ymin = extent.ymin;
    var ymax = extent.ymax;

    var height = levels * resolution;

    var columns = Math.round((xmax - xmin) / resolution);
    var rows = Math.round((ymax - ymin) / resolution);
    var shelves = Math.abs(levels);
    var numCells = columns * rows * shelves;

    var attributes;
    var centroid;
    var oidCount = 0;
    
    for(var s = 0; s < shelves; s++){
      for(var r = 0; r < rows; r++){
        for(var c = 0; c < columns; c++){

          attributes = {
            row: r,
            column: c,
            shelf: s,
            ObjectID: oidCount++,
            resolution: resolution,
            xmin: xmin + (resolution * c),
            xmax: xmin + (resolution * (c+1)),
            ymin: ymin + (resolution * r),
            ymax: ymin + (resolution * (r+1)),
            zmax: height < 0 ? -1 * s * resolution : 1 * s * resolution,
            zmin: height < 0 ? -1 * (s+1) * resolution : 1 * (s+1) * resolution
          };

          centroid = {
            type: "point",
            x: attributes.xmin + ((attributes.xmax - attributes.xmin) * 0.5),
            y: attributes.ymin + ((attributes.ymax - attributes.ymin) * 0.5),
            z: attributes.zmin + ((attributes.zmax - attributes.zmin) * 0.5),
            spatialReference: extent.spatialReference
          };

          var cell3d = new Graphic({
            attributes: attributes,
            geometry: centroid
          });

          centroids.push(cell3d);
        }
      }
    }
    return centroids;
  }

  function getStatsInCube(pointFeatures, extentCentroid){
    
    var cellXmin = extentCentroid.attributes.xmin;
    var cellXmax = extentCentroid.attributes.xmax;
    var cellYmin = extentCentroid.attributes.ymin;
    var cellYmax = extentCentroid.attributes.ymax;
    var cellZmin = extentCentroid.attributes.zmin;
    var cellZmax = extentCentroid.attributes.zmax;

    var features = pointFeatures.filter(function(feature){
      // var geometryFromJson = jsonUtils.fromJSON(feature.geometry);
      var geometry = feature.geometry.spatialReference.wkid === 4326 ? webMercatorUtils.geographicToWebMercator(jsonUtils.fromJSON(feature.geometry)) : feature.geometry;
      var z = -1000 * parseFloat(feature.attributes.depth);
      
      var withinXBounds = geometry.x >= cellXmin && geometry.x < cellXmax;
      var withinYBounds = geometry.y >= cellYmin && geometry.y < cellYmax;
      var withinZBounds = z >= cellZmin && z < cellZmax;

      return withinXBounds && withinYBounds && withinZBounds;
    });
    var count = features.length;
    var stats = {
      count: count
    };

    return stats;
  }

  function getMax(a){
    var max = a.length ? -Infinity : 0;
    a.forEach(function(val){
      if (val >= max){
        max = val;
      }
    });
    return max;
  }

  function getMin(a){
    var min = a.length ? Infinity : 0;
    a.forEach(function(val){
      if (val <= min){
        min = val;
      }
    });
    return min;
  }

  function getAverage(a){
    var sum = 0;
    var num = a.length ? a.length : 1;
    a.forEach(function(val){
      sum += val;
    });
    return sum / num;
  }

  function getValuesArray(a, valueName){
    return a.map(function(item){
      return item.attributes[valueName];
    });
  }

  function getStandardDeviation(a){
    var avg = getAverage(a);

    var squareDiffs = a.map(function(value){
      var diff = value - avg;
      var sqrDiff = diff * diff;
      return sqrDiff;
    });

    var avgSquareDiff = getAverage(squareDiffs);

    var stdDev = Math.sqrt(avgSquareDiff);
    return stdDev;
  }

  function getCount(a){
    return a.length;
  }

  return AggregateCubesWorker;

});