module("flx_photoupload");

asyncTest("Switch user test", 1, function() {
  // Log in first user and enable auto upload
  forge.flx_photoupload.setAutouploadOptions({
    upload_landscape_left: false,
    upload_portrait: true,
    upload_landscape_right: false,
    upload_upside_down: false,
    landscape_left_minimum_timestamp: Math.round(new Date().getTime() / 1000),
    landscape_right_minimum_timestamp: Math.round(new Date().getTime() / 1000),
    upside_down_minimum_timestamp: Math.round(new Date().getTime() / 1000),
    portrait_minimum_timestamp: 1409645385, //Math.round(new Date().getTime() / 1000),
    userId: "1",
    upload_url: "http://dev.fluxtream.org/api/v1/bodytrack/photoUpload?connector_name=fluxtream_capture",
    authentication: btoa("dev:foobarfoobar")
  });
  
  // Photo upload should start
  
  // Disconnect user
  setTimeout(function() {
    forge.flx_photoupload.logoutUser();
  }, 2000);
  
  // Reconnnect another user, no upload should start
  setTimeout(function() {
    forge.flx_photoupload.setAutouploadOptions({
      upload_landscape_left: false,
      upload_portrait: true,
      upload_landscape_right: false,
      upload_upside_down: false,
      landscape_left_minimum_timestamp: Math.round(new Date().getTime() / 1000),
      landscape_right_minimum_timestamp: Math.round(new Date().getTime() / 1000),
      upside_down_minimum_timestamp: Math.round(new Date().getTime() / 1000),
      portrait_minimum_timestamp: Math.round(new Date().getTime() / 1000),
      userId: "2",
      upload_url: "http://dev.fluxtream.org/api/v1/bodytrack/photoUpload?connector_name=fluxtream_capture",
      authentication: btoa("dev2:foobarfoobar")
    });
  }, 5000);
  
  setTimeout(function() {
    forge.flx_photoupload.logoutUser();
  }, 7000);
  
  setTimeout(function() {
    forge.flx_photoupload.setAutouploadOptions({
      upload_landscape_left: false,
      upload_portrait: true,
      upload_landscape_right: false,
      upload_upside_down: false,
      landscape_left_minimum_timestamp: Math.round(new Date().getTime() / 1000),
      landscape_right_minimum_timestamp: Math.round(new Date().getTime() / 1000),
      upside_down_minimum_timestamp: Math.round(new Date().getTime() / 1000),
      portrait_minimum_timestamp: 1409645385, //Math.round(new Date().getTime() / 1000),
      userId: "1",
      upload_url: "http://dev.fluxtream.org/api/v1/bodytrack/photoUpload?connector_name=fluxtream_capture",
      authentication: btoa("dev:foobarfoobar")
    });
  }, 11000);
  
});
