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
  'services/login-service',
  'services/user-prefs-service',
  'services/device-id-service'
], function(appModules) {
  
  appModules.services.factory("PushNotificationService", [
    "LoginService",
    "UserPrefsService",
    "DeviceIdService",
    '$state',
    function(loginService, userPrefs, deviceIdService, $state) {
      
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
        if (!forge.is.web()) {
          deviceIdService.getDeviceIdAsync(function(deviceId) {
            forge.logging.info("Subscribing to push notification channel: channel_" + deviceId);
            forge.parse.push.subscribe("channel_" + deviceId,
              // Success
              function() {
                forge.logging.info("Subscription to push notification channel successful");
              },
              // Error
              function(content) {
                forge.logging.info("Subscription to push notification channel failed");
                forge.logging.info(content);
              }
            );
          });
        }
      });
      
      // Register to push notification events
      forge.event.messagePushed.addListener(function(pushNotificationData) {
        forge.logging.info("Received push notification");
        forge.logging.info(pushNotificationData);
        // Determine if the app with active or not when the push notification arrived (note: on Android, always consider the app was not active)
        if (Date.now() - appResumeTime > 3000 && !forge.is.android()) {
          forge.logging.info("App was active: " + (Date.now() - appResumeTime) + " > " + 3000);
          appActiveOnNotification = true;
        } else {
          forge.logging.info("App was not active: " + (Date.now() - appResumeTime) + " <= " + 3000);
          appActiveOnNotification = false;
        }
        // Remember the push notification information
        postToLoad = pushNotificationData.postId; // might be undefined
        notificationMessage = pushNotificationData.alert;
        // If the user is already authenticated, apply the push notification (otherwise it'll be postponed until the user is logged in)
        if (loginService.isAuthenticated()) {
          loadPostScreen();
        } else {
          forge.logging.info("Not authenticated yet, waiting to redirect push notification");
        }
      });
      
      // Listen to the 'app resumed' event to know the last resume time
      forge.event.appResumed.addListener(function(data) {
        forge.logging.info("App resumed");
        forge.logging.info(data);
        appResumeTime = Date.now();
      });
      
      /**
       * Loads the wall post screen for the latest push notification if the app was not running when it was received.
       * Show a message to the user
       * 
       * @returns {undefined}
       */
      function loadPostScreen() {
        forge.logging.info("Load post screen");
        if (postToLoad) {
          // There is a post to view
          if (!appActiveOnNotification) {
            // Notification was pressed from OS, show the page now
            forge.logging.info("Loading wall post " + postToLoad);
            $state.go("wallPost", {postId: postToLoad});
          } else {
            forge.logging.info("App was active on notification, not showing post");
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
          forge.logging.info("No wall post to load");
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
