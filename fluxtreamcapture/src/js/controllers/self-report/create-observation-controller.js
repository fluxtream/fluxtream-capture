define([
  'app-modules',
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

      function($scope, $stateParams, $state, selfReportStorage) {

        //TODO refactor screen - no two lines for the comment field - ask on the ionic forum

        $scope.oTopic = selfReportStorage.readTopicDB($stateParams.topicId);
        $scope.tObservationDate = new Date();
        $scope.tObservationTime = $scope.tObservationDate;

        //TODO is the type is range check that default value is in range
        //Arrange DOM
        $scope.readType = function(){
          var sTypeOfTopic = $scope.oTopic.type;
          if (sTypeOfTopic == "None"){
            document.getElementById('valueItem').style.display = "none";
          }
          else if (sTypeOfTopic == "Numeric") {
            document.getElementById('valueItem').style.display = "";
            var elInput =  document.createElement("input");
            elInput.type = "text";
            elInput.id = "observation.value";
            elInput.value = $scope.oTopic.defaultValue;
            document.getElementById("valueItem").appendChild(elInput);
            document.getElementById("valueItem").className = "item item-input";
          }
          else if (sTypeOfTopic == "Range"){
            document.getElementById('valueItem').style.display = "";
            var elSelect = document.createElement('select');
            elSelect.id = "observation.value";

            //TODO how define range?
            var nCounter = Number($scope.oTopic.rangeStart);
            var nRangeEnd = Number($scope.oTopic.rangeEnd);
            var nRangeStep = Number($scope.oTopic.step);

            while(nCounter <= nRangeEnd){
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

        $scope.readType();

        // Called when the form is submitted
        $scope.createObservation = function() {

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
              Date.parse($scope.tObservationTime) + "_" + $stateParams.topicId,
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
          $state.go("listTopics");
        };
      }
    ]
  );
});