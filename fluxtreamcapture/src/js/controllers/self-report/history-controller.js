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

      document.title = "History";

      // Read memory values
      $scope.aoTopics = selfReportStorage.readTopics();
      $scope.aoObservations = selfReportStorage.readObservations();
      $scope.$$phase || $scope.$apply();

      // Group observations if there are some
      if ($scope.aoObservations != null) {
        $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
        $scope.$$phase || $scope.$apply();
      }

      // Read data from DB if it is epmty
      // TODO should be done periodically not only if reload was done
      if($scope.aoTopics.length === 0){
        selfReportStorage.readTopicsAsyncDB(function (topics) {
          // First load client side Topics
          $scope.aoTopics = topics;

          // Load for updates from server
          // TODO subscription for periodical update

          $scope.$$phase || $scope.$apply();
        });

        selfReportStorage.readObservationsAsyncDB(function (aoObservations) {
          // First load client side observations
          $scope.aoObservations = aoObservations;

          // Load for updates from server
          // TODO subscription for periodical update

          // Group observations if there are some
          if ($scope.aoObservations != null) {
            $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
            $scope.$$phase || $scope.$apply();
          }
        });
      }

    }
  ]);

});