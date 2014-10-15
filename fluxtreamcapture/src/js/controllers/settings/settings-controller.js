/**
 * Angular controller for the settings page
 */
define([
  'app-modules',
], function(appModules) {
  
  // Settings controller
  appModules.controllers.controller('SettingsController', function($scope, $state) {
    
    // Whether the app is in web mode or mobile mode
    $scope.isWeb = forge.is.web();
    
  });
  
});
