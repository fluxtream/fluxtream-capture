define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {

  /**
   * Controller
   *
   * Create Topic screen
   */
  appModules.controllers.controller('CreateTopicController',
    ['$scope',
     '$state',
     '$stateParams',
     'SelfReportStorageService',
      function ($scope, $state, $stateParams, selfReportStorage) {

        // Toggle range boundaries and step based on topic type none/numeric/range
        $scope.changeType = function () {
          var sTypeOfTopic = document.getElementById('topic.type').value;
          if (sTypeOfTopic == "None") {
            document.getElementById('defaultValueItem').style.display = "none";
            document.getElementById('rangeStartItem').style.display = "none";
            document.getElementById('rangeEndItem').style.display = "none";
            document.getElementById('stepItem').style.display = "none";
          }
          else if (sTypeOfTopic == "Numeric") {
            document.getElementById('defaultValueItem').style.display = "";
            document.getElementById('rangeStartItem').style.display = "none";
            document.getElementById('rangeEndItem').style.display = "none";
            document.getElementById('stepItem').style.display = "none";
          }
          else if (sTypeOfTopic == "Range") {
            document.getElementById('defaultValueItem').style.display = "";
            document.getElementById('rangeStartItem').style.display = "";
            document.getElementById('rangeEndItem').style.display = "";
            document.getElementById('stepItem').style.display = "";
          }
        };

        document.title = "New Topic";

        //TODO what if the result would not be returned?
        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });

        // Called when the form is submitted
        $scope.createTopic = function () {
          //Set values of topic
          var tCurrentTime = new Date();

          //TODO when the Topics array is empty this would give and error (definetely on the mobile phone version)
          if (!$scope.aoTopics) $scope.aoTopics = []; // TODO remove this line but fix initialization bug
          var nLength = $scope.aoTopics.length;

          //TODO Topic Name is a mandatory field - Error/Notification message under the header
          //TODO If user is pressing + and save button very fast he would get empty entry (if name could be empty)
          //TODO How we generate the ID for the Topic? - When connecting to server resolve topic Ids first
          //TODO any placeholders? - Should be clear where to enter value
          //TODO what to do with "status" field - use when archive for topics and delete for observations
          $scope.oNewTopic = new selfReportStorage.Topic(
            nLength,
            tCurrentTime,
            tCurrentTime,
            document.getElementById('topic.name').value,
            document.getElementById('topic.type').value,
            document.getElementById('topic.defaultValue').value,
            document.getElementById('topic.rangeStart').value,
            document.getElementById('topic.rangeEnd').value,
            document.getElementById('topic.step').value
          );

          selfReportStorage.createTopic($scope.oNewTopic);
          $state.go("editTopics");
        };
      }
    ]
  );
});