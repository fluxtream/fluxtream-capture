/**
 * This small service provides a device id (Parse's installation id) and
 * methods to get is asynchronously or synchronously
 */
define([
  'app-modules',
  'services/user-prefs-service'
], function(appModules) {
  
  appModules.services.factory("DeviceIdService", ["UserPrefsService",
    function(userPrefs) {
      
      /**
       * Returns the device id (Warning: getDeviceIdAsync must have been run successfully before calling this)
       */
      function getDeviceId() {
        var deviceId = userPrefs.get("deviceId");
        if (!deviceId) {
          deviceId = generateUUID();
          userPrefs.set("deviceId", deviceId);
        }
        return deviceId;
      }
      
      function generateUUID(){
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = (d + Math.random()*16)%16 | 0;
          d = Math.floor(d/16);
          return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
      };
      
      // Public API
      return {
        getDeviceId: getDeviceId,
      };
      
    }
  ]);
  
});
