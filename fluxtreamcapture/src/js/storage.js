/**
 * This service exposes the asynchronous forge.prefs functions as synchronous functions.
 */
define([
  'flxModules'
], function(flxModules) {
  
  flxModules.flxServices.factory('StorageService', function($http) {
    
    // The values stored in memory for synchronous access
    var values = {};
    
    // True once this has been initialized
    var initialized = false;
    
    // Functions to execute when the the initialization is done
    var executeOnReady = [];
    
    // The number of items to initialize
    var itemCount;
    
    // Initialize
    forge.prefs.keys(
      // Success
      function(keysArray) {
        itemCount = keysArray.length;
        if (itemCount === 0) {
          // There is no stored data yet
          initializationDone();
        } else {
          keysArray.forEach(function(key) {
            if (key === 'setItem' || key === 'removeItem' || key === 'clear') {
              itemCount--;
              if (itemCount === 0) initializationDone();
            } else {
              forge.prefs.get(key,
                // Success
                function(value) {
                  values[key] = value;
                  forge.logging.info("Storage: " + key + " = " + value);
                  itemCount--;
                  if (itemCount === 0) initializationDone();
                },
                // Error
                function(content) {
                  forge.logging.error("Error while fetching user prefs (" + key + "): " + content);
                }
              );
            }
          });
        }
      },
      // Error
      function(content) {
        forge.logging.error("Error while fetching user prefs: " + content);
      }
    );
    
    /**
     * Called when the initialization is done.
     * Executes all onReady functions.
     */
    function initializationDone() {
      initialized = true;
      // Execute all postponed functions
      executeOnReady.forEach(function(functionToExecute) {
        functionToExecute();
      });
    }
      
    /**
     * (Public) Returns the value for the given key
     */
    function getValue(key) {
      if (!initialized) throw "Storage not initialized yet.";
      var value = values[key];
      if (typeof value === 'undefined') return null;
      return value;
    }
    
    /**
     * (Public) Sets the value for the given key
     */
    function setValue(key, value) {
      if (!initialized) throw "Storage not initialized yet.";
      values[key] = value;
      forge.prefs.set(key, value);
    }

    /**
     * (Public) Registers a function to call when the initialization has been done
     */
    function onReady(functionToExecute) {
      if ($.isFunction(functionToExecute)) {
        if (initialized) {
          functionToExecute();
        } else {
          executeOnReady.push(functionToExecute);
        }
      }
    }

    // Self report functionality ------------------------------------------------------------
    //TODO Save values to forge.prefs.set(key, value);
    //TODO When to check if the storage was initialized?
    //TODO Add all functions as methods of the class
    //TODO Implement async versions of the fucntions
    //TODO Does it required to save update time for Observation and Topic?
    //TODO How Topic ID would be generated?

    //Stores Topics information
    var aoCachedTopics;
    var aoCachedObservations;

    function Topic (id, creationTime, updateTime, name, type, defaultValue, rangeStart, rangeEnd, step){
      this.id = id;
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
    function createTopic(oTopic) {
      if (!aoCachedTopics) aoCachedTopics = []; // TODO remove this line but fix initialization issue
      aoCachedTopics.push(oTopic);
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

    // Self report functionality end ------------------------------------------------------------
    
    // Public API
    return {
      //TODO create delete operations for the Topics and Observations
      isReady: function() { return initialized; },
      get: getValue,
      set: setValue,
      onReady: onReady,
      
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
