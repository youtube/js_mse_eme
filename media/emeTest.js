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

var fields = ['passes', 'failures', 'timeouts'];

var createEmeTest = function(name, category = 'EME', mandatory = true) {
  var t = createTest(name, category, mandatory);
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
 * Ensure Widevine encrypted H264 video could be played.
 */
var testWidevineH264Video = createEmeTest('WidevineH264Video', 'Widevine');
testWidevineH264Video.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineH264Video.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var videoStream = Media.H264.VideoSmallCenc;
  var audioStream = Media.AAC.AudioNormal;
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

/**
 * Ensure Widevine encrypted aac audio could be played.
 */
var testWidevineAacAudio = createEmeTest('WidevineAacAudio', 'Widevine');
testWidevineAacAudio.prototype.title =
    'Test if we can play aac audio encrypted with Widevine encryption.';
testWidevineAacAudio.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var audioStream = Media.AAC.AudioSmallCenc;
  var videoStream = Media.H264.VideoNormal;

  setupMse(video, runner, videoStream, audioStream);
  setupEme(
      runner, testEmeHandler, video, audioStream, LicenseManager.WIDEVINE);
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

/**
 * Ensure Widevine encrypted Opus audio could be played.
 */
var testWidevineOpusAudio = createEmeTest('WidevineOpusAudio', 'Widevine');
testWidevineOpusAudio.prototype.title =
    'Test if we can play opus audio encrypted with Widevine encryption.';
testWidevineOpusAudio.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var audioStream = Media.Opus.SintelEncrypted;
  var videoStream = Media.VP9.VideoNormal;

  setupMse(video, runner, videoStream, audioStream);
  setupEme(
      runner, testEmeHandler, video, audioStream, LicenseManager.WIDEVINE);
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

/**
 * Ensure Widevine subsample or full-sample encrypted VP9 video could be played.
 */
var createWidevineVP9VideoTest = function(videoStream, desc) {
  var test = createEmeTest('WidevineVP9' + desc + 'Video', 'Widevine');
  test.prototype.title =
      'Test if we can play VP9 video with Widevine key system.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    var audioStream = Media.AAC.AudioNormal

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


createWidevineVP9VideoTest(Media.VP9.VideoHighEnc, '');
createWidevineVP9VideoTest(Media.VP9.VideoHighSubSampleEnc, 'Subsample');

/**
 * Validate device supports key rotation with 16 MediaKeySesssion objects and
 * 16 keys per MediaKeySession object.
 */
var testWidevineH264MultiMediaKeySessions = createEmeTest(
    'WidevineH264MultiMediaKeySessions', 'Widevine');
testWidevineH264MultiMediaKeySessions.prototype.title =
    'Test creating 16 MediaKeySession objects each with 16 keys for playing ' +
    'encrypted with Widevine encryption.';
testWidevineH264MultiMediaKeySessions.prototype.start =
    function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var videoStream = Media.H264.VideoMultiKeyCenc;
  var audioStream = Media.AAC.AudioNormal;
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

/**
 * Ensure Widevine encrypted video could be played with no clear start and
 * a 5 seconds license delay.
 */
var createWidevineLicenseDelayTest = function(videoStream) {
  var test = createEmeTest(
      'WidevineLicenseDelay' + videoStream.codec  + 'Video', 'Widevine');
  test.prototype.title = 'Test if we can play video encrypted with Widevine ' +
      'encryption with no clear start and 5 seconds license delay.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    var audioStream = Media.AAC.AudioNormal;

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
  var test = createEmeTest(testName, 'Widevine');
  test.prototype.title = 'Test support for setServerCertificate';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    var videoStream = Media.VP9.DrmL3NoHDCP360p30fpsEnc;
    var audioStream = Media.AAC.AudioNormal;

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

/**
 * Ensure PlayReady encrypted H264 video could be played.
 */
var testPlayReadyH264Video = createEmeTest('PlayReadyH264Video',
    'PlayReady (Optional)', false);
testPlayReadyH264Video.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyH264Video.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var videoStream = Media.H264.VideoSmallCenc;
  var audioStream = Media.AAC.AudioNormal;

  setupMse(video, runner, videoStream, audioStream);
  setupEme(
      runner, testEmeHandler, video, videoStream, LicenseManager.PLAYREADY);
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

/**
 * Ensure PlayReady encrypted aac audio could be played.
 */
var testPlayReadyAacAudio = createEmeTest('PlayReadyAacAudio',
    'PlayReady (Optional)', false);
testPlayReadyAacAudio.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyAacAudio.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var audioStream = Media.AAC.AudioSmallCenc;
  var videoStream = Media.H264.VideoNormal;

  setupMse(video, runner, videoStream, audioStream);
  setupEme(
      runner, testEmeHandler, video, audioStream, LicenseManager.PLAYREADY);
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

/**
 * Ensure isTypeSupported and requestMediaKeySystemAccess for specified mime
 * type.
 */
var createIsTypeSupportedTest = function(type, desc, mandatory = true) {
  var test = createEmeTest('isTypeSupported.' + desc, 'General', mandatory);
  var descWithType = desc + ' (' + type + ')';
  test.prototype.title = 'Test support for ' + descWithType;
  test.prototype.start = function(runner, video) {
    runner.assert(
        MediaSource.isTypeSupported(type),
        'isTypeSupported failed for ' + descWithType);
    runner.succeed();
  };
};

createIsTypeSupportedTest(Media.AAC.mimetype, 'AAC');
createIsTypeSupportedTest(Media.H264.mimetype, 'H264');
createIsTypeSupportedTest(Media.VP9.mimetype, 'VP9');

/**
 * Test encrypted event data contains all expected pssh atoms in the initData
 * and a null keySystem.
 */
var testEncryptedEventData = createEmeTest('EncryptedEventData', 'General');
testEncryptedEventData.prototype.title =
    'Test encrypted event data contains all expected pssh atoms in the ' +
    'initData and a null keySystem.';
testEncryptedEventData.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var videoStream = Media.H264.VideoSmallCenc;
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

/**
 * Validate AudioContext#createMediaElementSource succeeds and sends audio
 * data for specified mime type.
 */
var createWidevineCreateMESEMETest =
    function(videoStream, audioStream, encStream) {
  var test = createEmeTest(
      'Widevine' + encStream.codec +
          util.MakeCapitalName(encStream.mediatype) +
          'CreateMediaElementSource',
      'Web Audio API (Optional)',
      false);
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

createWidevineCreateMESEMETest(
    Media.H264.VideoSmallCenc,
    Media.AAC.AudioNormal,
    Media.H264.VideoSmallCenc);
createWidevineCreateMESEMETest(
    Media.H264.VideoNormal,
    Media.AAC.AudioSmallCenc,
    Media.AAC.AudioSmallCenc);
createWidevineCreateMESEMETest(
    Media.VP9.VideoNormal,
    Media.Opus.SintelEncrypted,
    Media.Opus.SintelEncrypted);
createWidevineCreateMESEMETest(
    Media.VP9.VideoHighEnc,
    Media.AAC.AudioNormal,
    Media.VP9.VideoHighEnc);

return {tests: tests, info: info, fields: fields, viewType: 'default'};

};
