define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var Settings = new Application("settings", "Candide Kemmler", "icon-cog", "Settings");

    Settings.setup = function() {
        forge.logging.info("initializing the Settings app");
        angular.module('SettingsApp', [])
            .controller('SettingsController', ['$scope', function ($scope) {
                $scope.greetMe = 'World';
            }]);
        angular.element(document).ready(function() {
            angular.bootstrap(document, ['SettingsApp']);
        });
    };

    return Settings;
});