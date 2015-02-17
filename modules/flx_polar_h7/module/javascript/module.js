// Expose the native API to javascript
forge.flx_polar_h7 = {
  isBLESupported: function(success, error) {
    forge.internal.call('flx_polar_h7.isBLESupported', {}, success, error);
  },
  startService: function(uploadURL, accessToken, success, error) {
    forge.internal.call('flx_polar_h7.startService', {uploadURL: uploadURL, accessToken: accessToken}, success, error);
  },
  stopService: function(success, error) {
    forge.internal.call('flx_polar_h7.stopService', {}, success, error);
  },
  lockCurrentDevice: function(success, error) {
    forge.internal.call('flx_polar_h7.lockCurrentDevice', {}, success, error);
  },
  unlockCurrentDevice: function(success, error) {
    forge.internal.call('flx_polar_h7.unlockCurrentDevice', {}, success, error);
  }
};
