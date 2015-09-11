/*
Copyright 2015 Google Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';

(function() {

var TimeoutManager = function(logger) {
  var timers = [];
  var intervals = [];

  var getUniqueItem = function(container) {
    var id = 0;
    while (typeof(container[id]) != 'undefined')
      ++id;
    container[id] = {id: id};
    return container[id];
  };

  var timeoutHandler = function(id) {
    var func = timers[id].func;
    delete timers[id];
    func();
  };

  var intervalHandler = function(id) {
    var func = intervals[id].func;
    func();
  };

  this.setTimeout = function(func, timeout) {
    var timer = getUniqueItem(timers);
    timer.func = func;
    timer.id = window.setTimeout(timeoutHandler, timeout, timer.id);
  };

  this.setInterval = function(func, timeout) {
    var interval = getUniqueItem(intervals);
    interval.func = func;
    interval.id = window.setInterval(intervalHandler, timeout, interval.id);
  };

  this.clearAll = function() {
    for (var id = 0; id < timers.length; ++id)
      if (typeof(timers[id]) != 'undefined')
        window.clearTimeout(timers[id].id);
    timers = [];

    for (var id = 0; id < intervals.length; ++id)
      if (typeof(intervals[id]) != 'undefined')
        window.clearInterval(intervals[id].id);
    intervals = [];
  };
};

window.createTimeoutManager = function(logger) {
  return new TimeoutManager(logger);
};

})();
