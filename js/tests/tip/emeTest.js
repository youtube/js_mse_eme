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

var EncryptedmediaTest = function() {

var emeVersion = '04 February 2016';
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

function setupBaseEmeTest(video, runner, videoStream, audioStream) {
  var ms = new MediaSource();
  var testEmeHandler = new EMEHandler();
  var videoSb = null;
  var audioSb = null;

  function onError(e) {
    switch (e.target.error.code) {
      case e.target.error.MEDIA_ERR_ABORTED:
        runner.fail('EME test failure: You aborted the video playback.');
        break;
      case e.target.error.MEDIA_ERR_NETWORK:
        runner.fail('EME test failure: A network error caused the video' +
                    ' download to fail part-way.');
        break;
      case e.target.error.MEDIA_ERR_DECODE:
        runner.fail('EME test failure: The video playback was aborted due to' +
                    ' a corruption problem or because the video used features' +
                    ' your browser did not support.');
        break;
      case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        runner.fail('EME test failure: The video could not be loaded, either' +
                    ' because the server or network failed or because the' +
                    ' format is not supported.');
        break;
      default:
        runner.fail('EME test failure: An unknown error occurred.');
        break;
    }
  }

  function fetchStream(stream, cb, start, end) {
    var xhr = runner.XHRManager.createRequest(stream.src, cb, start, end);
    xhr.send();
  }

  function appendLoop(stream, sb) {
    var parsedData;
    var segmentIdx = 0;
    var maxSegments = 4
    fetchStream(stream, function() {
      if (stream.codec == 'H264' || stream.codec == 'AAC') {
        parsedData = parseMp4(this.getResponseData());
      } else if(stream.codec == 'VP9') {
        parsedData = parseWebM(this.getResponseData().buffer);
      } else {
        runner.fail('Unsupported codec in appendLoop.');
      }
      fetchStream(stream, function() {
        sb.addEventListener('updateend', function append() {
          if (maxSegments - segmentIdx <= 0) {
            sb.removeEventListener('updateend', append);
            return;
          }
          fetchStream(stream, function() {
            sb.appendBuffer(this.getResponseData());
            segmentIdx += 1
          }, parsedData[segmentIdx].offset, parsedData[segmentIdx].size);
        });
        sb.appendBuffer(this.getResponseData());
        segmentIdx += 1
      }, 0, parsedData[0].size + parsedData[0].offset);
    }, 0, 32 * 1024);
  }

  function onSourceOpen(e) {
    if (audioStream != null) {
      audioSb = ms.addSourceBuffer(audioStream.mimetype);
      appendLoop(audioStream, audioSb);
    }

    if (videoStream != null) {
      videoSb = ms.addSourceBuffer(videoStream.mimetype);
      appendLoop(videoStream, videoSb);
    }
  }

  ms.addEventListener('sourceopen', onSourceOpen);
  ms.addEventListener('webkitsourceopen', onSourceOpen);
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();

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
        testEmeHandler.keyAddedCount == 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.checkGE(video.currentTime, 15, 'currentTime');
      runner.succeed();
    }
  });
  video.play();
};


var testWidevineAacAudio = createEmeTest('WidevineAacAudio', 'Widevine');
testWidevineAacAudio.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
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
        testEmeHandler.keyAddedCount == 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.checkGE(video.currentTime, 15, 'currentTime');
      runner.succeed();
    }
  });
  video.play();
};


var testWidevineVP9Video = createEmeTest('WidevineVP9Video', 'Widevine');
testWidevineVP9Video.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineVP9Video.prototype.start = function(runner, video) {
  var videoStream = Media.VP9.VideoHighEnc;
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
        testEmeHandler.keyAddedCount == 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.checkGE(video.currentTime, 15, 'currentTime');
      runner.succeed();
    }
  });
  video.play();
};


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
        testEmeHandler.keyAddedCount == 1) {
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
        testEmeHandler.keyAddedCount == 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.checkGE(video.currentTime, 15, 'currentTime');
      runner.succeed();
    }
  });
  video.play();
};


var testCanPlayType = createEmeTest('canPlayType', 'General EME');
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


return {tests: tests, info: info, fields: fields, viewType: 'extra compact'};

};
