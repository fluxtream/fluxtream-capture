/**
 * Angular controller for the navigation menu
 */
define([
  'config/env',
  'app-modules',
  'services/login-service',
  'services/user-prefs-service'
], function(env, appModules) {
  
  appModules.controllers.controller('NavController', [
    '$scope',
    '$ionicSideMenuDelegate',
    '$state',
    'LoginService',
    '$rootScope',
    'UserPrefsService',
    '$ionicModal',
    '$ionicSlideBoxDelegate',
    function($scope, $ionicSideMenuDelegate, $state, loginService, $rootScope, userPrefs, $ionicModal, $ionicSlideBoxDelegate) {
      
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
//                if (confirm("Leave this app?")) closeMe();
              }
            }
          }
        );
      }
      
      // Tutorial modal
      $scope.showTutorial = function() {
        // Compute window height needed by modal
        $scope.modalHeight = $(window).height();
        // Initialize modal
        $ionicModal.fromTemplateUrl('tutorial-modal', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.modal = modal;
          $scope.modal.show();
        });
        // Cleanup the modal when we're done with it
        $scope.$on('$destroy', function() {
          $scope.modal.remove();
        });
        // Hides the tutorial modal and disable the tutorial
        $scope.dismissTutorialModal = function() {
          $scope.modal.hide();
          // Disable tutorial for the next times
          userPrefs.set('user.' + loginService.getUserId() + '.tutorial-shown', true);
        };
        // Shows the next tutorial page
        $scope.tutorialNext = function() {
          $ionicSlideBoxDelegate.next();
        };
      };
      
      // Show tutorial automatically when a new user logs in
      $scope.$on("user-logged-in", function() {
        if (env['show_tutorial']) {
          if (!userPrefs.get('user.' + loginService.getUserId() + '.tutorial-shown' , false)) {
            $scope.showTutorial();
          }
        } else {
          // Tutorial disabled, remove menu item
          $(".tutorial-menu-item").remove();
        }
      });
      
    }
  ]);
  
});
