/**
 * This service synchronizes the photos and photo metadata with the server
 */
define([
  'config/env',
  'app-modules',
  'services/login-service',
  'services/photo-list-service'
], function(env, appModules) {
  
  appModules.services.factory("PhotoSynchronizationService", [
    "LoginService",
    "UserPrefsService",
    "$rootScope",
    "PhotoListService",
    function(loginService, userPrefs, $rootScope, photoListService) {
      
      // No photos on web
      if (forge.is.web()) return;
      
      /* Initializing native photo upload module */
      
      // True once the native photo upload module has been initialized
      var photoUploadModuleInitialized = false;
      
      // Functions to execute once the photo list has been initialized
      var functionsToExecute = [];
      
      /**
       * (Public) Executes a function once the photo-upload module has been initialized
       */
      function onReady(functionToExecute) {
        if ($.isFunction(functionToExecute)) {
          if (photoUploadModuleInitialized) {
            functionToExecute();
          } else {
            functionsToExecute.push(functionToExecute);
          }
        }
      }
      
      // Initialize the autoupload service with the autoupload parameters from user prefs
      function startAutoupload() {
          var options = {
            userId: loginService.getUserId(),
            upload_url: loginService.getTargetServer() + "api/v1/bodytrack/photoUpload?connector_name=fluxtream_capture",
            authentication: '', // Authentication replaced with token
            access_token: userPrefs.get('login.fluxtream_access_token'),
            access_token_expiration: 99999999999999, // No expiration
            access_token_update_url: "..." // No renewal needed
          };
          var orientation = [];
          if (forge.is.android()) {
            orientations = ['portrait', 'landscape'];
          } else {
            orientations = ['portrait', 'upside_down', 'landscape_left', 'landscape_right'];
          }
          orientations.forEach(function(orientation) {
            options['upload_' + orientation] = userPrefs.get('user.' + loginService.getUserId() +  '.photos.autoupload_' + orientation, false);
            options[orientation + '_minimum_timestamp'] = userPrefs.get('user.' + loginService.getUserId() +  '.photos.' + orientation + "_minimum_timestamp", 0);
          });
          forge.flx_photoupload.setAutouploadOptions(options,
            // Success
            function() {},
            // Error
            function(error) {
              forge.logging.error("Error starting the autoupload service: " + JSON.stringify(error));
            }
          );
      }
      
      userPrefs.onReady(function() {
        if (loginService.isAuthenticated()) {
          startAutoupload();
        }
      });
      
      // Initialize native photo upload module
      $rootScope.$on("user-logged-in", function() {
        userPrefs.onReady(function() {
          forge.flx_photoupload.setUploadParameters(
            // Parameters
            {
              userId: loginService.getUserId(),
              upload_url: loginService.getTargetServer() + "api/v1/bodytrack/photoUpload?connector_name=fluxtream_capture",
              authentication: '', // Authentication replaced with token
              access_token: userPrefs.get('login.fluxtream_access_token'),
              access_token_expiration: 99999999999999, // No expiration
              access_token_update_url: "..." // No renewal needed
            },
            // Success
            function() {
              photoUploadModuleInitialized = true;
              // Upload all pending photos
              var unuploadedPhotos = JSON.parse(userPrefs.get("user." + loginService.getUserId() + ".photo.unuploaded", "[]"));
              unuploadedPhotos.forEach(function(photoId) {
                forge.flx_photoupload.uploadPhoto(photoId);
              });
              // Start autoupload service at initialization if needed
              startAutoupload();
              // Execute onReady functions
              functionsToExecute.forEach(function(functionToExecute) {
                functionToExecute();
              });
              functionsToExecute = [];
            },
            // Error
            function(error) {
              forge.logging.error("Call to setUploadParameters failed: " + JSON.stringify(error));
            }
          );
        });
      });
      $rootScope.$on("user-logged-out", function() {
        forge.flx_photoupload.logoutUser(
          // Success
          function() {},
          // Error
          function() {
            forge.logging.error("Error while stopping the autoupload service");
          }
        );
      });
      
      /* Setting synchronization status for photos and metadatas */
      
      /**
       * Adds the given photo to the unsynchronized list
       *
       * @param {int} The photo to add to the unsynchronized list
       * @param {string} "metadata" or "photo"
       */
      function addToUnsynchronized(photoId, type) {
        var pref = "user." + loginService.getUserId() + "." + (type === "metadata" ? "photo.metadata.unsynchronized" : "photo.unuploaded");
        var unsynchronized = JSON.parse(userPrefs.get(pref, "[]"));
        if (unsynchronized.indexOf(photoId) === -1) {
          unsynchronized.push(photoId);
        }
        userPrefs.set(pref, JSON.stringify(unsynchronized));
      }
      
      /**
       * Removes the given photo from the unsynchronized list
       *
       * @param {int} The photo to add to the unsynchronized list
       * @param {string} "metadata" or "photo"
       */
      function removeFromUnsynchronized(photoId, type) {
        var pref = "user." + loginService.getUserId() + "." + (type === "metadata" ? "photo.metadata.unsynchronized" : "photo.unuploaded");
        var unsynchronized = JSON.parse(userPrefs.get(pref, "[]"));
        if (unsynchronized.indexOf(photoId) !== -1) {
          unsynchronized.splice(unsynchronized.indexOf(photoId), 1);
        }
        userPrefs.set(pref, JSON.stringify(unsynchronized));
      }
      
      // When a photo is uploaded
      forge.internal.addEventListener("photoupload.uploaded", function(data) {
        // Remove photo from unuploaded list
        removeFromUnsynchronized(data.photoId, "photo");
        // Retry synchronizing metadata
        synchronizeNow();
      });
      
      /* Loading metadata */
      
      /**
       * Downloads the metadata associated with a photo
       * 
       * preload is called if there is cached metadata for this photo
       * success is called with the downloaded metadata
       * error is called if the request failed
       * notUploaded is called if the photo is not uploaded (and therefore has no metadata online)
       */
      function getMetadata(photoId, preload, success, error, notUploaded) {
        // Get cached metadata
        var metadata = userPrefs.get("user." + loginService.getUserId() + ".photo.metadata." + photoId);
        if (metadata) {
          preload(JSON.parse(metadata));
        }
        // Check if there is unsynchronized metadata for this photo
        var unsynchronized = JSON.parse(userPrefs.get("user." + loginService.getUserId() + ".photo.metadata.unsynchronized", "[]"));
        var metadataIsUnsynchronized = false;
        unsynchronized.forEach(function(unsyncPhotoId) {
          if (unsyncPhotoId == photoId) {
            metadataIsUnsynchronized = true;
          }
        });
        if (metadataIsUnsynchronized && metadata) {
          // There is unsynchronized metadata for this photo, don't download
          success(JSON.parse(metadata));
          return;
        }
        // Get facet for photo
        if (forge.is.connection.connected()) {
          forge.flx_photoupload.getFacetId(parseInt(photoId),
            // Success
            function(facetId) {
              // Download metadata
              loginService.ajax({
                url: loginService.getTargetServer() + "api/bodytrack/metadata/" + loginService.getUserId() + "/FluxtreamCapture.photo/" + facetId + "/get",
                type: "GET",
                timeout: 10000,
                success: function(response) {
                  userPrefs.set("user." + loginService.getUserId() + ".photo.metadata." + photoId, response);
                  success(JSON.parse(response));
                },
                error: function(response) {
                  forge.logging.error("Error while downloading photo metadata: " + JSON.stringify(response));
                  error();
                }
              });
            },
            // Error
            function(error) {
              // Photo is not uploaded
              notUploaded();
            }
          );
        } else {
          // No connection
          error();
        }
      }
      
      /* Synchronizing metadata */
      
      /**
       * Sends a request to upload the metadata of the given photo
       */
      function synchronizeMetadataOfPhoto(photoId) {
        // Get metadata
        var metadata = userPrefs.get("user." + loginService.getUserId() + ".photo.metadata." + photoId);
        if (!metadata) {
          removeFromUnsynchronized(photoId, "metadata");
          return;
        } else {
          // Convert tag array to comma-separated string
          metadata = JSON.parse(metadata);
          var tags = "";
          metadata.tags.forEach(function(tag) {
            if (tag) tags += (tags ? "," : "") + tag;
          });
          metadata.tags = tags;
        }
        // Get facet for photo
        forge.flx_photoupload.getFacetId(parseInt(photoId),
          // Success
          function(facetId) {
            loginService.ajax({
              url: loginService.getTargetServer() + "api/bodytrack/metadata/" + loginService.getUserId() + "/FluxtreamCapture.photo/" + facetId + "/set",
              type: "POST",
              data: metadata,
              success: function(response) {
                // Remove from unsynchronized list
                removeFromUnsynchronized(photoId, "metadata");
              },
              error: function(response) {
                forge.logging.error("Error while uploading photo metadata: " + JSON.stringify(response));
              }
            });
          },
          // Error
          function(error) {
            forge.logging.error("Trying to add metadata for photo " + photoId + " that is not uploaded yet");
          }
        );
      }
      
      // The timeout for the next metadata synchronization
      var timeout = null;
      
      /**
       * Tries synchronizing all unsynchronized metadata
       */
      function synchronizeNow() {
        onReady(function() {
          // Cancel pending timeout if any
          clearTimeout(timeout);
          // Schedule next execution
          timeout = setTimeout(synchronizeNow, 300000); // Next try in 5 minutes
          // Synchronize all unsynchronized metadata
          var unsynchronized = JSON.parse(userPrefs.get("user." + loginService.getUserId() + ".photo.metadata.unsynchronized", "[]"));
          unsynchronized.forEach(function(photoId) {
            synchronizeMetadataOfPhoto(photoId);
          });
        });
      }
      
      /**
       * (Public) Adds the photo's metadata to the list of pending synchronizations and synchronizes all pending metadata
       */
      function synchronizeMetadata(photoId) {
        addToUnsynchronized(photoId, "metadata");
        synchronizeNow();
      }
      
      // Initialize synchronization timeout
      timeout = setTimeout(synchronizeNow, 10000);
      
      /* Photo upload */
      
      /**
       * (Public) Marks a photo for upload and uploads it
       */
      function uploadPhoto(photoId, success, error) {
        addToUnsynchronized(photoId, "photo");
        forge.flx_photoupload.uploadPhoto(photoId, success, error);
      }      
      
      /* Photo deletion */
      
      /**
       * (Public) Removes a photo from the server and/or from the device
       */
      function removePhotoFromServerAndDevice(photoId, deleteFromServer, deletePhotoLocally, success, error) {
        if (deleteFromServer) {
          // Get photo facet id
          forge.flx_photoupload.getFacetId(parseInt(photoId),
            // Success
            function(facetId) {
              loginService.ajax({
                url: loginService.getTargetServer() + "api/v1/bodytrack/photo/" + loginService.getUserId() + "/" + facetId,
                type: "DELETE",
                timeout: 10000,
                success: function(response) {
                  // Mark photo as unuploaded
                  forge.flx_photoupload.markPhotoAsUnuploaded(photoId, deletePhotoLocally ? 1 : 0, success, error);
                  // Reload photo list
                  setTimeout(photoListService.reloadPhotos, 1000);
                },
                error: function(response) {
                  forge.logging.error("Error while deleting photo from server: " + JSON.stringify(response));
                  if (response.statusCode == 404) {
                    // Photo does not exist online anymore
                    // Mark photo as unuploaded
                    forge.flx_photoupload.markPhotoAsUnuploaded(photoId, deletePhotoLocally ? 1 : 0, success, error);
                  } else {
                    error();
                  }
                }
              });
            },
            // Error
            function(content) {
              forge.logging.error("Trying to delete from the server photo " + photoId + " that is not uploaded yet: " + JSON.stringify(content));
            }
          );
        } else {
          // Photo not uploaded, only delete it locally
          forge.flx_photoupload.markPhotoAsUnuploaded(photoId, deletePhotoLocally ? 1 : 0, success, error);
          // Reload photo list
          setTimeout(photoListService.reloadPhotos, 1000);
        }
      }
      
      /* Public API */
      
      return {
        getMetadata: getMetadata,
        synchronizeMetadata: synchronizeMetadata,
        uploadPhoto: uploadPhoto,
        onReady: onReady,
        startAutoupload: startAutoupload,
        removePhotoFromServerAndDevice: removePhotoFromServerAndDevice
      };
      
    }
  ]);
  
});
