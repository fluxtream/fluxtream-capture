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

      $scope.doPing = function (){
        selfReportStorage.pingCouch(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          bIsTopicsSyncFinished = 1;

          if (bIsObservationsSyncFinished  || (bIsOfflineChangesForObservationMade === 0)){
            console.log("Sync of topics is the last (doPing)");
            $("#history-footer-center-icon").attr('class', 'icon ion-checkmark self-report-footer-icon');
            $scope.$$phase || $scope.$apply();
            setTimeout(function(){
              $("#history-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            },1000);
          }

          if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
            console.log("Sync of topics finished and no need of sync detected (doPing)");
            $("#history-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();
          }
        }, function (aoObservations) {
          $scope.aoObservations = aoObservations;
          bIsObservationsSyncFinished = 1;

          if (bIsTopicsSyncFinished || (bIsOfflineChangesForTopicsMade === 0)){
            console.log("Sync of observations is the last (doPing)");
            $("#history-footer-center-icon").attr('class', 'icon ion-checkmark self-report-footer-icon');
            $scope.$$phase || $scope.$apply();
            setTimeout(function(){
              $("#history-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            },1000);
          }

          if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
            console.log("Sync of observations finished and no need of sync detected (doPing)");
            $("#history-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();
          }
        });
      };

      $scope.reconnectCouchDB = function () {
        $("#history-footer-offline-img").remove();
        $("#history-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        $scope.doPing();
      };

      $scope.$on('event:initialized', function() {
        //TODO initialize when the observations list is empty
        //TODO check that dates are sorted correctly

        // Delete status icon
        $("#history-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        document.title = "History";

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.aoObservations = selfReportStorage.readObservations();
        $scope.$$phase || $scope.$apply();

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          $("#history-footer-center-icon").attr('class', '');
          $scope.$$phase || $scope.$apply();


          if ($('#history-footer-offline-img').length === 0) {
            $("#history-footer-center-link").append(
              "<img id='history-footer-offline-img' src='./img/icons/offline.png' height='80%'/>"
            );

            $scope.$$phase || $scope.$apply();
          }
        });

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(selfReportStorage.isTopicsSynced() === 0) {
          // Set status icon to spinning wheel
          $("#history-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            if(selfReportStorage.isObservationsSynced() === 1) {
              //Delete spinning wheel
              $("#history-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            }

            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        } else if (selfReportStorage.isObservationsSynced() === 1) {
          $scope.doPing();
        }

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(selfReportStorage.isObservationsSynced() === 0) {
          // Set status icon to spinning wheel
          $("#history-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readObservationsAsyncDB(function (aoObservations) {
            //Delete spinning wheel
            $("#history-footer-center-icon").attr('class', '');

            $scope.aoObservations = aoObservations;
            $scope.$$phase || $scope.$apply();

            // Group observations if there are some
            if ($scope.aoObservations != null) {
              $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
              $scope.$$phase || $scope.$apply();
            }
          });
        } else {
          $scope.doPing();
        }

        // Group observations if there are some
        if ($scope.aoObservations != null) {
          $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
          $scope.$$phase || $scope.$apply();
        }
      });

      // If can not reach fluxtream-app backend
      $scope.$on('event:initFailed', function() {
        console.log("Init failed (history-controller)");
        $("#history-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        if ($('#history-footer-offline-img').length === 0) {
          $("#history-footer-center-link").append(
            "<img id='history-footer-offline-img' src='./img/icons/offline.png' height='80%'/>"
          );

          $scope.$$phase || $scope.$apply();
        }

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
            $("#history-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();

            // Check if you are online
            selfReportStorage.pingCouch();

            $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
            $scope.$$phase || $scope.$apply();
          }
        });

        $rootScope.$broadcast('event:initialized');
      });

      // Get token from backend and initialize local variables
      if(!selfReportStorage.isInitialized()) {
        // Set status icon to spinning wheel
        $("#history-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.initialize();
      } else {
        // Delete status icon
        $("#history-footer-center-icon").attr('class', '');
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
      }
    }
  ]);

});