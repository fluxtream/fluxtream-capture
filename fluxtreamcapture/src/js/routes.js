/**
 * Defines all the routes of the Fluxtream Capture app
 */
define([
  'app-modules',
  'controllers/navigation-controller',
  'controllers/login/login-controller',
  'controllers/self-report/list-topics-controller',
  'controllers/self-report/history-controller',
  'controllers/self-report/edit-topics-controller',
  'controllers/self-report/create-topic-controller',
  'controllers/self-report/create-observation-controller',
  'controllers/self-report/edit-topic-controller',
  'controllers/self-report/edit-observation-controller',
  'controllers/photo-upload/photo-upload-controller'
], function(appModules) {
  appModules.app.config(function($stateProvider, $urlRouterProvider) {
    // Routing
    $stateProvider
      .state('init', {
        url: "/init",
        template: "",
        controller: "InitController"
      })
      .state('login', {
        url: "/login",
        templateUrl: "html/login/login.html",
        controller: "LoginController"
      })
      .state('listTopics', {
        url: "/listTopics",
        templateUrl: "html/self-report/list-topics.html",
        controller: "ListTopicsController"
      })
      .state('createObservation', {
        url: '/createObservation/:topicId',
        templateUrl: "html/self-report/create-observation.html",
        controller: "CreateObservationController"
      })
      .state('editObservation', {
          url: "/editObservation/:observationId",
          templateUrl: "html/self-report/edit-observation.html",
          controller: "EditObservationController"
      })
      .state('history', {
        url: "/history",
        templateUrl: "html/self-report/history.html",
        controller: "HistoryController"
      })
      .state('editTopics', {
        url: "/editTopics",
        templateUrl: "html/self-report/edit-topics.html",
        controller: "EditTopicsController"
      })
      .state('editTopic', {
        url: "/editTopic/:topicId",
        templateUrl: "html/self-report/edit-topic.html",
        controller: "EditTopicController"
      })
      .state('createTopic', {
          url: "/createTopic",
          templateUrl: "html/self-report/create-topic.html",
          controller: "CreateTopicController"
      })
      .state('photo-upload', {
        url: "/photo-upload",
        templateUrl: "html/photo-upload/photo-upload.html",
        controller: "PhotoUploadController"
      })
      .state('settings', {
        url: "/settings",
        templateUrl: "html/settings/settings.html"
      });
    // Default route
    $urlRouterProvider.otherwise("/init");
  });
  
});
