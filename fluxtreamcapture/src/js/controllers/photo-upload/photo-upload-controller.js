/**
 * Angular controller for the photo upload screen
 */
define([
  'config/env',
  'app-modules',
  'services/photo-list-service',
  'services/user-prefs-service',,
  'services/photo-synchronization-service'
], function(env, appModules) {
  
  // Photo upload controller
  appModules.controllers.controller('PhotoUploadController', [
    "$scope",
    "PhotoListService",
    'UserPrefsService',
    "PhotoSynchronizationService",
    "$ionicScrollDelegate",
    function($scope, photoListService, userPrefs, photoSync, $ionicScrollDelegate) {
      
      // No photos on web
      if (forge.is.web()) return;
      
      // List of available photos, photos are object of type {
      //   src:           the html src of the photo for display (can be a thumb)
      //   orientation:   the photo's orientation when taken (0, 90, 180 or 270)
      //   id:            the id of the photo in the device's database
      //   upload_status: the status of the upload ('none', 'pending', 'uploading', 'uploaded', 'failed')
      //   uri:           the URI of the photo on the local device
      // }
      $scope.photos = [];
      
      // List of photos as come out of the photo list service
      $scope.rawPhotoList = [];
      
      // True once the local photos have been loaded
      $scope.loaded = false;
      
      // Saved scroll position
      $scope.lastScrollPosition = userPrefs.get('photos.scrollPosition', 500);
      
      // True once the initial scroll position has been applied and the new scroll positions can be saved
      $scope.initialScrollDone = false;
      
      // Saves the current scroll position to be re-established on the next visit
      $scope.onScroll = function() {
        if (!$scope.initialScrollDone) return;
        $scope.lastScrollPosition = $ionicScrollDelegate.getScrollPosition().top;
        userPrefs.set('photos.scrollPosition', $scope.lastScrollPosition);
      };
      
      // Applies the scroll position from the last visit
      $scope.scrollToInitialPosition = function() {
        $ionicScrollDelegate.scrollTo(0, $scope.lastScrollPosition, false);
        $scope.initialScrollDone = true;
      };
      
      /**
       * (Private) Adds a photo from to raw list to the photo list
       */
      $scope.addPhoto = function(rawPhotoData, refreshUI) {
        // Create photo object
        var photoObject = {
          src: rawPhotoData.thumb_uri,
          orientation: rawPhotoData.orientation,
          id: rawPhotoData.id,
          upload_status: 'unknown',
          uri: rawPhotoData.uri,
          date_taken: rawPhotoData.date_taken,
          orientation_tag: rawPhotoData.orientation_tag
        };
        
        // On iOS, need to convert uri using forge.file module
//        if (forge.is.ios() && !rawPhotoData.thumb_uri) {
//          var file = {
//            type: "image",
//            uri: photoObject.src
//          };
//          url = forge.file.URL(file, function(url) {
//            photoObject.src = url;
//            $scope.$$phase || $scope.$apply();
//          });
//        }
        
        // Add it to the photo list
        $scope.photos.unshift(photoObject);
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
          if (photo.id === photoId) photoFound = photo;
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
          $scope.loadPhotoThumbnails();
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
            // Reset scroll position
            $scope.scrollToInitialPosition();
          },
          // Error
          function(error) {
            forge.logging.info("Error while getting photo statuses");
            forge.logging.info(error);
          }
        );
      };
      
      // Load photo thumbnails one by one
      $scope.loadPhotoThumbnails = function() {
        var photos = [];
        $scope.photos.forEach(function(photo) {
          if (!photo.src) photos.push(photo);
        });
        function loadNext() {
          if (photos.length) {
            var photo = photos.pop();
            forge.flx_photoupload.getThumbnail(photo.id,
              function(thumb) {
                photo.src = thumb;
                $scope.$$phase || $scope.$apply();
                setTimeout(loadNext, 1);
              },
              function() {
                forge.logging.info("Error while getting thumbnail");
              }
            );
          }
        }
        loadNext();
      };
      
      // Initially load photos
      photoSync.onReady(function() {
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
      });
      
      /**
       * Marks a photo for upload and adds a photo to the upload queue
       */
      $scope.uploadPhoto = function(photo) {
        forge.logging.info("Uploading photo: " + photo.id);
        photo.upload_status = 'pending';
        $scope.$$phase || $scope.$apply();
        photoSync.uploadPhoto(photo.id,
          // Success
          function() {
            forge.logging.info("Upload photo call returned success");
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
      $scope.$on("photoupload.started", function(event, data) {
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
      $scope.$on("photoupload.uploaded", function(event, data) {
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
      $scope.$on("photoupload.canceled", function(event, data) {
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
      $scope.$on("photoupload.failed", function(event, data) {
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
