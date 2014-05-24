define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var PicturesUpload = new Application("pictures-upload", "Julien Dupuis", "glyphicon-camera", "Settings");

    PicturesUpload.setup = function() {
        forge.logging.info("initializing the PicturesUpload app");
    };

    return PicturesUpload;
});