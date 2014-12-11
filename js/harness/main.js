/*
Copyright 2014 Google Inc. All rights reserved.

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

// This file create the main interface of the app.
'use strict';

(function() {

var timestamp;
var command;
var viewType;
var timeout;
var testsMask;

var loadTests = function(testType) {
  currentTestType = testType;

  // We have to make it compatible to the legacy url format.
  var testName = testType.substr(0, testType.indexOf('-'));
  testName = util.MakeCapitalName(testName) + 'Test';
  return window[testName]();
};

var parseParam = function(param, defaultValue) {
  var regex = new RegExp('(\\?|\\&)' + param + '=([-,\\w]+)', 'g');
  var value = regex.exec(document.URL);
  return value ? value[2] : defaultValue;
};

var parseParams = function() {
  var testType = parseParam('test_type', kDefaultTestType);

  if (!testTypes[testType]) {
    alert('Cannot find test type ' + testType);
    throw 'Cannot find test type ' + testType;
  }

  timestamp = parseParam('timestamp');
  if (!timestamp) return;

  command = parseParam('command');
  viewType = parseParam('view_type');
  TestBase.timeout = parseParam('timeout', TestBase.timeout);

  var disableLog = parseParam('disable_log', 'false');
  window.logging = disableLog !== 'true';
  var loop = parseParam('loop', 'false');
  window.loop = loop === 'true';
  var stoponfailure = parseParam('stoponfailure', 'false');
  window.stoponfailure = stoponfailure === 'true';
  var enablewebm = parseParam('enablewebm', 'false');
  window.enablewebm = enablewebm === 'true';

  var tests = parseParam('tests');
  var exclude = parseParam('exclude');

  if (tests) {
    testsMask = '';
    tests = tests.split(',').map(function(x) {return parseInt(x);}).
        sort(function(a, b) {return a - b;});
    for (var i = 0; i < tests.length; ++i) {
      var index = tests[i] * 1 - 1;
      if (index < 0)
        continue;
      testsMask = util.resize(testsMask, index, '0');
      testsMask += '1';
    }
    testsMask += '0';
  } else if (exclude) {
    exclude = exclude.split(',').map(function(x) {return parseInt(x);}).
        sort(function(a, b) {return a - b;});
    testsMask = '';
    for (var i = 0; i < exclude.length; ++i) {
      var index = exclude[i] * 1 - 1;
      if (index < 0)
        continue;
      testsMask = util.resize(testsMask, index, '1');
      testsMask += '0';
    }
    testsMask += '1';
  } else {
    testsMask = parseParam('tests_mask');
    if (!testsMask)
      testsMask = '1';
  }

  var testSuite = loadTests(testType);
  if (viewType)
    testSuite.viewType = viewType;
  return testSuite;
};

window.globalRunner = null;

var startRunner = function(testSuite, mseSpec) {
  var id = 0;
  var runner = new TestRunner(testSuite, testsMask, mseSpec);

  // Expose the runner so outside/injected scripts can read it.
  window.globalRunner = runner;

  runner.getNewVideoTag = function() {
    var testarea = document.getElementById('testarea');
    var vid = 'v' + id;
    if (recycleVideoTag)
      ++id;
    if (!document.getElementById(vid)) {
      testarea.innerHTML = '';
      testarea.appendChild(util.createElement('video', vid, 'box-right'));
      document.getElementById(vid).controls = true;
    }
    return document.getElementById(vid);
  };

  runner.getControlContainer = function() {
    return document.getElementById('control');
  };

  window.LOG = function() {
    if (!window.logging)
      return;
    var output = document.getElementById('output');
    var text = '';

    for (var i = 0; i < arguments.length; ++i)
      text += arguments[i].toString() + ' ';

    console.log(text);
    output.value = text + '\n' + output.value;
  };

  var currentUrl = window.location.pathname;
  var currentPageName = currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
  runner.initialize(currentPageName);
  if (command === 'run')
    runner.startTest(0, runner.testList.length);
};

window.startMseTest = function(mseSpec) {
  setupMsePortability(mseSpec);

  var testSuite = parseParams();
  if (!timestamp) {
    if (!/\?/.test(document.URL))
      window.location = document.URL + '?timestamp=' + (new Date()).getTime();
    else
      window.location = document.URL + '&timestamp=' + (new Date()).getTime();
    return;
  }
  startRunner(testSuite, mseSpec);
};

})();

