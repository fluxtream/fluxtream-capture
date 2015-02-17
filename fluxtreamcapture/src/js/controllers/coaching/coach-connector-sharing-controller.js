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
    '$state',
    '$timeout',
    function($scope, $stateParams, coachingCom, userPrefs, $state, $timeout) {
      
      // List of connectors
      $scope.connectors = [];
      
      // The coach data
      $scope.coach = coachingCom.getCoachByUsername($stateParams.coachUsername);
      
      // Name of the coach
      $scope.coachName = $scope.coach ? $scope.coach.fullname : "";
      
      // True while the list is being loaded
      $scope.loading = true;
      
      $scope.isOffline = !forge.is.connection.connected();
      
      // Back link
      $scope.backLink = $stateParams.from === 'from-coach-list' ? "selectCoach" : "coachDetails";
      $scope.backLinkParams = $stateParams.from === 'from-coach-list' ? {} : {coachUsername: $stateParams.coachUsername};
      
      // Fetch connector list
      $scope.getConnectorsTimeout = null;
      $scope.getConnectors = function() {
        if (forge.is.connection.connected()) {
          $scope.isOffline = false;
          $scope.$$phase || $scope.$apply();
          coachingCom.getConnectors($stateParams.coachUsername,
            // Success
            function(connectors) {
              connectors.forEach(function(connector) {
                if (connector.connectorName == "fluxtream_capture") {
                  connector.prettyName = "Fluxtream Capture (this app)";
                }
              });
              $scope.connectors = connectors;
              $scope.loading = false;
              $scope.$$phase || $scope.$apply();
            },
            // Error
            function() {
              $scope.getConnectorsTimeout = $timeout($scope.getConnectors, 1000);
            }
          );
        } else {
          $scope.isOffline = true;
          $scope.$$phase || $scope.$apply();
          $scope.getConnectorsTimeout = $timeout($scope.getConnectors, 200);
        }
      }
      $scope.getConnectors();
      
      // Cancel timeout on destroy
      $scope.$on("$destroy", function() {
        $timeout.cancel($scope.getConnectorsTimeout);
      });
      
      // Fetch coach data if missing
      if (!$scope.coach) {
        coachingCom.getCoachList(
          // Success
          function() {
            $scope.coach = coachingCom.getCoachByUsername($stateParams.coachUsername);
            if ($scope.coach) {
              $scope.coachName = $scope.coach.fullname;
              $scope.$$phase || $scope.$apply();
            } else {
              alert("An error has occurred");
              $state.go('selectCoach');
            }
          },
          // Error
          function() {
            alert("An error has occurred");
            $state.go('selectCoach');
          }
        );
      }
      
      /**
       * [Called from page] Toggles the sharing state of a connector
       */
      $scope.toggleConnector = function(connector) {
        if (!forge.is.connection.connected()) {
          alert("You are offline. Please connect to the Internet to " + (connector.shared ? "unshare" : "share") + " data.");
          return;
        }
        connector.updating = true;
        $scope.$$phase || $scope.$apply();
        if (!connector.shared) {
          coachingCom.shareConnectorWithCoach($stateParams.coachUsername, connector.connectorName,
            // Success
            function() {
              connector.shared = true;
              connector.updating = false;
              $scope.$$phase || $scope.$apply();
            },
            // Error
            function() {
              alert(forge.is.connection.connected() ? "Network error. Please try again." : "You are offline. Please connect to the Internet to share data.");
              connector.updating = false;
              $scope.$$phase || $scope.$apply();
            }
          );
        } else {
          coachingCom.unshareConnectorWithcoach($stateParams.coachUsername, connector.connectorName,
            // Success
            function() {
              connector.shared = false;
              connector.updating = false;
              $scope.$$phase || $scope.$apply();
            },
            // Error
            function() {
              alert(forge.is.connection.connected() ? "Network error. Please try again." : "You are offline. Please connect to the Internet to unshare data.");
              connector.updating = false;
              $scope.$$phase || $scope.$apply();
            }
          );
        }
      };
      
    }
  ]);
  
});
