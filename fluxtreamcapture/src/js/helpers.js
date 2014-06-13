/**
 * Defines some angular non-related helper functions
 */
define([], function() {
  
  String.prototype.upperCaseFirst = function() {
    var lowerCase = this.toLowerCase();
    return lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
  };
  
  String.prototype.startsWith = function(s) {
    return this.indexOf(s) === 0;
  };
  
  String.prototype.endsWith = function(s) {
    return this.lastIndexOf(s) === this.length - s.length;
  };
  
});
