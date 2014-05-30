$(document).ready(function(){
    require(['FluxtreamCapture'], function (FluxtreamCapture) {
//  forge.prefs.get('settings.username',
//      // Success
//      function(value) {
//        if (!value) {
//        }
//      },
//      // Error
//      function(content) {
//        forge.logging.error("An error occurred while getting the username from prefs");
//      }
//  );
        FluxtreamCapture.initialize();
        forge.urlhandler.urlLoaded.addListener(function(urlHandle){
            forge.logging.info(urlHandle);
        }, function(content){
            forge.logging.error(content);
        })
    });
});
