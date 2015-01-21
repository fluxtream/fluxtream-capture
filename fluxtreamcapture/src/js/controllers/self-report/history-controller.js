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

        // Delete status icon
        $("#history-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        document.title = "History";

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.aoObservations = selfReportStorage.readObservations();
        $scope.$$phase || $scope.$apply();

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          //TODO test continuous scrolling
          $("#history-footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
          $scope.$$phase || $scope.$apply();
        });

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          //TODO test continuous scrolling
          $("#history-footer-center-icon").attr('class', 'icon ion-alert self-report-footer-icon');
          $scope.$$phase || $scope.$apply();
        });

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(selfReportStorage.isTopicsSynced() === 0) {
          // Set status icon to spinning wheel
          $("#history-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            if(selfReportStorage.isObservationsSynced() != 0) {
              // Delete status icon
              $("#history-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            }

            // Check if you are online
            selfReportStorage.pingCouch();

            $scope.aoTopics = aoTopics;
            $scope.$$phase || $scope.$apply();
          });
        } else {
          // Check if you are online
          selfReportStorage.pingCouch();
        }

        // Read data from DB if it is epmty
        // TODO should be done periodically not only if reload was done
        if(selfReportStorage.isObservationsSynced() === 0) {
          // Set status icon to spinning wheel
          $("#history-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readObservationsAsyncDB(function (aoObservations) {
            $scope.aoObservations = aoObservations;
            $scope.$$phase || $scope.$apply();

            // Group observations if there are some
            if ($scope.aoObservations != null) {
              // Delete status icon
              $("#history-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();

              // Check if you are online
              selfReportStorage.pingCouch();

              $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
              $scope.$$phase || $scope.$apply();
            }
          });
        } else {
          // Check if you are online
          selfReportStorage.pingCouch();
        }

        // Group observations if there are some
        if ($scope.aoObservations != null) {
          $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
          $scope.$$phase || $scope.$apply();
        }
      });

      // If can not reach fluxtream-app backend
      $scope.$on('event:initFailed', function() {
        //TODO test continuous scrolling
        $("#history-footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });

        elfReportStorage.readObservationsAsyncDB(function (aoObservations) {
          $scope.aoObservations = aoObservations;
          $scope.$$phase || $scope.$apply();

          // Group observations if there are some
          if ($scope.aoObservations != null) {
            // Delete status icon
            $("#history-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();

            // Check if you are online
            selfReportStorage.pingCouch();

            $scope.aoUniqueDates = selfReportStorage.findUniqueDates($scope.aoObservations);
            $scope.$$phase || $scope.$apply();
          }
        });
      });

      // Get token from backend and initialize local variables
      if(!selfReportStorage.isInitialized()) {
        // Set status icon to spinning wheel
        $("#history-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.initialize();
      } else {
        // Delete status icon
        $("#history-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        $rootScope.$broadcast('event:initialized');
      }

      /*
      * Find Topic name for corresponding id
      * */
      $scope.getNameById = function (topicId){
        var nTopicsLength = $scope.aoTopics.length;
        for (var i = 0; i < nTopicsLength;i++) {
          if($scope.aoTopics[i].id == topicId) {
            return $scope.aoTopics[i].name;
          }
        }
      }
    }
  ]);

});