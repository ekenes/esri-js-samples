require([
  "esri/Color",
  "esri/dijit/BasemapToggle",
  "esri/dijit/PopupTemplate",
  "esri/layers/FeatureLayer",
  "esri/map",
  "esri/plugins/FeatureLayerStatistics",
  "esri/renderers/smartMapping",
  "esri/renderers/UniqueValueRenderer",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "dojo/_base/array",
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/on",
  "modules/arcade-generator",
  "dojo/domReady!"
], function (
  Color, BasemapToggle,
  PopupTemplate, FeatureLayer, Map, FeatureLayerStatistics, smartMapping,
  UniqueValueRenderer, SimpleFillSymbol, SimpleLineSymbol, array, dom, domConstruct, on,
  arcadeGenerator
){

  var url = dom.byId("url-input").value;
  var ABREAKS, BBREAKS;

  var map = new Map("esri-map-container", {
    basemap: "gray",
    center: [-95, 38],
    zoom: 5
  });

  var arcadeEditor = dom.byId("arcade-editor");
  var arcadeBtn = dom.byId("edit-arcade");
  var stopEditing = dom.byId("hide-arcade");

  var busySpinner = dom.byId("spinner");
  var legend = dom.byId("legend");

  var defaultSym = createSymbol([194, 194, 194, 0.25]);

  function createSymbol(color){
    var line = new SimpleLineSymbol();
    line.setColor(new Color([255, 255, 255, 0.5]));
    line.setWidth(0.5);
    var fill = new SimpleFillSymbol();
    fill.setOutline(line);
    fill.setColor(new Color(color));

    return fill;
  }

  function round (num){
    return Math.round(num * 100) / 100;
  }

  function getColor(value, classes) {
    var colors3 = [
    /////// 3X3
    {
      value: "A1",
      color: "#ebebe8"
    }, {
      value: "B1",
      color: "#cadaba"
    }, {
      value: "C1",
      color: "#84d783"
    }, {
      value: "A2",
      color: "#d6bee2"
    }, {
      value: "B2",
      color: "#a1b5cf"
    }, {
      value: "C2",
      color: "#76b0b4"
    }, {
      value: "A3",
      color: "#eaa5ea"
    }, {
      value: "B3",
      color: "#9491d4"
    }, {
      value: "C3",
      color: "#4474e0"
    }];
    ///// 4X4
    var colors4 = [{
      value: "A1",
      color: "#f3ded9"
    }, {
      value: "B1",
      color: "#c7c791"
    }, {
      value: "C1",
      color: "#95b246"
    }, {
      value: "D1",
      color: "#599c01"
    }, {
      value: "A2",
      color: "#e0bcea"
    }, {
      value: "B2",
      color: "#b8a6a4"
    }, {
      value: "C2",
      color: "#8b925f"
    }, {
      value: "D2",
      color: "#587d09"
    }, {
      value: "A3",
      color: "#c69af9"
    }, {
      value: "B3",
      color: "#a386b4"
    }, {
      value: "C3",
      color: "#7d7270"
    }, {
      value: "D3",
      color: "#535f2f"
    }, {
      value: "A4",
      color: "#a57aff"
    }, {
      value: "B4",
      color: "#8867c0"
    }, {
      value: "C4",
      color: "#6a5580"
    }, {
      value: "D4",
      color: "#484242"
    }];

    var pair;
    if (classes === 3){
      pair = colors3.find(function(item, i){
        return item.value === value;
      });
    } else {
      pair = colors4.find(function(item, i){
        return item.value === value;
      });
    }

    return pair.color;
  }

  var bt = new BasemapToggle({
    basemap: "dark-gray",
    map: map
  }, "basemapToggle-container");
  bt.startup();

  var lyr = new FeatureLayer(url, {
    outFields: ["*"],
    visible: false
  });

  on(lyr, "load", function(evt){
    map.addLayer(lyr);

    setFieldSelect({
      layer: evt.layer,
      select: dom.byId("select-field1")
    });

    dom.byId("select-field1").value = "NO_COL";

    setFieldSelect({
      layer: evt.layer,
      select: dom.byId("norm-field1")
    });

    dom.byId("norm-field1").value = "EDUCBASECY";

    setFieldSelect({
      layer: evt.layer,
      select: dom.byId("select-field2")
    });

    dom.byId("select-field2").value = "REP_PER";

    setFieldSelect({
      layer: evt.layer,
      select: dom.byId("norm-field2")
    });

    updateSmartMapping({
      layer: lyr
    });
  });

  // Gets the indicated field name from the user
  function getFieldName(){
    return dom.byId("select-field1").value;
  }

  function getFieldName2(){
    return dom.byId("select-field2").value;
  }

  // Determines which field to normalize by given the selected field name
  function getNormalizedField(){
    return dom.byId("norm-field1").value;
  }

  function getNormalizedField2(){
    return dom.byId("norm-field2").value;
  }

  function getNumClasses(){
    return dom.byId("num-classes").value;
  }

  function getClassification(){
    return dom.byId("class-method").value;
  }

  function getSmartBreaks(stats, numClasses){
    var classBreaks;
    var min = stats.min;
    var max = stats.max;
    var stddev = stats.stddev;
    var avg = stats.avg;

    if(numClasses === 3){
      classBreaks = [{
        minValue: min,
        maxValue: avg - stddev,
        label: [ round(min), " - ", round(avg - stddev) ].join("")
      }, {
        minValue: avg - stddev,
        maxValue: avg + stddev,
        label: [ round(avg - stddev), " - ", round(avg + stddev) ].join("")
      }, {
        minValue: avg + stddev,
        maxValue: max,
        label: [ round(avg + stddev), " - ", round(max) ].join("")
      }];
    }

    if(numClasses === 4){
      classBreaks = [{
        minValue: min,
        maxValue: avg - stddev,
        label: [ round(min), " - ", round(avg - stddev) ].join("")
      }, {
        minValue: avg - stddev,
        maxValue: avg,
        label: [ round(avg - stddev), " - ", round(avg) ].join("")
      }, {
        minValue: avg,
        maxValue: avg + stddev,
        label: [ round(avg) , " - ", round(avg + stddev) ].join("")
      }, {
        minValue: avg + stddev,
        maxValue: max,
        label: [ round(avg + stddev), " - ", round(max) ].join("")
      }];
    }

    return classBreaks;
  }
  /******************************************************************************
  * Function for calling smartMapping and FeatureLayerStatistics plugin
  * This updates the layer's renderer and the color slider
  *****************************************************************************/

  function updateSmartMapping(params){
    busySpinner.style.visibility = "visible";

    var newBasemap = params.newBasemap;
    var layer = params.layer ? params.layer : lyr;
    var fieldName = getFieldName();
    var normFieldName = getNormalizedField();
    var fieldName2 = getFieldName2();
    var normFieldName2 = getNormalizedField2();
    var numClasses = parseInt(getNumClasses());
    var classification = getClassification();

    if(!fieldName || !fieldName2){
      alert("You must select at least two field names!");
    }

    lyr.setInfoTemplate(new PopupTemplate({
      description: getFieldName() + ": {" + getFieldName() + "}<br>"
          + (normFieldName ? getNormalizedField() + ": {" + getNormalizedField() + "}<br>" : "")
          + getFieldName2() + ": {" + getFieldName2() + "}<br>"
          + (normFieldName2 ? getNormalizedField2() + ": {" + getNormalizedField2() + "}" : "")
    }));

    layer.addPlugin("esri/plugins/FeatureLayerStatistics").then(function(){
      if(classification !== "smart-breaks"){
        return layer.statisticsPlugin.getClassBreaks({
          field: fieldName,
          normalizationField: normFieldName ? normFieldName : null,
          normalizationType: normFieldName ? "field" : null,
          numClasses: numClasses,
          classificationMethod: classification
        });
      } else {
        return layer.statisticsPlugin.getFieldStatistics({
          field: fieldName,
          normalizationField: normFieldName ? normFieldName : null,
          normalizationType: normFieldName ? "field" : null,
        });
      }

    }).then(getFirstBreakInfos)
      .then(function(){
        if(classification !== "smart-breaks"){
         return layer.statisticsPlugin.getClassBreaks({
           field: fieldName2,
           normalizationField: normFieldName2 ? normFieldName2 : null,
           normalizationType: normFieldName2 ? "field" : null,
           numClasses: numClasses,
           classificationMethod: classification
         });
        } else {
          return layer.statisticsPlugin.getFieldStatistics({
            field: fieldName2,
            normalizationField: normFieldName2 ? normFieldName2 : null,
            normalizationType: normFieldName2 ? "field" : null,
           });
        }
      })
      .then(getSecondBreakInfos)
      .then(createRenderer)
      .otherwise(function(err){
        busySpinner.style.visibility = "hidden";
        console.log("An error occurred.", err);
      });

    function getFirstBreakInfos(response){
      if(response.classBreakInfos){
        ABREAKS = response.classBreakInfos;
      } else {
        ABREAKS = getSmartBreaks(response, numClasses);
      }

      return null;
    }

    function getSecondBreakInfos(response){
      if(response.classBreakInfos){
        BBREAKS = response.classBreakInfos;
      } else {
        BBREAKS = getSmartBreaks(response, numClasses);
      }
      return null;
    }

  }

  var col1 = dom.byId("col1");
  var col2 = dom.byId("col2");
  var col3 = dom.byId("col3");
  var col4 = dom.byId("col4");

  var row1 = dom.byId("row1");
  var row2 = dom.byId("row2");
  var row3 = dom.byId("row3");
  var row4 = dom.byId("row4");

  function setLabels(classes){

    col1.innerHTML = BBREAKS[0].label;
    col2.innerHTML = BBREAKS[1].label;
    col3.innerHTML = BBREAKS[2].label;

    if(classes === 3){
      row3.innerHTML = ABREAKS[0].label;
      row2.innerHTML = ABREAKS[1].label;
      row1.innerHTML = ABREAKS[2].label;
      row1.style.top = "-15px";
      row2.style.top = "15px";
      row3.style.top = "40px";
      row4.style.visibility = "hidden";
      col1.style.left = "-15px";
      col2.style.left = "-40px";
      col3.style.left = "-80px";
      col4.style.visibility = "hidden";
    }
    if (classes === 4){
      row4.innerHTML = ABREAKS[0].label;
      row3.innerHTML = ABREAKS[1].label;
      row2.innerHTML = ABREAKS[2].label;
      row1.innerHTML = ABREAKS[3].label;

      col4.innerHTML = BBREAKS[3].label;
      row1.style.top = "5px";
      row2.style.top = "10px";
      row3.style.top = "20px";
      row4.style.visibility = "visible";
      col1.style.left = "-15px";
      col2.style.left = "-30px";
      col3.style.left = "-60px";
      col4.style.visibility = "visible";
    }

  }

  function simplifyBreaks(breaks){
    var breaksJson, cleanBreaks;

    breaksJson = breaks.map(function(item, i){
      return {
        "minValue": item.minValue,
        "maxValue": item.maxValue
      };
    });

    cleanBreaks = JSON.stringify(breaksJson);
    return cleanBreaks;
  }

  function createRenderer(expression){
    busySpinner.style.visibility = "hidden";
    var classes = ABREAKS.length;

    var arcade = arcadeGenerator.getArcade({
      field1: getFieldName(),
      normField1: getNormalizedField(),
      field2: getFieldName2(),
      normField2: getNormalizedField2(),
      field1Breaks: ABREAKS,
      field2Breaks: BBREAKS
    });

    arcadeEditor.value = expression ? expression : arcade;

    var uvr = new UniqueValueRenderer({
      defaultSymbol: defaultSym,
      valueExpression: expression ? expression : arcade
    });

    ABREAKS.forEach(function(aBreak, a){
      BBREAKS.forEach(function(bBreak, b){
        var val;
        if (a === 0){
          val = "A";
        } else if (a === 1){
          val = "B";
        } else if (a === 2){
          val = "C";
        } else if (a === 3){
          val = "D";
        }

        val += ++b;

        uvr.addValue({
          value: val,
          symbol: createSymbol(getColor(val, classes))
        });
      });
    });

    swapLegend(classes);

    lyr.setRenderer(uvr);
    lyr.redraw();

    if (!lyr.visible) {
      lyr.show();
    }
  }

  function setFieldSelect(params){
    var select = params.select;
    var layer = params.layer;
    var fields = layer.fields;

    select.options.length = 0;

    var validTypes = [ "esriFieldTypeDouble", "esriFieldTypeInteger", "esriFieldTypeSmallInteger", "esriFieldTypeLongInteger" ];

    var invalidNames = [ "BoroCode" , "Shape_Leng", "ENRICH_FID", "HasData", "OBJECTID" ];

    var opt = domConstruct.create("option");
    opt.text = "";
    opt.value = "";
    select.add(opt);

    array.forEach(fields, function(field){
      if(validTypes.indexOf(field.type) === -1 || invalidNames.indexOf(field.name) !== -1){
        return;
      }

      var opt = domConstruct.create("option");
      opt.text = field.alias;
      opt.value = field.name;

      select.add(opt);
    });
  }

  on(dom.byId("url-input"), "change", function(evt){

    map.removeLayer(lyr);

    lyr = new FeatureLayer(evt.target.value, {
      outFields: ["*"],
      visible: false
    });

    on(lyr, "load", function(evt){

      var validGeomTypes = [ "esriGeometryPolygon" ];

      if(validGeomTypes.indexOf(evt.layer.geometryType) === -1){
        alert(evt.layer.geometryType + " geometry type not supported. Layer must contain polygon geometries.");
        dom.byId("url-input").value = "";
        return;
      }

      map.addLayer(lyr);

      dom.byId("check").src = "../img/checkmark.png";
      var sr = evt.layer.fullExtent.spatialReference.wkid;

      var wkids = [ 102100, 3857, 4326];

      if( wkids.indexOf(sr) !== -1 ){
        map.setExtent(evt.layer.fullExtent);
      }


      setFieldSelect({
        layer: evt.layer,
        select: dom.byId("select-field1")
      });

      setFieldSelect({
        layer: evt.layer,
        select: dom.byId("norm-field1")
      });

      setFieldSelect({
        layer: evt.layer,
        select: dom.byId("select-field2")
      });

      setFieldSelect({
        layer: evt.layer,
        select: dom.byId("norm-field2")
      });

    });

    on(lyr, "error", function(evt){
      dom.byId("check").src = "../img/red-x.png";
      dom.byId("url-input").value = "";
      alert("Not a valid service url.");
    });

  });

  on(dom.byId("redraw"), "click", updateSmartMapping);

  function swapLegend (classes){
    if (classes === 3){
      legend.src = "../img/bivariate-legend-3.png";
    }
    if (classes === 4){
      legend.src = "../img/bivariate-legend-4.png";
    }
    setLabels(classes);
  }

  on(arcadeBtn, "click", function(){
    arcadeBtn.style.visibility = "hidden";
    stopEditing.style.visibility = "visible";
    arcadeEditor.style.opacity = 0.8;
    arcadeEditor.style.visibility = "visible";
    arcadeEditor.focus();
  });

  on(stopEditing, "click", function(){
    arcadeBtn.style.visibility = "visible";
    stopEditing.style.visibility = "hidden";
    arcadeEditor.style.opacity = 0;
    arcadeEditor.style.visibility = "hidden";

    var newExpression = arcadeEditor.value;
    createRenderer(newExpression);

  });

});