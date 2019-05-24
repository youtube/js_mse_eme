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

(function() {

  window.testSuiteDescriptions = {
    'conformance-test': {
      name: 'MSE Conformance Tests',
      title: 'Media Source and Media Conformance Tests',
      heading: 'MSE Conformance Tests'
    },
    'msecodec-test': {
      name: 'MSE Codec Tests',
      title: 'Media Source and Media Conformance Tests for Codecs',
      heading: 'MSE Codec Tests'
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
    'playbackperf-sfr-vp9-test': {
      name: 'VP9 SFR Tests',
      title: 'Tests for performance of VP9 SFR video playback and decoding',
      heading: 'VP9 SFR Tests'
    },
    'playbackperf-sfr-h264-test': {
      name: 'H264 SFR Tests',
      title: 'Tests for performance of H264 SFR video playback and decoding',
      heading: 'H264 SFR Tests'
    },
    'playbackperf-hfr-test': {
      name: 'HFR Tests',
      title: 'Tests for performance of HFR video playback and decoding',
      heading: 'HFR Tests'
    },
    'playbackperf-widevine-sfr-vp9-test': {
      name: 'VP9 Widevine SFR Tests',
      title: 'Tests for performance of VP9 DRM video playback and decoding',
      heading: 'VP9 Widevine SFR Tests'
    },
    'playbackperf-widevine-sfr-h264-test': {
      name: 'H264 Widevine SFR Tests',
      title: 'Tests for performance of H264 DRM video playback and decoding',
      heading: 'H264 Widevine SFR Tests'
    },
    'playbackperf-widevine-hfr-test': {
      name: 'Widevine HFR Tests',
      title: 'Tests for performance of HFR video playback and decoding',
      heading: 'Widevine HFR Tests'
    },
    'sphericalOnCobalt-test': {
      name: 'Cobalt Spherical Tests',
      title: 'Spherical video performance tests on Cobalt',
      heading: 'Spherical on Cobalt Tests'
    },
  };

  window.testSuiteVersions = {
    [testVersion] : {
      'testSuites' : [
        'conformance-test',
        'msecodec-test',
        'encryptedmedia-test',
        'webgl-test',
        'sphericalOnCobalt-test',
        'progressive-test',
        'playbackperf-sfr-vp9-test',
        'playbackperf-sfr-h264-test',
        'playbackperf-hfr-test',
        'playbackperf-widevine-sfr-vp9-test',
        'playbackperf-widevine-sfr-h264-test',
        'playbackperf-widevine-hfr-test',
      ],
      'config' : {
        'defaultTestSuite': 'conformance-test',
        'enablewebm': true,
        'controlMediaFormatSelection': false
      }
    }
  };

})();
