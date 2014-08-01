define([
  'app-modules',
  'services/self-report-storage-service'
], function(appModules) {
  //TODO reload of the page doesn't work
  //TODO title of the page should be correct

  /**
   * Helper
   *
   * Returns time in 24 format as a string
   */
  function helperGetTimeFromDate(observationTime){
    var dObservationTime = new Date(observationTime);
    var hour = dObservationTime.getHours();  /* Returns the hour (from 0-23) */
    var minutes = dObservationTime.getMinutes();  /* Returns the minutes (from 0-59) */
    var result = '';

    if(hour < 10){
      result = "0" + hour;
    }else {
      result += hour;
    }

    result += ":";

    if(minutes < 10){
      result += "0" + minutes;
    }else {
      result += minutes;
    }

    return result;
  }


  /**
   * Controller
   *
   * Edit Observation screen
   */
  appModules.controllers.controller('EditObservationController',
    ['$scope',
     '$stateParams',
     '$state',
     'SelfReportStorageService',

      function($scope, $stateParams, $state, selfReportStorage) {

        $scope.topicId = $stateParams.observationId.split("_")[1];

        $scope.oTopic = selfReportStorage.readTopic($scope.topicId);
        $scope.oObservation = selfReportStorage.readObservation($stateParams.observationId);

        //Arrange DOM
        //TODO test range and others with malicious input
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

            //TODO default value could be out of range? - Should't allow
            document.getElementById("valueItem").appendChild(elSelect);
            document.getElementById("valueItem").className = "item item-input item-select";
          }
        };

        $scope.readType();

        if ($scope.oTopic.type != "None") {
          document.getElementById('observation.value').value = $scope.oObservation.value;
        }

        document.getElementById('observation.observationDate').value = $scope.oObservation.observationDate;
        document.getElementById('observation.observationTime').value = helperGetTimeFromDate($scope.oObservation.observationTime);
        document.getElementById('observation.timezone').value = $scope.oObservation.timezone;
        document.getElementById('observation.comment').value = $scope.oObservation.comment;

        // Called when the form is submitted
        $scope.editObservation = function() {
          //Set values of observation

          var tCreationDate = new Date();

          if ($scope.oTopic.type == "None") {
            sObservationValue = null;
          } else {
            sObservationValue = document.getElementById('observation.value').value;
          }

          $scope.oNewObservation = new selfReportStorage.Observation(
            $scope.oObservation.id,
            $scope.topicId,
            sObservationValue,
            $scope.oObservation.creationDate,
            $scope.oObservation.creationTime,
            document.getElementById('observation.observationDate').value,
            new Date(document.getElementById('observation.observationDate').value + " " + document.getElementById('observation.observationTime').value),
            tCreationDate,
            document.getElementById('observation.timezone').value,
            document.getElementById('observation.comment').value
          );


          selfReportStorage.updateObservation($scope.oObservation.id, $scope.oNewObservation);
          $state.go("listTopics");

        };
      }
    ]
  );
});
