/**
 * Defines all the routes of the Fluxtream Capture app
 */
define([
  'flxModules'
], function(flxModules) {
  flxModules.flxApp.config(function($stateProvider, $urlRouterProvider) {
    // Routing
    $stateProvider
      .state('init', {
        url: "/init",
        templateUrl: "html/templates/init.html",
        controller: "initController"
      })
      .state('login', {
        url: "/login",
        templateUrl: "html/templates/login.html",
        controller: "loginController"
      })
      .state('listTopics', {
        url: "/makeObservation",
        templateUrl: "html/templates/listTopics.html",
        controller: "listTopicsController"
      })
      .state('makeObservation', {
        url: "/makeObservation/:topicId",
        templateUrl: "html/templates/makeObservation.html",
        controller: "makeObservationController"
      })
      .state('history', {
        url: "/history",
        templateUrl: "html/templates/history.html",
        controller: "historyController"
      })
      .state('editTopics', {
        url: "/editTopics",
        templateUrl: "html/templates/editTopics.html",
        controller: "editTopicsController"
      })
      .state('editTopic', {
        url: "/editTopic/:topicId",
        templateUrl: "html/templates/editTopic.html",
        controller: "editTopicController"
      })
      .state('settings', {
        url: "/settings",
        templateUrl: "html/templates/settings.html"
      });
    // Default route
    $urlRouterProvider.otherwise("/init");
  });
  
});
