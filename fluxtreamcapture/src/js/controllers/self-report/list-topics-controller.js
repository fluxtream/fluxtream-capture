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
      document.title = "Self Report";

      $scope.reconnectCouchDB = function () {
        alert("Working");
      };

      //showKeyboard
      $scope.$on('event:initialized', function() {
        // Delete status icon
        $("#list-topics-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        //TODO test continuous scrolling

        // Read memory values
        $scope.aoTopics = selfReportStorage.readTopics();
        $scope.$$phase || $scope.$apply();

        // If can not reach couchDB
        $scope.$on('event:offline', function() {
          //TODO test continuous scrolling
          $("#list-topics-footer-center-link").append(
            "<img src='./img/icons/offline.png' height='80%'/>"
          );

          $scope.$$phase || $scope.$apply();
        });

        // TODO isTopicsSynced is not used properly
        if(selfReportStorage.isTopicsSynced() === 0) {
          // Set status icon to spinning wheel
          $("#list-topics-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
            // Delete status icon
            $("#list-topics-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();

            //If list is empty show add button
            if(aoTopics.length === 0){
              $("#footer-right").text('Add Topic');
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
      });

      // If can not reach fluxtream-app backend
      $scope.$on('event:initFailed', function() {
        console.log("Init failed (list-topics-controller)");
        //TODO test continuous scrolling
        $("#list-topics-footer-center-icon").attr('class', 'icon ion-alert-circled self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.readTopicsAsyncDB(function (aoTopics) {
          $scope.aoTopics = aoTopics;
          $scope.$$phase || $scope.$apply();
        });
      });

      $scope.$$phase || $scope.$apply();
      // Get token from backend and initialize local variables
      if(!selfReportStorage.isInitialized()) {
        // Set status icon to spinning wheel
        $("#list-topics-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
        $scope.$$phase || $scope.$apply();

        selfReportStorage.initialize();
      } else {
        // Delete status icon
        $("#list-topics-footer-center-icon").attr('class', '');
        $scope.$$phase || $scope.$apply();

        $rootScope.$broadcast('event:initialized');
      }
    }
  ]);

});