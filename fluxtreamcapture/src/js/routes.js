/**
 * Defines all the routes of the Fluxtream Capture app
 */
define([
  'app-modules',
  'controllers/navigation-controller',
  'controllers/login/login-controller',
  'controllers/self-report/fluxtreamCaptureControllers',
  'controllers/photo-upload/photo-upload-controller'
], function(appModules) {
  appModules.app.config(function($stateProvider, $urlRouterProvider) {
    // Routing
    $stateProvider
      .state('init', {
        url: "/init",
        template: "",
        controller: "initController"
      })
      .state('login', {
        url: "/login",
        templateUrl: "html/login/login.html",
        controller: "loginController"
      })
      .state('listTopics', {
        url: "/makeObservation",
        templateUrl: "html/self-report/list-topics.html",
        controller: "listTopicsController"
      })
      .state('createObservation', {
        url: '/createObservation/:topicId',
        templateUrl: "html/self-report/create-observation.html",
        controller: "createObservationController"
      })
      .state('editObservation', {
          url: "/editObservation/:observationId",
          templateUrl: "html/self-report/edit-observation.html",
          controller: "editObservationController"
      })
      .state('history', {
        url: "/history",
        templateUrl: "html/self-report/history.html",
        controller: "historyController"
      })
      .state('editTopics', {
        url: "/editTopics",
        templateUrl: "html/self-report/edit-topics.html",
        controller: "editTopicsController"
      })
      .state('editTopic', {
        url: "/editTopic/:topicId",
        templateUrl: "html/self-report/edit-topic.html",
        controller: "editTopicController"
      })
      .state('createTopic', {
          url: "/createTopic",
          templateUrl: "html/self-report/create-topic.html",
          controller: "createTopicController"
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
