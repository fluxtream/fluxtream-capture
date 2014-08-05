/**
 * Angular controller for the photo metadata edition screen
 */
define([
  'config/env',
  'app-modules',
  'services/photo-list-service',
  'services/user-prefs-service'
], function(env, appModules) {
  
  // Photo metadata controller
  appModules.controllers.controller('PhotoMetadataController', ["$scope", "$stateParams", "PhotoListService", 'UserPrefsService',
    function($scope, $stateParams, photoListService, userPrefs) {
      
      $scope.photoId = $stateParams.photoId;
      
    }
  ]);
});
