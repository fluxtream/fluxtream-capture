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
            if (key.indexOf("flx.") === 0) {
              forge.prefs.get(key,
                // Success
                function(value) {
                  values[key] = value;
                  itemCount--;
                  if (itemCount === 0) initializationDone();
                },
                // Error
                function(content) {
                  forge.logging.error("Error while fetching user prefs (" + key + "): " + JSON.stringify(content));
                }
              );
            } else {
              itemCount--;
              if (itemCount === 0) initializationDone();
            }
          });
        }
      },
      // Error
      function(content) {
        forge.logging.error("Error while fetching user prefs: " + JSON.stringify(content));
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
    function getValue(key, defaultValue) {
      if (!initialized) throw "Storage not initialized yet.";
      var value = values["flx." + key];
      if (typeof value === 'undefined') {
        if (typeof defaultValue === 'undefined') return null;
        return defaultValue;
      }
      return value;
    }
    
    /**
     * (Public) Sets the value for the given key
     */
    function setValue(key, value) {
      if (!initialized) throw "Storage not initialized yet.";
      values["flx." + key] = value;
      forge.prefs.set("flx." + key, value);
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
