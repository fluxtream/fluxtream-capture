module("flx_photoupload");

asyncTest("Enable autoupload", 1, function() {
	askQuestion("Enable autoupload?", {
		Yes: function () {
			forge.flx_photoupload.setAutouploadOptions({
				upload_landscape: true,
				upload_portrait: false,
				landscape_minimum_timestamp: Math.round(new Date().getTime() / 1000),
				portrait_minimum_timestamp: Math.round(new Date().getTime() / 1000),
				upload_url: "http://fluxtream.org/api/bodytrack/photoUpload?connector_name=fluxtream_capture",
				authentication: btoa("dev:foobarfoobar")
			});
			ok(true, "User claims success");
			start();
		},
		No: function () {
			ok(true, "User canceled");
			start();
		}
	});
});

asyncTest("Set upload parameters", 1, function() {
	askQuestion("Set upload parameters?", {
		Yes: function () {
			forge.flx_photoupload.setUploadParameters(
				// Upload URL
				"http://fluxtream.org/api/bodytrack/photoUpload?connector_name=fluxtream_capture",
				// Authentication
				btoa("dev:foobarfoobar")
			);
			ok(true, "User claims success");
			start();
		},
		No: function () {
			ok(true, "User canceled");
			start();
		}
	});
});
