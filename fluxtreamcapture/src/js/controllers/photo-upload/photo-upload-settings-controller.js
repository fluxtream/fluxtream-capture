/**
 * Angular controller for the photo upload screen
 */
define([
  'config/env',
  'app-modules',
  'services/user-prefs-service'
], function(env, appModules) {
  
  // Photo upload controller
  appModules.controllers.controller('PhotoUploadSettingsController', ["$scope", 'UserPrefsService', "PhotoListService", "$ionicActionSheet",
    function($scope, userPrefs, photoListService, $ionicActionSheet) {
      
      // Options for the user
      $scope.settings = {
        upload_portrait: userPrefs.get('photos.autoupload_portrait', false),
        upload_landscape: userPrefs.get('photos.autoupload_landscape', false),
        landscape_minimum_timestamp: userPrefs.get('photos.landscape_minimum_timestamp', 0),
        portrait_minimum_timestamp: userPrefs.get('photos.portrait_minimum_timestamp', 0)
      };
      
      $scope.unuploadedLandscapeCount = 0;
      $scope.unuploadedPortraitCount = 0;
      
      /**
       * Updates the unuploaded photo count for each orientation
       */
      $scope.countUnuploadedPhotos = function() {
        photoListService.reloadPhotos();
        photoListService.onReady(function() {
          // Get raw photo list
          $scope.rawPhotoList = photoListService.getPhotoList();
          var landscapePhotoIds = [];
          var portraitPhotoIds = [];
          // Create photo list
          $scope.rawPhotoList.forEach(function(rawPhotoData) {
            if (rawPhotoData.orientation === "landscape") landscapePhotoIds.push(rawPhotoData.id);
            if (rawPhotoData.orientation === "portrait") portraitPhotoIds.push(rawPhotoData.id);
          });
          // Count unuploaded landscape photos
          forge.flx_photoupload.arePhotosUploaded(landscapePhotoIds,
            // Success
            function(photoStatuses) {
              // Count
              $scope.unuploadedLandscapeCount = 0;
              for (var i = 0; i < photoStatuses.length; i++) {
                if (!photoStatuses[i]) $scope.unuploadedLandscapeCount++;
              }
              forge.logging.info("There are " + $scope.unuploadedLandscapeCount + " unuploaded landscape photos");
            },
            // Error
            function(error) {
              forge.logging.info("Error while getting photo statuses");
              forge.logging.info(error);
            }
          );
          // Count unuploaded portrait photos
          forge.flx_photoupload.arePhotosUploaded(portraitPhotoIds,
            // Success
            function(photoStatuses) {
              // Count
              $scope.unuploadedPortraitCount = 0;
              for (var i = 0; i < photoStatuses.length; i++) {
                if (!photoStatuses[i]) $scope.unuploadedPortraitCount++;
              }
              forge.logging.info("There are " + $scope.unuploadedPortraitCount + " unuploaded portrait photos");
            },
            // Error
            function(error) {
              forge.logging.info("Error while getting photo statuses");
              forge.logging.info(error);
            }
          );
        });
      };
      
      // Recount photos each time the application gets the focus back
      forge.event.appResumed.addListener(
        // Callback
        function() {
          if (!forge.is.web()) {
            forge.logging.info("Recounting unuploaded photos");
            $scope.countUnuploadedPhotos();
          }
        },
        // Error
        function(content) {
          forge.logging.info("Error on forge.event.appResumed.appListener");
          forge.logging(content);
        }
      );
      
      // Initially count unuploaded photos
      $scope.countUnuploadedPhotos();
      
      /**
       * Start photo upload service
       */
      $scope.startPhotoUploadService = function() {
        forge.logging.info("Starting photo upload with parameters:");
        forge.logging.info($scope.settings);
        forge.flx_photoupload.setAutouploadOptions(
          {
            upload_landscape: $scope.settings.upload_landscape,
            upload_portrait: $scope.settings.upload_portrait,
            landscape_minimum_timestamp: $scope.settings.landscape_minimum_timestamp,
            portrait_minimum_timestamp: $scope.settings.portrait_minimum_timestamp,
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
      
      // Start photo upload service at start
      if ($scope.settings.autoupload_enabled) {
        $scope.startPhotoUploadService();
      }
      
      /**
       * Saves and applies the user's choices
       */
      $scope.save = function(orientation) {
        var unuploadedCount = (orientation === "landscape" ? $scope.unuploadedLandscapeCount : $scope.unuploadedPortraitCount);
        var enablingAutoupload = (orientation === "landscape" ? $scope.settings.upload_landscape : $scope.settings.upload_portrait);
        forge.logging.info("User choice: " + orientation + " := " + enablingAutoupload + " (count: " + unuploadedCount + ")");
        if (enablingAutoupload && unuploadedCount !== 0) {
          forge.logging.info("Asking user if they want to upload the unuploaded photos for orientation " + orientation);
          $ionicActionSheet.show({
            buttons: [{text: "No"}, {text: 'Upload'}],
            titleText: 'You have ' + unuploadedCount + ' existing photos with this orientation. Upload them now?',
            cancelText: 'Cancel',
            cancel: function() {
              // Undo choice
              if (orientation === "landscape") {
                $scope.settings.upload_landscape = false;
              } else {
                $scope.settings.upload_portrait = false;
              }
              // Refresh UI
              $scope.$$phase || $scope.$apply();
            },
            buttonClicked: function(index) {
              // Get timestamp (index is 0 => No => Now ; index is 1 => Yes, upload => Beginning of time)
              var timestamp = (index === 0 ? Math.floor(new Date().getTime() / 1000) : 0);
              // Set timestamp parameter
              if (orientation === "landscape") {
                $scope.settings.landscape_minimum_timestamp = timestamp;
              } else {
                $scope.settings.portrait_minimum_timestamp = timestamp;
              }
              // Apply parameters
              $scope.saveAndApplyPrefs();
              return true;
            }
          });
        } else {
          $scope.saveAndApplyPrefs();
        }
      };
      
      /**
       * Saves the user prefs and start or stop the service accordingly
       */
      $scope.saveAndApplyPrefs = function() {
        // Save preferences
        userPrefs.set('photos.autoupload_portrait', $scope.settings.upload_portrait);
        userPrefs.set('photos.autoupload_landscape', $scope.settings.upload_landscape);
        userPrefs.set('photos.landscape_minimum_timestamp', $scope.settings.landscape_minimum_timestamp);
        userPrefs.set('photos.portrait_minimum_timestamp', $scope.settings.portrait_minimum_timestamp);
        // Start or stop service
        if ($scope.settings.upload_landscape || $scope.settings.upload_portrait) {
          $scope.startPhotoUploadService();
        } else {
          $scope.stopPhotoUploadService();
        }
      };
      
    }
  ]);
});
