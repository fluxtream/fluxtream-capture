/**
 * This service manages all communication with the fluxtream server
 */
define([
  'flxModules',
  'env',
], function(flxModules, env) {
  
  flxModules.flxServices.factory('FluxtreamCommunication', function() {
    
    /**
     * The callback function after a successful authentication
     */
    var onSuccessFunction;
    
    var guestData = {};
    var guestIsAuthenticated = false;
    
    /**
     * Checks authentification to the fluxtream server
     * 
     * @param {function} success  The function that is called if the authentication succeeded
     */
    function checkAuth(success) {
      onSuccessFunction = success;
      if (forge.is.web())
        checkAuthOnWeb();
      else
        checkAuthOnDevice();
    }
    
    function checkAuthOnWeb() {
      forge.logging.info("Checking auth on web...");
      $.ajax({
        type: "GET",
        url: env["fluxtream.home.url"] + "api/v1/guest",
        xhrFields: {
          withCredentials: true
        },
        headers: {
          'Content-Type': 'application/json'
        },
        dataType: "json",
        success: handleAuthSuccessResponse,
        error: function(jqXHR, textStatus, stackTrace) {
          forge.logging.debug("status: " + jqXHR.status);
          forge.logging.debug("status: " + stackTrace);
          if (jqXHR.status === 401) {
            forge.logging.info("Error accessing " + env["fluxtream.home.url"] + "api/v1/guest (status.result is not \"OK\"): " + textStatus);
            if (forge.is.web()) {
              window.location = env["fluxtream.home.url"] + "mobile/signIn?r=" + env["loggedIn.redirect_uri"];
            } else {
              window.location = env["fluxtream.home.url"] + "mobile/signIn?r=fluxtream://mainmenu";
            }
          } else {
            forge.logging.info("Error accessing " + env["fluxtream.home.url"] + "api/v1/guest: " + textStatus);
            $("body").empty().append("<h1>Error accessing " + env["fluxtream.home.url"] + "api/v1/guest: " + textStatus + "</h1>");
          }
        }
      });
    }
    
    function checkAuthOnDevice() {
      forge.logging.info("Checking auth on device...");
      // Get username and password from user prefs
      forge.prefs.get('settings.username',
        // Success
        function(username) {
          if (!username && env['test.username']) username = env['test.username'];
          forge.prefs.get('settings.password',
          // Success
          function(password) {
            if (!password && env['test.password']) password = env['test.password'];
            if (username && password) {
              // Username and password retrieved, try logging in with them
              forge.logging.info("Running ajax request to check credentials: " + env["fluxtream.home.url"] + "api/v1/guest");
              forge.request.ajax({
                type: "GET",
                headers: {
                  'Authorization': 'Basic ' + btoa(username + ":" + password)
                },
                url: env["fluxtream.home.url"] + "api/v1/guest",
                dataType: "json",
                success: handleAuthSuccessResponse,
                error: function(response, content, type) {
                  forge.logging.info("Logging in failed");
                  handleAuthErrorResponseOnMobile(response.statusCode);
                }
              });
            } else
              handleAuthErrorResponseOnMobile();
          },
          // Error getting password
          function() {
            handleAuthErrorResponseOnMobile();
          }
          );
        },
        // Error getting username
        function() {
          handleAuthErrorResponseOnMobile();
        }
      );
    }
    
    function handleAuthSuccessResponse(guestModel, textStatus) {
      forge.logging.info("Logging in successful");
      forge.logging.info(guestModel);
      guestData = guestModel;
      guestIsAuthenticated = true;
      if (typeof (guestModel.username) !== "undefined") {
        if (typeof onSuccessFunction === 'function') onSuccessFunction();
      } else {
        forge.logging.info("Error accessing " + env["fluxtream.home.url"] + "api/v1/guest: " + textStatus);
        $("body").empty().append("<h1>Error accessing " + env["fluxtream.home.url"] + "api/v1/guest: " + textStatus + "</h1>");
      }
    }
    
    /**
     * If this function is called with a status code, a web request has been made and has produced an error.
     * If this function is called without a status code, the username and password are not set.
     * 
     * @param {integer/string} statusCode  The response status code of the web request (if any)
     */
    function handleAuthErrorResponseOnMobile(statusCode) {
      if (statusCode) {
        // Credentials are set, but an error occured
        if (statusCode === 401 || statusCode === "401") {
          // Credentials are incorrect
          forge.logging.info("The user credentials are incorrect, showing login page");
          if (typeof onSuccessFunction === 'function') onSuccessFunction();
          window.location = "#/login";
        } else {
          // Another error happened
          forge.logging.info("Error accessing " + env["fluxtream.home.url"] + "api/v1/guest: " + statusCode);
          $("body").empty().append("<h1>Error accessing " + env["fluxtream.home.url"] + "api/v1/guest: " + statusCode + "</h1>");
        }
      } else {
        // Credentials are not set yet
        forge.logging.info("The user has not entered credentials yet, showing login page");
        if (typeof onSuccessFunction === 'function') onSuccessFunction();
        window.location = "#/login";
      }
    }
    
    function isAuthenticated() {
      return guestIsAuthenticated;
    }
    
    return {
      checkAuth: checkAuth,
      isAuthenticated: guestIsAuthenticated
    };
    
  });
  
});
