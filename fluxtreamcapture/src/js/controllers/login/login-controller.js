/**
 * Offers the functionalies for the user to log in to the fluxtream server (mobile only)
 */
define([
  'app-modules',
  'services/user-prefs-service',
  'services/login-service'
], function(appModules) {
  
  appModules.controllers.controller('loginController', ['$scope', 'LoginService', 'UserPrefsService', '$state',
    function($scope, loginService, userPrefs, $state) {
      
      // Current setting values
      $scope.settings = {
        username: "",
        password: "",
        target: "fluxtream.org" //env['fluxtream.home.url']
      };
      
      // Load initial settings
      $scope.valuesToLoad = Object.keys($scope.settings).length;
      userPrefs.onReady(function() {
        for (var settingName in $scope.settings) {
          $scope.settings[settingName] = userPrefs.get("settings." + settingName);
        }
        $scope.$$phase || $scope.$apply();
      });
      
      // Save settings on change
      $scope.save = function(settingName) {
        userPrefs.onReady(function() {
          userPrefs.set('settings.' + settingName, $scope.settings[settingName]);
        });
      };
      
      // Try logging in to fluxtream
      $scope.login = function() {
        forge.logging.debug("Logging in...");
        loginService.checkAuth(function() {
          $state.go('listTopics');
        });
      };
      
    }
    
  ]);
  
});
