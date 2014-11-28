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
  appModules.controllers.controller('ListTopicsController', ['$scope', '$timeout', 'SelfReportStorageService',
    function ($scope, $timeout, selfReportStorage) {
      $scope.$on('event:initialized', function() {
        //TODO test continuous scrolling

        // Show spinning wheel
        if (selfReportStorage.readObservationsToSync().length != 0) {
          $("#footer-center-icon").attr('class', 'icon ion-loading-c self-report-footer-icon');
          $scope.$$phase || $scope.$apply();
        }

        // Error handling while sync of client-side DB
        $scope.$on('event:observations-sync-db-problem', function () {
          console.log("Can not save observation on client side");
          // TODO retry strategy
          $("#footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
          $scope.$$phase || $scope.$apply();
        });

        // Error handling while sync with a server
        $scope.$on('event:observations-sync-server-problem', function () {
          console.log("Can not save observation to a server");
          // TODO retry strategy
          $("#footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
          $scope.$$phase || $scope.$apply();
        });

        // Waiting when DB would be synced with server
        $scope.$on('event:observations-synced-with-server', function () {
          // Show sync status
          console.log("Sync with server finished");
          $("#footer-center-icon").attr('class', '');
        });

        // Waiting when client side DB would be synced
        $scope.$on('event:observations-synced-with-db', function () {
          // Start sync with server DB
          selfReportStorage.syncObservationsServer();
          // Show sync status
          console.log("Sync with db finished");
        });

        // Start sync with client-side DB
        selfReportStorage.syncObservationsDB();

        //Infinite scroll function
        $scope.loadMoreObservations = function () {
          $timeout(function () {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.$broadcast('scroll.resize');
          }, 1000);
        };

        document.title = "Self Report";

        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });

        selfReportStorage.readObservationsAsyncDB(function () {
        });
      });

      $scope.$on('event:initFailed', function() {
        //TODO test continuous scrolling
      });

      // Get token from backend and initialize local variables
      selfReportStorage.initialize();
    }
  ]);

});