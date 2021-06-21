/**
 * @license
 * Copyright 2020 Google Inc. All rights reserved.
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

(function() {

const AV1_STREAMS_CLEAR = {
  VideoSmall: [
    'iPLm0O-flS8-56.62-Vlog_2160_240p.mp4', 338002, 18.08, {
      'fps': 30,
      'resolution': '240p',
      'codecMetadata': {level: '2.0'},
    }
  ],
  Video1MB: [
    'big-buck-bunny-av1-144p-30fps.mp4', 1000000, 108.33, {
      'fps': 30,
      'resolution': '144p',
      'codecMetadata': {level: '2.0'},
    }
  ],
  Bunny144p30fps: [
    'big-buck-bunny-av1-144p-30fps.mp4', 5829002, 634.60, {
      'fps': 30,
      'resolution': '144p',
      'codecMetadata': {level: '2.0'},
    }
  ],
  Bunny240p30fps: [
    'big-buck-bunny-av1-240p-30fps.mp4', 11684317, 634.60, {
      'fps': 30,
      'resolution': '240p',
      'codecMetadata': {level: '2.0'},
      'videoChangeRate': 25.37,
    }
  ],
  Bunny360p30fps: [
    'big-buck-bunny-av1-360p-30fps.mp4', 20805110, 634.60, {
      'fps': 30,
      'resolution': '360p',
      'codecMetadata': {level: '2.1'},
    }
  ],
  Bunny480p30fps: [
    'big-buck-bunny-av1-480p-30fps.mp4', 36194938, 634.60, {
      'fps': 30,
      'resolution': '480p',
      'codecMetadata': {level: '3.0'},
    }
  ],
  Bunny720p30fps: [
    'big-buck-bunny-av1-720p-30fps.mp4', 70832592, 634.60, {
      'fps': 30,
      'resolution': '720p',
      'codecMetadata': {level: '3.1'},
    }
  ],
  Bunny720p60fps: [
    'big-buck-bunny-av1-720p-60fps.mp4', 77454477, 634.57, {
      'fps': 60,
      'resolution': '720p',
      'codecMetadata': {level: '4.0'},
    }
  ],
  Bunny1080p30fps: [
    'big-buck-bunny-av1-1080p-30fps.mp4', 131929783, 634.60, {
      'fps': 30,
      'resolution': '1080p',
      'codecMetadata': {level: '4.0'},
    }
  ],
  Bunny1080p60fps: [
    'big-buck-bunny-av1-1080p-60fps.mp4', 132082214, 634.57, {
      'fps': 60,
      'resolution': '1080p',
      'codecMetadata': {level: '4.1'},
    }
  ],
  Bunny1440p30fps: [
    'big-buck-bunny-av1-1440p-30fps.mp4', 389127462, 624.00, {
      'fps': 30,
      'resolution': '1440p',
      'codecMetadata': {level: '5.0'},
    }
  ],
  Bunny1440p60fps: [
    'big-buck-bunny-av1-1440p-60fps.mp4', 406942546, 334.40, {
      'fps': 60,
      'resolution': '1440p',
      'codecMetadata': {level: '5.0'},
    }
  ],
  Sports2160p30fps: [
    'sports_2160p30.mp4', 30760646, 19.99, {
      'fps': 30,
      'resolution': '2160p',
      'codecMetadata': {level: '5.0'},
    }
  ],
  Sdr144p: [
    'av1/bbb_sunflower_144p.mp4', 236093, 30.00, {
      'fps': 30,
      'resolution': '144p',
      'codecMetadata': {level: '2.0'},
    }
  ],
  Sdr240p: [
    'av1/bbb_sunflower_240p.mp4', 420869, 30.00, {
      'fps': 30,
      'resolution': '240p',
      'codecMetadata': {level: '2.0'},
    }
  ],
  Sdr360p: [
    'av1/bbb_sunflower_360p.mp4', 873797, 30.00, {
      'fps': 30,
      'resolution': '360p',
      'codecMetadata': {level: '2.1'},
    }
  ],
  Sdr480p: [
    'av1/bbb_sunflower_480p.mp4', 1623181, 30.00, {
      'fps': 30,
      'resolution': '480p',
      'codecMetadata': {level: '3.0'},
    }
  ],
  Sdr720p30: [
    'av1/bbb_sunflower_720p30.mp4', 3346131, 30.00, {
      'fps': 30,
      'resolution': '720p',
      'codecMetadata': {level: '3.1'},
    }
  ],
  Sdr720p60: [
    'av1/bbb_sunflower_720p60.mp4', 3545933, 30.00, {
      'fps': 60,
      'resolution': '720p',
      'codecMetadata': {level: '4.0'},
    }
  ],
  Sdr1080p30: [
    'av1/bbb_sunflower_1080p30.mp4', 6055665, 30.00, {
      'fps': 30,
      'resolution': '1080p',
      'codecMetadata': {level: '4.0'},
    }
  ],
  Sdr1080p60: [
    'av1/bbb_sunflower_1080p60.mp4', 6077973, 30.00, {
      'fps': 60,
      'resolution': '1080p',
      'codecMetadata': {level: '4.1'},
    }
  ],
  Sdr1440p30: [
    'av1/bbb_sunflower_1440p30.mp4', 19682925, 30.00, {
      'fps': 30,
      'resolution': '1440p',
      'codecMetadata': {level: '5.0'},
    }
  ],
  Sdr1440p60: [
    'av1/bbb_sunflower_1440p60.mp4', 20199687, 30.00, {
      'fps': 60,
      'resolution': '1440p',
      'codecMetadata': {level: '5.0'},
    }
  ],
  Sdr2160p30: [
    'av1/bbb_sunflower_2160p30.mp4', 40943207, 30.00, {
      'fps': 30,
      'resolution': '2160p',
      'codecMetadata': {level: '5.0'},
    }
  ],
  Sdr2160p60: [
    'av1/bbb_sunflower_2160p60.mp4', 41562198, 30.00, {
      'fps': 60,
      'resolution': '2160p',
      'codecMetadata': {level: '5.1'},
    }
  ],
  Sdr4320p30: [
    'av1/Sample4-6141.04-Sports_2160_8k.mp4', 72517369, 20.19, {
      'fps': 30,
      'resolution': '4320p',
      'codecMetadata': {level: '6.0'},
    }
  ],
  Sdr1mb4320p30: [
    'av1/Sample4-1mb-6141.04-Sports_2160_8k.mp4', 1967277, 6.01, {
      'fps': 30,
      'resolution': '4320p',
      'codecMetadata': {level: '6.0'},
    }
  ],
  HdrHlg144p: [
    'av1/hdr3_hlg_30fps_144p.mp4', 313183, 35.00, {
      'fps': 30,
      'resolution': '144p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '2.0'}),
    }
  ],
  HdrHlg240p: [
    'av1/hdr3_hlg_30fps_240p.mp4', 652385, 35.00, {
      'fps': 30,
      'resolution': '240p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '2.0'}),
    }
  ],
  HdrHlg360p: [
    'av1/hdr3_hlg_30fps_360p.mp4', 1290043, 35.00, {
      'fps': 30,
      'resolution': '360p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '2.1'}),
    }
  ],
  HdrHlg480p: [
    'av1/hdr3_hlg_30fps_480p.mp4', 2177095, 35.00, {
      'fps': 30,
      'resolution': '480p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '3.0'}),
    }
  ],
  HdrHlg720p24: [
    'av1/hdr2_hlg_24fps_720p.mp4', 1312552, 29.99, {
      'fps': 24,
      'resolution': '720p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '3.1'}),
    }
  ],
  HdrHlg720p60: [
    'av1/hdr3_hlg_60fps_720p.mp4', 4911991, 35.00, {
      'fps': 60,
      'resolution': '720p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '4.0'}),
    }
  ],
  HdrHlg1080p24: [
    'av1/hdr2_hlg_24fps_1080p.mp4', 2302811, 29.99, {
      'fps': 24,
      'resolution': '1080p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '4.0'}),
    }
  ],
  HdrHlg1080p60: [
    'av1/hdr3_hlg_60fps_1080p.mp4', 8570043, 35.00, {
      'fps': 60,
      'resolution': '1080p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '4.1'}),
    }
  ],
  HdrHlg1440p24: [
    'av1/hdr2_hlg_24fps_2k.mp4', 7382834, 29.99, {
      'fps': 24,
      'resolution': '1440p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.0'}),
    }
  ],
  HdrHlg1440p60: [
    'av1/hdr3_hlg_60fps_2k.mp4', 25648476, 35.00, {
      'fps': 60,
      'resolution': '1440p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.0'}),
    }
  ],
  HdrHlg2160p24: [
    'av1/hdr2_hlg_24fps_4k.mp4', 15670569, 29.99, {
      'fps': 24,
      'resolution': '2160p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.0'}),
    }
  ],
  HdrHlg2160p60: [
    'av1/hdr3_hlg_60fps_4k.mp4', 51335401, 35.00, {
      'fps': 60,
      'resolution': '2160p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.1'}),
    }
  ],
  HdrPq144p: [
    'av1/Meridian_2997fps_HDR10_144p.mp4', 255658, 30.00, {
      'fps': 30,
      'resolution': '144p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '2.0'}),
    }
  ],
  HdrPq240p: [
    'av1/Meridian_2997fps_HDR10_240p.mp4', 501232, 30.00, {
      'fps': 30,
      'resolution': '240p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '2.0'}),
    }
  ],
  HdrPq360p: [
    'av1/Meridian_2997fps_HDR10_360p.mp4', 943353, 30.00, {
      'fps': 30,
      'resolution': '360p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '2.1'}),
    }
  ],
  HdrPq480p: [
    'av1/Meridian_2997fps_HDR10_480p.mp4', 1617903, 30.00, {
      'fps': 30,
      'resolution': '480p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '3.0'}),
    }
  ],
  HdrPq720p24: [
    'av1/hdr1_pq_24fps_720p.mp4', 3431261, 29.99, {
      'fps': 24,
      'resolution': '720p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '3.1'}),
    }
  ],
  HdrPq720p60: [
    'av1/Meridian_5994fps_HDR10_720p.mp4', 3924396, 30.00, {
      'fps': 60,
      'resolution': '720p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '4.0'}),
    }
  ],
  HdrPq1080p24: [
    'av1/hdr1_pq_24fps_1080p.mp4', 6257103, 29.99, {
      'fps': 24,
      'resolution': '1080p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '4.0'}),
    }
  ],
  HdrPq1080p60: [
    'av1/Meridian_5994fps_HDR10_1080p.mp4', 7098382, 30.00, {
      'fps': 60,
      'resolution': '1080p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '4.1'}),
    }
  ],
  HdrPq1440p24: [
    'av1/hdr1_pq_24fps_2k.mp4', 19168087, 29.99, {
      'fps': 24,
      'resolution': '1440p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.0'}),
    }
  ],
  HdrPq1440p60: [
    'av1/Meridian_5994fps_HDR10_2k.mp4', 24412883, 30.00, {
      'fps': 60,
      'resolution': '1440p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.0'}),
    }
  ],
  HdrPq2160p24: [
    'av1/hdr1_pq_24fps_4k.mp4', 39713839, 29.99, {
      'fps': 24,
      'resolution': '2160p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.0'}),
    }
  ],
  HdrPq2160p60: [
    'av1/Meridian_5994fps_HDR10_4k.mp4', 50552758, 30.00, {
      'fps': 60,
      'resolution': '2160p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.1'}),
    }
  ],
};

window.AV1_STREAMS_CLEAR = AV1_STREAMS_CLEAR;
})();

try {
  exports.AV1_STREAMS_CLEAR = window.AV1_STREAMS_CLEAR;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
