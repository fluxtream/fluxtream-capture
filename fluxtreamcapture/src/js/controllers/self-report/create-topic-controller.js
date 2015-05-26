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
      '$rootScope',
      function ($scope, $state, $stateParams, selfReportStorage, $rootScope) {
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
        
        $scope.$on('event:initialized', function() {
          // Delete status icon
          if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
          $scope.$$phase || $scope.$apply();

          // Read memory values
          $scope.aoTopics = selfReportStorage.readTopics();

          // If can not reach couchDB
          $scope.$on('event:offline', function() {
            $scope.status = 'offline';
            $scope.$$phase || $scope.$apply();
          });

          $scope.doPing(true);

          // TODO isTopicsSynced is not used properly
          if(selfReportStorage.isTopicsSynced() === 0) {
            // Set status icon to spinning wheel
            $scope.status = 'loading';
            $scope.$$phase || $scope.$apply();

            selfReportStorage.syncTopicsAsyncDB(function (aoTopics) {
              $scope.aoTopics = aoTopics;
              $scope.$$phase || $scope.$apply();
            });
          }

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
              document.getElementById('topic.step').value = "1";
            }
          };

          document.title = "New Topic";

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

            if(document.getElementById('topic.name').value == 0){
              alert("Please specify a topic name.");
            }
            else if (selfReportStorage.getTopicWithName(document.getElementById('topic.name').value)) {
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
              $scope.oNewTopic = new selfReportStorage.Topic(
                nLength + "." + new Date().getTime(),
                tCurrentTime,
                tCurrentTime,
                document.getElementById('topic.name').value,
                document.getElementById('topic.type').value,
                document.getElementById('topic.defaultValue').value,
                document.getElementById('topic.rangeStart').value,
                document.getElementById('topic.rangeEnd').value,
                document.getElementById('topic.step').value,
                null //Real value for the Topic Order defined in createTopic function
              );

              selfReportStorage.createTopic($scope.oNewTopic);
              $state.go("editTopics");
            }
          };
        });

        // If can not reach fluxtream-app backend
        $scope.$on('event:initFailed', function() {
          forge.logging.error("Init failed (create-topic-controller)");
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
});