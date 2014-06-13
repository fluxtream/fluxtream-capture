/**
 * Offers the functionalies for the user to log in to the fluxtream server (mobile only)
 */
define([
  'flxModules'
], function(flxModules) {
  
  flxModules.flxControllers.controller('loginController', ['$scope', 'FluxtreamCommunication',
    function($scope, flxCom) {
      
      // Current setting values
      $scope.settings = {
        username: "",
        password: "",
        target: "fluxtream.org" //env['fluxtream.home.url']
      };
      
      // Load initial settings
      $scope.valuesToLoad = Object.keys($scope.settings).length;
      $scope.loadSettingsValue = function(settingName) {
        forge.prefs.get('settings.' + settingName,
          // Success
          function(value) {
            if (value) {
              $scope.settings[settingName] = value;
            }
            $scope.valuesToLoad--;
            $scope.$$phase || $scope.$apply();
          },
          // Error
          function(content) {
            forge.logging.error("An error occurred while loading a setting: " + content);
            $scope.error = true;
            $scope.$$phase || $scope.$apply();
          }
        );
      };
      for (var settingName in $scope.settings) {
        $scope.loadSettingsValue(settingName);
      }
      
      // Save settings on change
      $scope.save = function(settingName) {
        forge.prefs.set('settings.' + settingName, $scope.settings[settingName],
          // Success
          function() {
            // Setting saved to user prefs
          },
          // Error
          function(content) {
            forge.logging.error("Error while persisting settings." + settingName + ": " + content);
            $scope.error = true;
            $scope.$apply();
          }
        );
      };
      
      // Try logging in to fluxtream
      $scope.login = function() {
        forge.logging.debug("Logging in...");
        flxCom.checkAuth(function() {
          window.location = "#/makeObservation";
        });
      };
      
    }
    
  ]);
  
});
