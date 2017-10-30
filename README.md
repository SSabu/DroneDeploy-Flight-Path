#DroneDeploy - Flight Path Challenge

The challenge is to create an app that can be deployed on the Drone Deploy App Market that allows a user to submit a .shp, .kml, or .zip file of an area of interest and generate a drone flight plan for that area.

## Solution Outline

The challenge consisted of the following steps:  

  1) Finding external libraries that would successfully convert the different file formats into useable geoJSON
  2) Converting the files and verifying the geoJSON data within them was acceptable and did in fact reflect a geographic feature
  3) Standardizing the data returned from the different conversion libraries to pass on to the DroneDeploy API
  4) Calling the DroneDeploy API to create the Flight Plan, pan to the vicinity of the plan, and track success of the app

###Conversion Libraries

The following conversion libraries were used:

Tom MacWright has produced a library to [convert KML files to geoJSON](https://github.com/mapbox/togeojson).  jQuery's ajax method was used int he case of the KML to geoJSON converter since the the function required an xml object to process to return the geoJSON data.

Mike Bostock has produced a library called [Shapefile to convert SHP files to geoJSON](https://github.com/mbostock/shapefile).

Calvin Metcalf has produced a library called [shapefile-js to convert ZIP files to geoJSON](https://github.com/calvinmetcalf/shapefile-js).

Each library produced geoJSON data in slightly different formats.  

    For example, in the KML to geoJSON converter, the geojson object looked like this:
    ```
    {type: "FeatureCollection", features: [ {type:"Feature", geometry: {..}, properties: {..} } ] };
    ```

    The SHP to geoJSON converter yielded a data object that looked like this:
    ```
    [{coordinates:[[...]], type: "Polygon"}];
    ```

    The ZIP to geoJSON converter yielded this data object:
    ```
    {type:"Feature", features: [ {type:"Feature", geometry: {..}, properties: {..} } ], fileName:"Limits of flight"};
    ```

Due to the varying nature of the geoJSON object returned from each specific file converter, steps were taken to create a standard geoData object that captured relevant data from the GeoJSON object for processing later.

###Other libraries used

[GeoJSON.js](https://github.com/caseycesari/geojson.js) was used to convert data retrieved from the GeoJSON objects back into standard geojson formats that could begin to be used by functions regardless of the filetype submitted.

[Turf.js](http://turfjs.org/getting-started/) was used to process and analyze the geoJSON objects.  Methods used from the Turf.js library included turf.centroid, turf.booleanContains, and turf.bbox.  In previous iterations of the app, more Turf.js methods were used, but it eventually became evident that they were extraneous.

##Drone Deploy API

The [DroneDeploy API](https://dronedeploy.gitbooks.io/dronedeploy-apps/) provides methods to turn a shape geometry into a flight path and to zoom into the flight plan view.  To maximize the usage and and efficacy of their App Market platform, the API provides methods to track success and other metrics of apps that users choose to deploy on the platform.  The Track.success method was used to verify the app would be able to be published and monitored on their App Market platform.


<hr>
Initial view of the Flight Path App:
<br>
<img width="585" alt="screen shot 2017-10-29 at 12 43 28 pm" src="https://user-images.githubusercontent.com/12532173/32150301-77cfe306-bcce-11e7-814f-d5de1d5ea4ea.png">
<hr>

Once flight plan is created, map view pans to vicinity of plan:
<br>
<img width="700" alt="screen shot 2017-10-29 at 12 43 56 pm" src="https://user-images.githubusercontent.com/12532173/32150370-25a0b104-bccf-11e7-9e60-d7b04d9768fa.png">
<hr>

Viewer can click on Flight Plan icon to view detailed drone flight path:
<br>
<img width="700" alt="screen shot 2017-10-29 at 12 45 13 pm" src="https://user-images.githubusercontent.com/12532173/32150403-8644a880-bccf-11e7-932f-8949be44de70.png">
