/**
 * Angular controller for the configuration page
 */
define([
  'controllers/controller-module'
], function(controllers) {
  // Config controller
  controllers.controller('SettingsController', function($scope) {
    
    // Current settings values
    $scope.settings = {
      username: "",
      password: "",
      target: "fluxtream.org",
      pictures_portrait: false, // 90°
      pictures_upside_down: false, // 270°
      pictures_landscape_left: false, // 180°
      pictures_landscape_right: false // 0°
    };
    
    // Becomes true if an error occurs while loading the settings and the page should not be displayed
    $scope.error = false;
    
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
          forge.logging.info("An error occurred while loading a setting: " + content);
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
          forge.logging.info("Error while persisting " + settingName + ": " + content);
          $scope.error = true;
          $scope.$apply();
        }
      );
    };
  });
});
