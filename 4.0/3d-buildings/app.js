require([
  "esri/views/SceneView",
  "esri/WebScene",
  "esri/renderers/UniqueValueRenderer",
  "esri/symbols/MeshSymbol3D",
  "esri/symbols/FillSymbol3DLayer",
  "esri/widgets/Legend",
  "esri/config",
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/dom-class",
  "dojo/query",
  "dojo/on",
  "dojo/domReady!"
], function(
  SceneView, WebScene, UniqueValueRenderer, MeshSymbol3D, FillSymbol3DLayer, Legend, esriConfig, dom, domConstruct, domClass, query, on
) {

  var titleDiv = dom.byId("titleDiv");

  function createSymbol(color){
    return new MeshSymbol3D({
      symbolLayers: [
        new FillSymbol3DLayer({
          material: { color: color }
        })
      ]
    });
  }

  var slidesDiv = dom.byId("slidesDiv");

  on(slidesDiv, "mouseleave", function(){
    slidesDiv.scrollTop = 0;
  });


  function createSlideUI(slide) {
    var slideElement = domConstruct.create("div", {
      // Assign the ID of the slide to the <span> element
      id: slide.id,
      className: "slide"
    });

    domConstruct.place(slideElement, "slidesDiv", "last");

    domConstruct.create("div", {
      // Place the title of the slide in the <div> element
      textContent: slide.title.text,
      className: "title"
    }, slideElement);

    domConstruct.create("img", {
      src: slide.thumbnail.url,
      title: slide.title.text
    }, slideElement); // Place the image inside the new <div> element

    on(slideElement, "click", function() {
      query(".slide").removeClass("active");
      domClass.add(slideElement, "active");
      slide.applyTo(view);
    });
  }

  var initialRenderer = new UniqueValueRenderer({
    field: "usageReport",
    defaultLabel: "Other",
    defaultSymbol: createSymbol([ 128,128,128,0.2 ]),
    uniqueValueInfos: [{
      value: 1,
      label: "Residential",
      symbol: createSymbol("#FFBF0B")
    }, {
      value: 2,
      label: "Mixed",
      symbol: createSymbol("#E10952")
    }, {
      value: 0,
      label: "Commercial",
      symbol: createSymbol("#1844AB")
    }]
  });

  /************************************************************
   * Creates a new WebScene instance. A WebScene must reference
   * a PortalItem ID that represents a WebScene saved to
   * arcgis.com or an on-premise portal.
   *
   * To load a WebScene from an on-premise portal, set the portal
   * url in esriConfig.portalUrl.
   ************************************************************/
//  esriConfig.portalUrl = "https://devtesting.mapsdevext.arcgis.com";

  var scene = new WebScene({
    portalItem: {
      id: "c0378029c7fc4a58b6d22c76adca1cc0"
    }
  });

  /************************************************************
   * Set the WebScene instance to the map property in a SceneView.
   ************************************************************/
  var view = new SceneView({
    map: scene,
    container: "viewDiv",
    padding: {
      top: 40
    }
  });

  view.then(function() {
    // when the scene and view resolve, display the scene's
    // title in the DOM
    var title = scene.portalItem.title;
    titleDiv.innerHTML = title;

    var slides = scene.presentation.slides;

    slides.forEach(createSlideUI);

    console.log("slides: ", slides);

    var buildingsLayer = scene.layers.find(function(layer){
      return layer.layerId === 0;
    });

    buildingsLayer.renderer = initialRenderer;

    buildingsLayer.popupTemplate = {
      title: "{addr__housenumber} {addr__street}, New York, NY {addr__postcode}",
      content: [{
        type: "fields",
        fieldInfos: [{
          fieldName: "name",
          label: "Building name"
        }, {
          fieldName: "height",
          label: "Height"
        }, {
          fieldName: "daysMarketReport",
          label: "Days on the market"
        }, {
          fieldName: "usageReport",
          label: "Usage type"
        }]
      }]
    };

    var legend = new Legend({
      view: view
    });

    view.ui.add(legend, "bottom-left");
    view.ui.add("sidebarDiv", "bottom-right");
    view.ui.add("slidesDiv", "top-right");

    console.log("layers: ", buildingsLayer);

    on(dom.byId("type-select"), "change", function(evt){
      var newVal = evt.target.value;
      var renderer = buildingsLayer.renderer.clone();

      if (newVal === "3"){

        if (dom.byId("market-check").checked){
          renderer.uniqueValueInfos = [];
          renderer.visualVariables = [{
            type: "color",
            field: "daysMarketReport",
            stops: getColorStops("0")
          }];
          buildingsLayer.renderer = renderer;
        } else {
          buildingsLayer.renderer = initialRenderer;
        }

        return;
      }





      renderer.uniqueValueInfos = [
        getUniqueInfoFromValue(newVal)
      ];

      if(renderer.visualVariables){
        var typeValue = parseInt(newVal);
        renderer.visualVariables = [{
          type: "color",
          field: "daysMarketReport",
          stops: getColorStops(newVal)
        }, {
          type: "opacity",
          field: "usageReport",
          stops: [
            { value: typeValue-0.1, opacity: 0.10 },
            { value: typeValue, opacity: 1 },
            { value: typeValue+0.1, opacity: 0.10 }
          ]
        }];
      }

      buildingsLayer.renderer = renderer;
    });


    on(dom.byId("market-check"), "change", function(evt){
      var checked = evt.target.checked;
      var typeValue = parseInt(dom.byId("type-select").value);
      var renderer = buildingsLayer.renderer.clone();
      if(checked && typeValue < 3){
        renderer.visualVariables = [{
          type: "color",
          field: "daysMarketReport",
          stops: getColorStops(dom.byId("type-select").value)
        }, {
          type: "opacity",
          field: "usageReport",
          stops: [
            { value: typeValue-0.1, opacity: 0.10 },
            { value: typeValue, opacity: 1 },
            { value: typeValue+0.1, opacity: 0.10 }
          ]
        }];
      }
      else if (checked && typeValue === 3){
        renderer.uniqueValueInfos = [];
        renderer.visualVariables = [{
          type: "color",
          field: "daysMarketReport",
          stops: getColorStops("0")
        }];
      }
      else if (!checked && typeValue === 3){
        renderer = initialRenderer;
      }
      else {
        renderer.visualVariables = [];
      }
      buildingsLayer.renderer = renderer;
    });



  });

  function getColorStops(value){
    console.log("label value; ",  value);
    var residentialScheme = [
      { value: 0, color: "#FFD868" },
      { value: 60, color: "#FFCD3F" },
      { value: 120, color: "#CB9600" },
      { value: 200, color: "#A07600" }
    ];

    var mixedScheme = [
      { value: 0, color: "#EA608E" },
      { value: 60, color: "#E43872" },
      { value: 120, color: "#B4003D" },
      { value: 200, color: "#8D002F" }
    ];

    var commercialScheme = [
      { value: 0, color: "#5C7BC3" },
      { value: 60, color: "#3A5EB2" },
      { value: 120, color: "#0E3388" },
      { value: 200, color: "#09276B" }
    ];

    if (value === "1"){
      return residentialScheme;
    }
    else if (value === "0"){
      return commercialScheme;
    }
    else if (value === "2"){
      return mixedScheme;
    }
    else {
      console.log("Couldn't find a match");
    }
  }


  function getUniqueInfoFromValue(value){
    var info = {};
    if( value === "0" ){
      info = {
        value: 0,
        label: "Commercial",
        symbol: createSymbol("#1844AB")
      };
    }
    else if ( value === "1" ){
      info = {
        value: 1,
        label: "Residential",
        symbol: createSymbol("#FFBF0B")
      };
    }
    else if ( value === "2" ) {
      info = {
        value: 2,
        label: "Mixed",
        symbol: createSymbol("#E10952")
      };
    }
    else {
      info = {
        label: "Other",
        symbol: createSymbol("black")
      };
    }
    return info;
  }

});