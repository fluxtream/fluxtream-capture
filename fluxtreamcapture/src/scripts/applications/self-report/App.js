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
    }

    SelfReport.angularSetup = function() {
        App.angularApp
            .controller('SelfReportController', ['$scope', function ($scope) {
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
                $scope.goSomewhereElse = function() {
                    FlxState.router.navigate("self-report/somewhereElse", {trigger: true});
                }
            }]);
    }

    return SelfReport;
});