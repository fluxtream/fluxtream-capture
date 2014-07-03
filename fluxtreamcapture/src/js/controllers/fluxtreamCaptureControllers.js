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

  fluxtreamCaptureControllers.controller('createTopicController', ['$scope', '$stateParams',
    function($scope, $stateParams) {
    }
  ]);

  fluxtreamCaptureControllers.controller('editObservationController', ['$scope', '$stateParams', 'StorageService',
    function($scope, $stateParams, storage) {
      $scope.observations = storage.get("observations");

      storage.getTopic(observations[$stateParams.observationId].topicId, function(topic) {
        $scope.topic = topic;
        console.log("Topic ID value: ");
        console.log($scope.topic);
      });


    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicController', ['$scope', '$stateParams',
    function($scope, $stateParams) {
      $scope.topicId = $stateParams.topicId;
      $scope.name = "Weight";
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
