define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {

  /**
   * Controller
   *
   * Infinite scroll function
   * Fetch list of Topics
   */
  appModules.controllers.controller('ListTopicsController', ['$scope', '$timeout', 'SelfReportStorageService', '$rootScope',
    function ($scope, $timeout, selfReportStorage, $rootScope) {
      document.title = "Self Report";
      
      // True as long as the topic list is loading
      $scope.loading = true;
      
      var bIsTopicsSyncFinished = 0;
      var bIsObservationsSyncFinished = 0;
      var bIsOfflineChangesForTopicsMade = selfReportStorage.getOfflineChangesForTopicsMade();
      var bIsOfflineChangesForObservationMade = selfReportStorage.getOfflineChangesForObservationsMade();
      
      // Returns true if the topic's latest version has not been synced to the server yet
      $scope.isTopicOutOfSync = function(oTopic) {
        var timestamp = new Date(oTopic.updateTime).getTime();
        var lastSync = selfReportStorage.getTopicLastSyncTime();
        return timestamp >= lastSync;
      };
      
      $scope.doPing = function(atStart) {
        $scope.status = 'loading';
        $scope.$$phase || $scope.$apply();

        selfReportStorage.pingCouch(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          bIsTopicsSyncFinished = 1;
          $scope.loading = false;
          $scope.$$phase || $scope.$apply();

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
        $scope.doPing(false);
      };

      //showKeyboard
      $scope.$on('event:initialized', function() {
        // Delete status icon
        if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
        $scope.$$phase || $scope.$apply();

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.$$phase || $scope.$apply();

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          $scope.loading = false;
          $scope.status = 'offline';
          $scope.$$phase || $scope.$apply();
        });

        // TODO isTopicsSynced is not used properly
        if(selfReportStorage.isTopicsSynced() === 0) {
          // Set status icon to spinning wheel
          $scope.status = 'loading';
          $scope.$$phase || $scope.$apply();
          
          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            //Delete spinning wheel
            if ($scope.status == 'loading') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
            $scope.loading = false;
            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        } else {
          $scope.doPing(true);
        }
      });

      // If can not reach fluxtream-app backend
      $scope.$on('event:initFailed', function() {
        forge.logging.error("Init failed (list-topics-controller)");
        $scope.status = 'offline';
        $scope.$$phase || $scope.$apply();
        
        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.loading = false;
          $scope.$$phase || $scope.$apply();
        });

        $rootScope.$broadcast('event:initialized');
      });

      // If can not save to PouchDB
      $scope.$on('event:internalError', function() {
        forge.logging.error("Can not save to PouchDB");
        $scope.status = 'alert';
        $scope.$$phase || $scope.$apply();
      });
      
      // Update topic list when it changes
      $scope.$on('event:topic-list-changed', function() {
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.$$phase || $scope.$apply();
      });
      
      // Listen to sync completed event to update view to show topics as synced
      $scope.$on('event:syncCompleted', function() {
        $scope.$$phase || $scope.$apply();
      });
      
      $scope.$$phase || $scope.$apply();
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
    }
  ]);

});