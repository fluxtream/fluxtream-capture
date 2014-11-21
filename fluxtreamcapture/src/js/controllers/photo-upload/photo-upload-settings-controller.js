/**
 * Angular controller for the photo upload screen
 */
define([
  'config/env',
  'app-modules',
  'services/user-prefs-service',
  'services/photo-list-service',
  'services/photo-synchronization-service'
], function(env, appModules) {
  
  // Photo upload controller
  appModules.controllers.controller('PhotoUploadSettingsController', [
    "$scope",
    'UserPrefsService',
    "PhotoListService",
    "$ionicActionSheet",
    "LoginService",
    "PhotoSynchronizationService",
    "$stateParams",
    function($scope, userPrefs, photoListService, $ionicActionSheet, loginService, photoSync, $stateParams) {
      
      // No photos on web
      if (forge.is.web()) return;
      
      $scope.backLink = $stateParams.from === 'from-settings' ? "settings" : "photoUpload";
      
      // List of orientations
      if (forge.is.android()) {
        $scope.orientations = ['portrait', 'landscape'];
      } else {
        $scope.orientations = ['portrait', 'upside_down', 'landscape_left', 'landscape_right'];
      }
      
      // Device
      $scope.isAndroid = forge.is.android();
      
      // Options for the user
      $scope.settings = {};
      $scope.unuploadedCount = {};
      $scope.orientations.forEach(function(orientation) {
        $scope.settings['upload_' + orientation] = userPrefs.get('user.' + loginService.getUserId() +  '.photos.autoupload_' + orientation, false);
        $scope.settings[orientation + "_minimum_timestamp"] = userPrefs.get('user.' + loginService.getUserId() +  '.photos.' + orientation + "_minimum_timestamp", 0);
        $scope.unuploadedCount[orientation] = 0;
      });
      
      /**
       * Updates the unuploaded photo count for each orientation
       */
      $scope.countUnuploadedPhotos = function() {
        photoListService.reloadPhotos();
        photoListService.onReady(function() {
          // Get raw photo list
          $scope.rawPhotoList = photoListService.getPhotoList();
          var photoIdsPerOrientation = {};
          $scope.orientations.forEach(function(orientation) {
            photoIdsPerOrientation[orientation] = [];
          });
          // Create photo list
          $scope.rawPhotoList.forEach(function(rawPhotoData) {
            photoIdsPerOrientation[rawPhotoData.orientation].push(rawPhotoData.id);
          });
          // Count unuploaded photos for each orientation
          $scope.orientations.forEach(function(orientation) {
            forge.flx_photoupload.getPhotoStatuses(photoIdsPerOrientation[orientation],
              // Success
              function(photoStatuses) {
                // Count
                $scope.unuploadedCount[orientation] = 0;
                for (var i = 0; i < photoStatuses.length; i++) {
                  if (photoStatuses[i] == 'none') $scope.unuploadedCount[orientation]++;
                }
                forge.logging.info("There are " + $scope.unuploadedCount[orientation] + " unuploaded " + orientation + " photos");
              },
              // Error
              function(error) {
                forge.logging.info("Error while getting photo statuses for orientation " + orientation);
                forge.logging.info(error);
              }
            );
          });
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
        photoSync.startAutoupload();
      };
      
//      /**
//       * Stops the background upload service
//       */
//      $scope.stopPhotoUploadService = function() {
//        forge.flx_photoupload.stopAutouploadService(
//          // Success
//          function() {
//            forge.logging.info("Autoupload service successfully stopped");
//          },
//          // Error
//          function() {
//            forge.logging.info("Error while stopping the autoupload service");
//          }
//        );
//      };
      
      // Start photo upload service at start
//      var startAutoupload = false;
//      $scope.orientations.forEach(function(orientation) {
//        if ($scope.settings['upload_' + orientation]) startAutoupload = true;
//      });
//      if (startAutoupload) {
        $scope.startPhotoUploadService();
//      }
      
      /**
       * Saves and applies the user's choices
       */
      $scope.save = function(orientation) {
        var unuploadedCount = $scope.unuploadedCount[orientation];
        var enablingAutoupload = $scope.settings['upload_' + orientation];
        forge.logging.info("User choice: " + orientation + " := " + enablingAutoupload + " (count: " + unuploadedCount + ")");
        if (enablingAutoupload && unuploadedCount !== 0) {
          forge.logging.info("Asking user if they want to upload the unuploaded photos for orientation " + orientation);
          $ionicActionSheet.show({
            buttons: [{text: "No"}, {text: 'Upload'}],
            titleText: 'You have ' + unuploadedCount + ' existing photos with this orientation. Upload them now?',
            cancelText: 'Cancel',
            cancel: function() {
              // Undo choice
              $scope.settings['upload_' + orientation] = false;
              // Refresh UI
              $scope.$$phase || $scope.$apply();
            },
            buttonClicked: function(index) {
              // Get timestamp (index is 0 => No => Now ; index is 1 => Yes, upload => Beginning of time)
              var timestamp = (index === 0 ? Math.floor(new Date().getTime() / 1000) : 0);
              // Set timestamp parameter
              $scope.settings[orientation + '_minimum_timestamp'] = timestamp;
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
        var start = false;
        $scope.orientations.forEach(function(orientation) {
          userPrefs.set('user.' + loginService.getUserId() +  '.photos.autoupload_' + orientation, $scope.settings['upload_' + orientation]);
          userPrefs.set('user.' + loginService.getUserId() +  '.photos.' + orientation + '_minimum_timestamp', $scope.settings[orientation + '_minimum_timestamp']);
          if ($scope.settings['upload_' + orientation]) start = true;
        });
        // Start or stop service
        
//        if (start) {
//          userPrefs.set('user.' + loginService.getUserId() +  '.photos.autoupload_enabled', true);
          $scope.startPhotoUploadService();
//        } else {
//          userPrefs.set('user.' + loginService.getUserId() +  '.photos.autoupload_enabled', false);
//          $scope.stopPhotoUploadService();
//        }
      };
      
    }
  ]);
});
