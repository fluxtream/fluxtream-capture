// // Enable this for debugging
// forge.enableDebug();

require([
  'libs/jquery-2.0.2',
  'libs/bootstrap',
  'libs/angular.min',
  'libs/angular-route.min',
  'controllers/controller-loader'
], function() {
  forge.logging.info("Starting Fluxtream Capture app");
  
  /**
   * Tries to upload a picture to the fluxtream server
   * 
   * @param {string} pictureURI  The local URI of the picture to upload
   * @param {function} successCallback()  Called on success
   * @param {function} errorCallback(error) Called on error with error data
   */
  function uploadPicture(pictureURI, successCallback, errorCallback) {
    forge.request.ajax({
      type: 'POST',
      url: 'http://fluxtream.org/api/bodytrack/photoUpload?connector_name=fluxtream_capture',
      files: [{
        uri: pictureURI,
        name: 'photo',
        type: 'image'
      }],
      data: {
        'metadata': '{capture_time_secs_utc:1400689661}'
      },
      headers: {
        'Authorization': 'Basic SnVsZHVwOmp1bGllbjIy' // Juldup:julien22 in base64
      },
      success: function(data, headers) {
        forge.logging.info("Successful request");
        forge.logging.info(data);
        forge.logging.info(headers);
        successCallback();
      },
      error: function(error) {
        forge.logging.info("Request error");
        forge.logging.info(error);
        errorCallback(error);
      }
    });
  }
  
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
      forge.logging.info("An error occurred while getting the username from prefs")
    }
  );
  
});
