/**
 * This service manages wall/messaging communication with the server
 */
define([
  'app-modules',
  'config/env',
  'services/user-prefs-service',
  'services/image-cache'
], function(appModules, env) {
  
  appModules.services.factory('ConnectorsCommunicationService', [
    "UserPrefsService",
    "ImageCacheService",
    "LoginService",
    function(userPrefs, imageCache, loginService) {
      
      /**
       * Cache the list of connectors for offline use
       */
      function cacheConnectors(connectors) {
        userPrefs.set("connectors." + userPrefs.get('login.userId') + ".cache", JSON.stringify(connectors));
      }
      
      /**
       * Returns the cached list of connectors
       */
      function getCachedConnectors() {
        var connectors = userPrefs.get("connectors." + userPrefs.get('login.userId') + ".cache");
        if (connectors) return JSON.parse(connectors);
        return [];
      }
      
      /**
       * Fetches the list of connectors, both installed and uninstalled
       */
      function getFullConnectorList(success, error) {
        // Get installed
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/connectors/installed?access_token=" + loginService.getAccessToken(),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(installedConnectors, code) {
            // Mark connectors as installed
            installedConnectors.forEach(function(connector) {
              connector.installed = true;
            });
            // Get uninstalled
            forge.request.ajax({
              type: "GET",
              url: loginService.getTargetServer() + "api/v1/connectors/uninstalled?access_token=" + loginService.getAccessToken(),
              headers: {
                'Content-Type': 'application/json'
              },
              dataType: "json",
              success: function(uninstalledConnectors, code) {
                // Mark connectors as uninstalled
                uninstalledConnectors.forEach(function(connector) {
                  connector.installed = false;
                });
                // Merge installed and uninstalled connectors
                var connectors = installedConnectors.concat(uninstalledConnectors);
                // Remove "FluxtreamCapture", "Zeo", "Mymee" and "QuantifiedMind" from list
                for (var i = 0; i < connectors.length; i++) {
                  if (connectors[i].connectorName == "fluxtream_capture" || connectors[i].connectorName == "zeo"
                          || connectors[i].connectorName == "mymee" || connectors[i].connectorName == "quantifiedmind") {
                    connectors.splice(i, 1);
                    i--;
                  }
                }
                // Set as installable/uninstallable (Beddit is not installable)
                connectors.forEach(function(connector) {
                  connector.installable = connector.connectorName != "beddit";
                });
                // Sort connectors by name
                connectors.sort(function(a, b) {
                  return (a.name < b.name) ? -1 : (a.name === b.name) ? 0 : 1;
                });
                // Convert images to Fluxtream domain
                connectors.forEach(function(connector) {
                  connector.image = env['fluxtream.home.url'] + connector.image.substring(connector.image.indexOf('images/'))
                });
                // Cache connectors
                cacheConnectors(connectors);
                // Return connector list
                success(connectors);
                // Cache images
                connectors.forEach(function(connector) {
                  imageCache.cacheImage(
                    connector.image,
                    function(uri) {
                      connector.image = uri;
                      cacheConnectors(connectors);
                    },
                    function() {}
                  );
                });
              },
              error: function(content) {
                forge.logging.error("Error while fetching uninstalled connectors: " + JSON.stringify(content));
                error(content);
              }
            });
          },
          error: function(content) {
            forge.logging.error("Error while fetching installed connectors: " + JSON.stringify(content));
            error(content);
          }
        });
      }
      
      /**
       * Forces the resynchronization of a connector
       */
      function synchronizeNow(connectorName, success, error) {
        forge.request.ajax({
          type: "POST",
          url: loginService.getTargetServer() + "api/v1/sync/" + connectorName,
          timeout: 10000,
          data: {
            access_token: loginService.getAccessToken()
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: success,
          error: error
        });
      }
      
      // Public API
      return {
        getFullConnectorList: getFullConnectorList,
        getCachedConnectors: getCachedConnectors,
        synchronizeNow: synchronizeNow
      };
      
    }
  ]);
  
});
