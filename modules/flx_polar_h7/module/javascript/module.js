// Expose the native API to javascript
forge.flx_polar_h7 = {
    startService: function(success, error) {
        forge.internal.call('flx_polar_h7.startService', {}, success, error);
    },
    stopService: function(success, error) {
        forge.internal.call('flx_polar_h7.stopService', {}, success, error);
    }
};

// Register for our native event
forge.internal.addEventListener("flx_polar_h7.resume", function () {
	alert("Welcome back!");
});
