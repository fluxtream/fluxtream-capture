define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {

  /**
   * Controller
   *
   * Edit or reorder Topics
   */
  appModules.controllers.controller('EditTopicsController', ['$scope', 'SelfReportStorageService', '$rootScope',
    function ($scope, selfReportStorage, $rootScope) {
      $scope.$on('event:initialized', function() {
        //TODO bug in reordering (if reorder long enough)
        //TODO save order to the DB

        // Reorder Topics
        $scope.moveItem = function (oTopic, fromIndex, toIndex) {
          //Move the item in the array
          $scope.aoTopics.splice(fromIndex, 1);
          $scope.aoTopics.splice(toIndex, 0, oTopic);
        };

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        document.title = "Edit Topics";
        $scope.$$phase || $scope.$apply();

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if (selfReportStorage.isTopicsSynced() === 0) {
          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        }
      });

      $scope.$on('event:initFailed', function() {
        //TODO test continuous scrolling
      });

      if(!selfReportStorage.isInitialized()) {
        selfReportStorage.initialize();
      } else {
        $rootScope.$broadcast('event:initialized');
      }
    }
  ]);
});