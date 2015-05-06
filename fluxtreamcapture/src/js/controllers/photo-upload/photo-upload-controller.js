/**
 * Angular controller for the photo upload screen
 */
define([
  'config/env',
  'app-modules',
  'services/login-service',
  'services/photo-list-service',
  'services/user-prefs-service',
  'services/photo-synchronization-service'
], function(env, appModules) {
  
  // Photo upload controller
  appModules.controllers.controller('PhotoUploadController', [
    "$scope",
    "PhotoListService",
    "LoginService",
    'UserPrefsService',
    "PhotoSynchronizationService",
    "$ionicScrollDelegate",
    "$ionicActionSheet",
    "$timeout",
    "$interval",
    function($scope, photoListService, loginService, userPrefs, photoSync, $ionicScrollDelegate, $ionicActionSheet, $timeout, $interval) {
      
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
      $scope.lastScrollPosition = userPrefs.get('photos.scrollPosition', 0);
      
      // True once the initial scroll position has been applied and the new scroll positions can be saved
      $scope.initialScrollDone = false;
      
      // On iOS, true if the user has not allowed the app to access photos
      $scope.photoAccessDenied = false;
      
      // Whether internet is currently reachable (through wifi, or through cellular data with cellular upload enabled)
      $scope.internetReachable = true;
      
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
      
      // Returns the height of the photo items depending on the screen width
      $scope.getCollectionItemHeight = function() {
        var height = 50 + 62 + 10;
        if ($('body').width() >= 768) height = 223 + 62 + 10;
        else if ($('body').width() >= 600) height = 167 + 62 + 10;
        else if ($('body').width() >= 480) height = 127 + 62 + 10;
        else if ($('body').width() >= 414) height = 105 + 62 + 10;
        else if ($('body').width() >= 375) height = 92 + 62 + 10;
        else if ($('body').width() >= 360) height = 87 + 62 + 10;
        else if ($('body').width() >= 320) height = 74 + 62 + 10;
        return height;
      };
      $scope.collectionItemHeight = $scope.getCollectionItemHeight();
      
      // Returns whether the delete button must be shown for a photo
      $scope.showDeleteButton = function(photo) {
        if (!forge.is.ios()) return true;
        return photo.upload_status == 'uploaded';
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
      
      $scope.setPhotoList = function(rawPhotoList) {
        // Empty photo list
        $scope.photos = [];
        // Get raw photo list
        $scope.rawPhotoList = rawPhotoList;
        // Create photo list
        $scope.rawPhotoList.forEach(function(rawPhotoData) {
          $scope.addPhoto(rawPhotoData);
        });
        $scope.loadPhotoStatuses();
        $scope.$$phase || $scope.$apply();
      };
      
      /**
       * Update access denied status on iOS
       */
      $scope.updateAccessDeniedStatus = function() {
        if (forge.is.ios()) {
          $scope.photoAccessDenied = false;
          photoListService.onReady(function() {
            $scope.photoAccessDenied = photoListService.photoAccessDenied();
            $scope.$$phase || $scope.$apply();
          });
        }
      };
      
      // Update the photo list when it changes
      $scope.$on('photo-list-changed', function() {
        forge.logging.info("Photo list changed");
        $scope.setPhotoList(photoListService.getPhotoList());
        $scope.updateAccessDeniedStatus();
      }),
      
      /**
       * Get the photos' upload status from the native module 
       */
      $scope.loadPhotoStatuses = function() {
        var photos = [];
        $scope.photos.forEach(function(photo) {
          photos.push(photo.id);
        });
        forge.flx_photoupload.getPhotoStatuses(photos,
          // Success
          function(photoStatuses) {
            // Set statuses
            for (var i = 0; i < photoStatuses.length; i++) {
              $scope.photos[i].upload_status = photoStatuses[i]; // 'uploaded', 'uploading', 'pending' or 'none'
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
            forge.logging.error("Error while getting photo statuses: " + JSON.stringify(error));
          }
        );
      };
      
      // Load next timeout
      $scope.loadNextTimeout = null;
      $scope.$on("$destroy", function() {
        $timeout.cancel($scope.loadNextTimeout);
      });
      
      // Initially load photos
      photoSync.onReady(function() {
        if (!forge.is.web()) {
          $scope.setPhotoList(photoListService.getPhotoList());
          $scope.updateAccessDeniedStatus();
        } else {
          // Web app, no photo library
          $scope.loaded = true;
        }
      });
      
      /**
       * Marks a photo for upload and adds a photo to the upload queue
       */
      $scope.uploadPhoto = function(photo) {
        photo.upload_status = 'pending';
        $scope.$$phase || $scope.$apply();
        photoSync.uploadPhoto(photo.id,
          // Success
          function() {},
          // Error
          function(error) {
            forge.logging.error("Upload photo call returned error: " + JSON.stringify(error));
          }
        );
      };
      
      /**
       * Called when the delete button is pressed. Removes photo from server and/or from local storage.
       */
      $scope.deletePhoto = function(photo) {
        $ionicActionSheet.show({
          buttons: photo.upload_status == 'uploaded' && !forge.is.ios() ? [{text: "No, only delete online photo"}] : [],
          titleText: forge.is.ios() ? 'Delete photo from the server?' : 'Delete photo from this device?',
          cancelText: 'Cancel',
          destructiveText: forge.is.ios() ? "Yes, delete photo from server" : (photo.upload_status == 'uploaded' ? 'Yes, also delete on this device' : 'Yes, delete photo'),
          cancel: function() {
            // Do nothing
          },
          buttonClicked: function(index) {
            if (!forge.is.connection.connected()) {
              alert("You are offline. Please connect to the Internet to delete this photo.");
              return;
            }
            var currentStatus = photo.upload_status;
            photo.upload_status = "deleting";
            $scope.$$phase || $scope.$apply();
            photoSync.removePhotoFromServerAndDevice(photo.id, true, false,
              // Success
              function() {
                // Set status to 'none'
                photo.upload_status = 'none';
                $scope.$$phase || $scope.$apply();
              },
              // Error
              function() {
                // Restore status
                alert(forge.is.connection.connected() ? "Photo could not be deleted from server. Please try again later." :
                        "You are offline. Please connect to the Internet to delete this photo.");
                photo.upload_status = currentStatus;
                $scope.$$phase || $scope.$apply();
              }
            );
            return true;
          },
          destructiveButtonClicked: function(index) {
            var currentStatus = photo.upload_status;
            photo.upload_status = "deleting";
            $scope.$$phase || $scope.$apply();
            var removeFromServer = currentStatus == 'uploaded';
            if (removeFromServer && !forge.is.connection.connected()) {
              alert("You are offline. Please connect to the Internet to delete this photo.");
              return;
            }
            photoSync.removePhotoFromServerAndDevice(photo.id, removeFromServer, !forge.is.ios(),
              // Success
              function() {
                // Set status to 'none'
                $scope.photos.splice($scope.photos.indexOf(photo), 1);
                $scope.$$phase || $scope.$apply();
              },
              // Error
              function() {
                // Restore status
                alert(forge.is.connection.connected() ? "Photo could not be deleted from server. Please try again later." :
                        "You are offline. Please connect to the Internet to delete this photo.");
                photo.upload_status = currentStatus;
                $scope.$$phase || $scope.$apply();
              }
            );
            return true;
          }
        });
      };
      
      // Reload photos on resume
      // TODO A new listener is being created each time this page is reloaded. This does no harm, but should be fixed.
      forge.event.appResumed.addListener(
        // Callback
        function() {
          if (!forge.is.web()) {
            userPrefs.onReady(function() {
              // Request a photo reload to make sure the photo list is up to date
              photoListService.reloadPhotos();
            });
          }
        },
        // Error
        function(content) {
          forge.logging.error("Error on forge.event.appResumed.appListener: " + JSON.stringify(content));
        }
      );
      
      // Add event listeners
      
      // Photo upload started
      $scope.$on("photoupload.started", function(event, data) {
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'uploading';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.warning("Upload started for unknown photo: " + data.photoId);
        }
      });
      
      // Photo successfully uploaded
      $scope.$on("photoupload.uploaded", function(event, data) {
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'uploaded';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.warning("Unknown photo uploaded: " + data.photoId);
        }
      });
      
      // Photo upload canceled
      $scope.$on("photoupload.canceled", function(event, data) {
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'none';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.warning("Cancelled upload of unknown photo: " + data.photoId);
        }
      });
      
      // Photo upload failed
      $scope.$on("photoupload.failed", function(event, data) {
        var photo = $scope.getPhoto(data.photoId);
        if (photo) {
          photo.upload_status = 'failed';
          $scope.$$phase || $scope.$apply();
        } else {
          forge.logging.warning("Upload failed for unknown photo: " + data.photoId);
        }
      });
      
      // Periodically check for internet connection
      $scope.updateConnectionStatus = function() {
        $scope.internetReachable = forge.is.connection.wifi() ||
              (forge.is.connection.connected() && userPrefs.get('user.' + loginService.getUserId() +  '.photos.upload_on_data_connection'));
        $scope.$$phase || $scope.$apply();
      };
      $scope.updateConnectionStatus();
      $scope.updateConnectionStatusInverval = $interval($scope.updateConnectionStatus, 1000);
      $scope.$on("$destroy", function() {
        $interval.cancel($scope.updateConnectionStatusInverval);
      });
      
      // Show an alert telling why internet is not reachable
      $scope.showConnectionStatus = function() {
        if (!forge.is.connection.connected()) forge.notification.alert("Connection status", "You are currently offline.");
        else if (!forge.is.connection.wifi() && !userPrefs.get('user.' + loginService.getUserId() +  '.photos.upload_on_data_connection'))
          forge.notification.alert("Connection status", "You are not connected over wifi. You can enable the upload using cellular data in the settings.");
        else $scope.updateConnectionStatus();
      };
      
    }
  ]);
});
