define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {

  /**
   * Controller
   *
   * Fetch Topics and Observations and show them
   */
  appModules.controllers.controller('HistoryController', ['$scope', 'SelfReportStorageService',
    function ($scope, selfReportStorage) {
      //TODO initialize when the observations list is empty
      //TODO check that dates are sorted correctly

      selfReportStorage.readTopicsAsyncDB(function (topics) {
        $scope.aoTopics = topics;
        $scope.$$phase || $scope.$apply();
      });

      selfReportStorage.readObservationsAsyncDB(function (aoObservations) {
        $scope.aoObservations = aoObservations;

        if ($scope.aoObservations != null) {
          $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
          $scope.$$phase || $scope.$apply();
        }
      });


    }
  ]);

});