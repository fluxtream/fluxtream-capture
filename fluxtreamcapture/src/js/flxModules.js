/**
 * Defines the global angular modules used in this application for:
 *   - services
 *   - controllers
 *   - main app
 */
define([], function() {
  var modules = {
    flxServices: angular.module('flxServices', []),
    flxControllers: angular.module('flxControllers', ['flxServices']),
    flxApp: angular.module('flxApp', ['ionic', 'flxControllers', 'flxServices']),
  };
  return modules;
});
