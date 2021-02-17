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

const AC3_STREAMS = {
  streamtype: 'AC3',
  mimetype: 'audio/mp4; codecs="ac-3"',
  mediatype: 'audio',
  container: 'mp4',
  streams: {
    Audio51: ['spoken_channel_positions_ac3_51.fmp4', 645818, 13.44],
    DrmCbcs: [
      'cbcs/spoken_channel_positions_ac3_51.fmp4', 646814, 13.44, {
        'video_id': CBCS_VIDEO_ID,
        'widevine_signature': CBCS_WIDEVINE_SIGNATURE,
        'key': KEY,
      }
    ],
  },
};

window.AC3_STREAMS = AC3_STREAMS;
})();

try {
  exports.AC3_STREAMS = window.AC3_STREAMS;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
