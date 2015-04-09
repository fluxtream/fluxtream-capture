define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {

  /**
   * Controller
   *
   * Fetch Topics and Observations and show them
   */
  appModules.controllers.controller('HistoryController', ['$scope', 'SelfReportStorageService', '$rootScope',
    function ($scope, selfReportStorage, $rootScope) {
      var bIsTopicsSyncFinished = 0;
      var bIsObservationsSyncFinished = 0;
      var bIsOfflineChangesForTopicsMade = selfReportStorage.getOfflineChangesForTopicsMade();
      var bIsOfflineChangesForObservationMade = selfReportStorage.getOfflineChangesForObservationsMade();
      
      $scope.isObservationOutOfSync = function(oObservation) {
        var timestamp = new Date(oObservation.updateTime).getTime();
        var lastSync = selfReportStorage.getObservationLastSyncTime();
        return timestamp >= lastSync;
      };
      
      $scope.doPing = function(atStart) {
        $scope.status = 'loading';
        $scope.$$phase || $scope.$apply();
        selfReportStorage.pingCouch(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          bIsTopicsSyncFinished = 1;

          if (bIsObservationsSyncFinished  || (bIsOfflineChangesForObservationMade === 0)){
            forge.logging.info("Sync of topics is the last (doPing)");
            $scope.status = (!atStart) ? 'done' : ($scope.status = selfReportStorage.isOffline() ? 'offline' : 'none');
            $scope.$$phase || $scope.$apply();
            setTimeout(function(){
              if ($scope.status == 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
              $scope.$$phase || $scope.$apply();
            },1000);
          }

          if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
            forge.logging.info("Sync of topics finished and no need of sync detected (doPing)");
            if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
            $scope.$$phase || $scope.$apply();
          }
        }, function (aoObservations) {
          $scope.aoObservations = aoObservations;
          bIsObservationsSyncFinished = 1;

          if (bIsTopicsSyncFinished || (bIsOfflineChangesForTopicsMade === 0)){
            forge.logging.info("Sync of observations is the last (doPing)");
            $scope.status = (!atStart) ? 'done' : ($scope.status = selfReportStorage.isOffline() ? 'offline' : 'none');
            $scope.$$phase || $scope.$apply();
            setTimeout(function(){
              if ($scope.status == 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
              $scope.$$phase || $scope.$apply();
            },1000);
          }

          if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
            forge.logging.info("Sync of observations finished and no need of sync detected (doPing)");
            if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
            $scope.$$phase || $scope.$apply();
          }
        });
      };

      $scope.reconnectCouchDB = function () {
        $scope.doPing();
      };

      $scope.$on('event:initialized', function() {
        //TODO initialize when the observations list is empty
        //TODO check that dates are sorted correctly

        // Delete status icon
        if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
        $scope.$$phase || $scope.$apply();

        document.title = "History";

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.aoObservations = selfReportStorage.readObservations();
        $scope.$$phase || $scope.$apply();

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          $scope.status = 'offline';
          $scope.$$phase || $scope.$apply();
        });

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(selfReportStorage.isTopicsSynced() === 0) {
          // Set status icon to spinning wheel
          $scope.status = 'loading';
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            if(selfReportStorage.isObservationsSynced() === 1) {
              //Delete spinning wheel
              if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
              $scope.$$phase || $scope.$apply();
            }

            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        } else if (selfReportStorage.isObservationsSynced() === 1) {
          $scope.doPing(true);
        }

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(selfReportStorage.isObservationsSynced() === 0) {
          // Set status icon to spinning wheel
          $scope.status = 'loading';
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readObservationsAsyncDB(function (aoObservations) {
            //Delete spinning wheel
            if ($scope.status == 'loading') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
            
            $scope.aoObservations = aoObservations;
            $scope.$$phase || $scope.$apply();

            // Group observations if there are some
            if ($scope.aoObservations != null) {
              $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
              $scope.$$phase || $scope.$apply();
            }
          });
        } else {
          $scope.doPing(true);
        }

        // Group observations if there are some
        if ($scope.aoObservations != null) {
          $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
          $scope.$$phase || $scope.$apply();
        }
      });

      // If can not reach fluxtream-app backend
      $scope.$on('event:initFailed', function() {
        forge.logging.error("Init failed (history-controller)");
        $scope.status = 'offline';
        $scope.$$phase || $scope.$apply();
        
        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });

        selfReportStorage.readObservationsAsyncDB(function (aoObservations) {
          $scope.aoObservations = aoObservations;
          $scope.$$phase || $scope.$apply();

          // Group observations if there are some
          if ($scope.aoObservations != null) {
            // Delete status icon
            if ($scope.status == 'loading') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
            $scope.$$phase || $scope.$apply();

            // Check if you are online
            selfReportStorage.pingCouch();

            $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
            $scope.$$phase || $scope.$apply();
          }
        });

        $rootScope.$broadcast('event:initialized');
      });
      
      // Update topic list when it changes
      $scope.$on('event:topic-list-changed', function() {
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.$$phase || $scope.$apply();
      });
      
      // Update observation list when it changes
      $scope.$on('event:observation-list-changed', function() {
        $scope.aoObservations = selfReportStorage.readObservations();
        $scope.$$phase || $scope.$apply();
      });
      
      // Listen to sync completed event to update view to show topics as synced
      $scope.$on('event:syncCompleted', function() {
        $scope.$$phase || $scope.$apply();
      });
      
      // Get token from backend and initialize local variables
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

      /*
      * Find Topic name for corresponding id
      * */
      $scope.getNameById = function (topicId){
        var nTopicsLength = $scope.aoTopics.length;
        for (var i = 0; i < nTopicsLength;i++) {
          if($scope.aoTopics[i].id == topicId) {
            return $scope.aoTopics[i].name;
          }
        }
      };
    }
  ]);

});
