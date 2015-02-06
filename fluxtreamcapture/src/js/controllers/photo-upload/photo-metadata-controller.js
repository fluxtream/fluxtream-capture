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
      
      // True while loading
      $scope.loading = true;
      
      // True once a change has been made
      $scope.hasChanges = false;
      
      // The list of tags
      $scope.tags = [
        {value: ""}
      ];
      
      // The comment
      $scope.comment = {value: ""};
      
      // Cached metadata to be used if server metadata cannot be fetched
      $scope.cachedMetadata = null;
      
      // Sets the metadata values
      $scope.updateMetadata = function(metadata) {
        $scope.loading = false;
        // Empty tag list
        $scope.tags = [];
        // Add all tags
        if (metadata && metadata.tags) {
          metadata.tags.forEach(function(tag) {
            if (tag) $scope.tags.push({value: tag});
          });
        }
        // Add empty tag at the end
        $scope.tags.push({value: ""});
        // Update comment
        $scope.comment.value = metadata && metadata.comment ? metadata.comment : "";
        $scope.$$phase || $scope.$apply();
      };
      
      // Load tags and comment (download from server ; load from memory if downloading fails or if there are unuploaded changes)
      photoSync.getMetadata($scope.photoId,
        // Preloading cached metadata
        function(metadata) {
          // Save cached metadata to use if the online metadata is not available (e.g. offline mode)
          $scope.cachedMetadata = metadata;
        },
        // Success
        function(metadata) {
          $scope.updateMetadata(metadata);
        },
        // Error
        function() {
          // Failure, load local metadata
          $scope.updateMetadata($scope.cachedMetadata);
        },
        // Photo not uploaded yet, no metadata
        function() {
          $scope.updateMetadata($scope.cachedMetadata);
        }
      );
      
      /**
       * [Called from page] Called when a tag's value has been changed
       */
      $scope.tagChanged = function() {
        if ($scope.tags[$scope.tags.length - 1].value) {
          // Last tag edited, add a new empty tag
          $scope.tags.push({value: ""});
        } else if ($scope.tags.length >= 2 && !$scope.tags[$scope.tags.length - 2].value) {
          // Two last tags are empty, remove last
          $scope.tags.pop();
        }
        $scope.tags.forEach(function(tag) {
          tag.value = tag.value.replace(",", "_");
        });
        $scope.hasChanges = true;
        $scope.$$phase || $scope.$apply();
      };
      
      /**
       * [Called from page] Called when the comment's value has been changed
       */
      $scope.commentChanged = function() {
        $scope.hasChanges = true;
        $scope.$$phase || $scope.$apply();
      };
      
      /**
       * [Called from page] Removes the given tag from the tag list
       */
      $scope.deleteTag = function(tag) {
        $scope.tags.splice($scope.tags.indexOf(tag), 1);
      };
      
      /**
       * [Called from page] Saves changes to local user prefs and to server. Mark the photo for upload if not uploaded yet.
       */
      $scope.applyChanges = function() {
        // Build metadata array
        var tags = [];
        $scope.tags.forEach(function(tag) {
          if (tag.value) tags.push(tag.value);
        });
        var metadata = {
          tags: tags,
          comment: $scope.comment.value
        };
        // Save to user prefs
        userPrefs.set("user." + loginService.getUserId() + ".photo.metadata." + $scope.photoId, JSON.stringify(metadata));
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
