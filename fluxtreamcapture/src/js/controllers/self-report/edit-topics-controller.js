define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {

  /**
   * Controller
   *
   * Edit or reorder Topics
   */
  appModules.controllers.controller('EditTopicsController', ['$scope', 'SelfReportStorageService', '$rootScope',
    function ($scope, selfReportStorage, $rootScope) {
      var bIsTopicsSyncFinished = 0;
      var bIsObservationsSyncFinished = 0;
      var bIsOfflineChangesForTopicsMade = selfReportStorage.getOfflineChangesForTopicsMade();
      var bIsOfflineChangesForObservationMade = selfReportStorage.getOfflineChangesForObservationsMade();

      $scope.doPing = function (){
        selfReportStorage.pingCouch(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          bIsTopicsSyncFinished = 1;

          if (bIsObservationsSyncFinished  || (bIsOfflineChangesForObservationMade === 0)){
            forge.logging.info("Sync of topics is the last (doPing)");
            $("#edit-topics-footer-center-icon").attr('class', 'icon ion-checkmark self-report-footer-icon');
            $scope.$$phase || $scope.$apply();
            setTimeout(function(){
              $("#edit-topics-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            },1000);
          }

          if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
            forge.logging.info("Sync of topics finished and no need of sync detected (doPing)");
            $("#edit-topics-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();
          }
        }, function (aoObservations) {
          $scope.aoObservations = aoObservations;
          bIsObservationsSyncFinished = 1;

          if (bIsTopicsSyncFinished || (bIsOfflineChangesForTopicsMade === 0)){
            forge.logging.info("Sync of observations is the last (doPing)");
            $("#edit-topics-footer-center-icon").attr('class', 'icon ion-checkmark self-report-footer-icon');
            $scope.$$phase || $scope.$apply();
            setTimeout(function(){
              $("#edit-topics-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            },1000);
          }

          if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
            forge.logging.info("Sync of observations finished and no need of sync detected (doPing)");
            $("#edit-topics-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();
          }
        });
      };

      $scope.reconnectCouchDB = function () {
        $("#edit-topics-footer-offline-img").remove();
        $("#edit-topics-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        $scope.doPing();
      };
      
      $scope.$on('event:initialized', function() {
        $scope.headerTitle = "Edit Topics";
        $scope.showReordering = false;

        //TODO bug in reordering (if reorder long enough)
        //TODO save order to the DB
        // Delete status icon
        $("#edit-topics-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        document.title = "Edit Topics";
        $scope.$$phase || $scope.$apply();

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          $("#edit-topics-footer-center-icon").attr('class', '');
          $scope.$$phase || $scope.$apply();


          if ($('#edit-topics-footer-offline-img').length === 0) {
            $("#edit-topics-footer-center-link").append(
              "<img id='edit-topics-footer-offline-img' src='./img/icons/offline.png' height='80%'/>"
            );

            $scope.$$phase || $scope.$apply();
          }
        });

        // Read data from DB if it is empty
        // TODO should be done periodically not only if reload was done
        if (selfReportStorage.isTopicsSynced() === 0) {
          // Set status icon to spinning wheel
          $("#edit-topics-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            //Delete spinning wheel
            $("#history-footer-center-icon").attr('class', '');

            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        } else {
          $scope.doPing();
        }
      });

      // If can not reach fluxtream-app backend
      $scope.$on('event:initFailed', function() {
        forge.logging.error("Init failed (edit-topics-controller)");
        $("#edit-topics-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        if ($('#edit-topics-footer-offline-img').length === 0) {
          $("#edit-topics-footer-center-link").append(
            "<img id='edit-topics-footer-offline-img' src='./img/icons/offline.png' height='80%'/>"
          );

          $scope.$$phase || $scope.$apply();
        }

        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });

        $rootScope.$broadcast('event:initialized');
      });
      
      // Update topic list when it changes
      $scope.$on('event:topic-list-changed', function() {
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.$$phase || $scope.$apply();
      });

      if(!selfReportStorage.isInitialized()) {
        // Set status icon to spinning wheel
        $("#edit-topics-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.initialize();
      } else {
        // Delete status icon
        $("#edit-topics-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        $rootScope.$broadcast('event:initialized');
      }

      // show reorder button
      $scope.showReorder = function (){
        if($scope.showReordering === false){
          $scope.showReordering = true;
          $scope.headerTitle = "Reorder Topics";
        } else {
          $scope.showReordering = false;
          $scope.headerTitle = "Edit Topics";
        }

        $scope.$$phase || $scope.$apply();
      }

      // Reorder Topics
      $scope.moveItem = function (oTopic, fromIndex, toIndex) {
        //Move the item in the array
        $scope.aoTopics.splice(fromIndex, 1);
        $scope.aoTopics.splice(toIndex, 0, oTopic);
        // Reassign topic numbers
        for (var i = 0; i < $scope.aoTopics.length; i++) {
          $scope.aoTopics.topicNumber = i;
        }
        // Refresh UI
        $scope.$$phase || $scope.$apply();
        // Update database
        selfReportStorage.updateTopicNumbers($scope.aoTopics);
      };
    }
  ]);
});