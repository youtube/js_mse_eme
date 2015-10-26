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

// This file create the main interface of the app.
'use strict';

(function() {

var loadTests = function(testType) {
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

var parseParams = function(testSuiteConfig) {
  var config = {};
  config.testType = parseParam('test_type', testSuiteConfig.defaultTestSuite);
  config.timestamp = parseParam('timestamp');
  config.command = parseParam('command');
  config.viewType = parseParam('view_type');
  config.timeout = parseParam('timeout', TestBase.timeout);
  config.disableLog = parseParam('disable_log', 'false');
  config.loop = parseParam('loop', 'false');
  config.stoponfailure = parseParam('stoponfailure', 'false');
  config.enablewebm = parseParam('enablewebm', testSuiteConfig.enablewebm);
  config.tests = parseParam('tests');
  config.exclude = parseParam('exclude');
  config.testsMask = parseParam('tests_mask', '');
  return config;
};

var configureHarness = function(config) {
  window.recycleVideoTag = true;
  window.currentTestType = config.testType;
  TestBase.timeout = config.timeout;
  window.logging = config.disableLog !== 'true';
  window.loop = config.loop === 'true';
  window.stoponfailure = config.stoponfailure === 'true';
  window.enablewebm = config.enablewebm === 'true';

  if (config.tests) {
    config.tests = config.tests.split(',').map(function(x) {return parseInt(x);}).
        sort(function(a, b) {return a - b;});
    for (var i = 0; i < config.tests.length; ++i) {
      var index = config.tests[i] * 1 - 1;
      if (index < 0)
        continue;
      config.testsMask = util.resize(config.testsMask, index, '0');
      config.testsMask += '1';
    }
    config.testsMask += '0';
  } else if (config.exclude) {
    config.exclude = config.exclude.split(',').map(function(x) {return parseInt(x);}).
        sort(function(a, b) {return a - b;});
    for (var i = 0; i < config.exclude.length; ++i) {
      var index = config.exclude[i] * 1 - 1;
      if (index < 0)
        continue;
      config.testsMask = util.resize(config.testsMask, index, '1');
      config.testsMask += '0';
    }
    config.testsMask += '1';
  }

  if (!config.testsMask) {
    config.testsMask = '1';
  }
};

var reloadPageWithTimestamp = function() {
  var newTimeStamp = (new Date()).getTime();
  if (!/\?/.test(document.URL)) {
    window.location = document.URL + '?timestamp=' + newTimeStamp;
  } else {
    window.location = document.URL + '&timestamp=' + newTimeStamp;
  }
};

var createLogger = function() {
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
};

window.globalRunner = null;

var createRunner = function(testSuite, testSuiteVer, testsMask) {
  var runner = new TestRunner(testSuite, testsMask, testSuiteVer);

  // Expose the runner so outside/injected scripts can read it.
  window.globalRunner = runner;

  var id = 0;
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

  runner.initialize();
  return runner;
};

window.startMseTest = function(testSuiteVer) {
  setupMsePortability(testSuiteVer);
  var testSuiteVersion = testSuiteVersions[testSuiteVer];
  var config = parseParams(testSuiteVersion.config);
  if (!config.timestamp) {
    reloadPageWithTimestamp();
    return;
  }
  if (!testSuiteVersion.testSuites.indexOf(config.testType) === -1) {
    alert('Cannot find test type ' + config.testType);
    throw 'Cannot find test type ' + config.testType;
  }

  configureHarness(config);
  createLogger();

  var testSuite = loadTests(config.testType);
  if (config.viewType)
    testSuite.viewType = config.viewType;

  var runner = createRunner(testSuite, testSuiteVer, config.testsMask);
  if (config.command === 'run')
    runner.startTest(0, runner.testList.length);
};

})();
