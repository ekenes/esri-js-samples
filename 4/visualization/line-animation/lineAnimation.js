define([
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/geometryEngine",
  "esri/symbols/SimpleLineSymbol",
  "esri/Graphic",
  "esri/core/promiseUtils",
  "dojo/Deferred",
  "esri/core/lang"
], function(
  Point,
  Polyline,
  geometryEngine,
  SimpleLineSymbol,
  Graphic,
  promiseUtils,
  Deferred,
  lang
){

  /**
   * Creates a line animation between the two given points in the
   * given view. You can optionally specify the duration of the animation in
   * milliseconds.
   *
   * @param {Object} params - See the table below for a list of parameters.
   * @param {module:esri/geometry/Point} params.start - Starting point.
   * @param {module:esri/geometry/Point} params.end - Ending point.
   * @param {module:esri/views/View} params.view - The view in which to animate the line.
   * @param {number} [params.duration] - The duration of the animation in milliseconds. The
   *   default value is 1000.
   *
   * @return {module:esri/Graphic} - Returns the completed line graphic in its final,
   * densified state.
   */
  var animateLine = function (params){
    var startPoint = params.startPoint;
    var endPoint = params.endPoint;
    var duration = params.duration ? params.duration : 1000;
    var view = params.view;
    var color = getGraphicColor(endPoint);
    var animateEndPoint = params.animateEndPoint;
    var lineEffect = params.lineEffect;

    var lineGraphic = createLine(startPoint, endPoint, color);
    var lineGeometry = lineGraphic.geometry.clone();
    var lineLength = geometryEngine.geodesicLength(lineGeometry, "meters");
    var TOLERANCE = lineLength / 150;
    var lineDensified = densifyLine(lineGeometry, TOLERANCE, params.offset, view.scale);
    lineGraphic.geometry = lineDensified;

    var numPaths = lineDensified.paths.length;

    if (numPaths === 2 && startPoint.geometry.x < endPoint.geometry.x){
      lineDensified.paths = lineDensified.paths.reverse();
    }

    var path1vertexCount = lineDensified.paths[0].length;
    var path2vertexCount = numPaths === 2 ? lineDensified.paths[1].length : 0;

    var numVertices = getPolylineVerticeCount(lineDensified); //  lineDensified.paths[0].length;
    var interval = duration / numVertices;
    var vertexCounter = 0;
    var updatedLineGeom, updatedLineGraphic;
    var previousSegment;
    var previousPointGraphic;
    var dfd = new Deferred();

    var drawSegmentsInterval = setInterval(function(){
      vertexCounter++;

      if(vertexCounter > numVertices){

        if (view.graphics.includes(previousPointGraphic)){
          view.graphics.remove(previousPointGraphic);
          // view.graphics.removeAll();
        }

        if (lineEffect === "none" && animateEndPoint){
          dfd.resolve(lineGraphic);
          return;
        }

        if(lineEffect === "trail"){
          var numVerticesRemove = getPolylineVerticeCount(updatedLineGeom); // updatedLineGeom.paths[0].length;
          var pathIndexRemove;

          if(numPaths === 1){
            pathIndexRemove = 0;
          } else {
            if (updatedLineGeom.paths[0].length > 0){
              pathIndexRemove = 0;
            } else {
              pathIndexRemove = 1;
            }
          }

          if(numVerticesRemove === numVertices + 1){
            dfd.resolve(lineGraphic);
          }

          if(numVerticesRemove === 1){
            stopAnimation(drawSegmentsInterval);
            return;
          }

          // using numVertices - 1 unanimates the line in the opposite direction
          updatedLineGeom = removeLineSegment(updatedLineGeom, 0, pathIndexRemove);

          previousSegment = drawSegment(updatedLineGeom, previousSegment, view, color, lineGraphic.attributes.isMarriage);
        } else if (lineEffect === "retain"){
          stopAnimation(drawSegmentsInterval);
          dfd.resolve(lineGraphic);
          return;
        }

      } else {

        var pathIndex;
        var pointIndex;
        if (numPaths === 1){
          pathIndex = 0;
          pointIndex = vertexCounter-1;
        } else {

          if(vertexCounter <= path1vertexCount){
            pathIndex = 0;
            pointIndex = vertexCounter-1;
          } else {
            pathIndex = 1;
            pointIndex = vertexCounter - path1vertexCount - 1;
          }

        }

        var currentPointCoords = lineDensified.paths[pathIndex][pointIndex];
        updatedLineGeom = addLineSegment(updatedLineGeom, currentPointCoords, pathIndex);

        if (lineEffect === "none"){
          previousSegment = new Graphic({
            geometry: updatedLineGeom
          });
        } else {
          previousSegment = drawSegment(updatedLineGeom, previousSegment, view, color, lineGraphic.attributes.isMarriage);
        }

        if (animateEndPoint){
          var pointSymbol = getGraphicSymbol(endPoint);
          var updatedPoint = createPoint(currentPointCoords[0], currentPointCoords[1], pointSymbol);
          previousPointGraphic = drawPoint(updatedPoint, previousPointGraphic, view);
        }
      }



    }, interval);
    return dfd.promise;
  }

  function getPolylineVerticeCount(polyline){
    var count = 0;
    polyline.paths.forEach(function(path){
      count += path.length;
    });
    return count;
  }

  function densifyLine(geometry, tolerance, offset, scale){
    var line = geometryEngine.geodesicDensify(geometry, tolerance, "meters");
    var sf = scale / 14791438.1897888;
    return offset ? geometryEngine.offset(line, tolerance*sf, "meters") : line;
  }

  function stopAnimation(interval){
    clearInterval(interval);
  }

  function getGraphicColor (graphic){
    var symbol = getGraphicSymbol(graphic);
    var color = symbol.color.clone();
    color.a = 0.25;
    return color; //symbol.color.clone();
  }

  function getGraphicSymbol (graphic){
    var renderer = graphic.layer.renderer;
    var uv = renderer.getUniqueValueInfo(graphic);
    return uv.symbol.clone();
  }

  // This function assumes a densified line

  /**
   * Removes a line from the given view by "un animating" it.
   *
   * @param {Object} params - See the table below for the method parameters.
   * @param {module:esri/Graphic} lineGraphic - The line graphic to unanimate.
   * @param {number} [params.duration] - The duration of the unanimation.
   * @param {module:esri/views/View} - The view in which the graphic is drawn.
   */
  var unAnimateLine = function (params){
    var lineGraphic = params.lineGraphic;
    var view = params.view;
    var duration = params.duration ? params.duration : 1000;
    var lineGeometry = lineGraphic.geometry;

    if(!lineGraphic || !view || lineGeometry.type !== "polyline"){
      return new Error("A line graphic and view were not provided.");
    }

    var lineLength = geometryEngine.geodesicLength(lineGeometry, "meters");
    var TOLERANCE = lineLength / 150;

    var numVertices = lineGeometry.paths[0].length;
    var interval = duration / numVertices;
    var updatedLineGeom = lineGeometry.clone();
    var previousSegment;

    if (view.graphics.includes(lineGraphic)){
      view.graphics.remove(lineGraphic);
      // view.graphics.removeAll();
    }

    var removeSegmentsInterval = setInterval(function(){
      var numVertices = updatedLineGeom.paths[0].length;

      if(numVertices === 1){
        stopAnimation(removeSegmentsInterval);
        return;
      }

      // using numVertices - 1 unanimates the line in the opposite direction
      updatedLineGeom = removeLineSegment(updatedLineGeom, 0);//numVertices-1);
      previousSegment = drawSegment(updatedLineGeom, previousSegment, view, color);

    }, interval);
  }

  function createPoint(x,y, symbol){
    var point = new Point({
      x: x,
      y: y,
      spatialReference: { wkid: 3857 }
    });

    return new Graphic({
      geometry: point,
      symbol: symbol
    })
  }

  /**
   * Creates a two-vertex polyline with a
   * start point and an end point.
   *
   * @param {module:esri/Graphic} start - Starting point. A graphic with a point geometry.
   * @param {module:esri/Graphic} end - Ending point. A graphic with a point geometry.
   *
   * @return {module:esri/Graphic} Returns a graphic with
   * a polyline geometry. This graphic contains the same attributes as
   * the start and end point.
   */
  function createLine(start, end, color) {
    var startEvent = start.attributes.EVENT;
    var endEvent = end.attributes.EVENT;
    var isMarriage = startEvent === "marriage" || endEvent === "marriage";

    var line = new Polyline({
      spatialReference: {wkid: 3857}
    });
    line.addPath([]);
    line.insertPoint(0,0,start.geometry);
    line.insertPoint(0,1,end.geometry);
    return new Graphic({
      geometry: line,
      attributes: {
        startPoint: lang.clone(start.attributes),
        endPoint: lang.clone(end.attributes),
        isMarriage: isMarriage
      },
      symbol: new SimpleLineSymbol({
        color: color ? color : [255,0,0,0.5],
        width: 3,
        style: isMarriage ? "short-dot" : "solid"
      })
    });
  }

  function denormalizePoint(point){
    return new Point({
      longitude: point.longitude + 360,
      latitude: point.latitude,
      spatialReference: point.spatialReference
    });
  }

  /**
   * Adds a new segment to an existing line during animation.
   * @param {module:esri/geometry/Polyline} line - Line geometry to update.
   * @param {number[]} newPointCoords - An array of x,y coordinates used to update
   *   path of line animation.
   * @return {module:esri/geometry/Polyline} Returns the line with the updated coordinate.
   */
  function addLineSegment(line, newPointCoords, pathIndex){
    var lineGeom;
    if (line){
      lineGeom = line;
      if (pathIndex === 1 && lineGeom.paths.length === 1){
        lineGeom.addPath([]);
      }
    } else {
      lineGeom = new Polyline({
        paths: [newPointCoords, newPointCoords],
        spatialReference: { wkid: 3857 }
      });
      return lineGeom;
    }

    var newPoint = new Point({
      x: newPointCoords[0],
      y: newPointCoords[1],
      spatialReference: { wkid: 3857 }
    });
    return lineGeom.insertPoint(pathIndex,lineGeom.paths[pathIndex].length, newPoint);
  }

  function removeLineSegment(lineGeometry, vertexIndex, pathIndex){
    //var line = lineGeometry.clone();
    lineGeometry.removePoint(pathIndex, vertexIndex);
    return lineGeometry;//line;
  }

  function drawSegment(lineGeom, previousSegmentGraphic, view, color, isMarriage){
    if(previousSegmentGraphic){
      // view.graphics.remove(previousSegmentGraphic);
      view.graphics.removeAll();
    }

    var segment = new Graphic({
      geometry: lineGeom,
      symbol: new SimpleLineSymbol({
        color: color ? color : "blue",
        width: 3,
        style: isMarriage ? "short-dot" : "solid"
      }),

    });

    view.graphics.add(segment);
    return segment;
  }

  function drawPoint(pointGraphic, previousPointGraphic, view){
    if(previousPointGraphic){
      view.graphics.remove(previousPointGraphic);
      // view.graphics.removeAll();
    }
    view.graphics.add(pointGraphic);
    return pointGraphic;
  }

  return {
    animateLine: animateLine,
    unanimateLine: unAnimateLine
  };

});