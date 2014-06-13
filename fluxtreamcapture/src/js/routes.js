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
        templateUrl: "init.html",
        controller: "initController"
      })
      .state('login', {
        url: "/login",
        templateUrl: "login.html",
        controller: "loginController"
      })
      .state('listTopics', {
        url: "/makeObservation",
        templateUrl: "listTopics.html",
        controller: "listTopicsController"
      })
      .state('makeObservation', {
        url: "/makeObservation/:topicId",
        templateUrl: "makeObservation.html",
        controller: "makeObservationController"
      })
      .state('history', {
        url: "/history",
        templateUrl: "history.html",
        controller: "historyController"
      })
      .state('editTopics', {
        url: "/editTopics",
        templateUrl: "editTopics.html",
        controller: "editTopicsController"
      })
      .state('ediTopic', {
        url: "/editTopic/:topicId",
        templateUrl: "editTopic.html",
        controller: "editTopicController"
      })
      .state('settings', {
        url: "/settings",
        templateUrl: "settings.html"
      });
    // Default route
    $urlRouterProvider.otherwise("/init");
  });
  
});
