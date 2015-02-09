// Expose the native API to javascript
forge.flx_toggle_keyboard = {
    showAlert: function (text, success, error) {
        forge.internal.call('flx_toggle_keyboard.showAlert', {text: text}, success, error);
    }
};

// Register for our native event
forge.internal.addEventListener("flx_toggle_keyboard.resume", function () {
	alert("Welcome back!");
});
