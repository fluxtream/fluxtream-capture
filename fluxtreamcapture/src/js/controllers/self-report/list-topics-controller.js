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

        document.title = "Self Report";

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.$$phase || $scope.$apply();
        console.log("Current topics1:");
        console.log($scope.aoTopics);

        if(selfReportStorage.isTopicsSynced() === 0) {
          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            console.log("Current topics2:");
            console.log($scope.aoTopics);

            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        }
      });

      $scope.$on('event:initFailed', function() {
        //TODO test continuous scrolling
      });

      // Get token from backend and initialize local variables
      if(!selfReportStorage.isInitialized()) {
        selfReportStorage.initialize();
      } else {
        $rootScope.$broadcast('event:initialized');
      }
    }
  ]);

});