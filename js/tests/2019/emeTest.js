/*
Copyright 2018 Google Inc. All rights reserved.

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

var createEmeTest = function(name, category, mandatory) {
  var t = createTest(name);
  t.prototype.index = tests.length;
  t.prototype.passes = 0;
  t.prototype.failures = 0;
  t.prototype.timeouts = 0;
  t.prototype.category = category || 'EME';
  if (typeof mandatory === 'boolean') {
    t.prototype.mandatory = mandatory;
  }
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


var testWidevineH264Video = createEmeTest('WidevineH264Video', 'Widevine');
testWidevineH264Video.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineH264Video.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var videoStream = Media.H264.VideoSmallCenc;
  var audioStream = Media.AAC.AudioNormal;
  try {
    setupMse(video, runner, videoStream, audioStream);
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.WIDEVINE);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
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


var testWidevineAacAudio = createEmeTest('WidevineAacAudio', 'Widevine');
testWidevineAacAudio.prototype.title =
    'Test if we can play aac audio encrypted with Widevine encryption.';
testWidevineAacAudio.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var audioStream = Media.AAC.AudioSmallCenc;
  var videoStream = Media.H264.VideoNormal;
  try {
    setupMse(video, runner, videoStream, audioStream);
    var licenseManager = new LicenseManager(video, audioStream,
                                            LicenseManager.WIDEVINE);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
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


var testWidevineOpusAudio = createEmeTest('WidevineOpusAudio', 'Widevine');
testWidevineOpusAudio.prototype.title =
    'Test if we can play opus audio encrypted with Widevine encryption.';
testWidevineOpusAudio.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var audioStream = Media.Opus.SintelEncrypted;
  var videoStream = Media.VP9.VideoNormal;
  try {
    setupMse(video, runner, videoStream, audioStream);
    var licenseManager = new LicenseManager(video, audioStream,
                                            LicenseManager.WIDEVINE);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
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


var createWidevineVP9VideoTest = function(videoStream, desc) {
  var test = createEmeTest('WidevineVP9' + desc + 'Video', 'Widevine');
  test.prototype.title =
      'Test if we can play VP9 video with Widevine key system.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    var audioStream = Media.AAC.AudioNormal
    try {
      setupMse(video, runner, videoStream, audioStream);
      var licenseManager = new LicenseManager(video, videoStream,
                                              LicenseManager.WIDEVINE);
      testEmeHandler.init(video, licenseManager);
    } catch(err) {
      runner.fail(err);
    }
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


var testWidevineH264MultiMediaKeySessions = createEmeTest(
    'WidevineH264MultiMediaKeySessions', 'Widevine');
testWidevineH264MultiMediaKeySessions.prototype.title =
    'Test creating 16 MediaKeySession objects each with 16 keys for playing ' +
    'encrypted with Widevine encryption.';
testWidevineH264MultiMediaKeySessions.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var videoStream = Media.H264.VideoMultiKeyCenc;
  var audioStream = Media.AAC.AudioNormal;
  var videoStreams = [];
  for (var i = 0; i < 16; i++) {
    videoStreams.push(videoStream);
  }
  try {
    setupMse(video, runner, videoStreams, audioStream);
    var licenseManager = new LicenseManager(
        video, videoStream, LicenseManager.WIDEVINE);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
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


var createWidevineLicenseDelayTest = function(videoStream) {
  var test = createEmeTest(
      'WidevineLicenseDelay' + videoStream.codec  + 'Video', 'Widevine');
  test.prototype.title = 'Test if we can play video encrypted with Widevine ' +
      'encryption with no clear start and 5 seconds license delay.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    var audioStream = Media.AAC.AudioNormal;
    try {
      setupMse(video, runner, videoStream, audioStream);
      var licenseManager = new LicenseManager(video, videoStream,
                                              LicenseManager.WIDEVINE);
      testEmeHandler.init(video, licenseManager);
      testEmeHandler.licenseDelay = 5000;
    } catch(err) {
      runner.fail(err);
    }
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


var createWidevineVideoTest = function(videoStream, desc) {
  var test = createEmeTest(
      'Widevine' + desc + 'Video', 'Widevine Video Formats');
  test.prototype.title = 'Test if we can play ' + desc  +
      ' video format with Widevine key system.';
  test.prototype.start = function(runner, video) {
    var testEmeHandler = this.emeHandler;
    var audioStream = Media.AAC.AudioNormal
    try {
      setupMse(video, runner, videoStream, audioStream);
      var licenseManager = new LicenseManager(video, videoStream,
                                              LicenseManager.WIDEVINE);
      testEmeHandler.init(video, licenseManager);
    } catch(err) {
      runner.fail(err);
    }
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

createWidevineVideoTest(Media.VP9.SintelLowEnc, 'VP9.Low');
createWidevineVideoTest(Media.VP9.SintelMedEnc, 'VP9.Med');
createWidevineVideoTest(Media.VP9.SintelHighEnc, 'VP9.High');
createWidevineVideoTest(Media.VP9.SintelHighMqEnc, 'VP9.HighMq');
createWidevineVideoTest(Media.VP9.SintelHighHqEnc, 'VP9.HighHq');
createWidevineVideoTest(Media.VP9.Sintel720pEnc, 'VP9.720p');
createWidevineVideoTest(Media.VP9.Sintel720pMqEnc, 'VP9.720pMq');
createWidevineVideoTest(Media.VP9.Sintel720pHqEnc, 'VP9.720pHq');
createWidevineVideoTest(Media.VP9.Sintel1080pEnc, 'VP9.1080p');
createWidevineVideoTest(Media.VP9.Sintel1080pMqEnc, 'VP9.1080pMq');
createWidevineVideoTest(Media.VP9.Sintel1080pHqEnc, 'VP9.1080pHq');
createWidevineVideoTest(Media.VP9.Sintel2kEnc, 'VP9.2k');
createWidevineVideoTest(Media.VP9.Sintel4kEnc, 'VP9.4k');
createWidevineVideoTest(Media.H264.SintelLowCenc, 'H264.Low');
createWidevineVideoTest(Media.H264.SintelMedCenc, 'H264.Med');
createWidevineVideoTest(Media.H264.SintelHighCenc, 'H264.High');
createWidevineVideoTest(Media.H264.SintelHighMqCenc, 'H264.HighMq');
createWidevineVideoTest(Media.H264.SintelHighHqCenc, 'H264.HighHq');
createWidevineVideoTest(Media.H264.Sintel720pCenc, 'H264.720p');
createWidevineVideoTest(Media.H264.Sintel720pMqCenc, 'H264.720pMq');
createWidevineVideoTest(Media.H264.Sintel720pHqCenc, 'H264.720pHq');
createWidevineVideoTest(Media.H264.Sintel1080pCenc, 'H264.1080p');
createWidevineVideoTest(Media.H264.Sintel1080pMqCenc, 'H264.1080pMq');
createWidevineVideoTest(Media.H264.Sintel1080pHqCenc, 'H264.1080pHq');


var testPlayReadyH264Video = createEmeTest('PlayReadyH264Video',
    'PlayReady (Optional)', false);
testPlayReadyH264Video.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyH264Video.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var videoStream = Media.H264.VideoSmallCenc;
  var audioStream = Media.AAC.AudioNormal;
  try {
    setupMse(video, runner, videoStream, audioStream);
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.PLAYREADY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
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


var testPlayReadyAacAudio = createEmeTest('PlayReadyAacAudio',
    'PlayReady (Optional)', false);
testPlayReadyAacAudio.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyAacAudio.prototype.start = function(runner, video) {
  var testEmeHandler = this.emeHandler;
  var audioStream = Media.AAC.AudioSmallCenc;
  var videoStream = Media.H264.VideoNormal;
  try {
    setupMse(video, runner, videoStream, audioStream);
    var licenseManager = new LicenseManager(video, audioStream,
                                            LicenseManager.PLAYREADY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
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


var createCanPlayTypeTest = function(type, desc, mandatory = true) {
  var test = createEmeTest('canPlayType.' + desc, 'General', mandatory);
  test.prototype.title =
      'Test canPlayType ' + desc + ' is using the EME Final Rec.';
  test.prototype.start = function(runner, video) {
    runner.assert(
        video.canPlayType(type) === 'probably', 'Missing support for ' + desc);
    runner.assert(
        video.canPlayType(type, 'Something') === 'probably',
        'canPlayType ' + desc + ' is not using EME Final Rec.');
    runner.succeed();
  };
};

createCanPlayTypeTest(Media.AAC.mimetype, 'AAC');
createCanPlayTypeTest(Media.H264.mimetype, 'H264');
createCanPlayTypeTest(Media.VP9.mimetype, 'VP9');


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
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.WIDEVINE);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
  video.play();
};


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
    try {
      setupMse(video, runner, videoStream, audioStream);
      var licenseManager =
          new LicenseManager(video, encStream, LicenseManager.WIDEVINE);
      testEmeHandler.init(video, licenseManager);
    } catch(err) {
      runner.fail(err);
    }
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
