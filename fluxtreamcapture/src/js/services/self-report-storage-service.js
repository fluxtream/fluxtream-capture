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
    var dbNameTopics;
    var dbNameObservations;
    var remoteCouchTopicsAddress;
    var remoteCouchObservationsAddress;
    var backendLink;
    var userLogin;
    var userCouchDBToken;
    var bIsInitialized = 0;
    var bIsTopicsSynced = 0;
    var bIsObservationsSynced = 0;
    // Client memory values
    var aoCachedTopics;
    var aoCachedObservations;
    var aoObservationsToSync;

    function initialize(){
      if(!bIsInitialized){
        aoCachedTopics = [];
        aoCachedObservations = [];
        aoObservationsToSync = [];

        dbNameTopics = "self_report_db_topics_" + loginService.getUserName();
        dbNameObservations = "self_report_db_observations_" + loginService.getUserName();
        remoteCouchTopicsAddress = env['fluxtream.couch.login.url'] + dbNameTopics;
        remoteCouchObservationsAddress = env['fluxtream.couch.login.url'] + dbNameObservations;
        backendLink = env['fluxtream.home.url'];
        $.ajax({
          url: backendLink + 'api/v1/couch/?access_token=' + userPrefs.get('login.fluxtream_access_token'),
          type: 'PUT',
          xhrFields: {
            withCredentials: true
          },
          success: function(result) {
            console.log("Successfully created CouchDB (initialize)");
            // Get token and user name
            userLogin = result.user_login;
            userCouchDBToken = result.user_token;

            // Create Local Pouch DB
            CreateLocalPouchDB();

            bIsInitialized = 1;
            $rootScope.$broadcast('event:initialized');
          },
          error: function(result) {
            console.log("Error while creating CouchDB (initialize): ");
            console.dir(result);
            $rootScope.$broadcast('event:initFailed');
          }
        });
      } else {
        $rootScope.$broadcast('event:initialized');
        console.log("Already initialized (initialize)");
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

    // If the initialization passed
    function isInitialized(){
      return bIsInitialized;
    }

    function CreateLocalPouchDB () {
      // Create Local PouchDB
      if ((userLogin != '') && (userCouchDBToken != '')) {
        remoteCouchTopicsAddress = 'http://' + userLogin + ':' + userCouchDBToken + remoteCouchTopicsAddress;
        remoteCouchObservationsAddress = 'http://' + userLogin + ':' + userCouchDBToken + remoteCouchObservationsAddress;
        dbTopics = new PouchDB(dbNameTopics);
        dbObservations = new PouchDB(dbNameObservations);
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
    function createTopic(oTopic){
      // Putting new topic to the end of the array
      oTopic.topicNumber = aoCachedTopics.length;
      aoCachedTopics.push(oTopic);

      // Save topic to client database
      console.log("Saving Topic on the client side (createTopic)");
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
          console.log('Successfully saved a Topic on client side (createTopic)');
        } else {
          console.log("Error while saving Topic on the client side (createTopic): " + err);
        }
      });

      console.log("Saving Topic on the server side (createTopic)");
      //Push Topic to the server
      dbTopics.replicate.to(remoteCouchTopicsAddress)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully saved Topic on the server side (createTopic)");
        }).on('error', function (err) {
          // Handle error
          console.log("Error while saving Topic on the server side (createTopic): " + err);
        });
    }

    /**
     * (Public) Read Topic from the file
     */
    function readTopic(sTopicId){
      if(!aoCachedTopics){
        console.log("Reading from empty list of Topics (readTopic)");
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
            //console.log(row.doc.name);
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
            console.log("Accessing wrong link (readTopicsDB)");
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
            //console.log(row.doc.name);
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
              //console.log(row.doc.name);
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
            console.log("Accessing wrong link (readDBState)");
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
      if(!aoCachedTopics){
        console.log("No topics in memory (readTopics)");
      } else {
        console.log("There are some topics in memory (readTopics)");
        console.log(aoCachedTopics);
      }

      return aoCachedTopics;
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
      //Find Topic

      var nTopicsArrayLength = aoCachedTopics.length;
      for (var i = 0; i < nTopicsArrayLength; i++) {
        if (aoCachedTopics[i].id == oTopic.id) {
          aoCachedTopics[i] = oTopic;

          // Save topic to client database
          console.log("Updating Topic on the client side (readObservationsToSync)");
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
              console.log('Successfully updated Topic on client side (readObservationsToSync)');
            } else {
              console.log('Error while updating Topic on client side (readObservationsToSync): ' + err);
            }
          });

          console.log("Updating Topic on the server side (readObservationsToSync)");
          //Push Observation to the server
          dbTopics.replicate.to(remoteCouchTopicsAddress)
            .on('complete', function () {
              // Successfully synced
              console.log("Successfully updated Topic on the server side (readObservationsToSync)");
            }).on('error', function (err) {
              // Handle error
              console.log("Error while updating Topic on the server side (readObservationsToSync): " + err);
            });
          break;
        }
      }
    }

    /*
    * (Public) Update topics numbers and Sync with a server
    * */
    function updateTopicNumbers(inputTopics) {
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
              console.log('Successfully updated Topic number on client side (updateTopicNumbers)');
            } else {
              console.log('Error while updating Topic number on client side (updateTopicNumbers): ' + err);
            }
          });
        })(i);
      }

      console.log('Successfully updated Topics numbers on client side (updateTopicNumbers)');
      console.log("Updating Topic on the server side (updateTopicNumbers)");
      //Push Observation to the server
      dbTopics.replicate.to(remoteCouchTopicsAddress)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully updated Topics on the server side (updateTopicNumbers)");
        }).on('error', function (err) {
          // Handle error
          console.log("Error while updating Topics on the server side (updateTopicNumbers): " + err);
        });
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
     * (Public) Get Observations asynchronously
     */
    function readTopicsAsync(fCallback){
      // TODO this check should be changed
      if(aoCachedTopics.length != 0){
        fCallback(aoCachedTopics);
      } else {
        $http.get('../../html/testing_data/topics.json').success(function(aoData){
          var nTopicsArrayLength = aoData.length;
          aoCachedTopics = [];

          for (var i = 0; i < nTopicsArrayLength; i++) {
            var oNextTopic = new Topic(
              aoData[i].id,
              aoData[i].creationTime,
              aoData[i].updateTime,
              aoData[i].name,
              aoData[i].type,
              aoData[i].defaultValue,
              aoData[i].rangeStart,
              aoData[i].rangeEnd,
              aoData[i].step,
              aoData[i].topicNumber
            );
            aoCachedTopics.push(oNextTopic);
          }
          //Put preprocessing of data
          reorderTopics();
          fCallback(aoCachedTopics);
        });
      }
    }

    /**
     * (Private) Reorder Topics according their numbers
     */
    function reorderTopics() {
      var nTopicsArrayLength = aoCachedTopics.length;
      for (var i = 0; i < nTopicsArrayLength; i++) {
        //Move the item in the array
        var oTopic = aoCachedTopics[i];
        aoCachedTopics.splice(i, 1);
        aoCachedTopics.splice(oTopic.topicNumber, 0, oTopic);
      }
    }

    /**
     * Actions on reading complete from server database
     */
    function onGetComplete(info) {
      console.log("Successfully read Topics from the server (onGetComplete)");
    }

    /**
     * Actions if failed to read Topics from server database
     */
    function onGetError(){
      console.log("Error while reading Topics from the server (onGetError)");
      console.log(err);
    }

    /**
     * (Public) Get Topics asynchronously
     */
    function readTopicsAsyncDB(fCallback){
      // TODO should be fetching gradually
      aoCachedTopics = [];

      // Get Topics from the server and save locally
      dbTopics.replicate.from(remoteCouchTopicsAddress)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully read Topics from the server side (readTopicsAsyncDB)");

          bIsTopicsSynced = 1;

          // Read all docs into memory
          dbTopics.allDocs({include_docs: true}, function(err, response) {
            response.rows.forEach( function (row)
            {
              //console.log(row.doc.name);
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
            // Put pre-processing of data
            reorderTopics();
            fCallback(aoCachedTopics);

          });

        }).on('error',  function (err) {
          // Handle error
          console.log("Error while reading Topics on the server side (readTopicsAsyncDB): " + err);
        });
    }

    /**
     * (Public) Get Topics synchronously
     */
    function readTopicsSyncDB(){
      // TODO should be fetching gradually
      aoCachedTopics = [];

      // Get Topics from the server and save locally
      dbTopics.replicate.from(remoteCouchTopicsAddress)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully read Topics from the server side (readTopicsSyncDB)");
        }).on('error',  function (err) {
          // Handle error
          console.log("Error while reading Topics on the server side (readTopicsSyncDB): " + err);
        });

      // Read all docs into memory

      dbTopics.allDocs({include_docs: true}, function(err, response) {
        response.rows.forEach( function (row)
        {
          //console.log(row.doc.name);
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
        // Put pre-processing of data
        reorderTopics();
        return(aoCachedTopics);
      });
    }

    /**
     * (Public) Get Observations asynchronously
     */
    function readObservationsAsyncDB(fCallback){
      // TODO should be fetching gradually
      aoCachedObservations = [];

      // Get Observations from the server and save locally
      dbObservations.replicate.from(remoteCouchObservationsAddress)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully read Observations on the server side (readObservationsAsyncDB)");

          bIsObservationsSynced = 1;

          // Read all docs into memory
          dbObservations.allDocs({include_docs: true}, function(err, response) {
            response.rows.forEach( function (row)
            {
              //console.log(row.doc.name);
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
          // Handle error
          console.log("Error while reading Observations on the server side (readObservationsAsyncDB): " + err);
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
     * (Public) Read Topic asynchronously
     */
    function readTopicAsync(topicId, fCallback){
      readTopicsAsync(function(data){
        var oTopic = data.filter(function(entry){
          return entry.id == topicId;
        })[0];
        fCallback(oTopic);
      });
    }

    /**
     * (Public) Save Observation
     */
    function createObservation(oObservation) {
      aoCachedObservations.push(oObservation);

      // Save observation to client database
      console.log("Saving Observation on the client side (createObservation)");
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
            console.log("Successfully saved Observation on client side (createObservation)");
          } else {
            console.log("Error while saving Observation on client side (createObservation)" + err);
          }
        });

        // Save observation to server side
        console.log("Saving Observation on the server side (createObservation)");
        //Push Observation to the server
        dbObservations.replicate.to(remoteCouchObservationsAddress)
          .on('complete', function () {
            // Successfully synced
            console.log("Successfully saved Observation on the server side (createObservation)");
          }).on('error', function (err) {
            // Handle error
            console.log("Error while saving Observation on the server side (createObservation): " + err);
          });
    }

    /**
     * (Public) Save Observation to client-side DB
     */
    function syncObservationsDB(){

      // Iterate over temp observations and save them into database
      var len = aoObservationsToSync.length;

      if (len === 0) {
        console.log("No local observations to sync (syncObservationsDB)");
        $rootScope.$broadcast('event:observations-synced-with-db');
      }

      for (var i=0; i<len; i++) {
        var oObservation = aoObservationsToSync[i];
        // Save observation to client database
        console.log("Saving Observation on the client side (syncObservationsDB)");
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
              console.log("Successfully saved Observation on client side (syncObservationsDB)");
              $rootScope.$broadcast('event:observations-synced-with-db');
            } else {
              console.log("Error while saving Observation on client side (syncObservationsDB)" + err);
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
      console.log("Saving Observation on the server side (syncObservationsServer)");
      //Push Observation to the server
      dbObservations.replicate.to(remoteCouchObservationsAddress)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully saved Observation on the server side (syncObservationsServer)");
          $rootScope.$broadcast('event:observations-synced-with-server');
        }).on('error', function (err) {
          // Handle error
          console.log("Error while saving Observation on the server side (syncObservationsServer): " + err);
          $rootScope.$broadcast('event:observations-sync-server-problem');
        });
    }

    /**
     * (Public) Read Observation by Id
     */
    function readObservation(sObservationId) {
      if(!aoCachedObservations){
        console.log("Reading from empty list of Observations (readObservation)");
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
        console.log("No observations in memory (readObservations)");
        aoCachedObservations = [];
      } else {
        console.log("There are some observations in memory (readObservations)");
        console.log(aoCachedObservations);
      }

      return aoCachedObservations;
    }

    /**
     * (Public) Update Observation
     */
    function updateObservation(sObservationId, oObservation){
      var nNumberOfObservations = aoCachedObservations.length;
      var sNextId;
      for(var i=0; i<nNumberOfObservations; i++) {
        sNextId = aoCachedObservations[i].id;

        if (sNextId == sObservationId) {
          aoCachedObservations[i] = oObservation;

          // Save observation to client database
          console.log("Updating Observation on the client side (updateObservation)");

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
              console.log('Successfully updated Observation on client side (updateObservation)');
            } else {
              console.log('Error while updating Observation on client side (updateObservation): ' + err);
            }
          });

          console.log("Updating Observation on the server side (updateObservation)");
          //Push Observation to the server
          dbObservations.replicate.to(remoteCouchObservationsAddress)
            .on('complete', function () {
              // Successfully synced
              console.log("Successfully updated Observation on the server side (updateObservation)");
            }).on('error', function (err) {
              // Handle error
              console.log("Error while updating Observation on the server side (updateObservation): " + err);
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
      readTopicsAsync: readTopicsAsync,
      readTopicsAsyncDB: readTopicsAsyncDB,
      readObservationsAsync: readObservationsAsync,
      readObservationsAsyncDB: readObservationsAsyncDB,
      readTopicsSyncDB: readTopicsSyncDB,
      readTopicAsync: readTopicAsync,

      Topic : Topic,
      createTopic: createTopic,
      readTopic: readTopic,
      readTopicDB: readTopicDB,
      readTopics: readTopics,
      readTopicsDB: readTopicsDB,
      updateTopic: updateTopic,
      updateTopicNumbers: updateTopicNumbers,

      Observation : Observation,
      createObservation: createObservation,
      readObservation: readObservation,
      readObservations: readObservations,
      readObservationsToSync: readObservationsToSync,
      syncObservationsDB: syncObservationsDB,
      syncObservationsServer: syncObservationsServer,
      updateObservation: updateObservation,

      findUniqueDates: findUniqueDates,
      readDBState: readDBState,

      CreateLocalPouchDB: CreateLocalPouchDB,
      initialize: initialize,
      isInitialized: isInitialized,
      isTopicsSynced: isTopicsSynced,
      isObservationsSynced: isObservationsSynced
    };

  }]);

});