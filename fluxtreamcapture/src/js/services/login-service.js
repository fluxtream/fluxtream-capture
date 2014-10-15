/**
 * This service manages all communication with the fluxtream server
 */
define([
  'app-modules',
  'config/env',
  'services/user-prefs-service'
], function(appModules, env) {
  
  appModules.services.factory('LoginService', ['UserPrefsService', "$state", "$rootScope", function(userPrefs, $state, $rootScope) {
    
    /**
     * The callback function after a successful authentication
     */
    var onSuccessFunction;
    
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
        if (!username) username = userPrefs.get('login.username');
        if (!password) password = userPrefs.get('login.password');
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
      options.url = getTargetServer() + "api/v1/guest";
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
            forge.logging.info("Error accessing " + getTargetServer() + "api/v1/guest (status.result is not \"OK\"): " + textStatus);
            if (forge.is.web()) {
              window.location = getTargetServer() + "mobile/signIn?r=" + env["loggedIn.redirect_uri"];
            } else {
              window.location = getTargetServer() + "mobile/signIn?r=fluxtream://mainmenu";
            }
          } else {
            forge.logging.info("Error accessing " + getTargetServer() + "api/v1/guest: " + textStatus);
            alert("Error accessing " + getTargetServer() + "\nError code: " + textStatus);
          }
        }
      });
    }
    
    function checkAuthOnDevice() {
      forge.logging.info("Checking auth on device...");
      // Execute after userPrefs access has been initialized
      userPrefs.onReady(function() {
        // Get username and password from user prefs
        var username = userPrefs.get('login.username');
        var password = userPrefs.get('login.password');
        if (!username && env['test.username']) {
          username = env['test.username'];
          userPrefs.set('login.username', username);
        }
        if (!password && env['test.password']) {
          password = env['test.password'];
          userPrefs.set('login.password', password);
        }
        if (username && password) {
          // Username and password retrieved, try logging in with them
          forge.logging.info("Running ajax request to check credentials: " + getTargetServer() + "api/v1/guest");
          ajaxCheckAuth({
            success: handleAuthSuccessResponse,
            error: function(response, content, type) {
              forge.logging.info("Logging in failed");
              handleAuthErrorResponseOnMobile(response.statusCode);
            }
          }, username, password);
        } else {
          // Username and password not set
          handleAuthErrorResponseOnMobile();
        }
      });
    }
    
    function handleAuthSuccessResponse(guestModel, textStatus) {
      forge.logging.info("Logging in successful");
      forge.logging.info(guestModel);
      userPrefs.set('login.username', guestModel.username);
      userPrefs.set('login.userId', guestModel.id + "");
      userPrefs.set('login.isAuthenticated', true);
      if (typeof (guestModel.username) !== "undefined") {
        if (typeof onSuccessFunction === 'function') onSuccessFunction();
      } else {
        forge.logging.info("Error accessing " + getTargetServer() + "api/v1/guest: " + textStatus);
        alert("Error accessing " + getTargetServer() + "\nError code: " + textStatus);
      }
      $rootScope.$broadcast('user-logged-in');
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
          alert("Wrong username or password for " + getTargetServer() + "\nPlease check.");
          $state.go("login");
        } else {
          // Another error happened
          forge.logging.info("Error accessing " + getTargetServer() + "api/v1/guest: " + statusCode);
          alert("Error accessing " + getTargetServer() + "\nError code: " + statusCode);
        }
      } else {
        // Credentials are not set yet
        forge.logging.info("The user has not entered credentials yet, showing login page");
        if (typeof onSuccessFunction === 'function') onSuccessFunction();
        $state.go('login');
      }
      // Hide launch screen
      forge.launchimage.hide();
    }
    
    /**
     * (Public) Logs out the user
     */
    function logout() {
      userPrefs.set('login.isAuthenticated', false);
      userPrefs.set('login.password', "");
      userPrefs.set('login.userId', null);
      $rootScope.$broadcast('user-logged-out');
      $state.go('login');
      
      // Clear cookies
      forge.request.ajax({
        type: "GET",
        url: getTargetServer() + "logout",
        headers: {
          'Content-Type': 'application/json'
        },
        dataType: "json"
      });
      
    }
    
    /**
     * (Public) Returns authentication status (true/false)
     */
    function isAuthenticated() {
      return userPrefs.get('login.isAuthenticated');
    }

    /**
     * (Public) Returns username
     */
    function getUserName() {
      return userPrefs.get('login.username');
    }
    
    /**
     * (Public) Returns the target server
     */
    function getTargetServer() {
      // Read target from settings
      var target = userPrefs.get('login.target');
      // If not in settings or web mode, use default target
      if (!target || forge.is.web()) target = env['fluxtream.home.url'];
      // Make sure the target has a protocol and a trailing slash
      if (target.indexOf("://") == -1) target = "http://" + target;
      if (target.charAt(target.length - 1) != "/") target = target + "/";
      // Return target
      return target;
    }
    
    /**
     * (Public) Returns the user's id
     */
    function getUserId() {
      return userPrefs.get('login.userId');
    }
    
    return {
      checkAuth: checkAuth,
      isAuthenticated: isAuthenticated,
      ajax: ajax,
      getUserName: getUserName,
      getUserId: getUserId,
      getTargetServer: getTargetServer,
      logout: logout
    };
    
  }]);
  
});
