define([
  'flxModules'
], function(flxModules) {

  var fluxtreamCaptureControllers = flxModules.flxControllers;

  fluxtreamCaptureControllers.controller('listTopicsController', ['$scope',
    function($scope) {

      // Delete back button if any
      if ($('#backButton').find('a').length > 0) {
        $('#backButton').removeChild($('#backButton').childNodes[0]);
      }

      $scope.topics = [
        {"id": 1, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Weight1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 2, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Weight2", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 3, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 4, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food2", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 5, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food3", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 6, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Light1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 7, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food4", "type": 1, "step": 1, "defaultValue": 1, "status": 1}
      ];
      //$http.get('/topics.json');

      $scope.observations = [
        {
          'id': "1",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "1",
          'timezoneOffset': "123123",
          'value': "1"
        },
        {
          'id': "2",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "1",
          'timezoneOffset': "123123",
          'value': "4"
        },
        {
          'id': "3",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "2",
          'timezoneOffset': "123123",
          'value': "2"
        },
        {
          'id': "4",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "2",
          'timezoneOffset': "123123",
          'value': "12"
        },
        {
          'id': "5",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "3",
          'timezoneOffset': "123123",
          'value': "3"
        },
        {
          'id': "6",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "4",
          'timezoneOffset': "123123",
          'value': "0"
        },
        {
          'id': "7",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "5",
          'timezoneOffset': "123123",
          'value': "13"
        },
        {
          'id': "8",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "6",
          'timezoneOffset': "123123",
          'value': "12"
        },
        {
          'id': "9",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "7",
          'timezoneOffset': "123123",
          'value': "14"
        }
      ];
    }
  ]);

  fluxtreamCaptureControllers.controller('makeObservationController', ['$scope', '$stateParams',
    function($scope, $stateParams) {
      $scope.topicId = $stateParams.topicId;
      $scope.name = "Weight";



      //	Change footer
      //$( "#footer-left" ).children().replaceWith( "Cancel" );
      //$( "#footer-right" ).children().replaceWith( "Save" );

      //Show back button
      //if ($('#backButton').find('a').length == 0) {
      //	$("#backButton").append("<a href='#/makeObservation' class='button icon-left ion-chevron-left button-clear'>Back</a>");
      //}	
    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicController', ['$scope', '$stateParams',
    function($scope, $stateParams) {
      $scope.topicId = $stateParams.topicId;
      $scope.name = "Weight";

      //  Change footer
      //$( "#footer-left" ).children().replaceWith( "Cancel" );
      //$( "#footer-right" ).children().replaceWith( "Save" );

      //Show back button
      //if ($('#backButton').find('a').length == 0) {
      //  $("#backButton").append("<a href='#/makeObservation' class='button icon-left ion-chevron-left button-clear'>Back</a>");
      //} 
    }
  ]);

  fluxtreamCaptureControllers.controller('historyController', ['$scope',
    function($scope) {
      $scope.topics = [
        {"id": 1, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Weight1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 2, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Weight2", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 3, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 4, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food2", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
      ];
      //$http.get('/topics.json');

      $scope.observations = [
        {
          'id': "1",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "1",
          'timezoneOffset': "123123",
          'value': "1"
        },
        {
          'id': "2",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "1",
          'timezoneOffset': "123123",
          'value': "4"
        },
        {
          'id': "3",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "2",
          'timezoneOffset': "123123",
          'value': "2"
        },
        {
          'id': "4",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "2",
          'timezoneOffset': "123123",
          'value': "12"
        },
        {
          'id': "5",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "3",
          'timezoneOffset': "123123",
          'value': "3"
        },
        {
          'id': "6",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "4",
          'timezoneOffset': "123123",
          'value': "0"
        },
        {
          'id': "7",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "5",
          'timezoneOffset': "123123",
          'value': "13"
        },
        {
          'id': "8",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "6",
          'timezoneOffset': "123123",
          'value': "12"
        },
        {
          'id': "9",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "7",
          'timezoneOffset': "123123",
          'value': "14"
        }
      ];
    }
  ]);

  fluxtreamCaptureControllers.controller('editTopicsController', ['$scope',
    function($scope) {

      $scope.moveItem = function(topic, fromIndex, toIndex) {
        //Move the item in the array
        $scope.topics.splice(fromIndex, 1);
        $scope.topics.splice(toIndex, 0, topic);
      };

      $scope.topics = [
        {"id": 1, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Weight1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 2, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Weight2", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 3, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 4, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food2", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 5, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food3", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 6, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Light1", "type": 1, "step": 1, "defaultValue": 1, "status": 1},
        {"id": 7, "guestId": 1, "creationTime": 12312, "timeUpdated": 123, "name": "Food4", "type": 1, "step": 1, "defaultValue": 1, "status": 1}
      ];
      //$http.get('/topics.json');

      $scope.observations = [
        {
          'id': "1",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "1",
          'timezoneOffset': "123123",
          'value': "1"
        },
        {
          'id': "2",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "1",
          'timezoneOffset': "123123",
          'value': "4"
        },
        {
          'id': "3",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "2",
          'timezoneOffset': "123123",
          'value': "2"
        },
        {
          'id': "4",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "2",
          'timezoneOffset': "123123",
          'value': "12"
        },
        {
          'id': "5",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "3",
          'timezoneOffset': "123123",
          'value': "3"
        },
        {
          'id': "6",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "4",
          'timezoneOffset': "123123",
          'value': "0"
        },
        {
          'id': "7",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "5",
          'timezoneOffset': "123123",
          'value': "13"
        },
        {
          'id': "8",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "6",
          'timezoneOffset': "123123",
          'value': "12"
        },
        {
          'id': "9",
          'api': "1",
          'comment': "qqq",
          'end': "123",
          'fullTextDescription': "qeqweqw",
          'guestId': "1",
          'isEmpty': "1",
          'objectType': "1",
          'start': "1231231",
          'apiKeyId': "1",
          'timeUpdated': "123123",
          'tags': "1231231",
          'creationTime': "123123",
          'topicID': "7",
          'timezoneOffset': "123123",
          'value': "14"
        }
      ];
        }
  ]);

});
