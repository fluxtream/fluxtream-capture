module("flx_photoupload");


asyncTest("Enable autoupload for dev", 1, function() {
  askQuestion("Enable autoupload?", {
    Yes: function() {
      forge.flx_photoupload.setAutouploadOptions({
        upload_landscape_left: false,
        upload_portrait: false,
        upload_landscape_right: false,
        upload_upside_down: false,
//        landscape_left_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//        landscape_right_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//        upside_down_minimum_timestamp: Math.round(new Date().getTime() / 1000),
//        portrait_minimum_timestamp: 1409645385, Math.round(new Date().getTime() / 1000),
        userId: "1",
        upload_url: "http://dev.fluxtream.org/api/v1/bodytrack/photoUpload?connector_name=fluxtream_capture",
        authentication: "",
        access_token: 'c464c911-d05a-4f1a-bd7d-7629d8a6c10a',
        access_token_expiration: 999999999
      });
      ok(true, "User claims success");
      start();
    },
    No: function() {
      ok(true, "User canceled");
      start();
    }
  });
});


//asyncTest("Set upload parameters", 1, function() {
//  askQuestion("Set upload parameters?", {
//    Yes: function () {
//      forge.flx_photoupload.setUploadParameters({
//        "userId": 1,
//        "upload_url": "http://dev.fluxtream.org/api/bodytrack/photoUpload?connector_name=fluxtream_capture",
//        "authentication": "",
//        access_token: 'c464c911-d05a-4f1a-bd7d-7629d8a6c10a',
//        access_token_expiration: 999999999
//      });
//      ok(true, "User claims success");
//      start();
//    },
//    No: function () {
//      ok(true, "User canceled");
//      start();
//    }
//  });
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



