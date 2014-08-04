/**
 * This service loads the list of photos from the device photo gallery and
 * provides a function to get this list.
 * This works only in the mobile app.
 */
define([
  'app-modules'
], function(appModules) {
  
  appModules.services.factory("PhotoListService", function() {
    
    // Whether the photo list has been initialized
    var initialized = false;
    
    // The list of photos
    var photoList;
    
    // Functions to execute once the photo list has been initialized
    var functionsToExecute = [];
    
    /**
     * (Private) Loads all photos from the device image gallery
     */
    function loadPhotos() {
      // Call native module to get the photo list
      forge.flx_photoupload.getPhotoList(
        // Success
        function(jsonArray) {
          photoList = JSON.parse(jsonArray);
          initialized = true;
          forge.logging.info("Photo list has been initialized");
          functionsToExecute.forEach(function(functionToExecute) {
            functionToExecute();
          });
          functionsToExecute = [];
        },
        // Error
        function(error) {
          forge.logging.error("Error while calling getPhotoList:");
          forge.logging.error(error);
        }
      );
    };
    
    /**
     * Re-runs the photo loading process to update the photo list
     */
    function reloadPhotos() {
      // Don't reload if loading is already in progress
      if (!initialized) return;
      // Reset initialization status
      initialized = false;
      functionsToExecute = [];
      photoList = null;
      // Reload photos
      loadPhotos();
    }
    
    /**
     * (Public) Executes a function once the photo list has been initialized
     */
    function onReady(functionToExecute) {
      if ($.isFunction(functionToExecute)) {
        if (initialized) {
          functionToExecute();
        } else {
          functionsToExecute.push(functionToExecute);
        }
      }
    }
    
    // Initially load photos
    if (!forge.is.web()) {
      loadPhotos();
    }
    
    // Public API
    return {
      isInitialized: function() { return initialized; },
      getPhotoList: function() { return photoList; },
      reloadPhotos: reloadPhotos,
      onReady: onReady
    };
    
  });
  
});
