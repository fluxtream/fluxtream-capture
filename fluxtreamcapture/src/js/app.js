/**
 * Require.js entry point to load the Fluxtream Capture application
 */
$(document).ready(function() {
  // Configure
  require.config({
    paths: {
      moment: 'libs/moment/moment-2.7.0',
      "momentTz": 'libs/moment/moment-timezone-with-data-0.1.0'
    }
  });
  // Start app
  require([
    "app-modules",
    "config/env",
    "routes",
    "services/login-service",
    "services/photo-list-service",
    "services/photo-synchronization-service",
    'filters/self-report-filters'
  ], function(appModules, env, routes, flxCom) {
    
    // Get current page or set main page
    var initialRoute = window.location.hash;
    if (!initialRoute || initialRoute === "#/init") initialRoute = "#/listTopics";
    
    // Initialization controller
    appModules.controllers.controller('InitController', [
      'LoginService',
      '$ionicViewService',
      '$state',
      'PhotoListService', // Preloading photos
      'PhotoSynchronizationService', // Upload unuploaded photos and photo metadata
      function(loginService, $ionicViewService, $state) {
        loginService.checkAuth(function() {
          // Load page
          $state.go("listTopics");
          window.location = initialRoute;
          // Clear navigation history to prevent going back to the initialization page
          $ionicViewService.clearHistory();
          // Hide launch screen
          if (!forge.is.web()) {
            forge.launchimage.hide();
          }
        });
      }
    ]);
    
    // Configuration
    appModules.app.config(['$compileProvider', function($compileProvider) {
      // Allow image sources starting with "content://"
      $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|content):/);
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|content):/);
    }]);
    
    // Load initialization page
    window.location = "#/init";
    
    // Bootstrap document with fluxtream capture app
    angular.bootstrap(document, ['flxApp']);
    
  });
  
});
