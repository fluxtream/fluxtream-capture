module("flx_polar_h7");

asyncTest("Enable autoupload for dev", 1, function() {
  askQuestion("Start service?", {
    Yes: function() {
      forge.flx_polar_h7.startService("http://dev.fluxtream.org/api/v1/bodytrack/upload", 'bf0f0f07-d9c2-4515-84ca-3a20861f3970');
      ok(true, "User claims success");
      start();
    },
    No: function() {
      ok(true, "User canceled");
      start();
    }
  });
});