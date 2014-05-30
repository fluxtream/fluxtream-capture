define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var SelfReport = new Application("self-report", "Yury Chernushenko", "icon-pencil", "Self Report");

    SelfReport.setup = function() {
        forge.logging.info("initializing the SelfReport app");
//        angular.module('SelfReportApp', [])
//            .controller('SelfReportController', ['$scope', function ($scope) {
//                $scope.greetMe = 'Old Pal';
//            }]);
//        angular.element(document).ready(function() {
//            angular.bootstrap(document, ['SelfReportApp']);
//        });
    };

    return SelfReport;
});