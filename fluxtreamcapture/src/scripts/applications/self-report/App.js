define(["core/Application", "core/FlxState", "env"], function(Application, FlxState, env) {

    var SelfReport = new Application("self-report", "Yury Chernushenko", "icon-pencil", "Self Report");

    SelfReport.setup = function() {
        forge.logging.info("initializing the SelfReport app");
        forge.logging.info(App.angularApp);
    };

    SelfReport.renderState = function(state) {
        forge.logging.info(state);
        require(["text!applications/self-report/" + state + ".html"], function (otherTemplate) {
            forge.logging.info(otherTemplate);
        });

        //SHOW OBSERVATION SCREEN
    }

    SelfReport.angularSetup = function() {
        App.angularApp
            .controller('SelfReportController', ['$scope', function ($scope) {

                $("h1.title").html("Create Observation");

                forge.logging.debug("retrieving guest model...");
                var handleSuccess = function(guestModel, textStatus) {
                    forge.logging.debug(guestModel);
                    if (_.isUndefined(guestModel.username)) {
                        forge.logging.info("Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + textStatus);
                        $("body").empty().append("<h1>Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + textStatus + "</h1>")
                    } else
                        $scope.greetMe = guestModel.username;
                };
                $scope.getGuest = function() {
                    if (forge.is.web()) {
                        $.ajax({
                            url: env["fluxtream.home.url"]+"api/v1/guest",
                            xhrFields: {
                                withCredentials: true
                            },
                            success: handleSuccess,
                            error : function(qXHR, textStatus, stackTrace) {
                                forge.logging.debug("status: " + jqXHR.status);
                                forge.logging.debug("status: " + stackTrace);
                            }
                        });
                    } else {
                        forge.request.ajax({
                            type: "GET",
                            url: env["fluxtream.home.url"]+"api/v1/guest",
                            xhrFields: {
                                withCredentials: true
                            },
                            dataType: "json",
                            success: handleSuccess,
                            error : function(response, content, type) {
                                forge.logging.debug(response.statusCode);
                                forge.logging.debug("this is an error, status: " + response.statusCode);
                                forge.logging.debug("this is an error, stack trace: " + content);
                            }
                        });
                    }
                }

                $scope.createObservation = function(topicId) {
                    event.preventDefault();
                    FlxState.router.navigate("self-report/createObservation", {trigger: true});
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

            }]);
    }

    return SelfReport;
});