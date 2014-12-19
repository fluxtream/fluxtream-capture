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
      $scope.$on('event:initialized', function() {
        //TODO initialize when the observations list is empty
        //TODO check that dates are sorted correctly

        document.title = "History";

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.aoObservations = selfReportStorage.readObservations();
        $scope.$$phase || $scope.$apply();

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(!$scope.aoTopics || $scope.aoTopics.length === 0) {
          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        }

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(!$scope.aoObservations || $scope.aoObservations.length === 0) {
          selfReportStorage.readObservationsAsyncDB(function (aoObservations) {
            $scope.aoObservations = aoObservations;
            $scope.$$phase || $scope.$apply();

            // Group observations if there are some
            if ($scope.aoObservations != null) {
              $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
              $scope.$$phase || $scope.$apply();
            }
          });
        }

        // Group observations if there are some
        if ($scope.aoObservations != null) {
          $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
          $scope.$$phase || $scope.$apply();
        }
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