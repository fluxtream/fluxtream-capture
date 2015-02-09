/**
 * Offers the functionalies for the user to log in to the fluxtream server (mobile only)
 */
define([
  'config/env',
  'app-modules',
  'services/user-prefs-service',
  'services/login-service',
  'services/push-notifications'
], function(env, appModules) {
  
  appModules.controllers.controller('LoginController', [
    '$scope',
    'LoginService',
    'UserPrefsService',
    '$state',
    'PushNotificationService',
    '$rootScope',
    function($scope, loginService, userPrefs, $state, pushNotifications, $rootScope) {
      
      if (forge.is.web()) {
        loginService.checkAuth("", "", function() {
          $state.go('listTopics');
        });
      }
      
      // Disable menu drag in login screen
      $rootScope.disableDragMenu = true;
      
      // If true, the page will be replaced with the loading icon
      $scope.loading = false;
      
      // Target default placeholder
      $scope.targetPlaceholder = env["fluxtream.home.url"].replace('http://', '').replace('https://', '');
      if ($scope.targetPlaceholder.slice("-1") == "/") $scope.targetPlaceholder = $scope.targetPlaceholder.substring(0, $scope.targetPlaceholder.length - 1);
      
      // The current screen being displayed
      $scope.currentScreen = 'loading';
      
      // The current error messages being displayed
      $scope.errorMessage = "";
      $scope.formErrorMessage = "";
      
      // Current setting values
      $scope.signin = {
        username: "",
        password: "",
        target: ""
      };
      
      // Current signing up values
      $scope.signup = {
        email: "",
        username: "",
        password: "",
        password2: "",
        firstname: "",
        lastname: "",
        target: ""
      };
      
      // Load initial settings
      userPrefs.onReady(function() {
        $scope.signin.username = userPrefs.get("login.username");
        $scope.signin.target = userPrefs.get("login.target");
        $scope.signup.target = userPrefs.get("login.target");
        $scope.currentScreen = 'home';
        $scope.$$phase || $scope.$apply();
      });
      
      /**
       * [Private] Updates the error message an refreshes the UI
       */
      $scope.setErrorMessage = function(errorMessage) {
        $scope.errorMessage = errorMessage;
        $scope.formErrorMessage = "";
        $scope.$$phase || $scope.$apply();
      };
      
      /**
       * [Private] Updates the form error message an refreshes the UI
       */
      $scope.setFormErrorMessage = function(errorMessage) {
        $scope.formErrorMessage = errorMessage;
        $scope.errorMessage = "";
        $scope.$$phase || $scope.$apply();
      };
      
      /**
       * [Private] Remove all error messages
       */
      $scope.clearErrorMessages = function() {
        $scope.formErrorMessage = "";
        $scope.errorMessage = "";
        $scope.$$phase || $scope.$apply();
      };
      
      /**
       * [Called from button] Loads the login home screen
       */
      $scope.backToHome = function() {
        $scope.clearErrorMessages();
        $scope.currentScreen = "home";
      };
      
      /**
       * [Called from button] Loads the sign in screen
       */
      $scope.selectSignIn = function() {
        $scope.clearErrorMessages();
        $scope.currentScreen = "sign-in";
      };
      
      /**
       * [Called from button] Loads the sign up screen
       */
      $scope.selectSignUp = function() {
        $scope.clearErrorMessages();
        $scope.currentScreen = "sign-up";
      };
      
      /**
       * [Called from button] Try logging in to fluxtream
       */
      $scope.signIn = function() {
        if (!$scope.signin.username) {
          $scope.setFormErrorMessage("Please enter your username");
          return;
        }
        if (!$scope.signin.password) {
          $scope.setFormErrorMessage("Please enter your password");
          return;
        }
        $scope.clearErrorMessages();
        // Save username and target to prefs
        userPrefs.onReady(function() {
          userPrefs.set('login.username', $scope.signin.username);
          userPrefs.set('login.target', $scope.signin.target);
        });
        // Check internet connection
        if (!forge.is.connection.connected()) {
          alert("You are offline. Please connect to the internet.");
          return;
        }
        // Sign in
        $scope.loading = true;
        $scope.$$phase || $scope.$apply();
        // Clear cookies
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "logout",
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function() {
            // Login
            loginService.signIn(
              // Username
              $scope.signin.username,
              // Password
              $scope.signin.password,
              // Success
              function() {
                // Tell the push notification service the user is logged in
                pushNotifications.authenticationDone();
                $state.go('listTopics');
              },
              // Error
              function(message) {
                forge.logging.error("Signing in with credentials failed: " + message);
                $scope.setFormErrorMessage(message);
                $scope.loading = false;
                $scope.$$phase || $scope.$apply();
              }
            );
          },
          error: function(error) {
            forge.logging.error("Error while logging in: " + JSON.stringify(error));
            alert("An error has occurred");
            $scope.loading = false;
            $scope.$$phase || $scope.$apply();
          }
        });
      };
      
      /**
       * [Called from button] Sign up using form
       */
      $scope.signUp = function() {
        // Save target to prefs
        userPrefs.set('login.target', $scope.signup.target);
        // Check user input data
        if (!$scope.signup.email) {
          $scope.setFormErrorMessage("Missing e-mail address");
        } else if (!$scope.signup.username) {
          $scope.setFormErrorMessage("Missing username");
        } else if (!$scope.signup.firstname) {
          $scope.setFormErrorMessage("Missing first name");
        } else if (!$scope.signup.lastname) {
          $scope.setFormErrorMessage("Missing last name");
        } else if (!$scope.signup.password) {
          $scope.setFormErrorMessage("Missing password");
        } else if ($scope.signup.password !== $scope.signup.password2) {
          $scope.setFormErrorMessage("Passwords don't match");
        } else {
          // Check internet connection
          if (!forge.is.connection.connected()) {
            alert("You are offline. Please connect to the internet.");
            return;
          }
          // Validation passed
          $scope.clearErrorMessages();
          $scope.loading = true;
          $scope.$$phase || $scope.$apply();
          // Clear cookies
          forge.request.ajax({
            type: "GET",
            url: loginService.getTargetServer() + "logout",
            headers: {
              'Content-Type': 'application/json'
            },
            dataType: "json",
            success: function() {
              // Login
              loginService.signUp(
                $scope.signup.username,
                $scope.signup.password,
                $scope.signup.firstname,
                $scope.signup.lastname,
                $scope.signup.email,
                // Success
                function() {
                  // Tell the push notification service the user is logged in
                  pushNotifications.authenticationDone();
                  $state.go('listTopics');
                },
                // Error
                function(errorMessage) {
                  // An error has occurred
                  forge.logging.error("Sign up failed: " + errorMessage);
                  // Set error message
                  if (!errorMessage) errorMessage = "An error occurred. Please try again.";
                  $scope.setFormErrorMessage(errorMessage);
                  $scope.loading = false;
                  $scope.$$phase || $scope.$apply();
                }
              );
            },
            error: function(error) {
              forge.logging.error("Error while logging in: " + JSON.stringify(error));
              $scope.setFormErrorMessage("An error has occurred");
            }
          });
        }
      };
      
    }
    
  ]);
  
});
