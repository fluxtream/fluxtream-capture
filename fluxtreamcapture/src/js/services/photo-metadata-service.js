/**
 * This service synchronizes the photo metadata with the server
 */
define([
  'config/env',
  'app-modules',
  'services/login-service'
], function(env, appModules) {
  
  appModules.services.factory("PhotoMetadataService", ["LoginService", "UserPrefsService",
    function(loginService, userPrefs) {
      
      /**
       * Sends a request to upload the metadata of the given photo
       */
      function synchronizeMetadata(photoId) {
        // Get metadata
        var metadata = userPrefs.get("photo.metadata." + photoId);
        if (!metadata) {
          removeFromUnsynchronized(photoId);
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
                removeFromUnsynchronized(photoId);
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
      
      /**
       * Adds the given photo to the unsynchronized list
       */
      function addToUnsynchronized(photoId) {
        var unsynchronized = JSON.parse(userPrefs.get("photo.metadata.unsynchronized", "[]"));
        if (unsynchronized.indexOf(photoId) === -1) {
          unsynchronized.push(photoId);
        }
        userPrefs.set("photo.metadata.unsynchronized", JSON.stringify(unsynchronized));
      }
      
      /**
       * Removes the given photo from the unsynchronized list
       */
      function removeFromUnsynchronized(photoId) {
        var unsynchronized = JSON.parse(userPrefs.get("photo.metadata.unsynchronized", "[]"));
        if (unsynchronized.indexOf(photoId) !== -1) {
          unsynchronized.splice(unsynchronized.indexOf(photoId), 1);
        } else forge.logging.info(photoId + " not in list");
        userPrefs.set("photo.metadata.unsynchronized", JSON.stringify(unsynchronized));
      }
      
      // The timeout for the next synchronization
      var timeout = null;
      
      /**
       * Tries synchronizing all unsynchronized photos
       */
      function synchronizeNow() {
        // Cancel pending timeout if any
        clearTimeout(timeout);
        // Schedule next execution
        timeout = setTimeout(synchronizeNow, 300000); // Next try in 5 minutes
        // Synchronize all unsynchronized metadata
        var unsynchronized = JSON.parse(userPrefs.get("photo.metadata.unsynchronized", "[]"));
        unsynchronized.forEach(function(photoId) {
          synchronizeMetadata(photoId);
        });
      }
      
      /**
       * (Public) Adds the photo to the list of pending synchronizations and synchronizes
       */
      function synchronize(photoId) {
        addToUnsynchronized(photoId);
        synchronizeNow();
      }
      
      // Initialize synchronization timeout
      timeout = setTimeout(synchronizeNow, 10000);
      
      // Retry synchronizing when a photo has been uploaded
      forge.internal.addEventListener("photoupload.uploaded", function(data) {
        synchronizeNow();
      });
      
      // Public API
      return {
        synchronize: synchronize
      };
      
    }
  ]);
  
});
