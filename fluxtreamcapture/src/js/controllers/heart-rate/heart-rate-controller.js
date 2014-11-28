/**
 * Angular controller for the heart rate screen
 */
define([
  'config/env',
  'app-modules',
  'services/heart-rate-service'
], function(env, appModules) {
  
  // Heart rate controller
  appModules.controllers.controller('HeartRateController', [
    "$scope",
    '$rootScope',
    'UserPrefsService',
    'HeartRateService',
    function($scope, $rootScope, userPrefs) {
      
      // No heart rate on web
      if (forge.is.web()) return;
      
      // Current heart rate value
      $scope.heartRate = 0;
      $scope.rr = 0;
      
      // Listen to broadcasted heart-rate data
      $rootScope.$on("heart-rate-data-received", function(event, data) {
        // Update displayed heart rate
        $scope.heartRate = data.heart_rate;
        $scope.rr = data.rr;
        $scope.$$phase || $scope.$apply();
      });
      
    }
  ]);
  
});
