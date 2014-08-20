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
      //TODO bug in reordering (if reorder long enough)
      //TODO save order to the DB

      // Reorder Topics
      $scope.moveItem = function (oTopic, fromIndex, toIndex) {
        //Move the item in the array
        $scope.aoTopics.splice(fromIndex, 1);
        $scope.aoTopics.splice(toIndex, 0, oTopic);
      };

      document.title = "Edit Topics";

      selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
        $scope.aoTopics = aoTopics;
        $scope.$$phase || $scope.$apply();
      });

      $scope.$on('event:topics-synced', function() {
        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });
      });
    }
  ]);

});