define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var SelfReport = new Application("self-report", "Yury Chernushenko", "icon-pencil", "Self Report");

    SelfReport.setup = function() {
        forge.logging.info("initializing the SelfReport app");
    };

    return SelfReport;
});