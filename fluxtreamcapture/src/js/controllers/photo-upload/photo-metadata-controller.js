/**
 * Angular controller for the photo metadata edition screen
 */
define([
  'config/env',
  'app-modules',
  'services/photo-list-service',
  'services/user-prefs-service',
  'services/photo-synchronization-service'
], function(env, appModules) {
  
  // Photo metadata controller
  appModules.controllers.controller('PhotoMetadataController', [
    "$scope",
    "$state",
    "$stateParams",
    "LoginService",
    'UserPrefsService',
    "PhotoSynchronizationService",
    function($scope, $state, $stateParams, loginService, userPrefs, photoSync) {
      
      // The photo id
      $scope.photoId = $stateParams.photoId;
      
      // The list of tags
      $scope.tags = [
        {value: ""}
      ];
      
      // The comment
      $scope.comment = {value: ""};
      
      // Load tags and comment from memory
      var metadata = userPrefs.get("photo.metadata." + $scope.photoId);
      if (metadata) {
        // Parse metadata
        metadata = JSON.parse(metadata);
        // Empty tag list
        $scope.tags = [];
        // Add all tags
        metadata.tags.split(",").forEach(function(tag) {
          if (tag) $scope.tags.push({value: tag});
        });
        // Add empty tag at the end
        $scope.tags.push({value: ""});
        // Update comment
        $scope.comment.value = metadata.comment;
      }
      
      /**
       * [Called from page] Called when a tag's value has been changed
       */
      $scope.tagChanged = function() {
        forge.logging.info("tagChanged");
        if ($scope.tags[$scope.tags.length - 1].value) {
          // Last tag edited, add a new empty tag
          $scope.tags.push({value: ""});
        } else if ($scope.tags.length >= 2 && !$scope.tags[$scope.tags.length - 2].value) {
          // Two last tags are empty, remove last
          $scope.tags.pop();
        }
      };
      
      /**
       * [Called from page] Removes the given tag from the tag list
       */
      $scope.deleteTag = function(tag) {
        forge.logging.info("Removing tag: " + tag.value);
        $scope.tags.splice($scope.tags.indexOf(tag), 1);
      };
      
      /**
       * [Called from page] Saves changes to local user prefs and to server. Mark the photo for upload if not uploaded yet.
       */
      $scope.applyChanges = function() {
        // Build metadata array
        var tags = "";
        $scope.tags.forEach(function(tag) {
          if (tag.value) tags += (tags ? "," : "") + tag.value;
        });
        var metadata = {
          tags: tags,
          comment: $scope.comment.value
        };
        // Save to user prefs
        userPrefs.set('photo.metadata.' + $scope.photoId, JSON.stringify(metadata));
        forge.logging.info("Metadata saved locally for photo " + $scope.photoId + ": " + JSON.stringify(metadata));
        // Upload photo if not uploaded yet
        photoSync.uploadPhoto(parseInt($scope.photoId), function() {}, function() {});
        // Upload metadata
        photoSync.synchronizeMetadata($scope.photoId);
        // Go to previous screen
        $state.go("photoPreview", {photoId: $scope.photoId});
      };
      
    }
  ]);
});
