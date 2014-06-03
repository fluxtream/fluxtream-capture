define(["core/Application", "core/FlxState"], function(Application, FlxState) {

    var PicturesUpload = new Application("photo-upload", "Julien Dupuis", "glyphicon-camera", "Photo Upload");

    PicturesUpload.setup = function() {
        forge.logging.info("initializing the PicturesUpload app");
    };

    return PicturesUpload;
});