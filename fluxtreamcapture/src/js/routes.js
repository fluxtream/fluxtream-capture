/**
 * Defines all the routes of the Fluxtream Capture app
 */
define([
  'app-modules',
  'controllers/navigation-controller',
  'controllers/login/login-controller',
  'controllers/settings/settings-controller',
  'controllers/self-report/list-topics-controller',
  'controllers/self-report/history-controller',
  'controllers/self-report/edit-topics-controller',
  'controllers/self-report/create-topic-controller',
  'controllers/self-report/create-observation-controller',
  'controllers/self-report/edit-topic-controller',
  'controllers/self-report/edit-observation-controller',
  'controllers/photo-upload/photo-upload-controller',
  'controllers/photo-upload/photo-upload-settings-controller',
  'controllers/photo-upload/photo-preview-controller',
  'controllers/photo-upload/photo-metadata-controller',
  'controllers/heart-rate/heart-rate-controller',
  'controllers/coaching/coach-connector-sharing-controller',
  'controllers/coaching/coach-details-controller',
  'controllers/coaching/select-coach-controller',
  'controllers/coaching/find-coach-controller',
  'controllers/coaching/settings-connectors-controller',
  'controllers/coaching/wall-controller',
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
      .state('photoUpload', {
        url: "/photo-upload",
        templateUrl: "html/photo-upload/photo-upload.html",
        controller: "PhotoUploadController"
      })
      .state('photoUploadSettings', {
        url: "/photo-upload-settings/:from",
        templateUrl: "html/photo-upload/photo-upload-settings.html",
        controller: "PhotoUploadSettingsController"
      })
      .state('photoPreview', {
        url: "/photo-preview/:photoId",
        templateUrl: "html/photo-upload/photo-preview.html",
        controller: "PhotoPreviewController"
      })
      .state('photoMetadata', {
        url: "/photo-metadata/:photoId",
        templateUrl: "html/photo-upload/photo-metadata.html",
        controller: "PhotoMetadataController"
      })
      .state('heartRate', {
        url: "/heart-rate",
        templateUrl: "html/heart-rate/heart-rate.html",
        controller: "HeartRateController"
      })
      .state('wall', {
        url: "/wall",
        templateUrl: "html/coaching/wall.html",
        controller: "wallController"
      })
      .state('wallPost', {
        url: "/wall-post/:postId",
        templateUrl: "html/coaching/wall.html",
        controller: "wallController"
      })
      .state('selectCoach', {
        url: "/select-coach",
        templateUrl: "html/coaching/select-coach.html",
        controller: "selectCoachController"
      })
      .state('findCoach', {
        url: "/find-coach",
        templateUrl: "html/coaching/find-coach.html",
        controller: "findCoachController"
      })
      .state('coachDetails', {
        url: "/coach-details/:coachUsername",
        templateUrl: "html/coaching/coach-details.html",
        controller: "coachDetailsController"
      })
      .state('coachConnectorSharing', {
        url: "/coach-connector-sharing/:from/:coachUsername",
        templateUrl: "html/coaching/coach-connector-sharing.html",
        controller: "coachConnectorSharingController"
      })
      .state('settingsConnectors', {
        url: "/settings/connectors",
        templateUrl: "html/coaching/settings-connectors.html",
        controller: "settingsConnectorsController"
      })
      .state('settings', {
        url: "/settings",
        templateUrl: "html/settings/settings.html",
        controller: "SettingsController"
      });
    // Default route
    $urlRouterProvider.otherwise("/init");
  });
  
});
