# Samples using the ArcGIS API for JavaScript

This repository contains select samples using the ArcGIS API for JavaScript in its 3.x and 4.0 versions.

You can explore the following samples here:

### GeometryEngine editing demo

This sample was featured in [this blog post](http://blogs.esri.com/esri/arcgis/2015/09/09/geometryengine-part-1-testing-spatial-relationships-and-editing/) in [a series featuring ways to use GeometryEngine](http://blogs.esri.com/esri/arcgis/tag/geometryengine/) in the ArcGIS API for JavaScript.

[![ge-demo](http://blogs.esri.com/esri/arcgis/files/2015/09/ge-editing.png)](http://ekenes.github.io/esri-js-samples/ge-demo/)

This app demonstrates how you can use the GeometryEngine to test spatial relationships of your features without making repeated network requests using a GeometryService. This can enhance the user experience while editing data. The edits and tests can be done client-side before they are pushed to the server.

[View the code](https://github.com/ekenes/esri-js-samples/blob/master/ge-demo/index.html)

[View the live sample](http://ekenes.github.io/esri-js-samples/ge-demo/)

[Click here](http://ekenes.github.io/esri-js-samples/ge-demo/requests.html) to view the number of network requests avoided in this app by using GeometryEngine

### GeometyEngine vs. GeometryService 

[![ge-gs](http://blogs.esri.com/esri/arcgis/files/2015/09/ge-gs.png)](http://ekenes.github.io/esri-js-samples/ge-gs/)

This app times GeometryEngine and GeometryService performing the same operation and compares the two. *Spoiler Alert*: GeometryEngine wins, by a lot. 

Note that the speed difference depends on network speed, the browser and version used, as well as the number of input features in the operation. In this case, more than 500 points are buffered at one time, so the difference in speed is magnified.

[View the code](https://github.com/ekenes/esri-js-samples/tree/master/ge-gs)

[View the live sample](http://ekenes.github.io/esri-js-samples/ge-gs/)

### GeometryEngine measurement demos

The following samples were featured in the [blog post](http://blogs.esri.com/esri/arcgis/2015/09/16/geometryengine-part-2-measurement/) demonstrating the various measurement features of GeometryEngine.

##### Geodesic vs Planar buffer

[![ge-geodesic-planar-buffer](http://blogs.esri.com/esri/arcgis/files/2015/09/ge-buffers.png)](http://ekenes.github.io/esri-js-samples/ge-geodesic-planar-buffer/)

This sample shows the difference between geodesic buffer and planar buffer in GeometryEngine. Refer to [this blog post](http://blogs.esri.com/esri/arcgis/2015/09/16/geometryengine-part-2-measurement/) for an explanation of when to use each.

[View the code](https://github.com/ekenes/esri-js-samples/tree/master/ge-geodesic-planar-buffer)

[View the live sample](http://ekenes.github.io/esri-js-samples/ge-geodesic-planar-buffer/)

##### Geodesic vs Planar length

[![ge-geodesic-planar-length](http://blogs.esri.com/esri/arcgis/files/2015/09/ge-length.png)](http://ekenes.github.io/esri-js-samples/ge-length/)

This sample shows the difference between geodesic buffer and planar buffer in GeometryEngine using a Web Mercator Projection. Refer to [this blog post](http://blogs.esri.com/esri/arcgis/2015/09/16/geometryengine-part-2-measurement/) for an explanation of when to use each.

[View the code](https://github.com/ekenes/esri-js-samples/tree/master/ge-length)

[View the Web Mercator live sample](http://ekenes.github.io/esri-js-samples/ge-length/)

[View the PCS live sample](http://ekenes.github.io/esri-js-samples/ge-length/state-plane.html)

[View the Goode's Homosoline live sample](http://ekenes.github.io/esri-js-samples/ge-length/homosoline.html)

### GeometryEngine overlay demo

The following sample was featured in the [blog post](http://blogs.esri.com/esri/arcgis/2015/09/23/geometryengine-part-3-overlay-analysis/) demonstrating the GeometryEngine's overlay methods.

[![ge-overlay](http://blogs.esri.com/esri/arcgis/files/2015/09/ge-overlay2.gif)](http://ekenes.github.io/esri-js-samples/ge-overlay/)

This sample shows the difference between geodesic buffer and planar buffer in GeometryEngine using a Web Mercator Projection. Refer to [this blog post](http://blogs.esri.com/esri/arcgis/2015/09/23/geometryengine-part-3-overlay-analysis/) for an explanation of when to use each.

[View the code](https://github.com/ekenes/esri-js-samples/tree/master/ge-overlay)

[View the live sample](http://ekenes.github.io/esri-js-samples/ge-overlay/)
