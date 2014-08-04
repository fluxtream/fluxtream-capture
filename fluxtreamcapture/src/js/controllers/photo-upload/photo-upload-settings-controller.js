/**
 * Angular controller for the photo upload screen
 */
define([
  'config/env',
  'app-modules',
  'services/user-prefs-service'
], function(env, appModules) {
  
  // Photo upload controller
  appModules.controllers.controller('PhotoUploadSettingsController', ["$scope", 'UserPrefsService',
    function($scope, userPrefs) {
      
      // Options for the user
      $scope.settings = {
        autoupload_enabled: userPrefs.get('photos.autoupload_enabled', false),
        upload_portrait: userPrefs.get('photos.autoupload_portrait', false),
        upload_landscape: userPrefs.get('photos.autoupload_landscape', false),
        upload_only_future_photos: userPrefs.get('photos.upload_after_timestamp', 0) === 0 ? false : true,
        upload_after_timestamp: userPrefs.get('photos.upload_after_timestamp', 0)
      };
      
      /**
       * Start photo upload service
       */
      $scope.startPhotoUploadService = function() {
        forge.flx_photoupload.setAutouploadOptions(
          {
            upload_landscape: $scope.settings.upload_portrait,
            upload_portrait: $scope.settings.upload_landscape,
            autoupload_enabled: $scope.settings.autoupload_enabled,
            upload_after_timestamp: $scope.settings.upload_after_timestamp,
            upload_url: env['fluxtream.home.url'] + "api/bodytrack/photoUpload?connector_name=fluxtream_capture",
            authentication: btoa(userPrefs.get("settings.username") + ":" + userPrefs.get("settings.password"))
          },
          // Success
          function() {
            forge.logging.info("Autoupload service successfully started");
          },
          // Error
          function() {
            forge.logging.info("Error while launching the autoupload service");
          }
        );
      };
      
      /**
       * Stops the background upload service
       */
      $scope.stopPhotoUploadService = function() {
        forge.flx_photoupload.stopAutouploadService(
          // Success
          function() {
            forge.logging.info("Autoupload service successfully stopped");
          },
          // Error
          function() {
            forge.logging.info("Error while stopping the autoupload service");
          }
        );
      };
      
      /**
       * Saves the current options to the user preferences
       */
      $scope.saveUserPrefs = function() {
        userPrefs.set('photos.autoupload_enabled', $scope.settings.upload_landscape);
        userPrefs.set('photos.autoupload_portrait', $scope.settings.upload_portrait);
        userPrefs.set('photos.autoupload_landscape', $scope.settings.autoupload_enabled);
        userPrefs.set('photos.upload_after_timestamp', $scope.settings.upload_after_timestamp);
      };
      
      // Start photo upload service at start
      if ($scope.settings.autoupload_enabled) {
        $scope.startPhotoUploadService();
      }
      
      /**
       * Saves and applies the user's choices
       */
      $scope.save = function() {
        // Update upload_after_timestamp according to upload_only_future_photos value
        if ($scope.settings.upload_only_future_photos) {
          if ($scope.settings.upload_after_timestamp === 0) {
            $scope.settings.upload_after_timestamp = Math.round(new Date().getTime() / 1000);
          }
        } else {
          $scope.settings.upload_after_timestamp = 0;
        }
        // Save preferences
        $scope.saveUserPrefs();
        // Start or stop service
        if ($scope.settings.autoupload_enabled) {
          $scope.startPhotoUploadService();
        } else {
          $scope.stopPhotoUploadService();
        }
      };
      
    }
  ]);
});
