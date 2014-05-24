/**
 * Angular controller for the picture page
 * 
 * NOTE: Currently, the pictures are being uploaded only when this page is active.
 * This functionnality should be moved to a background task.
 */
define([
  'controllers/controller-module'
], function(controllers) {
  
  // Get fluxtream credentials and target from user prefs
  var username = "";
  var password = "";
  var uploadTarget = "fluxtream.org"
  forge.prefs.get('settings.username',
    function(value) { username = value; }, // Success
    function(content) { forge.logging.error("Error while getting username from user prefs: " + content); } // Error
  );
  forge.prefs.get('settings.password',
    function(value) { password = value; }, // Success
    function(content) { forge.logging.error("Error while getting password from user prefs: " + content); } // Error
  );
  forge.prefs.get('settings.target',
    function(value) { if (value) uploadTarget = value; }, // Success
    function(content) { forge.logging.error("Error while getting target from user prefs: " + content); } // Error
  );
  
  /**
   * Tries to upload a picture to the fluxtream server
   * 
   * @param {string} pictureURI  The local URI of the picture to upload
   * @param {function()} successCallback  Called on success
   * @param {function(error)} errorCallback Called on error with error data
   * @return {boolean} False if the crendentials are not set, true if the request has been sent
   */
  function uploadPicture(pictureURI, successCallback, errorCallback) {
    if (!username || !password) return false;
    var url = (uploadTarget.indexOf("://") > 0 ? "" : "http://") + uploadTarget + "/api/bodytrack/photoUpload?connector_name=fluxtream_capture";
    forge.request.ajax({
      type: 'POST',
      url: url,
      files: [{
        uri: pictureURI,
        name: 'photo',
        type: 'image'
      }],
      data: {
        'metadata': '{capture_time_secs_utc:1400689661}' // TODO get date from picture
      },
      headers: {
        'Authorization': 'Basic ' + btoa(username + ":" + password)
      },
      success: function(data, headers) {
        successCallback();
      },
      error: function(error) {
        forge.logging.warning("Error while uploading a picture:");
        forge.logging.warning(error);
        errorCallback(error);
      }
    });
    return true;
  }
  
  // Picture controller
  controllers.controller('PictureController', function($scope) {
    
    // List of available pictures, pictures are object of type {
    //   src:           the html src of the picture
    //   orientation:   the picture's orientation when taken (0, 90, 180 or 270)
    //   id:            the id of the picture in the device's database
    //   upload_status: the status of the upload ('none', 'pending', 'uploading', 'uploaded', 'failed')
    //   uri:           the URI of the picture on the local device
    // }
    $scope.pictures = [];
    
    // The total number of pictures (should match $scope.pictures.length, except while they are loading)
    $scope.pictureCount = 0;
    
    // True once the local pictures have been loaded
    $scope.loaded = false;
    
    /**
     * (Private) Adds each picture in the list to the current picture list
     */
    $scope.addPicturesFromGallery = function(pictureList) {
      if (pictureList.length === 0) return;
      // Extract first picture from the array
      pictureData = pictureList.shift();
      // Create picture object
      var newPicture = {
        src: pictureData.thumb_uri ? pictureData.thumb_uri : pictureData.uri,
        orientation: pictureData.orientation,
        id: pictureData.id,
        upload_status: 'unknown',
        uri: pictureData.uri
      };
      // Add it to the picture list
      $scope.pictures.push(newPicture);
      // Refresh the UI
      $scope.$$phase || $scope.$apply();
      // Get picture upload status from player prefs if any
      forge.prefs.get('picture-' + newPicture.id + '-status',
        // Success
        function(value) {
          if (!value) value = 'none';
          if (value === 'uploading' || value === 'failed') value = 'pending'; // Upload failed in previous session
          newPicture.upload_status = value;
          $scope.$$phase || $scope.$apply();
          // See if this picture needs to be marked for upload because of its orientation
          $scope.autoUploadOrientations.forEach(function(degrees) {
            $scope.markForUploadIfOrientationMatches(newPicture, degrees);
          });
        },
        // Error
        function(content) {
          forge.logging.error("Error while getting picture status: " + content);
        }
      );
      // Add next pictures (wrapped in a timeout to avoid blocking the UI)
      setTimeout(function() {
        $scope.addPicturesFromGallery(pictureList);
      }, 0);
    };
    
    /**
     * (Public) Loads all picture from the device image gallery
     */
    $scope.addAllPicturesFromGallery = function() {
      // Call native module to get picture list
      forge.fc_gallery.getPictureList(
        // Success
        function(jsonArray) {
          var pictureArray = JSON.parse(jsonArray);
          $scope.pictureCount = pictureArray.length;
          // Add all pictures
          $scope.addPicturesFromGallery(pictureArray);
          // Set loaded status
          $scope.loaded = true;
          $scope.$$phase || $scope.$apply();
          // Mark for upload by orientation
          $scope.markForUploadByOrientation();
          // Upload pictures waiting for upload (if any)
          $scope.uploadNextPicture();
        },
        // Error
        function(error) {
          forge.logging.error("Error while calling getPictureList:");
          forge.logging.error(error);
        }
      );
    };
    
    // The list of orientations (in degrees: 0, 90, 180, 270) that will be automatically uploaded
    $scope.autoUploadOrientations = [];
    
    /**
     * (Private) Marks for upload the unuploaded pictures that match
     * the auto-upload by orientation criteria
     */
    $scope.markForUploadByOrientation = function() {
      var orientations = [
        {name:'portrait', degrees:90},
        {name:'upside_down', degrees: 270},
        {name:'landscape_left', degrees: 180},
        {name:'landscape_right', degrees: 0}
      ];
      orientations.forEach(function(orientation) {
        forge.prefs.get("settings.pictures_" + orientation.name,
          // Success
          function(value) {
            if (value) {
              $scope.pictures.forEach(function(picture) {
                $scope.markForUploadIfOrientationMatches(picture, orientation.degrees);
              });
              $scope.autoUploadOrientations.push(orientation.degrees);
              $scope.uploadNextPicture();
            }
          },
          // Error
          function(content) {}
        );
      });
    };
    
    /**
     * (Private) Tests if a picture's orientation matches the given orientation
     * and if they match and the picture's status is none, mark the picture for upload
     */
    $scope.markForUploadIfOrientationMatches = function(picture, orientation) {
      if (picture.upload_status === 'none' && picture.orientation === orientation) {
        $scope.updatePictureStatus(picture, 'pending');
      }
    };
    
    /**
     * (Private) Saves a picture's status to the user's prefs
     * 
     * @param {object} picture  The object containing the picture data (see @scope.pictures documentation for details)
     * @param {string} status  The new status to save
     */
    $scope.updatePictureStatus = function(picture, status) {
      // Set prefs with native module
      forge.prefs.set('picture-' + picture.id + '-status', status,
        // Success
        function() {
          picture.upload_status = status;
          $scope.$$phase || $scope.$apply();
        },
        // Error
        function(content) {
          forge.logging.error("Error while saving picture status: " + content);
        }
      );
    };
    
    /**
     * (Public) Upload the picture to the server and updates its upload status
     * 
     * @param {object} picture  The object containing the picture data (see @scope.pictures documentation for details)
     */
    $scope.uploadPicture = function(picture) {
      // Mark picture for future upload
      $scope.updatePictureStatus(picture, 'pending');
      // Try uploading picture
      $scope.uploadNextPicture();
    };
    
    // Variable keeping track of whether an upload is running
    $scope.anUploadIsActive = false;
    
    /**
     * (Private) Tries uploading all the pictures marked for upload one by one
     */
    $scope.uploadNextPicture = function() {
      // Don't process queue if an upload is already active
      if ($scope.anUploadIsActive) {
        return;
      }
      // Search through pictures for pending uploads
      for (var i = 0; i < $scope.pictures.length; i++) {
        var picture = $scope.pictures[i];
        if (picture.upload_status === 'pending') {
          // This picture's upload is pending, upload it now
          var uploadStarted = uploadPicture(picture.uri,
            // Success
            function() {
              // Mark picture as uploaded
              $scope.updatePictureStatus(picture, 'uploaded');
              // Now, upload next
              $scope.anUploadIsActive = false;
              $scope.uploadNextPicture();
            },
            // Error
            function() {
              // Mark upload as failed
              $scope.updatePictureStatus(picture, 'failed');
              // Now, upload next
              $scope.anUploadIsActive = false;
              $scope.uploadNextPicture();
            }
          );
          if (uploadStarted) {
            // Prevent concurrent uploads
            $scope.anUploadIsActive = true;
            // Set picture status
            $scope.updatePictureStatus(picture, 'uploading');
            $scope.$$phase || $scope.$apply();
            // Return, as an upload has started
            return;
          } else {
            // Mark picture upload as failed
            $scope.updatePictureStatus(picture, 'failed');
          }
        }
        if (picture.upload_status === 'unknown') {
          // Some pictures' statuses are not ready (they are loaded asynchronously), try again later
          setTimeout(function() {
            $scope.uploadNextPicture();
          }, 1000);
          return;
        }
      }
      // There is no pending upload anymore
    };
    
    // Initially load pictures
    if (!forge.is.web()) {
      $scope.addAllPicturesFromGallery();
    } else {
      // Web app, no picture library
      $scope.loaded = true;
    }
    
  });
  
});
