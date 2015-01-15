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
      
      // Access token used for subsequent communication with the server
      var myAccessToken = "";
      
      function setAccessToken(accessToken) {
        myAccessToken = accessToken;
      }
      
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
        forge.logging.info("Get selected coaches with token " + myAccessToken);
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted",
          data: {
            "access_token": myAccessToken,
            "ownCoachesOnly": ownCoachesOnly
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Getting selected coach list successful");
            forge.logging.info(JSON.stringify(data));
            if (!ownCoachesOnly) {
              coachList = data;
            }
            success(data);
          },
          error: function(content) {
            forge.logging.info("Error while getting selected coach list");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Fetches the full list of coaches
       */
      function getCoachList(success, error) {
        forge.logging.info("Get coach list");
        getCoaches(false, success, error);
      }
      
      /**
       * Fetches the list of coaches of the local user
       */
      function getSelectedCoaches(success, error) {
        forge.logging.info("Get selected coaches");
        getCoaches(true, success, error);
      }
      
      /**
       * Adds a coach to the coach list
       */
      function addCoach(coachUsername, success, error) {
        forge.logging.info("Adding coach: " + coachUsername);
        forge.request.ajax({
          type: "POST",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "?access_token=" + myAccessToken,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Adding coach successful");
            forge.logging.info(JSON.stringify(data));
            success();
          },
          error: function(content) {
            forge.logging.info("Adding coach failed");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Removes a coach from the coach list
       */
      function removeCoach(coachUsername, success, error) {
        forge.logging.info("Removing coach: " + coachUsername);
        forge.request.ajax({
          type: "DELETE",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "?access_token=" + myAccessToken,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Removing coach successful");
            forge.logging.info(JSON.stringify(data));
            success();
          },
          error: function(content) {
            forge.logging.info("Removing coach failed");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Fetches the list of connectors and whether they are shared with the given coach
       */
      function getConnectors(coachUsername, success, error) {
        forge.logging.info("Get connectors: " + coachUsername);
        forge.request.ajax({
          type: "GET",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "/connectors",
          data: {
            access_token: myAccessToken
          },
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Get connectors for coach success");
            forge.logging.info(JSON.stringify(data));
            success(data.sharedConnectors);
          },
          error: function(content) {
            forge.logging.info("Get connectors for coach failed");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Marks a connector as shared with a given coach
       */
      function shareConnectorWithCoach(coachUsername, connectorName, success, error) {
        forge.logging.info("Share connector " + connectorName + " with coach " + coachUsername);
        forge.request.ajax({
          type: "POST",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "/connectors/" + connectorName + "?access_token=" + myAccessToken,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Share connector success");
            forge.logging.info(JSON.stringify(data));
            success();
          },
          error: function(content) {
            forge.logging.info("Share connector failed");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      /**
       * Marks a connector as not shared with a given coach
       */
      function unshareConnectorWithCoach(coachUsername, connectorName, success, error) {
        forge.logging.info("Unshare connector " + connectorName + " with coach " + coachUsername);
        forge.request.ajax({
          type: "DELETE",
          url: loginService.getTargetServer() + "api/v1/buddies/trusted/" + coachUsername + "/connectors/" + connectorName + "?access_token=" + myAccessToken,
          headers: {
            'Content-Type': 'application/json'
          },
          dataType: "json",
          success: function(data, code) {
            forge.logging.info("Unshare connector success");
            forge.logging.info(JSON.stringify(data));
            success();
          },
          error: function(content) {
            forge.logging.info("Unshare connector failed");
            forge.logging.info(content);
            error(content);
          }
        });
      }
      
      // Public API
      return {
        setAccessToken: setAccessToken,
        addCoach: addCoach,
        removeCoach: removeCoach,
        getSelectedCoaches: getSelectedCoaches,
        getCoachList: getCoachList,
        getCoachByUsername: getCoachByUsername,
        getConnectors: getConnectors,
        shareConnectorWithCoach: shareConnectorWithCoach,
        unshareConnectorWithcoach: unshareConnectorWithCoach
      };
      
    }
  ]);
  
});
