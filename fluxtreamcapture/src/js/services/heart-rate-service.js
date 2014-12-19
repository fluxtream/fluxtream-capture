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
      
      function enableService() {
        // Initiate native background service
        forge.logging.info("Starting heart rate native service");
        forge.flx_polar_h7.startService(
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
      
      // Public API
      return {
        setHeartRateServiceEnabled: setHeartRateServiceEnabled
      };
      
    }
  ]);
  
});
