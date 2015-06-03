/*
Copyright 2014 Google Inc. All rights reserved.

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

function getStreamDef(index) {
  var d = {};
  index = index || 0;

  var streamDefinitions = [
    {
      AudioType: 'audio/mp4; codecs="mp4a.40.2"',
      VideoType: 'video/mp4; codecs="avc1.640028"',
      AudioTiny: ['media/car-20120827-8b.mp4', 717502, 181.62],
      AudioNormal: ['media/car-20120827-8c.mp4', 2884572, 181.58, {
          200000: 12.42}],
      AudioNormalAdv: ['media/car-20120827-8c.mp4', 2884572, 181.58, {
          200000: 12.42}],
      AudioHuge: ['media/car-20120827-8d.mp4', 5789853, 181.58, {
          'appendAudioOffset': 17.42}],
      VideoTiny: ['media/car-20120827-85.mp4', 6015001, 181.44, {
          'videoChangeRate': 11.47}],
      VideoNormal: ['media/car-20120827-86.mp4', 15593225, 181.44, {
          'mediaSourceDuration': Infinity}],
      VideoHuge: ['media/car-20120827-89.mp4', 95286345, 181.44],
      AudioTinyClearKey: ['media/car_cenc-20120827-8b.mp4', 783470, 181.62],
      AudioNormalClearKey: ['media/car_cenc-20120827-8c.mp4', 3013084, 181.58],
      AudioHugeClearKey: ['media/car_cenc-20120827-8d.mp4', 5918365, 181.58],
      VideoTinyClearKey: ['media/car_cenc-20120827-85.mp4', 6217017, 181.44],
      VideoNormalClearKey: ['media/car_cenc-20120827-86.mp4', 15795193, 181.44],
      VideoHugeClearKey: ['media/car_cenc-20120827-89.mp4', 95488313, 181.44],
      VideoStreamYTCenc: ['media/oops_cenc-20121114-145-no-clear-start.mp4', 39980507, 242.71],
      VideoTinyStreamYTCenc: ['media/oops_cenc-20121114-145-143.mp4', 7229257, 30.03],
      VideoSmallStreamYTCenc: ['media/oops_cenc-20121114-143-no-clear-start.mp4', 12045546, 242.71],
      Audio1MB: ['media/car-audio-1MB-trunc.mp4', 1048576, 65.875],
      Video1MB: ['media/test-video-1MB.mp4', 1053406, 1.04],
      ProgressiveLow: ['media/car_20130125_18.mp4', 15477531, 181.55],
      ProgressiveNormal: ['media/car_20130125_22.mp4', 55163609, 181.55],
      ProgressiveHigh: [],
    }, {
      AudioType: 'audio/webm; codecs="vorbis"',
      VideoType: 'video/webm; codecs="vp9"',
      AudioTiny: ['media/feelings_vp9-20130806-171.webm', 2061225, 135.60],
      AudioNormal: ['media/feelings_vp9-20130806-172.webm', 2985979, 135.61, {
          200000: 10.26}],
      AudioNormalAdv: ['media/feelings_vp9-audio-normal.webm', 2675548, 135.67, {
          200000: 10.26}],
      AudioHuge: ['media/feelings_vp9-20130806-172.webm', 2985979, 135.61, {
          'appendAudioOffset': 15.26}],
      VideoTiny: ['media/feelings_vp9-20130806-242.webm', 4478156, 135.46, {
          'videoChangeRate': 15.35}],
      VideoNormal: ['media/feelings_vp9-20130806-243.webm', 7902885, 135.46, {
          'mediaSourceDuration': 135.469}],
      VideoHuge: ['media/feelings_vp9-20130806-247.webm', 27757852, 135.46],
      AudioTinyClearKey: [],
      AudioNormalClearKey: [],
      AudioHugeClearKey: [],
      VideoTinyClearKey: [],
      VideoNormalClearKey: [],
      VideoHugeClearKey: [],
      VideoStreamYTCenc: [],
      VideoTinyStreamYTCenc: [],
      VideoSmallStreamYTCenc: [],
      Audio1MB: ['media/feelings_vp9-audio-1MB-trunc.webm', 1104437, 40.02],
      Video1MB: ['media/feelings_vp9-video-1MB-trunc.webm', 1042881, 0.99],
      ProgressiveLow: [],
      ProgressiveNormal: [],
      ProgressiveHigh: [],
    }
  ];

  d.AudioType = streamDefinitions[index]['AudioType'];
  d.VideoType = streamDefinitions[index]['VideoType'];

  var CreateAudioDef = function(src, size, duration, customMap) {
    return {name: 'audio', type: d.AudioType, size: size, src: src,
        duration: duration, bps: Math.floor(size / duration),
        customMap: customMap};
  };

  var CreateVideoDef = function(src, size, duration, customMap) {
    return {name: 'video', type: d.VideoType, size: size, src: src,
        duration: duration, bps: Math.floor(size / duration),
        customMap: customMap};
  };

  d.AudioTiny = CreateAudioDef.apply(this, streamDefinitions[index]['AudioTiny']);
  d.AudioNormal = CreateAudioDef.apply(this, streamDefinitions[index]['AudioNormal']);
  d.AudioNormalAdv = CreateAudioDef.apply(this, streamDefinitions[index]['AudioNormalAdv']);
  d.AudioHuge = CreateAudioDef.apply(this,streamDefinitions[index]['AudioHuge']);

  d.VideoTiny = CreateVideoDef.apply(this, streamDefinitions[index]['VideoTiny']);
  d.VideoNormal = CreateVideoDef.apply(this, streamDefinitions[index]['VideoNormal']);
  d.VideoHuge = CreateVideoDef.apply(this, streamDefinitions[index]['VideoHuge']);

  d.AudioTinyClearKey = CreateAudioDef.apply(this, streamDefinitions[index]['AudioTinyClearKey']);
  d.AudioNormalClearKey = CreateAudioDef.apply(this, streamDefinitions[index]['AudioNormalClearKey']);
  d.AudioHugeClearKey = CreateAudioDef.apply(this, streamDefinitions[index]['AudioHugeClearKey']);

  d.VideoTinyClearKey = CreateVideoDef.apply(this, streamDefinitions[index]['VideoTinyClearKey']);
  d.VideoNormalClearKey = CreateVideoDef.apply(this, streamDefinitions[index]['VideoNormalClearKey']);
  d.VideoHugeClearKey = CreateVideoDef.apply(this, streamDefinitions[index]['VideoHugeClearKey']);

  d.VideoStreamYTCenc = CreateVideoDef.apply(this, streamDefinitions[index]['VideoStreamYTCenc']);
  d.VideoTinyStreamYTCenc = CreateVideoDef.apply(this, streamDefinitions[index]['VideoTinyStreamYTCenc']);
  d.VideoSmallStreamYTCenc = CreateVideoDef.apply(this, streamDefinitions[index]['VideoSmallStreamYTCenc']);

  d.Audio1MB = CreateAudioDef.apply(this, streamDefinitions[index]['Audio1MB']);
  d.Video1MB = CreateVideoDef.apply(this, streamDefinitions[index]['Video1MB']);

  d.ProgressiveLow = CreateVideoDef.apply(this, streamDefinitions[index]['ProgressiveLow']);
  d.ProgressiveNormal = CreateVideoDef.apply(this, streamDefinitions[index]['ProgressiveNormal']);
  d.ProgressiveHigh = CreateVideoDef.apply(this, streamDefinitions[index]['ProgressiveHigh']);

  d.isWebM = function() {
    return index === 1;
  }

  return d;
}

var StreamDef = getStreamDef();

function UpdateStreamDef(index) {
  StreamDef = getStreamDef(index);
}
