/**
 * This service manages coaching (coach selection and connector sharing) communication with the server
 */
define([
  'app-modules',
  'config/env',
  'services/user-prefs-service'
], function(appModules, env) {
  
  appModules.services.factory('CoachingCommunicationService', [
    "UserPrefsService",
    "LoginService",
    function(userPrefs, loginService) {
      
      // The cached list of coaches
      var coachList = [];
      
      /**
       * Returns the given coach (from the RAM cache)
       */
      function getCoachByUsername(username) {
        var selectedCoach = null;
        coachList.forEach(function(coach) {
          if (coach.username === username) {
            selectedCoach = coach;
          }
        });
        return selectedCoach;
      }
      
      /**
       * Fetches the list of coaches
       */
      function getCoaches(ownCoachesOnly, success, error) {
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted",
          timeout: 10000,
          data: {
            "access_token": loginService.getAccessToken(),
            "ownCoachesOnly": ownCoachesOnly
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            if (!ownCoachesOnly) {
              coachList = data;
            }
            success(data);
          },
          error: function(content) {
            forge.logging.error("Error while getting selected coach list: " + JSON.stringify(content));
            error(content);
          }
        });
      }
      
      /**
       * Fetches the full list of coaches
       */
      function getCoachList(success, error) {
        getCoaches(false, success, error);
      }
      
      /**
       * Returns the Fluxtream user matching the search string
       */
      function findCoach(searchString, success, error) {
        forge.request.ajax({
          type: "POST",
          url: loginService.getTargetServer() + "api/v1/buddies/find?access_token=" + loginService.getAccessToken(),
          timeout: 10000,
          data: {
            username: searchString
          },
          dataType: "json",
          success: function(data, code) {
            success(data);
          },
          error: function(response) {
            if (response.statusCode == '404' || response.statusCode == 404) {
              // No coach found matching searchString
              success(null);
            } else {
              forge.logging.error("An error has occurred while finding coach: " + JSON.stringify(response));
              error(response.content || "An error has occurred");
            }
          }
        });
      }
      
      /**
       * Adds a coach to the coach list
       */
      function addCoach(coachUsername, success, error) {
        forge.request.ajax({
          type: "POST",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "?access_token=" + loginService.getAccessToken(),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            success();
          },
          error: function(content) {
            forge.logging.error("Adding coach failed: " + JSON.stringify(content));
            error(content);
          }
        });
      }
      
      /**
       * Removes a coach from the coach list
       */
      function removeCoach(coachUsername, success, error) {
        forge.request.ajax({
          type: "DELETE",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "?access_token=" + loginService.getAccessToken(),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            success();
          },
          error: function(content) {
            forge.logging.error("Removing coach failed: " + JSON.stringify(content));
            error(content);
          }
        });
      }
      
      /**
       * Fetches the list of connectors and whether they are shared with the given coach
       */
      function getConnectors(coachUsername, success, error) {
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "/connectors",
          timeout: 10000,
          data: {
            access_token: loginService.getAccessToken()
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            success(data.sharedConnectors);
          },
          error: function(content) {
            forge.logging.error("Get connectors for coach failed: " + JSON.stringify(content));
            error(content);
          }
        });
      }
      
      /**
       * Marks a connector as shared with a given coach
       */
      function shareConnectorWithCoach(coachUsername, connectorName, success, error) {
        forge.request.ajax({
          type: "POST",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "/connectors/" + connectorName + "?access_token=" + loginService.getAccessToken(),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            success();
          },
          error: function(content) {
            forge.logging.error("Share connector failed: " + JSON.stringify(content));
            error(content);
          }
        });
      }
      
      /**
       * Marks a connector as not shared with a given coach
       */
      function unshareConnectorWithCoach(coachUsername, connectorName, success, error) {
        forge.request.ajax({
          type: "DELETE",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "/connectors/" + connectorName + "?access_token=" + loginService.getAccessToken(),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            success();
          },
          error: function(content) {
            forge.logging.error("Unshare connector failed: " + JSON.stringify(content));
            error(content);
          }
        });
      }
      
      // Public API
      return {
        addCoach: addCoach,
        removeCoach: removeCoach,
        getCoachList: getCoachList,
        findCoach: findCoach,
        getCoachByUsername: getCoachByUsername,
        getConnectors: getConnectors,
        shareConnectorWithCoach: shareConnectorWithCoach,
        unshareConnectorWithcoach: unshareConnectorWithCoach
      };
      
    }
  ]);
  
});
