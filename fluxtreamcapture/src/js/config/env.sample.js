/**
 * Copy this file to env.js to set parameters for your environment
 */
define(function() {
  // Catalyst debugging
  // 1. Fill in your catalyst id below (it can be generated on https://trigger.io/catalyst/, or can be any unique string you want)
  // 2. Then open the following url in a browser: https://trigger.io/catalyst/client/#<YOUR_CATALYST_ID>
  // Note: If a catalyst id is given and this page is not open in a browser, the application won't start
  var catalystId = "";
  if (catalystId) {
    $("head").append("<script src='https://trigger.io/catalyst/target/target-script-min.js#" + catalystId + "'></script>");
    forge.enableDebug();
  }
  // Environment configuration
  return {
    // URL of the fluxtream server
    "fluxtream.home.url" : "http://fluxtream.dev/",
    // URL of the fluxtream couchDB server
    "fluxtream.couch.login.url" : "@fluxtream.dev:5984/",
    // URL of the web app (for redirection after authentication)
    "loggedIn.redirect_uri" : "http://fluxtream.dev:3000/",
    // Whether this app is using Parse.com for push notifications
    "using_parse": true,
    // Username and password for automatic authentication (mobile app only)
    "test.username" : "",
    "test.password" : ""
  };
});
