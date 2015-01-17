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
        // Delete status icon
        $("#edit-topics-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        document.title = "Edit Topics";
        $scope.$$phase || $scope.$apply();

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          //TODO test continuous scrolling
          $("#edit-topics-footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
          $scope.$$phase || $scope.$apply();
        });

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          //TODO test continuous scrolling
          $("#edit-topics-footer-center-icon").attr('class', 'icon ion-alert self-report-footer-icon');
          $scope.$$phase || $scope.$apply();
        });

        // Read data from DB if it is empty
        // TODO should be done periodically not only if reload was done
        if (selfReportStorage.isTopicsSynced() === 0) {
          // Set status icon to spinning wheel
          $("#edit-topics-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            // Delete status icon
            $("#edit-topics-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();

            // Check if you are online
            selfReportStorage.pingCouch();

            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        } else {
          // Check if you are online
          selfReportStorage.pingCouch();
        }
      });

      // If can not reach fluxtream-app backend
      $scope.$on('event:initFailed', function() {
        //TODO test continuous scrolling
        $("#edit-topics-footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });
      });

      if(!selfReportStorage.isInitialized()) {
        // Set status icon to spinning wheel
        $("#edit-topics-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.initialize();
      } else {
        // Delete status icon
        $("#edit-topics-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        $rootScope.$broadcast('event:initialized');
      }

      // Reorder Topics
      $scope.moveItem = function (oTopic, fromIndex, toIndex) {
        //Move the item in the array
        $scope.aoTopics.splice(fromIndex, 1);
        $scope.aoTopics.splice(toIndex, 0, oTopic);

        for (var i = Math.min(fromIndex, toIndex); i < $scope.aoTopics.length; i++) {
          $scope.aoTopics.topicNumber = i;
        }
        $scope.$$phase || $scope.$apply();

        // TODO Could be done better if to use separate DB for order numbers
        selfReportStorage.updateTopicNumbers($scope.aoTopics);
      };
    }
  ]);
});