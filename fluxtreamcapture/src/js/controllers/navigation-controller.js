/**
 * Angular controller for the navigation menu
 */
define([
  'app-modules',
  'services/login-service'
], function(appModules) {
  
  appModules.controllers.controller('NavController', [
    '$scope',
    '$ionicSideMenuDelegate',
    '$state',
    'LoginService',
    '$rootScope',
    function($scope, $ionicSideMenuDelegate, $state, loginService, $rootScope) {
      
      $scope.navigateTo = function(route, params) {
        $state.go(route, params);
        $ionicSideMenuDelegate.toggleRight();
      };
      
      $scope.logout = function() {
        loginService.logout();
        $ionicSideMenuDelegate.toggleRight();
      };
      
      $scope.isWeb = forge.is.web();
      
      // Name of the user
      $scope.userName = "";
      
      $rootScope.$on('user-logged-in', function() {
        $scope.userName = loginService.getUserFullName();
      });
      
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
      
    }
  ]);
  
});
