/*
Copyright 2017 Google Inc. All rights reserved.

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

var XHR_TIMEOUT_LIMIT = 5000;

(function() {

// Backup logged in case logger is not setup in main.js.
if (!window.LOG) {
  window.LOG = console.log.bind(console);
}

var TestBase = {};

TestBase.onsourceopen = function() {
  this.log('default onsourceopen()');
};

TestBase.start = function(runner, video) {
  this.log('Test started');
};

TestBase.teardown = function(testSuiteVer) {
  if (this.video != null) {
    this.video.removeAllEventListeners();
    this.video.pause();
    if (testSuiteVer && testSuiteVer !== '0.5') // For backwards compatibility.
      window.URL.revokeObjectURL(this.video.src);
    this.video.src = '';
    if (harnessConfig.recycleVideoTag)
      this.video.parentNode.removeChild(this.video);
  }
  this.ms = null;
  this.video = null;
  this.runner = null;
};

TestBase.log = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  args.splice(0, 0, this.desc + ': ');
  LOG.apply(this, args);
};

TestBase.dump = function() {
  if (this.video) {
    this.log('video.currentTime =', this.video.currentTime);
    this.log('video.readyState =', this.video.readyState);
    this.log('video.networkState =', this.video.networkState);
  }
  if (this.ms) {
    this.log('ms.sb count =', this.ms.sourceBuffers.length);
    for (var i = 0; i < this.ms.sourceBuffers.length; ++i) {
      if (this.ms.sourceBuffers[i].buffered) {
        var buffered = this.ms.sourceBuffers[i].buffered;
        this.log('sb' + i + '.buffered.length', buffered.length);
        for (var j = 0; j < buffered.length; ++j) {
          this.log('  ' + j + ': (' + buffered.start(j) + ', ' +
                   buffered.end(j) + ')');
        }
      } else {
        this.log('sb', i, 'invalid buffered range');
      }
    }
  }
};

TestBase.timeout = 30000;

window.createTest = function(name) {
  var t = function() {};
  t.prototype.__proto__ = TestBase;
  t.prototype.desc = name;
  t.prototype.running = false;
  t.prototype.category = '';
  t.prototype.mandatory = true;

  return t;
};

window.createMSTest = function(name) {
  var t = createTest(name);
  t.prototype.start = function(runner, video) {
    this.ms = new MediaSource();
    this.ms.addEventListener('sourceopen', this.onsourceopen.bind(this));
    if (this.ms.isWrapper)
      this.ms.attachTo(video);
    else
      this.video.src = window.URL.createObjectURL(this.ms);
  };
  return t;
};

var TestExecutor = function(testSuite, testsMask, testSuiteVer) {
  this.testView = null;
  this.currentTest = null;
  this.currentTestIdx = 0;
  this.assertThrowsError = true;
  this.XHRManager = createXHRManager(createLogger(this.log.bind(this)));
  this.timeouts = createTimeoutManager(createLogger(this.log.bind(this)));
  this.lastResult = 'pass';
  this.testSuiteVer = testSuiteVer;

  if (testsMask) {
    this.testList = [];
    testsMask = util.resize(testsMask, testSuite.tests.length,
                            testsMask.substr(-1));
    for (var i = 0; i < testSuite.tests.length; ++i)
      if (testsMask[i] === '1')
        this.testList.push(testSuite.tests[i]);
  } else {
    this.testList = testSuite.tests;
  }
  this.fields = testSuite.fields;
  this.info = testSuite.info;
  this.viewType = testSuite.viewType;
};

TestExecutor.prototype.log = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  args.splice(0, 0, 'TestExecutor: ');
  LOG.apply(this, args);
};

TestExecutor.prototype.assert = function(cond, msg) {
  if (!cond) {
    this.fail('Assert failed: ' + msg);
  }
};

TestExecutor.prototype.checkException = function(testFunc, exceptionCode) {
  try {
    testFunc();
    this.fail('Expect exception ' + exceptionCode);
  } catch (err) {
    this.checkEq(err.code, exceptionCode, 'Exception');
  }
};

TestExecutor.prototype.check = function(condition, passMsg, failMsg) {
  if (condition)
    this.log(passMsg);
  else
    this.assert(false, failMsg);
};

TestExecutor.prototype.checkType = function(x, y, name) {
  var t = typeof(x);
  var result = t === y;
  this.check(result, 'checkType passed: type of ' + name + ' is (' + t + ').',
             'Type of ' + name + ' is (' + t + ') which should be (' + y + ')');
};

TestExecutor.prototype.checkEq = function(x, y, name) {
  var result = (x == y) ||
      (typeof(x) === 'number' && typeof(y) === 'number' &&
       isNaN(x) && isNaN(y));
  this.check(result, 'checkEq passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x + ') which should be (' + y + ')');
};

TestExecutor.prototype.checkNE = function(x, y, name) {
  var result = (x != y) &&
      !(typeof(x) === 'number' && typeof(y) === 'number' &&
        isNaN(x) && isNaN(y));
  this.check(result, 'checkNE passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x + ') which shouldn\'t.');
};

TestExecutor.prototype.checkApproxEq = function(x, y, name, eps) {
  eps = eps || 0.5;
  var equal = (x == y) ||
      (typeof(x) === 'number' && typeof(y) === 'number' &&
       isNaN(x) && isNaN(y));
  var result;
  if (equal) {
    result = equal;
  } else {
    var diff = Math.abs(x - y);
    result = diff < eps;
  }
  this.check(result, 'checkApproxEq passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x + ') which should between [' +
                (y - eps) + ', ' + (y + eps) + ']');
};

TestExecutor.prototype.checkGr = function(x, y, name) {
  this.check(x > y, 'checkGr passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x +
                 ') which should be greater than (' + y + ')');
};

TestExecutor.prototype.checkGE = function(x, y, name) {
  this.check(x >= y, 'checkGE passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x +
                 ') which should be greater than or equal to (' + y + ')');
};

TestExecutor.prototype.checkLE = function(x, y, name) {
  this.check(x <= y, 'checkLE passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x +
                 ') which should be less than or equal to (' + y + ')');
};

TestExecutor.prototype.getControlContainer = function() {
  // Override this function to anchor one to the DOM.
  return document.createElement('div');
};

TestExecutor.prototype.getNewVideoTag = function() {
  // Override this function to anchor one to the DOM.
  return document.createElement('video');
};

TestExecutor.prototype.getOutputArea = function() {
  // Override this function to anchor one to the DOM.
  return document.createElement('textarea');
};

TestExecutor.prototype.updateStatus = function() {
  this.testView.getTest(this.currentTestIdx).updateStatus();
};

TestExecutor.prototype.initialize = function() {
  var self = this;
  if (this.viewType === 'extra compact')
    this.testView = compactTestView.create(this.testSuiteVer, this.fields,
                                           this.viewType);
  else if (this.viewType === 'compact')
    this.testView = compactTestView.create(this.testSuiteVer, this.fields);
  else
    this.testView = compactTestView.create(this.testSuiteVer, this.fields);

  this.testView.onrunselected = function() {
    self.startTest(0, self.testList.length);
  };

  for (var i = 0; i < this.testList.length; ++i) {
    this.testList[i].prototype.onclick = this.startTest.bind(this, i, 1);
    this.testView.addTest(this.testList[i].prototype);
  }

  this.testView.generate(this.testSuiteVer);

  document.getElementById('info').innerText = this.info;
  this.log('Media Source and Encrypted Media Conformance Tests ' +
           '(version REVISION)');

  this.longestTimeRatio = -1;
  this.longestTest = null;
};

TestExecutor.prototype.onfinished = function() {
  if (this.longestTest && this.longestTimeRatio > 0) {
    this.log('Longest test is ' + this.longestTest + ', it takes ' +
             this.longestTimeRatio + ' of its timeout.');
  }

  var keepRunning = (!harnessConfig.stoponfailure ||
      this.lastResult === 'pass') && harnessConfig.loop &&
      (this.testView.anySelected() || this.numOfTestToRun === 1);
  if (keepRunning) {
    this.testToRun = this.numOfTestToRun;
    this.currentTestIdx = this.startIndex;
    this.startNextTest();
  } else {
    this.lastResult = 'pass';
    this.getNewVideoTag();
    this.log('All tests are completed');
    for (var i = 0; i < window.globalRunner.testList.length; i++) {
      var test =  window.globalRunner.testList[i];
      if (test.prototype.failures > 0) {
        this.log((i + 1) + ":" + test.prototype.desc + ': Failed with "'
            + test.prototype.lastError.message + '"');
      }
    }
  }

  if (document.URL.indexOf('yt-dash-mse-test') >= 0) {
    this.sendTestReport(getTestResults());
  }
};

TestExecutor.prototype.sendTestReport = function(results) {
  var resultsURL = 'https://qual-e.appspot.com/api?command=save_result';
  resultsURL += '&source=mse_eme_conformance';
  resultsURL += '&testid=' + (harnessConfig.testid ? harnessConfig.testid :
      (navigator.userAgent + '::' + this.runStartTime));

  var xhr = new XMLHttpRequest();
  xhr.open('POST', resultsURL, true);
  xhr.send(JSON.stringify(results));
};

TestExecutor.prototype.startTest = function(startIndex, numOfTestToRun) {
  if (!this.currentTest) {
    this.startIndex = startIndex;
    this.numOfTestToRun = numOfTestToRun;
    this.testToRun = numOfTestToRun;
    this.currentTestIdx = startIndex;
    this.startNextTest();
    this.runStartTime = Date.now();
  }
};

TestExecutor.prototype.startNextTest = function() {
  UpdateStreamDef(Number(harnessConfig.enablewebm));
  if (this.numOfTestToRun != 1) {
    while (this.testToRun > 0 &&
           !this.testView.getTest(this.currentTestIdx).selected()) {
      this.testToRun--;
      this.currentTestIdx++;
    }
  }

  if (this.testToRun <= 0 || (harnessConfig.stoponfailure &&
      this.lastResult != 'pass')) {
    this.onfinished();
    return;
  }

  this.currentTest = new this.testList[this.currentTestIdx];

  this.log('Test ' + (this.currentTest.index + 1) + ':' +
           this.currentTest.desc + ' STARTED with timeout ' +
           this.currentTest.timeout);
  this.timeouts.setTimeout(this.timeout.bind(this), this.currentTest.timeout);

  this.testList[this.currentTestIdx].prototype.running = true;

  this.updateStatus();

  this.startTime = Date.now();
  this.currentTest.runner = this;
  this.currentTest.video = this.getNewVideoTag();

  var addEventListener = this.currentTest.video.addEventListener;
  this.currentTest.video.eventsAdded = [];
  this.currentTest.video.addEventListener =
      function(type, listener, useCapture) {
        addEventListener.call(this, type, listener, useCapture);
        this.eventsAdded.push([type, listener]);
      };
  this.currentTest.video.removeAllEventListeners = function() {
    for (var i = 0; i < this.eventsAdded.length; ++i) {
      this.removeEventListener(this.eventsAdded[i][0],
                               this.eventsAdded[i][1]);
    }
  };

  this.currentTest.start(this, this.currentTest.video);
};

TestExecutor.prototype.succeed = function() {
  this.lastResult = 'pass';
  ++this.testList[this.currentTestIdx].prototype.passes;
  this.updateStatus();
  this.log('Test ' + (this.currentTest.index + 1) + ':' +
      this.currentTest.desc + ' PASSED.');
  this.teardownCurrentTest(false);
};

TestExecutor.prototype.error = function(msg, isTimeout) {
  this.lastResult = isTimeout ? 'timeout' : 'failure';
  var test = this.currentTest;

  try {
    test.dump();
  } catch (e) {
  }

  this.log('Test ' + (this.currentTest.index + 1) + ':' +
      this.testList[this.currentTestIdx].prototype.desc +
      ' threw an error: ' + msg);
  var stack = '';

  try {
    var x = y.z.u.v.w;
  } catch (e) {
    if (e && e.stack)
    {
      stack = e.stack;
    }
  }

  this.testList[this.currentTestIdx].prototype.lastError = {
    message: msg,
    callStack: stack
  };

  this.teardownCurrentTest(isTimeout);
  if (this.assertThrowsError) throw msg;
};

TestExecutor.prototype.fail = function(msg) {
  ++this.testList[this.currentTestIdx].prototype.failures;
  this.updateStatus();
  this.log('Test ' + (this.currentTest.index + 1) + ':' +
      this.currentTest.desc + ' FAILED');
  this.error(msg, false);
};

TestExecutor.prototype.timeout = function() {
  var isTestTimedOut = false;
  var currentTime = new Date().getTime();
  var testTime = currentTime - this.startTime;

  // Wait longer if we have still running xhr requests.
  // Don't consider data transfer time as part of the timeout.
  if (this.XHRManager) {
    if (this.XHRManager.hasActiveRequests()) {
      var timeSinceLastUpdate = currentTime - this.XHRManager.getLastUpdate();
      if (timeSinceLastUpdate < XHR_TIMEOUT_LIMIT) {
        this.timeouts.setTimeout(this.timeout.bind(this), 1000);
      } else {
        isTestTimedOut = true;
      }
    } else {
      var testTimeLimit =
          this.currentTest.timeout + this.XHRManager.totalRequestDuration;
      if (testTime < testTimeLimit) {
        this.timeouts.setTimeout(this.timeout.bind(this),
                                 this.XHRManager.totalRequestDuration);
      } else {
        isTestTimedOut = true;
      }
    }
  } else {
    isTestTimedOut = true;
  }

  if (isTestTimedOut) {
    ++this.testList[this.currentTestIdx].prototype.timeouts;
    this.updateStatus();
    this.error('Test ' + (this.currentTest.index + 1) + ':' +
        this.currentTest.desc + ' TIMED OUT!', true);
  }
};

TestExecutor.prototype.teardownCurrentTest = function(isTimeout) {
  if (!isTimeout) {
    var time = Date.now() - this.startTime;
    var ratio = time / this.currentTest.timeout;
    if (ratio >= this.longestTimeRatio) {
      this.longestTimeRatio = ratio;
      this.longestTest = this.currentTest.desc;
      this.log('New longest test ' + this.currentTest.desc +
               ' with timeout ' + this.currentTest.timeout + ' takes ' + time);
    }
  }

  this.testList[this.currentTestIdx].prototype.running = false;
  this.updateStatus();

  this.timeouts.clearAll();
  this.XHRManager.abortAll();
  this.testView.finishedOneTest();
  this.currentTest.teardown(this.testSuiteVer);
  if (this.currentTest.ms &&
      !this.currentTest.ms.isWrapper &&
      this.currentTest &&
      this.currentTest.video &&
      this.currentTest.video.src) {
    if (this.testSuiteVer !== '0.5')
      window.URL.revokeObjectURL(this.currentTest.video.src);
    this.currentTest.video.src = '';
  }
  this.currentTest = null;
  this.testToRun--;
  this.currentTestIdx++;
  window.setTimeout(this.startNextTest.bind(this), 1);
};

window.TestBase = TestBase;
window.TestExecutor = TestExecutor;

window.getTestResults = function(testStartId, testEndId) {
  testStartId = testStartId || 0;
  testEndId = testEndId || window.globalRunner.testList.length;
  var results = {
    pass: [],
    fail: []
  };

  for (var i = testStartId; i < testEndId; ++i) {
    if (window.globalRunner.testList[i]) {
      var test = window.globalRunner.testList[i];
      var name = test.prototype.category + test.prototype.desc;
      if (test.prototype.failures > 0) {
        results.fail.push(name);
      } else if (test.prototype.passes > 0) {
        results.pass.push(name);
      }
    }
  }
  return results;
};


})();
