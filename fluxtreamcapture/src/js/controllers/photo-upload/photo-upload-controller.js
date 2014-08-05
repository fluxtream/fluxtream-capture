/**
 * Angular controller for the photo upload screen
 */
define([
  'config/env',
  'app-modules',
  'services/photo-list-service',
  'services/user-prefs-service'
], function(env, appModules) {
  
  // Photo upload controller
  appModules.controllers.controller('PhotoUploadController', ["$scope", "PhotoListService", 'UserPrefsService',
    function($scope, photoListService, userPrefs) {
      
      // List of available photos, photos are object of type {
      //   src:           the html src of the photo for display (can be a thumb)
      //   orientation:   the photo's orientation when taken (0, 90, 180 or 270)
      //   id:            the id of the photo in the device's database
      //   upload_status: the status of the upload ('none', 'pending', 'uploading', 'uploaded', 'failed')
      //   uri:           the URI of the photo on the local device
      // }
      $scope.photos = [];
      
      // List of photos as come out of the photo list service
      $scope.rawPhotoList;
      
      // True once the local photos have been loaded
      $scope.loaded = false;
      
      /**
       * (Private) Adds a photo from to raw list to the photo list
       */
      $scope.addPhoto = function(rawPhotoData, refreshUI) {
        // Create photo object
        var photoObject = {
          src: rawPhotoData.thumb_uri ? rawPhotoData.thumb_uri : rawPhotoData.uri,
          orientation: rawPhotoData.orientation,
          id: rawPhotoData.id,
          upload_status: 'unknown',
          uri: rawPhotoData.uri,
          date_taken: rawPhotoData.date_taken
        };
        // Add it to the photo list
        $scope.photos.push(photoObject);
        // Get photo upload status from user prefs
        var status = userPrefs.get('photo-' + photoObject.id + '-status');
        if (!status) status = 'none';
        if (status === 'uploading' || status === 'failed') status = 'pending'; // Upload failed in previous session
        photoObject.upload_status = status;
        // Refresh the UI
        if (refreshUI) {
          $scope.$$phase || $scope.$apply();
        }
      };
      
      /**
       * Finds the photo with the given id in the photo list
       */
      $scope.getPhoto = function(photoId) {
        var photoFound = null;
        $scope.photos.forEach(function(photo) {
          if (photo.id === photoId) photoFound = photo
        });
        return photoFound;
      };
      
      /**
       * Loads all photos from the device image gallery
       */
      $scope.addAllPhotosFromGallery = function() {
        photoListService.onReady(function() {
          // Empty photo list
          $scope.photos = [];
          // Get raw photo list
          $scope.rawPhotoList = photoListService.getPhotoList();
          // Create photo list
          $scope.rawPhotoList.forEach(function(rawPhotoData) {
            $scope.addPhoto(rawPhotoData);
          });
          $scope.loadPhotoStatuses();
        });
      };
      
      /**
       * Get the photos' upload status from the native module 
       */
      $scope.loadPhotoStatuses = function() {
        var photos = [];
        $scope.photos.forEach(function(photo) {
          photos.push(photo.id);
        });
        forge.flx_photoupload.arePhotosUploaded(photos,
          // Success
          function(photoStatuses) {
            // Set statuses
            for (var i = 0; i < photoStatuses.length; i++) {
              if (photoStatuses[i]) $scope.photos[i].upload_status = 'uploaded';
            }
            // Set loaded status
            $scope.loaded = true;
            // Update UI
            $scope.$$phase || $scope.$apply();
          },
          // Error
          function(error) {
            forge.logging.info("Error while getting photo statuses");
            forge.logging.info(error);
          }
        );
      };
      
      // Initially set upload parameters
      forge.flx_photoupload.setUploadParameters(
        // Upload URL
        env["fluxtream.home.url"] + "api/bodytrack/photoUpload?connector_name=fluxtream_capture",
        // Authentication
				btoa(userPrefs.get('settings.username') + ":" + userPrefs.get('settings.password')),
        // Success
        function() {
          forge.logging.info("Call to setUploadParameters successful");
          // Initially load photos
          userPrefs.onReady(function() {
            if (!forge.is.web()) {
              $scope.addAllPhotosFromGallery();
            } else {
              // Web app, no photo library
              $scope.loaded = true;
            }
          });
        },
        // Error
        function(error) {
          logging.info("Call to setUploadParameters failed");
          logging.info(error);
        }
			);
      
      /**
       * Marks a photo for upload and adds a photo to the upload queue
       */
      $scope.uploadPhoto = function(photo) {
        forge.logging.info("Uploading photo: " + photo.id);
        photo.upload_status = 'pending';
        $scope.$$phase || $scope.$apply();
        forge.flx_photoupload.uploadPhoto(photo.id,
          // Success
          function() {
            forge.logging.info("Upload photo call returned success")
          },
          // Error
          function(error) {
            forge.logging.info("Upload photo call returned error");
            forge.logging.info(error);
          }
        );
      };
      
      // Reload photos on resume
      // TODO A new listener is being created each time this page is reloaded. This does no harm, but should be fixed.
      forge.event.appResumed.addListener(
        // Callback
        function() {
          if (!forge.is.web()) {
            userPrefs.onReady(function() {
              forge.logging.info("Reloading photo list");
              photoListService.reloadPhotos();
              $scope.addAllPhotosFromGallery();
            });
          }
        },
        // Error
        function(content) {
          forge.logging.info("Error on forge.event.appResumed.appListener");
          forge.logging(content);
        }
      );
      
      // Add event listeners
      
      // Photo upload started
      forge.internal.addEventListener("photoupload.started", function(data) {
        forge.logging.info("Received event: photo " + data.photoId + " upload started");
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'uploading';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.info("Unknown photo " + data.photoId);
        }
      });
      
      // Photo successfully uploaded
      forge.internal.addEventListener("photoupload.uploaded", function(data) {
        forge.logging.info("Received event: photo " + data.photoId + " upload successful");
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'uploaded';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.info("Unknown photo " + data.photoId);
        }
      });
      
      // Photo upload canceled
      forge.internal.addEventListener("photoupload.canceled", function(data) {
        forge.logging.info("Received event: photo " + data.photoId + " upload canceled");
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'none';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.info("Unknown photo " + data.photoId);
        }
      });
      
      // Photo upload failed
      forge.internal.addEventListener("photoupload.failed", function(data) {
        forge.logging.info("Received event: photo " + data.photoId + " upload failed");
        forge.logging.info(data.error);
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'failed';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.info("Unknown photo " + data.photoId);
        }
      });
      
    }
  ]);
});
