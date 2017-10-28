let geoData = {};

var modal = $("#myModal")[0];

var span = $(".close")[0];

//Expandable section taken from example

var isExpanded = false;
var upArrow = 'https://s3.amazonaws.com/drone-deploy-plugins/templates/login-example-imgs/arrow-up.svg';
var downArrow = 'https://s3.amazonaws.com/drone-deploy-plugins/templates/login-example-imgs/arrow-down.svg';
var expandArrow = $('.expand-arrow')[0];
var expandBody = $('.expand-section')[0];
var expandRow = $('.expand-row')[0];

expandRow.addEventListener('click', function(){
  isExpanded = !isExpanded
  if (isExpanded){
    expandArrow.src = upArrow;
    expandBody.style.display = 'block';
  } else{
    expandArrow.src = downArrow;
    expandBody.style.display = 'none';
  }
});

// jQuery event handler functions

//   display selected file in input text box and check acceptability of filetype

$("#input")[0].onchange = function() {

  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great, all File APIs are supported
  } else {
    alert("The File APIs are not supported on this browser");
  }

  $("#upload")[0].value = this.value.substring(12);
  var file = $("#input")[0].files[0];
  checkFile(file.name);
};

//   close modal if opened

span.onclick = function() {
  modal.style.display = "none";
};

window.onclick = function(event) {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

//   verify that the file has useable data when Submit button is clicked

$("#verify")[0].onclick = function() {

  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great, all File APIs are supported
  } else {
    alert("The File APIs are not supported on this browser");
  }

  var file = $("#input")[0].files[0];

  channelFile(file)

};

//   create plan when Create Plan button is clicked

$("#plan")[0].onclick = function() {

  if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

  var file = $("#input")[0].files[0];

  createPlan(file);

};

// helper functions:

// check filetype and display error message if not an accepted type

function checkFile(file) {
  var extension = file.substr((file.lastIndexOf('.')+1));
  if (!/(shp|zip|kml)$/ig.test(extension)) {
    modal.style.display = "block";
    $(".modal-paragraph")[0].innerHTML = "Invalid file type: "+extension+". Please use a .shp, .kml, or .zip file.";
  }
};

// based on file type create geoJSON and verify that file is useable

function channelFile(file) {
  let fileName = file.name;
  let extension = fileName.substr((fileName.lastIndexOf('.') +1));
  if (/(shp)$/ig.test(extension)) {
    readFile(file).then(shpToGeo).then(checkShpData).then(displayCreatePlan);
  }

  if(/(kml)$/ig.test(extension)) {
    readKMLFile(file).then(fromKML).then(getKMLGeo).then(checkData).then(displayCreatePlan);
  }

  if (/(zip)$/ig.test(extension)) {
    readFile(file).then(zipToGeo).then(checkData).then(displayCreatePlan);
  }
};

// create drone flight plan

function createPlan(file) {
  let fileName = file.name;
  let extension = fileName.substr((fileName.lastIndexOf('.') +1));
  if (/(shp)$/ig.test(extension)) {
    readFile(file).then(shpToGeo).then(modifySHPGeoJson).then(findIntersections).then(getOuterBounds).then(createPath).then(console.log);
  }

  if(/(kml)$/ig.test(extension)) {
    readKMLFile(file).then(fromKML).then(getKMLGeo).then(modifyKMLGeoJson).then(findIntersections).then(getOuterBounds).then(createPath).then(console.log);
  }

  if (/(zip)$/ig.test(extension)) {
    readFile(file).then(zipToGeo).then(modifyZIPGeoJson).then(createPath).then(findIntersections).then(getOuterBounds).then(console.log);
  }
};

// read file after submitting, one for KML and one for SHP and ZIP due to different type required per the separate libraries; return Promise

function readKMLFile(file) {
  return new Promise(function(succeed, fail) {
    var reader = new FileReader();
    reader.addEventListener("load", function() {
      succeed(reader.result);
    });
    reader.addEventListener("error", function() {
      fail(reader.error);
    });
    reader.readAsDataURL(file);
  })
};

function readFile(file) {
  return new Promise(function(succeed, fail) {
    var reader = new FileReader();
    reader.addEventListener("load", function() {
      succeed(reader.result);
    });
    reader.addEventListener("error", function() {
      fail(reader.error);
    });
    reader.readAsArrayBuffer(file);
  });
};

// KML to geoJSON per library syntax - Tom MacWright's (with error message if fail to read)

function getKMLGeo(xml) {
  return toGeoJSON.kml(xml);
};

function fromKML(kml) {
  return $.ajax(kml).done(getKMLGeo).fail(function(){
    modal.style.display = "block";
    $(".modal-paragraph")[0].innerHTML = "Unable to read file. Please submit a different file.";
  })
};

// SHP to geoJSON per library syntax - Mike Bostock's

let geoObject = {};

function shpToGeo(shape) {
  let geoArr = [];
  return shapefile.openShp(shape)
  .then(source => {
      return new Promise((resolve, reject)=> {
        source.read()
        .then(function log(result) {
          if (result.done) return resolve(geoArr);
          geoArr.push(result.value);
          source.read().then(log);
        })
      })
    })
    .then(createGeoObject)
    .catch(error => console.error(error.stack));
  };

function createGeoObject(array) {
  geoObject.geojson = array;
  return geoObject;
};

console.log('GEO OBJET', geoObject);

// ZIP to geoJSON per library syntax - Calvin Metcalf's

function zipToGeo(zip) {
  return shp(zip).then(function(geojson) {
    return geojson;
  })
};

// check data
// 2 functions, checkData for .zip & .kml since geojson is value of the features key while checkShpData since geojson is pushed to an array

function checkData(data) {

  if(data.features.length===0){
    modal.style.display = "block";
    $(".modal-paragraph")[0].innerHTML = 'GeoJSON has no coordinates. Please submit a file with at least one feature.';
    return false;
  }

  let geojson = data.features[0];

  if (!geojson.geometry.coordinates[0][0].length) {

    if ( (geojson.geometry.coordinates[0][0]>180 || geojson.geometry.coordinates[0][0]<-180) ||
    (geojson.geometry.coordinates[0][1]>90 || geojson.geometry.coordinates[0][1]<-90) ) {
      modal.style.display = "block";
        $(".modal-paragraph")[0].innerHTML = 'Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.';
      return false;
    }
  } else if ( (geojson.geometry.coordinates[0][0][0]>180 || geojson.geometry.coordinates[0][0][0]<-180) ||
  (geojson.geometry.coordinates[0][0][1]>90 || geojson.geometry.coordinates[0][0][1]<-90) ) {
    modal.style.display = "block";
      $(".modal-paragraph")[0].innerHTML = 'Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.';
    return false;
  }

  return true;
};

function checkShpData(data) {

  let geojson = data.geojson[0];

  if(geojson.coordinates.length===0){
    modal.style.display = "block";
      $(".modal-paragraph")[0].innerHTML = 'GeoJSON has no coordinates. Please submit a file with at least one feature.';
    return false;
  }

  if (!geojson.coordinates[0][0].length) {

    if ( (geojson.coordinates[0][0]>180 || geojson.coordinates[0][0]<-180) ||
    (geojson.coordinates[0][1]>90 || geojson.coordinates[0][1]<-90) ) {
      modal.style.display = "block";
        $(".modal-paragraph")[0].innerHTML = 'Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.';

      return false;
    }

  } else if ( (geojson.coordinates[0][0][0]>180 || geojson.coordinates[0][0][0]<-180) ||
  (geojson.coordinates[0][0][1]>90 || geojson.coordinates[0][0][1]<-90) ) {
    modal.style.display = "block";
      $(".modal-paragraph")[0].innerHTML = 'Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.';

    return false;
  }

  return true;
};

// reveal Create Plan option if file has passed checks upon Submit

function displayCreatePlan(boolean){

  var checkGo = $(".check-go")[0];

  if(boolean){
    checkGo.style.display = "block";
  }
};

// create geoData object with bbox, coordinates, and cleaned up geojson with data returned from KML to GeoJson converter

function modifyKMLGeoJson(data) {

  geoData.coordinates = [];

  if (data.features.length > 1 && data.features[0].geometry.coordinates[0].length <= 3) {
    data.features.forEach((el) => el.geometry.coordinates.forEach((el)=> geoData.coordinates.push(el)));

  } else if (data.features.length === 1 && data.features[0].geometry.coordinates[0][0].length <= 3) {
    data.features[0].geometry.coordinates[0].forEach((el)=> geoData.coordinates.push(el) );
  }

  else if (data.features.length === 1 && data.features[0].geometry.coordinates[0].length <= 3) {
    data.features[0].geometry.coordinates.forEach((el) => geoData.coordinates.push(el))
  }

  geoData.coordinates.forEach((coordinate) => coordinate.splice(2));

  geoData.coordinates = [geoData.coordinates];

  let data1 = {polygon: geoData.coordinates};

  geoData.geojson = GeoJSON.parse(data1, {'Polygon': 'polygon'});

  let shape1 = {type: 'Polygon', coordinates: geoData.coordinates}

  geoData.bbox = turf.bbox(shape1);

  return geoData;
};

// create geoData object with bbox, coordinates, and cleaned up geojson with data returned from SHP to GeoJson converter

function modifySHPGeoJson(data) {

  if (data.geojson.length === 1 && data.geojson[0].coordinates.length === 1) {

    createGeoData(data.geojson[0], geoData);

  }

  if (data.geojson.length === 1 && data.geojson[0].coordinates.length > 1) {

    let tempGeoDataArr = [];

    data.geojson[0].coordinates.forEach((coordsArr)=>tempGeoDataArr.push({polygon: [coordsArr]}));

    let tempGeoJson = tempGeoDataArr.map((geoObj)=>GeoJSON.parse(geoObj, {'Polygon':'polygon'}));

    let finalArr = [];

    for (let i=0; i<tempGeoJson.length; i++) {
      for (let j=0; j<tempGeoJson.length; j++) {
        if (i!==j) {
          if ( turf.booleanContains(tempGeoJson[i].geometry,tempGeoJson[j].geometry) ) {
            finalArr.push(tempGeoJson[i].geometry)
          }
        }
      }
    }

    createGeoData(finalArr[0], geoData);

    }

    if (data.geojson.length > 1) {

      let tempGeoDataArr = [];

      data.geojson.forEach((geojson)=>tempGeoDataArr.push({polygon: [geojson.coordinates]}));

      let tempGeoJson = tempGeoDataArr.map((geoObj)=>GeoJSON.parse(geoObj, {'Polygon':'polygon'}));

      let finalArr = [];

      let max = tempGeoJson[0].geometry;

      for (let i=1; i<tempGeoJson.length; i++) {
        if ( turf.booleanContains(tempGeoJson[i].geometry, max) ) {
          max = tempGeoJson[i].geometry;
        }
      }

      finalArr.push(max);

      createGeoData(finalArr[0], geoData);
    }

  return geoData;
};

// helper function to create bbx, coordinates, and geojson properties on geoData object

function createGeoData(geoJsonObj, geoDataObj) {

  let geojsonPrelim = {polygon:geoJsonObj.coordinates};

  geoDataObj.geojson = GeoJSON.parse(geojsonPrelim, {'Polygon':'polygon'});

  geoDataObj.bbox = turf.bbox(geoJsonObj);

  geoDataObj.coordinates = geoJsonObj.coordinates;

  return geoDataObj;
};

// create geoData object with bbox, coordinates, and cleaned up geojson with data returned from ZIP to GeoJson converter

function modifyZIPGeoJson(data) {

  geoData.bbox = data.features[0].geometry.bbox;

  if (data.features[0].geometry.coordinates.length > 1) {
    geoData.coordinates = [data.features[0].geometry.coordinates];
  } else {
    geoData.coordinates = data.features[0].geometry.coordinates;
  }

  let geojsonPrelim = {polygon:geoData.coordinates};

  geoData.geojson = GeoJSON.parse(geojsonPrelim, {'Polygon':'polygon'});

  return geoData;
};

// get coordinates for parallel lines approximately 220 feet from each other

function getParallels(bbox) {

  let difference = bbox[3]-bbox[1];
  let times = Math.floor(difference/0.0006036);
  let parallels = [];
  for (i=0; i<times; i++) {
    let line = [];
    let parallel = 'line '+(1+i);
    let newLat =  Number( (bbox[1]+((1+i)*0.0006036)).toFixed(15) );
    let val = [ [bbox[0], newLat], [bbox[2], newLat] ];
    line.push(val);
    parallels.push(line);
  }

  if (parallels.length === 0) {
    parallels = [
                  [
                    [
                      [ bbox[0], bbox[1] ], [bbox[2], bbox[1] ]
                    ]
                  ],
                  [
                    [
                      [bbox[0], bbox[3] ],[bbox[2], bbox[3] ]
                     ]
                  ]
                ];
  }

  return parallels;
};


function findIntersections(geoData) {

  let parallelLines = getParallels(geoData.bbox);

  let parallelsGeo = parallelLines.map( (el) => turf.lineString(el[0]));

  let intersectArray = [];

  parallelsGeo.forEach((el) => intersectArray.push( turf.lineIntersect(el.geometry, geoData.geojson) ) );

  let intersections = [];

  let arr3 = [];

  intersectArray.forEach( (intersectGeo) => intersectGeo.features.forEach( (intGeo) => arr3.push(intGeo.geometry.coordinates) ) );

  for (let i=0; i<parallelLines.length; i++) {
    let arr2 = []
    for (let j=0; j<arr3.length; j++){
      if (parallelLines[i][0][0][1] === arr3[j][1]){
        arr2.push(arr3[j]);
      }
    }
    intersections.push(arr2);
  }

  geoData.intersections = intersections;

  return geoData;
};

// if there are more than 2 intersections get the outermost intersections that bound the polygon and order intersections West to East

function getOuterBounds(geoData) {

  let intersections = geoData.intersections;

  for (let i=0; i<intersections.length; i++) {
    if (intersections[i].length === 2) {
      intersections[i].sort((a,b) => a[0]-b[0]);
    }
    if (intersections[i].length > 2) {
      intersections[i].sort((a,b) => a[0]-b[0]);

      let newIntersections = [intersections[i][0], intersections[i][intersections[i].length-1]];

      intersections[i]=newIntersections;
    }
  }

  return geoData;
};

// in an array of coordinates, find those that fall in between two points

function nextPoint(point1, point2, arrayOfPoints) {

  let nextSet = [];

  for (let i=0; i<arrayOfPoints.length; i++) {

    if (point1[0]<point2[0]) {
      if (arrayOfPoints[i][0]<point2[0] && arrayOfPoints[i][0]>point1[0] && arrayOfPoints[i][1]<point2[1] && arrayOfPoints[i][1]>point1[1]
      ) {
        nextSet.push(arrayOfPoints[i]);
      }
    }

    else if (point1[0]>point2[0]) {
      if (arrayOfPoints[i][0]>point2[0] && arrayOfPoints[i][0]<point1[0] && arrayOfPoints[i][1]<point2[1] && arrayOfPoints[i][1]>point1[1]
      ) {
        nextSet.push(arrayOfPoints[i]);
      }
    }
  }

  return nextSet;
};

function alternateIntersections(intersections) {

  for (let i=0; i<intersections.length; i++) {
    if (intersections[i].length < 2) {
      return intersections[i];
    } else {
      if (i%2!==0) {
        intersections[i].sort((a,b)=>b[0]-a[0]);
      }
      if (i%2==0) {
        intersections[i].sort((a,b) => a[0]-b[0]);
      }
    }
  }

  return intersections;
};

// create drone path

function createPath(geoData) {

  geoData.intersections = alternateIntersections(geoData.intersections);

  let newPath = [];

  newPath.push(geoData.intersections[0][0],geoData.intersections[0][1]);

  for (let i=1; i<geoData.intersections.length; i++) {

    let newPoints = nextPoint(newPath[newPath.length-1], geoData.intersections[i][0], geoData.coordinates[0]);

    if (newPoints.length !==0) {
      newPoints.forEach((newPoint) => newPath.push(newPoint));
    }

    newPath.push(geoData.intersections[i][0], geoData.intersections[i][1]);
  }

  geoData.newPath = newPath;

  return geoData;
};
