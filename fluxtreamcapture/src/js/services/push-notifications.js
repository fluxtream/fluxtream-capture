/**
 * Manages push notification subscriptions and actions.
 * The authenticationDone is expected to be called when the user gets logged in.
 * 
 * Note: on iOS, there is no way to know if the push notification just arrived from the server while the app
 * was running (in which case we don't want to disturb the user), or if the push notification was
 * pressed on in the notification area while the app was not running. This is why we introduce
 * the appResumeTime and appActiveOnNotificaton that will let us know the state of the app when the
 * notification was received.
 */
define([
  'app-modules',
  'config/env',
  'services/login-service',
  'services/user-prefs-service',
  'services/device-id-service'
], function(appModules, env) {
  
  appModules.services.factory("PushNotificationService", [
    "LoginService",
    "UserPrefsService",
    "DeviceIdService",
    '$state',
    '$rootScope',
    function(loginService, userPrefs, deviceIdService, $state, $rootScope) {
      
      // Wall post id associated with the latest push notification
      var postToLoad = null;
      
      // Text message associated with the latest push notification
      var notificationMessage = "";
      
      // Last time the app was resumed (in milliseconds)
      var appResumeTime = Date.now();
      
      // Whether the app was active when the last push notification was received
      var appActiveOnNotification;
      
      // Subscribe to the channel of this device
      userPrefs.onReady(function() {
        if (env["using_parse"]) {
          if (!forge.is.web()) {
            deviceIdService.getDeviceIdAsync(function(deviceId) {
              forge.parse.push.subscribe("channel_" + deviceId,
                // Success
                function() {},
                // Error
                function(content) {
                  forge.logging.error("Subscription to push notification channel failed: " + JSON.stringify(content));
                }
              );
            });
          }
        }
      });
      
      // Register to push notification events
      forge.event.messagePushed.addListener(function(pushNotificationData) {
        // Determine if the app with active or not when the push notification arrived (note: on Android, always consider the app was not active)
        if (Date.now() - appResumeTime > 3000 && !forge.is.android()) {
          appActiveOnNotification = true;
        } else {
          appActiveOnNotification = false;
        }
        // Remember the push notification information
        postToLoad = pushNotificationData.postId; // might be undefined
        notificationMessage = pushNotificationData.alert;
        // If the user is already authenticated, apply the push notification (otherwise it'll be postponed until the user is logged in)
        if (loginService.isAuthenticated()) {
          loadPostScreen();
        }
      });
      
      // Listen to the 'app resumed' event to know the last resume time
      forge.event.appResumed.addListener(function(data) {
        appResumeTime = Date.now();
      });
      
      /**
       * Loads the wall post screen for the latest push notification if the app was not running when it was received.
       * Show a message to the user
       * 
       * @returns {undefined}
       */
      function loadPostScreen() {
        if (postToLoad) {
          // There is a post to view
          if (!appActiveOnNotification) {
            // Notification was pressed from OS, show the page now
            $state.go("wallPost", {postId: postToLoad});
            // If the page was already active, let it know that it must reload
            $rootScope.$broadcast('push-notification-for-post-' + postToLoad);
          } else {
            // App was active on notification, ask the user if they want to see the page now
            // TODO Manage in-app notifications
//            var loadScreen = confirm(notificationMessage + ". Do you want to see it now?"); // TODO Improve the UI of this
//            if (loadScreen) {
//              $state.go("wallPost", {postId: postToLoad});
//            }
          }
          // Reset the post id to avoid viewing it twice
          postToLoad = null;
        } else {
          // There is no wall post to load
        }
      }
      
      /**
       * This function should be called from the logging in process to
       * show the wall post screen when the user is logged in
       */
      function authenticationDone() {
        loadPostScreen();
      }
      
      // Public API
      return {
        authenticationDone: authenticationDone
      };
      
    }
  ]);
  
});
