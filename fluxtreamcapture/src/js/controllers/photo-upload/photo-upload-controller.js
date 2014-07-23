/**
 * Angular controller for the photo upload screen
 */
define([
  'app-modules',
  'services/photo-list-service',
  'services/user-prefs-service'
], function(appModules) {
  
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
     * (Public) Loads all photos from the device image gallery
     */
    $scope.addAllPhotosFromGallery = function() {
      photoListService.onReady(function() {
        // Get raw photo list
        $scope.rawPhotoList = photoListService.getPhotoList();
        // Create photo list
        $scope.rawPhotoList.forEach(function(rawPhotoData) {
          $scope.addPhoto(rawPhotoData);
        });
        // Set loaded status
        $scope.loaded = true;
        // Update UI
        $scope.$$phase || $scope.$apply();
      });
    };
    
    // Initially load photos
    userPrefs.onReady(function() {
      if (!forge.is.web()) {
        $scope.addAllPhotosFromGallery();
      } else {
        // Web app, no photo library
        $scope.loaded = true;
      }
    });
    
  }]);
  
});
