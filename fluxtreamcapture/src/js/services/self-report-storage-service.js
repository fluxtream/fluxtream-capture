/**
 * This service allows to save data for the offline mode on the client side
 */
define([
  'app-modules',
  'services/login-service'
], function(appModules, storage) {

  appModules.services.factory('SelfReportStorageService', ["$http", "LoginService", function($http,  loginService) {
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
    var aoCachedTopics;
    var aoCachedObservations;

    // True once this has been initialized
    var initialized = false;

    var db;
    var dbName = "self_report_db_" + loginService.getUserName();
    var remoteCouch = 'http://yury:secret@127.0.0.1:5984/' + dbName;

    function initialize(){
      initialized = true;
      if(aoCachedTopics == null){
        aoCachedTopics = [];
      }

      db = new PouchDB(dbName);
    }

    function Topic (id, creationTime, updateTime, name, type, defaultValue, rangeStart, rangeEnd, step){
      this.id = id.toString();
      this.creationTime = creationTime;
      this.updateTime = updateTime;
      this.name = name;
      this.type = type;
      this.defaultValue = defaultValue;
      this.rangeStart = rangeStart;
      this.rangeEnd = rangeEnd;
      this.step = step;
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
      aoCachedTopics.push(oTopic);

      // Save topic to client database
      console.log("Saving Topic on the client side.");
      db.put({
          _id: oTopic.id,
          creationTime: oTopic.creationTime.toISOString(),
          updateTime: oTopic.updateTime.toISOString(),
          name: oTopic.name,
          type: oTopic.type,
          defaultValue: oTopic.defaultValue,
          rangeStart: oTopic.rangeStart,
          rangeEnd: oTopic.rangeEnd,
          step: oTopic.step},

        function callback(err, result) {
        if (!err) {
          console.log('Successfully saved a Topic on client side!');
        } else {
          console.log(err);
        }
      });

      console.log("Saving Topic on the server side.");
      //Push Topic to the server
      db.replicate.to(remoteCouch)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully saved Topic on the server side");
        }).on('error', function (err) {
          // Handle error
          console.log("Error while saving Topic on the server side: " + err);
        });
    }

    /**
     * (Public) Read Topic from the file
     */
    function readTopic(sTopicId){
      if(!aoCachedTopics){
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
              aoData[i].step
            );
            aoCachedTopics.push(oNextTopic);
          }
          aoCachedTopics = aoData;
        });
      }

      var oTopic = aoCachedTopics.filter(function(oEntry){
        return oEntry.id == sTopicId;
      })[0];

      return(oTopic);
    }

    /**
     * (Public) Read Topic from the database
     */
    function readTopicDB(sTopicId){
      if(!aoCachedTopics){
        // TODO Load topics here
      }

      var oTopic = aoCachedTopics.filter(function(oEntry){
        return oEntry.id == sTopicId;
      })[0];

      return(oTopic);
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
          break;
        }
      }
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
              aoData[i].step
            );
            aoCachedTopics.push(oNextTopic);
          }
          //Put preprocessing of data
          fCallback(aoCachedTopics);
        });
      }
    }

    /**
     * Actions on reading complete from server database
     */
    function onGetComplete(info) {
      console.log("Successfully read Topics from the server");
    }

    /**
     * Actions if failed to read Topics from server database
     */
    function onGetError(){
      console.log("Error while reading Topics from the server");
      console.log(err);
    }

    /**
     * (Public) Get Topics asynchronously
     */
    function readTopicsAsyncDB(fCallback){
      // TODO should be fetching gradually
      aoCachedTopics = [];

      // Get Topics from the server and save locally
      db.replicate.from(remoteCouch)
        .on('complete', function () {
          // Successfully synced
          console.log("Successfully read Topics on the server side");
        }).on('error',  function (err) {
          // Handle error
          console.log("Error while reading Topics on the server side: " + err);
        });

      // Read all docs into memory
      db.allDocs({include_docs: true}, function(err, response) {
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
            row.doc.step
          );

          aoCachedTopics.push(oNextTopic);
        });
        // Put pre-processing of data
        fCallback(aoCachedTopics);
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
    function createObservation(observation) {
      if (!initialized) throw "Storage not initialized yet.";

      if (aoCachedObservations == null) {
        aoCachedObservations = [];
      }

      aoCachedObservations.push(observation);
    }

    /**
     * (Public) Read Observation by Id
     */
    function readObservation(sObservationId) {
      if (!initialized) throw "Storage not initialized yet.";

      var oCachedObservation = aoCachedObservations.filter(function(entry){
        return entry.id == sObservationId;
      })[0];

      return oCachedObservation;
    }

    /**
     * (Public) Update Observation
     */
    function updateObservation(sObservationId, oObservation){
      if (!initialized) throw "Storage not initialized yet.";

      var nNumberOfObservations = aoCachedObservations.length;
      var sNextId;
      for(var i=0; i<nNumberOfObservations; i++) {
        sNextId = aoCachedObservations[i].id;

        if (sNextId == sObservationId) {
          aoCachedObservations[i] = oObservation;
          break;
        }
      }
    }

    initialize();

    /**
     * Public interface
     */
    return {
      //TODO create delete operations for the Topics and Observations
      readTopicsAsync: readTopicsAsync,
      readTopicsAsyncDB: readTopicsAsyncDB,
      readObservationsAsync: readObservationsAsync,
      readTopicAsync: readTopicAsync,

      Topic : Topic,
      createTopic: createTopic,
      readTopic: readTopic,
      readTopicDB: readTopicDB,
      updateTopic: updateTopic,

      Observation : Observation,
      createObservation: createObservation,
      readObservation: readObservation,
      updateObservation: updateObservation,

      findUniqueDates: findUniqueDates
    };

  }]);

});