/**
 * This service manages all communication with the fluxtream server
 */
define([
  'app-modules',
  'config/env',
  'services/user-prefs-service',
  'services/device-id-service',
  'services/image-cache'
], function(appModules, env) {
  
  appModules.services.factory('LoginService', [
    'UserPrefsService',
    "$state",
    "$rootScope",
    'DeviceIdService',
    'ImageCacheService',
    function(userPrefs, $state, $rootScope, deviceIdService, imageCache) {
      
      /**
       * The callback function after a successful authentication
       */
      var onSuccessFunction;
      
      // Enable menu drag on login
      $rootScope.$on('user-logged-in', function() {
        $rootScope.disableDragMenu = false;
      });
      
      /**
       * (Public) Checks authentification to the fluxtream server (web only)
       * 
       * @param {function} success  The function that is called if the authentication succeeded
       */
      function checkAuth(username, password, success) {
        onSuccessFunction = success;
        if (forge.is.web()) {
          checkAuthOnWeb();
        }
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
          if (username && password) {
            if (typeof options.headers === 'undefined') options.headers = {};
            options.headers.Authorization = 'Basic ' + btoa(username + ":" + password);
          } else {
            if (typeof options.data === 'undefined') options.data = {};
            options.data.access_token = userPrefs.get('login.fluxtream_access_token'),
            forge.request.ajax(options);
          }
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
      
      /**
       * (Private) Makes an ajax call to sign the user in using their username and password (mobile only)
       */
      function signIn(username, password, success, error) {
        deviceIdService.getDeviceIdAsync(function(deviceId) {
          forge.request.ajax({
            url: getTargetServer() + "api/v1/mobile/signin",
            type: "POST",
            headers: {
              'Content-Type': 'application/json'
            },
            dataType: "json",
            data: {
              username: username,
              password: password,
              device_id: deviceId
            },
            success: function(guestModel, textStatus) {
              handleAuthSuccessResponse(guestModel, textStatus);
              if (success) success();
            },
            error: function(response) {
              // Credentials are set, but an error occured
              if (response.statusCode === 401 || response.statusCode === "401") {
                // Credentials are incorrect
                error("Wrong username or password for " + getTargetServer() + "\nPlease check.");
              } else {
                // Another error happened
                forge.logging.error("Error accessing " + getTargetServer() + "api/v1/guest: " + response.statusCode);
                error("Error accessing " + getTargetServer() + "\nError code: " + response.statusCode);
              }
            }
          });
        });
      }
      
      function signUp(username, password, firstname, lastname, email, success, error) {
        deviceIdService.getDeviceIdAsync(function(deviceId) {
          forge.request.ajax({
            url: getTargetServer() + "api/v1/mobile/signup",
            type: "POST",
            headers: {
              'Content-Type': 'application/json'
            },
            dataType: "json",
            data: {
              username: username,
              password: password,
              firstname: firstname,
              lastname: lastname,
              email: email,
              device_id: deviceId
            },
            success: function(guestModel, textStatus) {
              handleAuthSuccessResponse(guestModel, textStatus);
              if (success) success();
            },
            error: function(response) {
              // Credentials are set, but an error occured
              errorMessage = "Error accessing " + getTargetServer();
              try {
                errorMessage = response.content;
              } catch (e) {}
              error(errorMessage);
            }
          });
        });
      }
      
      function checkAuthOnWeb() {
        ajaxCheckAuth({
          success: handleAuthSuccessResponse,
          error: function(jqXHR, textStatus, stackTrace) {
            if (jqXHR.status === 401) {
              forge.logging.error("Error accessing " + getTargetServer() + "api/v1/guest (status.result is not \"OK\"): " + textStatus);
              if (forge.is.web()) {
                window.location = getTargetServer() + "mobile/signIn?r=" + env["loggedIn.redirect_uri"];
              } else {
                window.location = getTargetServer() + "mobile/signIn?r=fluxtream://mainmenu";
              }
            } else {
              forge.logging.error("Error accessing " + getTargetServer() + "api/v1/guest: " + textStatus);
              alert("Error accessing " + getTargetServer() + "\nError code: " + textStatus);
            }
          }
        });
      }
      
      function handleAuthSuccessResponse(guestModel, textStatus) {
        userPrefs.set('login.username', guestModel.username);
        userPrefs.set('login.userId', guestModel.id + "");
        userPrefs.set('login.fullname', guestModel.fullname);
        userPrefs.set('login.firstname', guestModel.firstname);
        userPrefs.set('login.lastname', guestModel.lastname);
        userPrefs.set('login.email', guestModel.email);
        userPrefs.set('login.fluxtream_access_token', guestModel.access_token + "");
        userPrefs.set('login.isAuthenticated', true);
        if (!userPrefs.get('login.photoURL')) userPrefs.set('login.photoURL', guestModel.photoURL);
        if (guestModel.photoURL) {
          imageCache.cacheImage(guestModel.photoURL, function(uri) {
            userPrefs.set('login.photoURL', uri);
          });
        }
        if (typeof (guestModel.username) !== "undefined") {
          if (typeof onSuccessFunction === 'function') onSuccessFunction();
        } else {
          forge.logging.error("Error accessing " + getTargetServer() + "api/v1/guest: " + textStatus);
          alert("Error accessing " + getTargetServer() + "\nError code: " + textStatus);
        }
        $rootScope.$broadcast('user-logged-in');
      }
      
      /**
       * (Public) Logs out the user
       */
      function logout() {
        userPrefs.set('login.isAuthenticated', false);
        userPrefs.set('login.userId', null);
        userPrefs.set('login.firstname', null);
        userPrefs.set('login.lastname', null);
        userPrefs.set('login.photoURL', null);
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
       * (Public) Returns user's full name
       */
      function getUserFullName() {
        return userPrefs.get('login.fullname');
      }
      
      /**
       * (Public) Returns user's first name
       */
      function getUserFirstname() {
        return userPrefs.get('login.firstname');
      }
      
      /**
       * (Public) Returns user's last name
       */
      function getUserLastname() {
        return userPrefs.get('login.lastname');
      }
      
      /**
       * (Public) Returns user's e-mail address
       */
      function getUserEmailAddress() {
        return userPrefs.get('login.email');
      }
      
      /**
       * (Public) Returns user's photo URL
       */
      function getUserPhotoURL() {
        return userPrefs.get('login.photoURL');
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
      
      /**
       * (Public) Returns the Fluxtream access token of the current user
       */
      function getAccessToken() {
        return userPrefs.get('login.fluxtream_access_token');
      }
      
      return {
        checkAuth: checkAuth,
        signIn: signIn,
        signUp: signUp,
        isAuthenticated: isAuthenticated,
        ajax: ajax,
        getUserName: getUserName,
        getUserFirstname: getUserFirstname,
        getUserLastname: getUserLastname,
        getUserFullName: getUserFullName,
        getUserEmailAddress: getUserEmailAddress,
        getUserPhotoURL: getUserPhotoURL,
        getUserId: getUserId,
        getAccessToken: getAccessToken,
        getTargetServer: getTargetServer,
        logout: logout
      };
      
    }
  ]);
  
});
