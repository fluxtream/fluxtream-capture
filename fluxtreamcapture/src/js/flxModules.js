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
    flxFilters: angular.module('flxFilters', ['flxServices']),
    flxApp: angular.module('flxApp', ['ionic', 'flxControllers', 'flxFilters', 'flxServices']),
  };
  return modules;
});
