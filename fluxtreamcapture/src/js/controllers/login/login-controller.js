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
        loginService.checkAuth(function() {
          $state.go('listTopics');
        });
      }
      
      // Current setting values
      $scope.settings = {
        username: "",
        password: "",
        target: ""
      };
      
      // Load initial settings
      $scope.valuesToLoad = Object.keys($scope.settings).length;
      userPrefs.onReady(function() {
        for (var settingName in $scope.settings) {
          $scope.settings[settingName] = userPrefs.get("login." + settingName);
        }
        $scope.$$phase || $scope.$apply();
      });
      
      // Save settings on change
      $scope.save = function(settingName) {
        userPrefs.onReady(function() {
          userPrefs.set('login.' + settingName, $scope.settings[settingName]);
        });
      };
      
      // Try logging in to fluxtream
      $scope.login = function() {
        forge.logging.info("Logging in...");
        if (($scope.settings.username || env['test.username']) && ($scope.settings.password || env['test.password'])) {
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
              loginService.checkAuth(function() {
                $state.go('listTopics');
              })
            },
            error: function() {
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
