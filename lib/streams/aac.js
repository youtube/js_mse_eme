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

const PLAYREADY_SIGNATURE_1 =
    '448279561E2755699618BE0A2402189D4A30B03B.0CD6A27286BD2DAF00577FFA21928665DCD320C2';
const WIDEVINE_SIGNATURE_1 =
    '9C4BE99E6F517B51FED1F0B3B31966D3C5DAB9D6.6A1F30BB35F3A39A4CA814B731450D4CBD198FFD';

/* The CBCS key details are:
 * video_id = 6508f99557a8385f
 * key_id = ccf3e9d6cbdd5647ab954c354629e25e
 * key = 0e4fe3c095a541b874c54e676c6688b0
 * iv = 93ff763c635bbd6ce411105db4d18db4
 */
const CBCS_VIDEO_ID = '6508f99557a8385f';
const CBCS_WIDEVINE_SIGNATURE =
    '5153900DAC410803EC269D252DAAA82BA6D8B825.495E631E406584A8EFCB4E9C9F3D45F6488B94E4';
const KEY = 'ik0';

const AAC_STREAMS = {
  streamtype: 'AAC',
  mimetype: 'audio/mp4; codecs="mp4a.40.2"',
  mediatype: 'audio',
  container: 'mp4',
  streams: {
    AudioTiny: ['car-20120827-8b.mp4', 717502, 181.62],
    AudioNormal: [
      'car-20120827-8c.mp4', 2884572, 181.58, {
        200000: 12.42,
        'halfSecondRangeEnd': 10695,
        'halfSecondDurationEnd': 7.9,
        'halfSecondBytes': [
          // Bytes were determined using the command:
          // `ffprobe -i car-20120827-8c.mp4 -show_packets`
          0,
          10695,
          18504,
          26561,
          34310,
          42401,
          49986,
          58167,
          65700,
          73651,
          81704,
          89501,
          97173,
          104745,
          112544,
          120466,
          128435,
        ],
      }
    ],
    AudioHuge:
        ['car-20120827-8d.mp4', 5789853, 181.58, {'appendAudioOffset': 17.42}],
    Audio51: ['sintel-trunc.mp4', 813119, 20.05],
    Audio1MB: ['car-audio-1MB-trunc.mp4', 1048576, 65.875],
    AudioLowExplicitHE: [
      'spotlight-tr-heaac-explicit.mp4', 156137, 26.10,
      {'mimeType': 'audio/mp4; codecs="mp4a.40.5"', 'sbrSignaling': 'Explicit'}
    ],
    AudioLowImplicitHE: [
      'spotlight-tr-heaac-implicit.mp4', 156138, 26.10,
      {'mimeType': 'audio/mp4; codecs="mp4a.40.5"', 'sbrSignaling': 'Implicit'}
    ],
    AudioForVP9Live: ['vp9-live.mp4', 243930, 14.997],
    AudioNormalClearKey: [
      'car_cenc-20120827-8c.mp4', 3013084, 181.58, {
        'key': util.createUint8ArrayFromJSArray([
          0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2, 0x9e, 0xc8, 0x16,
          0xac, 0x7b, 0xae, 0x20, 0x82
        ]),
        'kid': util.createUint8ArrayFromJSArray([
          0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87, 0x7e, 0x57, 0xd0,
          0x0d, 0x1e, 0xd0, 0x0d, 0x1e
        ])
      }
    ],
    AudioSmallCenc: [
      'oops_cenc-20121114-148.mp4', 999679, 242.71, {
        'video_id': '03681262dc412c06',
        'playready_signature': PLAYREADY_SIGNATURE_1,
        'widevine_signature': WIDEVINE_SIGNATURE_1,
      }
    ],
    AudioMeridian: ['meridian_aac_med.mp4', 11638237, 719.08],
    DrmCbcs: [
      'cbcs/car-20120827-8b.mp4', 718486, 181.63, {
        'video_id': CBCS_VIDEO_ID,
        'widevine_signature': CBCS_WIDEVINE_SIGNATURE,
        'key': KEY,
      }
    ],
  },
};

window.AAC_STREAMS = AAC_STREAMS;
})();

try {
  exports.AAC_STREAMS = window.AAC_STREAMS;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
