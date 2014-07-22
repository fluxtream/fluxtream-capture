/**
 * Offers the functionalies for the user to log in to the fluxtream server (mobile only)
 */
define([
  'flxModules',
  'storage',
  'fluxtream-communication'
], function(flxModules) {
  
  flxModules.flxControllers.controller('loginController', ['$scope', 'FluxtreamCommunication', 'StorageService',
    function($scope, flxCom, storage) {
      
      // Current setting values
      $scope.settings = {
        username: "",
        password: "",
        target: "fluxtream.org" //env['fluxtream.home.url']
      };
      
      // Load initial settings
      $scope.valuesToLoad = Object.keys($scope.settings).length;
      storage.onReady(function() {
        for (var settingName in $scope.settings) {
          $scope.settings[settingName] = storage.get("settings." + settingName);
        }
        $scope.$$phase || $scope.$apply();
      });
      
      // Save settings on change
      $scope.save = function(settingName) {
        storage.onReady(function() {
          storage.set('settings.' + settingName, $scope.settings[settingName]);
        });
      };
      
      // Try logging in to fluxtream
      $scope.login = function() {
        forge.logging.debug("Logging in...");
        flxCom.checkAuth(function() {
          $state.go('listTopics');
        });
      };
      
    }
    
  ]);
  
});
