let data = {};

var modal = $("#myModal")[0];

var span = $(".close")[0];

// jQuery event handler functions

// display selected file in input text box and verify filetype on file Upload

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

// close modal if opened

span.onclick = function() {
  modal.style.display = "none";
}

window.onclick = function(event) {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

// verify that file has useable data on clicking Submit button

$("#verify")[0].onclick = function() {

  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great, all File APIs are supported
  } else {
    alert("The File APIs are not supported on this browser");
  }

  var file = $("#input")[0].files[0];

  channelFile(file)

}


// check filetype and display error message if not an accepted type

function checkFile(file) {
  var extension = file.substr((file.lastIndexOf('.')+1));
  if (!/(shp|zip|kml)$/ig.test(extension)) {
    modal.style.display = "block";
    $(".modal-paragraph")[0].innerHTML = "Invalid file type: "+extension+". Please use a .shp, .kml, or .zip file.";
  }
};


// read file after submitting, one for KML and one for SHP and ZIP due to different type required per the separate libraries

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
}

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
}

// KML to geoJSON per library syntax

function getKMLGeo(xml) {
  return toGeoJSON.kml(xml);
}

function fromKML(kml) {
  return $.ajax(kml).done(getKMLGeo).fail(function(){
    modal.style.display = "block";
    $(".modal-paragraph")[0].innerHTML = "Unable to read file. Please submit a different file.";
  })
}

// SHP to geoJSON per library syntax

let geoObject = {};

function shpToGeo(shape) {
  let geoArr = [];
  return shapefile.openShp(shape)
  .then(source => source.read()
    .then(function log(result) {
      if (result.done) return;
      geoArr.push(result.value);
      source.read().then(log);
      return geoArr;
    }))
    .then(geoObject)
    .catch(error => console.error(error.stack));
};

function createGeoObject(array) {
  geoObject.geojson = array;
  return geoObject;
};

console.log('GEO OBJET', geoObject);

// ZIP to geoJSON per library syntax  -- may not need

function zipToGeo(zip) {
  return shp(zip).then(function(geojson) {
    return geojson;
  })
}

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


}

function checkShpData(data) {

  let geojson = data[0];

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

}


function displayCreatePlan(boolean){

  var checkGo = $(".check-go")[0];

  if(boolean){
    checkGo.style.display = "block";
  }
}


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

// old getGeoJson

// function getGeoJson(geojson) {
//   data.bbox = geojson.features[0].geometry.bbox,
//   data.coordinates = geojson.features[0].geometry.coordinates,
//   data.type = geojson.features[0].geometry.type,
//   data.orderedCoordinates = geojson.features[0].geometry.coordinates;
//
// // remove duplicate coordinates and elevation point for array of coordinates
//   data.orderedCoordinates = removeDuplicates(data.orderedCoordinates);
//   data.orderedCoordinates.forEach((coordinate) => coordinate.splice(2));
//
//   return data;
// }

// get coordinates for parallel lines approximately 220 feet from each other

function getParallels(bbox) {

  let difference = bbox[3]-bbox[1];
  let times = Math.floor(difference/0.0006036);
  let parallels = [];
  for (i=0; i<times; i++) {
    let line = {};
    let parallel = 'line '+(1+i);
    let newLat =  Number( (bbox[1]+((1+i)*0.0006036)).toFixed(15) );
    let val = [ [bbox[0], newLat], [bbox[2], newLat] ];
    line = { [parallel]: val }
    parallels.push(line);
  }

  return parallels;
}

function removeDuplicates(array) {
  let hash = {};
  let out = [];

  for (let i=0; i<array.length; i++) {
    let key = array[i].join('|').toString();
    if (!hash[key]) {
      out.push(array[i]);
      hash[key]='found';
    }
  }
  return out;
}

function findIntersections(bbox, type, coordinates) {

  let boundary = {"type": data.type, "coordinates":data.coordinates};

  let parallelLines = getParallels(data.bbox);

  // create GeoJSON from coordinates of parallel lines with geojson utils

  let parallelsGeo = parallelLines.map( (el)=>GeoJSON.parse(el, {'LineString': Object.keys(el)[0]} ));

  let intersections = parallelsGeo.map( (el) => gju.lineStringsIntersect(el.geometry, boundary));

  data.intersections = intersections;

  return data;
}

// if there are more than 2 intersections get the outermost intersections that bound the polygon

// re-assign the geojson object so any intersection with more than two points only has two points, the outermost bounds

function getOuterBounds(intersections) {

  let index = [];
  let boundedCoords = [];

  for (let i=0; i<intersections.length; i++) {
    if (intersections[i].length > 2) {
      let temp = [];
      for (let j=0; j<intersections[i].length; j++) {
        temp.push(intersections[i][j].coordinates[1]);
      }
      temp.sort((a,b) => a-b)
      let bound1 = temp[0];
      let bound2 = temp[temp.length-1]

      index.push(i);
      boundedCoords.push([bound1, bound2]);
    }
  }

  for (let i=0; i<index.length; i++) {
    for (let j=0; j<intersections.length; j++) {
      if (index[i]===j) {
        intersections[j] = [ {'type':"Point", 'coordinates':[intersections[j][0].coordinates[0],boundedCoords[i][0] ]},{'type':"Point", 'coordinates':[intersections[j][0].coordinates[0],boundedCoords[i][1] ]}  ]
      }
    }
  }

  return intersections;
}

// order the intersections so they can be read in a system order from west to east

function orderIntersections(intersections) {

  let boundedIntersections = getOuterBounds(data.intersections);

  let orderedIntersections = [];

  data.intersections.forEach((el) => orderedIntersections.push([el[0].coordinates, el[1].coordinates]));

  orderedIntersections.forEach((el) => el.sort((a,b)=>a[1]-b[1]));

// structure intersections similar to coordinate array with [long, lat]

  orderedIntersections.forEach((el) => el.forEach((el) => el.reverse()));

  data.orderedIntersections = orderedIntersections;

  return data;
}

// find coordinate in a set between two points

function nextPoint(point1, point2, arrayOfPoints) {

  for (let i=0; i<data.orderedCoordinates.length; i++) {

    if (arrayOfPoints[i][0]>point2[0] && arrayOfPoints[i][0]<point1[0] && arrayOfPoints[i][1]<point2[1] && arrayOfPoints[i][1]>point1[1]
    ) {
      return arrayOfPoints[i];
    }
  }
}

//transform array based on which direction path travels first

function intersectionsPathLeft(intersections) {

  let flattenedArray = [];

  for (let i=0; i<intersections.length; i++) {
    if (i%2!==0) {
      intersections[i].sort((a,b)=>b[0]-a[0]);
    }
    if (i%2===0) {
      intersections[i].sort((a,b) => a[0]-b[0])
    }
  }
  intersections.forEach((el) => el.forEach((el) => flattenedArray.push(el)));

  return flattenedArray;
}


function intersectionsPathRight(intersections) {

  let flattenedArray = [];

  for (let i=0; i<intersections.length; i++) {
    if (i%2!==0) {

      intersections[i].sort((a,b)=>a[0]-b[0]);
    }
    if (i%2==0) {
      intersections[i].sort((a,b) => b[0]-a[0]);
    }
  }
  intersections.forEach((el) => el.forEach((el) => flattenedArray.push(el)));

  return flattenedArray;
}

//create drone path

function createPath(bbox, orderedIntersections, orderedCoordinates) {

  let newPath = [];
  let newIntersections = [];

  data.orderedCoordinates.forEach(function(el) {
    if (el[1]===data.bbox[1]) {
      newPath.push(el);
    }
  });

  if (nextPoint(newPath[newPath.length-1], data.orderedIntersections[0][0], data.orderedCoordinates) ) {
    newPath.push(nextPoint(newPath[newPath.length-1], data.orderedIntersections[0][0], data.orderedCoordinates));
    newIntersections = intersectionsPathLeft(data.orderedIntersections);
    newPath.push(newIntersections[0], newIntersections[1]);
  }

  else if (nextPoint(newPath[newPath.length-1], data.orderedIntersections[0][1], data.orderedCoordinates)) {
    newPath.push(nextPoint(newPath[newPath.length-1], data.orderedIntersections[0][1], data.orderedCoordinates));
    newIntersections = intersectPathRight(data.orderedIntersections);
    newPath.push(newIntersections[0], newIntersections[1])
  }

  else {
    newIntersections = intersectionsPathLeft(data.orderedIntersections);
    newPath.push(newIntersections[0], newIntersections[1]);
  }

  for (let i=2; i<newIntersections.length; i+=2) {
  if(nextPoint(newPath[newPath.length-1], newIntersections[i], data.orderedCoordinates) ) {
    newPath.push(nextPoint(newPath[newPath.length-1], newIntersections[i], data.orderedCoordinates));
  }

  newPath.push(newIntersections[i], newIntersections[i+1]);
}

  data.newPath = newPath;

  return data;
}


// shp(shapefile).then(getGeoJson)
//   .then(findIntersections)
//   .then(orderIntersections)
//   .then(createPath)
//   .then(console.log)
//   .catch(err=>console.log(err));
//
//   console.log('THIS IS DATA',data);
