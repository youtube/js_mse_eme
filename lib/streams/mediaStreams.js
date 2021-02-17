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

var Media = (function() {
  var streamTypes = [
    AAC_STREAMS, OPUS_STREAMS, H264_STREAMS, VP9_STREAMS, AV1_STREAMS,
    AC3_STREAMS, EAC3_STREAMS
  ];

  var codecTypes = {};
  codecTypes[AV1_STREAMS.streamtype] = AV1Codec;
  codecTypes[VP9_STREAMS.streamtype] = VP9Codec;

  var defaultWidth = {
    '144p': 256,
    '240p': 426,
    '360p': 640,
    '480p': 854,
    '720p': 1280,
    '1080p': 1920,
    '1440p': 2560,
    '2160p': 3840
  };

  var defaultHeight = {
    '144p': 144,
    '240p': 240,
    '360p': 360,
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '1440p': 1440,
    '2160p': 2160
  };

  var createStreamDefFunc = function(codec, mediaType, mimeType, container) {
    /**
     * @param {string} src - path to stream source file
     * @param {number} size - size of stream in bytes
     * @param {number} duration - duration of stream in seconds
     * @param {?Object<string, *>} customMap - other stream properties
     */
    return function(src, size, duration, customMap) {
      var get = function(attribute) {
        if (!customMap) {
          return null;
        }
        return attribute in customMap ? customMap[attribute] : null;
      };
      var mime = mimeType;
      var containerOverride;
      if (!!customMap) {
        if (customMap.hasOwnProperty('container')) {
          containerOverride = customMap['container'];
        }
        if (customMap.hasOwnProperty('codecMetadata')) {
          var codecString =
              codecTypes[codec].codecString(customMap['codecMetadata']);
          mime = `${mediaType}/${container}; codecs="${codecString}"`;
        } else if (customMap.hasOwnProperty('mimeType')) {
          mime = customMap['mimeType'];
        }
        // Set default width and height based on resolution.
        if ('resolution' in customMap) {
          if (!('width' in customMap))
            customMap.width = defaultWidth[customMap['resolution']];
          if (!('height' in customMap))
            customMap.height = defaultHeight[customMap['resolution']];
        }
      }
      return {
        codec: codec,
        mediatype: mediaType,
        container: (!!containerOverride) ? containerOverride : container,
        mimetype: mime,
        size: size,
        src: util.getMediaPath(src),
        duration: duration,
        bps: Math.floor(size / duration),
        customMap: customMap,
        get: get
      };
    };
  };

  var mediaStreams = {};
  for (var i in streamTypes) {
    var mimeType = streamTypes[i].mimetype;
    var mediaType = streamTypes[i].mediatype;
    var container = streamTypes[i].container;
    var streamType = streamTypes[i].streamtype;
    mediaStreams[streamType] = {};
    mediaStreams[streamType].mimetype = mimeType;
    var createStreamDef =
        createStreamDefFunc(streamType, mediaType, mimeType, container);

    var streams = streamTypes[i].streams;
    for (var streamName in streams) {
      if (streams.hasOwnProperty(streamName)) {
        mediaStreams[streamType][streamName] =
            createStreamDef.apply(null, streams[streamName]);
      }
    }
  }

  return mediaStreams;
})();
window.Media = Media;

try {
  exports.media = Media;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
