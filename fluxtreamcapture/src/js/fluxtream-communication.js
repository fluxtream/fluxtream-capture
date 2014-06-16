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
     * (Public) Checks authentification to the fluxtream server
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
    
    /**
     * (Public) Makes an ajax call to the fluxtream server regardless of whether
     * we are on mobile or web.
     * On mobile, the credentials are always added to the request.
     * On web, the withCredentials XHR field is set to true.
     * 
     * @param {type} options  Ajax options
     * @param {type} username  Username (mobile only)
     * @param {type} password  User password (mobile only)
     */
    function ajax(options, username, password) {
      if (forge.is.web()) {
        if (typeof options.xhrFields === 'undefined') options.xhrFields = {};
        options.xhrFields.withCredentials = true;
        $.ajax(options);
      } else {
        if (typeof options.headers === 'undefined') options.headers = {};
        options.headers.Authorization = 'Basic ' + btoa(username + ":" + password);
        forge.request.ajax(options);
      }
    }
    
    /**
     * (Private) Makes an ajax call to check if the user is authenticated
     * 
     * @param {type} options  The success and error callbacks
     * @param {type} username  Username (mobile only)
     * @param {type} password  User password (mobile only)
     */
    function ajaxCheckAuth(options, username, password) {
      options.type = "GET";
      options.url = env["fluxtream.home.url"] + "api/v1/guest";
      options.headers = {
        'Content-Type': 'application/json'
      };
      options.dataType = "json";
      ajax(options, username, password);
    }
    
    function checkAuthOnWeb() {
      forge.logging.info("Checking auth on web...");
      ajaxCheckAuth({
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
              ajaxCheckAuth({
                success: handleAuthSuccessResponse,
                error: function(response, content, type) {
                  forge.logging.info("Logging in failed");
                  handleAuthErrorResponseOnMobile(response.statusCode);
                }
              }, username, password);
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
    
    /**
     * (Public) Returns authentication status (true/false)
     */
    function isAuthenticated() {
      return guestIsAuthenticated;
    }
    
    return {
      checkAuth: checkAuth,
      isAuthenticated: guestIsAuthenticated,
      ajax: ajax
    };
    
  });
  
});