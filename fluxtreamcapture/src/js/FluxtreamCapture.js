/**
 * This script bootstraps the fluxtream capture application
 */
define([
  "flxModules",
  "env",
  "routes",
  "fluxtream-communication",
  "controllers/controller-loader",
  "photo-list"
], function(flxModules, env, routes, flxCom) {
  
  // Get current page or set main page
  var initialRoute = window.location.hash;
  if (!initialRoute || initialRoute === "#/init") initialRoute = "#/makeObservation";
  
  // Initialization controller
  flxModules.flxControllers.controller('initController', ['FluxtreamCommunication', '$ionicViewService', '$state', 'PhotoListService' /* preloading photos */,
    function(flxCom, $ionicViewService, $state) {
      flxCom.checkAuth(function() {
        // Load page
        $state.go("listTopics");
        window.location = initialRoute;
        // Clear navigation history to prevent going back to the initialization page
        $ionicViewService.clearHistory();
        // Hide launch screen
        if (!forge.is.web()) {
          forge.launchimage.hide();
        }
      });
    }
  ]);
  
  // Configuration
  flxModules.flxApp.config(['$compileProvider', function($compileProvider) {
    // Allow image sources starting with "content://"
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|content):/);
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|content):/);
  }]);
  
  // Load initialization page
  window.location = "#/init";
  
  // Bootstrap document with fluxtream capture app
  angular.bootstrap(document, ['flxApp']);
  
});
