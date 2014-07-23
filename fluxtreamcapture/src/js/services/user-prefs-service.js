/**
 * This service exposes the asynchronous forge.prefs functions as synchronous functions.
 */
define([
  'app-modules'
], function(appModules) {
  
  appModules.services.factory('UserPrefsService', function($http) {
    
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

    // Public API
    return {
      //TODO create delete operations for the Topics and Observations
      isReady: function() { return initialized; },
      get: getValue,
      set: setValue,
      onReady: onReady
    };
    
  });
  
});
