/**
 * Controller for the coach selection screen
 */
define([
  'app-modules',
  'moment',
  'services/user-prefs-service',
  'services/coaching-communication'
], function(appModules, moment) {
  
  appModules.controllers.controller('findCoachController', [
    '$scope',
    'CoachingCommunicationService',
    'UserPrefsService',
    '$ionicActionSheet',
    '$state',
    function($scope, coachingCom, userPrefs, $ionicActionSheet, $state) {
      
      // List of available coaches
      $scope.coaches = [];
      
      // True while loading the coach list
      $scope.loading = false;
      
      // An error message to display (e.g. "Not found")
      $scope.errorMessage = "";
      
      // The search input string
      $scope.input = {
        searchString: ""
      };
      
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
       * [Called from page] Start searching for coaches using the input search string
       */
      $scope.searchCoach = function() {
        var searchString = $scope.input.searchString;
        $scope.errorMessage = false;
        $scope.loading = true;
        $scope.$$phase || $scope.$apply();
        coachingCom.findCoach(searchString,
          // Success
          function(coach) {
            $scope.loading = false;
            if (coach) {
              $scope.errorMessage = "";
              $scope.coaches = [coach];
            } else {
              $scope.errorMessage = searchString + " not found"
              $scope.coaches = [];
            }
            $scope.$$phase || $scope.$apply();
          },
          // Error
          function(errorMessage) {
            $scope.loading = false;
            $scope.errorMessage = errorMessage || "No error message";
            $scope.coaches = [];
            $scope.$$phase || $scope.$apply();
          }
        );
      };
      
      $scope.onSearchStringChange = function() {
        $scope.errorMessage = "";
        $scope.$$phase || $scope.$apply();
      },
      
      /**
       * [Called from page] Selects a coach to be the user's coach
       */
      $scope.addCoach = function(coach) {
        forge.logging.info("Selecting coach: " + coach.fullname);
        var hideActionSheet = $ionicActionSheet.show({
          buttons: [{text: 'Yes, Add'}],
          titleText: 'Do you want to add ' + coach.fullname + ' to your trusted buddies?',
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
                alert("An error has occurred while adding the buddy");
                coach.isOwnCoach = false;
                $scope.$$phase || $scope.$apply();
              }
            );
            return true;
          }
        });
      };
      
    }
  ]);
  
});