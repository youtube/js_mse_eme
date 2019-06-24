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
  const PLAYREADY_SIGNATURE_1 =
      '448279561E2755699618BE0A2402189D4A30B03B.0CD6A27286BD2DAF00577FFA21928665DCD320C2';
  const SINTEL_PLAYREADY_SIGNATURE =
      '97963FB1090C927460E392A517D769E95F90A9C2.71CBD94195457E4E2D885064FDB879C1072AF323';
  const WIDEVINE_SIGNATURE_1 =
      '9C4BE99E6F517B51FED1F0B3B31966D3C5DAB9D6.6A1F30BB35F3A39A4CA814B731450D4CBD198FFD';
  const SINTEL_WIDEVINE_SIGNATURE =
      '4511DBFEF4177B5F0DF1FAA23562D4FD7FDE0D1A.457901F5F063B3D9E8252B403D120683BEE47216';
  const WIDEVINE_L3NOHDCP_VIDEO_ID = 'f320151fa3f061b2';
  const WIDEVINE_L3NOHDCP_SIGNATURE =
      '81E7B33929F9F35922F7D2E96A5E7AC36F3218B2.673F553EE51A48438AE5E707AEC87A071B4FEF65';

  var AAC = {
    streamtype: 'AAC',
    mimetype: 'audio/mp4; codecs="mp4a.40.2"',
    mediatype: 'audio',
    streams: {
      AudioTiny: ['car-20120827-8b.mp4', 717502, 181.62],
      AudioNormal: ['car-20120827-8c.mp4', 2884572, 181.58, {200000: 12.42}],
      AudioHuge: [
        'car-20120827-8d.mp4', 5789853, 181.58, {'appendAudioOffset': 17.42}
      ],
      Audio51: ['sintel-trunc.mp4', 813119, 20.05],
      Audio1MB: ['car-audio-1MB-trunc.mp4', 1048576, 65.875],
      AudioLowExplicitHE: [
        'spotlight-tr-heaac-explicit.mp4', 156137, 26.10, {
          'mimeType': 'audio/mp4; codecs="mp4a.40.5"',
          'sbrSignaling': 'Explicit'
        }
      ],
      AudioLowImplicitHE: [
        'spotlight-tr-heaac-implicit.mp4', 156138, 26.10, {
          'mimeType': 'audio/mp4; codecs="mp4a.40.5"',
          'sbrSignaling': 'Implicit'
        }
      ],
      AudioForVP9Live: ['vp9-live.mp4', 243930, 14.997],
      AudioNormalClearKey: [
        'car_cenc-20120827-8c.mp4', 3013084, 181.58, {
          'key': util.createUint8ArrayFromJSArray([
            0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
            0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82
          ]),
          'kid': util.createUint8ArrayFromJSArray([
            0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
            0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e
          ])
        }
      ],
      AudioSmallCenc: [
        'oops_cenc-20121114-148.mp4', 999679, 242.71, {
          'video_id': '03681262dc412c06',
          'playready_signature': PLAYREADY_SIGNATURE_1,
          'widevine_signature': WIDEVINE_SIGNATURE_1
        }
      ],
      AudioMeridian: ['meridian_aac_med.mp4', 11638237, 719.08],
    },
  };

  var Opus = {
    streamtype: 'Opus',
    mimetype: 'audio/webm; codecs="opus"',
    mediatype: 'audio',
    streams: {
      Audio51: ['opus51.webm', 15583281, 300.02],
      CarLow: ['car_opus_low.webm', 1205174, 181.48],
      CarMed: ['car_opus_med.webm', 1657817, 181.48, {200000: 28.221}],
      CarHigh: [
        'car_opus_high.webm', 3280103, 181.48, {'appendAudioOffset': 33.221}
      ],
      SantaHigh: ['santa_opus_high.webm', 1198448, 70.861],
      SintelEncrypted: [
        'sintel_opus_enc.webm', 14956771, 888.04, {
          'video_id': '31e1685307acf271',
          'widevine_signature': SINTEL_WIDEVINE_SIGNATURE
        }
      ],
    },
  };

  var AC3 = {
    streamtype: 'AC3',
    mimetype: 'audio/mp4; codecs="ac-3"',
    mediatype: 'audio',
    streams: {
      Audio51: ['test_tones_ac3_51.fmp4', 487742, 10.14],
      AudioStereo: ['test_tones_ac3_stereo.fmp4', 18130, 1.09],
    },
  };

  var EAC3 = {
    streamtype: 'EAC3',
    mimetype: 'audio/mp4; codecs="ec-3"',
    mediatype: 'audio',
    streams: {
      Audio51: ['test_tones_eac3_51.fmp4', 487744, 10.14],
      AudioStereo: ['test_tones_eac3_stereo.fmp4', 18132, 1.09],
    },
  };

  var H264 = {
    streamtype: 'H264',
    mimetype: 'video/mp4; codecs="avc1.640028"',
    mediatype: 'video',
    streams: {
      VideoTiny: [
        'car-20120827-85.mp4', 6015001, 181.44, {
          'videoChangeRate': 11.47,
          'mimeType': 'video/mp4; codecs="avc1.4d4015"',
          'resolution': '240p'
        }
      ],
      VideoNormal: [
        'car-20120827-86.mp4', 15593225, 181.44,
        {'mimeType': 'video/mp4; codecs="avc1.4d401e"', 'resolution': '360p'}
      ],
      CarMedium: [
        'car09222016-med-134.mp4', 10150205, 181.47,
        {'mimeType': 'video/mp4; codecs="avc1.4d401e"', 'resolution': '360p'}
      ],
      VideoHuge: [
        'car-20120827-89.mp4', 95286345, 181.44,
        {'mimeType': 'video/mp4; codecs="avc1.640028"', 'resolution': '1080p'}
      ],
      Video1MB: [
        'test-video-1MB.mp4', 1053406, 1.04, {
          'mimeType': 'video/mp4; codecs="avc1.4d401f"',
          'resolution': '360p',
          'width': 480
        }
      ],
      VideoNormalClearKey: [
        'car_cenc-20120827-86.mp4', 15795193, 181.44, {
          'mimeType': 'video/mp4; codecs="avc1.4d401e"',
          'key': util.createUint8ArrayFromJSArray([
            0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
            0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82
          ]),
          'kid': util.createUint8ArrayFromJSArray([
            0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
            0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e
          ]),
          'resolution': '360p'
        }
      ],
      VideoStreamYTCenc: [
        'oops_cenc-20121114-145-no-clear-start.mp4', 39980507, 242.71, {
          'mimeType': 'video/mp4; codecs="avc1.4d401f"',
          'video_id': '03681262dc412c06',
          'widevine_signature': WIDEVINE_SIGNATURE_1,
          'key': util.createUint8ArrayFromJSArray([
            233, 122, 210, 133, 203, 93, 59, 228,
            167, 150, 27, 122, 246, 145, 112, 218
          ]),
          'resolution': '720p'
        }
      ],
      VideoTinyStreamYTCenc: [
        'oops_cenc-20121114-145-143.mp4', 7229257, 30.03,
        {'mimeType': 'video/mp4; codecs="avc1.4d401f"', 'resolution': '720p'}
      ],
      VideoSmallStreamYTCenc: [
        'oops_cenc-20121114-143-no-clear-start.mp4', 12045546, 242.71, {
          'mimeType': 'video/mp4; codecs="avc1.4d401e"',
          'key': util.createUint8ArrayFromJSArray([
            131, 162, 92, 175, 153, 178, 172, 41,
            2, 167, 251, 126, 233, 215, 230, 185
          ]),
          'resolution': '360p'
        }
      ],
      VideoSmallCenc: [
        'oops_cenc-20121114-142.mp4', 8017271, 242.71, {
          'mimeType': 'video/mp4; codecs="avc1.4d4015"',
          'video_id': '03681262dc412c06',
          'playready_signature': PLAYREADY_SIGNATURE_1,
          'widevine_signature': WIDEVINE_SIGNATURE_1,
          'resolution': '240p'
        }
      ],
      VideoMultiKeyCenc: [
        'tears_h264_main_720p_1500.mp4', 105466539, 734.17, {
          'mimetype': 'video/mp4; codecs="avc1.4d401f"',
          'pssh': util.createUint8ArrayFromJSArray([
            0,   0,   0,   68,  112, 115, 115, 104,
            0,   0,   0,   0,   237, 239, 139, 169,
            121, 214, 74,  206, 163, 200, 39,  220,
            213, 29,  33,  237, 0,   0,   0,   36,
            8,   1,   18,  1,   49,  26,  13,  119,
            105, 100, 101, 118, 105, 110, 101, 95,
            116, 101, 115, 116, 34,  10,  50,  48,
            49,  53,  95,  116, 95,  49,  54,  107,
            42,  2,   83,  68
          ]),
          'license_server': 'https://proxy.staging.widevine.com/proxy',
          'width': 1280,
          'height': 532
        }
      ],
      DrmL3NoHDCP144p30fpsCenc: [
        'drml3NoHdcp_h264_360p_30fps_cenc.mp4', 1463083, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '360p'
        }
      ],
      DrmL3NoHDCP240p30fpsCenc: [
        'drml3NoHdcp_h264_240p_30fps_cenc.mp4', 3177191, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '240p'
        }
      ],
      DrmL3NoHDCP360p30fpsCenc: [
        'drml3NoHdcp_h264_360p_30fps_cenc.mp4', 7297992, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '360p'
        }
      ],
      DrmL3NoHDCP480p30fpsCenc: [
        'drml3NoHdcp_h264_480p_30fps_cenc.mp4', 14394742, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '480p'
        }
      ],
      DrmL3NoHDCP480p30fpsMqCenc: [
        'drml3NoHdcp_h264_480p_mq_30fps_cenc.mp4', 22118210, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '480p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP480p30fpsHqCenc: [
        'drml3NoHdcp_h264_480p_hq_30fps_cenc.mp4', 44132909, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '480p',
          'quality': 'HQ'
        }
      ],
      DrmL3NoHDCP720p30fpsCenc: [
        'drml3NoHdcp_h264_720p_30fps_cenc.mp4', 28788524, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '720p'
        }
      ],
      DrmL3NoHDCP720p30fpsMqCenc: [
        'drml3NoHdcp_h264_720p_mq_30fps_cenc.mp4', 44199586, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '720p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP720p30fpsHqCenc: [
        'drml3NoHdcp_h264_720p_hq_30fps_cenc.mp4', 73591730, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '720p',
          'quality': 'HQ'
        }
      ],
      DrmL3NoHDCP720p60fpsCenc: [
        'drml3NoHdcp_h264_720p_60fps_cenc.mp4', 38436183, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '720p'
        }
      ],
      DrmL3NoHDCP720p60fpsMqCenc: [
        'drml3NoHdcp_h264_720p_mq_60fps_cenc.mp4', 61027135, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '720p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP1080p30fpsCenc: [
        'drml3NoHdcp_h264_1080p_30fps_cenc.mp4', 55005156, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '1080p'
        }
      ],
      DrmL3NoHDCP1080p30fpsMqCenc: [
        'drml3NoHdcp_h264_1080p_mq_30fps_cenc.mp4', 73580599, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '1080p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP1080p30fpsHqCenc: [
        'drml3NoHdcp_h264_1080p_hq_30fps_cenc.mp4', 102970523, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '1080p',
          'quality': 'HQ'
        }
      ],
      DrmL3NoHDCP1080p60fpsCenc: [
        'drml3NoHdcp_h264_1080p_60fps_cenc.mp4', 72603681, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '1080p'
        }
      ],
      DrmL3NoHDCP1080p60fpsMqCenc: [
        'drml3NoHdcp_h264_1080p_mq_60fps_cenc.mp4', 95823710, 101.899, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '1080p',
          'quality': 'MQ'
        }
      ],
      ProgressiveLow: [
        'car_20130125_18.mp4', 15477531, 181.55,
        {'mimeType': 'video/mp4; codecs="avc1.42c01e"', 'resolution': '360p'}
      ],
      FrameGap: [
        'nq-frames24-tfdt23.mp4', 11883895, 242.46,
        {'mimeType': 'video/mp4; codecs="avc1.4d401e"', 'resolution': '360p'}
      ],
      FrameOverlap: [
        'nq-frames23-tfdt24.mp4', 11883895, 242.46,
        {'mimeType': 'video/mp4; codecs="avc1.4d401e"', 'resolution': '360p'}
      ],
      Webgl144p15fps: [
        'big-buck-bunny-h264-144p-15fps.mp4', 8620045, 634.60, {
          'mimeType': 'video/mp4; codecs="avc1.42c00c"',
          'fps': 15,
          'resolution': '144p'
        }
      ],
      Webgl240p30fps: [
        'big-buck-bunny-h264-240p-30fps.mp4', 19406299, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.4d4015"',
          'fps': 30,
          'resolution': '240p'
        }
      ],
      Webgl360p30fps: [
        'big-buck-bunny-h264-360p-30fps.mp4', 28791964, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.4d401e"',
          'fps': 30,
          'resolution': '360p'
        }
      ],
      Webgl480p30fps: [
        'big-buck-bunny-h264-480p-30fps.mp4', 56238435, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.4d401f"',
          'fps': 30,
          'resolution': '480p'
        }
      ],
      Webgl720p30fps: [
        'big-buck-bunny-h264-720p-30fps.mp4', 106822776, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.4d401f"',
          'fps': 30,
          'resolution': '720p'
        }
      ],
      Webgl720p60fps: [
        'big-buck-bunny-h264-720p-60fps.mp4', 181505335, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.4d4020"',
          'fps': 60,
          'resolution': '720p'
        }
      ],
      Webgl1080p30fps: [
        'big-buck-bunny-h264-1080p-30fps.mp4', 189028629, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.640028"',
          'fps': 30,
          'resolution': '1080p'
        }
      ],
      Webgl1080p60fps: [
        'big-buck-bunny-h264-1080p-60fps.mp4', 313230764, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.64002a"',
          'fps': 60,
          'resolution': '1080p'
        }
      ],
      Webgl1440p30fps: [
        'big-buck-bunny-h264-1440p-30fps.mp4', 454390604, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.640032"',
          'fps': 30,
          'resolution': '1440p'
        }
      ],
      Webgl2160p30fps: [
        'big-buck-bunny-h264-2160p-30fps.mp4', 873983617, 634.57, {
          'mimeType': 'video/mp4; codecs="avc1.640033"',
          'fps': 30,
          'resolution': '2160p'
        }
      ],
      Spherical144s30fps: [
        'spherical_h264_144s_30fps.mp4', 902503, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.4d400c"',
          'fps': 30,
          'resolution': '144p',
          'spherical': true
        }
      ],
      Spherical240s30fps: [
        'spherical_h264_240s_30fps.mp4', 2095800, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.4d4015"',
          'fps': 30,
          'resolution': '240p',
          'spherical': true
        }
      ],
      Spherical360s30fps: [
        'spherical_h264_360s_30fps.mp4', 3344623, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.4d401e"',
          'fps': 30,
          'resolution': '360p',
          'spherical': true
        }
      ],
      Spherical480s30fps: [
        'spherical_h264_480s_30fps.mp4', 7238157, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.4d401f"',
          'fps': 30,
          'resolution': '480p',
          'spherical': true
        }
      ],
      Spherical720s30fps: [
        'spherical_h264_720s_30fps.mp4', 15323211, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.4d401f"',
          'fps': 30,
          'resolution': '720p',
          'spherical': true
        }
      ],
      Spherical720s60fps: [
        'spherical_h264_720s_60fps.mp4', 31284601, 149.29, {
          'mimeType': 'video/mp4; codecs="avc1.4d4020"',
          'fps': 60,
          'resolution': '720p',
          'spherical': true
        }
      ],
      Spherical1080s30fps: [
        'spherical_h264_1080s_30fps.mp4', 46455958, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.640028"',
          'fps': 30,
          'resolution': '1080p',
          'spherical': true
        }
      ],
      Spherical1080s60fps: [
        'spherical_h264_1080s_60fps.mp4', 59213840, 149.29, {
          'mimeType': 'video/mp4; codecs="avc1.64002a"',
          'fps': 60,
          'resolution': '1080p',
          'spherical': true
        }
      ],
      Spherical1440s30fps: [
        'spherical_h264_1440s_30fps.mp4', 97687330, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.640032"',
          'fps': 30,
          'resolution': '1440p',
          'spherical': true
        }
      ],
      Spherical1440s60fps: [
        'spherical_h264_1440s_60fps.mp4', 131898628, 149.29, {
          'mimeType': 'video/mp4; codecs="avc1.640033"',
          'fps': 60,
          'resolution': '1440p',
          'spherical': true
        }
      ],
      Spherical2160s30fps: [
        'spherical_h264_2160s_30fps.mp4', 179943784, 149.31, {
          'mimeType': 'video/mp4; codecs="avc1.640033"',
          'fps': 30,
          'resolution': '2160p',
          'spherical': true
        }
      ],
      Spherical2160s60fps: [
        'spherical_h264_2160s_60fps.mp4', 239610178, 149.29, {
          'mimeType': 'video/mp4; codecs="avc1.640033"',
          'fps': 60,
          'resolution': '2160p',
          'spherical': true
        }
      ],
    },
  };

  var VP9 = {
    streamtype: 'VP9',
    mimetype: 'video/webm; codecs="vp9"',
    mediatype: 'video',
    streams: {
      VideoTiny: [
        'feelings_vp9-20130806-242.webm', 4478156, 135.46,
        {'videoChangeRate': 15.35, 'resolution': '240p'}
      ],
      VideoNormal: [
        'big-buck-bunny-vp9-360p-30fps.webm', 48362964, 634.53,
        {'resolution': '360p'}
      ],
      VideoHuge: [
        'feelings_vp9-20130806-247.webm', 27757852, 135.46,
        {'resolution': '720p'}
      ],
      Video1MB: ['vp9-video-1mb.webm', 1103716, 1.00, {'resolution': '720p'}],
      VideoLive: [
        'vp9-live-1080p-30fps.webm', 2328275, 14.997,
        {'resolution': '1080p', 'fps': 30}],
      VideoNormalClearKey: [
        'vid_vp9_encrypted03.webm', 657432, 6.00, {
          'key': util.createUint8ArrayFromJSArray([
            186, 232, 192, 193, 246, 129, 195, 1,
            235, 26, 73, 6, 214, 222, 222, 17
          ]),
          'kid': util.createUint8ArrayFromJSArray([
            65, 192, 59, 240, 250, 198, 147, 131,
            234, 178, 123, 253, 240, 131, 240, 129
          ]),
          'resolution': '480p',
          'width': 640
        }
      ],
      VideoStreamYTCenc: [
        'vid_vp9_encrypted04.webm', 657432, 6.00, {
          'key': util.createUint8ArrayFromJSArray([
            186, 232, 192, 193, 246, 129, 195, 1,
            235, 26, 73, 6, 214, 222, 222, 17
          ]),
          'kid': util.createUint8ArrayFromJSArray([
            65, 192, 59, 240, 250, 198, 147, 131,
            234, 178, 123, 253, 240, 131, 240, 129
          ]),
          'resolution': '480p',
          'width': 640
        }
      ],
      VideoSmallStreamYTCenc: [
        'vid_vp9_encrypted05.webm', 657432, 6.00, {
          'key': util.createUint8ArrayFromJSArray([
            179, 232, 192, 192, 150, 129, 195, 1,
            235, 26, 73, 5, 54, 222, 222, 193
          ]),
          'kid': util.createUint8ArrayFromJSArray([
            135, 240, 59, 224, 234, 214, 147, 131,
            234, 176, 123, 253, 240, 131, 240, 220
          ]),
          'resolution': '480p',
          'width': 640
        }
      ],
      VideoHighEnc: [
        'sintel_enc-20160621-273.webm', 68919485, 887.958, {
          'video_id': '31e1685307acf271',
          'widevine_signature': SINTEL_WIDEVINE_SIGNATURE,
          'width': 854,
          'height': 364
        }
      ],
      VideoHighSubSampleEnc: [
        'sintel_enc_subsample-20161014-318.webm', 80844835, 887.958, {
          'video_id': '31e1685307acf271',
          'widevine_signature': SINTEL_WIDEVINE_SIGNATURE,
          'width': 854,
          'height': 364
        }
      ],
      Sintel2kEnc: [
        'sintel_vp9_2k_enc.webm', 479857063, 887.96, {
          'video_id': '31e1685307acf271',
          'widevine_signature': SINTEL_WIDEVINE_SIGNATURE,
          'fps': 24,
          'resolution': '1440p',
          'height': 1090
        }
      ],
      Sintel4kEnc: [
        'sintel_vp9_4k_enc.webm', 1037846120, 887.96, {
          'video_id': '31e1685307acf271',
          'widevine_signature': SINTEL_WIDEVINE_SIGNATURE,
          'fps': 24,
          'resolution': '2160p',
          'width': 3840,
          'height': 1636
        }
      ],
      DrmL3NoHDCP240p30fpsEnc: [
        'drml3NoHdcp_vp9_240p_30fps_enc.webm', 2637069, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '240p'
        }
      ],
      DrmL3NoHDCP360p30fpsEnc: [
        'drml3NoHdcp_vp9_360p_30fps_enc.webm', 4961622, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '360p'
        }
      ],
      DrmL3NoHDCP480p30fpsEnc: [
        'drml3NoHdcp_vp9_480p_30fps_enc.webm', 9063639, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '480p'
        }
      ],
      DrmL3NoHDCP480p30fpsMqEnc: [
        'drml3NoHdcp_vp9_480p_mq_30fps_enc.webm', 11861551, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '480p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP480p30fpsHqEnc: [
        'drml3NoHdcp_vp9_480p_hq_30fps_enc.webm', 15292527, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '480p',
          'quality': 'HQ'
        }
      ],
      DrmL3NoHDCP720p30fpsEnc: [
        'drml3NoHdcp_vp9_720p_30fps_enc.webm', 18557476, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '720p'
        }
      ],
      DrmL3NoHDCP720p30fpsMqEnc: [
        'drml3NoHdcp_vp9_720p_mq_30fps_enc.webm', 26985702, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '720p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP720p30fpsHqEnc: [
        'drml3NoHdcp_vp9_720p_hq_30fps_enc.webm', 27989534, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '720p',
          'quality': 'HQ'
        }
      ],
      DrmL3NoHDCP720p60fpsEnc: [
        'drml3NoHdcp_vp9_720p_60fps_enc.webm', 32256950, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '720p'
        }
      ],
      DrmL3NoHDCP720p60fpsMqEnc: [
        'drml3NoHdcp_vp9_720p_mq_60fps_enc.webm', 44497411, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '720p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP1080p30fpsEnc: [
        'drml3NoHdcp_vp9_1080p_30fps_enc.webm', 33327074, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '1080p'
        }
      ],
      DrmL3NoHDCP1080p30fpsMqEnc: [
        'drml3NoHdcp_vp9_1080p_mq_30fps_enc.webm', 52629589, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '1080p',
          'quality': 'MQ'
        }
      ],
      DrmL3NoHDCP1080p30fpsHqEnc: [
        'drml3NoHdcp_vp9_1080p_hq_30fps_enc.webm', 55565306, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 30,
          'resolution': '1080p',
          'quality': 'HQ'
        }
      ],
      DrmL3NoHDCP1080p60fpsEnc: [
        'drml3NoHdcp_vp9_1080p_60fps_enc.webm', 55756449, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '1080p'
        }
      ],
      DrmL3NoHDCP1080p60fpsMqEnc: [
        'drml3NoHdcp_vp9_1080p_mq_60fps_enc.webm', 89414670, 101.9, {
          'video_id': WIDEVINE_L3NOHDCP_VIDEO_ID,
          'widevine_signature': WIDEVINE_L3NOHDCP_SIGNATURE,
          'fps': 60,
          'resolution': '1080p',
          'quality': 'MQ'
        }
      ],
      ProgressiveLow: [
        'feelings_vp9-20130806-243.webm', 7902885, 135.46,
        {'resolution': '360p'}
      ],
      Webgl144p30fps: [
        'big-buck-bunny-vp9-144p-30fps.webm', 7102948, 634.53,
        {'fps': 30, 'resolution': '144p'}
      ],
      Webgl240p30fps: [
        'big-buck-bunny-vp9-240p-30fps.webm', 15315502, 634.53,
        {'fps': 30, 'resolution': '240p'}
      ],
      Webgl360p30fps: [
        'big-buck-bunny-vp9-360p-30fps.webm', 28562771, 634.53,
        {'fps': 30, 'resolution': '360p'}
      ],
      Webgl480p30fps: [
        'big-buck-bunny-vp9-480p-30fps.webm', 48362964, 634.53,
        {'fps': 30, 'resolution': '480p'}
      ],
      Webgl720p30fps: [
        'big-buck-bunny-vp9-720p-30fps.webm', 91390585, 634.53,
        {'fps': 30, 'resolution': '720p'}
      ],
      Webgl720p60fps: [
        'big-buck-bunny-vp9-720p-60fps.webm', 151583677, 634.53,
        {'fps': 60, 'resolution': '720p'}
      ],
      Webgl1080p30fps: [
        'big-buck-bunny-vp9-1080p-30fps.webm', 168727073, 634.53,
        {'fps': 30, 'resolution': '1080p'}
      ],
      Webgl1080p60fps: [
        'big-buck-bunny-vp9-1080p-60fps.webm', 252622340, 634.53,
        {'fps': 60, 'resolution': '1080p'}
      ],
      Webgl1440p30fps: [
        'big-buck-bunny-vp9-1440p-30fps.webm', 460158586, 634.53,
        {'fps': 30, 'resolution': '1440p'}
      ],
      Webgl1440p60fps: [
        'big-buck-bunny-vp9-1440p-60fps.webm', 661242960, 634.53,
        {'fps': 60, 'resolution': '1440p'}
      ],
      Webgl2160p30fps: [
        'big-buck-bunny-vp9-2160p-30fps.webm', 1089986842, 634.53,
        {'fps': 30, 'resolution': '2160p'}
      ],
      Webgl2160p60fps: [
        'big-buck-bunny-vp9-2160p-60fps.webm', 1721994529, 634.53,
        {'fps': 60, 'resolution': '2160p'}
      ],
      Spherical144s30fps: [
        'spherical_vp9_144s_30fps.webm', 1386771, 149.28,
        {'fps': 30, 'resolution': '144p', 'spherical': true}
      ],
      Spherical240s30fps: [
        'spherical_vp9_240s_30fps.webm', 2164087, 149.28,
        {'fps': 30, 'resolution': '240p', 'spherical': true}
      ],
      Spherical360s30fps: [
        'spherical_vp9_360s_30fps.webm', 4539259, 149.28,
        {'fps': 30, 'resolution': '360p', 'spherical': true}
      ],
      Spherical480s30fps: [
        'spherical_vp9_480s_30fps.webm', 8181410, 149.28,
        {'fps': 30, 'resolution': '480p', 'spherical': true}
      ],
      Spherical720s30fps: [
        'spherical_vp9_720s_30fps.webm', 18142938, 149.28,
        {'fps': 30, 'resolution': '720p', 'spherical': true}
      ],
      Spherical720s60fps: [
        'spherical_vp9_720s_60fps.webm', 25630410, 149.29,
        {'fps': 60, 'resolution': '720p', 'spherical': true}
      ],
      Spherical1080s30fps: [
        'spherical_vp9_1080s_30fps.webm', 36208240, 149.28,
        {'fps': 30, 'resolution': '1080p', 'spherical': true}
      ],
      Spherical1080s60fps: [
        'spherical_vp9_1080s_60fps.webm', 53176311, 149.29,
        {'fps': 60, 'resolution': '1080p', 'spherical': true}
      ],
      Spherical1440s30fps: [
        'spherical_vp9_1440s_30fps.webm', 98235300, 149.28,
        {'fps': 30, 'resolution': '1440p', 'spherical': true}
      ],
      Spherical1440s60fps: [
        'spherical_vp9_1440s_60fps.webm', 152948581, 149.29,
        {'fps': 60, 'resolution': '1440p', 'spherical': true}
      ],
      Spherical2160s30fps: [
        'spherical_vp9_2160s_30fps.webm', 243510558, 149.28,
        {'fps': 30, 'resolution': '2160p', 'spherical': true}
      ],
      Spherical2160s60fps: [
        'spherical_vp9_2160s_60fps.webm', 393625694, 149.29,
        {'fps': 60, 'resolution': '2160p', 'spherical': true}
      ],
      HdrHlgUltralow: [
        'motor_vp9_hdr_ultralow.webm', 4093046, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '144p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlgLow: [
        'motor_vp9_hdr_low.webm', 6157161, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '240p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlgMed: [
        'motor_vp9_hdr_med.webm', 13026706, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '360p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlgHigh: [
        'motor_vp9_hdr_high.webm', 24059408, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '480p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg720p: [
        'motor_vp9_hdr_720p.webm', 54591653, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '720p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg1080p: [
        'motor_vp9_hdr_1080p.webm', 96437886, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '1080p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg2k: [
        'motor_vp9_hdr_2k.webm', 304356661, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '1440p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg4k: [
        'motor_vp9_hdr_4k.webm', 631043806, 254.462,
        {
          'transferFunction': 'HLG',
          'fps': 30,
          'resolution': '2160p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlgUltralowHfr: [
        'news_vp9_hdr_ultralow.webm', 2629927, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '144p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlgLowHfr: [
        'news_vp9_hdr_low.webm', 3948184, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '240p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlgMedHfr: [
        'news_vp9_hdr_med.webm', 8339341, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '360p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlgHighHfr: [
        'news_vp9_hdr_high.webm', 15621796, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '480p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg720pHfr: [
        'news_vp9_hdr_720p.webm', 34871072, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '720p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg1080pHfr: [
        'news_vp9_hdr_1080p.webm', 58835191, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '1080p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg2kHfr: [
        'news_vp9_hdr_2k.webm', 156656282, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '1440p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrHlg4kHfr: [
        'news_vp9_hdr_4k.webm', 314053586, 136.62,
        {
          'transferFunction': 'HLG',
          'fps': 60,
          'resolution': '2160p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqUltralow: [
        'roadtrip_vp9_hdr_ultralow.webm', 1561697, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '144p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqLow: [
        'roadtrip_vp9_hdr_low.webm', 2662190, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '240p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqMed: [
        'roadtrip_vp9_hdr_med.webm', 5719740, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '360p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqHigh: [
        'roadtrip_vp9_hdr_high.webm', 10715789, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '480p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq720p: [
        'roadtrip_vp9_hdr_720p.webm', 24453226, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '720p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq1080p: [
        'roadtrip_vp9_hdr_1080p.webm', 43377155, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '1080p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq2k: [
        'roadtrip_vp9_hdr_2k.webm', 121051265, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '1440p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq4k: [
        'roadtrip_vp9_hdr_4k.webm', 286332111, 108.358,
        {
          'transferFunction': 'PQ',
          'fps': 30,
          'resolution': '2160p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqUltralowHfr: [
        'meridian_vp9_hdr_ultralow.webm', 12680814, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '144p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqLowHfr: [
        'meridian_vp9_hdr_low.webm', 26899101, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '240p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqMedHfr: [
        'meridian_vp9_hdr_med.webm', 63165785, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '360p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPqHighHfr: [
        'meridian_vp9_hdr_high.webm', 132217173, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '480p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq720pHfr: [
        'meridian_vp9_hdr_720p.webm', 339235754, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '720p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq1080pHfr: [
        'meridian_vp9_hdr_1080p.webm', 531408862, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '1080p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq2kHfr: [
        'meridian_vp9_hdr_2k.webm', 1259703408, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '1440p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
      HdrPq4kHfr: [
        'meridian_vp9_hdr_4k.webm', 2249443995, 718.94,
        {
          'transferFunction': 'PQ',
          'fps': 60,
          'resolution': '2160p',
          'mimeType': 'video/webm; codecs="vp9.2"',
        },
      ],
    },
  };

  var AV1 = {
    streamtype: 'AV1',
    mimetype: `video/mp4; codecs="${util.av1Codec()}"`,
    mediatype: 'video',
    streams: {
      RoadtripUltraLow: [
        'roadtrip_DASH_FMP4_AV1_ULTRALOW.mp4', 1427635, 108.36,
        {
          'fps': 24,
          'resolution': '144p',
          'mimeType': `video/mp4; codecs="${util.av1Codec('2.0')}"`,
        }
      ],
      RoadtripLow: [
        'roadtrip_DASH_FMP4_AV1_LOW.mp4', 2996846, 108.36,
        {
          'videoChangeRate': 15.85,
          'fps': 24,
          'resolution': '240p',
          'mimeType': `video/mp4; codecs="${util.av1Codec('2.0')}"`,
        }
      ],
      RoadtripMedium: [
        'roadtrip_DASH_FMP4_AV1_MED.mp4', 5662635, 108.36,
        {
          'fps': 24,
          'resolution': '360p',
          'mimeType': `video/mp4; codecs="${util.av1Codec('2.1')}"`,
        }
      ],
      RoadtripHigh: [
        'roadtrip_DASH_FMP4_AV1_HIGH.mp4', 9544863, 108.36,
        {
          'fps': 24,
          'resolution': '480p',
          'mimeType': `video/mp4; codecs="${util.av1Codec('3.0')}"`,
        }
      ],
      Roadtrip720p: [
        'roadtrip_DASH_FMP4_AV1_720P.mp4', 18556060, 108.36,
        {
          'fps': 24,
          'resolution': '720p',
          'mimeType': `video/mp4; codecs="${util.av1Codec('3.1')}"`,
        }
      ],
      Roadtrip1080p: [
        'roadtrip_DASH_FMP4_AV1_1080P.mp4', 33302181, 108.36,
        {
          'fps': 24,
          'resolution': '1080p',
          'mimeType': `video/mp4; codecs="${util.av1Codec('4.0')}"`,
        }
      ],
    },
  };

  var streamTypes = [AAC, Opus, H264, VP9, AV1, AC3, EAC3];

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

  var createStreamDefFunc = function(codec, mediaType, mimeType) {
    /**
     * @param {string} src - path to stream source file
     * @param {number} size - size of stream in bytes
     * @param {number} duration - duration of stream in seconds
     * @param {?Object<string, *> customMap - other stream properties
     */
    return function(src, size, duration, customMap) {
      var get = function(attribute) {
        if (!customMap) {
          return null;
        }
        return attribute in customMap ? customMap[attribute] : null;
      };
      var mime = mimeType;
      if (!!customMap) {
        if (customMap.hasOwnProperty('mimeType')) mime = customMap['mimeType'];
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
    var streamType = streamTypes[i].streamtype;
    mediaStreams[streamType] = {};
    mediaStreams[streamType].mimetype = mimeType;
    var createStreamDef = createStreamDefFunc(streamType, mediaType, mimeType);

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
