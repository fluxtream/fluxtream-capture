/**
 * Controller for connector settings
 */
define([
  'app-modules',
  'config/env',
  'services/user-prefs-service',
  'services/connectors-communication',
  'services/login-service'
], function(appModules, env) {
  
  appModules.controllers.controller('settingsConnectorsController', [
    '$scope',
    'ConnectorsCommunicationService',
    'UserPrefsService',
    'LoginService',
    '$ionicActionSheet',
    '$state',
    '$timeout',
    function($scope, connectorsCom, userPrefs, loginService, $ionicActionSheet, $state, $timeout) {
      
      // List of connectors
      $scope.connectors = [];
      
      // True while a request to load the connector list is active or pending
      $scope.polling = false;
      
      // URL of the server from which the images will be fetched
      $scope.imageOriginURL = env['fluxtream.home.url'];
      
      // Cancellable timeout for refresh list
      $scope.updateConnectorListTimeout = null;
      $scope.$on("$destroy", function() {
        $timeout.cancel($scope.updateConnectorListTimeout);
      });
      
      /**
       * Requests the list of connectors, and continue polling while a connector is synchronizing
       */
      $scope.updateConnectorList = function() {
        $timeout.cancel($scope.updateConnectorListTimeout);
        $scope.polling = true;
        connectorsCom.getFullConnectorList(
          // Success
          function(connectors) {
            // Update connector list
            $scope.connectors = connectors;
            $scope.$$phase || $scope.$apply();
            // Check if a connector is synchronizing
            var connectorSynchronizing = false;
            connectors.forEach(function(connector) {
              if (connector.syncing) {
                connectorSynchronizing = true;
              }
            });
            if (connectorSynchronizing) {
              // A connector is synchronizing, poll again in 3 seconds
              $scope.updateConnectorListTimeout = $timeout($scope.updateConnectorList, 3000);
            } else {
              // No more connector is synchronizing, stop polling
              $scope.polling = false;
            }
            // Reapply to make sure UI is completely refreshed (to prevent images from not reloading)
            $timeout(function() { $scope.$$phase || $scope.$apply(); }, 1);
          },
          // Error
          function() {
            if (!$scope.connectors.length) {
              alert('Could not get connector list');
              $state.go('settings');
            } else {
              $scope.updateConnectorListTimeout = $timeout($scope.updateConnectorList, 3000);
            }
          }
        );
      };
      
      // Load cached connectors
      $scope.connectors = connectorsCom.getCachedConnectors();
      
      // Initially load connector list
      $scope.updateConnectorList();
      
      /**
       * [Called from page] Installs an uninstalled connector
       */
      $scope.installConnector = function(connector) {
        if (connector.loading) return;
        if (connector.installed) return;
        if (!connector.installable) return;
        if (!forge.is.connection.connected()) {
          alert("You must be online to install a connector.");
          return;
        }
        // Show confirmation action sheet
        var hideActionSheet = $ionicActionSheet.show({
          buttons: [ {text: 'Yes, Install'} ],
          titleText: 'Do you want to install the ' + connector.name + ' connector',
          cancelText: 'Cancel',
          buttonClicked: function(index) {
            // Remove connector now
            connector.loading = true;
            $scope.$$phase || $scope.$apply();
            // Load modal view to authorize connector
            forge.tabs.openWithOptions(
              {
                url: loginService.getTargetServer() + "proxy/connectors/add/" + connector.connectorName,
                pattern: "*://*/proxy/connectors/added*",
                buttonText: "Cancel",
                title: "Connect device"
              },
              // Success
              function() {
                $scope.updateConnectorList();
              },
              // Error
              function(content) {
                forge.logging.error("Error while opening tab: " + JSON.stringify(content));
                $scope.updateConnectorList();
              }
            );
            return true;
          }
        });
      };
      
      /**
       * [Call from page] Uninstalls an installed connector
       */
      $scope.uninstallConnector = function(connector) {
        if (connector.loading) return;
        if (!connector.installed) return;
        if (!forge.is.connection.connected()) {
          alert("You must be online to uninstall a connector.");
          return;
        }
        // Show confirmation action sheet
        var hideActionSheet = $ionicActionSheet.show({
          destructiveText: 'Yes, Uninstall',
          titleText: 'Do you want to uninstall your ' + connector.name + ' connector',
          cancelText: 'Cancel',
          destructiveButtonClicked: function(index) {
            // Remove connector now
            connector.loading = true;
            $scope.$$phase || $scope.$apply();
            // TODO call server API to uninstall connector
            setTimeout(function() { // TODO Remove this timeout that simulates an API call
              connector.loading = false;
              connector.installed = false;
              $scope.$$phase || $scope.$apply();
            }, 2000);
            return true;
          }
        });
      };
      
      /**
       * [Called from page] Forces the re-synchronization of a connector
       */
      $scope.synchronizeNow = function(connector) {
        if (!connector.installed) return;
        if (connector.syncing) return;
        if (!forge.is.connection.connected()) {
          alert("You must be online to synchronize a connector.");
          return;
        }
        // Display connector as synchronizing
        connector.syncing = true;
        $scope.$$phase || $scope.$apply();
        // Synchronize
        connectorsCom.synchronizeNow(connector.connectorName,
          // Success
          function() {
            if (!$scope.polling) {
              $scope.updateConnectorList();
            }
          },
          // Error
          function(error) {
            forge.logging.error("Synchronization launch failed: " + JSON.stringify(error));
            connector.syncing = false;
            $scope.$$phase || $scope.$apply();
          }
        );
      };
      
    }
  ]);
  
});
