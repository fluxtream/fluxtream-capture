/**
 * Angular controller for the main menu page
 */
define([
  'FluxtreamCapture'
], function(FluxtreamCapture) {
  // Main menu controller
  FluxtreamCapture.app.controller('NavController', function($scope, $ionicSideMenuDelegate) {
    $scope.navigateTo = function(url) {
      window.location = url;
      $ionicSideMenuDelegate.toggleRight();
    };
  });
});
