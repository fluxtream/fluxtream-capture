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
  appModules.controllers.controller('PhotoPreviewController', ["$scope", "$stateParams", "PhotoListService", 'UserPrefsService',
    function($scope, $stateParams, photoListService, userPrefs) {
      
      // Photo id
      $scope.photoId = $stateParams.photoId;
      
      // Uri of the photo image
      $scope.photoSrc = "";
      
      // Title for the page header
      $scope.pageTitle = "";
      
      // Retrieve photo on initialization
      photoListService.onReady(function() {
        // Get list of photos
        var photoList = photoListService.getPhotoList();
        // Find photo
        photoList.forEach(function(rawPhotoData) {
          if (rawPhotoData.id == $scope.photoId) {
            // Set photo image source
            $scope.photoSrc = rawPhotoData.uri;
            // Set page title
            $scope.pageTitle = moment(rawPhotoData.date_taken * 1000).format("YYYY-MM-DD h:mm A");
          }
        });
      });
    }
  ]);
  
});
