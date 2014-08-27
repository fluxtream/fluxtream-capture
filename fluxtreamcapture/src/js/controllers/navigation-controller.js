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
    
    // Enable back button navigation on Android
    if (forge.is.android()) {
      // Add listener to go back when the back button is pressed
      forge.event.backPressed.addListener(
        function(closeMe) {
          if ($ionicSideMenuDelegate.isOpen()) {
            // The menu is open, close it
            $ionicSideMenuDelegate.toggleLeft(false);
            $ionicSideMenuDelegate.toggleRight(false);
          } else {
            // The menu is closed
            if ($("ion-nav-bar a").length) {
              // There is a back button, click it
              $("ion-nav-bar a").each(function() {
                angular.element($(this)).triggerHandler('click');
              });
            } else {
              // There is no back button, quit the app
              closeMe();
            }
          }
        }
      );
    }
    
  });
});
