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

const AV1_STREAMS = {
  streamtype: 'AV1',
  mimetype: `video/mp4; codecs="${AV1Codec.codecString()}"`,
  mediatype: 'video',
  container: 'mp4',
  streams: Object.assign({}, AV1_STREAMS_CLEAR, AV1_STREAMS_SENC),
};

window.AV1_STREAMS = AV1_STREAMS;
})();

try {
  exports.AV1_STREAMS = window.AV1_STREAMS;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
