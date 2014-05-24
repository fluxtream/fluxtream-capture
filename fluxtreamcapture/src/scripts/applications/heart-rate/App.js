define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var HeartRate = new Application("heart-rate", "Randy Sargent", "glyphicon-heart-empty", "Heart Rate");

    HeartRate.setup = function() {
        forge.logging.info("initializing the HeartRate app");
    };

    return HeartRate;
});