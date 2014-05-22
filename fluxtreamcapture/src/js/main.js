// Enable this for debugging
// forge.enableDebug();

forge.logging.info("Starting Fluxtream Capture app");

/**
 * Tries to upload a picture to the fluxtream server
 * 
 * @param {string} pictureURI  The local URI of the picture to upload
 * @param {function} successCallback()  Called on success
 * @param {function} errorCallback(error) Called on error with error data
 */
function uploadPicture(pictureURI, successCallback, errorCallback) {
  forge.request.ajax({
    type: 'POST',
    url: 'http://fluxtream.org/api/bodytrack/photoUpload?connector_name=fluxtream_capture',
    files: [{
      uri: pictureURI,
      name: 'photo',
      type: 'image'
    }],
    data: {
      'metadata': '{capture_time_secs_utc:1400689661}'
    },
    headers: {
      'Authorization': 'Basic SnVsZHVwOmp1bGllbjIy' // Juldup:julien22 in base64
    },
    success: function(data, headers) {
      forge.logging.info("Successful request");
      forge.logging.info(data);
      forge.logging.info(headers);
      successCallback();
    },
    error: function(error) {
      forge.logging.info("Request error");
      forge.logging.info(error);
      errorCallback(error);
    }
  });
}

// Angular pictures module
angular.module('pictures', [])
// Configuration
.config( [
  '$compileProvider',
  function($compileProvider) {
    // Allow image sources starting with "content://"
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|content):/);
  }
])
// Controller
.controller('PictureController', function($scope) {
  
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
    $scope.$apply();
    // Get picture upload status from player prefs if any
    forge.prefs.get('picture-' + newPicture.id + '-status',
      // Success
      function(value) {
        if (!value) value = 'none';
        newPicture.upload_status = value;
        $scope.$apply();
      },
      // Error
      function(content) {
        forge.logging.info("Error while getting picture status: " + content);
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
    forge.access_gallery.getPictureList(
      // Success
      function(jsonArray) {
        var pictureArray = JSON.parse(jsonArray);
        $scope.pictureCount = pictureArray.length;
        // Add all pictures
        $scope.addPicturesFromGallery(pictureArray);
        // Set loaded status
        $scope.loaded = true;
        $scope.$apply();
      },
      // Error
      function(error) {
        forge.logging.info("Error while calling getPictureList");
        forge.logging.info(error);
      }
    );
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
        $scope.$apply();
      },
      // Error
      function(content) {
        forge.logging.info("Error while saving picture status: " + content);
      }
    );
  };
  
  /**
   * (Public) Upload the picture to the server and updates its upload status
   * 
   * @param {object} picture  The object containing the picture data (see @scope.pictures documentation for details)
   */
  $scope.uploadPicture = function(picture) {
    forge.logging.info("Upload picture");
    $scope.updatePictureStatus(picture, 'uploading');
    uploadPicture(picture.uri,
      // Success
      function() {
        forge.logging.info("Upload successful");
        $scope.updatePictureStatus(picture, 'uploaded');
      },
      // Error
      function() {
        forge.logging.info("Error while uploading photo");
        $scope.updatePictureStatus(picture, 'failed');
      }
    );
  };
  
  // Initially load pictures
  $scope.addAllPicturesFromGallery();
  
});
