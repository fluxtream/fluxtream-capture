/**
 * This service allows to save data for the offline mode on the client side
 */
define([
  'flxModules'
], function(flxModules) {

  flxModules.flxServices.factory('SelfReportStorageService', function($http) {
    //TODO Save values to forge.prefs.set(key, value);
    //TODO When to check if the storage was initialized?
    //TODO Add all functions as methods of the class
    //TODO Implement async versions of the fucntions
    //TODO Does it required to save update time for Observation and Topic?
    //TODO How Topic ID would be generated?

    //Stores Topics information
    var aoCachedTopics;
    var aoCachedObservations;

    // True once this has been initialized
    var initialized = false;

    //------------------------------------------------------------------------------------
    //Database for the offline storage on the client side
    var selfReportDB;
    var sDBName = "SelfReportDB";
    var request;

    //------------------------------------------------------------------------------------

    function initialize(){
      initialized = true;

      // Force use of IndexedDB Shim
      window.shimIndexedDB && window.shimIndexedDB.__useShim();

      // Create database
      request = indexedDB.open(sDBName);

      request.onupgradeneeded = function() {
        // The database did not previously exist, so create object stores and indexes.
        var db = request.result;
        var store = db.createObjectStore("topics", {keyPath: "id"});
      };

      request.onsuccess = function() {
        selfReportDB = request.result;
      };
    }

    function Topic (id, creationTime, updateTime, name, type, defaultValue, rangeStart, rangeEnd, step){
      this.topicId = id;
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
      this.id = id;
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

      var db = selfReportDB.transaction("topics", "readwrite");
      var store = db.objectStore("topics");

      // Save topic to client database
      store.put({
        topicId: oTopic.id,
        creationTime: oTopic.creationTime,
        updateTime: oTopic.updateTime,
        name: oTopic.name,
        type: oTopic.type,
        defaultValue: oTopic.defaultValue,
        rangeStart: oTopic.rangeStart,
        rangeEnd: oTopic.rangeEnd,
        step: oTopic.step
      });

      db.oncomplete = function() {
        // All requests have succeeded and the transaction has committed.
      };
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
      if(aoCachedTopics){
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
      readObservationsAsync: readObservationsAsync,
      readTopicAsync: readTopicAsync,

      Topic : Topic,
      createTopic: createTopic,
      readTopic: readTopic,
      updateTopic: updateTopic,

      Observation : Observation,
      createObservation: createObservation,
      readObservation: readObservation,
      updateObservation: updateObservation,

      findUniqueDates: findUniqueDates
    };

  });

});