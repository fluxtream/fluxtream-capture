String.prototype.upperCaseFirst = function() {
    var lowerCase = this.toLowerCase();
    return lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
};

String.prototype.startsWith = function(s) {
    return this.indexOf(s) === 0;
};

String.prototype.endsWith = function(s) {
    return this.lastIndexOf(s) === this.length - s.length;
};

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
    });
});

