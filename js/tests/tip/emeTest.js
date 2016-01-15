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
  var t = createMSTest(name);
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

function setupBaseEmeTest(video, runner, media, bufferSize, cbSpies) {
  var ms = new MediaSource();
  var media = media;
  var testEmeHandler = new EMEHandler();
  var src = null;
  if (cbSpies) {
    for (var spy in cbSpies) {
      testEmeHandler['_' + spy] = testEmeHandler[spy];
      testEmeHandler[spy] = cbSpies[spy];
    }
  }

  function onError(e) {
    runner.fail('Error reported in TestClearKeyNeedKey');
  }

  function onSourceOpen(e) {
    src = ms.addSourceBuffer(StreamDef.VideoType);
    var xhr = runner.XHRManager.createRequest(
      media,
      function(e) {
        src.appendBuffer(this.getResponseData());
      }, 0, bufferSize);
    xhr.send();
  }

  ms.addEventListener('sourceopen', onSourceOpen);
  ms.addEventListener('webkitsourceopen', onSourceOpen);
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();

  return testEmeHandler;
}


var testCanPlayClearKey = createEmeTest('CanPlayClearKey');
testCanPlayClearKey.prototype.title =
    'Test if canPlay return is correct for clear key.';
testCanPlayClearKey.prototype.start = function(runner, video) {
  runner.assert(
      video.canPlayType(
          StreamDef.VideoType, 'org.w3.clearkey') === 'probably' ||
      video.canPlayType(
          StreamDef.VideoType, 'webkit-org.w3.clearkey') === 'probably',
      "canPlay doesn't support video and clearkey properly");
  runner.assert(
      video.canPlayType(
          StreamDef.AudioType, 'org.w3.clearkey') === 'probably' ||
      video.canPlayType(
          StreamDef.AudioType, 'webkit-org.w3.clearkey') === 'probably',
      "canPlay doesn't support audio and clearkey properly");
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, StreamDef.VideoStreamYTCenc.src, 1000000, null);
    testEmeHandler.init(video, StreamDef.VideoType, 'clearkey', 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
  video.addEventListener('timeupdate', function onTimeUpdate(e) {
    if (!video.paused && video.currentTime >= 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.succeed();
    }
  });
  video.play();
};


var testInvalidKey = createEmeTest('InvalidKey');
testInvalidKey.prototype.title =
    'Test if an invalid key will produce the expected error.';
testInvalidKey.prototype.start = function(runner, video) {
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, StreamDef.VideoStreamYTCenc.src, 1000000, null);
    var self = this;
    testEmeHandler.init(video, StreamDef.VideoType, 'invalid_widevine', 'widevine', function(e) {
      self.runner.checkEq(e.code, 15);
      self.runner.checkEq(e.name, 'InvalidAccessError');
      self.runner.succeed();
    });
  } catch(err) {
    runner.fail(err);
  }
  video.play();
};


var testClearKeyAudio = createEmeTest('ClearKeyAudio');
testClearKeyAudio.prototype.title =
    'Test if we can play audio encrypted with ClearKey encryption.';
testClearKeyAudio.prototype.onsourceopen = function() {
  var runner = this.runner;

  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource(StreamDef.VideoNormal.src, runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource(StreamDef.AudioNormalClearKey.src, runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  var testEmeHandler = new EMEHandler();
  testEmeHandler.init(media, StreamDef.AudioType, 'audio_clearkey', 'clearkey');

  appendUntil(runner.timeouts, media, videoSb, videoChain, 5, function() {
    appendUntil(runner.timeouts, media, audioSb, audioChain, 5, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 10, 5,
          videoSb, videoChain, audioSb, audioChain, function() {
        runner.checkGE(media.currentTime, 5, 'currentTime');
        runner.succeed();
      });
    });
  });
};


var testClearKeyVideo = createEmeTest('ClearKeyVideo');
testClearKeyVideo.prototype.title =
    'Test if we can play video encrypted with ClearKey encryption.';
testClearKeyVideo.prototype.onsourceopen = function() {
  var runner = this.runner;

  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource(StreamDef.VideoNormalClearKey.src, runner.XHRManager,
          runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
          runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  var testEmeHandler = new EMEHandler();
  testEmeHandler.init(media, StreamDef.VideoType, 'video_clearkey', 'clearkey');

  appendUntil(runner.timeouts, media, videoSb, videoChain, 5, function() {
    appendUntil(runner.timeouts, media, audioSb, audioChain, 5, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 10, 5,
          videoSb, videoChain, audioSb, audioChain, function() {
        runner.checkGE(media.currentTime, 5, 'currentTime');
        runner.succeed();
      });
    });
  });
};


var testDualKey = createEmeTest('DualKey');
testDualKey.prototype.title = 'Tests multiple video keys';
testDualKey.prototype.start = function(runner, video) {
  var ms = new MediaSource();
  var testEmeHandler = new EMEHandler();
  testEmeHandler.init(video, StreamDef.VideoType, ['clearkey', 'clearkey2'], 'clearkey');

  // Open two sources with two distinct licenses.
  function onSourceOpen(e) {
    var sb = ms.addSourceBuffer(StreamDef.VideoType);

    var firstFile = new ResetInit(new FileSource(
      StreamDef.VideoStreamYTCenc.src,
      runner.XHRManager, runner.timeouts));

    appendUntil(runner.timeouts, video, sb, firstFile, 5, function() {
      sb.abort();

      var secondFile = new ResetInit(new FileSource(
        StreamDef.VideoSmallStreamYTCenc.src,
        runner.XHRManager, runner.timeouts));

      appendInit(video, sb, secondFile, 0, function() {
        sb.timestampOffset = video.buffered.end(0);
        appendAt(runner.timeouts, video, sb, secondFile, 5, 5, function() {
          video.play();
        });
      });
    });

    video.addEventListener('timeupdate', function onTimeUpdate() {
      if (video.currentTime >= 10 - 1) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        runner.succeed();
      }
    });
  }

  ms.addEventListener('sourceopen', onSourceOpen);
  ms.addEventListener('webkitsourceopen', onSourceOpen);
  video.src = window.URL.createObjectURL(ms);
  video.load();
};


var testEncryptedEvent = createEmeTest('EncryptedEvent');
testEncryptedEvent.prototype.title = 'Test encrypted event';
testEncryptedEvent.prototype.start = function(runner, video) {
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, StreamDef.VideoStreamYTCenc.src, 100000, {
      onEncrypted: function(e) {
        runner.succeed();
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, 'clearkey', 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testInvalidKeySystem = createEmeTest('InvalidKeySystem');
testInvalidKeySystem.prototype.title =
    'Test that invalid key systems throw exception.';
testInvalidKeySystem.prototype.start = function(runner, video) {
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, StreamDef.VideoStreamYTCenc.src, 100000, {
      onEncrypted: function(evt) {
        var exceptionCount = 0;
        var promise = navigator.requestMediaKeySystemAccess(null);
        promise.catch(
          function(e) {
            exceptionCount++;
            if (exceptionCount == 2) {
              runner.succeed();
            }
          }
        );

        promise = navigator.requestMediaKeySystemAccess('foobar.notarealkeysystem');
        promise.catch(
          function(e) {
            exceptionCount++;
            if (exceptionCount == 2) {
              runner.succeed();
            }
          }
        );
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, 'clearkey', 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testMessageEvent = createEmeTest('MessageEvent');
testMessageEvent.prototype.title = 'Test message event.';
testMessageEvent.prototype.start = function(runner, video) {
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner,StreamDef.VideoStreamYTCenc.src, 100000, {
      onMessage: function(evt) {
        runner.succeed();
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, 'clearkey', 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testPlayReadySupport = createEmeTest('PlayReadySupport', 'Key System Support');
testPlayReadySupport.prototype.title =
    'Test if canPlay return is correct for PlayReady.';
testPlayReadySupport.prototype.onsourceopen = function() {
  var video = this.video;
  // PlayReady is currently only compatible with h264.
  this.runner.checkEq(
      video.canPlayType('video/mp4', 'com.youtube.playready'), 'probably',
      'canPlayType result');
  this.runner.checkEq(
      video.canPlayType('audio/mp4', 'com.youtube.playready'), 'probably',
      'canPlayType result');
  this.runner.succeed();
};


var testWidevineSupport = createEmeTest('WidevineSupport', 'Key System Support');
testWidevineSupport.prototype.title =
    'Test if canPlay return is correct for Widevine.';
testWidevineSupport.prototype.onsourceopen = function() {
  var video = this.video;
  if (!StreamDef.isWebM()) {
    this.runner.checkEq(
        video.canPlayType('video/mp4; codecs="avc1.640028"', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(
        video.canPlayType('video/mp4', 'com.widevine.alpha'), 'maybe',
        'canPlayType result');
    this.runner.checkEq(
        video.canPlayType('audio/mp4; codecs="mp4a.40.2"', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(
         video.canPlayType('audio/mp4', 'com.widevine.alpha'), 'maybe',
        'canPlayType result');
    this.runner.succeed();
  } else {
    this.runner.checkEq(
        video.canPlayType('video/webm; codecs="vp9"', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(
        video.canPlayType('video/webm; codecs="vp9.0"', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(
        video.canPlayType('video/webm; codecs="vp9,vp9.0"', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(
        video.canPlayType('video/webm', 'com.widevine.alpha'), 'maybe',
        'canPlayType result');
    this.runner.checkEq(
         video.canPlayType('audio/mp4; codecs="mp4a.40.2"', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(
         video.canPlayType('audio/mp4', 'com.widevine.alpha'), 'maybe',
        'canPlayType result');
    this.runner.succeed();
  }
}


return {tests: tests, info: info, fields: fields, viewType: 'extra compact'};

};
