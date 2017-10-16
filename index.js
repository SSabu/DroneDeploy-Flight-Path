let shapefile = '../shapefiles/trial2';
let data = {};

function getGeoJson(geojson) {
  console.log(geojson);
  data.bbox = geojson.features[0].geometry.bbox,
  data.coordinates = geojson.features[0].geometry.coordinates,
  data.type = geojson.features[0].geometry.type
  return data;
}

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

  data.orderedIntersections = orderedIntersections;

  return data;
}




shp(shapefile).then(getGeoJson)
  .then(findIntersections)
  .then(orderIntersections)
  .then(console.log)
  .catch(err=>console.log(err));

  console.log('THIS IS DATA',data);

//
// console.log('TRIAL', boundary, parallelLines);
