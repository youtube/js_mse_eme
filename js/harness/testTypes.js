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

(function() {

window.testSuiteDescriptions = {
  'conformance-test': {
    name: 'MSE Conformance Tests',
    title: 'Media Source and Media Conformance Tests',
    heading: 'MSE Conformance Tests'
  },
  'encryptedmedia-test': { 
    name: 'EME Conformance Tests',
    title: 'Encrypted Media Extensions Conformance Tests',
    heading: 'EME Conformance Tests'
   },
  'progressive-test': {
    name: 'Progressive Tests',
    title: 'HTML Media Element Conformance Tests',
    heading: 'HTML Media Element Conformance Tests'
  },
  'webgl-test': {
    name: 'WebGL Performance Tests',
    title: 'Web Graphics Library Performance Tests',
    heading: 'WebGL Performance Tests'
  },
  'playbackperf-test': {
    name: 'Playback Performance Tests',
    title: 'Tests for performance of video playback and decoding',
    heading: 'Playback Performance Tests'
  }
};

window.testSuiteVersions = {
  '0.5' : {
    'testSuites' : [
      'conformance-test',
      'progressive-test'
    ],
    'config' : {
      'defaultTestSuite': 'conformance-test',
      'enablewebm': false,
      'controlMediaFormatSelection': false
    }
  },
  '0.6' : {
    'testSuites' : [
      'conformance-test',
      'progressive-test'
    ],
    'config' : {
      'defaultTestSuite': 'conformance-test',
      'enablewebm': false,
      'controlMediaFormatSelection': false
    }
  },
  '2015' : {
    'testSuites' : [
      'conformance-test',
      'encryptedmedia-test',
      'progressive-test'
    ],
    'config' : {
      'defaultTestSuite': 'conformance-test',
      'enablewebm': false,
      'controlMediaFormatSelection': true
    }
  },
  '2016' : {
    'testSuites' : [
      'conformance-test',
      'encryptedmedia-test',
      'progressive-test'
    ],
    'config' : {
      'defaultTestSuite': 'conformance-test',
      'enablewebm': true,
      'controlMediaFormatSelection': true
    }
  },
  '2017' : {
    'testSuites' : [
      'conformance-test',
      'encryptedmedia-test',
      'webgl-test',
      'progressive-test'
    ],
    'config' : {
      'defaultTestSuite': 'conformance-test',
      'enablewebm': true,
      'controlMediaFormatSelection': false
    }
  },
  '2018' : {
    'testSuites' : [
      'conformance-test',
      'encryptedmedia-test',
      'webgl-test',
      'progressive-test',
      'playbackperf-test'
    ],
    'config' : {
      'defaultTestSuite': 'conformance-test',
      'enablewebm': true,
      'controlMediaFormatSelection': false
    }
  },
  'tip' : {
    'testSuites' : [
      'conformance-test',
      'encryptedmedia-test',
      'webgl-test',
      'progressive-test',
      'playbackperf-test'
    ],
    'config' : {
      'defaultTestSuite': 'conformance-test',
      'enablewebm': true,
      'controlMediaFormatSelection': false
    }
  }
};

})();
