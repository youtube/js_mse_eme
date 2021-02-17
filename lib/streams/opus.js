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

const SINTEL_WIDEVINE_SIGNATURE =
    '4511DBFEF4177B5F0DF1FAA23562D4FD7FDE0D1A.457901F5F063B3D9E8252B403D120683BEE47216';

const OPUS_STREAMS = {
  streamtype: 'Opus',
  mimetype: 'audio/webm; codecs="opus"',
  mediatype: 'audio',
  container: 'webm',
  streams: {
    Audio51: ['opus51.webm', 15583281, 300.02],
    CarLow: ['car_opus_low.webm', 1205174, 181.48],
    CarMed: [
      'car_opus_med.webm', 1657817, 181.48, {
        200000: 28.221,
        'halfSecondRangeEnd': 832,
        'halfSecondDurationEnd': 7.9,
        'halfSecondBytes': [
          // Bytes were determined using the command:
          // `mkvinfo car_opus_med.webm -t -v -v`
          0,
          839,
          4914,
          9491,
          14193,
          19465,
          24626,
          28805,
          33149,
          36685,
          40074,
          44151,
          47519,
          50836,
          54544,
          58708,
          62757,
        ],
      }
    ],
    CarHigh:
        ['car_opus_high.webm', 3280103, 181.48, {'appendAudioOffset': 33.221}],
    SantaHigh: ['santa_opus_high.webm', 1198448, 70.861],
    SintelEncrypted: [
      'sintel_opus_enc.webm', 14956771, 888.04, {
        'video_id': '31e1685307acf271',
        'widevine_signature': SINTEL_WIDEVINE_SIGNATURE,
      }
    ],
  },
};

window.OPUS_STREAMS = OPUS_STREAMS;
})();

try {
  exports.OPUS_STREAMS = window.OPUS_STREAMS;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
