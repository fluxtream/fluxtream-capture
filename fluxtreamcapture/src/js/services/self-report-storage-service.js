/**
 * This service allows to save data for the offline mode on the client side
 */
define([
  'app-modules',
  'config/env',
  'services/login-service',
  'services/base64'
], function(appModules, env, storage) {

  appModules.services.factory('SelfReportStorageService',
    ["Base64", "$http", "LoginService", '$rootScope', "UserPrefsService",
    function(Base64, $http,  loginService, $rootScope, userPrefs) {
    //TODO Save values to forge.prefs.set(key, value);
    //TODO When to check if the storage was initialized?
    //TODO Add all functions as methods of the class
    //TODO Implement async versions of the functions
    //TODO Does it required to save update time for Observation and Topic?
    //TODO How Topic ID would be generated?
    //TODO timezone should be fixed - should be local time + offset in the timezone
    //TODO create user and database when user is created in fluxtream
    //TODO couchdb communication should be changed to https

    //Stores Topics information
    var dbTopics;
    var dbObservations;
    var dbDeleteTopics;
    var dbDeleteObservations;
    var dbNameTopics;
    var dbNameObservations;
    var dbNameDeletedTopics;
    var dbNameDeletedObservations;
    var remoteCouchTopicsAddress;
    var remoteCouchObservationsAddress;
    var remoteCouchDeletedTopicsAddress;
    var remoteCouchDeletedObservationsAddress;
    var backendLink;
    var userLogin;
    var userCouchDBToken;
    var bIsInitialized = 0;
    var bIsTopicsSynced = 0;
    var bIsObservationsSynced = 0;
    var bIsOffline = 0;
    var bIsOfflineChangesForTopicsMade = 0;
    var bIsOfflineChangesForObservationsMade = 0;
    // Client memory values
    var aoCachedTopics;
    var aoCachedObservations;
    var aoObservationsToSync;
	
    function notifyFluxtreamCaptureUpdater(){
      var updateNotificationURL = loginService.getTargetServer() + "fluxtream_capture/notify";
      forge.request.ajax({
        type: "POST",
        data: { access_token: loginService.getAccessToken() },
        url: updateNotificationURL,
        success: function() {forge.logging.info("FluxtreamCapture updater was notified");},
        error: function() {forge.logging.info("Could not notify the FluxtreamCapture updater");}
	    });
	    forge.logging.info("sent sync notification to Fluxtream Capture updater @ " + updateNotificationURL );
	  };

    function initialize(){
      if(!bIsInitialized){
        aoCachedTopics = [];
        aoCachedObservations = [];
        aoObservationsToSync = [];

        // Main topics and observations names/links
        dbNameTopics = "self_report_db_topics_" + loginService.getUserName();
        dbNameObservations = "self_report_db_observations_" + loginService.getUserName();
        remoteCouchTopicsAddress = env['fluxtream.couch.login.url'] + dbNameTopics;
        remoteCouchObservationsAddress = env['fluxtream.couch.login.url'] + dbNameObservations;

        // Deleted topics and observations names/links
        dbNameDeletedTopics = "self_report_db_deleted_topics_" + loginService.getUserName();
        dbNameDeletedObservations = "self_report_db_deleted_observations_" + loginService.getUserName();
        remoteCouchDeletedTopicsAddress = env['fluxtream.couch.login.url'] + dbNameDeletedTopics;
        remoteCouchDeletedObservationsAddress = env['fluxtream.couch.login.url'] + dbNameDeletedObservations;
        backendLink = env['fluxtream.home.url'];


        // Creating in case of the offline for fluxtream backend
        dbTopics = new PouchDB(dbNameTopics);
        dbObservations = new PouchDB(dbNameObservations);
        dbDeleteTopics = new PouchDB(dbNameDeletedTopics);
        dbDeleteObservations = new PouchDB(dbNameDeletedObservations);
        
        $.ajax({
          url: backendLink + 'api/v1/couch/?access_token=' + userPrefs.get('login.fluxtream_access_token'),
          type: 'PUT',
          xhrFields: {
            withCredentials: true
          },
          success: function(result) {
            forge.logging.info("Successfully created CouchDB (initialize)");
            // Get token and user name
            userLogin = result.user_login;
            userCouchDBToken = result.user_token;

            // Create Local Pouch DB
            CreateLocalPouchDB();

            // Topic and Observations should be removed from the main database, but should be saved into a new one
            CreateLocalDeletedPouchDB();

            bIsInitialized = 1;
            $rootScope.$broadcast('event:initialized');
          },
          error: function(result) {
            forge.logging.error("Error while creating CouchDB (initialize): ");
            console.dir(result);
            $rootScope.$broadcast('event:initFailed');
          }
        });
      } else {
        $rootScope.$broadcast('event:initialized');
        forge.logging.info("Already initialized (initialize)");
      }
    }
    
    // If the topics were synced with a server
    function isTopicsSynced(){
      return bIsTopicsSynced;
    }

    // If the observations were synced with a server
    function isObservationsSynced(){
      return bIsObservationsSynced;
    }

    // (Public) If the initialization passed
    function isInitialized(){
      return bIsInitialized;
    }

    /*
    * (Private) Used in initialize to create Main DB on client side
    * */
    function CreateLocalPouchDB () {
      // Create Local PouchDB
      if ((userLogin != '') && (userCouchDBToken != '')) {
        remoteCouchTopicsAddress = 'http://' + userLogin + ':' + userCouchDBToken + remoteCouchTopicsAddress;
        remoteCouchObservationsAddress = 'http://' + userLogin + ':' + userCouchDBToken + remoteCouchObservationsAddress;
      }
    }

    /*
    * (Private) Used while deleting Topics or observations
    * */
    function CreateLocalDeletedPouchDB () {
      // Create Local PouchDB for deleted Topics and Observations
      if ((userLogin != '') && (userCouchDBToken != '')) {
        remoteCouchDeletedTopicsAddress = 'http://' + userLogin + ':' + userCouchDBToken + remoteCouchDeletedTopicsAddress;
        remoteCouchDeletedObservationsAddress = 'http://' + userLogin + ':' + userCouchDBToken + remoteCouchDeletedObservationsAddress;
      }
    }

    function Topic (id, creationTime, updateTime, name, type,
                    defaultValue, rangeStart, rangeEnd, step, topicNumber){
      this.id = id.toString();
      this.creationTime = creationTime;
      this.updateTime = updateTime;
      this.name = name;
      this.type = type;
      this.defaultValue = defaultValue;
      this.rangeStart = rangeStart;
      this.rangeEnd = rangeEnd;
      this.step = step;
      this.topicNumber = topicNumber;
    }

    function Observation (id, topicId, value, creationDate, creationTime, observationDate, observationTime, updateTime, timezone, comment){
      this.id = id.toString();
      this.topicId = topicId;
      this.value = value;
      this.creationDate = creationDate;
      this.creationTime = creationTime;
      this.observationDate = observationDate;
      this.observationTime = observationTime;
      this.updateTime = updateTime;
      this.timezone = timezone;
      this.comment = comment;
    }

    /**
     * (Public) Save Topic into storage
     */
    function createTopic(oTopic) {
      if (bIsOffline === 1) {
        bIsOfflineChangesForTopicsMade = 1;
      }

      // Putting new topic to the end of the array
      oTopic.topicNumber = aoCachedTopics.length;
      aoCachedTopics.push(oTopic);

      // Save topic to client database
      forge.logging.info("Saving Topic on the client side (createTopic)");
      dbTopics.put({
          _id: oTopic.id,
          creationTime: oTopic.creationTime.toISOString(),
          updateTime: oTopic.updateTime.toISOString(),
          name: oTopic.name,
          type: oTopic.type,
          defaultValue: oTopic.defaultValue,
          rangeStart: oTopic.rangeStart,
          rangeEnd: oTopic.rangeEnd,
          step: oTopic.step,
          topicNumber: oTopic.topicNumber},

        function callback(err, result) {
        if (!err) {
          forge.logging.info('Successfully saved a Topic on client side (createTopic)');
        } else {
          forge.logging.error("Error while saving Topic on the client side (createTopic): " + err);
          $rootScope.$broadcast('event:internalError');
        }
      });

      forge.logging.info("Saving Topic on the server side (createTopic)");
      // Synchronize with the server
      syncTopicsAsyncDB();
    }

    /**
     * (Public) Read Topic from the file
     */
    function readTopic(sTopicId){
      if(!aoCachedTopics){
        forge.logging.info("Reading from empty list of Topics (readTopic)");
      }

      var oTopic = aoCachedTopics.filter(function(oEntry){
        return oEntry.id == sTopicId;
      })[0];

      return(oTopic);
    }

    /**
     * (Public) Read Topics from the database
     */
    function readTopicsDB(){
      if(aoCachedTopics.length === 0){
        aoCachedTopics = [];

        dbTopics.allDocs({include_docs: true}, function(err, response) {
          response.rows.forEach( function (row)
          {
            //forge.logging.info(row.doc.name);
            var oNextTopic = new Topic(
              row.doc._id,
              row.doc.creationTime,
              row.doc.updateTime,
              row.doc.name,
              row.doc.type,
              row.doc.defaultValue,
              row.doc.rangeStart,
              row.doc.rangeEnd,
              row.doc.step,
              row.doc.topicNumber
            );

            aoCachedTopics.push(oNextTopic);
          });

          // TODO in case cache was flushed and page was reloaded we need to
          // get data from the server

          if(aoCachedTopics.length === 0) {
            forge.logging.info("Accessing wrong link (readTopicsDB)");
          }

          reorderTopics();
          $rootScope.$broadcast('event:topics-read-finished');
        });
      } else {
        $rootScope.$broadcast('event:topics-read-finished');
      }
    }

    /**
     * (Public) Read Topics and Observations from the database
     */
    function readDBState(){
      // Check if the page was reloaded - aoCachedTopics.length === 0
      if(aoCachedTopics.length === 0){
        aoCachedTopics = [];
        aoCachedObservations = [];

        // Read all topics into memory
        dbTopics.allDocs({include_docs: true}, function(err, response) {
          response.rows.forEach( function (row)
          {
            //forge.logging.info(row.doc.name);
            var oNextTopic = new Topic(
              row.doc._id,
              row.doc.creationTime,
              row.doc.updateTime,
              row.doc.name,
              row.doc.type,
              row.doc.defaultValue,
              row.doc.rangeStart,
              row.doc.rangeEnd,
              row.doc.step,
              row.doc.topicNumber
            );

            aoCachedTopics.push(oNextTopic);
          });

          // Read all observations into memory
          dbObservations.allDocs({include_docs: true}, function(err, response) {
            response.rows.forEach( function (row)
            {
              //forge.logging.info(row.doc.name);
              var oNextObservation = new Observation(
                row.doc._id,
                row.doc.topicId,
                row.doc.value,
                row.doc.creationDate,
                row.doc.creationTime,
                row.doc.observationDate,
                row.doc.observationTime,
                row.doc.updateTime,
                row.doc.timezone,
                row.doc.comment
              );

              aoCachedObservations.push(oNextObservation);
            });

            $rootScope.$broadcast('event:state-read-finished');
          });

          if((aoCachedTopics.length === 0) || (aoCachedObservations.length === 0)){
            forge.logging.info("Accessing wrong link (readDBState)");
          }
        });

      } else {
        $rootScope.$broadcast('event:state-read-finished');
      }
    }

    /**
     * (Public) Read Topic from the database
     */
    function readTopicDB(sTopicId){
      if(aoCachedTopics.length === 0){
        // TODO
      }

      var oTopic = aoCachedTopics.filter(function(oEntry){
        return oEntry.id == sTopicId;
      })[0];

      return oTopic;
    }

    /**
     * (Public) Read Topics from memory
     */
    function readTopics(){
      return aoCachedTopics;
    }


    /**
     * (Public) Delete specific Observation
     */
    function deleteObservation(oObservationToRemove) {
      if (bIsOffline === 1) {
        bIsOfflineChangesForObservationsMade = 1;
      }

      // Delete observation in memory
      var nObservationsArrayLength = aoCachedObservations.length;
      for (var i = 0; i < nObservationsArrayLength; i++) {
        if (aoCachedObservations[i].id == oObservationToRemove.id) {
          aoCachedObservations.splice(i, 1);
          break;
        }
      }

      // Remove Observation from Main Client DB
      dbObservations.get(oObservationToRemove.id, function(err, oObservation) {
        dbObservations.remove(oObservation._id, oObservation._rev, function(err, response) {
          if (!err) {
            forge.logging.info('Successfully deleted Observation on client side (deleteObservation)');
          } else {
            forge.logging.error("Error while deleting Observation on the client side (deleteObservation): " + err);
            $rootScope.$broadcast('event:internalError');
          }
        });
      });

      forge.logging.info("Deleting Observation on the server side (deleteObservation)");
      //Push Observation deletion to the server
      dbObservations.replicate.to(remoteCouchObservationsAddress)
        .on('complete', function () {
          // Successfully synced
          forge.logging.info("Successfully deleted Observation on the server side (deleteObservation)");
		  notifyFluxtreamCaptureUpdater();
        }).on('error', function (err) {
          bIsOffline === 1;
          bIsOfflineChangesForObservationsMade = 1;
          forge.logging.error("Error while deleting Observation on the server side (deleteObservation): " + err);
          $rootScope.$broadcast('event:offline');
        });

      // Save observation to client delete database
      forge.logging.info("Saving Observation on the client side (deleteObservation)");
      dbDeleteObservations.put({
          _id: oObservationToRemove.id + oObservationToRemove.creationDate + oObservationToRemove.creationTime,
          _rev: oObservationToRemove._rev,
          topicId: oObservationToRemove.topicId,
          value: oObservationToRemove.value,
          creationDate: oObservationToRemove.creationDate,
          creationTime: oObservationToRemove.creationTime,
          observationDate: oObservationToRemove.observationDate,
          observationTime: oObservationToRemove.observationTime,
          updateTime: oObservationToRemove.updateTime,
          timezone: oObservationToRemove.timezone,
          comment: oObservationToRemove.comment },

        function callback(err, result) {
          if (!err) {
            forge.logging.info('Successfully saved a Observation on client side Delete DB (deleteObservation)');
          } else {
            forge.logging.error("Error while saving Observation on the client side Delete DB (deleteObservation): " + err);
            $rootScope.$broadcast('event:internalError');
          }
        });

      forge.logging.info("Saving Topic on the server side (deleteObservation)");
      //Push Topic to the server
      //TODO maybe not replication, but just push changes
      dbDeleteObservations.replicate.to(remoteCouchDeletedObservationsAddress)
        .on('complete', function () {
          // Successfully synced
          forge.logging.info("Successfully saved Deleted Observation on the server side Delete DB (deleteObservation)");
		  notifyFluxtreamCaptureUpdater();
        }).on('error', function (err) {
          bIsOffline === 1;
          bIsOfflineChangesForObservationsMade = 1;
          forge.logging.error("Error while saving Deleted Observation on the server side Delete DB (deleteObservation): " + err);
          $rootScope.$broadcast('event:offline');
        });
    }

    /**
     * (Public) Delete specific Topic
     */
    function deleteTopic(oTopicToRemove) {
      if (bIsOffline === 1) {
        bIsOfflineChangesForTopicsMade = 1;
        bIsOfflineChangesForObservationsMade = 1;
      }

      //TODO should be optimized to do most of the operations on the server side
      // Delete topic in memory
      var nTopicsArrayLength = aoCachedTopics.length;
      for (var i = 0; i < nTopicsArrayLength; i++) {
        if (aoCachedTopics[i].id == oTopicToRemove.id) {
          aoCachedTopics.splice(i, 1);
          break;
        }
      }

      // Remove Topic from Main Client DB
      dbTopics.get(oTopicToRemove.id, function(err, oTopic) {
        dbTopics.remove(oTopic._id, oTopic._rev, function(err, response) {
          if (!err) {
            forge.logging.info('Successfully deleted Topic on client side (deleteTopic)');
          } else {
            forge.logging.error("Error while deleting Topic on the client side (deleteTopic): " + err);
            $rootScope.$broadcast('event:internalError');
          }
        });
      });

      forge.logging.info("Deleting Topic on the server side (deleteTopic)");
      // Push Topic deletion to the server
      syncTopicsAsyncDB();

      // Save topic to client delete database
      forge.logging.info("Saving Topic on the client side (deleteTopic)");
      dbDeleteTopics.put({
          _id: oTopicToRemove.id + oTopicToRemove.creationTime,
          creationTime: oTopicToRemove.creationTime,
          updateTime: oTopicToRemove.updateTime,
          name: oTopicToRemove.name,
          type: oTopicToRemove.type,
          defaultValue: oTopicToRemove.defaultValue,
          rangeStart: oTopicToRemove.rangeStart,
          rangeEnd: oTopicToRemove.rangeEnd,
          step: oTopicToRemove.step,
          topicNumber: oTopicToRemove.topicNumber},

        function callback(err, result) {
          if (!err) {
            forge.logging.info('Successfully saved a Topic on client side Delete DB (deleteTopic)');
          } else {
            forge.logging.error("Error while saving Topic on the client side Delete DB (deleteTopic): " + err);
            $rootScope.$broadcast('event:internalError');
          }
        });

      forge.logging.info("Saving Topic on the server side (deleteTopic)");
      //Push Topic to the server
      //TODO maybe not replication, but just push changes
      dbDeleteTopics.replicate.to(remoteCouchDeletedTopicsAddress)
        .on('complete', function () {
          // Successfully synced
          forge.logging.info("Successfully saved Deleted Topic on the server side Delete DB (deleteTopic)");
          notifyFluxtreamCaptureUpdater();
        }).on('error', function (err) {
          bIsOffline === 1;
          bIsOfflineChangesForTopicsMade = 1;
          forge.logging.error("Error while saving Deleted Topic on the server side Delete DB (deleteTopic): " + err);
          $rootScope.$broadcast('event:offline');
        });

      // Delete associated observations
      //TODO maybe change to variant without upgrading whole array
      readObservationsAsyncDB(function(aoCachedObservations){
        var nNumberOfObservations = aoCachedObservations.length;
        var oNextObservationToDelete;
        var i = 0;
        while(i < nNumberOfObservations) {
          if (aoCachedObservations[i].topicId === oTopicToRemove.id){
            oNextObservationToDelete = aoCachedObservations[i];
            // Delete item and return counter one step back
            aoCachedObservations.splice(i,1);
            nNumberOfObservations--;

            // Delete Observations from Main DB
            dbObservations.get(oNextObservationToDelete.id, function(err, oObservation) {
              dbObservations.remove(oObservation._id, oObservation._rev, function(err, response) {
                if (!err) {
                  forge.logging.info('Successfully deleted Observation on client side (deleteTopic)');
                } else {
                  forge.logging.error("Error while deleting Observation on the client side (deleteTopic): " + err);
                  $rootScope.$broadcast('event:internalError');
                }
              });
            });

            forge.logging.info("oNextObservationToDelete:");
            forge.logging.info(oNextObservationToDelete);
            // Add Observation for Deletion DB
            forge.logging.info("Saving Observation on the client side (deleteTopic)");
            dbDeleteObservations.put({
              _id: oNextObservationToDelete.id + oNextObservationToDelete.creationDate + oNextObservationToDelete.creationTime,
              _rev: oNextObservationToDelete._rev,
              topicId: oNextObservationToDelete.topicId,
              value: oNextObservationToDelete.value,
              creationDate: oNextObservationToDelete.creationDate,
              creationTime: oNextObservationToDelete.creationTime,
              observationDate: oNextObservationToDelete.observationDate,
              observationTime: oNextObservationToDelete.observationTime,
              updateTime: oNextObservationToDelete.updateTime,
              timezone: oNextObservationToDelete.timezone,
              comment: oNextObservationToDelete.comment },

              function callback(err, result) {
                if (!err) {
                  forge.logging.info('Successfully saved a Observation on client side Delete DB (deleteTopic)');
                } else {
                  forge.logging.error("Error while saving Observation on the client side Delete DB (deleteTopic): " + err);
                  $rootScope.$broadcast('event:internalError');
                }
              });
          } else {
            i++;
          }
        }

        forge.logging.info("Deleting Observations on the server side (deleteTopic)");
        //Push Observations deletion to the server
        dbObservations.replicate.to(remoteCouchObservationsAddress)
          .on('complete', function () {
            // Successfully synced
            forge.logging.info("Successfully deleted Observations on the server side (deleteTopic)");
            notifyFluxtreamCaptureUpdater();
          }).on('error', function (err) {
            bIsOffline === 1;
            bIsOfflineChangesForObservationsMade = 1;
            forge.logging.error("Error while deleting Observations on the server side (deleteTopic): " + err);
            $rootScope.$broadcast('event:offline');
          });

        forge.logging.info("Saving Deleted Observations on the server side Delete DB (deleteTopic)");
        //Push deleted observations to the server
        //TODO maybe not replication, but just push changes
        dbDeleteObservations.replicate.to(remoteCouchDeletedObservationsAddress)
          .on('complete', function () {
            // Successfully synced
            forge.logging.info("Successfully saved Deleted Observations on the server side Delete DB (deleteTopic)");
            notifyFluxtreamCaptureUpdater();
          }).on('error', function (err) {
            bIsOffline === 1;
            bIsOfflineChangesForObservationsMade = 1;
            forge.logging.error("Error while saving Deleted Observations on the server side Delete DB (deleteTopic): " + err);
            $rootScope.$broadcast('event:offline');
          });
      });
    }

    /**
     * (Public) Read Observations that were not synced to DB from memory
     */
    function readObservationsToSync(){
      return aoObservationsToSync;
    }

    /**
     * (Public) Update Topic in storage
     */
    function updateTopic(oTopic) {
      if (bIsOffline === 1) {
        bIsOfflineChangesForTopicsMade = 1;
      }

      //Find Topic

      var nTopicsArrayLength = aoCachedTopics.length;
      for (var i = 0; i < nTopicsArrayLength; i++) {
        if (aoCachedTopics[i].id == oTopic.id) {
          aoCachedTopics[i] = oTopic;

          // Save topic to client database
          forge.logging.info("Updating Topic on the client side (readObservationsToSync)");
          // TODO what kind of changes could happen???

          dbTopics.get(oTopic.id).then(function(oTopicDB) {
            return dbTopics.put({
              _id: oTopicDB._id,
              _rev: oTopicDB._rev,
              creationTime: oTopicDB.creationTime,
              updateTime: oTopic.updateTime.toISOString(),
              name: oTopic.name,
              type: oTopic.type,
              defaultValue: oTopic.defaultValue,
              rangeStart: oTopic.rangeStart,
              rangeEnd: oTopic.rangeEnd,
              step: oTopic.step,
              topicNumber: oTopic.topicNumber
            });
          }, function(err, response) {
            if (!err) {
              forge.logging.info('Successfully updated Topic on client side (readObservationsToSync)');
            } else {
              forge.logging.error('Error while updating Topic on client side (readObservationsToSync): ' + err);
              $rootScope.$broadcast('event:internalError');
            }
          });

          forge.logging.info("Updating Topic on the server side (readObservationsToSync)");
          //Push Observation to the server
          syncTopicsAsyncDB();
          break;
        }
      }
    }

    /*
    * (Public) Update topics numbers (i.e. ordering) and Sync with a server
    * */
    function updateTopicNumbers(inputTopics) {
      if (bIsOffline === 1) {
        bIsOfflineChangesForTopicsMade = 1;
      }

      aoCachedTopics = inputTopics;

      var nTopicsArrayLength = aoCachedTopics.length;
      for (var i = 0; i < nTopicsArrayLength; i++) {
        (function(cntr) {
          var tCurrentTime = new Date();
          aoCachedTopics[cntr].topicNumber = cntr;

          // Save topic to client database
          dbTopics.get(aoCachedTopics[cntr].id).then(function (oTopicDB) {
            return dbTopics.put({
              _id: oTopicDB._id,
              _rev: oTopicDB._rev,
              creationTime: tCurrentTime,
              updateTime: oTopicDB.updateTime,
              name: oTopicDB.name,
              type: oTopicDB.type,
              defaultValue: oTopicDB.defaultValue,
              rangeStart: oTopicDB.rangeStart,
              rangeEnd: oTopicDB.rangeEnd,
              step: oTopicDB.step,
              topicNumber: aoCachedTopics[cntr].topicNumber
            });
          }, function (err, response) {
            if (!err) {
              forge.logging.info('Successfully updated Topic number on client side (updateTopicNumbers)');
            } else {
              forge.logging.error('Error while updating Topic number on client side (updateTopicNumbers): ' + err);
              $rootScope.$broadcast('event:internalError');
            }
          });
        })(i);
      }

      forge.logging.info('Successfully updated Topics numbers on client side (updateTopicNumbers)');
      forge.logging.info("Updating Topic on the server side (updateTopicNumbers)");
      // Synchronize topics with the server
      syncTopicsAsyncDB();
    }

    /**
     * (Public) Return Topic from aoCachedTopics
     */
    function getTopic(sTopicId){
      var oTopic = aoCachedTopics.filter(function(oEntry){
        return oEntry.id == sTopicId;
      })[0];

      return oTopic;
    }
    
    /**
     * (Public) Returns the first Topic from aoCachedTopics that has the given name, or null if none match
     * If skipTopicId is set, this specific topic won't be returned
     */
    function getTopicWithName(topicName, skipTopicId) {
      var matchingTopics = aoCachedTopics.filter(function(topic) {
        return topic.name.toLowerCase() == topicName.toLowerCase() && topic.id != skipTopicId;
      });
      if (matchingTopics.length) return matchingTopics[0];
      // There is not topic with this name, return null
      return null;
    }
    
    /**
     * (Public) Get Observations from the file asynchronously
     */
    function readObservationsAsync(fCallback){
      if(aoCachedObservations){
        fCallback(aoCachedObservations);
      } else {
        fCallback([]);
      }
    }

    /**
     * (Private) Reorder Topics according their numbers
     */
    function reorderTopics() {
      aoCachedTopics.sort(function(a, b){return a.topicNumber - b.topicNumber});
    }

    /**
     * (Public) Get Topics asynchronously
     */
    function readTopicsAsyncDB(fCallback){
      // TODO should be fetching gradually
      // Get Topics from the server and save locally
      dbTopics.replicate.from(remoteCouchTopicsAddress)
        .on('complete', function () {
          // Successfully synced
          forge.logging.info("Successfully read Topics from the server side (readTopicsAsyncDB)");

          bIsTopicsSynced = 1;
          var newTopicList = [];

          // Read all docs into memory
          dbTopics.allDocs({include_docs: true}, function(err, response) {
            response.rows.forEach( function (row)
            {
              //forge.logging.info(row.doc.name);
              var oNextTopic = new Topic(
                row.doc._id,
                row.doc.creationTime,
                row.doc.updateTime,
                row.doc.name,
                row.doc.type,
                row.doc.defaultValue,
                row.doc.rangeStart,
                row.doc.rangeEnd,
                row.doc.step,
                row.doc.topicNumber
              );

              newTopicList.push(oNextTopic);
            });
            reorderTopics();
            bIsOfflineChangesForTopicsMade = 0;
            aoCachedTopics = newTopicList;
            fCallback(aoCachedTopics);
          });

        }).on('error',  function (err) {
          // Handle error
          forge.logging.error("OFFLINE Error while reading Topics on the server side (readTopicsAsyncDB): " + err);
          aoCachedTopics = [];

          // Read all docs into memory
          dbTopics.allDocs({include_docs: true}, function(err, response) {
            response.rows.forEach( function (row)
            {
              //forge.logging.info(row.doc.name);
              var oNextTopic = new Topic(
                row.doc._id,
                row.doc.creationTime,
                row.doc.updateTime,
                row.doc.name,
                row.doc.type,
                row.doc.defaultValue,
                row.doc.rangeStart,
                row.doc.rangeEnd,
                row.doc.step,
                row.doc.topicNumber
              );

              aoCachedTopics.push(oNextTopic);
            });
            reorderTopics();
            fCallback(aoCachedTopics);
          });
        });
    }

    /**
     * (Public) Sync Topics asynchronously
     */
    function syncTopicsAsyncDB(fCallback) {
      forge.logging.info("Reading Topics from the server side (syncTopicsAsyncDB");
      // Get Topics from the server and save locally
      dbTopics.replicate.from(remoteCouchTopicsAddress)
        .on('complete', function () {
          // Successfully synced
          forge.logging.info("Successfully read Topics from the server side (syncTopicsAsyncDB)");
          bIsTopicsSynced = 1;
          fixTopicDuplicateErrors(function(changesMade) {
            // Read all docs into memory
            dbTopics.allDocs({include_docs: true}, function(err, response) {
              aoCachedTopics = [];
              response.rows.forEach( function (row) {
                var oNextTopic = new Topic(
                  row.doc._id,
                  row.doc.creationTime,
                  row.doc.updateTime,
                  row.doc.name,
                  row.doc.type,
                  row.doc.defaultValue,
                  row.doc.rangeStart,
                  row.doc.rangeEnd,
                  row.doc.step,
                  row.doc.topicNumber
                );
                aoCachedTopics.push(oNextTopic);
              });
              reorderTopics();
              bIsOfflineChangesForTopicsMade = 0;
              if (fCallback) fCallback(aoCachedTopics);
              forge.logging.info(JSON.stringify(aoCachedTopics));
              forge.logging.info("Broadcasting event:topic-list-changed (syncTopicsAsyncDB)");
              $rootScope.$broadcast('event:topic-list-changed');
              // Push Topic to the server
              forge.logging.info("Saving Topic on the server side (syncTopicsAsyncDB)");
              dbTopics.replicate.to(remoteCouchTopicsAddress)
                .on('complete', function () {
                  // Successfully synced
                  forge.logging.info("Successfully saved Topic on the server side (syncTopicsAsyncDB)");
                  notifyFluxtreamCaptureUpdater();
                }).on('error', function (err) {
                  bIsOffline === 1;
                  bIsOfflineChangesForTopicsMade = 1;
                  forge.logging.error("Error while saving Topic on the server side (syncTopicsAsyncDB): " + err);
                  $rootScope.$broadcast('event:offline');
                });
            });
          });
        }).on('error',  function (err) {
          // Handle error
          forge.logging.error("OFFLINE Error while reading Topics on the server side (syncTopicsAsyncDB): " + err);
          // Read all docs into memory
          dbTopics.allDocs({include_docs: true}, function(err, response) {
            aoCachedTopics = [];
            response.rows.forEach(function(row) {
              var oNextTopic = new Topic(
                row.doc._id,
                row.doc.creationTime,
                row.doc.updateTime,
                row.doc.name,
                row.doc.type,
                row.doc.defaultValue,
                row.doc.rangeStart,
                row.doc.rangeEnd,
                row.doc.step,
                row.doc.topicNumber
              );
              aoCachedTopics.push(oNextTopic);
            });
            reorderTopics();
            if (fCallback) fCallback(aoCachedTopics);
          });
          bIsOffline === 1;
          bIsOfflineChangesForTopicsMade = 1;
          $rootScope.$broadcast('event:offline');
        });
    }
    
    /**
     * Automatically merges or renames topics in case of duplicate names.
     * Calls the callback function with a boolean parameter telling if changes have been made.
     * changesMade is an internal parameter for recursive calls
     */
    function fixTopicDuplicateErrors(callback, changesMade) {
      // Check for duplicates (topics with the same name)
      forge.logging.info("Searching for topic duplicates in " + JSON.stringify(aoCachedTopics));
      dbTopics.allDocs({include_docs: true}, function(err, response) {
        for (var i = 0; i < response.rows.length; i++) {
          for (var j = i + 1; j < response.rows.length; j++) {
            var topic1 = response.rows[i].doc;
            var topic2 = response.rows[j].doc;
            if (topic1._id != topic2._id && topic1.name.toLowerCase() == topic2.name.toLowerCase()) {
              forge.logging.info("There are two topics with the same name: " + topic1.name.toLowerCase());
              // Rename topic2
              topic2.name = topic2.name + " 2";
              topic2.updateTime = new Date().toISOString();
              dbTopics.put(topic2, function(err, response) {
                if (err) {
                  forge.logging.error("Error while putting topic (fixTopicDuplicateErrors): " + err);
                  callback(true);
                } else {
                  forge.logging.info("dbTopics.put response (fixTopicDuplicateErrors) : " + JSON.stringify(response));
                  // Duplicate fixed, check for other duplicates
                  fixTopicDuplicateErrors(callback, true);
                }
              });
              return;
            }
          }
        }
        // No duplicates
        forge.logging.info("There are no Topic duplicates (fixTopicDuplicateErrors)");
        callback(changesMade);
      });
    }
    
    /**
     * (Public) Get Observations asynchronously
     */
    function readObservationsAsyncDB(fCallback){
      // TODO should be fetching gradually

      // Get Observations from the server and save locally
      dbObservations.replicate.from(remoteCouchObservationsAddress)
        .on('complete', function () {
          // Successfully synced
          forge.logging.info("Successfully read Observations on the server side (readObservationsAsyncDB)");

          bIsObservationsSynced = 1;
          aoCachedObservations = [];
          bIsOfflineChangesForObservationsMade = 0;

          // Read all docs into memory
          dbObservations.allDocs({include_docs: true}, function(err, response) {
            response.rows.forEach( function (row)
            {
              //forge.logging.info(row.doc.name);
              var oNextObservation = new Observation(
                row.doc._id,
                row.doc.topicId,
                row.doc.value,
                row.doc.creationDate,
                row.doc.creationTime,
                row.doc.observationDate,
                row.doc.observationTime,
                row.doc.updateTime,
                row.doc.timezone,
                row.doc.comment
              );

              aoCachedObservations.push(oNextObservation);
            });
            // Put pre-processing of data
            fCallback(aoCachedObservations);
          });
        }).on('error',  function (err) {
          aoCachedObservations = [];

          // Handle error
          forge.logging.error("OFFLINE Error while reading Observations on the server side (readObservationsAsyncDB): " + err);

          // Read all docs into memory
          dbObservations.allDocs({include_docs: true}, function(err, response) {
            response.rows.forEach( function (row)
            {
              //forge.logging.info(row.doc.name);
              var oNextObservation = new Observation(
                row.doc._id,
                row.doc.topicId,
                row.doc.value,
                row.doc.creationDate,
                row.doc.creationTime,
                row.doc.observationDate,
                row.doc.observationTime,
                row.doc.updateTime,
                row.doc.timezone,
                row.doc.comment
              );

              aoCachedObservations.push(oNextObservation);
            });
            // Put pre-processing of data
            fCallback(aoCachedObservations);
          });
        });
    }

      /**
       * (Public) Sync Observations asynchronously
       */
      function syncObservationsAsyncDB(fCallback){

        // Save observation to server side
        forge.logging.info("Saving Observation on the server side (syncObservationsAsyncDB)");
        //Push Observation to the server
        dbObservations.replicate.to(remoteCouchObservationsAddress)
          .on('complete', function () {
            // Successfully synced
            forge.logging.info("Successfully saved Observation on the server side (syncObservationsAsyncDB)");
            notifyFluxtreamCaptureUpdater();

            // Get Observations from the server and save locally
            dbObservations.replicate.from(remoteCouchObservationsAddress)
              .on('complete', function () {
                // Successfully synced
                forge.logging.info("Successfully read Observations on the server side (syncObservationsAsyncDB)");

                bIsObservationsSynced = 1;
                aoCachedObservations = [];
                bIsOfflineChangesForObservationsMade = 0;

                // Read all docs into memory
                dbObservations.allDocs({include_docs: true}, function(err, response) {
                  response.rows.forEach( function (row)
                  {
                    //forge.logging.info(row.doc.name);
                    var oNextObservation = new Observation(
                      row.doc._id,
                      row.doc.topicId,
                      row.doc.value,
                      row.doc.creationDate,
                      row.doc.creationTime,
                      row.doc.observationDate,
                      row.doc.observationTime,
                      row.doc.updateTime,
                      row.doc.timezone,
                      row.doc.comment
                    );

                    aoCachedObservations.push(oNextObservation);
                  });
                  // Put pre-processing of data
                  fCallback(aoCachedObservations);
                });
              }).on('error',  function (err) {
                aoCachedObservations = [];

                // Handle error
                forge.logging.error("OFFLINE Error while reading Observations on the server side (syncObservationsAsyncDB): " + err);

                // Read all docs into memory
                dbObservations.allDocs({include_docs: true}, function(err, response) {
                  response.rows.forEach( function (row)
                  {
                    //forge.logging.info(row.doc.name);
                    var oNextObservation = new Observation(
                      row.doc._id,
                      row.doc.topicId,
                      row.doc.value,
                      row.doc.creationDate,
                      row.doc.creationTime,
                      row.doc.observationDate,
                      row.doc.observationTime,
                      row.doc.updateTime,
                      row.doc.timezone,
                      row.doc.comment
                    );

                    aoCachedObservations.push(oNextObservation);
                  });
                  // Put pre-processing of data
                  fCallback(aoCachedObservations);
                });
              });

          }).on('error', function (err) {
            bIsOffline === 1;
            bIsOfflineChangesForObservationsMade = 1;
            forge.logging.error("Error while saving Observation on the server side (syncObservationsAsyncDB): " + err);
            $rootScope.$broadcast('event:offline');
          });
      }


    /**
     * (Public) Find unique dates in the array
     */
    function findUniqueDates(aoObservations) {
      var aResultingDates = [];
      var nNumberOfObservations = aoObservations.length;
      var dNextDate;

      for(var i=0; i<nNumberOfObservations; i++) {
        dNextDate = aoObservations[i].observationDate;

        if (aResultingDates.indexOf(dNextDate) == -1) {
          aResultingDates.push(dNextDate);
        }
      }

      return aResultingDates;
    }

    /**
     * (Public) Save Observation
     */
    function createObservation(oObservation) {
      if (bIsOffline === 1) {
        bIsOfflineChangesForObservationsMade = 1;
      }

      aoCachedObservations.push(oObservation);

      // Save observation to client database
      forge.logging.info("Saving Observation on the client side (createObservation)");
      dbObservations.put({
          _id: oObservation.id,
          topicId: oObservation.topicId,
          value: oObservation.value,
          creationDate: oObservation.creationDate.toISOString(),
          creationTime: oObservation.creationTime.toISOString(),
          observationDate: oObservation.observationDate,
          observationTime: oObservation.observationTime,
          updateTime: oObservation.updateTime.toISOString(),
          timezone: oObservation.timezone,
          comment: oObservation.comment},

        function callback(err, result) {
          if (!err) {
            forge.logging.info("Successfully saved Observation on client side (createObservation)");
          } else {
            forge.logging.error("Error while saving Observation on client side (createObservation)" + err);
            $rootScope.$broadcast('event:internalError');
          }
        });

        // Save observation to server side
        forge.logging.info("Saving Observation on the server side (createObservation)");
        //Push Observation to the server
        dbObservations.replicate.to(remoteCouchObservationsAddress)
          .on('complete', function () {
            // Successfully synced
            forge.logging.info("Successfully saved Observation on the server side (createObservation)");
            notifyFluxtreamCaptureUpdater();
          }).on('error', function (err) {
            bIsOffline === 1;
            bIsOfflineChangesForObservationsMade = 1;
            forge.logging.error("Error while saving Observation on the server side (createObservation): " + err);
            $rootScope.$broadcast('event:offline');
          });
    }

    /**
     * (Public) Save Observation to client-side DB
     */
    function syncObservationsDB(){

      // Iterate over temp observations and save them into database
      var len = aoObservationsToSync.length;

      if (len === 0) {
        forge.logging.info("No local observations to sync (syncObservationsDB)");
        $rootScope.$broadcast('event:observations-synced-with-db');
      }

      for (var i=0; i<len; i++) {
        var oObservation = aoObservationsToSync[i];
        // Save observation to client database
        forge.logging.info("Saving Observation on the client side (syncObservationsDB)");
        dbObservations.put({
            _id: oObservation.id,
            topicId: oObservation.topicId,
            value: oObservation.value,
            creationDate: oObservation.creationDate.toISOString(),
            creationTime: oObservation.creationTime.toISOString(),
            observationDate: oObservation.observationDate,
            observationTime: oObservation.observationTime,
            updateTime: oObservation.updateTime.toISOString(),
            timezone: oObservation.timezone,
            comment: oObservation.comment},

          function callback(err, result) {
            if (!err) {
              forge.logging.info("Successfully saved Observation on client side (syncObservationsDB)");
              $rootScope.$broadcast('event:observations-synced-with-db');
            } else {
              forge.logging.error("Error while saving Observation on client side (syncObservationsDB)" + err);
              $rootScope.$broadcast('event:observations-sync-db-problem');
            }
          });
      }

      // Flush temp observations
      aoObservationsToSync = [];
    }

    /**
     * (Public) Save Observation on server-side
     */
    function syncObservationsServer() {
      forge.logging.info("Saving Observation on the server side (syncObservationsServer)");
      //Push Observation to the server
      dbObservations.replicate.to(remoteCouchObservationsAddress)
        .on('complete', function () {
          // Successfully synced
          forge.logging.info("Successfully saved Observation on the server side (syncObservationsServer)");
          notifyFluxtreamCaptureUpdater();
          $rootScope.$broadcast('event:observations-synced-with-server');
        }).on('error', function (err) {
          forge.logging.error("Error while saving Observation on the server side (syncObservationsServer): " + err);
          $rootScope.$broadcast('event:observations-sync-server-problem');
        });
    }

    /**
     * (Public) Read Observation by Id
     */
    function readObservation(sObservationId) {
      if(!aoCachedObservations){
        forge.logging.info("Reading from empty list of Observations (readObservation)");
      }

      var oCachedObservation = aoCachedObservations.filter(function(entry){
        return entry.id == sObservationId;
      })[0];

      return oCachedObservation;
    }

    /**
     * (Public) Read Observations from memory
     */
    function readObservations(){
      if(!aoCachedObservations){
        aoCachedObservations = [];
      }

      return aoCachedObservations;
    }

    /*
    * (Public) Check if CouchDB is reachable
    * */
    function pingCouch(fCallbackTopics, fCallbackObservation){
      var sCouchAddress = env['fluxtream.couch.login.url'];
      sCouchAddress = sCouchAddress.slice( 1 );

      $.ajax({
        url: "http://" + sCouchAddress,
        type: 'GET',
        success: function(response) {
          var result = $.parseJSON(response);

          if(result.couchdb === "Welcome"){
            forge.logging.info("You are online (pingCouch): ");
            bIsOffline = 0;

            // If there were changes in offline mode we need to sync them
            if(bIsOfflineChangesForTopicsMade === 1){
              syncTopicsAsyncDB(fCallbackTopics);
            } else {
              fCallbackTopics(aoCachedTopics);
            }

            if(bIsOfflineChangesForObservationsMade === 1){
              syncObservationsAsyncDB(fCallbackObservation);
            } else {
              fCallbackObservation(aoCachedObservations);
            }
          } else {
            forge.logging.info("You are offline (pingCouch): ");
            bIsOffline = 1;
            $rootScope.$broadcast('event:offline');
          }

        },
        error: function(result) {
          forge.logging.info("You are offline (pingCouch): ");
          bIsOffline = 1;
          $rootScope.$broadcast('event:offline');
        }
      });
    }

    /**
     * (Public) Read bIsOfflineChangesForTopicsMade from memory
     */
    function getOfflineChangesForTopicsMade(){
      return bIsOfflineChangesForTopicsMade;
    }

    /**
     * (Public) Read bIsOfflineChangesForObservationsMade from memory
     */
    function getOfflineChangesForObservationsMade(){
      return bIsOfflineChangesForObservationsMade;
    }

    /**
     * (Public) Update Observation
     */
    function updateObservation(sObservationId, oObservation){
      if (bIsOffline === 1) {
        bIsOfflineChangesForObservationsMade = 1;
      }

      var nNumberOfObservations = aoCachedObservations.length;
      var sNextId;
      for(var i=0; i<nNumberOfObservations; i++) {
        sNextId = aoCachedObservations[i].id;

        if (sNextId == sObservationId) {
          aoCachedObservations[i] = oObservation;

          // Save observation to client database
          forge.logging.info("Updating Observation on the client side (updateObservation)");

          dbObservations.get(oObservation.id).then(function(oObservationDB) {
            return dbObservations.put({
              _id: oObservationDB._id,
              _rev: oObservationDB._rev,
              topicId: oObservation.topicId,
              value: oObservation.value,
              creationDate: oObservation.creationDate,
              creationTime: oObservation.creationTime,
              observationDate: oObservation.observationDate,
              observationTime: oObservation.observationTime,
              updateTime: oObservation.updateTime.toISOString(),
              timezone: oObservation.timezone,
              comment: oObservation.comment
            });
          }, function(err, response) {
            if (!err) {
              forge.logging.info('Successfully updated Observation on client side (updateObservation)');
            } else {
              forge.logging.error('Error while updating Observation on client side (updateObservation): ' + err);
              $rootScope.$broadcast('event:internalError');
            }
          });

          forge.logging.info("Updating Observation on the server side (updateObservation)");
          //Push Observation to the server
          dbObservations.replicate.to(remoteCouchObservationsAddress)
            .on('complete', function () {
              // Successfully synced
              forge.logging.info("Successfully updated Observation on the server side (updateObservation)");
              notifyFluxtreamCaptureUpdater();
            }).on('error', function (err) {
              bIsOffline === 1;
              bIsOfflineChangesForObservationsMade = 1;
              forge.logging.error("Error while updating Observation on the server side (updateObservation): " + err);
              $rootScope.$broadcast('event:offline');
            });
          break;
        }
      }
    }

    /**
     * Public interface
     */
    return {
      //TODO create delete operations for the Topics and Observations
      readTopicsAsyncDB: readTopicsAsyncDB,
      syncTopicsAsyncDB: syncTopicsAsyncDB,
      readObservationsAsync: readObservationsAsync,
      readObservationsAsyncDB: readObservationsAsyncDB,
      syncObservationsAsyncDB: syncObservationsAsyncDB,

      Topic : Topic,
      createTopic: createTopic,
      readTopic: readTopic,
      readTopicDB: readTopicDB,
      readTopics: readTopics,
      readTopicsDB: readTopicsDB,
      updateTopic: updateTopic,
      updateTopicNumbers: updateTopicNumbers,
      deleteTopic: deleteTopic,
      getTopicWithName: getTopicWithName,

      Observation : Observation,
      createObservation: createObservation,
      readObservation: readObservation,
      readObservations: readObservations,
      readObservationsToSync: readObservationsToSync,
      syncObservationsDB: syncObservationsDB,
      syncObservationsServer: syncObservationsServer,
      updateObservation: updateObservation,
      deleteObservation: deleteObservation,

      findUniqueDates: findUniqueDates,
      readDBState: readDBState,

      CreateLocalPouchDB: CreateLocalPouchDB,
      initialize: initialize,
      isInitialized: isInitialized,
      isTopicsSynced: isTopicsSynced,
      isObservationsSynced: isObservationsSynced,

      pingCouch: pingCouch,
      getOfflineChangesForObservationsMade: getOfflineChangesForObservationsMade,
      getOfflineChangesForTopicsMade: getOfflineChangesForTopicsMade
    };

  }]);

});