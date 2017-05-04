/*
Copyright 2017 Google Inc. All rights reserved.

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
  tests.push(t);
  return t;
};

function setupBaseEmeTest(video, runner, videoStream, audioStream, cbSpies) {
  setupMse(video, runner, videoStream, audioStream);
  var testEmeHandler = new EMEHandler();
  if (cbSpies) {
    for (var spy in cbSpies) {
      testEmeHandler['_' + spy] = testEmeHandler[spy];
      testEmeHandler[spy] = cbSpies[spy];
    }
  }

  return testEmeHandler;
}


var testWidevineH264Video = createEmeTest('WidevineH264Video', 'Widevine');
testWidevineH264Video.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineH264Video.prototype.start = function(runner, video) {
  var videoStream = Media.H264.VideoSmallCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null);
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
  var audioStream = Media.AAC.AudioSmallCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, null, audioStream);
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
  var audioStream = Media.Opus.SintelEncrypted;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, null, audioStream);
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
    try {
      var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null);
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


var testPlayReadyH264Video = createEmeTest('PlayReadyH264Video', 'PlayReady');
testPlayReadyH264Video.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyH264Video.prototype.start = function(runner, video) {
  var videoStream = Media.H264.VideoSmallCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null);
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


var testPlayReadyAacAudio = createEmeTest('PlayReadyAacAudio', 'PlayReady');
testPlayReadyAacAudio.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyAacAudio.prototype.start = function(runner, video) {
  var audioStream = Media.AAC.AudioSmallCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, null, audioStream);
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


var testCanPlayType = createEmeTest('canPlayType', 'General');
testCanPlayType.prototype.title =
    'Test canPlayType is using the EME Final Rec.';
testCanPlayType.prototype.start = function(runner, video) {
  runner.assert(video.canPlayType(Media.AAC.mimetype) === 'probably',
      'Missing support for AAC');
  runner.assert(video.canPlayType(Media.H264.mimetype) === 'probably',
      'Missing support for H264');
  runner.assert(video.canPlayType(Media.VP9.mimetype) === 'probably',
      'Missing support for VP9');
  runner.assert(video.canPlayType(Media.AAC.mimetype, 'Something')
      === 'probably', 'canPlayType is not using EME final rec.');
  runner.assert(video.canPlayType(Media.H264.mimetype, 'Something1')
      === 'probably', 'canPlayType is not using EME final rec.');
  runner.assert(video.canPlayType(Media.VP9.mimetype, 'Something2')
      === 'probably', 'canPlayType is not using EME final rec.');
  runner.succeed();
};


var testEncryptedEventData = createEmeTest('EncryptedEventData', 'General');
testEncryptedEventData.prototype.title =
    'Test encrypted event data contains all expected pssh atoms in the ' +
    'initData and a null keySystem.';
testEncryptedEventData.prototype.start = function(runner, video) {
  var videoStream = Media.H264.VideoSmallCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onEncrypted: function(e) {
        var initData = new Uint8Array(e.initData);
        runner.checkEq(initData.length, 856, 'Length of initData');
        runner.checkEq(countPsshAtoms(initData), 3, 'Number of pssh atoms');
        runner.succeed();
      }
    });
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
  video.play();
};


var createWidevineCreateMESEMETest = function(videoStream, audioStream) {
  var stream =  (videoStream ? videoStream : audioStream);
  var test = createEmeTest('Widevine' + stream.codec +
	                   util.MakeCapitalName(stream.mediatype), 'WAA');
  test.prototype.title = 'Test if AudioContext#createMediaElementSource ' +
      'succeeds and sends audio data for ' + stream.codec;
  test.prototype.start = function(runner, video) {
    var self = this;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    var ctx = self.ctx = new Ctor();

    try {
      var testEmeHandler = setupBaseEmeTest(video, runner, videoStream,
	                                    audioStream);
      var licenseManager = new LicenseManager(video, stream,
                                              LicenseManager.WIDEVINE);
      testEmeHandler.init(video, licenseManager);
    } catch(err) {
      runner.fail(err);
    }

    video.addEventListener('timeupdate', function onTimeUpdate() {
      if (!video.paused && video.currentTime >= 5 &&
          !testEmeHandler.keyUnusable) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        try {
          runner.log('Creating MES');
          var source = ctx.createMediaElementSource(video);
          runner.checkNE(source, null, 'MediaElementSource');
          runner.succeed();
        } catch (e) {
          runner.fail(e);
        }
      }
    });

    video.play();
  };
  test.prototype.teardown = function() {
    this.ctx.close();
  }
}

createWidevineCreateMESEMETest(Media.H264.VideoSmallCenc, null);
createWidevineCreateMESEMETest(null, Media.AAC.AudioSmallCenc);
createWidevineCreateMESEMETest(null, Media.Opus.SintelEncrypted);
createWidevineCreateMESEMETest(Media.VP9.VideoHighEnc, null);


return {tests: tests, info: info, fields: fields, viewType: 'default'};

};
