// Expose the native API to javascript
forge.flx_photoupload = {
  getPhotoList: function(success, error) {
    forge.internal.call('flx_photoupload.getPhotoList', {}, success, error);
  },
  startAutouploadService: function(success, error) {
    forge.internal.call('flx_photoupload.startAutouploadService', {}, success, error);
  },
  setUploadParameters: function(userId, uploadURL, authentication, success, error) {
    forge.internal.call('flx_photoupload.setUploadParameters', {userId: userId, uploadURL: uploadURL, authentication: authentication}, success, error);
  },
  setAutouploadOptions: function(options, success, error) {
    forge.internal.call('flx_photoupload.setAutouploadOptions', {params: options}, success, error);
  },
  stopAutouploadService: function(success, error) {
    forge.internal.call('flx_photoupload.stopAutouploadService', {}, success, error);
  },
  logoutUser: function(success, error) {
    forge.internal.call('flx_photoupload.logoutUser', {}, success, error);
  },
  uploadPhoto: function(photoId, success, error) {
    forge.internal.call('flx_photoupload.uploadPhoto', {photoId: photoId}, success, error);
  },
  arePhotosUploaded: function(photoIds, success, error) {
    forge.internal.call('flx_photoupload.arePhotosUploaded', {photoIds: photoIds}, success, error);
  },
  cancelUpload: function(photoId, success, error) {
    forge.internal.call('flx_photoupload.cancelUpload', {photoId: photoId}, success, error);
  },
  getFacetId: function(photoId, success, error) {
    forge.internal.call('flx_photoupload.getFacetId', {photoId: photoId}, success, error);
  }
};
