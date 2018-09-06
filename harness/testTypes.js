/*
Copyright 2018 Google Inc. All rights reserved.

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
    },
    'functional-test': {
      name: 'Functional Tests',
      title: 'Tests for required HTML/CSS/DOM/JS functionality',
      heading: 'Functional Tests'
    },
    'css-test': {
      name: 'CSS Conformance Tests',
      title: 'Tests for CSS Conformance functionalities',
      heading: 'CSS Conformance Tests'
    },
    'domelement-test': {
      name: 'HTML DOM Element Tests',
      title: 'Tests for various types of DOM Element',
      heading: 'HTML DOM ELement Tests'
    },
    'domcss-test': {
      name: 'DOM CSS Tests',
      title: 'Tests for DOM CSS element',
      heading: 'DOM CSS Tests'
    },
    'domdocument-test': {
      name: 'DOM Document Tests',
      title: 'Tests for DOM Document Event',
      heading: 'DOM Document & Event Tests'
    },
    'dommisc-test': {
      name: 'DOM chardata, window & Miscellaneous Tests',
      title: 'Tests for DOM chardata, window & Miscellaneous',
      heading: 'DOM chardata, window & Miscellaneous Tests'
    },
    'sphericalOnCobalt-test': {
      name: 'Cobalt Spherical Tests',
      title: 'Spherical video performance tests on Cobalt',
      heading: 'Spherical on Cobalt Tests'
    },
    'manual-test': {
      name: 'Manual Tests',
      title: 'Links to all manual tests',
      heading: 'Manual Test Links',
    }
  };

  window.testSuiteVersions = {
    [testVersion] : {
      'testSuites' : [
        'conformance-test',
        'encryptedmedia-test',
        'webgl-test',
        'sphericalOnCobalt-test',
        'progressive-test',
        'playbackperf-test',
        'functional-test',
        'css-test',
        'domelement-test',
        'domcss-test',
        'domdocument-test',
        'dommisc-test',
        'manual-test',
      ],
      'config' : {
        'defaultTestSuite': 'conformance-test',
        'enablewebm': true,
        'controlMediaFormatSelection': false
      }
    }
  };

})();
