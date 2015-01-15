/**
 * Controller for the coach connector sharing screen
 */
define([
  'app-modules',
  'moment',
  'services/user-prefs-service',
  'services/coaching-communication'
], function(appModules, moment) {
  
  appModules.controllers.controller('coachDetailsController', [
    '$scope',
    '$stateParams',
    'CoachingCommunicationService',
    'UserPrefsService',
    '$ionicActionSheet',
    '$state',
    function($scope, $stateParams, coachingCom, userPrefs, $ionicActionSheet, $state) {
      
      // The coach data
      $scope.coach = coachingCom.getCoachByUsername($stateParams.coachUsername);
      
      // Name of the coach
      $scope.coachName = $scope.coach.fullname;
      
      /**
       * Loads the connector sharing page for a given coach
       */
      $scope.loadCoachConnectorSharing = function() {
        forge.logging.info("Load coach connector sharing");
        $state.go("coachConnectorSharing", {from: "from-details", coachUsername: $stateParams.coachUsername});
      };
      
      /**
       * [Called from page] Remove a coach from the selected coaches
       */
      $scope.removeCoach = function() {
        forge.logging.info("Show remove coach action sheet");
        var hideActionSheet = $ionicActionSheet.show({
          destructiveText: 'Yes, Remove',
          titleText: 'Do you want to remove ' + $scope.coach.fullname + ' from your coaches?',
          cancelText: 'Cancel',
          destructiveButtonClicked: function(index) {
            // Remove coach now
            coachingCom.removeCoach($scope.coach.username,
              // Success
              function() {
                $state.go("selectCoach");
              },
              // Error
              function() {
                alert("An error has occurred while removing the coach");
              }
            );
            return true;
          }
        });
      };
      
      /**
       * [Called from page] Selects the coach to be one of the user's coaches
       */
      $scope.selectCoach = function() {
        forge.logging.info("Selecting coach: " + $scope.coach.fullname);
        var hideActionSheet = $ionicActionSheet.show({
          buttons: [{text: 'Yes, Add'}],
          titleText: 'Do you want to add ' + $scope.coach.fullname + ' as a personal coach?',
          cancelText: 'Cancel',
          buttonClicked: function(index) {
            coachingCom.addCoach($scope.coach.username,
              // Success
              function() {
                forge.logging.info("Go to connector sharing screen");
                $scope.coach.isOwnCoach = true;
                $scope.loadCoachConnectorSharing();
              },
              // Error
              function() {
                alert("An error has occurred while adding the coach");
              }
            );
            return true;
          }
        });
      };
      
    }
  ]);
  
});
