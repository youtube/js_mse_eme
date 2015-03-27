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
'use strict';

var fullTestView = (function() {

function FullTestView(fields) {
  var self = this;
  this.divId = 'testview';
  this.testCount = 0;

  this.initialize = function() {
    this.testList = createFullTestList(fields);

    this.addSwitch('Loop: ', 'loop');
    this.addSwitch('Stop on failure: ', 'stoponfailure');
    this.addSwitch('Log: ', 'logging');
    this.addSwitch('WebM/VP9 (2015/tip only): ', 'enablewebm');

    this.addCommand('Select All', 'select-all', 'Select all tests.',
                    this.testList.selectAll.bind(this.testList));
    this.addCommand('Deselect All', 'deselect-all', 'Deselect all tests.',
                    this.testList.deselectAll.bind(this.testList));
    this.addCommand('Run Selected', 'run-selected',
                    'Run all selected tests in order.',
                    function(e) {
                      if (self.onrunselected)
                        self.onrunselected.call(self, e);
                    });

    this.addLink('Links', 'links.html');
    this.addLink('Instructions', 'instructions.html');
    this.addLink('Changelog', 'main.html');
    this.addLink('Download', 'download.tar.gz');

    this.addTestSuites(testTypes);
  };

  this.addTest = function(desc) {
    return this.testList.addTest(desc);
  };

  this.generate = function() {
    FullTestView.prototype.generate.call(this);
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

//FullTestView.prototype = TestView.create();
//FullTestView.prototype.constructor = FullTestView;

return {
  create: function(mseSpec, fields) {
    FullTestView.prototype = TestView.create(mseSpec);
    FullTestView.prototype.constructor = FullTestView;
    return new FullTestView(fields);
  }
};

})();

