define([], function() {

  var FlxState = {};
  FlxState.router = new Backbone.Router();
  FlxState.apps = ["settings", "self-report", "heart-rate", "pictures-upload"];
  FlxState.defaultApp = "settings";

  var storage = {};

  FlxState.saveState = function(appName, urlState) {
    if (typeof(storage[appName])=="undefined")
      storage[appName] = {};
    storage[appName] = urlState;
  };

  FlxState.getState = function(appName) {
    if (typeof(storage[appName])=="undefined")
      return null;
    return storage[appName];
  };

  return FlxState;
});
