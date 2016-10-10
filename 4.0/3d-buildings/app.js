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
  var slidesDiv = dom.byId("slidesDiv");

  /**
   * Returns a 3D Mesh Symbol with the given fill color.
   * @param   {esri/Color} color - Autocastable color value.
   * @return {esri/symbols/MeshSymbol3D} A 3D Mesh Symbol shaded with the
   *                                     input color value.
   */
  function createSymbol(color){
    return new MeshSymbol3D({
      symbolLayers: [
        new FillSymbol3DLayer({
          material: { color: color }
        })
      ]
    });
  }

  // When the user's mouse location leaves the slides div,
  // scroll the position back to the top so "Slides" always shows
  on(slidesDiv, "mouseleave", function(){
    slidesDiv.scrollTop = 0;
  });


  /**
   * Creates the UI for working with the scene's slides
   *
   * @param {esri/webscene/Slide} slide - The slide to add to the UI.
   */
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

    // When the slide element is clicked, apply the
    // slide's settings to the view
    on(slideElement, "click", function() {
      query(".slide").removeClass("active");
      domClass.add(slideElement, "active");
      titleDiv.innerHTML = slide.title.text;
      slide.applyTo(view);
    });
  }

  // Create the initial renderer used for visualizing building
  // floors. Each floor is colored based on whether it is
  // "residential", "commerical", or "mixed"
  var initialRenderer = new UniqueValueRenderer({
    field: "usageReport",
    defaultLabel: "Other",
    defaultSymbol: createSymbol([ 128,128,128,0.2 ]),
    uniqueValueInfos: getUniqueInfoFromValue("all")
  });

  /************************************************************
  * Creates a new WebScene instance. A WebScene must reference
  * a PortalItem ID that represents a WebScene saved to
  * arcgis.com or an on-premise portal.
  *
  * To load a WebScene from an on-premise portal, set the portal
  * url in esriConfig.portalUrl.
  ************************************************************/

  var scene = new WebScene({
    portalItem: {
      id: "f0a2199020344acbbefdea18ee5cd8b8"
    }
  });

  // Set the WebScene instance to the map property in a SceneView.
  var view = new SceneView({
    map: scene,
    container: "viewDiv",
    padding: {
      top: 40
    }
  });

  var buildingsLayer, legend;

  view.then(function() {
    // when the scene and view resolve, display the scene's
    // title in the DOM

    console.log(scene);
    var title = scene.portalItem.title;
    titleDiv.innerHTML = title;

    // Add the scene's slides to the slides dive
    var slides = scene.presentation.slides;
    slides.forEach(createSlideUI);

    // Get the buildings layer for visualization purposes
    buildingsLayer = scene.allLayers.find(function(layer){
      return layer.title === "Thematic buildings";
    });

    buildingsLayer.renderer = initialRenderer;

    // Configure popup programmatically
    buildingsLayer.popupTemplate = {
      title: "{name}",
      content: [{
        type: "fields",
        fieldInfos: [{
          fieldName: "building",
          label: "Building type"
        }, {
          fieldName: "height",
          label: "Height (ft)"
        }, {
          fieldName: "daysMarketReport",
          label: "Days on the market"
        }, {
          fieldName: "website",
          label: "Website"
        }]
      }]
    };

    // Set up UI elements
    legend = new Legend({
      view: view
    });

    view.ui.add(legend, "bottom-left");
    view.ui.add("sidebarDiv", "top-right");
    view.ui.add("slidesDiv", "top-right");

    // Set up event handlers for filtering and visualization
    on(dom.byId("type-select"), "change", selectUsageType);
    on(dom.byId("market-check"), "change", viewDaysOnMarket);
  });

  /**
   * Highlights all floors of the given usage type.
   * @param {Object} evt - Event object. Grab the new value
   *                     to use for rendering purposes.
   */
  function selectUsageType (evt){
    var newVal = parseInt(evt.target.value);
    var renderer = buildingsLayer.renderer.clone();

    // if the user wants to see the days on market
    // for all floors, set visual variables on all floors.
    if (newVal === 3){

      if (dom.byId("market-check").checked){
        renderer.uniqueValueInfos = [];
        renderer.visualVariables = [{
          type: "color",
          field: "daysMarketReport",
          stops: getColorStops(0)
        }];
        buildingsLayer.renderer = renderer;
      } else {
        buildingsLayer.renderer = initialRenderer;
      }

      return;
    }

    // set only one unique value when the user
    // selects a usage type.
    renderer.uniqueValueInfos = [
      getUniqueInfoFromValue(newVal)
    ];

    // If the number of days on the market box is
    // still checked, then re-apply visual variables
    // using the scheme of the newly selected usage type
    if(dom.byId("market-check").checked){
      renderer.visualVariables = [{
        type: "color",
        field: "daysMarketReport",
        stops: getColorStops(newVal)
      }, {
        type: "opacity",
        field: "usageReport",
        stops: [
          { value: newVal-0.1, opacity: 0.10 },
          { value: newVal, opacity: 1 },
          { value: newVal+0.1, opacity: 0.10 }
        ]
      }];
    }

    buildingsLayer.renderer = renderer;
  }

  /**
   * Applies visual variables to the floors with a weak
   * to strong color ramp for depicting how long the floor
   * has been on the market.
   *
   * @param {Object} evt The event object used to indicate
   *                     whether the box has been checked or not.
   */
  function viewDaysOnMarket (evt){
    var checked = evt.target.checked;
    // the currently selected usage type
    var typeValue = parseInt(dom.byId("type-select").value);
    var renderer = buildingsLayer.renderer.clone();

    legend.visible = !checked;

    if(checked && typeValue < 3){
      renderer.visualVariables = [{
        type: "color",
        field: "daysMarketReport",
        stops: getColorStops(typeValue)
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
        stops: getColorStops(0)
      }];
    }
    else if (!checked && typeValue === 3){
      renderer = initialRenderer;
    }
    else {
      renderer.visualVariables = [];
    }
    buildingsLayer.renderer = renderer;
  }

  /**
   * Returns the color scheme to use in the visual variables
   * stops property based on the provided usage type value
   * @param   {number} value - The usage type value.
   * @return {Object[]} The stops used for the color visual variable.
   */
  function getColorStops(value){

    var schemes = [{
      usageType: 0,
      scheme: [
        { value: 0, color: "#f7f7f7" },  // 5C7BC3
        { value: 60, color: "#5C7BC3" },  // 3A5EB2
        { value: 120, color: "#0E3388" },
        { value: 200, color: "#09276B" }
      ]
    },{
      usageType: 1,
      scheme: [
        { value: 0, color: "#f7f7f7" },  // FFD868
        { value: 60, color: "#FFD868" },  // FFCD3F
        { value: 120, color: "#CB9600" },
        { value: 200, color: "#A07600" }
      ]
    }, {
      usageType: 2,
      scheme: [
        { value: 0, color: "#f7f7f7" },  // EA608E
        { value: 60, color: "#EA608E" },  // E43872
        { value: 120, color: "#B4003D" },
        { value: 200, color: "#8D002F" }
      ]
    }];

    var results = schemes.filter(function(schemeInfo){
      return schemeInfo.usageType === value;
    });
    var scheme = results[0].scheme;
    return scheme;
  }

  /**
   * Returns the unique value object based on the provided
   * usage type value.
   *
   * @param   {number|string} value - The usage type as a number. Using
   *                                `all` as input is valid for returning all
   *                                unique value infos.
   * @return {Object|Object[]} The unique value info object
   */
  function getUniqueInfoFromValue(value){

    var infos = [{
      value: 0,
      label: "Commercial",
      symbol: createSymbol("#1844AB")
    }, {
      value: 1,
      label: "Residential",
      symbol: createSymbol("#FFBF0B")
    }, {
      value: 2,
      label: "Mixed",
      symbol: createSymbol("#E10952")
    }];

    var results = infos.filter(function(info){
      return info.value === value;
    });

    var info = (value === "all") ? infos : results[0];
    return info;
  }

});