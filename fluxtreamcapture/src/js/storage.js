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
    //ToDo setValue observations

    //Stores Topics information
    var cachedTopics;

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

    /**
     * (Public) Push value for the given key
     */
    function pushValue(key, value) {
      if (!initialized) throw "Storage not initialized yet.";
      if (values[key] == null) {
        values[key] = [];
      }

      values[key].push(value);
      //TODO forge.prefs.set(key, value);
    }

    /**
     * (Public) Get Topics from the file
     */
    function getTopics(callback){
      if(cachedTopics){
        callback(cachedTopics);
      } else {
        $http.get('../../html/testing_data/topics.json').success(function(data){
          cachedTopics = data;
          //Put preprocessing of data
          callback(data);
        });
      }
    }

    /**
     * (Public) Sets the value for the given key[index]
     */
    function setIndexValue(key, index, value){
      if (!initialized) throw "Storage not initialized yet.";
      values[key][index] = value;
      forge.prefs.set(key[index], value);
    }

    /**
     * (Public) Save Topic into storage
     */
    function saveTopic(){
      cachedTopics.push(arguments[0]);
    }

    /**
     * (Public) Update Topic in storage
     */
    function updateTopic(){
      //Find Topic

      var topicsArrayLength = cachedTopics.length;
      for(var i=0; i< topicsArrayLength; i++){
        if (cachedTopics[i].id == arguments[0].id) {
          cachedTopics[i] = arguments[0];
          break;
        }
      }
    }

    // Self report functionality end ------------------------------------------------------------
    
    // Public API
    return {
      isReady: function() { return initialized; },
      get: getValue,
      set: setValue,
      onReady: onReady,
      push: pushValue,
      getTopics: getTopics,
      getTopic: function(topicId, callback){
        getTopics(function(data){
          var topic = data.filter(function(entry){
            return entry.id == topicId;
          })[0];
          callback(topic);
        });
      },
      setIndexValue: setIndexValue,
      Topic : Topic,
      saveTopic: saveTopic,
      updateTopic: updateTopic
    };
    
  });
  
});
