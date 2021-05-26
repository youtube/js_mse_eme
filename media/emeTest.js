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

/**
 * Encrypted Media Test Suite.
 * @class
 */
var EncryptedmediaTest = function() {

var emeVersion = 'Current Editor\'s Draft';
var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource) {
  info = 'EME Spec Version: ' + emeVersion;
  info += ' | webkit prefix: ' + webkitPrefix.toString();
}
info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

var createEmeTest = function(
    testId, name, category = 'EME', mandatory = true, streams = []) {
  var t = createTest(name, category, mandatory, testId, 'EME Conformance Tests');
  t.prototype.setStreams(streams);
  t.prototype.index = tests.length;
  t.prototype.emeHandler = new EMEHandler();
  t.prototype.baseTearDown = t.prototype.teardown;
  t.prototype.teardown = function(testSuiteVer, cb) {
    t.prototype.emeHandler.closeAllKeySessions(function() {
      t.prototype.emeHandler = new EMEHandler();
    });
    this.baseTearDown(testSuiteVer, cb);
  };
  tests.push(t);
  return t;
};

/**
 * Ensure encrypted video or audio could be played.
 */
var createEncryptedCodecTest = function(
    testId, encStream, otherStream, keySystem, mandatory = true, desc = '') {
  var keySystemTitle = util.MakeCapitalName(keySystem);
  var videoStream = encStream.mediatype == 'video' ? encStream : otherStream;
  var audioStream = encStream.mediatype == 'audio' ? encStream : otherStream;
  var test = createEmeTest(
      testId,
      `${keySystemTitle}${encStream.codec}${desc}` +
      `${util.MakeCapitalName(encStream.mediatype)}`,
      `${keySystemTitle}${mandatory ? '' : ' (Optional)'}`,
      mandatory,
      [videoStream, audioStream]);
  test.prototype.title = `Test if we can play ${encStream.mediatype} ` +
      `encrypted with ${keySystemTitle} encryption.`;
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;

    setupMse(video, runner, videoStream, audioStream);
    setupEme(runner, testEmeHandler, video, encStream, keySystem);
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      if (!video.paused && video.currentTime >= 15 &&
          !testEmeHandler.keyUnusable) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        runner.checkGE(video.currentTime, 15, 'currentTime');
        runner.succeed();
      }
    });
    video.play();
  };
};

createEncryptedCodecTest(
    '3.1.1.1', Media.H264.VideoSmallCenc, Media.AAC.AudioNormal,
    LicenseManager.WIDEVINE);
createEncryptedCodecTest(
    '3.1.2.1', Media.AAC.AudioSmallCenc, Media.H264.VideoNormal,
    LicenseManager.WIDEVINE);
createEncryptedCodecTest(
    '3.1.3.1', Media.Opus.SintelEncrypted, Media.VP9.VideoNormal,
    LicenseManager.WIDEVINE);
// VP9 Specific tests.
if (!harnessConfig.novp9) {
createEncryptedCodecTest(
    '3.1.4.1', Media.VP9.VideoHighEnc, Media.Opus.CarMed,
    LicenseManager.WIDEVINE);
createEncryptedCodecTest(
    '3.1.5.1', Media.VP9.VideoHighSubSampleEnc, Media.Opus.CarMed,
    LicenseManager.WIDEVINE, true, 'Subsample');
}

/**
 * Validate device supports key rotation with 16 MediaKeySesssion objects and
 * 16 keys per MediaKeySession object.
 */
var createWidevineH264MultiMediaKeySessionsTest = function() {
  var videoStream = Media.H264.VideoMultiKeyCenc;
  var audioStream = Media.AAC.AudioNormal;

  var test = createEmeTest(
      '3.1.6.1',
      'WidevineH264MultiMediaKeySessions',
      'Widevine',
      true,
      [videoStream, audioStream]);
  test.prototype.title =
      'Test creating 16 MediaKeySession objects each with 16 keys for ' +
      'playing encrypted with Widevine encryption.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    var videoStreams = [];
    for (var i = 0; i < 16; i++) {
      videoStreams.push(videoStream);
    }
    setupMse(video, runner, videoStreams, audioStream);
    setupEme(
        runner, testEmeHandler, video, videoStream, LicenseManager.WIDEVINE);
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      if (!video.paused && video.currentTime >= 15 &&
          !testEmeHandler.keyUnusable) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        runner.checkGE(video.currentTime, 15, 'currentTime');
        runner.checkEq(
            testEmeHandler.keySessions.length, 16, 'keySessionCount');
        runner.checkEq(testEmeHandler.keyCount, 256, 'keyCount');
        runner.succeed();
      }
    });
    video.play();
  };
};

createWidevineH264MultiMediaKeySessionsTest();

/**
 * Ensure Widevine encrypted video could be played with no clear start and
 * a 5 seconds license delay.
 */
var createWidevineLicenseDelayTest = function(testId, videoStream) {
  var audioStream = Media.AAC.AudioNormal;

  var test = createEmeTest(
      testId,
      `WidevineLicenseDelay${videoStream.codec}Video`,
      'Widevine',
      true,
      [videoStream, audioStream]);
  test.prototype.title =
      'Test if we can play video encrypted with Widevine ' +
      'encryption with no clear start and 5 seconds license delay.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;

    setupMse(video, runner, videoStream, audioStream);
    setupEme(
        runner, testEmeHandler, video, videoStream, LicenseManager.WIDEVINE);
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      if (!video.paused && video.currentTime >= 15 &&
          !testEmeHandler.keyUnusable) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        runner.checkGE(video.currentTime, 15, 'currentTime');
        runner.succeed();
      }
    });
    video.play();
  };
};


createWidevineLicenseDelayTest('3.1.7.1', Media.H264.VideoStreamYTCenc);
// VP9 Specific tests.
if (!harnessConfig.novp9) {
  createWidevineLicenseDelayTest('3.1.8.1', Media.VP9.VideoHighSubSampleEnc);
}
/**
 * Ensure setServerCertificate() is implemented properly.
 * Test passes if it's not supported.
 */
var createSetServerCertificateTest = function(
    testId, testName, assertion, certificateSrc) {
  var videoStream = Media.VP9.DrmL3NoHDCP360p30fpsEnc;
  var audioStream = Media.AAC.AudioNormal;

  var test = createEmeTest(
      testId,
      testName,
      'Widevine',
      true,
      [videoStream, audioStream]);
  test.prototype.title = 'Test support for setServerCertificate';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;

    setupMse(video, runner, videoStream, audioStream);
    setupEme(
        runner, testEmeHandler, video, videoStream, LicenseManager.WIDEVINE);
    testEmeHandler.setCertificateSrc(certificateSrc);
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      if (!video.paused && video.currentTime >= 5) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        assertion(runner, testEmeHandler);
        runner.succeed();
      }
    });
    video.play();
  };
};
if (!harnessConfig.novp9) {
  createSetServerCertificateTest(
      '3.1.10.2', 'setServerCertificate', function(runner, emeHandler) {
        if (emeHandler.isSetServerCertificateSupported) {
          runner.assert(emeHandler.messageEncrypted, 'Message is not encrypted');
        }
      }, util.getCertificatePath('valid_widevine_cert.bin'))
}
createEncryptedCodecTest(
    '3.2.1.1', Media.H264.VideoSmallCenc, Media.AAC.AudioNormal,
    LicenseManager.PLAYREADY, false);
createEncryptedCodecTest(
    '3.2.2.1', Media.AAC.AudioSmallCenc, Media.H264.VideoNormal,
    LicenseManager.PLAYREADY, false);

/**
 * Test encrypted event data contains all expected pssh atoms in the initData
 * and a null keySystem.
 */
var createEncryptedEventDataTest = function() {
  var videoStream = Media.H264.VideoSmallCenc;

  var test = createEmeTest(
      '3.3.1.1', 'EncryptedEventData', 'General', true, [videoStream]);
  test.prototype.title =
      'Test encrypted event data contains all expected pssh atoms in the ' +
      'initData and a null keySystem.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    try {
      setupMse(video, runner, videoStream, null);
      testEmeHandler.addEventSpies({
        onEncrypted: function(e) {
          var initData = new Uint8Array(e.initData);
          runner.checkEq(initData.length, 856, 'Length of initData');
          runner.checkEq(countPsshAtoms(initData), 3, 'Number of pssh atoms');
          runner.succeed();
        }
      });
      setupEme(
          runner, testEmeHandler, video, videoStream, LicenseManager.WIDEVINE);
    } catch (err) {
      runner.fail(err);
    }
    video.play();
  };
};

createEncryptedEventDataTest();

/**
 * Validate AudioContext#createMediaElementSource succeeds and sends audio
 * data for specified mime type.
 */
var createWidevineCreateMESTest = function(testId, encStream, otherStream) {
  var videoStream = encStream.mediatype == 'video' ? encStream : otherStream;
  var audioStream = encStream.mediatype == 'audio' ? encStream : otherStream;
  var test = createEmeTest(
      testId,
      'Widevine' + encStream.codec + util.MakeCapitalName(encStream.mediatype) +
          'CreateMediaElementSource',
      'Web Audio API (Optional)',
      false,
      [videoStream, audioStream]);
  test.prototype.title = 'Test if AudioContext#createMediaElementSource ' +
      'succeeds and sends audio data for ' + encStream.codec;
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    setupMse(video, runner, videoStream, audioStream);
    setupEme(runner, testEmeHandler, video, encStream, LicenseManager.WIDEVINE);
    var Ctor = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctor();

    video.addEventListener('timeupdate', function onTimeUpdate() {
      if (!video.paused && video.currentTime >= 5 &&
          !testEmeHandler.keyUnusable) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        try {
          runner.log('Creating MES');
          var source = ctx.createMediaElementSource(video);
        } catch (e) {
          runner.fail(e);
        } finally {
          ctx.close();
        }
        runner.checkNE(source, null, 'MediaElementSource');
        runner.succeed();
      }
    });
    video.play();
  };
}

createWidevineCreateMESTest(
    '3.4.1.1', Media.H264.VideoSmallCenc, Media.AAC.AudioNormal);
createWidevineCreateMESTest(
    '3.4.2.1', Media.AAC.AudioSmallCenc, Media.H264.VideoNormal);
createWidevineCreateMESTest(
    '3.4.3.1', Media.Opus.SintelEncrypted, Media.VP9.VideoNormal);
// VP9 Specific tests.
if (!harnessConfig.novp9) {
  createWidevineCreateMESTest(
      '3.4.4.1', Media.VP9.VideoHighEnc, Media.Opus.CarMed);
}
/**
 * Validates the required encryption scheme is supported by device and can play
 * the associated encrypted media.
 */
var createEncryptionSchemeTest =
    function(
        testId, videoStream, videoEncryptionScheme, audioStream,
        audioEncryptionScheme, mandatory = true) {
  var validEncryptionScheme = ['cenc', 'cbcs', null];
  var appendToTestName = function(encryptionScheme) {
    var name = '';
    if (validEncryptionScheme.includes(encryptionScheme)) {
      if (encryptionScheme) {
        name += util.MakeCapitalName(encryptionScheme);
      } else {
        name += 'UnsetScheme';
      }
    } else {
      name += 'InvalidScheme';
    }
    return name;
  };
  var testName = ''
  var mediaStreams = [];
  if (videoStream) {
    mediaStreams.push(videoStream);
    testName += `${videoStream.codec}Video`;
    testName += appendToTestName(videoEncryptionScheme);
  }
  if (audioStream) {
    mediaStreams.push(audioStream);
    testName += `${audioStream.codec}Audio`;
    testName += appendToTestName(audioEncryptionScheme);
  }

  var test = createEmeTest(
      testId, testName, 'EncryptionScheme', mandatory, mediaStreams);
  test.prototype.title = 'Test EncryptionScheme support for various codecs';
  test.prototype.start = function(runner, video) {
    var playbackStreams = function(video, runner, videoStream, audioStream) {
      setupMse(video, runner, videoStream, audioStream);
      video.addEventListener('timeupdate', function onTimeUpdate(e) {
        if (!video.paused && video.currentTime >= 12 &&
            !testEmeHandler.keyUnusable) {
          video.removeEventListener('timeupdate', onTimeUpdate);
          runner.checkGE(video.currentTime, 12, 'currentTime');
          runner.succeed();
        }
      });
      video.play();
    };
    var createCapabilities = function(mimetype, encryptionScheme) {
      return [{
        'contentType': mimetype,
        'encryptionScheme': encryptionScheme,
      }];
    };
    var createConfig = function(
        initDataTypes, audioCapabilities, videoCapabilities) {
      var config = {
        'initDataTypes': initDataTypes,
      };
      if (audioCapabilities != null) {
        config['audioCapabilities'] = audioCapabilities;
      }
      if (videoCapabilities != null) {
        config['videoCapabilities'] = videoCapabilities;
      }
      return [config];
    };
    var initDataTypes = ['cenc'];
    for (var stream of mediaStreams) {
      if (stream.container == 'webm') {
        initDataTypes.push('webm');
        break;
      }
    }
    var videoCapabilities = null;
    var audioCapabilities = null;
    var videoHasValidScheme = false;
    var audioHasValidScheme = false;
    if (videoStream) {
      videoCapabilities =
          createCapabilities(videoStream.mimetype, videoEncryptionScheme);
      if (validEncryptionScheme.includes(videoEncryptionScheme)) {
        videoHasValidScheme = true;
      }
    } else {
      videoHasValidScheme = true;
    }
    if (audioStream) {
      audioCapabilities =
          createCapabilities(audioStream.mimetype, audioEncryptionScheme);
      if (validEncryptionScheme.includes(audioEncryptionScheme)) {
        audioHasValidScheme = true;
      }
    } else {
      audioHasValidScheme = true;
    }
    var config =
        createConfig(initDataTypes, audioCapabilities, videoCapabilities);
    var testEmeHandler = this.emeHandler;
    setupEme(
        runner, testEmeHandler, video, mediaStreams, LicenseManager.WIDEVINE);
    testEmeHandler.checkKeySystem(config).then(
        (result) => {
          if (!videoHasValidScheme || !audioHasValidScheme) {
            runner.fail(
                "checkKeySystem succeeded with invalid EncryptionScheme.");
          }
          playbackStreams(video, runner, videoStream, audioStream)
        },
        (rejected) => {
          this.log(`rejected KeySystem for ${videoEncryptionScheme} and ${
              audioEncryptionScheme} EncryptionScheme.`)
          if (videoHasValidScheme && audioHasValidScheme) {
            runner.fail(rejected);
          } else {
            runner.succeed();
          }
        });
  }
}

// createEncryptionSchemeTest last test number: 23
// Video only
createEncryptionSchemeTest('3.5.1.1', Media.H264.VideoStreamYTCenc, 'cenc');
createEncryptionSchemeTest('3.5.2.1', Media.H264.VideoStreamYTCenc, null);
createEncryptionSchemeTest(
    '3.5.4.1', Media.H264.VideoStreamYTCenc, 'invalid99');
// VP9 Specific tests.
if (!harnessConfig.novp9) {
  createEncryptionSchemeTest(
      '3.5.5.1', Media.VP9.DrmL3NoHDCP240p30fpsEnc, 'cenc');
  createEncryptionSchemeTest(
      '3.5.6.1', Media.VP9.DrmL3NoHDCP240p30fpsEnc, null);
  createEncryptionSchemeTest('3.5.7.1', Media.VP9.DrmCbcs1080p60fps, 'cbcs');
  createEncryptionSchemeTest(
      '3.5.8.1', Media.VP9.DrmL3NoHDCP240p30fpsEnc, 'invalid99');
}
createEncryptionSchemeTest('3.5.9.1', Media.AV1.SencSdr1080p30, 'cbcs');
createEncryptionSchemeTest('3.5.10.1', Media.AV1.SencSdr1080p30, null);
createEncryptionSchemeTest('3.5.11.1', Media.AV1.SencSdr1080p30, 'invalid99');

// Audio only
createEncryptionSchemeTest(
    '3.5.12.1', null, null, Media.AAC.AudioSmallCenc, 'cenc');
createEncryptionSchemeTest(
    '3.5.13.1', null, null, Media.AAC.AudioSmallCenc, null);
createEncryptionSchemeTest('3.5.14.1', null, null, Media.AAC.DrmCbcs, 'cbcs');
createEncryptionSchemeTest(
    '3.5.15.1', null, null, Media.AAC.AudioSmallCenc, 'invalid99');
createEncryptionSchemeTest(
    '3.5.16.1', null, null, Media.Opus.SintelEncrypted, 'cenc');
createEncryptionSchemeTest(
    '3.5.17.1', null, null, Media.Opus.SintelEncrypted, null);
createEncryptionSchemeTest(
    '3.5.19.1', null, null, Media.Opus.SintelEncrypted, 'invalid99');
createEncryptionSchemeTest('3.5.18.1', null, null, Media.AC3.DrmCbcs, 'cbcs');
createEncryptionSchemeTest('3.5.3.1', null, null, Media.EAC3.DrmCbcs, 'cbcs');

// Both video and audio
createEncryptionSchemeTest(
    '3.5.20.1', Media.H264.VideoStreamYTCenc, 'cenc', Media.AAC.AudioSmallCenc,
    'cenc');
// VP9 Specific tests.
if (!harnessConfig.novp9) {
  createEncryptionSchemeTest(
      '3.5.21.1', Media.VP9.VideoHighEnc, 'cenc', Media.Opus.SintelEncrypted,
      'cenc');
  createEncryptionSchemeTest(
      '3.5.22.1', Media.VP9.DrmCbcs1080p60fps, 'cbcs', Media.AAC.DrmCbcs,
      'cbcs');
}
createEncryptionSchemeTest(
    '3.5.23.1', Media.AV1.SencSdr1080p30, 'cbcs', Media.AAC.DrmCbcs, 'cbcs');
createEncryptionSchemeTest(
    '3.5.24.1', Media.AV1.SencSdr1080p30, 'cbcs', Media.AAC.AudioSmallCenc,
    'cenc');

/**
 * Ensure encrypted AV1 video can be played with a Widevine license.
 */
var createWidevineAV1Test = function(testId, videoStream, mandatory = true) {
  const keySystem = LicenseManager.WIDEVINE;
  const audioStream = Media.Opus.CarMed;
  const codecMetadata = videoStream.get('codecMetadata');
  const bitDepth = codecMetadata.bitDepth ? codecMetadata.bitDepth : 8;
  const title = [
    'WidevineAV1', `${bitDepth}bit`, videoStream.get('transferFunction'),
    videoStream.get('resolution'), `${Math.round(videoStream.get('fps'))}fps`
  ].join('.');
  const test = createEmeTest(
      testId, title, 'Widevine AV1', mandatory, [videoStream, audioStream]);
  test.prototype.title = 'Test if we can play AV1 encrypted with Widevine.';
  test.prototype.start = function(runner, video) {
    const testEmeHandler = this.emeHandler;

    setupMse(video, runner, videoStream, audioStream);
    setupEme(runner, testEmeHandler, video, videoStream, keySystem);
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      if (!video.paused && video.currentTime >= 15 &&
          !testEmeHandler.keyUnusable) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        runner.checkGE(video.currentTime, 15, 'currentTime');
        runner.succeed();
      }
    });
    video.play();
  };
};

return {tests: tests, info: info, viewType: 'default'};

};
window.EncryptedmediaTest = EncryptedmediaTest;

try {
  exports.getTest = EncryptedmediaTest;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}

