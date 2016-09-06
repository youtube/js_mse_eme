/*
Copyright 2016 Google Inc. All rights reserved.

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

var Media = (function() {
  var AAC = {
    streamtype: 'AAC',
    mimetype: 'audio/mp4; codecs="mp4a.40.2"',
    mediatype: 'audio',
    streams : {
      AudioTiny: ['media/car-20120827-8b.mp4', 717502, 181.62],
      AudioNormal: ['media/car-20120827-8c.mp4', 2884572, 181.58, {200000: 12.42}],
      AudioHuge: ['media/car-20120827-8d.mp4', 5789853, 181.58, {'appendAudioOffset': 17.42}],
      Audio51: ['media/sintel-trunc.mp4', 813119, 20.05],
      Audio1MB: ['media/car-audio-1MB-trunc.mp4', 1048576, 65.875],
      AudioNormalClearKey: ['media/car_cenc-20120827-8c.mp4', 3013084, 181.58, {
          'key': new Uint8Array([0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
                                 0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]),
          'kid': new Uint8Array([0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
                                 0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e])}],
      AudioSmallCenc: ['media/oops_cenc-20121114-148.mp4', 999679, 242.71, {
          'video_id': '03681262dc412c06',
          'playready_signature': '448279561E2755699618BE0A2402189D4A30B03B.0CD6A27286BD2DAF00577FFA21928665DCD320C2',
          'widevine_signature': '9C4BE99E6F517B51FED1F0B3B31966D3C5DAB9D6.6A1F30BB35F3A39A4CA814B731450D4CBD198FFD'}],
    },
  };

  var Opus = {
    streamtype: 'Opus',
    mimetype: 'audio/webm; codecs="opus"',
    mediatype: 'audio',
    streams: {
      CarLow: ['media/car_opus_low.webm', 1205174, 181.48],
      CarMed: ['media/car_opus_med.webm', 1657817, 181.48, {200000: 28.221}],
      CarHigh: ['media/car_opus_high.webm', 3280103, 181.48,  {'appendAudioOffset': 33.221}],
      SintelEncrypted: ['media/sintel_opus_enc.webm', 14956771, 888.04, {
          'video_id': '31e1685307acf271',
          'widevine_signature': '4511DBFEF4177B5F0DF1FAA23562D4FD7FDE0D1A.457901F5F063B3D9E8252B403D120683BEE47216'}],
    },
  };

  var H264 = {
    streamtype: 'H264',
    mimetype: 'video/mp4; codecs="avc1.640028"',
    mediatype: 'video',
    streams: {
      VideoTiny: ['media/car-20120827-85.mp4', 6015001, 181.44, {
          'videoChangeRate': 11.47}],
      VideoNormal: ['media/car-20120827-86.mp4', 15593225, 181.44, {
          'mediaSourceDuration': Infinity}],
      VideoHuge: ['media/car-20120827-89.mp4', 95286345, 181.44],
      Video1MB: ['media/test-video-1MB.mp4', 1053406, 1.04],
      VideoNormalClearKey: ['media/car_cenc-20120827-86.mp4', 15795193, 181.44, {
          'key': new Uint8Array([0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
                                 0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]),
          'kid': new Uint8Array([0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
                                 0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e])}],
      VideoStreamYTCenc: ['media/oops_cenc-20121114-145-no-clear-start.mp4', 39980507, 242.71, {
          'key': new Uint8Array([233, 122, 210, 133, 203, 93, 59, 228,
                                 167, 150, 27, 122, 246, 145, 112, 218])}],
      VideoTinyStreamYTCenc: ['media/oops_cenc-20121114-145-143.mp4', 7229257, 30.03],
      VideoSmallStreamYTCenc: ['media/oops_cenc-20121114-143-no-clear-start.mp4', 12045546, 242.71, {
          'key': new Uint8Array([131, 162, 92, 175, 153, 178, 172, 41,
                                 2, 167, 251, 126, 233, 215, 230, 185])}],
      VideoSmallCenc: ['media/oops_cenc-20121114-142.mp4', 8017271, 242.71, {
          'video_id': '03681262dc412c06',
          'playready_signature': '448279561E2755699618BE0A2402189D4A30B03B.0CD6A27286BD2DAF00577FFA21928665DCD320C2',
          'widevine_signature': '9C4BE99E6F517B51FED1F0B3B31966D3C5DAB9D6.6A1F30BB35F3A39A4CA814B731450D4CBD198FFD'}],
      ProgressiveLow: ['media/car_20130125_18.mp4', 15477531, 181.55],
      FrameGap: ['media/nq-frames24-tfdt23.mp4', 11883895, 242.46],
      FrameOverlap: ['media/nq-frames23-tfdt24.mp4', 11883895, 242.46],
    },
  };

  var VP9 = {
    streamtype: 'VP9',
    mimetype: 'video/webm; codecs="vp9"',
    mediatype: 'video',
    streams: {
      VideoTiny: ['media/feelings_vp9-20130806-242.webm', 4478156, 135.46, {
          'videoChangeRate': 15.35}],
      VideoNormal: ['media/feelings_vp9-20130806-243.webm', 7902885, 135.46, {
          'mediaSourceDuration': 135.469}],
      VideoHuge: ['media/feelings_vp9-20130806-247.webm', 27757852, 135.46],
      Video1MB: ['media/vp9-video-1mb.webm', 1103716, 1.00],
      VideoNormalClearKey: ['media/vid_vp9_encrypted03.webm', 657432, 6.00, {
          'key': new Uint8Array([186, 232, 192, 193, 246, 129, 195, 1,
                                 235, 26, 73, 6, 214, 222, 222, 17]),
          'kid': new Uint8Array([65, 192, 59, 240, 250, 198, 147, 131,
                                 234, 178, 123, 253, 240, 131, 240, 129])}],
      VideoStreamYTCenc: ['media/vid_vp9_encrypted04.webm', 657432, 6.00, {
          'key': new Uint8Array([186, 232, 192, 193, 246, 129, 195, 1,
                                 235, 26, 73, 6, 214, 222, 222, 17]),
          'kid': new Uint8Array([65, 192, 59, 240, 250, 198, 147, 131,
                                 234, 178, 123, 253, 240, 131, 240, 129])}],
      VideoSmallStreamYTCenc: ['media/vid_vp9_encrypted05.webm', 657432, 6.00, {
          'key': new Uint8Array([179, 232, 192, 192, 150, 129, 195, 1,
                                 235, 26, 73, 5, 54, 222, 222, 193]),
          'kid': new Uint8Array([135, 240, 59, 224, 234, 214, 147, 131,
                                 234, 176, 123, 253, 240, 131, 240, 220])}],
      VideoHighEnc: ['media/sintel_enc-20160621-273.webm', 68919485, 887.958, {
          'video_id': '31e1685307acf271',
          'widevine_signature': '4511DBFEF4177B5F0DF1FAA23562D4FD7FDE0D1A.457901F5F063B3D9E8252B403D120683BEE47216'}],
      ProgressiveLow: ['media/feelings_vp9-20130806-243.webm', 7902885, 135.46],
    },
  };

  var streamTypes = [AAC, Opus, H264, VP9];

  var createStreamDefFunc = function(codec, mediaType, mimeType) {
    return function(src, size, duration, customMap) {
      var get = function(attribute) {
        return attribute in customMap ? customMap[attribute] : null;
      };
      return {codec: codec, mediatype: mediaType, mimetype: mimeType,
          size: size, src: src, duration: duration,
          bps: Math.floor(size / duration), customMap: customMap, get: get};
    };
  };

  var mediaStreams = {};
  for (var i in streamTypes) {
    var mimeType = streamTypes[i].mimetype;
    var mediaType = streamTypes[i].mediatype;
    var streamType = streamTypes[i].streamtype;
    mediaStreams[streamType] = {};
    mediaStreams[streamType].mimetype = mimeType;
    var createStreamDef = createStreamDefFunc(streamType, mediaType, mimeType);

    var streams = streamTypes[i].streams;
    for (var streamName in streams) {
      if (streams.hasOwnProperty(streamName)) {
        mediaStreams[streamType][streamName] = createStreamDef.apply(null, streams[streamName]);
      }
    }
  }

  return mediaStreams;
})();

// This method is needed for backward compatibility with streamDef.js.
var UpdateStreamDef = function() {};
