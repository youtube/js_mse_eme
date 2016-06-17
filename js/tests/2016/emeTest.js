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

var emeVersion = '19 July 2012 (v0.1b)';
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
  var ms = new MediaSource();
  var testEmeHandler = new EMEHandler();
  var videoSb = null;
  var audioSb = null;
  if (cbSpies) {
    for (var spy in cbSpies) {
      testEmeHandler['_' + spy] = testEmeHandler[spy];
      testEmeHandler[spy] = cbSpies[spy];
    }
  }

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

  function fetchStream(stream, cb) {
    var xhr = runner.XHRManager.createRequest(stream.src, cb);
    xhr.send();
  }

  function onSourceOpen(e) {
    if (audioStream != null) {
      audioSb = ms.addSourceBuffer(audioStream.type);
      fetchStream(audioStream, function() {
        audioSb.appendBuffer(this.getResponseData());
      });
    }

    if (videoStream != null) {
      videoSb = ms.addSourceBuffer(videoStream.type);
      fetchStream(videoStream, function() {
        videoSb.appendBuffer(this.getResponseData());
      });
    }
  }

  ms.addEventListener('sourceopen', onSourceOpen);
  ms.addEventListener('webkitsourceopen', onSourceOpen);
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();

  return testEmeHandler;
}

function checkDOMError(runner, e, code, name) {
  if (code || name) {
    if (e instanceof DOMException)
      runner.checkEq(e.code, code, 'exception code');
    else
      runner.checkEq(e.name, name, 'exception name');
  } else {
    return e instanceof DOMException;
  }
}


var testCanPlayClearKey = createEmeTest('CanPlayClearKey', 'ClearKey');
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
    var videoStream = StreamDef.VideoStreamYTCenc;
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null,
                                          null);
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        videoStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
  video.addEventListener('timeupdate', function onTimeUpdate(e) {
    if (!video.paused && video.currentTime >= 3 &&
        testEmeHandler.keyAddedCount == 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.succeed();
    }
  });
  video.play();
};


var testClearKeyAudio = createEmeTest('ClearKeyAudio', 'ClearKey');
testClearKeyAudio.prototype.title =
    'Test if we can play audio encrypted with ClearKey encryption.';
testClearKeyAudio.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoNormal;
  var audioStream = StreamDef.AudioNormalClearKey;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream,
                                          audioStream, null);
    testEmeHandler.init(video, StreamDef.AudioType, audioStream.get('kid'),
                        audioStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
  video.addEventListener('timeupdate', function onTimeUpdate(e) {
    if (!video.paused && video.currentTime >= 3 &&
        testEmeHandler.keyAddedCount == 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.checkGE(video.currentTime, 3, 'currentTime');
      runner.succeed();
    }
  });
  video.play();
};


var testClearKeyVideo = createEmeTest('ClearKeyVideo', 'ClearKey');
testClearKeyVideo.prototype.title =
    'Test if we can play video encrypted with ClearKey encryption.';
testClearKeyVideo.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoNormalClearKey;
  var audioStream = StreamDef.AudioTiny;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream,
                                          audioStream, null);
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        videoStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
  video.addEventListener('timeupdate', function onTimeUpdate(e) {
    if (!video.paused && video.currentTime >= 3 &&
        testEmeHandler.keyAddedCount == 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.checkGE(video.currentTime, 3, 'currentTime');
      runner.succeed();
    }
  });
  video.play();
};


var testClearKeyDualKey = createEmeTest('ClearKeyDualKey', 'ClearKey');
testClearKeyDualKey.prototype.title = 'Tests multiple video keys';
testClearKeyDualKey.prototype.start = function(runner, video) {
  var ms = new MediaSource();
  var testEmeHandler = new EMEHandler();
  var videoStream1 = StreamDef.VideoStreamYTCenc;
  var videoStream2 = StreamDef.VideoSmallStreamYTCenc;
  testEmeHandler.init(video, StreamDef.VideoType,
                      [videoStream1.get('kid'), videoStream2.get('kid')],
                      [videoStream1.get('key'), videoStream2.get('key')],
                      'clearkey');

  // Open two sources with two distinct licenses.
  function onSourceOpen(e) {
    var sb = ms.addSourceBuffer(StreamDef.VideoType);

    var firstFile = new ResetInit(
      new FileSource(videoStream1.src, runner.XHRManager, runner.timeouts, 0,
                     videoStream1.size, videoStream1.size));

    appendUntil(runner.timeouts, video, sb, firstFile, 5, function() {
      sb.abort();

      var secondFile = new ResetInit(
        new FileSource(videoStream2.src, runner.XHRManager, runner.timeouts, 0,
                       videoStream2.size, videoStream2.size));

      sb.timestampOffset = video.buffered.end(0);
      appendAt(runner.timeouts, video, sb, secondFile, 5, 5, function() {
        video.play();
      });
    });

    video.addEventListener('timeupdate', function onTimeUpdate() {
      if (video.currentTime >= 10 - 1 && testEmeHandler.keyAddedCount == 2) {
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


var testPlayReadySupport = createEmeTest('PlayReadySupport',
                                         'Key System Support (1 must pass)');
testPlayReadySupport.prototype.title =
    'Test if canPlay return is correct for PlayReady.';
testPlayReadySupport.prototype.start = function(runner, video) {
  var video = this.video;
  // PlayReady is currently only compatible with h264.
  this.runner.checkEq(video.canPlayType('video/mp4;  codecs="avc1.640028"',
                                        'com.youtube.playready'),
                      'probably', 'canPlayType result');
  this.runner.checkEq(video.canPlayType('video/mp4', 'com.youtube.playready'),
                      'maybe', 'canPlayType result');
  this.runner.checkEq(video.canPlayType('audio/mp4; codecs="mp4a.40.2"',
                                        'com.youtube.playready'),
                      'probably', 'canPlayType result');
  this.runner.checkEq(video.canPlayType('audio/mp4', 'com.youtube.playready'),
                      'maybe', 'canPlayType result');
  this.runner.succeed();
};


var testWidevineSupport = createEmeTest('WidevineSupport',
                                        'Key System Support (1 must pass)');
testWidevineSupport.prototype.title =
    'Test if canPlay return is correct for Widevine.';
testWidevineSupport.prototype.start = function(runner, video) {
  var video = this.video;
  if (!StreamDef.isWebM()) {
    this.runner.checkEq(video.canPlayType('video/mp4; codecs="avc1.640028"',
                                          'com.widevine.alpha'),
                        'probably', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('video/mp4', 'com.widevine.alpha'),
                        'maybe', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('audio/mp4; codecs="mp4a.40.2"',
                                          'com.widevine.alpha'),
                        'probably', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('audio/mp4', 'com.widevine.alpha'),
                        'maybe', 'canPlayType result');
    this.runner.succeed();
  } else {
    this.runner.checkEq(video.canPlayType('video/webm; codecs="vp9"',
                                          'com.widevine.alpha'),
                        'probably', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('video/webm; codecs="vp9.0"',
                                          'com.widevine.alpha'),
                        'probably', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('video/webm; codecs="vp9,vp9.0"',
                                          'com.widevine.alpha'),
                        'probably', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('video/webm', 'com.widevine.alpha'),
                        'maybe', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('audio/mp4; codecs="mp4a.40.2"',
                                          'com.widevine.alpha'),
                        'probably', 'canPlayType result');
    this.runner.checkEq(video.canPlayType('audio/mp4', 'com.widevine.alpha'),
                        'maybe', 'canPlayType result');
    this.runner.succeed();
  }
}


var testInvalidKey = createEmeTest('InvalidKey', 'Optional EME', false);
testInvalidKey.prototype.title =
    'Test if an invalid key will produce the expected error.';
testInvalidKey.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  var invalidKey = new Uint8Array([
    0x53, 0xa6, 0xcb, 0x3a, 0xd8, 0xfb, 0x58, 0x8f,
    0xbe, 0x92, 0xe6, 0xdc, 0x72, 0x65, 0x0c, 0x86]);
  var self = this;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, null);
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        invalidKey, 'widevine', function(e) {
      self.runner.checkEq(e.errorCode.code, 1);
      self.runner.succeed();
    });
  } catch(err) {
    runner.fail(err);
  }
  video.play();
};


var testClearKeyNeedKey = createEmeTest('CKNeedKey', 'Optional EME', false);
testClearKeyNeedKey.prototype.title = 'Test ClearKey needkey callback';
testClearKeyNeedKey.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onNeedKey: function(e) {
        runner.succeed();
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        videoStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyGenerateKeyRequest = createEmeTest('CKGenKeyRequest',
                                                   'Optional EME', false);
testClearKeyGenerateKeyRequest.prototype.title =
    'Test ClearKey generateKeyRequest input validation';
testClearKeyGenerateKeyRequest.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onNeedKey: function(evt) {
        try {
          video.generateKeyRequest(null, evt.initData);
          runner.fail('Expecting an exception to be thrown.');
          return;
        } catch (e) {
          // Caught exception, continue.
        }

        try {
          video.generateKeyRequest('foobar.notarealkeysystem', evt.initData);
          runner.fail('Expecting an expeption to be thrown.');
        } catch (e) {
          runner.succeed();
          return;
        }
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        videoStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyKeyMessage = createEmeTest('CKKeyMessage', 'Optional EME',
                                           false);
testClearKeyKeyMessage.prototype.title = 'Test ClearKey keymessage event';
testClearKeyKeyMessage.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  try { 
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onKeyMessage: function(evt) {
        runner.succeed();
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        videoStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyAddKey = createEmeTest('CKAddKey', 'Optional EME', false);
testClearKeyAddKey.prototype.title = 'Test ClearKey addKey function';
testClearKeyAddKey.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onKeyMessage: function(evt) {
        var sessionId = evt.sessionId;
        var initData = this.initDataQueue.shift();
        var kid = videoStream.get('kid');
        var key = videoStream.get('key');
        if (kid == null) {
          kid = extractBMFFClearKeyID(initData);
        }
        var failed = false;
        try {
          video.addKey(null, key, kid, sessionId);
          failed = true;
        } catch (e) {
          checkDOMError(runner, e);
        }
        if (failed)
          runner.fail('First arg is null. This should throw an exception.');

        try {
          video.addKey(this.keySystem, null, kid, sessionId);
          failed = true;
        } catch (e) {
          checkDOMError(runner, e);
        }
        if (failed)
          runner.fail('Second arg is null. This should throw an exception.');

        try {
          video.addKey(null, null, kid, sessionId);
          failed = true;
        } catch (e) {
          checkDOMError(runner, e);
        }
        if (failed)
          runner.fail('First and second args are null. ' +
                      'This should throw an exception.');

        try {
          video.addKey(this.keySystem, new Uint8Array(0), kid, sessionId);
          failed = true;
        } catch (e) {
          checkDOMError(runner, e, DOMException.TYPE_MISMATCH_ERR,
              'TypeMismatchError');
        }
        if (failed)
          runner.fail('Second argument is unexpectedly empty.');

        try {
          video.addKey(this.keySystem, key, kid, sessionId);
        } catch (e) {
          runner.fail('Should not error on valid key.');
        }
        runner.succeed();
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        videoStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyAddKeyAsyncEvents = createEmeTest('CKAddKeyAsyncEvents',
                                                  'Optional EME', false);
testClearKeyAddKeyAsyncEvents.prototype.title =
    'Test ClearKey addKey response events';
testClearKeyAddKeyAsyncEvents.prototype.start = function(runner, video) {
  var messagesFired = {};
  var keyAddedEvent = prefixedAttributeName(video, 'keyadded');
  keyAddedEvent = keyAddedEvent.substring(2);
  var videoStream = StreamDef.VideoStreamYTCenc;
  try { 
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onKeyMessage: function(e) {
        video.addEventListener(keyAddedEvent, function(e) {
          video.addEventListener('keymessage', function(e) {
            if (messagesFired['keyadded']) {
              messagesFired['keymessage'] = true;
            }
          });

          messagesFired['keyadded'] = true;
          setTimeout(function() {
            if (messagesFired['keymessage'])
              runner.fail('keymessage was also fired in addition to keyadded.');
            else
              runner.succeed();
          }, 2000);
        });

        this._onKeyMessage(e);
      }
    });
    testEmeHandler.init(video, StreamDef.VideoType, videoStream.get('kid'),
                        videoStream.get('key'), 'clearkey');
  } catch(err) {
    runner.fail(err);
  }
};


var testWidevineH264Video = createEmeTest('WidevineH264Video',
                                          'Optional Widevine', false);
testWidevineH264Video.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineH264Video.prototype.start = function(runner, video) {
  var videoStream = StreamDef.H264.VideoSmallCencWidevine;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null,
                                          null);
    testEmeHandler.init(video, videoStream.type, null, null, 'widevine');
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


return {tests: tests, info: info, fields: fields, viewType: 'extra compact'};

};
