/**
 * @license
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var compactTestView = (function() {

function CompactTestView(fields, style) {
  var self = this;
  this.divId = 'testview';
  this.testCount = 0;

  this.initialize = function() {
    this.testList = createCompactTestList(style);

    this.addSwitch('Fullscreen: ', 'fullscreen');
    this.addSwitch('Loop: ', 'loop');
    this.addSwitch('Stop on failure: ', 'stoponfailure');
    this.addSwitch('Log: ', 'logging');
    if (harnessConfig.controlMediaFormatSelection) {
      this.addSwitch('WebM/VP9: ', 'enablewebm');
    }

    this.addCommand('Run All', 'run-selected', 'Run all tests in order.',
        function(e) {
      if (self.onrunselected)
        self.onrunselected.call(self, e);
    });

    this.addLink('Links', 'links.html');
    this.addLink('Instructions', 'instructions.html');
    this.addLink('Changelog', 'changelog.html');
    this.addLink('Download-Source', 'download.tar.gz');
    this.addLink('Download-Media-files', 'YTS-media-files.tar.gz');
    if (harnessConfig.novp9) {
      this.addLink('No VP9', 'main.html');
    }
    this.addLink('YouTube', 'https://youtube.com/tv');

    this.addTestSuites(testSuiteVersions[this.testSuiteVer].testSuites);
  };

  this.addTest = function(desc) {
    return this.testList.addTest(desc);
  };

  this.generate = function() {
    CompactTestView.prototype.generate.call(this);
    document.getElementById('run-selected').focus();

    var USAGE = 'Use &uarr;&darr;&rarr;&larr; to move around, ' +
        'use ENTER to select.';
    document.getElementById('usage').innerHTML = USAGE;
    document.getElementById('run-selected').focus();
  };

  this.getTest = function(index) {
    return this.testList.getTest(index);
  };

  this.finishedOneTest = function() {
    ++this.testCount;
    document.getElementById('finish-count').innerHTML =
        this.testCount === 1 ? this.testCount + ' test finished' :
                               this.testCount + ' tests finished';
  };

  this.anySelected = function() {
    return this.testList.anySelected();
  };

  this.initialize();
};

CompactTestView.prototype = TestView.create();
CompactTestView.prototype.constructor = CompactTestView;

return {
  create: function(testSuiteVer, fields, style) {
    CompactTestView.prototype = TestView.create(testSuiteVer);
    CompactTestView.prototype.constructor = CompactTestView;
    return new CompactTestView(fields, style);
  }
};

})();
