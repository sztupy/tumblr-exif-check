const L = require('leaflet');
const { ipcRenderer, shell } = require('electron');

var zoomInsufficient = "Please zoom in to the location you want to check whether it appears in any of your images";
var zoomSufficient = "Thank you. Will search for images in the specified location";
var notSearchingForLocation = "Not searching for specific locations inside the images. Please restart the app and zoom into an area if you wish to know if that area is exposed in your posts.";
var searchResultsFound = 'The following post has a GPS location that is inside the specified area: ';

var locationContainer = document.getElementById('location');
var locationData = null;
var isDLFinished = false;

var initMap = function() {
  var map = L.map('map').setView([54.5260, 15.2551], 2);

  var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
  var osm = new L.TileLayer(osmUrl, {minZoom: 2, maxZoom: 13, attribution: osmAttrib});

  map.addLayer(osm);

  var handleMapZoom = function() {
    if (map.getZoom()==13) {
      locationData = {
        east: map.getBounds().getEast(),
        west: map.getBounds().getWest(),
        north: map.getBounds().getNorth(),
        south: map.getBounds().getSouth()
      }
      locationContainer.textContent = zoomSufficient;
    } else {
      locationData = null;
      locationContainer.textContent = zoomInsufficient;
    }
  }

  map.on('moveend', handleMapZoom);
  handleMapZoom();
}

var searchBox = function() {
  document.forms['data'].onsubmit = (event) => {
    event.preventDefault();
    var formElements = document.forms['data'].elements;
    var oauthForm = document.forms['oauth'].elements;
    var oauth = null;
    if (oauthForm['token_secret'].value) {
      oauth = {
        consumer_key: oauthForm['consumer_key'].value,
        consumer_secret: oauthForm['consumer_secret'].value,
        token: oauthForm['token'].value,
        token_secret: oauthForm['token_secret'].value
      };
    }
    var data = {
      username: formElements['username'].value,
      location: locationData,
      oauth: oauth
    };

    if (formElements['username'].value) {
      document.forms['data'].style.display = 'none';
      document.getElementById('progress').style.display = 'block';
      document.getElementById('map').style.display = 'none';
      document.getElementById('text').style.height = 'auto';
      document.getElementById('text').style.bottom = 0;

      if (locationData) {
        locationContainer.textContent = '';
      } else {
        locationContainer.textContent = notSearchingForLocation;
      }

      ipcRenderer.send('startSearch', data);
    }
  }
}

var retryBox = function() {
  document.forms['retry'].onsubmit = (event) => {
    event.preventDefault();
    ipcRenderer.send('relaunchApp');
  }
}

var fixUrl = function() {
  var links = Array.prototype.slice.call(document.getElementsByTagName("a"));
  links.forEach(link => {
    link.onclick = (event) => {
      event.preventDefault();
      shell.openExternal(link.href);
    };
  });
}

ipcRenderer.on('errorDownload', (event) => {
  document.getElementById('error').style.display = 'block';
  document.getElementById('retry').style.display = 'block';
});

ipcRenderer.on('finished', (event) => {
  isDLFinished = true;
});

ipcRenderer.on('progressUpdate', (event,data) => {
  if (typeof data.posts !== 'undefined') {
    document.getElementById('overall-progress').textContent = data.posts.toFixed(0) + '%';
  }
  if (typeof data.queue !== 'undefined') {
    document.getElementById('remainig-images').textContent = data.queue;
    if (isDLFinished && data.queue == 0) {
      document.getElementById('progress').style.display = 'none';
      document.getElementById('done').style.display = 'block';
      document.getElementById('retry').style.display = 'block';
    }
  }
});

ipcRenderer.on('enableWarning', (event,data) => {
  document.getElementById('warning').style.display = 'block';
});

ipcRenderer.on('addImage', (event,data) => {
  document.getElementById('warning').style.display = 'block';
  document.getElementById('location').appendChild(document.createElement('br'));
  document.getElementById('location').appendChild(document.createTextNode(searchResultsFound + data));
});


initMap();
searchBox();
retryBox();
fixUrl();
