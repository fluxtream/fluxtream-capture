define([
  'app-modules',
  'moment',
  'services/self-report-storage-service'
], function(appModules) {

  /**
   * Controller
   *
   * Create Observation screen
   */
  appModules.controllers.controller('CreateObservationController',
    ['$scope',
     '$stateParams',
     '$state',
     'SelfReportStorageService',
     '$rootScope',
     '$filter' ,
     '$ionicActionSheet',
     'UserPrefsService',
     "LoginService",
      function($scope, $stateParams, $state, selfReportStorage, $rootScope, $filter, $ionicActionSheet, userPrefs, loginService) {
        var bIsTopicsSyncFinished = 0;
        var bIsObservationsSyncFinished = 0;
        var bIsOfflineChangesForTopicsMade = selfReportStorage.getOfflineChangesForTopicsMade();
        var bIsOfflineChangesForObservationMade = selfReportStorage.getOfflineChangesForObservationsMade();

        $scope.doPing = function(atStart) {
          selfReportStorage.pingCouch(function (aoTopics) {
            $scope.aoTopics = aoTopics;
            bIsTopicsSyncFinished = 1;

            if (bIsObservationsSyncFinished  || (bIsOfflineChangesForObservationMade === 0)){
              forge.logging.info("Sync of topics is the last");
              $scope.status = (!atStart) ? 'done' : ($scope.status = selfReportStorage.isOffline() ? 'offline' : 'none');
              $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
              setTimeout(function(){
                if ($scope.status == 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
                $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
              },1000);
            }

            if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
              forge.logging.info("Sync of topics finished and no need of sync detected");
              if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
              $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
            }
          }, function (aoObservations) {
            $scope.aoObservations = aoObservations;
            bIsObservationsSyncFinished = 1;

            if (bIsTopicsSyncFinished || (bIsOfflineChangesForTopicsMade === 0)){
              forge.logging.info("Sync of observations is the last");
              $scope.status = (!atStart) ? 'done' : ($scope.status = selfReportStorage.isOffline() ? 'offline' : 'none');
              $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
              setTimeout(function(){
                if ($scope.status == 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
                $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
              },1000);
            }

            if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
              forge.logging.info("Sync of observations finished and no need of sync detected");
              if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
              $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
            }
          });
        };

        $scope.reconnectCouchDB = function () {
          $scope.status = 'loading';
          $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
          
          $scope.doPing(false);
        };
        
        $scope.$on('event:initialized', function() {
          // Delete status icon
          if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
          $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);

          //TODO refactor screen - no two lines for the comment field - ask on the ionic forum

          // Set current values of time and date
          forge.ui.enhanceAllInputs();
          document.getElementById('observation.observationDate').value =  $filter("date")(Date.now(), 'yyyy-MM-dd');
          document.getElementById('observation.observationTime').value  = $filter("date")(Date.now(), 'HH:mm:ss');
          var timezone = jstz.determine();
          document.getElementById('observation.timezone').value  = timezone.name();
          $scope.geolocationStatus = "disabled";
          $scope.geolocationPermissionDenied = false;
          $scope.geolocationData = {};

          $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);

          //TODO is the type is range check that default value is in range
          //Arrange DOM
          $scope.readType = function () {
            var sTypeOfTopic = $scope.oTopic.type;
            if (sTypeOfTopic == "None") {
              document.getElementById('valueItem').style.display = "none";
              document.getElementById('observation.comment').focus();

              //Show Keyboard
//              forge.internal.call('flx_toggle_keyboard.showKeyboard');
            }
            else if (sTypeOfTopic == "Numeric") {
              document.getElementById('valueItem').style.display = "";
              var elInput = document.createElement("input");
              elInput.type = "number";
              elInput.id = "observation.value";
              elInput.value = $scope.oTopic.defaultValue;
              document.getElementById("valueItem").appendChild(elInput);
              document.getElementById("valueItem").className = "item item-input";
              //TODO make numeric keyboard
              document.getElementById('observation.value').focus();
              //Show Keyboard
//              forge.internal.call('flx_toggle_keyboard.showKeyboard');
            }
            else if (sTypeOfTopic == "Range") {
              document.getElementById('valueItem').style.display = "";
              var elSelect = document.createElement('select');
              elSelect.id = "observation.value";

              //TODO how define range?
              var nCounter = Number($scope.oTopic.rangeStart);
              var nRangeEnd = Number($scope.oTopic.rangeEnd);
              var nRangeStep = Number($scope.oTopic.step);

              if (nRangeStep === 0){
                nRangeStep = 1;
              }

              while (nCounter <= nRangeEnd) {
                var opt = document.createElement('option');
                opt.value = nCounter;
                opt.innerHTML = nCounter;
                elSelect.appendChild(opt);
                nCounter += nRangeStep;
              }

              //TODO default value could be out of range? - Yes should ask the user
              elSelect.value = $scope.oTopic.defaultValue;
              document.getElementById("valueItem").appendChild(elSelect);
              document.getElementById("valueItem").className = "item item-input item-select";
            }
          };

          // Listen for the event - Topics array is loaded into memory
          // required in case the page was reloaded
          $scope.$on('event:topics-read-finished', function () {
            // Delete status icon
            if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
            $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
            $scope.oTopic = selfReportStorage.readTopic($stateParams.topicId);
            document.title = $scope.oTopic.name;
            $scope.readType();
            $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
          });

          // Set status icon to spinning wheel
          $scope.status = 'loading';
          $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);

          // If can not reach couchDB
          $scope.$on('event:offline', function() {
            $scope.status = 'offline';
            $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
          });
          
          $scope.doPing(true);
          selfReportStorage.readTopicsDB();

          // Called when the form is submitted
          $scope.createObservation = function () {
            // Check if geolocation data is present
            if ($scope.geolocationStatus == "fetching" && userPrefs.get('user.' + loginService.getUserId() + '.self-report.enable-geolocation-warning', true)) {
              // Ask user if they want to wait for the geolocation
              $ionicActionSheet.show({
                titleText: 'Save observation without geolocation?',
                buttons: [{text: "Yes"}],
                destructiveText: "Yes, and don't ask again",
                cancelText: 'No, wait for geolocation',
                cancel: function() {
                  // Wait for geolocation
                },
                buttonClicked: function(index) {
                  $scope.doCreateObservation();
                },
                destructiveButtonClicked: function(index) {
                  // Disable future warnings
                  userPrefs.set('user.' + loginService.getUserId() + '.self-report.enable-geolocation-warning', false);
                  $scope.doCreateObservation();
                }
              });
            } else {
              // Geolocation present or not needed, create observation
              $scope.doCreateObservation();
            }
          };
          
          $scope.doCreateObservation = function() {
            var tCreationDate = new Date();
            var sObservationValue;

            if ($scope.oTopic.type == "None") {
              sObservationValue = null;
            } else {
              sObservationValue = document.getElementById('observation.value').value;
              if ($scope.oTopic.type == "Numeric" && (sObservationValue === "" || isNaN(sObservationValue))) {
                alert("Please enter a numeric value.");
                return;
              }
            }

            var tObservationTime = moment(document.getElementById('observation.observationDate').value + " "
              + document.getElementById('observation.observationTime').value).format();

            $scope.oNewObservation = new selfReportStorage.Observation(
              Date.parse(tObservationTime) + "_" + $stateParams.topicId,
              $stateParams.topicId,
              sObservationValue,
              tCreationDate,
              tCreationDate,
              document.getElementById('observation.observationDate').value,
              tObservationTime,
              tCreationDate,
              document.getElementById('observation.timezone').value,
              $scope.geolocationStatus == 'fetched' ? $scope.geolocationData.coords.latitude : null,
              $scope.geolocationStatus == 'fetched' ? $scope.geolocationData.coords.longitude : null,
              $scope.geolocationStatus == 'fetched' ? $scope.geolocationData.coords.accuracy : null,
              document.getElementById('observation.comment').value
            );

            selfReportStorage.createObservation($scope.oNewObservation);

            //Hide Keyboard
//            forge.internal.call('flx_toggle_keyboard.hideKeyboard');
            $state.go("listTopics");
          };
          
          // Get geolocation data
          $scope.fetchGeolocationData = function() {
            if (!userPrefs.get('user.' + loginService.getUserId() + '.self-report.enable-geolocation', true)) {
              // Geolocation has been disabled by the user
              forge.logging.info("Geolocation disabled by the user");
              return;
            }
            $scope.geolocationStatus = 'fetching';
            if ($scope.geolocationPermissionDenied) {
              alert("You might need to allow this app to use Location Services in you device's privacy settings.");
            }
            forge.geolocation.getCurrentPosition(
              // Options
              {"enableHighAccuracy": true},
              // Success
              function(position) {
                $scope.geolocationStatus = "fetched";
                $scope.geolocationData = position;
                $scope.$$phase || $scope.$apply();
              },
              // Error
              function(error) {
                forge.logging.error("Geolocation fetching error: " + JSON.stringify(error));
                if ($scope.geolocationStatus != 'fetched') {
                  $scope.geolocationStatus = "error";
                  $scope.geolocationPermissionDenied = error.message == "Permission denied";
                  $scope.$$phase || $scope.$apply();
                }
              }
            );
          };
          $scope.fetchGeolocationData();
          
          // Go back to ListTopics
          $scope.goBack = function () {
            //Hide Keyboard
//            forge.internal.call('flx_toggle_keyboard.hideKeyboard');
          };

        });

        // If can not reach fluxtream-app backend
        $scope.$on('event:initFailed', function() {
          forge.logging.error("Init failed (create-observation-controller)");
          $scope.status = 'offline';
          $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);
          
          $rootScope.$broadcast('event:initialized');
        });

        if(!selfReportStorage.isInitialized()) {
          // Set status icon to spinning wheel
          $scope.status = 'loading';
          $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);

          selfReportStorage.initialize();
        } else {
          // Delete status icon
          if ($scope.status != 'done') $scope.status = selfReportStorage.isOffline() ? 'offline' : 'none';
          $scope.$$phase || $scope.$apply(); forge.logging.info("Status = " + $scope.status);

          $rootScope.$broadcast('event:initialized');
        }
      }
    ]
  );
});