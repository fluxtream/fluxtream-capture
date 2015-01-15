/**
 * Controller for the coach connector sharing screen
 */
define([
  'app-modules',
  'moment',
  'services/user-prefs-service',
  'services/coaching-communication'
], function(appModules, moment) {
  
  appModules.controllers.controller('coachConnectorSharingController', [
    '$scope',
    '$stateParams',
    'CoachingCommunicationService',
    'UserPrefsService',
    function($scope, $stateParams, coachingCom, userPrefs) {
      
      // List of connectors
      $scope.connectors = [];
      
      // The coach data
      $scope.coach = coachingCom.getCoachByUsername($stateParams.coachUsername);
      
      // Name of the coach
      $scope.coachName = $scope.coach.fullname;
      
      // True while the list is being loaded
      $scope.loading = true;
      
      // Back link
      $scope.backLink = $stateParams.from === 'from-coach-list' ? "selectCoach" : "coachDetails";
      $scope.backLinkParams = $stateParams.from === 'from-coach-list' ? {} : {coachUsername: $stateParams.coachUsername};
      
      // Fetch connector list
      coachingCom.getConnectors($stateParams.coachUsername,
        // Success
        function(connectors) {
          connectors.forEach(function(connector) {
            if (connector.connectorName == "fluxtream_capture") {
              connector.prettyName = "Data gathered by this app";
            }
          });
          $scope.connectors = connectors;
          $scope.loading = false;
          $scope.$$phase || $scope.$apply();
        },
        // Error
        function() {
          
        }
      );
      
      /**
       * [Called from page] Toggles the sharing state of a connector
       */
      $scope.toggleConnector = function(connector) {
        forge.logging.info("Toggling connector: " + connector.connectorName);
        connector.updating = true;
        $scope.$$phase || $scope.$apply();
        if (!connector.shared) {
          forge.logging.info("Connector is currently unshared, share it");
          forge.logging.info(typeof coachingCom);
          coachingCom.shareConnectorWithCoach($stateParams.coachUsername, connector.connectorName,
            // Success
            function() {
              connector.shared = true;
              connector.updating = false;
              $scope.$$phase || $scope.$apply();
            },
            // Error
            function() {
              alert("Network error. Please try again.")
            }
          );
        } else {
          forge.logging.info("Connector is currently shared, unshare it");
          coachingCom.unshareConnectorWithcoach($stateParams.coachUsername, connector.connectorName,
            // Success
            function() {
              connector.shared = false;
              connector.updating = false;
              $scope.$$phase || $scope.$apply();
            },
            // Error
            function() {
              alert("Network error. Please try again.")
            }
          );
        }
      };
      
    }
  ]);
  
});
