define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var Settings = new Application("settings", "Candide Kemmler", "icon-cog", "Settings");

    Settings.setup = function() {
        forge.logging.info("initializing the Settings app");
    };

    Settings.angularSetup = function() {
        App.angularApp.controller('SettingsController', ['$scope', function ($scope) {
            $scope.greetMe = 'World';
        }]);
    }

    return Settings;
});