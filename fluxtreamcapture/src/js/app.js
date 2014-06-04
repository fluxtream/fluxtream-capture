var app = angular.module('fluxtreamCapture', ['ionic']);

app.controller('NavController', function($scope, $ionicSideMenuDelegate) {
    forge.logging.debug("initializing NavController...");
    $scope.toggleRight = function() {
        $ionicSideMenuDelegate.toggleRight();
    }
});

app.config(function($stateProvider, $urlRouterProvider) {

    $stateProvider
        .state('home', {
            url: "/home",
            abstract: true,
            templateUrl: "home.html"
        })
        .state('home.report', {
            url: "/report",
            views: {
                'report-tab': {
                    templateUrl: "report.html"
                }
            }
        })
        .state('home.topics', {
            url: "/topics",
            views: {
                'topics-tab': {
                    templateUrl: "topics.html"
                }
            }
        })
        .state('settings', {
            url: "/settings",
            templateUrl: "settings.html"
        });


    $urlRouterProvider.otherwise("/home/report");

});
