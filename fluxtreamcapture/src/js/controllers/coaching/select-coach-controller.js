/**
 * Controller for the coach selection screen
 */
define([
  'app-modules',
  'moment',
  'services/user-prefs-service',
  'services/coaching-communication'
], function(appModules, moment) {
  
  appModules.controllers.controller('selectCoachController', [
    '$scope',
    'CoachingCommunicationService',
    'UserPrefsService',
    '$ionicActionSheet',
    '$state',
    '$timeout',
    function($scope, coachingCom, userPrefs, $ionicActionSheet, $state, $timeout) {
      
      // List of available coaches
      $scope.coaches = [];
      
      // True until the coach list has been loaded
      $scope.loading = true;
      
      // True if the device is not connected
      $scope.isOffline = !forge.is.connection.connected();
      
      /**
       * [Called from page] Loads the page of a coach where the user can select/remove them as a coach
       */
      $scope.loadCoachDetails = function(coach) {
        $state.go("coachDetails", {coachUsername: coach.username});
      };
      
      /**
       * Loads the wall view filtered with the given coach
       */
      $scope.loadCoachMessaging = function(coach) {
        $state.go("coachMessaging", {coachUsername: coach.username});
      };
      
      /**
       * Loads the connector sharing page for a given coach
       */
      $scope.loadCoachConnectorSharing = function(coach) {
        $state.go("coachConnectorSharing", {from: "from-coach-list", coachUsername: coach.username});
      };
      
      /**
       * [Called from page] Remove a coach from the selected coaches
       */
      $scope.removeCoach = function(coach) {
        var hideActionSheet = $ionicActionSheet.show({
          destructiveText: 'Yes, Remove',
          titleText: 'Remove ' + coach.fullname + ' from your trusted buddies?',
          cancelText: 'Cancel',
          destructiveButtonClicked: function(index) {
            if (!forge.is.connection.connected()) {
              alert("You are offline. Please connect to the Internet to remove this buddy.");
              return true;
            }
            // Remove coach now
            coachingCom.removeCoach(coach.username,
              // Success
              function() {
                $scope.coaches.splice($scope.coaches.indexOf(coach), 1);
                $scope.$$phase || $scope.$apply();
              },
              // Error
              function() {
                alert("An error has occurred while removing " + coach.fullname + " from your trusted buddies.");
              }
            );
            return true;
          }
        });
      };
      
      // Initially load coach list
      $scope.getCoachListTimeout = null;
      $scope.getCoachList = function() {
        if (forge.is.connection.connected()) {
          $scope.isOffline = false;
          $scope.$$phase || $scope.$apply();
          coachingCom.getCoachList(
            // Success
            function(coachList) {
              $scope.coaches = coachList;
              $scope.loading = false;
              $scope.$$phase || $scope.$apply();
            },
            // Error
            function(content) {
              forge.logging.error("Error while fetching coach list:" + JSON.stringify(content));
              $scope.getCoachListTimeout = $timeout($scope.getCoachList, 1000);
            }
          );
        } else {
          $scope.isOffline = true;
          $scope.$$phase || $scope.$apply();
          $scope.getCoachListTimeout = $timeout($scope.getCoachList, 200);
        }
      };
      $scope.getCoachList();
      
      // Cancel timeout on destroy
      $scope.$on("$destroy", function() {
        $timeout.cancel($scope.getCoachListTimeout);
      });
      
    }
  ]);
  
});
