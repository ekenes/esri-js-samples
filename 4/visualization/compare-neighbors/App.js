define([
  "esri/config",
  "app/CompareNeighbors",
  "esri/Map",
  "esri/views/MapView",
  "esri/widgets/Legend",
  "esri/widgets/LayerList",
  "esri/layers/FeatureLayer",
  "dojo/dom",
  "dojo/on",
  "dojo/dom-construct",
  "esri/core/workers",
  "esri/core/promiseUtils",
  "app/utils",
], function(esriConfig, CompareNeighbors, Map, MapView, Legend, LayerList, FeatureLayer, dom, on, domConstruct, workers, promiseUtils, utils) {

  esriConfig.workers.loaderConfig = {
    paths: {
      app: window.location.href.replace(/\/[^/]+$/, "")
    }
  };

  var map = new Map({
    basemap: "gray"
  });

  var view = new MapView({
    container: "viewDiv",
    map: map
  });

  var layerList,originalRenderer,
      compareNeighborsRenderer,bivariateRenderer,
      featureInfos;

  var App = function App() {};

  App.prototype = {
    run: function() {
      view.then(start);
    }
  };

  function start (){
    var legend = new Legend({
      view: view
    });
    layerList = new LayerList({
      view: view
    });

    layerList.on("trigger-action", function(evt){
      if(evt.action.id === "diff-renderer"){
        evt.item.layer.renderer = compareNeighborsRenderer;
      }
      if(evt.action.id === "bivariate-renderer"){
        evt.item.layer.renderer = bivariateRenderer;
      }
      if(evt.action.id === "original-renderer"){
        evt.item.layer.renderer = originalRenderer;
      }
    });

    view.ui.add(legend, "bottom-left");
    view.ui.add(layerList, "top-right");
    view.ui.add("info", "bottom-right");

    createLayer()
      .then(generateRenderers);
  }

  function createRendererAction() {
    layerList.createActionsFunction = function(event){
      return [[{
        title: "See dissimilar neighbors",
        className: "esri-icon-maps",
        id: "diff-renderer"
      }, {
        title: "Distant neighbors with variable",
        className: "esri-icon-maps",
        id: "bivariate-renderer"
      }, {
        title: "Original renderer",
        className: "esri-icon-maps",
        id: "original-renderer"
      }]];
    };
  }

  function createLayer() {
    var url = dom.byId("service-url").value;
    var layer = new FeatureLayer({
      url: url,
      outFields: ["*"],
      visible: false
    });

    return layer.load()
      .then(function(){

        if(!isValidGeometryType(layer.geometryType)){
          alert("You may only use a layer containing polygon geometries.")
          return promiseUtils.reject(new Error("Not a valid geometry type. You must use a polygon layer."))
        }

        setFieldSelect({
          select: dom.byId("field-name"),
          layer: layer
        });
        setFieldSelect({
          select: dom.byId("normalization-field-name"),
          layer: layer
        });

        view.map.add(layer);
        return layer.queryExtent();
      }).then(function(response){
        view.goTo(response.extent);
        return layer;
      });

  }

  function isValidGeometryType(geomType) {
    var validTypes = [ "polygon" ];

    return validTypes.indexOf(geomType) !== -1;
  }

  function setFieldSelect(params){
    var select = params.select;
    var layer = params.layer;
    var fields = layer.fields;

    var validTypes = [ "double", "integer", "small-integer", "long-integer", "single" ];
    var invalidNames = [ "BoroCode" , "Shape_Leng", "ENRICH_FID", "HasData", "OBJECTID" ];

    select.options.length = 0;
    var opt = domConstruct.create("option");
    opt.text = "";
    opt.value = "";
    select.add(opt);

    fields.forEach(function(field){
      if(validTypes.indexOf(field.type) === -1 || invalidNames.indexOf(field.name) !== -1){
        return;
      }

      var opt = domConstruct.create("option");
      opt.text = field.alias;
      opt.value = field.name;

      select.add(opt);
    });
  }

  on(dom.byId("service-url"), "change", function(evt){

    if(view.map.layers.length){
      view.map.removeAll();
    }

    layerList.createActionsFunction = null;

    createLayer()
      .then(generateRenderers)
      .otherwise(function(error){
        dom.byId("check").src = "img/red-x.png";
        console.error(error);
      });
  });


  function generateRenderers (layer){
    dom.byId("check").src = "img/checkmark.png";

    on(dom.byId("generate-renderer-btn"), "click", function(){
      dom.byId("spinner").style.visibility = "visible";

      var workerParams = {
        layer: layer,
        config: utils.getConfigParams()
      };

      if(!workerParams.config.fieldName){
        alert("You must select a field name.");
        return;
      }

      var compare = new CompareNeighbors();
      compare.execute(workerParams)
        .then(function(response) {
          dom.byId("spinner").style.visibility = "hidden";

          originalRenderer = response.originalRenderer.clone();
          compareNeighborsRenderer = response.diffRenderer.clone();
          bivariateRenderer = response.bivariateRenderer.clone();
          featureInfos = response.featureInfos;

          var layer = response.layer;

          layer.renderer = originalRenderer;
          layer.visible = true;

          layer.popupTemplate = {
            content: function(event) {
              var attributes = event.graphic.attributes;
              var matchingInfo = utils.find(featureInfos, function(featureInfo){
                return featureInfo.feature.attributes.OBJECTID === attributes.OBJECTID;
              });

              return [ "This feature shares a border with ",
                      matchingInfo.touchesStats.count, " features. It has a value of ",
                      utils.round(matchingInfo.value,2), utils.showPercentageUnits(), ". The average value of its neighbors differ by ",
                      utils.round(matchingInfo.diffAverage,2), utils.showPercentageUnits(true), ", including one neighbor whose value differs by ",
                      utils.round(matchingInfo.diffMax,2), utils.showPercentageUnits(true), "."
              ].join("");
            }
          };

          layerList.createActionsFunction = createRendererAction;
        });
    });
  }

  return App;

});
