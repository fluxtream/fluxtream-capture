/**
 * This small service provides a device id (Parse's installation id) and
 * methods to get is asynchronously or synchronously
 */
define([
  'app-modules',
  'config/env',
  'services/user-prefs-service'
], function(appModules, env) {
  
  appModules.services.factory("DeviceIdService", ["UserPrefsService",
    function(userPrefs) {
      
      var callbacks = [];
      var pendingRequest = false;
      
      function generateUUID(){
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = (d + Math.random()*16)%16 | 0;
          d = Math.floor(d/16);
          return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
      };
      
      /**
       * Fetches the device id if needed and returns it asynchronously
       */
      function getDeviceIdAsync(callback) {
        userPrefs.onReady(function() {
          // Get device id from local storage
          var deviceId = userPrefs.getGlobal("login.deviceId");
          // Call callback directly if the device id is available
          if (deviceId) {
            callback(deviceId);
            return;
          }
          // Add callback to the list of callbacks
          callbacks.push(callback);
          // Start request to fetch the device id
          if (env["using_parse"]) {
            fetchDeviceId();
          } else {
            deviceId = generateUUID();
            userPrefs.setGlobal("login.deviceId", deviceId);
            // Execute callbacks
            callbacks.forEach(function(callback) {
              callback(deviceId);
            });
          }
        });
      }
      
      /**
       * [Private] Tries fetching the device id until it is fetched
       */
      function fetchDeviceId() {
        if (!pendingRequest) {
          pendingRequest = true;
          if (!forge.is.web()) {
            forge.parse.installationInfo(
              // Success
              function(info) {
                // Store device id
                userPrefs.setGlobal("login.deviceId", info.id);
                // Execute callbacks
                callbacks.forEach(function(callback) {
                  callback(info.id);
                });
                pendingRequest = false;
              },
              // Error
              function(content) {
                forge.logging.error("Getting parse information failed: " + JSON.stringify(content));
                // Try again
                pendingRequest = false;
                setTimeout(fetchDeviceId, 1000);
              }
            );
          } else {
            var id = "web_" + forge.tools.UUID();
            userPrefs.setGlobal("login.deviceId", id);
            // Execute callbacks
            callbacks.forEach(function(callback) {
              callback(id);
            });
          }
        }
      }
      
      // Public API
      return {
        getDeviceIdAsync: getDeviceIdAsync,
      };
      
    }
  ]);
  
});
