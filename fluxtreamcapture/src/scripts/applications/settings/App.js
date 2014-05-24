define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var Settings = new Application("settings", "Candide Kemmler", "icon-cog", "Settings");

    Settings.setup = function() {
        forge.logging.info("initializing the Settings app");
    };

    return Settings;
});