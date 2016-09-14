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

  function fetchStream(stream, cb, start, end) {
    var xhr = runner.XHRManager.createRequest(stream.src, cb, start, end);
    xhr.send();
  }

  function appendLoop(stream, sb) {
    var parsedData;
    var segmentIdx = 0;
    var maxSegments = 4
    fetchStream(stream, function() {
      if (stream.type.indexOf('mp4') != -1) {
        parsedData = parseMp4(this.getResponseData());
      } else if(stream.type.indexOf('webm') != -1) {
        parsedData = parseWebM(this.getResponseData().buffer);
      } else {
        runner.fail('Unsupported container format in appendLoop.');
      }
      if (parsedData.length <= 1) {
        fetchStream(stream, function() {
          sb.appendBuffer(this.getResponseData());
        });
        return;
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
      audioSb = ms.addSourceBuffer(audioStream.type);
      appendLoop(audioStream, audioSb);
    }

    if (videoStream != null) {
      videoSb = ms.addSourceBuffer(videoStream.type);
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


var testClearKeySupport = createEmeTest('ClearKeySupport', 'ClearKey');
testClearKeySupport.prototype.title =
    'Test if canPlay return is correct for clear key.';
testClearKeySupport.prototype.start = function(runner, video) {
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
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null);
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
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
                                          audioStream);
    var licenseManager = new LicenseManager(video, audioStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
  video.addEventListener('timeupdate', function onTimeUpdate(e) {
    if (!video.paused && video.currentTime >= 15 &&
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
                                          audioStream);
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
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
  var licenseManager = new LicenseManager(video, [videoStream1, videoStream2],
                                          LicenseManager.CLEARKEY);
  testEmeHandler.init(video, licenseManager);

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


var testClearKeyNeedKey = createEmeTest('ClearKeyNeedKey', 'Optional ClearKey',
                                        false);
testClearKeyNeedKey.prototype.title = 'Test ClearKey needkey callback';
testClearKeyNeedKey.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onNeedKey: function(e) {
        runner.succeed();
      }
    });
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyGenerateKeyRequest = createEmeTest('ClearKeyGenKeyRequest',
                                                   'Optional ClearKey', false);
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
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyKeyMessage = createEmeTest('ClearKeyKeyMessage',
                                           'Optional ClearKey', false);
testClearKeyKeyMessage.prototype.title = 'Test ClearKey keymessage event';
testClearKeyKeyMessage.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  try { 
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onKeyMessage: function(evt) {
        runner.succeed();
      }
    });
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyAddKey = createEmeTest('ClearKeyAddKey', 'Optional ClearKey',
                                       false);
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
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
};


var testClearKeyAddKeyAsyncEvents = createEmeTest('ClearKeyAddKeyAsyncEvents',
                                                  'Optional ClearKey', false);
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
    var licenseManager = new LicenseManager(video, videoStream,
                                            LicenseManager.CLEARKEY);
    testEmeHandler.init(video, licenseManager);
  } catch(err) {
    runner.fail(err);
  }
};


var testWidevineInvalidKey = createEmeTest('WidevineInvalidKey',
                                           'Optional Widevine', false);
testWidevineInvalidKey.prototype.title =
    'Test if an invalid key will produce the expected error.';
testWidevineInvalidKey.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VideoStreamYTCenc;
  var invalidKey = new Uint8Array([
    0x53, 0xa6, 0xcb, 0x3a, 0xd8, 0xfb, 0x58, 0x8f,
    0xbe, 0x92, 0xe6, 0xdc, 0x72, 0x65, 0x0c, 0x86]);
  var licenseManager = new LicenseManager(video, videoStream,
                                          LicenseManager.WIDEVINE);
  licenseManager.keys[0] = invalidKey;
  var self = this;
  try {
    var testEmeHandler = setupBaseEmeTest(video, runner, videoStream, null, {
      onKeyMessage: function(evt) {
        video.addKey(licenseManager.keySystem, licenseManager.keys[0],
                     licenseManager.kids[0], evt.sessionId);
      }
    });
    testEmeHandler.init(video, licenseManager, function(e) {
      self.runner.checkEq(e.errorCode.code, 1);
      self.runner.succeed();
    });
  } catch(err) {
    runner.fail(err);
  }
  video.play();
};


var testWidevineH264Video = createEmeTest('WidevineH264Video',
                                          'Optional Widevine', false);
testWidevineH264Video.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineH264Video.prototype.start = function(runner, video) {
  var videoStream = StreamDef.H264.VideoSmallCenc;
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


var testWidevineAacAudio = createEmeTest('WidevineAacAudio',
                                          'Optional Widevine', false);
testWidevineAacAudio.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineAacAudio.prototype.start = function(runner, video) {
  var audioStream = StreamDef.AudioSmallCenc;
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


var testWidevineVP9Video = createEmeTest('WidevineVP9Video',
                                          'Optional Widevine', false);
testWidevineVP9Video.prototype.title =
    'Test if we can play video encrypted with Widevine encryption.';
testWidevineVP9Video.prototype.start = function(runner, video) {
  var videoStream = StreamDef.VP9.VideoHighEnc;
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


var testPlayReadyH264Video = createEmeTest('PlayReadyH264Video',
                                          'Optional PlayReady', false);
testPlayReadyH264Video.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyH264Video.prototype.start = function(runner, video) {
  var videoStream = StreamDef.H264.VideoSmallCenc;
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


var testPlayReadyAacAudio = createEmeTest('PlayReadyAacAudio',
                                          'Optional PlayReady', false);
testPlayReadyAacAudio.prototype.title =
    'Test if we can play video encrypted with PlayReady encryption.';
testPlayReadyAacAudio.prototype.start = function(runner, video) {
  var audioStream = StreamDef.AudioSmallCenc;
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


return {tests: tests, info: info, fields: fields, viewType: 'extra compact'};

};
