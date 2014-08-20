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
      //TODO test continuous scrolling

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
    }
  ]);

});