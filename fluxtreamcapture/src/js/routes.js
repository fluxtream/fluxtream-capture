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
        templateUrl: "html/self-report/init.html",
        controller: "initController"
      })
      .state('login', {
        url: "/login",
        templateUrl: "html/self-report/login.html",
        controller: "loginController"
      })
      .state('listTopics', {
        url: "/makeObservation",
        templateUrl: "html/self-report/listTopics.html",
        controller: "listTopicsController"
      })
      .state('createObservation', {
        url: '/createObservation/:topicId',
        templateUrl: "html/self-report/createObservation.html",
        controller: "createObservationController"
      })
      .state('editObservation', {
          url: "/editObservation/:observationId",
          templateUrl: "html/self-report/editObservation.html",
          controller: "editObservationController"
      })
      .state('history', {
        url: "/history",
        templateUrl: "html/self-report/history.html",
        controller: "historyController"
      })
      .state('editTopics', {
        url: "/editTopics",
        templateUrl: "html/self-report/editTopics.html",
        controller: "editTopicsController"
      })
      .state('editTopic', {
        url: "/editTopic/:topicId",
        templateUrl: "html/self-report/editTopic.html",
        controller: "editTopicController"
      })
      .state('createTopic', {
          url: "/createTopic",
          templateUrl: "html/self-report/createTopic.html",
          controller: "createTopicController"
      })
      .state('photo-upload', {
        url: "/photo-upload",
        templateUrl: "html/photo-upload.html",
        controller: "PhotoUploadController"
      })
      .state('settings', {
        url: "/settings",
        templateUrl: "html/self-report/settings.html"
      });
    // Default route
    $urlRouterProvider.otherwise("/init");
  });
  
});
