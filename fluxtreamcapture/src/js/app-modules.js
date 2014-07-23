/**
 * Defines the global angular modules used in this application for:
 *   - services
 *   - controllers
 *   - main app
 */
define([], function() {
  var modules = {
    services: angular.module('flxServices', []),
    controllers: angular.module('flxControllers', ['flxServices']),
    filters: angular.module('flxFilters', ['flxServices']),
    app: angular.module('flxApp', ['ionic', 'flxControllers', 'flxFilters', 'flxServices'])
  };
  return modules;
});
