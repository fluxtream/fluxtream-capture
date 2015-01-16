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
        forge.logging.info("Requesting full connector list");
        // Get installed
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/connectors/installed?access_token=" + loginService.getAccessToken(),
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(installedConnectors, code) {
            forge.logging.info("Installed connectors received");
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
                forge.logging.info("Uninstalled connectors received");
                // Mark connectors as uninstalled
                uninstalledConnectors.forEach(function(connector) {
                  connector.installed = false;
                });
                // Merge installed and uninstalled connectors
                var connectors = installedConnectors.concat(uninstalledConnectors);
                // Remove "FluxtreamCapture" and "Zeo" from list
                for (var i = 0; i < connectors.length; i++) {
                  if (connectors[i].connectorName == "fluxtream_capture" || connectors[i].connectorName == "zeo") {
                    connectors.splice(i, 1);
                    i--;
                  }
                }
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
                  forge.logging.info(connector.image);
                  imageCache.cacheImage(
                    connector.image,
                    function(uri) {
                      forge.logging.info("Success: " + uri);
                      connector.image = uri;
                      cacheConnectors(connectors);
                    },
                    function() { forge.logging.info("Error"); }
                  );
                });
              },
              error: function(content) {
                forge.logging.info("Error while fetching uninstalled connectors");
                forge.logging.info(content);
                error(content);
              }
            });
          },
          error: function(content) {
            forge.logging.info("Error while fetching installed connectors");
            forge.logging.info(content);
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
