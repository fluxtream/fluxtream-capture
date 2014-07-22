define([
  'flxModules',
  'storage'
], function(flxModules) {
  //TODO reload of the page doesn't work
  //TODO title of the page should be correct

  var fluxtreamCaptureControllers = flxModules.flxControllers;


  fluxtreamCaptureControllers.controller('listTopicsController', ['$scope', '$timeout', 'StorageService',
    function($scope, $timeout, storage) {
      //TODO test continuos scrolling
      // Infinite scroll
      $scope.loadMoreObservations = function() {
        $timeout(function() {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.resize');
        }, 1000);
      };

      storage.readTopicsAsync(function(aoTopics) {
        $scope.aoTopics = aoTopics;
      });
    }
  ]);

  fluxtreamCaptureControllers.controller('historyController', ['$scope', 'StorageService',
    function($scope, storage) {
      //TODO initialize when the observations list is empty
      //TODO check that dates are sorted correctly

      storage.readTopicsAsync(function(topics) {
        $scope.aoTopics = topics;
      });

      storage.readObservationsAsync(function(aoObservations) {
        $scope.aoObservations = aoObservations;
      });

      if ($scope.aoObservations != null) {
        $scope.aoUniqueDates = storage.findUniqueDates($scope.aoObservations);
      }
    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicsController', ['$scope', 'StorageService',
    function($scope, storage) {
      //TODO bug in reordering (if reorder long enough)
      $scope.moveItem = function(oTopic, fromIndex, toIndex) {
        //Move the item in the array
        $scope.aoTopics.splice(fromIndex, 1);
        $scope.aoTopics.splice(toIndex, 0, oTopic);
      };

      //Get list of Topics
      storage.readTopicsAsync(function(aoTopics) {
        $scope.aoTopics = aoTopics;
      });
    }
  ]);

  fluxtreamCaptureControllers.controller('createTopicController', ['$scope', '$state', '$stateParams', 'StorageService',
    function($scope, $state, $stateParams, storage) {

      // Toggle range boundaries and step based on topic type none/numeric/range
      $scope.changeType = function(){
        var sTypeOfTopic = document.getElementById('topic.type').value;
        if (sTypeOfTopic == "None"){
          document.getElementById('defaultValueItem').style.display = "none";
          document.getElementById('rangeStartItem').style.display = "none";
          document.getElementById('rangeEndItem').style.display = "none";
          document.getElementById('stepItem').style.display = "none";
        }
        else if (sTypeOfTopic == "Numeric") {
          document.getElementById('defaultValueItem').style.display = "";
          document.getElementById('rangeStartItem').style.display = "none";
          document.getElementById('rangeEndItem').style.display = "none";
          document.getElementById('stepItem').style.display = "none";
        }
        else if (sTypeOfTopic == "Range"){
          document.getElementById('defaultValueItem').style.display = "";
          document.getElementById('rangeStartItem').style.display = "";
          document.getElementById('rangeEndItem').style.display = "";
          document.getElementById('stepItem').style.display = "";
        }
      };

      //TODO what if the result would not be returned?
      storage.readTopicsAsync(function(aoTopics) {
        $scope.aoTopics = aoTopics;
      });

      // Called when the form is submitted
      $scope.createTopic = function() {
        //Set values of topic
        var tCurrentTime = new Date();
        if (!$scope.aoTopics) $scope.aoTopics = []; // TODO remove this line but fix initialization bug
        var nLength = $scope.aoTopics.length;

        //TODO Topic Name is a mandatory field - Error/Notification message under the header
        //TODO If user is pressing + and save button very fast he would get empty entry (if name could be empty)
        //TODO How we generate the ID for the Topic? - When connecting to server resolve topic Ids first
        //TODO any placeholders? - Should be clear where to enter value
        //TODO what to do with "status" field - use when archive for topics and delete for observations
        $scope.oNewTopic = new storage.Topic(
          nLength,
          tCurrentTime,
          tCurrentTime,
          document.getElementById('topic.name').value,
          document.getElementById('topic.type').value,
          document.getElementById('topic.defaultValue').value,
          document.getElementById('topic.rangeStart').value,
          document.getElementById('topic.rangeEnd').value,
          document.getElementById('topic.step').value
        );

        storage.createTopic($scope.oNewTopic);
        $state.go("editTopics");
      };

    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicController', ['$scope', '$state', '$stateParams', 'StorageService',
    function($scope, $state, $stateParams, storage) {
      $scope.topicId = $stateParams.topicId;

      //TODO when the type is changed it should affect only future created entries
      // Toggle range boundaries and step based on topic type none/numeric/range
      $scope.changeType = function(){
        var sTypeOfTopic = document.getElementById('topic.type').value;
        if (sTypeOfTopic == "None"){
          document.getElementById('defaultValueItem').style.display = "none";
          document.getElementById('rangeStartItem').style.display = "none";
          document.getElementById('rangeEndItem').style.display = "none";
          document.getElementById('stepItem').style.display = "none";
        }
        else if (sTypeOfTopic == "Numeric") {
          document.getElementById('defaultValueItem').style.display = "";
          document.getElementById('rangeStartItem').style.display = "none";
          document.getElementById('rangeEndItem').style.display = "none";
          document.getElementById('stepItem').style.display = "none";
        }
        else if (sTypeOfTopic == "Range"){
          document.getElementById('defaultValueItem').style.display = "";
          document.getElementById('rangeStartItem').style.display = "";
          document.getElementById('rangeEndItem').style.display = "";
          document.getElementById('stepItem').style.display = "";
        }
      };

      //TODO should be done async
      $scope.oTopic = storage.readTopic($scope.topicId);

      // Fill the data initially
      document.getElementById('topic.name').value = $scope.oTopic.name;
      document.getElementById('topic.type').value = $scope.oTopic.type;
      document.getElementById('topic.defaultValue').value = $scope.oTopic.defaultValue;
      document.getElementById('topic.rangeStart').value = $scope.oTopic.rangeStart;
      document.getElementById('topic.rangeEnd').value = $scope.oTopic.rangeEnd;
      document.getElementById('topic.step').value = $scope.oTopic.step;

      // Hide/show rangeStart/Stop fields and Steps
      $scope.changeType();

      // Called when the form is submitted
      $scope.editTopic = function() {
        var tCurrentTime = new Date();

        //Note: we save rangeStart/rangeEnd if it was defined before, but then type was changed to none
        $scope.oNewTopic = new storage.Topic(
          $scope.oTopic.id,
          $scope.oTopic.creationTime,
          tCurrentTime,
          document.getElementById('topic.name').value,
          document.getElementById('topic.type').value,
          document.getElementById('topic.defaultValue').value,
          document.getElementById('topic.rangeStart').value,
          document.getElementById('topic.rangeEnd').value,
          document.getElementById('topic.step').value
        );

        storage.updateTopic($scope.oNewTopic);
        $state.go("editTopics");
      };

    }
  ]);

  fluxtreamCaptureControllers.controller('createObservationController', ['$scope', '$stateParams', '$state', 'StorageService',
    function($scope, $stateParams, $state, storage) {
      //TODO refactor screen - no two lines for the comment field - ask on the ionic forum

      $scope.oTopic = storage.readTopic($stateParams.topicId);
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

        $scope.oNewObservation = new storage.Observation(
          Date.parse($scope.tObservationTime) + "_" + $stateParams.topicId,
          $stateParams.topicId,
          sObservationValue,
          tCreationDate,
          tCreationDate,
          document.getElementById('observation.observationDate').value,
          new Date(document.getElementById('observation.observationDate').value + " " + document.getElementById('observation.observationTime').value),
          tCreationDate,
          document.getElementById('observation.timezone').value,
          document.getElementById('observation.comment').value
        );

        storage.createObservation($scope.oNewObservation);
        $state.go("listTopics");
      };
    }
  ]);

  /**
   * Returns time in 24 format as a string
   */
  function helperGetTimeFromDate(observationTime){
    var hour = observationTime.getHours();  /* Returns the hour (from 0-23) */
    var minutes = observationTime.getMinutes();  /* Returns the minutes (from 0-59) */
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

  fluxtreamCaptureControllers.controller('editObservationController', ['$scope', '$stateParams', '$state', 'StorageService',
    function($scope, $stateParams, $state, storage) {
      $scope.topicId = $stateParams.observationId.split("_")[1];

      $scope.oTopic = storage.readTopic($scope.topicId);
      $scope.oObservation = storage.readObservation($stateParams.observationId);

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

        $scope.oNewObservation = new storage.Observation(
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

        storage.updateObservation($scope.oObservation.id, $scope.oNewObservation);
        $state.go("listTopics");
      };
    }
  ]);

});
