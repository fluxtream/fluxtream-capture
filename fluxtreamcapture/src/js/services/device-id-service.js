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
      
      /**
       * Returns the device id (Warning: getDeviceIdAsync must have been run successfully before calling this)
       */
//      function getDeviceId() {
//        var deviceId = userPrefs.get("deviceId");
//        if (!deviceId) {
//          deviceId = generateUUID();
//          userPrefs.set("deviceId", deviceId);
//        }
//        return deviceId;
//      }
      
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
          var deviceId = userPrefs.get("login.deviceId");
          // Call callback directly if the device id is available
          if (deviceId) {
            callback(deviceId);
            return;
          }
          // Add callback to the list of callbacks
          callbacks.push(callback);
          // Start request to fetch the device id
          if (env["using_parse"]) {
            forge.logging.info("Fetching device id from Parse");
            fetchDeviceId();
          } else {
            forge.logging.info("Generating new device id");
            deviceId = generateUUID();
            userPrefs.set("login.deviceId", deviceId);
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
                forge.logging.info(info);
                // Store device id
                userPrefs.set("login.deviceId", info.id);
                // Execute callbacks
                callbacks.forEach(function(callback) {
                  callback(info.id);
                });
              },
              // Error
              function(content) {
                forge.logging.info("Getting parse information failed");
                forge.logging.info(content);
                // Try again
                setTimeout(fetchDeviceId, 500);
              }
            );
          } else {
            var id = "web_" + forge.tools.UUID();
            userPrefs.set("login.deviceId", id);
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
