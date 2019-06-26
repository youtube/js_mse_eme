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

goog.require('goog.string');

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

var fields = ['passes', 'failures', 'timeouts'];

var createEmeTest =
    function(name, category = 'EME', mandatory = true, streams = []) {
  var t = createTest(name, category, mandatory);
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
var createEncryptedCodecTest =
    function(encStream, otherStream, keySystem, mandatory = true, desc = '') {
  var keySystemTitle = goog.string.toTitleCase(keySystem);
  var videoStream = encStream.mediatype == 'video' ? encStream : otherStream;
  var audioStream = encStream.mediatype == 'audio' ? encStream : otherStream;
  var test = createEmeTest(
      `${keySystemTitle}${encStream.codec}${desc}` +
          `${goog.string.toTitleCase(encStream.mediatype)}`,
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
    Media.H264.VideoSmallCenc, Media.AAC.AudioNormal, LicenseManager.WIDEVINE);
createEncryptedCodecTest(
    Media.AAC.AudioSmallCenc, Media.H264.VideoNormal, LicenseManager.WIDEVINE);
createEncryptedCodecTest(
    Media.Opus.SintelEncrypted, Media.VP9.VideoNormal, LicenseManager.WIDEVINE);
createEncryptedCodecTest(
    Media.VP9.VideoHighEnc, Media.Opus.CarMed, LicenseManager.WIDEVINE);
createEncryptedCodecTest(
    Media.VP9.VideoHighSubSampleEnc, Media.Opus.CarMed,
    LicenseManager.WIDEVINE, true, 'Subsample');

/**
 * Validate device supports key rotation with 16 MediaKeySesssion objects and
 * 16 keys per MediaKeySession object.
 */
var createWidevineH264MultiMediaKeySessionsTest = function() {
  var videoStream = Media.H264.VideoMultiKeyCenc;
  var audioStream = Media.AAC.AudioNormal;

  var test = createEmeTest(
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
        runner.checkEq(testEmeHandler.keySessions.length, 16, 'keySessionCount');
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
var createWidevineLicenseDelayTest = function(videoStream) {
  var audioStream = Media.AAC.AudioNormal;

  var test = createEmeTest(
      `WidevineLicenseDelay${videoStream.codec}Video`,
      'Widevine',
      true,
      [videoStream, audioStream]);
  test.prototype.title = 'Test if we can play video encrypted with Widevine ' +
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


createWidevineLicenseDelayTest(Media.H264.VideoStreamYTCenc);
createWidevineLicenseDelayTest(Media.VP9.VideoHighSubSampleEnc);

/**
 * Ensure setServerCertificate() is implemented properly.
 */
var createSetServerCertificateTest = function(
    testName, assertion, certificateSrc) {
  var videoStream = Media.VP9.DrmL3NoHDCP360p30fpsEnc;
  var audioStream = Media.AAC.AudioNormal;

  var test = createEmeTest(
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

createSetServerCertificateTest(
    'CertificateRequestByServer',
    function(runner, emeHandler) {
      runner.assert(
          emeHandler.serverCertificateRequest,
          'No certificate request generated by server')
      runner.assert(
          emeHandler.messageEncrypted, 'Message is not encrypted');
    }
);
createSetServerCertificateTest(
    'setServerCertificate',
    function(runner, emeHandler) {
      runner.assert(
          !emeHandler.setServerCertificateResult,
          emeHandler.setServerCertificateResult);
      runner.assert(
          emeHandler.messageEncrypted, 'Message is not encrypted');
    },
    util.getCertificatePath('valid_widevine_cert.bin')
);
createSetServerCertificateTest(
    'setServerCertificateWithInvalidCert',
    function(runner, emeHandler) {
      runner.assert(
          emeHandler.setServerCertificateResult,
          'setServerCertificate() succeeded with invalid certificate');
    },
    util.getCertificatePath('invalid_widevine_cert.bin')
);

createEncryptedCodecTest(
    Media.H264.VideoSmallCenc, Media.AAC.AudioNormal, LicenseManager.PLAYREADY,
    false);
createEncryptedCodecTest(
    Media.AAC.AudioSmallCenc, Media.H264.VideoNormal, LicenseManager.PLAYREADY,
    false);

/**
 * Test encrypted event data contains all expected pssh atoms in the initData
 * and a null keySystem.
 */
var createEncryptedEventDataTest = function() {
  var videoStream = Media.H264.VideoSmallCenc;

  var test = createEmeTest(
      'EncryptedEventData', 'General', true, [videoStream]);
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
    } catch(err) {
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
var createWidevineCreateMESTest = function(encStream, otherStream) {
  var videoStream = encStream.mediatype == 'video' ? encStream : otherStream;
  var audioStream = encStream.mediatype == 'audio' ? encStream : otherStream;
  var test = createEmeTest(
      'Widevine' + encStream.codec +
          util.MakeCapitalName(encStream.mediatype) +
          'CreateMediaElementSource',
      'Web Audio API (Optional)',
      false,
      [videoStream, audioStream]);
  test.prototype.title = 'Test if AudioContext#createMediaElementSource ' +
      'succeeds and sends audio data for ' + encStream.codec;
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    setupMse(video, runner, videoStream, audioStream);
    setupEme(
        runner, testEmeHandler, video, encStream, LicenseManager.WIDEVINE);
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

createWidevineCreateMESTest(Media.H264.VideoSmallCenc, Media.AAC.AudioNormal);
createWidevineCreateMESTest(Media.AAC.AudioSmallCenc, Media.H264.VideoNormal);
createWidevineCreateMESTest(Media.Opus.SintelEncrypted, Media.VP9.VideoNormal);
createWidevineCreateMESTest(Media.VP9.VideoHighEnc, Media.Opus.CarMed);

return {tests: tests, info: info, fields: fields, viewType: 'default'};

};
