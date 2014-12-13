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
      $scope.$on('event:initialized', function() {
        //TODO test continuous scrolling

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        document.title = "Self Report";
        $scope.$$phase || $scope.$apply();

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(!$scope.aoTopics || $scope.aoTopics.length === 0) {
          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        }

        //Infinite scroll function
        $scope.loadMoreObservations = function () {
          $timeout(function () {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.$broadcast('scroll.resize');
          }, 1000);
        };
      });

      $scope.$on('event:initFailed', function() {
        //TODO test continuous scrolling
      });

      // Get token from backend and initialize local variables
      if(!selfReportStorage.isInitializedFunc()) {
        selfReportStorage.initialize();
      } else {
        $rootScope.$broadcast('event:initialized');
      }
    }
  ]);

});