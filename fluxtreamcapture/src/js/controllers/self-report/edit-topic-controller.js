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
       '$rootScope',
       '$ionicPopup',

        function ($scope, $state, $stateParams, selfReportStorage, $rootScope, $ionicPopup) {
          $scope.$on('event:initialized', function () {
            // Delete status icon
            $("#edit-topic-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();

            $scope.topicId = $stateParams.topicId;

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

            // Listen for the event - Topics array is loaded into memory
            // required in case the page was reloaded
            $scope.$on('event:topics-read-finished', function () {
              // Delete status icon
              $("#edit-topic-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();

              //TODO should be done async
              $scope.oTopic = selfReportStorage.readTopic($scope.topicId);
              document.title = $scope.oTopic.name;

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
            });

            // Set status icon to spinning wheel
            $("#edit-topic-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
            $scope.$$phase || $scope.$apply();

            selfReportStorage.readTopicsDB();

            // Called confirm dialog for deleting Topic
            $scope.deleteTopic = function() {
              var confirmPopup = $ionicPopup.confirm({
                title: 'Deleting Topic',
                template: 'Are you sure you want to delete Topic '+ $scope.oTopic.name +' (this would also delete observations)?',
                okType: 'button-assertive'
              });
              confirmPopup.then(function(res) {
                if(res) {
                  selfReportStorage.deleteTopic($scope.oTopic);
                  console.log("Topic deleted");
                  $state.go("editTopics");
                } else {
                  console.log('Topic deletion canceled');
                }
              });
            }

            // Called when the form is submitted
            $scope.editTopic = function () {
              var tCurrentTime = new Date();

              if(document.getElementById('topic.name').value == 0){
                alert("Please specify Topic name");
              }
              else if(document.getElementById('topic.type').value === "Range" &&
                (document.getElementById('topic.rangeStart').value == 0 ||
                  document.getElementById('topic.rangeEnd').value == 0 ||
                  document.getElementById('topic.rangeEnd').value <=
                  document.getElementById('topic.rangeStart').value)){
                alert("Range defined incorrectly");
              }
              else if(document.getElementById('topic.type').value === "Range" &&
                (document.getElementById('topic.step').value == 0 ||
                  document.getElementById('topic.step').value <= 0)){
                alert("Step can not be less than 0 for Range type");
              }
              else {
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
                  document.getElementById('topic.step').value,
                  $scope.oTopic.topicNumber
                );
                // TODO $scope.$$phase || $scope.$apply();

                selfReportStorage.updateTopic($scope.oNewTopic);
                $state.go("editTopics");
              }
            };
          });

          // If can not reach fluxtream-app backend
          $scope.$on('event:initFailed', function() {
            //TODO test continuous scrolling
            $("#edit-topic-footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
            $scope.$$phase || $scope.$apply();
          });

          if(!selfReportStorage.isInitialized()) {
            // Set status icon to spinning wheel
            $("#edit-topic-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
            $scope.$$phase || $scope.$apply();

            selfReportStorage.initialize();
          } else {
            // Delete status icon
            $("#edit-topic-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();

            $rootScope.$broadcast('event:initialized');
          }
        }
      ]
    );
  }
);