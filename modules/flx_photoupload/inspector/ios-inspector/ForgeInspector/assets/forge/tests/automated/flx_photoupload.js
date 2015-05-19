module("flx_photoupload");

asyncTest("Switch user test", 1, function() {
  forge.flx_photoupload.getPhotoList(
    // Success
    function(jsonArray) {
      // Data can either be json-encoded string or an actual array
      var photoList;
      if (typeof jsonArray === 'string') {
        // Json string, convert to array
        photoList = JSON.parse(jsonArray);
      } else {
        // Acual array
        photoList = jsonArray;
      }
      // Create photo list
      var photos = [];
      photoList.forEach(function(rawPhotoData) {
        var photoObject = {
          src: rawPhotoData.thumb_uri,
          orientation: rawPhotoData.orientation,
          id: rawPhotoData.id,
          upload_status: 'unknown',
          uri: rawPhotoData.uri,
          date_taken: rawPhotoData.date_taken,
          orientation_tag: rawPhotoData.orientation_tag
        };
        // Add it to the photo list
        photos.unshift(photoObject);
      });
      photos.forEach(function(photo) {
        $("body").prepend("<img src='" + photo.src + "' style='width: 20px; height: 20px'>");
      });
    }
  );
  
});
