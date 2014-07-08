define([
  'flxModules',
  'storage'
], function(flxModules) {
  //TODO reload of the page doesn't work

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

  fluxtreamCaptureControllers.controller('createTopicController', ['$scope', '$location', '$stateParams', 'StorageService',
    function($scope, $location, $stateParams, storage) {

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
        var nLength = $scope.aoTopics.length;

        //TODO Topic Name is a mandatory field
        //TODO If user is pressing + and save button very fast he would get empty entry (if name could be empty)
        //TODO How we generate the ID for the Topic?
        //TODO any placeholders?
        //TODO what to do with "status" field
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
        $location.path("editTopics");
      };

    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicController', ['$scope', '$location', '$stateParams', 'StorageService',
    function($scope, $location, $stateParams, storage) {
      $scope.topicId = $stateParams.topicId;

      //TODO whe the type is changed additional effort might be needed to recound all the values
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
        $location.path("editTopics");
      };

    }
  ]);

  fluxtreamCaptureControllers.controller('createObservationController', ['$scope', '$stateParams', '$location', 'StorageService',
    function($scope, $stateParams, $location, storage) {
      //TODO refactor screen - no two lines for the comment field

      $scope.oTopic = storage.readTopic($stateParams.topicId);
      $scope.tObservationDate = new Date();
      $scope.tObservationTime = $scope.tObservationDate;

      //TODO when we save start and end of the range even if the value type was changes there might be confusion about the Default value (if changed several times)
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

          //TODO default value could be out of range?
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
          document.getElementById('observation.observationTime').value,
          tCreationDate,
          document.getElementById('observation.timezone').value,
          document.getElementById('observation.comment').value
        );

        storage.createObservation($scope.oNewObservation);
        $location.path("makeObservation");
      };
    }
  ]);

  fluxtreamCaptureControllers.controller('editObservationController', ['$scope', '$stateParams', '$location', 'StorageService',
    function($scope, $stateParams, $location, storage) {
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

          //TODO default value could be out of range?
          document.getElementById("valueItem").appendChild(elSelect);
          document.getElementById("valueItem").className = "item item-input item-select";
        }
      };

      $scope.readType();

      if ($scope.oTopic.type != "None") {
        document.getElementById('observation.value').value = $scope.oObservation.value;
      }

      document.getElementById('observation.observationDate').value = $scope.oObservation.observationDate;
      document.getElementById('observation.observationTime').value = $scope.oObservation.observationTime;
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
          document.getElementById('observation.observationTime').value,
          tCreationDate,
          document.getElementById('observation.timezone').value,
          document.getElementById('observation.comment').value
        );

        storage.updateObservation($scope.oObservation.id, $scope.oNewObservation);
        $location.path("makeObservation");
      };
    }
  ]);
});
