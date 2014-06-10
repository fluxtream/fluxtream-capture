define( [ "env" ], function (env) {

    var App = new Object();

    App.initialize = function() {
        checkAuth();
    };

    function checkAuth() {
        if (forge.is.web())
            checkAuthOnWeb();
        else
            checkAuthOnDevice();
    }

    function checkAuthOnWeb() {
        forge.logging.info("checking auth on web...");
        $.ajax({
            type: "GET",
            url: env["fluxtream.home.url"]+"api/v1/guest",
            xhrFields: {
                withCredentials: true
            },
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: "json",
            success: handleAuthSuccessResponse,
            error : function(jqXHR, textStatus, stackTrace){
                forge.logging.debug("status: " + jqXHR.status);
                forge.logging.debug("status: " + stackTrace);
                if (jqXHR.status===401) {
                    forge.logging.info("Error accessing " + env["fluxtream.home.url"]+"api/v1/guest (status.result is not \"OK\"): "+textStatus);
                    if (forge.is.web()) {
                        window.location=env["fluxtream.home.url"]+"mobile/signIn?r="+env["loggedIn.redirect_uri"];
                    } else {
                        window.location=env["fluxtream.home.url"]+"mobile/signIn?r=fluxtream://mainmenu";
                    }
                } else {
                    forge.logging.info("Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + textStatus);
                    $("body").empty().append("<h1>Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + textStatus + "</h1>")
                }
            }
        });
    }

    function checkAuthOnDevice(){
        forge.logging.info("checking auth on device...");
        forge.request.ajax({
            type: "GET",
            headers: {
                'Authorization': 'Basic ' + btoa(env["test.username"]+":"+env["test.password"])
            },
            url: env["fluxtream.home.url"]+"api/v1/guest",
            dataType: "json",
            success: handleAuthSuccessResponse,
            error : handleAuthErrorResponse
        });
    }

    function handleAuthSuccessResponse(guestModel, textStatus) {
        forge.logging.debug(guestModel);
        if (typeof(guestModel.username)!="undefined")
            loadApps();
        else {
            forge.logging.info("Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + textStatus);
            $("body").empty().append("<h1>Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + textStatus + "</h1>")
        }
    }

    function handleAuthErrorResponse(response, content, type) {
        forge.logging.debug(response.statusCode);
        forge.logging.debug("this is an error, status: " + response.statusCode);
        forge.logging.debug("this is an error, stack trace: " + content);
        if (response.statusCode===401) {
            forge.logging.info("This user is not yet authenticated (http code is 401): \"" + content + "\", redirecting to signIn URL");
            if (forge.is.web()) {
                window.location=env["fluxtream.home.url"]+"mobile/signIn?r="+env["loggedIn.redirect_uri"];
            } else {
                forge.logging.info("user has wrong credentials, let's let him fix that");
                App.renderApp("settings");
            }
        } else {
            forge.logging.info("Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + response.statusCode);
            $("body").empty().append("<h1>Error accessing " + env["fluxtream.home.url"]+"api/v1/guest: " + response.statusCode + "</h1>")
        }
    }

    function loadApps() {
        var app = angular.module('fluxtreamCapture', ['ionic', 'fluxtreamCaptureControllers']);

        App.app = app;

        app.config(function($stateProvider, $urlRouterProvider) {

            $stateProvider
                .state('listTopics', {
                    url: "/makeObservation",
                    templateUrl: "listTopics.html",
                    controller: "listTopicsController"
                })
                .state('makeObservation', {
                    url: "/makeObservation/:topicId",
                    templateUrl: "makeObservation.html",
                    controller: "makeObservationController"
                })
                .state('history', {
                    url: "/history",
                    templateUrl: "history.html",
                    controller: "historyController"
                })
                .state('editTopics', {
                    url: "/editTopics",
                    templateUrl: "editTopics.html",
                    controller: "editTopicsController"
                })
                .state('ediTopic', {
                    url: "/editTopic/:topicId",
                    templateUrl: "editTopic.html",
                    controller: "editTopicController"
                })
                .state('settings', {
                    url: "/settings",
                    templateUrl: "settings.html"
                });


            $urlRouterProvider.otherwise("/makeObservation");

        });
        // now that App.app is defined, let's load up all controllers
        require(["controllers/controller-loader"], function() {
            angular.bootstrap(document, ['fluxtreamCapture']);
        });
    }

    window.App = App;
    return App;
});


