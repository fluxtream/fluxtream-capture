/**
 * This service initializes the heart rate native modules, and transfers data
 * received from the heart rate module to javascript broadcasted events.
 * This works only in the mobile app.
 */
define([
  'app-modules',
  'services/login-service',
  'services/user-prefs-service'
], function(appModules) {
  
  appModules.services.factory("HeartRateService", [
    '$rootScope',
    'LoginService',
    'UserPrefsService',
    function($rootScope, loginService, userPrefs) {
      
      // The latest upload status ('none', 'uploading', 'synced', 'failed')
      var uploadStatus = 'none';
      var lastSyncTime;
      
      function enableService() {
        // Initiate native background service
        forge.logging.info("Starting heart rate native service");
        forge.flx_polar_h7.startService(
          // Upload URL
          loginService.getTargetServer() + "api/v1/bodytrack/upload",
          // Access token
          loginService.getAccessToken(),
          // Success
          function() {
            forge.logging.info("Heart rate service started");
          },
          // Error
          function(content) {
            forge.logging.info("Error while starting heart rate service");
            forge.logging.info(content);
          }
        );
      }
      
      function disableService() {
        // Stop native background service
        forge.logging.info("Stopping heart rate native service");
        forge.flx_polar_h7.stopService();
      }
      
      function setHeartRateServiceEnabled(enable) {
        if (enable) {
          userPrefs.set('heartrate.' + loginService.getUserId() + ".serviceEnabled", true);
          enableService();
        } else {
          userPrefs.set('heartrate.' + loginService.getUserId() + ".serviceEnabled", false);
          disableService();
        }
      }
      
      userPrefs.onReady(function() {
        if (loginService.isAuthenticated()) {
          if (userPrefs.get('heartrate.' + loginService.getUserId() + ".serviceEnabled")) {
            enableService();
          }
        }
      });
      
      // Start service when a user connects and has enabled the heart rate service
      $rootScope.$on("user-logged-in", function() {
        uploadStatus = 'none';
        forge.logging.info("User " + loginService.getUserId() + " is logged in");
        forge.logging.info("Heartrate enabled : " + userPrefs.get('heartrate.' + loginService.getUserId() + ".serviceEnabled"));
        if (userPrefs.get('heartrate.' + loginService.getUserId() + ".serviceEnabled")) {
          enableService();
        }
      });
      // Stop service when the user logs out
      $rootScope.$on("user-logged-out", function() {
        disableService();
      });
      
      /**
       * Locks the current device, so that we will connect only to that device in the future
       */
      function lockDevice() {
        forge.flx_polar_h7.lockCurrentDevice();
      }
      
      /**
       * Locks the current device, so that we will connect only to that device in the future
       */
      function unlockDevice() {
        forge.flx_polar_h7.unlockCurrentDevice();
        userPrefs.set('heartRate.deviceLocked', true);
      }
      
      // Listen to internal event 'heartrate.data' and broadcast incoming data
      forge.internal.addEventListener("heartrate.data", function (data) {
        // Broadcast received data
        $rootScope.$broadcast('heart-rate-data-received', data);
      });
      
      // Listen to other internal events and broadcast them
      forge.internal.addEventListener("heartrate.error", function (data) {
        // Broadcast received data
        $rootScope.$broadcast('heart-rate-info-received', {message: data.error});
      });
      forge.internal.addEventListener("heartrate.discoveryStarted", function (data) {
        // Broadcast received data
        $rootScope.$broadcast('heart-rate-info-received', {message: "Searching for heart rate monitor"});
      });
      forge.internal.addEventListener("heartrate.deviceConnected", function (data) {
        // Broadcast received data
        $rootScope.$broadcast('heart-rate-info-received', {message: "A heart rate monitor has been found"});
      });
      forge.internal.addEventListener("heartrate.heartrateServiceFound", function (data) {
        // Broadcast received data
        $rootScope.$broadcast('heart-rate-info-received', {message: "Heart rate monitor is now connected"});
      });
      forge.internal.addEventListener("heartrate.deviceDisconnected", function (data) {
        // Broadcast received data
        $rootScope.$broadcast('heart-rate-info-received', {message: "Heart rate monitor disconnected"});
      });
      forge.internal.addEventListener('heartrate.startUpload', function() {
        uploadStatus = 'uploading';
        $rootScope.$broadcast('heart-rate-upload-status', {status: uploadStatus});
      });
      forge.internal.addEventListener('heartrate.uploadDone', function() {
        uploadStatus = 'synced';
        lastSyncTime = new Date().getTime();
        $rootScope.$broadcast('heart-rate-upload-status', {status: uploadStatus, lastSyncTime: lastSyncTime});
      });
      forge.internal.addEventListener('heartrate.uploadError', function() {
        uploadStatus = 'error';
        $rootScope.$broadcast('heart-rate-upload-status', {status: uploadStatus});
      });
      forge.internal.addEventListener('heartrate.lockSuccess', function() {
        userPrefs.set('heartRate.deviceLocked', true);
      });
      
      // Public API
      return {
        setHeartRateServiceEnabled: setHeartRateServiceEnabled,
        getUploadStatus: function() { return uploadStatus; },
        getLastSyncTime: function() { return lastSyncTime; },
        lockDevice: lockDevice,
        unlockDevice: unlockDevice,
        deviceIsLocked: function() { return userPrefs.get('heartRate.deviceLocked', false); }
      };
      
    }
  ]);
  
});
