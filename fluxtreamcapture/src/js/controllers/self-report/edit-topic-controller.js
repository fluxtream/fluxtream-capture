define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {

    /**
     * Controller
     *
     * Edit Topic
     */
    appModules.controllers.controller('EditTopicController',
      ['$scope',
       '$state',
       '$stateParams',
       'SelfReportStorageService',

        function ($scope, $state, $stateParams, selfReportStorage) {

          $scope.topicId = $stateParams.topicId;

          document.title = "Edit Topic";

          //TODO when the type is changed it should affect only future created entries
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

          //TODO should be done async
          $scope.oTopic = selfReportStorage.readTopic($scope.topicId);

          // Fill the data initially
          document.getElementById('topic.name').value = $scope.oTopic.name;
          document.getElementById('topic.type').value = $scope.oTopic.type;
          document.getElementById('topic.defaultValue').value = $scope.oTopic.defaultValue;
          document.getElementById('topic.rangeStart').value = $scope.oTopic.rangeStart;
          document.getElementById('topic.rangeEnd').value = $scope.oTopic.rangeEnd;
          document.getElementById('topic.step').value = $scope.oTopic.step;

          // Hide/show rangeStart/Stop fields and Steps
          $scope.changeType();
          $scope.showThis = true;

          // Called when the form is submitted
          $scope.editTopic = function () {
            var tCurrentTime = new Date();

            //Note: we save rangeStart/rangeEnd if it was defined before, but then type was changed to none
            $scope.oNewTopic = new selfReportStorage.Topic(
              $scope.oTopic.id,
              $scope.oTopic.creationTime,
              tCurrentTime,
              document.getElementById('topic.name').value,
              document.getElementById('topic.type').value,
              document.getElementById('topic.defaultValue').value,
              document.getElementById('topic.rangeStart').value,
              document.getElementById('topic.rangeEnd').value,
              document.getElementById('topic.step').value
            );
            // TODO $scope.$$phase || $scope.$apply();

            selfReportStorage.updateTopic($scope.oNewTopic);
            $state.go("editTopics");
          };

        }
      ]
    );
  }
);