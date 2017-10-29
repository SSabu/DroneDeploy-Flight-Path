let geoData = {};

var modal = $("#myModal")[0];

var span = $(".close")[0];

//  Expandable section taken from example

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

  var file = $("#input")[0].files[0];

  channelFile(file)

};

//   create plan when Create Plan button is clicked

$("#plan")[0].onclick = function() {

  var file = $("#input")[0].files[0];

  createPlan(file);

};

// Open modal with error message

function modalOpen(message){
  modal.style.display="block";
  $(".modal-paragraph")[0].innerHTML = message;
}

// helper functions:

// check filetype and display error message if not an accepted type

function checkFile(file) {
  var extension = file.substr((file.lastIndexOf('.')+1));
  if (!/(shp|zip|kml)$/ig.test(extension)) {
    modalOpen('Invalid file type: '+extension+'. Please use a .shp, .kml, or .zip file.');
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
  geoData.name = fileName.substring(0, fileName.length-4);
  let extension = fileName.substr((fileName.lastIndexOf('.') +1));
  if (/(shp)$/ig.test(extension)) {
    readFile(file).then(shpToGeo).then(modifySHPGeoJson).then(transformCoordinates).then(droneDeployApi);
  }

  if(/(kml)$/ig.test(extension)) {
    readKMLFile(file).then(fromKML).then(getKMLGeo).then(modifyKMLGeoJson).then(transformCoordinates).then(droneDeployApi);
  }

  if (/(zip)$/ig.test(extension)) {
    readFile(file).then(zipToGeo).then(modifyZIPGeoJson).then(transformCoordinates).then(droneDeployApi);
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
  return $.ajax(kml).done(getKMLGeo).fail(() => {modalOpen('Unable to read file. Please submit a different file.')});
};

// SHP to geoJSON per library syntax - Mike Bostock's

let geoObject = {};

function shpToGeo(shape) {
  let geoArr = [];
  return shapefile.openShp(shape)
  .then(source => {
      return new Promise(function(resolve, reject) {
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

// ZIP to geoJSON per library syntax - Calvin Metcalf's

function zipToGeo(zip) {
  return shp(zip).then(function(geojson) {
    return geojson;
  })
};

// Check data:
//
// 2 functions, checkData for .zip & .kml since geojson is value of the features key while checkShpData since geojson is pushed to an array

function checkData(data) {

  if(data.features.length===0){

    modalOpen('GeoJSON has no coordinates. Please submit a file with at least one feature.');

    return false;
  }

  let geojson = data.features[0];

  if (!geojson.geometry.coordinates[0][0].length) {

    if ( (geojson.geometry.coordinates[0][0]>180 || geojson.geometry.coordinates[0][0]<-180) ||
    (geojson.geometry.coordinates[0][1]>90 || geojson.geometry.coordinates[0][1]<-90) ) {

      modalOpen('Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.');

      return false;
    }
  } else if ( (geojson.geometry.coordinates[0][0][0]>180 || geojson.geometry.coordinates[0][0][0]<-180) ||
  (geojson.geometry.coordinates[0][0][1]>90 || geojson.geometry.coordinates[0][0][1]<-90) ) {

    modalOpen('Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.');

    return false;
  }

  return true;
};

function checkShpData(data) {

  let geojson = data.geojson[0];

  if(geojson.coordinates.length===0){

    modalOpen('GeoJSON has no coordinates. Please submit a file with at least one feature.');

    return false;
  }

  if (!geojson.coordinates[0][0].length) {

    if ( (geojson.coordinates[0][0]>180 || geojson.coordinates[0][0]<-180) ||
    (geojson.coordinates[0][1]>90 || geojson.coordinates[0][1]<-90) ) {

      modalOpen('Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.');

      return false;
    }

  } else if ( (geojson.coordinates[0][0][0]>180 || geojson.coordinates[0][0][0]<-180) ||
  (geojson.coordinates[0][0][1]>90 || geojson.coordinates[0][0][1]<-90) ) {

    modalOpen('Coordinates are not in Longitude/Latitude.  Please submit file with coordinates in Longitude/Latitude.');

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

    data.features.forEach((el) => el.geometry.coordinates.forEach((el) => geoData.coordinates.push(el)));

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

// helper function to create bbox, coordinates, and geojson properties on geoData object

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

// transform array of coordinates into {lat: ,lng: } so it is readable by DroneDeploy API, add centroid in {lat: ,lng: } format so map can pan to vicinity of flight plan

function transformCoordinates(geoData) {

  let centroid = turf.centroid(geoData.geojson);

  let centroidLatLng = {};

  centroidLatLng.lat = centroid.geometry.coordinates[1];
  centroidLatLng.lng = centroid.geometry.coordinates[0];

  let coordinatesTransformed = [];

  for (let j=0; j<geoData.coordinates[0].length; j++) {
    let latlng = {};
    latlng.lat = geoData.coordinates[0][j][1];
    latlng.lng = geoData.coordinates[0][j][0];
    coordinatesTransformed.push(latlng);
  }

  geoData.coordinatesTransformed = coordinatesTransformed;

  geoData.centroid = centroidLatLng;

  return geoData;
};

// make call to Drone Deploy API, send geoData name of flight, geometry of shape, call Plans.create to generate flight path, zoom to vicinity of area of interest, and call Track.successCondition

function droneDeployApi(geoData) {

  const dd = new DroneDeploy({version:1});

  let options = {name: geoData.name, geometry: geoData.coordinatesTransformed};

  dd.then(function(droneDeploy) {
    droneDeploy.Plans.create(options).then(function(plan) {
      droneDeploy.Map.panTo(geoData.centroid, {zoom:14});
      droneDeploy.Track.successCondition();
    });
  });
};
