/**
 * Angular controller for the main menu page
 */
define([
  'flxModules'
], function(flxModules) {
  // Main menu controller
  flxModules.flxControllers.controller('NavController', function($scope, $ionicSideMenuDelegate, $state) {
    $scope.navigateTo = function(route, params) {
      $state.go(route, params);
      $ionicSideMenuDelegate.toggleRight();
    };
  });
});
