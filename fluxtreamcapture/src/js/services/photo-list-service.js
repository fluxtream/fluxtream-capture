/**
 * This service loads the list of photos from the device photo gallery and
 * provides a function to get this list.
 * This works only in the mobile app.
 */
define([
  'app-modules',
  'services/login-service'
], function(appModules) {
  
  appModules.services.factory("PhotoListService", ['$rootScope', 'LoginService', function($rootScope, loginService) {
    
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
          forge.logging.info("Loaded photo list");
          // Data can either be json-encoded string or an actual array
          if (typeof jsonArray === 'string') {
            // Json string, convert to array
            photoList = JSON.parse(jsonArray);
          } else {
            // Acual array
            photoList = jsonArray;
          }
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
      $rootScope.$on("user-logged-in", function() {
        loadPhotos();
      });
      $rootScope.$on("user-logged-out", function() {
        // Reset everything
        initialized = false;
        photoList = null;
        functionsToExecute = [];
      });
    }
    
    // Convert internal events to angular events
    
    ["photoupload.started", "photoupload.uploaded", "photoupload.canceled", "photoupload.failed"].forEach(function(eventName) {
      forge.internal.addEventListener(eventName, function(data) {
        forge.logging.info("Native event received: " + eventName + " -> " + JSON.stringify(data));
        $rootScope.$broadcast(eventName, data);
      });
    });
    
    // Public API
    return {
      isInitialized: function() { return initialized; },
      getPhotoList: function() { return photoList; },
      reloadPhotos: reloadPhotos,
      onReady: onReady
    };
    
  }]);
  
});
