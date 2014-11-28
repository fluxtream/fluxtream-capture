/**
 * This service initializes the heart rate native modules, and transfers data
 * received from the heart rate module to javascript broadcasted events.
 * This works only in the mobile app.
 */
define([
  'app-modules',
  'services/login-service'
], function(appModules) {
  
  appModules.services.factory("HeartRateService", ['$rootScope', 'LoginService', function($rootScope, loginService) {
    
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
    
    // Listen to internat event 'heartrate.data' and broadcast incoming data
    forge.internal.addEventListener("heartrate.data", function (data) {
      // Broadcast received data
      $rootScope.$broadcast('heart-rate-data-received', data);
    });
    
  }]);
  
});
