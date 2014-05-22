// Expose the native API to javascript
forge.fc_gallery = {
    getPictureList: function (success, error) {
        forge.internal.call('fc_gallery.getPictureList', {}, success, error);
    }
};

// Register for our native event
forge.internal.addEventListener("fc_gallery.resume", function () {
	alert("Welcome back!");
});
