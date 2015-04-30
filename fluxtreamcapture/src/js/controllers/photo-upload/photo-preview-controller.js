/**
 * Angular controller for the photo preview screen
 */
define([
  'config/env',
  'app-modules',
  'moment',
  'services/photo-list-service',
  'services/user-prefs-service'
], function(env, appModules, moment) {
  
  // Photo preview controller
  appModules.controllers.controller('PhotoPreviewController', [
    "$scope",
    "$stateParams",
    "PhotoListService",
    'UserPrefsService',
    "PhotoSynchronizationService",
    "$timeout",
    function($scope, $stateParams, photoListService, userPrefs, photoSync, $timeout) {
      
      // Photo id
      $scope.photoId = $stateParams.photoId;
      
      // Uri of the photo image
      $scope.photoSrc = "";
       
      // Orientation of the photo
      $scope.orientationTag = 0;
      
      // Title for the page header
      $scope.pageTitle = "";
      
      // Metadata of the current photo
      $scope.metadata = {
        comment: "",
        tags: [],
      };
      
      // Displays the metadata
      $scope.updataMetadata = function(metadata) {
        $scope.metadata.comment = metadata.comment;
        $scope.metadata.tags = metadata.tags ? metadata.tags : [];
        $scope.$$phase || $scope.$apply();
      };
      
      // Retrieve photo on initialization
      // Get list of photos
      var photoList = photoListService.getPhotoList();
      // Find photo
      photoList.forEach(function(rawPhotoData) {
        if (rawPhotoData.id == $scope.photoId) {
          $timeout(function() {
            // Set page title
            $scope.pageTitle = moment(rawPhotoData.date_taken * 1000).format("YYYY-MM-DD h:mm A");
            // Set photo image source
            if (forge.is.ios()) {
              // On iOS, need to convert uri using forge.file module
              var file = {
                type: "image",
                uri: rawPhotoData.uri
              };
              forge.file.URL(file, function(url) {
                $scope.photoSrc = url;
                $scope.$$phase || $scope.$apply();
              });
            } else {
              $scope.photoSrc = rawPhotoData.uri;
              $scope.orientationTag = rawPhotoData.orientation_tag;
            }
          }, 300);
        }
      });
      // Load metadata
      photoSync.getMetadata($scope.photoId,
        // Preloading cached metadata
        $scope.updataMetadata,
        // Success
        $scope.updataMetadata,
        // Error
        function() {},
        // Photo not uploaded yet, no metadata
        function() {}
      );
      
    }
  ]);
  
});
