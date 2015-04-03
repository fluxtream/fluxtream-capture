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
  
  appModules.controllers.controller('IdentityController', [
    '$scope',
    'LoginService',
    function($scope, loginService) {
      
      $scope.firstname = loginService.getUserFirstname();
      $scope.lastname = loginService.getUserLastname();
      $scope.username = loginService.getUserName();
      $scope.photoURL = loginService.getUserPhotoURL();
      
    }
    
  ]);
  
});
