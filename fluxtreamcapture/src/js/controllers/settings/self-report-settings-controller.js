/**
 * Angular controller for the self report settings
 */
define([
  'config/env',
  'app-modules',
  'services/user-prefs-service',
], function(env, appModules) {
  
  // Self report settings controller
  appModules.controllers.controller('SelfReportSettingsController', [
    "$scope",
    'UserPrefsService',
    "LoginService",
    function($scope, userPrefs, loginService) {
      
      // Current settings options
      $scope.settings = {
        'enable_geolocation': userPrefs.getForUser('self-report.enable-geolocation', true),
        'enable_geolocation_warning': userPrefs.getForUser('self-report.enable-geolocation-warning', true)
      };
      
      /**
       * Saves the user prefs
       */
      $scope.save = function() {
        userPrefs.setForUser('self-report.enable-geolocation', $scope.settings.enable_geolocation);
        userPrefs.setForUser('self-report.enable-geolocation-warning', $scope.settings.enable_geolocation_warning);
      };
      
    }
  ]);
});
