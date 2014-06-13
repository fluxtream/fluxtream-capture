/**
 * Angular controller for the main menu page
 */
define([
  'flxModules'
], function(flxModules) {
  // Main menu controller
  flxModules.flxControllers.controller('NavController', function($scope, $ionicSideMenuDelegate) {
    $scope.navigateTo = function(url) {
      window.location = url;
      $ionicSideMenuDelegate.toggleRight();
    };
  });
});
