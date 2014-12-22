/**
 * Angular controller for the heart rate screen
 */
define([
  'config/env',
  'app-modules',
  'services/user-prefs-service',
  'services/login-service',
  'services/heart-rate-service'
], function(env, appModules) {
  
  // Heart rate controller
  appModules.controllers.controller('HeartRateController', [
    "$scope",
    '$rootScope',
    'LoginService',
    'UserPrefsService',
    'HeartRateService',
    function($scope, $rootScope, loginService, userPrefs, heartRateService) {
      
      // No heart rate on web
      if (forge.is.web()) return;
      
      // Whether the service is currently enabled
      $scope.serviceEnabled = userPrefs.get('heartrate.' + loginService.getUserId() + ".serviceEnabled");
      
      // Whether a heartrate monitor is currently connected to this app
      $scope.deviceConnected = false;
      
      // Whether the currently connected device is locked to this app
      $scope.deviceLocked = false;
      
      // List of history logs
      $scope.historyLogs = [];
      
      // Current heart rate value
      $scope.heartRate = 0;
      $scope.rr = 0;
      
      $scope.lastReceptionTimestamp = 0;
      $scope.noDataReceivedTimeout = null;
      
      // Listen to broadcasted heart-rate data
      $rootScope.$on("heart-rate-data-received", function(event, data) {
        // Update displayed heart rate
        $scope.heartRate = data.heart_rate;
        $scope.rr = data.rr;
        if ($scope.lastReceptionTimestamp < new Date().getTime() - 5000) {
          $scope.addHistoryLog("Receiving data");
        }
        $scope.lastReceptionTimestamp = new Date().getTime();
        if ($scope.noDataReceivedTimeout) {
          clearTimeout($scope.noDataReceivedTimeout);
        }
        $scope.noDataReceivedTimeout = setTimeout(function() {
          $scope.addHistoryLog("Not receiving data anymore");
        }, 5000);
        $scope.$$phase || $scope.$apply();
      });
      
      $rootScope.$on("heart-rate-info-received", function(event, data) {
        $scope.addHistoryLog(data.message);
      });
      
      $scope.addHistoryLog = function(message) {
        $scope.historyLogs.unshift({
          id: $scope.historyLogs.length,
          message: new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1") + " -> " + message
        });
        $scope.$$phase || $scope.$apply();
      };
      
      $scope.enableService = function() {
        heartRateService.setHeartRateServiceEnabled(true);
        $scope.serviceEnabled = true;
        $scope.$$phase || $scope.$apply();
      };
      
      $scope.disableService = function() {
        heartRateService.setHeartRateServiceEnabled(false);
        $scope.serviceEnabled = false;
        $scope.deviceConnected = false;
        if ($scope.noDataReceivedTimeout) {
          clearTimeout($scope.noDataReceivedTimeout);
        }
        $scope.$$phase || $scope.$apply();
      };
      
      // Update device connected status on internal event received
      forge.internal.addEventListener("heartrate.deviceConnected", function (data) {
        // Broadcast received data
        $scope.deviceConnected = true;
        $scope.$$phase || $scope.$apply();
      });
      forge.internal.addEventListener("heartrate.deviceDisconnected", function (data) {
        $scope.deviceConnected = false;
        $scope.$$phase || $scope.$apply();
      });
      
    }
  ]);
  
});
