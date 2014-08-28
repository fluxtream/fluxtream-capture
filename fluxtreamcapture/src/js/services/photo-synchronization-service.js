/**
 * This service synchronizes the photos and photo metadata with the server
 */
define([
  'config/env',
  'app-modules',
  'services/login-service'
], function(env, appModules) {
  
  appModules.services.factory("PhotoSynchronizationService", ["LoginService", "UserPrefsService",
    function(loginService, userPrefs) {
      
      // No photos on web
      if (forge.is.web()) return;
      
      /* Initializing native photo upload module */
      
      // True once the native photo upload module has been initialized
      var photoUploadModuleInitialized = false;
      
      // Functions to execute once the photo list has been initialized
      var functionsToExecute = [];
      
      // Start autoupload service at initialization if needed
      functionsToExecute.push(function() {
        if (userPrefs.get('photos.autoupload_enabled', false)) {
          forge.logging.info("Starting autoupload service");
          forge.flx_photoupload.startAutouploadService(
            // Success
            function() {
              forge.logging.info("Autoupload service started successfully");
            },
            // Error
            function(error) {
              forge.logging.info("Error starting the autoupload service: " + error);
            }
          );
        } else {
          forge.logging.info("Not starting autoupload service");
        }
      });
      
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
      
      // Initialize native photo upload module
      userPrefs.onReady(function() {
        forge.flx_photoupload.setUploadParameters(
          // Upload URL
          env["fluxtream.home.url"] + "api/bodytrack/photoUpload?connector_name=fluxtream_capture",
          // Authentication
          btoa(userPrefs.get('login.username') + ":" + userPrefs.get('login.password')),
          // Success
          function() {
            photoUploadModuleInitialized = true;
            functionsToExecute.forEach(function(functionToExecute) {
              functionToExecute();
            });
            functionsToExecute = [];
          },
          // Error
          function(error) {
            logging.info("Call to setUploadParameters failed");
            logging.info(error);
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
        var pref = (type === "metadata" ? "photo.metadata.unsynchronized" : "photo.unuploaded");
        var unsynchronized = JSON.parse(userPrefs.get(pref, "[]"));
        if (unsynchronized.indexOf(photoId) === -1) {
          forge.logging.info("Add photo " + photoId + " to " + type + " sync list");
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
        var pref = (type === "metadata" ? "photo.metadata.unsynchronized" : "photo.unuploaded");
        var unsynchronized = JSON.parse(userPrefs.get(pref, "[]"));
        if (unsynchronized.indexOf(photoId) !== -1) {
          forge.logging.info("Remove photo " + photoId + " from " + type + " sync list");
          unsynchronized.splice(unsynchronized.indexOf(photoId), 1);
        } else forge.logging.info(photoId + " not in list");
        userPrefs.set(pref, JSON.stringify(unsynchronized));
      }
      
      // When a photo is uploaded
      forge.internal.addEventListener("photoupload.uploaded", function(data) {
        // Remove photo from unuploaded list
        removeFromUnsynchronized(data.photoId, "photo");
        // Retry synchronizing metadata
        synchronizeNow();
      });
      
      
      /* Synchronizing metadata */
      
      /**
       * Sends a request to upload the metadata of the given photo
       */
      function synchronizeMetadataOfPhoto(photoId) {
        // Get metadata
        var metadata = userPrefs.get("photo.metadata." + photoId);
        if (!metadata) {
          removeFromUnsynchronized(photoId, "metadata");
          return;
        }
        forge.logging.info("Synchronizing metadata for photo " + photoId + ": " + metadata);
        // Get facet for photo
        forge.flx_photoupload.getFacetId(parseInt(photoId),
          // Success
          function(facetId) {
            forge.logging.info(env['fluxtream.home.url'] + "api/bodytrack/metadata/" + loginService.getUserId() + "/FluxtreamCapture.photo/" + facetId + "/set");
            loginService.ajax({
              url: env['fluxtream.home.url'] + "api/bodytrack/metadata/" + loginService.getUserId() + "/FluxtreamCapture.photo/" + facetId + "/set",
              type: "POST",
              data: JSON.parse(metadata),
              success: function(response) {
                forge.logging.info("Metadata successfully saved");
                forge.logging.info(response);
                // Remove from unsynchronized list
                removeFromUnsynchronized(photoId, "metadata");
              },
              error: function(response) {
                forge.logging.info("Error while saving data");
                forge.logging.info(response);
              }
            });
          },
          // Error
          function(error) {
            forge.logging.info("Photo " + photoId + " not uploaded yet");
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
          var unsynchronized = JSON.parse(userPrefs.get("photo.metadata.unsynchronized", "[]"));
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
      
      // Upload all pending photos on initialization
      onReady(function() {
        var unuploadedPhotos = JSON.parse(userPrefs.get("photo.unuploaded", "[]"));
        forge.logging.info("Unuploaded photos: " + JSON.stringify(unuploadedPhotos));
        unuploadedPhotos.forEach(function(photoId) {
          forge.flx_photoupload.uploadPhoto(photoId);
        });
      });
      
      
      /* Public API */
      
      return {
        synchronizeMetadata: synchronizeMetadata,
        uploadPhoto: uploadPhoto,
        onReady: onReady
      };
      
    }
  ]);
  
});
