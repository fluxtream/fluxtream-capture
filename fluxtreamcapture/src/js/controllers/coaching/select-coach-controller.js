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
    function($scope, coachingCom, userPrefs, $ionicActionSheet, $state) {
      
      // List of available coaches
      $scope.coaches = [];
      
      // True until the coach list has been loaded
      $scope.loading = true;
      
      /**
       * [Called from page] Loads the page of a coach where the user can select/remove them as a coach
       */
      $scope.loadCoachDetails = function(coach) {
        forge.logging.info("Load coach details");
        $state.go("coachDetails", {coachUsername: coach.username});
      };
      
      /**
       * Loads the connector sharing page for a given coach
       */
      $scope.loadCoachConnectorSharing = function(coach) {
        forge.logging.info("Load coach connector sharing");
        $state.go("coachConnectorSharing", {from: "from-coach-list", coachUsername: coach.username});
      };
      
      /**
       * [Called from page] Selects a coach to be the user's coach
       */
      $scope.selectCoach = function(coach) {
        forge.logging.info("Selecting coach: " + coach.fullname);
        var hideActionSheet = $ionicActionSheet.show({
          buttons: [{text: 'Yes, Add'}],
          titleText: 'Do you want to add ' + coach.fullname + ' as a personal coach?',
          cancelText: 'Cancel',
          buttonClicked: function(index) {
            forge.logging.info("Add coach");
            coachingCom.addCoach(coach.username,
              // Success
              function() {
                forge.logging.info("Go to connector sharing screen");
                coach.isOwnCoach = true;
                $scope.loadCoachConnectorSharing(coach);
              },
              // Error
              function() {
                alert("An error has occurred while adding the coach");
                coach.isOwnCoach = false;
                $scope.$$phase || $scope.$apply();
              }
            );
            return true;
          }
        });
      };
      
      // Initially load coach list
      coachingCom.getCoachList(
        // Success
        function(coachList) {
          $scope.coaches = coachList;
          $scope.loading = false;
          $scope.$$phase || $scope.$apply();
        },
        // Error
        function(content) {
          forge.logging.info("Error while fetching coach list");
          forge.logging.info(content);
        }
      );
      
    }
  ]);
  
});
