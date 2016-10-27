const { app, BrowserWindow, ipcMain } = require('electron');
var Tumblr = require('tumblr.js');
var ExifImage = require('exif').ExifImage;
var request = require('request');
var jsdom = require("jsdom");

let mainWindow;

app.on('window-all-closed', () => {
  app.quit();
});

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    fullscreen: false
  });
  //mainWindow.setMenu(null);
  mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});

function findRateLimitHeader(headers, name) {
  return Object.keys(headers).filter(header => header.match('ratelimit') && header.match(name)).map(header => headers[header])[0];
}

ipcMain.on('relaunchApp', () => {
  app.relaunch();
  app.quit();
});

ipcMain.on('startSearch', (event, data) => {
  console.log(data);
  var keys = {
    consumer_key: 'fuiKNFp9vQFvjLNvx4sUwti4Yb5yGutBN4Xh10LXZhhRKjWlV4'
  }
  if (data.oauth) {
    keys = data.oauth;
  }
  var client = Tumblr.createClient(keys);

  var options = {
    limit: 50,
    offset: 0,
    reblog_info: true
  }

  var photosInQueue = 0;

  var checkPhoto = (main, alt) => {
    request({uri:main.url, encoding:null}, function(err,resp,body) {
      var errorHandler = () => {
        if (alt.size>=1) {
          var next = alt.shift();
          checkPhoto(next,alt);
        } else {
          console.log("Warning, could not download " + url + " from post " + main.postUrl + " or any of it's alternatives");
          photosInQueue -= 1;event.sender.send('progressUpdate', { queue: photosInQueue });
        }
      };
      if (err) {
        errorHandler();
      } else {
        new ExifImage({ image : body }, function (error, exifData) {
          photosInQueue -= 1;event.sender.send('progressUpdate', { queue: photosInQueue });
          if (error) {
            // no exif data found or not a jpg
          } else {
            if (exifData.gps && (exifData.gps.GPSLatitude || exifData.gps.GPSLongitude)) {
              event.sender.send('enableWarning');
              if (data.location && exifData.gps.GPSLatitude && exifData.gps.GPSLongitude) {
                var lat = exifData.gps.GPSLatitude[0] + exifData.gps.GPSLatitude[1]/60 + exifData.gps.GPSLatitude[2]/3600;
                if (exifData.gps.GPSLatitudeRef == 'S') {
                  lat = -lat;
                }

                var lon = exifData.gps.GPSLongitude[0] + exifData.gps.GPSLongitude[1]/60 + exifData.gps.GPSLongitude[2]/3600;
                if (exifData.gps.GPSLongitudeRef == 'W') {
                  lon = -lon;
                }
                if (data.location.west <= lon && data.location.east >= lon && data.location.south <= lat && data.location.north >= lat) {
                  event.sender.send('addImage', main.postUrl);
                }
              }
            }
          }
        });
      }
    });
  }

  var searchForPosts = options => {
    client.blogPosts(data.username, options, function(err, body, resp) {
      if (err) {
        if (resp.statusCode == 429) {
          // just rate limiting, wait and retry
          const limit = findRateLimitHeader(resp.headers, '-limit');
          const remaining = findRateLimitHeader(resp.headers, '-remaining');
          const reset = findRateLimitHeader(resp.headers, '-reset');

          var timeout = 1000;
          if (remaining == 0) {
            timeout = reset;
          }
          console.log("API limit exceeded, waiting " + timeout + "ms");
          setTimeout(() => searchForPosts(options), 1000);
        } else {
          // some other issue, return error to display handler
          console.log("Error! " + err);
          event.sender.send('errorDownload', err);
        }
      } else {
        // happy path
        console.log("Download progress " + (options.offset / body.blog.total_posts)*100 + "%");

        body.posts.forEach(post => {
          if (post.photos && !post.reblogged_root_name && (!post.trail || post.trail.length == 0 || (post.trail.length == 1 && post.trail[0].blog.name == data.username))) {
            // search in uploaded photographs
            // we only check photos uploaded by the user themselves, which information is not readily available, so we check a few things:
            // if the reblogged_root_name is empty it is highly likely that this is an original post, however it is also sometimes null for hugely popular images
            // in this case we also check the trail to see if the topmost poster is the user or not. This might fail sometimes, in which case we will
            // believe that this photo is also uploaded by the user
            post.photos.forEach(photo => {
              var photoList = [];
              if (photo.alt_sizes) {
                photoList.push.apply(photoList, photo.alt_sizes);
              }
              if (photo.original_size) {
                photoList.push(photo.original_size);
              }
              if (photoList.length>=1) {
                photoList = photoList.sort((a,b) => a.width - b.width).map(a => ({url:a.url, postUrl: post.post_url, id:post.id}));
                var first = photoList.shift();
                photosInQueue += 1;    event.sender.send('progressUpdate', { queue: photosInQueue });
                checkPhoto(first, photoList);
              }
            });
          }
          if (post.trail && post.trail.length >= 1 && post.trail[post.trail.length-1].blog.name == data.username) {
            // search in inline photos if this is the last element of a reblog trail. This is to check inline posts for problems.
            // Note that this will also check images from external sources
            var doc = jsdom.jsdom(post.trail[post.trail.length-1].content_raw);
            var images = Array.prototype.slice.call(doc.getElementsByTagName("img"));
            images.forEach(image => {
              photosInQueue += 1; event.sender.send('progressUpdate', { queue: photosInQueue });
              checkPhoto({url:image.src, postUrl: post.post_url, id:post.id}, []);
            });
          }
        });

        if (body.posts.length >= options.limit) {
          var newOptions = Object.assign({}, options);
          newOptions.offset += newOptions.limit;
          event.sender.send('progressUpdate', { posts: (options.offset / body.blog.total_posts)*100});
          searchForPosts(newOptions);
        } else {
          event.sender.send('finished');
          event.sender.send('progressUpdate', { posts: (options.offset / body.blog.total_posts)*100, queue: photosInQueue });
          console.log("Done");
        }
      }
    });
  };

  searchForPosts(options);
});
