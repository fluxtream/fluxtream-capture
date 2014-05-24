// // Enable this for debugging
// forge.enableDebug();

require([], function() {
  forge.logging.info("Starting Fluxtream Capture app");
  
  // Angular pictures module
  var fluxtreamCaptureApp = angular.module('fluxtream-capture-app', [
    'ngRoute',
    'controllers'
  ]);
  
  // Configuration
  fluxtreamCaptureApp.config([
    '$compileProvider',
    function($compileProvider) {
      // Allow image sources starting with "content://"
      $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|content):/);
    }
  ]);
  
  // Routes
  fluxtreamCaptureApp.config([
    '$routeProvider',
    function($routeProvider) {
      $routeProvider.
        when('/pictures', {
          templateUrl: 'views/pictures.html',
          controller: 'PictureController'
        }).
        when('/self-reports', {
          templateUrl: 'views/self-reports.html',
          controller: 'SelfReportsController'
        }).
        when('/settings', {
          templateUrl: 'views/settings.html',
          controller: 'SettingsController'
        }).
        when('/polar-h7', {
          templateUrl: 'views/polar-h7.html',
          controller: 'PolarH7Controller'
        }).
        otherwise({
          templateUrl: 'views/main-menu.html',
          controller: 'MainMenuController'
        });
    }
  ]);
  
  // Bootstrap app
  angular.element(document).ready(function() {
    angular.bootstrap(document, ['fluxtream-capture-app']);
  });
  
  // Redirect to settings screen if the user has not set his/her username
  forge.prefs.get('settings.username',
    // Success
    function(value) {
      if (!value) {
        window.location = "#settings";
      }
    },
    // Error
    function(content) {
      forge.logging.error("An error occurred while getting the username from prefs");
    }
  );
  
});
