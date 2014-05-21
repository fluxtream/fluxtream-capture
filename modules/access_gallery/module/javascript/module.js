// Expose the native API to javascript
forge.access_gallery = {
    getPictureList: function (success, error) {
        forge.internal.call('access_gallery.getPictureList', {}, success, error);
    }
};

// Register for our native event
forge.internal.addEventListener("access_gallery.resume", function () {
	alert("Welcome back!");
});
