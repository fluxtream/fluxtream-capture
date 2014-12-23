/**
 * Offers the functionalies for the user to log in to the fluxtream server (mobile only)
 */
define([
  'config/env',
  'app-modules',
  'services/user-prefs-service',
  'services/login-service'
], function(env, appModules) {
  
  appModules.controllers.controller('LoginController', ['$scope', 'LoginService', 'UserPrefsService', '$state',
    function($scope, loginService, userPrefs, $state) {
      
      if (forge.is.web()) {
        loginService.checkAuth("", "", function() {
          $state.go('listTopics');
        });
      }
      
      $scope.loading = false;
      $scope.currentScreen = 'home';
      
      // Current setting values
      $scope.signin = {
        username: "",
        password: "",
        target: ""
      };
      
      // Load initial settings
//      $scope.valuesToLoad = Object.keys($scope.settings).length;
      userPrefs.onReady(function() {
        $scope.signin.username = "dev";
        $scope.signin.password = "foobarfoobar";
        $scope.signin.target = "";
//        for (var settingName in $scope.settings) {
//          $scope.settings[settingName] = userPrefs.get("login." + settingName);
//        }
        $scope.$$phase || $scope.$apply();
      });
      
      // Save settings on change
//      $scope.save = function(settingName) {
//        // TODO don't save password
//        userPrefs.onReady(function() {
//          userPrefs.set('login.' + settingName, $scope.settings[settingName]);
//        });
//      };
      
      /**
       * [Called from button] Loads the sign in screen
       */
      $scope.selectSignIn = function() {
        $scope.currentScreen = "sign-in";
      };
      
      // Try logging in to fluxtream
      $scope.signIn = function() {
        forge.logging.info("Logging in...");
        if (($scope.signin.username || env['test.username']) && ($scope.signin.password || env['test.password'])) {
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
                  $state.go('listTopics');
                },
                // Error
                function(message) {
                  alert(message);
                }
              );
            },
            error: function(error) {
              forge.logging.info("Error while logging in");
              forge.logging.info(error);
              alert("An error has occurred");
            }
          });
        } else {
          alert("Please type in your username and password");
        }
      };
      
    }
    
  ]);
  
});
