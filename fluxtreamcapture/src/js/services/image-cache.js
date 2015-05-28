/**
 * This service caches images to local disk and deletes them when a new version is available
 */
define([
  'app-modules',
  'services/user-prefs-service'
], function(appModules) {
  
  appModules.services.factory('ImageCacheService', ["UserPrefsService",
    function(userPrefs) {
      
      /**
       * (Private) Returns current UTC timestamp in milliseconds
       */
      function now() {
        return new Date().getTime();
      }
      
      /**
       * Caches an image on disk for offline use
       * 
       * @param {string}      url          URL of the image to store locally
       * @param {function}    success(uri) Called with the URI of the image locally stored
       * @param {function}    error        Called if an error occurred while saving the image
       */
      function cacheImage(url, success, error) {
        userPrefs.onReady(function() {
          var json = userPrefs.getGlobal("cache.image." + url);
          if (json) {
            var existingImage = JSON.parse(json);
            if (now() - existingImage.timestamp < 3600000) {
              // Cached image is fresh enough, keep it
              success(existingImage.uri);
              return;
            }
          }
          // Image not cached yet or too old
          // Fetch file and save it locally
          if (url) {
            forge.file.saveURL(url,
              // Success
              function(file) {
                // Convert file to local URI
                forge.file.URL(file,
                  function(uri) {
                    // Remove previous version of this image
                    if (existingImage) {
                      forge.file.remove(existingImage.file);
                    }
                    // Create data object
                    var data = {
                      timestamp: now(),
                      file: file,
                      uri: uri
                    };
                    // Save to prefs
                    userPrefs.setGlobal("cache.image." + url, JSON.stringify(data));
                    // Return URI
                    success(uri);
                  },
                  // Error
                  function(content) {
                    if (error) error(content);
                  }
                );
              },
              // Error
              function(content) {
                if (error) error(content);
              }
            );
          } else {
            if (error) error("URL is null");
          }
        });
      }
      
      /**
       * Returns the local URI of an image cached on disk
       * 
       * @param {string} url Original URL of the image
       * @returns The URI or false if the image is not cached
       */
      function getCachedImageURI(url) {
        var json = userPrefs.getGlobal("cache.image." + url);
        if (!json) return false;
        var image = JSON.parse(json);
        return image.uri;
      }
      
      // Public API
      return {
        cacheImage: cacheImage,
        getCachedImageURI: getCachedImageURI
      };
      
    }
  ]);
  
});
