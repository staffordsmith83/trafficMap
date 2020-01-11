//jquery function to run classification when 'draw thematic' button is clicked
$('#drawitbtn').click(drawIt);


//runs classification with default settings 3s after page starts loading. This may be problematic for slow connections.
setTimeout(drawIt, 3000);

//some global vars here
var classSeries;
var classColors;
//color start from
var colorFrom ='FFFFFF';
//color end to
var colorTo = '1A8B16';
var defaultStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: 'rgba(255, 255, 255, 0.3)'
  }),
  stroke: new ol.style.Stroke({
    color: 'rgba(0, 255, 0, 1)',
    width: 1
  }),
  text: new ol.style.Text({
    font: '12px Calibri,sans-serif',
    fill: new ol.style.Fill({
      color: '#000'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 3
    }),

  }),
  image: new ol.style.Circle({
	radius: 16,
	fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.3)'}),
	stroke: new ol.style.Stroke({
	  color: 'black',
	  width: 1
	})
	})
});

var cameraStyle =  new ol.style.Style({
	image: new ol.style.Icon({

	      // anchor: [0.5, 0.5],
          // size: [52, 52],
          // offset: [52, 0],
          // opacity: 0.5,
          scale: .05,
          src: "images/camera.png"
})
});

var trafficLightStyle =  new ol.style.Style({
	image: new ol.style.Icon({

	      // anchor: [0.5, 0.5],
          // size: [52, 52],
          // offset: [52, 0],
          // opacity: 0.5,
          scale: .08,
          src: "images/transport_traffic_lights.png"
})
});

//our methods here


//DEFINE MAP LAYERS


//Background layer
var OSM = new ol.layer.Tile({
      source: new ol.source.OSM()
    });


// Security Cameras WFS
var securityCameras = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: "https://services.slip.wa.gov.au/public/services/SLIP_Public_Services/Infrastructure_and_Utilities_WFS/MapServer/WFSServer?service=wfs&version=2.0.0&request=GetFeature&typeNames=SLIP_Public_Services_Infrastructure_and_Utilities_WFS:Security_Cameras__COP-003_&srsname=EPSG:4326&outputFormat=GEOJSON&BBOX=-31.967855,115.837827,-31.929547,115.897565",

	}),
	style: cameraStyle,

});


// Traffic Lights WFS
var trafficLights = new ol.layer.Vector({
	source: new ol.source.Vector({
		format: new ol.format.GeoJSON(),
		url: "https://mrgis.mainroads.wa.gov.au/arcgis/services/OpenData/RoadAssets_DataPortal/MapServer/WFSServer?service=WFS&version=2.0.0&request=GetFeature&typeNames=OpenData_RoadAssets_DataPortal:Traffic_Signal_Sites&outputFormat=GEOJSON",

	}),
	style: trafficLightStyle,
});


// Traffic Count WFS - USE THIS AS MY DATA LAYER INSTEAD OF THE COUNTRIES ONE...
var vectorLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url: "https://services.slip.wa.gov.au/public/services/SLIP_Public_Services/Transport_WFS/MapServer/WFSServer?service=wfs&version=2.0.0&request=GetFeature&typeNames=SLIP_Public_Services_Transport_WFS:CoP_Traffic_Count__COP-026_&srsname=EPSG:4326&outputFormat=GEOJSON&BBOX=-31.967855,115.837827,-31.929547,115.897565",

      }),
	  style: defaultStyle,
});


// Initiate the Map
var map = new ol.Map({
  layers: [
    OSM,
	trafficLights,
	securityCameras,
	vectorLayer
  ],
  target: 'map',
  view: new ol.View({
    center: ol.proj.transform([115.8605, -31.9540], 'EPSG:4326', 'EPSG:3857'),
    zoom: 15
  })
});


// CODE FOR Geolocation overlay
const GPSlayerSource = new ol.source.Vector();
const GPSlayer = new ol.layer.Vector({
  source: GPSlayerSource
});
map.addLayer(GPSlayer);


//styling for Geolocation
const style = new ol.style.Style({
  fill: new ol.style.Fill({
    color: 'rgba(0, 0, 255, 0.2)'
  }),
  image: new ol.style.Icon({
    src: 'data/location-heading.svg',
    imgSize: [27, 55],
    rotateWithView: true
  })
});
GPSlayer.setStyle(style);

// gets device location and adds features based on this to 'source'
// on which the GPSlayer is built
navigator.geolocation.watchPosition(function(pos) {
  const coords = [pos.coords.longitude, pos.coords.latitude];
  const accuracy = ol.geom.Polygon.circular(coords, pos.coords.accuracy);
  GPSlayerSource.clear(true);
  GPSlayerSource.addFeatures([
    new ol.Feature(accuracy.transform('EPSG:4326', map.getView().getProjection())),
    new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(coords)))
  ]);
}, function(error) {
  alert(`ERROR: ${error.message}`);
}, {
  enableHighAccuracy: true
});


//enable 'locate' button functionality
const locate = document.createElement('div');
locate.className = 'ol-control ol-unselectable locate';
locate.innerHTML = '<button title="Locate me">◎</button>';
locate.addEventListener('click', function() {
  if (!GPSlayerSource.isEmpty()) {
    map.getView().fit(GPSlayerSource.getExtent(), {
      maxZoom: 18,
      duration: 500
    });
  }
});
map.addControl(new ol.control.Control({
  element: locate
}));


/**
 * do the themmatic classification
 */
function drawIt(){
var trafficVals = new Array();
vectorLayer.getSource().getFeatures().forEach(function(feat) {
trafficVals.push(feat.get("AVG_Weekday_Traffic"))
});
console.info("trafficVals",trafficVals);
getAndSetClassesFromData(trafficVals, getClassNum(), getMethod());
vectorLayer.setStyle(setStyle);
}


/**
 * @data {Array} the array of numbers (these are the pop data for all countries)
 * @numclasses {Integer} get the number of classes
 * @method {String}  get the classification method
 *
 *
 * set geostats object
 * set the series
 * set the colors ramp
 *
 */
function getAndSetClassesFromData(data, numclasses, method) {
  var serie = new geostats(data);
  var legenLabel = "";
  if (method === "method_EI") {
    serie.getClassEqInterval(numclasses);
    methodLabel = "Equal Interval";
  } else if (method === "method_Q") {
    serie.getClassQuantile(numclasses);
    methodLabel = "Quantile";
  } else if (method === "method_SD") {
    serie.getClassStdDeviation(numclasses);
    methodLabel = "Standard Deviation ";
  } else if (method === "method_AP") {
    serie.getClassArithmeticProgression(numclasses);
    methodLabel = "Arithmetic Progression";
  } else if (method === "method_GP") {
    serie.getClassGeometricProgression(numclasses);
    methodLabel = "Geometric Progression ";
  } else if (method === "method_CJ") {
    serie.getClassJenks(numclasses);
    methodLabel = "Class Jenks";
  } else {
  alert("error: no such method.")
  }
 var colors_x = chroma.scale([colorFrom, colorTo]).colors(numclasses)

 serie.setColors(colors_x);
document.getElementById('legend').innerHTML = serie.getHtmlLegend(null, "AVG Weekday Traffic</br> Method:"+methodLabel, 1);
classSeries = serie;
classColors = colors_x;
}




/**
 * function to verify the style for the feature
 */
function setStyle(feat,res) {
  var currVal = parseFloat(feat.get("AVG_Weekday_Traffic"));
  var bounds = classSeries.bounds;
  var numRanges = new Array();
  for (var i = 0; i < bounds.length-1; i++) {
  numRanges.push({
      min: parseFloat(bounds[i]),
      max: parseFloat(bounds[i+1])
    });
  }
  var classIndex = verifyClassFromVal(numRanges, currVal);
  var polyStyleConfig = {
    stroke: new ol.style.Stroke({
      color: 'rgba(255, 0, 0,0.3)',
      width: 1
    })
  };


  var textStyleConfig = {};
  var label = res < 5000 ? feat.get('NAME') : '';
  if (classIndex !== -1) {

	polyStyleConfig = {
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 255, 1.0)',
        width: 1
      }),
      fill: new ol.style.Stroke({
        color: hexToRgbA(classColors[classIndex],0.7)
      })
    };

	pointStyleConfig = {
	image: new ol.style.Circle({
	radius: 16,
	fill: new ol.style.Fill({color: hexToRgbA(classColors[classIndex],0.7)}),
	stroke: new ol.style.Stroke({
	  color: 'black',
	  width: 1
	})
	})
  };

    textStyleConfig = {
      text: new ol.style.Text({
        text: label,
        font: '12px Calibri,sans-serif',
        fill: new ol.style.Fill({
          color: "#000000"
        }),
        stroke: new ol.style.Stroke({
          color: "#FFFFFF",
          width: 2
        })
      }),
	  geometry: function(feature) {
        var retPoint;
        if (feature.getGeometry().getType() === 'MultiPolygon') {
          retPoint = getMaxPoly(feature.getGeometry().getPolygons()).getInteriorPoint();
        } else if (feature.getGeometry().getType() === 'Polygon') {
          retPoint = feature.getGeometry().getInteriorPoint();

        }
		  else if (feature.getGeometry().getType() === 'Point') {
          retPoint = feature.getGeometry();

        }
        return retPoint;
      }
    }
  };

  var textStyle = new ol.style.Style(textStyleConfig);
  //changed next line to refer to pointStyleConfig instead of polyStyleCOnfig
  var style = new ol.style.Style(pointStyleConfig);
  return [style, textStyle];
}

//*************helper functions this point forward***************//

function verifyClassFromVal(rangevals, val) {
  var retIndex = -1;
  for (var i = 0; i < rangevals.length; i++) {
    if (val >= rangevals[i].min && val <= rangevals[i].max) {
      retIndex = i;
    }
  }
  return retIndex;
}

/**
 *   get the user selected method
 */
function getMethod(){
var elem = document.getElementById("methodselector");
var val = elem.options[elem.selectedIndex].value;
return val;
}

/**
 *   get the user selected number of classes
 */
function getClassNum(){
var elem = document.getElementById("classcount");
return parseInt(elem.value);
}



/**
 * convert hex to rgba
 *
 */
function hexToRgbA(hex,opacity) {
  var c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ','+opacity+')';
  }
  throw new Error('Bad Hex');
}


