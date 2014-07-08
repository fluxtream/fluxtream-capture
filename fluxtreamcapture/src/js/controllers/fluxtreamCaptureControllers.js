define([
  'flxModules',
  'storage'
], function(flxModules) {

  var fluxtreamCaptureControllers = flxModules.flxControllers;

  fluxtreamCaptureControllers.controller('listTopicsController', ['$scope', '$timeout', 'StorageService',
    function($scope, $timeout, storage) {

      // Infinite scroll
      $scope.loadMoreObservations = function() {
        $timeout(function() {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.$broadcast('scroll.resize');
        }, 1000);
      };

      storage.getTopics(function(topics) {
        $scope.topics = topics;
      });
    }
  ]);

  fluxtreamCaptureControllers.controller('makeObservationController', ['$scope', '$stateParams', '$location', 'StorageService',
    function($scope, $stateParams, $location, storage) {
      storage.getTopic($stateParams.topicId, function(topic) {
        $scope.topic = topic;
        console.log("Topic ID value: ");
        console.log($scope.topic);
      });

      //Create id generator
      $scope.observation = {
        id: "",
        value: "",
        creationDate: "",
        creationTime: "",
        observationDate: "",
        observationTime: "",
        timezone: "",
        topicId: $stateParams.topicId,
        comment: ""
      }

      $scope.observation.observationDate = new Date();
      $scope.observation.observationTime = $scope.observation.observationDate;

      //$scope.observation.id = Date.parse($scope.observation.observationTime);
      //$scope.observation.observationDate = new Date(parseInt($scope.observation.time, 10));

      // Called when the form is submitted
      $scope.createObservation = function() {
        //Set values of observation
        $scope.observation.id = Date.parse($scope.observation.observationTime) + "_" + $scope.observation.topicId;
        $scope.observation.value = document.getElementById('observation.value').value;
        $scope.observation.creationDate = new Date();
        $scope.observation.creationTime = $scope.observation.creationDate;
        $scope.observation.observationDate = document.getElementById('observation.observationDate').value;
        $scope.observation.observationTime = document.getElementById('observation.observationTime').value;
        $scope.observation.timezone = document.getElementById('observation.timezone').value;
        $scope.observation.comment = document.getElementById('observation.comment').value;

        console.log($scope.observation);

        storage.push("observations", $scope.observation);
        $location.path("makeObservation");
      };
    }
  ]);

  fluxtreamCaptureControllers.controller('createTopicController', ['$scope', '$location', '$stateParams', 'StorageService',
    function($scope, $location, $stateParams, storage) {

      // Toggle range boundaries and step based on topic type none/numeric/range
      $scope.changeType = function(){
        var type = document.getElementById('topic.type').value;
        if (type == "None"){
          document.getElementById('defaultValueItem').style.display = "none";
          document.getElementById('rangeStartItem').style.display = "none";
          document.getElementById('rangeEndItem').style.display = "none";
          document.getElementById('stepItem').style.display = "none";
        }
        else if (type == "Numeric") {
          document.getElementById('defaultValueItem').style.display = "";
        }
        else if (type == "Range"){
          document.getElementById('defaultValueItem').style.display = "";
          document.getElementById('rangeStartItem').style.display = "";
          document.getElementById('rangeEndItem').style.display = "";
          document.getElementById('stepItem').style.display = "";
        }
      };

      // Called when the form is submitted
      $scope.createTopic = function() {
        //Set values of topic
        var currentTime = new Date();
        storage.getTopics(function(topics) {
          $scope.topics = topics;
        });
        var length = $scope.topics.length;

        //ToDo Topic Name is a mandatory field
        //ToDo If user is pressing + and save button very fast he would get empty entry (if name could be empty)
        //ToDo How we generate the ID for the Topic?
        //Todo any placeholders?
        //ToDo what to do with "status" field
        $scope.newTopic = new storage.Topic(
          length+1,
          currentTime,
          currentTime,
          document.getElementById('topic.name').value,
          document.getElementById('topic.type').value,
          document.getElementById('topic.defaultValue').value,
          document.getElementById('topic.rangeStart').value,
          document.getElementById('topic.rangeEnd').value,
          document.getElementById('topic.step').value
        );

        console.log($scope.newTopic);

        storage.saveTopic($scope.newTopic);
        $location.path("editTopics");
      };

    }
  ]);

  fluxtreamCaptureControllers.controller('editObservationController', ['$scope', '$stateParams', 'StorageService',
    function($scope, $stateParams, storage) {
      var str = new String($stateParams.observationId);
      var IDs = str.split("_");
      var topicId = IDs[1];

      storage.getTopic(topicId, function(topic) {
        $scope.topic = topic;
      });

      $scope.observations = storage.get("observations");

      $scope.observation = $scope.observations.filter(function(entry){
        return entry.id == $stateParams.observationId;
      })[0];

      document.getElementById('observation.value').value = $scope.observation.value;
      document.getElementById('observation.observationDate').value = $scope.observation.observationDate;
      document.getElementById('observation.observationTime').value = $scope.observation.observationTime;
      document.getElementById('observation.timezone').value = $scope.observation.timezone;
      document.getElementById('observation.comment').value = $scope.observation.comment;

      // Called when the form is submitted
      $scope.editObservation = function() {
        //Set values of observation
        $scope.observation.value = document.getElementById('observation.value').value;
        $scope.observation.creationDate = new Date();
        $scope.observation.creationTime = $scope.observation.creationDate;
        $scope.observation.observationDate = document.getElementById('observation.observationDate').value;
        $scope.observation.observationTime = document.getElementById('observation.observationTime').value;
        $scope.observation.timezone = document.getElementById('observation.timezone').value;
        $scope.observation.comment = document.getElementById('observation.comment').value;
        //TODO change creation time of add new change time

        console.log($scope.observation);

        storage.setIndexValue("observations", $scope.observation.id, $scope.observation);
        $location.path("makeObservation");
      };
    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicController', ['$scope', '$location', '$stateParams', 'StorageService',
    function($scope, $location, $stateParams, storage) {
      $scope.topicId = $stateParams.topicId;

      // Toggle range boundaries and step based on topic type none/numeric/range
      $scope.changeType = function(){
        var type = document.getElementById('topic.type').value;
        if (type == "None"){
          document.getElementById('defaultValueItem').style.display = "none";
          document.getElementById('rangeStartItem').style.display = "none";
          document.getElementById('rangeEndItem').style.display = "none";
          document.getElementById('stepItem').style.display = "none";
        }
        else if (type == "Numeric") {
          document.getElementById('defaultValueItem').style.display = "";
        }
        else if (type == "Range"){
          document.getElementById('defaultValueItem').style.display = "";
          document.getElementById('rangeStartItem').style.display = "";
          document.getElementById('rangeEndItem').style.display = "";
          document.getElementById('stepItem').style.display = "";
        }
      };

      storage.getTopic($scope.topicId, function(topic) {
        $scope.topic = topic;

        // Fill the data initially
        document.getElementById('topic.name').value = $scope.topic.name;
        document.getElementById('topic.type').value = $scope.topic.type;
        document.getElementById('topic.defaultValue').value = $scope.topic.defaultValue;
        document.getElementById('topic.rangeStart').value = $scope.topic.rangeStart;
        document.getElementById('topic.rangeEnd').value = $scope.topic.rangeEnd;
        document.getElementById('topic.step').value = $scope.topic.step;

        // Hide/show rangeStart/Stop fields and Steps
        $scope.changeType();
      });

      // Called when the form is submitted
      $scope.saveTopic = function() {
        var currentTime = new Date();

        //ToDo do we need to save rangeStart/rangeEnd if it was defined before, but then type was changed to none
        $scope.newTopic = new storage.Topic(
          $scope.topic.id,
          $scope.topic.creationTime,
          currentTime,
          document.getElementById('topic.name').value,
          document.getElementById('topic.type').value,
          document.getElementById('topic.defaultValue').value,
          document.getElementById('topic.rangeStart').value,
          document.getElementById('topic.rangeEnd').value,
          document.getElementById('topic.step').value
        );

        console.log($scope.newTopic);

        storage.updateTopic($scope.newTopic);
        $location.path("editTopics");
      };

    }
  ]);

  fluxtreamCaptureControllers.controller('historyController', ['$scope', 'StorageService',
    function($scope, storage) {
      // Find unique dates in the array
      var uniqueDate = function(data, key) {
        var result = [];
        for(var i=0; i<data.length; i++) {
          var date = data[i]['observationDate'];

          if (result.indexOf(date) == -1) {
            result.push(date);
          }
        }
        return result;
      }; // unique


      //TODO initialize when the observations list is empty
      storage.getTopics(function(topics) {
        $scope.topics = topics;
      });

      $scope.observations = storage.get("observations");

      if ($scope.observations != null) {
        $scope.uniqueDates = uniqueDate($scope.observations);
      }

      console.log("Unique Dates: ");
      console.log($scope.uniqueDates);

      console.log("Observations: ");
      console.log($scope.observations);
    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicsController', ['$scope', 'StorageService',
    function($scope, storage) {
      $scope.moveItem = function(topic, fromIndex, toIndex) {
        //Move the item in the array
        $scope.topics.splice(fromIndex, 1);
        $scope.topics.splice(toIndex, 0, topic);
      };

      //get list of Topics
      storage.getTopics(function(topics) {
        $scope.topics = topics;
        console.log(topics);
      });
    }
  ]);
});
