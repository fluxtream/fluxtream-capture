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
          var bIsTopicsSyncFinished = 0;
          var bIsObservationsSyncFinished = 0;
          var bIsOfflineChangesForTopicsMade = selfReportStorage.getOfflineChangesForTopicsMade();
          var bIsOfflineChangesForObservationMade = selfReportStorage.getOfflineChangesForObservationsMade();

          $scope.doPing = function(atStart) {
            selfReportStorage.pingCouch(function (aoTopics) {
              $scope.aoTopics = aoTopics;
              bIsTopicsSyncFinished = 1;

              if (bIsObservationsSyncFinished  || (bIsOfflineChangesForObservationMade === 0)){
                forge.logging.info("Sync of topics is the last");
                $scope.status = (!atStart) ? 'done' : ($scope.status = selfReportStorage.isOffline() ? 'offline' : 'none');
                $scope.$$phase || $scope.$apply();
                setTimeout(function(){
                  if ($scope.status == 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
                  $scope.$$phase || $scope.$apply();
                },1000);
              }

              if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
                forge.logging.info("Sync of topics finished and no need of sync detected");
                if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
                $scope.$$phase || $scope.$apply();
              }
            }, function (aoObservations) {
              $scope.aoObservations = aoObservations;
              bIsObservationsSyncFinished = 1;

              if (bIsTopicsSyncFinished || (bIsOfflineChangesForTopicsMade === 0)){
                forge.logging.info("Sync of observations is the last");
                $("#edit-topic-footer-center-icon").attr('class', 'icon ion-checkmark self-report-footer-icon');
                $scope.status = (!atStart) ? 'done' : ($scope.status = selfReportStorage.isOffline() ? 'offline' : 'none');
                $scope.$$phase || $scope.$apply();
                setTimeout(function(){
                  if ($scope.status == 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
                  $scope.$$phase || $scope.$apply();
                },1000);
              }

              if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
                forge.logging.info("Sync of observations finished and no need of sync detected");
                if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
                $scope.$$phase || $scope.$apply();
              }
            });
          };

          $scope.reconnectCouchDB = function () {
            $scope.status = 'loading';
            $scope.$$phase || $scope.$apply();

            $scope.doPing(false);
          };
          
          $scope.$on('event:initialized', function () {
            // Delete status icon
            if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
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
              if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
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

            // If can not reach couchDB
            $scope.$on('event:offline', function() {
              $scope.status = 'offline';
              $scope.$$phase || $scope.$apply();
            });

            // Set status icon to spinning wheel
            $scope.status = 'loading';
            $scope.$$phase || $scope.$apply();

            $scope.doPing(true);
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
                  forge.logging.info("Topic deleted");
                  $state.go("editTopics");
                } else {
                  forge.logging.info('Topic deletion canceled');
                }
              });
            }

            // Called when the form is submitted
            $scope.editTopic = function () {
              var tCurrentTime = new Date();

              if(document.getElementById('topic.name').value == 0){
                alert("Please specify topic name.");
              }
              else if (selfReportStorage.getTopicWithName(document.getElementById('topic.name').value, $scope.oTopic.id)) {
                alert("You can't have two topics with the same name. Please enter another name.");
              }
              else if ((document.getElementById('topic.type').value === "Numeric" || document.getElementById('topic.type').value === "Range")
                      && isNaN(document.getElementById('topic.defaultValue').value)) {
                alert("The default value must be numeric.");
              }
              else if (document.getElementById('topic.type').value === "Range" &&
                      (document.getElementById('topic.rangeStart').value === "" || isNaN(document.getElementById('topic.rangeStart').value) ||
                       document.getElementById('topic.rangeEnd').value === "" || isNaN(document.getElementById('topic.rangeEnd').value))) {
                alert("Range start and end must be numeric.")
              }
              else if(document.getElementById('topic.type').value === "Range" &&
                (document.getElementById('topic.rangeEnd').value <=
                  document.getElementById('topic.rangeStart').value)){
                alert("Range defined incorrectly.");
              }
              else if(document.getElementById('topic.type').value === "Range" &&
                (document.getElementById('topic.step').value == 0 || document.getElementById('topic.step').value <= 0)) {
                alert("Step can not be less than 0.");
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
            forge.logging.error("Init failed (edit-topic-controller)");
            $scope.status = 'offline';
            $scope.$$phase || $scope.$apply();
            
            $rootScope.$broadcast('event:initialized');
          });

          if(!selfReportStorage.isInitialized()) {
            // Set status icon to spinning wheel
            $scope.status = 'loading';
            $scope.$$phase || $scope.$apply();

            selfReportStorage.initialize();
          } else {
            // Delete status icon
            if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
            $scope.$$phase || $scope.$apply();

            $rootScope.$broadcast('event:initialized');
          }
        }
      ]
    );
  }
);