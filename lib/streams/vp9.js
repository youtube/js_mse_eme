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
const WIDEVINE_L3NOHDCP_VIDEO_ID = 'f320151fa3f061b2';
const WIDEVINE_L3NOHDCP_SIGNATURE =
    '81E7B33929F9F35922F7D2E96A5E7AC36F3218B2.673F553EE51A48438AE5E707AEC87A071B4FEF65';

/* The CBCS key details are:
 * video_id = 6508f99557a8385f
 * key_id = 5800c18538ed59ca9c148647d81df367
 * key = d415d960ee7fc13cf688063d5b28cfb4
 * iv = 85afc33ec742021e328c2a65a0ea59aa
 */
const CBCS_VIDEO_ID = '6508f99557a8385f';
const CBCS_WIDEVINE_SIGNATURE =
    '5153900DAC410803EC269D252DAAA82BA6D8B825.495E631E406584A8EFCB4E9C9F3D45F6488B94E4';
const KEY = 'ik0';

const VP9_STREAMS = {
  streamtype: 'VP9',
  mimetype: `video/webm; codecs="${VP9Codec.codecString()}"`,
  mediatype: 'video',
  container: 'webm',
  streams: {
    Video1080p1MB: [
      'big-buck-bunny-vp9-1080p-1mb.webm', 1184180, 7.00,
      {'resolution': '1080p'}
    ],
    Video2160p1MB: [
      'big-buck-bunny-vp9-2160p-1mb.webm', 1091680, 3.50,
      {'resolution': '2160p'}
    ],
    Video2160pHdr1MB: [
      'meridian_vp9_hdr_2160p_1mb.webm', 1479002, 1.01, {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '2160p',
        'codecMetadata': VP9Codec.pqMetadata(),
      }
    ],
    VideoTiny: [
      'feelings_vp9-20130806-242.webm', 4478156, 135.46,
      {'videoChangeRate': 15.35, 'resolution': '240p'}
    ],
    VideoNormal: [
      'big-buck-bunny-vp9-360p-30fps.webm', 48362964, 634.53,
      {'resolution': '360p'}
    ],
    VideoHuge: [
      'feelings_vp9-20130806-247.webm', 27757852, 135.46, {'resolution': '720p'}
    ],
    Video1MB: ['vp9-video-1mb.webm', 1103716, 1.00, {'resolution': '720p'}],
    VideoLive: [
      'vp9-live-1080p-30fps.webm', 2328275, 14.997,
      {'resolution': '1080p', 'fps': 30}
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
    DrmCbcs1080p60fps: [
      'cbcs/bbb_60fps_vp9.mp4', 8360069, 30.03, {
        'mimeType': `video/mp4; codecs="${VP9Codec.codecString()}"`,
        'container': 'mp4',
        'fps': 60,
        'resolution': '1080p',
        'video_id': CBCS_VIDEO_ID,
        'widevine_signature': CBCS_WIDEVINE_SIGNATURE,
        'key': KEY,
      }
    ],
    ProgressiveLow: [
      'feelings_vp9-20130806-243.webm', 7902885, 135.46, {'resolution': '360p'}
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
    Webgl1080p240fps: [
      '248_bbb240.webm', 1721994529, 30, {'fps': 240, 'resolution': '1080p'}
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
      'motor_vp9_hdr_ultralow.webm',
      4093046,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '144p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlgLow: [
      'motor_vp9_hdr_low.webm',
      6157161,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '240p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlgMed: [
      'motor_vp9_hdr_med.webm',
      13026706,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '360p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlgHigh: [
      'motor_vp9_hdr_high.webm',
      24059408,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '480p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg720p: [
      'motor_vp9_hdr_720p.webm',
      54591653,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '720p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg1080p: [
      'motor_vp9_hdr_1080p.webm',
      96437886,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '1080p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg2k: [
      'motor_vp9_hdr_2k.webm',
      304356661,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '1440p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg4k: [
      'motor_vp9_hdr_4k.webm',
      631043806,
      254.462,
      {
        'transferFunction': 'HLG',
        'fps': 30,
        'resolution': '2160p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlgUltralowHfr: [
      'news_vp9_hdr_ultralow.webm',
      2629927,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '144p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlgLowHfr: [
      'news_vp9_hdr_low.webm',
      3948184,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '240p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlgMedHfr: [
      'news_vp9_hdr_med.webm',
      8339341,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '360p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlgHighHfr: [
      'news_vp9_hdr_high.webm',
      15621796,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '480p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg720pHfr: [
      'news_vp9_hdr_720p.webm',
      34871072,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '720p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg1080pHfr: [
      'news_vp9_hdr_1080p.webm',
      58835191,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '1080p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg2kHfr: [
      'news_vp9_hdr_2k.webm',
      156656282,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '1440p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrHlg4kHfr: [
      'news_vp9_hdr_4k.webm',
      314053586,
      136.62,
      {
        'transferFunction': 'HLG',
        'fps': 60,
        'resolution': '2160p',
        'codecMetadata': VP9Codec.hlgMetadata(),
      },
    ],
    HdrPqUltralow: [
      'roadtrip_vp9_hdr_ultralow.webm',
      1561697,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '144p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPqLow: [
      'roadtrip_vp9_hdr_low.webm',
      2662190,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '240p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPqMed: [
      'roadtrip_vp9_hdr_med.webm',
      5719740,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '360p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPqHigh: [
      'roadtrip_vp9_hdr_high.webm',
      10715789,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '480p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq720p: [
      'roadtrip_vp9_hdr_720p.webm',
      24453226,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '720p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq1080p: [
      'roadtrip_vp9_hdr_1080p.webm',
      43377155,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '1080p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq2k: [
      'roadtrip_vp9_hdr_2k.webm',
      121051265,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '1440p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq4k: [
      'roadtrip_vp9_hdr_4k.webm',
      286332111,
      108.358,
      {
        'transferFunction': 'PQ',
        'fps': 30,
        'resolution': '2160p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPqUltralowHfr: [
      'meridian_vp9_hdr_ultralow.webm',
      12680814,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '144p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPqLowHfr: [
      'meridian_vp9_hdr_low.webm',
      26899101,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '240p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPqMedHfr: [
      'meridian_vp9_hdr_med.webm',
      63165785,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '360p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPqHighHfr: [
      'meridian_vp9_hdr_high.webm',
      132217173,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '480p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq720pHfr: [
      'meridian_vp9_hdr_720p.webm',
      339235754,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '720p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq1080pHfr: [
      'meridian_vp9_hdr_1080p.webm',
      531408862,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '1080p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq2kHfr: [
      'meridian_vp9_hdr_2k.webm',
      1259703408,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '1440p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
    HdrPq4kHfr: [
      'meridian_vp9_hdr_4k.webm',
      2249443995,
      718.94,
      {
        'transferFunction': 'PQ',
        'fps': 60,
        'resolution': '2160p',
        'codecMetadata': VP9Codec.pqMetadata(),
      },
    ],
  },
};

window.VP9_STREAMS = VP9_STREAMS;
})();

try {
  exports.VP9_STREAMS = window.VP9_STREAMS;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
