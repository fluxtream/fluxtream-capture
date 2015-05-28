/**
 * Require.js entry point to load the Fluxtream Capture application
 */
$(document).ready(function() {
  
  // Along with "viewport" metadata "height=device-height", this contributes to fixing an Ionic bug
  // that makes the viewport scroll out of hand when a text field is focused and the keyboard is shown
  ionic.Platform.isFullScreen = true;
  
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
    'services/heart-rate-service',
    'filters/self-report-filters',
    'services/user-prefs-service',
    'services/push-notifications'
  ], function(appModules, env, routes, flxCom) {
    
    // Get current page or set main page
    var initialRoute = window.location.hash;
    if (!initialRoute || initialRoute === "#/init") initialRoute = "#/listTopics";
    
    // Initialization controller
    appModules.controllers.controller('InitController', [
      'LoginService',
      '$ionicViewService',
      '$state',
      'UserPrefsService',
      '$rootScope',
      'PushNotificationService',
      'PhotoListService', // Preloading photos
      'PhotoSynchronizationService', // Upload unuploaded photos and photo metadata
      'HeartRateService', // Enable heart rate service on start if needed
      function(loginService, $ionicViewService, $state, userPrefs, $rootScope, pushNotifications) {
        userPrefs.onReady(function() {
          // Check if the user is alreday logged in
          if (loginService.isAuthenticated()) {
            // User is logged in, load main page
            $state.go("listTopics");
            window.location = initialRoute;
            // Tell the push notification service the user is logged in
            pushNotifications.authenticationDone();
            // Clear navigation history to prevent going back to the initialization page
            $ionicViewService.clearHistory();
            // Hide launch screen
            if (!forge.is.web()) {
              forge.launchimage.hide();
            }
            // Emit login event
            userPrefs.setUserId(loginService.getUserId());
            $rootScope.$broadcast('user-logged-in');
          } else {
            // User is not authenticated, go to login page
            $state.go("login");
            // Hide launch screen
            if (!forge.is.web()) {
              forge.launchimage.hide();
            }
          }
        });
      }
    ]);
    
    // Add scroll directive
    appModules.app.directive("flxScroll", function () {
      return function(scope, element, attrs) {
        angular.element(element).bind("scroll", function() {
          // Execute flx-scroll attribute content on scope
          eval("scope." + attrs.flxScroll);
        });
      };
    });
    
    // Configuration
    appModules.app.config(['$compileProvider', function($compileProvider) {
      // Allow image sources starting with "content://"
      $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|content|data|assets-library):/);
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|content|data|assets-library):/);
    }]);
    
    // Disable back button on Android
    if (forge.is.android()) {
      forge.event.backPressed.preventDefault();
    }
    
    // Load initialization page
    window.location = "#/init";
    
    // Bootstrap document with fluxtream capture app
    angular.bootstrap(document, ['flxApp']);
    
  });
  
});
