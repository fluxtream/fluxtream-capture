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

      function($scope, $stateParams, $state, selfReportStorage, $rootScope, $filter) {
        var bIsTopicsSyncFinished = 0;
        var bIsObservationsSyncFinished = 0;
        var bIsOfflineChangesForTopicsMade = selfReportStorage.getOfflineChangesForTopicsMade();
        var bIsOfflineChangesForObservationMade = selfReportStorage.getOfflineChangesForObservationsMade();

        $scope.doPing = function (){
          selfReportStorage.pingCouch(function (aoTopics) {
            $scope.aoTopics = aoTopics;
            bIsTopicsSyncFinished = 1;

            if (bIsObservationsSyncFinished  || (bIsOfflineChangesForObservationMade === 0)){
              console.log("Sync of topics is the last");
              $("#create-observation-footer-center-icon").attr('class', 'icon ion-checkmark self-report-footer-icon');
              $scope.$$phase || $scope.$apply();
              setTimeout(function(){
                $("#create-observation-footer-center-icon").attr('class', '');
                $scope.$$phase || $scope.$apply();
              },1000);
            }

            if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
              console.log("Sync of topics finished and no need of sync detected");
              $("#create-observation-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            }
          }, function (aoObservations) {
            $scope.aoObservations = aoObservations;
            bIsObservationsSyncFinished = 1;

            if (bIsTopicsSyncFinished || (bIsOfflineChangesForTopicsMade === 0)){
              console.log("Sync of observations is the last");
              $("#create-observation-footer-center-icon").attr('class', 'icon ion-checkmark self-report-footer-icon');
              $scope.$$phase || $scope.$apply();
              setTimeout(function(){
                $("#create-observation-footer-center-icon").attr('class', '');
                $scope.$$phase || $scope.$apply();
              },1000);
            }

            if ((bIsOfflineChangesForTopicsMade === 0) && (bIsOfflineChangesForTopicsMade === 0)){
              console.log("Sync of observations finished and no need of sync detected");
              $("#create-observation-footer-center-icon").attr('class', '');
              $scope.$$phase || $scope.$apply();
            }
          });
        };

        $scope.reconnectCouchDB = function () {
          $("#create-observation-footer-offline-img").remove();
          $("#create-observation-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          $scope.doPing();
        };
        
        $scope.$on('event:initialized', function() {
          // Delete status icon
          $("#create-observation-footer-center-icon").attr('class', '');
          $scope.$$phase || $scope.$apply();

          //TODO refactor screen - no two lines for the comment field - ask on the ionic forum

          // Set current values of time and date
          forge.ui.enhanceAllInputs();
          document.getElementById('observation.observationDate').value =  $filter("date")(Date.now(), 'yyyy-MM-dd');
          document.getElementById('observation.observationTime').value  = $filter("date")(Date.now(), 'HH:mm:ss');
          var timezone = jstz.determine();
          document.getElementById('observation.timezone').value  = timezone.name();

          $scope.$$phase || $scope.$apply();

          //TODO is the type is range check that default value is in range
          //Arrange DOM
          $scope.readType = function () {
            var sTypeOfTopic = $scope.oTopic.type;
            if (sTypeOfTopic == "None") {
              document.getElementById('valueItem').style.display = "none";
              document.getElementById('observation.comment').focus();

              //Show Keyboard
              forge.internal.call('flx_toggle_keyboard.showKeyboard');
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
              forge.internal.call('flx_toggle_keyboard.showKeyboard');
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
            $("#create-observation-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();
            $scope.oTopic = selfReportStorage.readTopic($stateParams.topicId);
            document.title = $scope.oTopic.name;
            $scope.readType();
            $scope.$$phase || $scope.$apply();
          });

          // Set status icon to spinning wheel
          $("#create-observation-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          // If can not reach couchDB
          $scope.$on('event:offline', function() {
            $("#create-observation-footer-center-icon").attr('class', '');
            $scope.$$phase || $scope.$apply();


            if ($('#create-observation-footer-offline-img').length === 0) {
              $("#create-observation-footer-center-link").append(
                "<img id='create-observation-footer-offline-img' src='./img/icons/offline.png' height='80%'/>"
              );

              $scope.$$phase || $scope.$apply();
            }
          });
          
          $scope.doPing();
          selfReportStorage.readTopicsDB();

          // Called when the form is submitted
          $scope.createObservation = function () {

            var tCreationDate = new Date();
            var sObservationValue;

            if ($scope.oTopic.type == "None") {
              sObservationValue = null;
            } else {
              sObservationValue = document.getElementById('observation.value').value;
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
              document.getElementById('observation.comment').value
            );

            selfReportStorage.createObservation($scope.oNewObservation);

            //Hide Keyboard
            forge.internal.call('flx_toggle_keyboard.hideKeyboard');
            $state.go("listTopics");
          };

          // Go back to ListTopics
          $scope.goBack = function () {
            //Hide Keyboard
            forge.internal.call('flx_toggle_keyboard.hideKeyboard');
            $state.go("listTopics");
          };

        });

        // If can not reach fluxtream-app backend
        $scope.$on('event:initFailed', function() {
          console.log("Init failed (create-observation-controller)");
          $("#create-observation-footer-center-icon").attr('class', '');
          $scope.$$phase || $scope.$apply();

          if ($('#create-observation-footer-offline-img').length === 0) {
            $("#create-observation-footer-center-link").append(
              "<img id='create-observation-footer-offline-img' src='./img/icons/offline.png' height='80%'/>"
            );

            $scope.$$phase || $scope.$apply();
          }

          $rootScope.$broadcast('event:initialized');
        });

        if(!selfReportStorage.isInitialized()) {
          // Set status icon to spinning wheel
          $("#create-observation-footer-center-icon").attr('class', 'icon ion-looping self-report-footer-icon');
          $scope.$$phase || $scope.$apply();

          selfReportStorage.initialize();
        } else {
          // Delete status icon
          $("#create-observation-footer-center-icon").attr('class', '');
          $scope.$$phase || $scope.$apply();

          $rootScope.$broadcast('event:initialized');
        }
      }
    ]
  );
});