define([
  'app-modules'
], function(appModules) {

  appModules.filters.filter('orderByTimestamp', function () {
    return function (items, field, reverse) {
      var filtered = [];
      angular.forEach(items, function (item) {
        filtered.push(item);
      });
      filtered.sort(function (a, b) {
        return (Date.parse(a[field]) > Date.parse(b[field]) ? 1 : -1);
      });
      if (reverse) filtered.reverse();
      return filtered;
    };
  });

  appModules.filters.filter('orderByDate', function () {
    return function (items, reverse) {
      var filtered = [];
      angular.forEach(items, function (item) {
        filtered.push(item);
      });
      filtered.sort(function (a, b) {
        return (Date.parse(a) > Date.parse(b) ? 1 : -1);
      });
      if (reverse) filtered.reverse();
      return filtered;
    };
  });
});