/**
 * Angular controller for the main menu page
 */
define([
  'app-modules'
], function(appModules) {
  // Main menu controller
  appModules.controllers.controller('NavController', function($scope, $ionicSideMenuDelegate, $state) {
    $scope.navigateTo = function(route, params) {
      $state.go(route, params);
      $ionicSideMenuDelegate.toggleRight();
    };
  });
});
