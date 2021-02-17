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

/**
 * These are all encrypted with the same key, for ease of testing.
 * Normally YT would use different keys for HDR and non HDR, and also for
 * different resolution families.
 */
const SD_VID = '6508f99557a8385f';  // Whitelisted in DRM server
const WIDEVINE_SIGNATURE =
    '5153900DAC410803EC269D252DAAA82BA6D8B825.495E631E406584A8EFCB4E9C9F3D45F6488B94E4';
const KEY = 'ik0';


/**
 * AV1 Encrypted Samples.
 *
 * These files have have Sample Aux Info in senc atom, in the moof.
 * These files are produced by Shaka, which remuxes, so other aspects will not
 * match YT produced files.
 * (Eg there is no colr atom)
 */
const AV1_STREAMS_SENC = {
  SencSdr144p30: [
    'av1-senc/sdr_144p30.mp4', 143594, 18.08, {
      'fps': 29.97,
      'resolution': '144p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '2.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr240p30: [
    'av1-senc/sdr_240p30.mp4', 315809, 18.08, {
      'fps': 29.97,
      'resolution': '240p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '2.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr360p30: [
    'av1-senc/sdr_360p30.mp4', 645395, 18.08, {
      'fps': 29.97,
      'resolution': '360p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '2.1'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr480p30: [
    'av1-senc/sdr_480p30.mp4', 1176421, 18.08, {
      'fps': 29.97,
      'resolution': '480p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '3.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr720p30: [
    'av1-senc/sdr_720p30.mp4', 2383233, 18.08, {
      'fps': 29.97,
      'resolution': '720p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '3.1'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr720p60: [
    'av1-senc/sdr_720p60.mp4', 75305131, 634.53, {
      'fps': 60.0,
      'resolution': '720p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '4.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr1080p30: [
    'av1-senc/sdr_1080p30.mp4', 4352354, 18.08, {
      'fps': 29.97,
      'resolution': '1080p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '4.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr1080p60: [
    'av1-senc/sdr_1080p60.mp4', 130659448, 634.53, {
      'fps': 60.0,
      'resolution': '1080p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '4.1'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr1440p30: [
    'av1-senc/sdr_1440p30.mp4', 15560060, 18.08, {
      'fps': 29.97,
      'resolution': '1440p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '5.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr1440p60: [
    'av1-senc/sdr_1440p60.mp4', 20284265, 30.0, {
      'fps': 60.0,
      'resolution': '1440p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '5.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr2160p30: [
    'av1-senc/sdr_2160p30.mp4', 33638469, 18.08, {
      'fps': 29.97,
      'resolution': '2160p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '5.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr2160p60: [
    'av1-senc/sdr_2160p60.mp4', 41872388, 30.0, {
      'fps': 60.0,
      'resolution': '2160p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '5.1'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencSdr4320p30: [
    'av1-senc/sdr_4320p30.mp4', 73120375, 18.08, {
      'fps': 29.97,
      'resolution': '4320p',
      'transferFunction': 'BT709',
      'codecMetadata': {level: '6.0'},
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg144p30: [
    'av1-senc/hdr_hlg_144p30.mp4', 325188, 35.0, {
      'fps': 29.97,
      'resolution': '144p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '2.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg240p30: [
    'av1-senc/hdr_hlg_240p30.mp4', 664456, 35.0, {
      'fps': 29.97,
      'resolution': '240p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '2.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg360p30: [
    'av1-senc/hdr_hlg_360p30.mp4', 1307676, 35.0, {
      'fps': 29.97,
      'resolution': '360p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '2.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg480p30: [
    'av1-senc/hdr_hlg_480p30.mp4', 2194776, 35.0, {
      'fps': 29.97,
      'resolution': '480p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '3.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg720p24: [
    'av1-senc/hdr_hlg_720p24.mp4', 1331675, 29.99, {
      'fps': 23.98,
      'resolution': '720p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '3.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg720p60: [
    'av1-senc/hdr_hlg_720p60.mp4', 4968837, 35.0, {
      'fps': 59.94,
      'resolution': '720p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '4.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg1080p24: [
    'av1-senc/hdr_hlg_1080p24.mp4', 2335974, 29.99, {
      'fps': 23.98,
      'resolution': '1080p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '4.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg1080p60: [
    'av1-senc/hdr_hlg_1080p60.mp4', 8671061, 35.0, {
      'fps': 59.94,
      'resolution': '1080p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '4.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg1440p24: [
    'av1-senc/hdr_hlg_1440p24.mp4', 7415998, 29.99, {
      'fps': 23.98,
      'resolution': '1440p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg1440p60: [
    'av1-senc/hdr_hlg_1440p60.mp4', 25748781, 35.0, {
      'fps': 59.94,
      'resolution': '1440p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg2160p24: [
    'av1-senc/hdr_hlg_2160p24.mp4', 15788837, 29.99, {
      'fps': 23.98,
      'resolution': '2160p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrHlg2160p60: [
    'av1-senc/hdr_hlg_2160p60.mp4', 51701800, 35.0, {
      'fps': 59.94,
      'resolution': '2160p',
      'transferFunction': 'HLG',
      'codecMetadata':
          Object.assign({}, AV1Codec.hlgMetadata(), {level: '5.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq144p30: [
    'av1-senc/hdr_pq_144p30.mp4', 265864, 30.0, {
      'fps': 29.97,
      'resolution': '144p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '2.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq240p30: [
    'av1-senc/hdr_pq_240p30.mp4', 511432, 30.0, {
      'fps': 29.97,
      'resolution': '240p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '2.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq360p30: [
    'av1-senc/hdr_pq_360p30.mp4', 957987, 30.0, {
      'fps': 29.97,
      'resolution': '360p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '2.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq480p30: [
    'av1-senc/hdr_pq_480p30.mp4', 1632543, 30.0, {
      'fps': 29.97,
      'resolution': '480p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '3.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq720p24: [
    'av1-senc/hdr_pq_720p24.mp4', 3450528, 29.99, {
      'fps': 23.98,
      'resolution': '720p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '3.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq720p60: [
    'av1-senc/hdr_pq_720p60.mp4', 3970641, 30.0, {
      'fps': 59.94,
      'resolution': '720p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '4.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq1080p24: [
    'av1-senc/hdr_pq_1080p24.mp4', 6291040, 29.99, {
      'fps': 23.98,
      'resolution': '1080p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '4.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq1080p60: [
    'av1-senc/hdr_pq_1080p60.mp4', 7180975, 30.0, {
      'fps': 59.94,
      'resolution': '1080p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '4.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq1440p24: [
    'av1-senc/hdr_pq_1440p24.mp4', 19201941, 29.99, {
      'fps': 23.98,
      'resolution': '1440p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq1440p60: [
    'av1-senc/hdr_pq_1440p60.mp4', 24495537, 30.0, {
      'fps': 59.94,
      'resolution': '1440p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq2160p24: [
    'av1-senc/hdr_pq_2160p24.mp4', 39834609, 29.99, {
      'fps': 23.98,
      'resolution': '2160p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.0'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
  SencHdrPq2160p60: [
    'av1-senc/hdr_pq_2160p60.mp4', 50854514, 30.0, {
      'fps': 59.94,
      'resolution': '2160p',
      'transferFunction': 'PQ',
      'codecMetadata': Object.assign({}, AV1Codec.pqMetadata(), {level: '5.1'}),
      'video_id': SD_VID,
      'widevine_signature': WIDEVINE_SIGNATURE,
      'key': KEY,
    }
  ],
};

window.AV1_STREAMS_SENC = AV1_STREAMS_SENC;
})();

try {
  exports.AV1_STREAMS_SENC = window.AV1_STREAMS_SENC;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
