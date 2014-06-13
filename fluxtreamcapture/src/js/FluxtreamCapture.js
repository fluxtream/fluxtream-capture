/**
 * This script bootstraps the fluxtream capture application
 */
define([
  "flxModules",
  "env",
  "routes",
  "fluxtream-communication",
  "controllers/controller-loader"
], function(flxModules, env, routes, flxCom) {
  
  // Get current page or set main page
  var initialRoute = window.location.hash;
  if (!initialRoute || initialRoute === "#/init") initialRoute = "#/makeObservation";
  
  // Initialization controller
  flxModules.flxControllers.controller('initController', ['FluxtreamCommunication', '$ionicViewService',
    function(flxCom, $ionicViewService) {
      flxCom.checkAuth(function() {
        // Load page
        window.location = initialRoute;
        // Clear navigation history to prevent going back to the initialization page
        $ionicViewService.clearHistory()
      });
    }
  ]);
  
  // Load initialization page
  window.location = "#/init";
  
  // Bootstrap document with fluxtream capture app
  angular.bootstrap(document, ['flxApp']);
  
});
