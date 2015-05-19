module("flx_photoupload");

asyncTest("Load photo list", 1, function() {
  askQuestion("Load photo list ?", {
    Yes: function() {
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
          // Load statuses
//          var photoIds = [];
//          photos.forEach(function(photo) {
//            photoIds.push(photo.id);
//          });
//          var time = new Date().getTime();
//          forge.flx_photoupload.getPhotoStatuses(photoIds,
//            // Success
//            function(photoStatuses) {
//              forge.logging.info("Photo statuses loaded");
//              var time2 = new Date().getTime();
//              forge.logging.info("Photo status loading time: " + (time2 - time));
//              // Load thumbnails
//              var counter = 0;
//              photos.forEach(function(photo) {
//                counter++;
//                if (counter <= 100) {
//                  forge.flx_photoupload.getThumbnail(photo.id);
//                }
//              });
//            },
//            // Error
//            function(error) {
//              forge.logging.error("Error while getting photo statuses: " + JSON.stringify(error));
//            }
//          );
        }
      );
      ok(true, "User claims success");
      start();
    },
    No: function() {
      ok(true, "User canceled");
      start();
    }
  });
});


//asyncTest("Enable autoupload for dev", 1, function() {
//  askQuestion("Enable autoupload?", {
//    Yes: function() {
//      forge.flx_photoupload.setAutouploadOptions({
//        upload_landscape_left: false,
//        upload_portrait: true,
//        upload_landscape_right: false,
//        upload_upside_down: false,
//        landscape_left_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//        landscape_right_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//        upside_down_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//        portrait_minimum_timestamp: 1409645385, //Math.round(new Date().getTime() / 1000),
//        userId: "1",
//        upload_url: "http://dev.fluxtream.org/api/v1/bodytrack/photoUpload?connector_name=fluxtream_capture",
//        authentication: btoa("dev:foobarfoobar")
//      });
//      ok(true, "User claims success");
//      start();
//    },
//    No: function() {
//      ok(true, "User canceled");
//      start();
//    }
//  });
//});

//asyncTest("Set upload parameters", 1, function() {
//	askQuestion("Set upload parameters?", {
//		Yes: function () {
//			forge.flx_photoupload.setUploadParameters(
//				// Upload URL
//				"http://fluxtream.org/api/bodytrack/photoUpload?connector_name=fluxtream_capture",
//				// Authentication
//				btoa("dev:foobarfoobar")
//			);
//			ok(true, "User claims success");
//			start();
//		},
//		No: function () {
//			ok(true, "User canceled");
//			start();
//		}
//	});
//});

//asyncTest("Log out dev", 1, function() {
//          askQuestion("Logout dev?", {
//                      Yes: function () {
//                        forge.flx_photoupload.logoutUser();
//                        ok(true, "User claims success");
//                        start();
//                      },
//                      No: function () {
//                        ok(true, "User canceled");
//                        start();
//                      }
//                      });
//          });
//
//
//
//asyncTest("Enable autoupload for dev", 1, function() {
//          askQuestion("Enable autoupload?", {
//                      Yes: function () {
//                      forge.flx_photoupload.setAutouploadOptions({
//                                                                 upload_landscape_left: false,
//                                                                 upload_portrait: true,
//                                                                 upload_landscape_right: false,
//                                                                 upload_upside_down: false,
//                                                                 landscape_left_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//                                                                 landscape_right_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//                                                                 upside_down_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//                                                                 portrait_minimum_timestamp: 1409645385,//Math.round(new Date().getTime() / 1000),
//                                                                 userId: "1",
//                                                                 upload_url: "http://fluxtream.org/api/bodytrack/photoUpload?connector_name=fluxtream_capture",
//                                                                 authentication: btoa("dev:foobarfoobar")
//                                                                 });
//                      ok(true, "User claims success");
//                      start();
//                      },
//                      No: function () {
//                      ok(true, "User canceled");
//                      start();
//                      }
//                      });
//          });



