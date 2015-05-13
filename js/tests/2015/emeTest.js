/*
   Copyright 2014 Google Inc. All rights reserved.

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

function setupBaseEmeTest(video, xhrManager, bufferSize, cbSpies) {
  var ms = new MediaSource();
  var testEmeHandler = new EMEHandler();
  var src = null;
  if (cbSpies) {
    for (var spy in cbSpies) {
      testEmeHandler['_' + spy] = testEmeHandler[spy];
      testEmeHandler[spy] = cbSpies[spy];
    }
  }

  testEmeHandler.init(video);
  testEmeHandler.setFlavor({
    clearkey: 'http://dash-mse-test.appspot.com/api/drm/clearkey?' +
              'drm_system=clearkey&source=YOUTUBE&video_id=03681262dc412c06&' +
              'ip=0.0.0.0&ipbits=0&expire=19000000000&' +
              'sparams=ip,ipbits,expire,drm_system,source,video_id&' +
              'signature=065297462DF2ACB0EFC28506C5BA5E2E509864D3.' +
              '1FEC674BBB2420DE6B0C7FE3ECD8740C58A43420&key=test_key1'
  }, 'clearkey');

  function onError(e) {
    runner.fail('Error reported in TestClearKeyNeedKey');
  }

  function onSourceOpen(e) {
    src = ms.addSourceBuffer(StreamDef.VideoType);
    var xhr = xhrManager.createRequest(
      StreamDef.VideoStreamYTCenc.src,
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

  setupBaseEmeTest(video, runner.XHRManager, 1000000, null);
  video.addEventListener('timeupdate', function onTimeUpdate(e) {
    if (!video.paused && video.currentTime >= 1) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      runner.succeed();
    }
  });
  video.play();
};


var testCanPlayPlayReady = createEmeTest('CanPlayPlayReady');
testCanPlayPlayReady.prototype.title =
    'Test if canPlay return is correct for PlayReady.';
testCanPlayPlayReady.prototype.onsourceopen = function() {
  var video = this.video;
  this.runner.checkEq(
      video.canPlayType(StreamDef.VideoType, 'com.youtube.playready'),
      'probably', 'canPlayType result');
  this.runner.checkEq(
      video.canPlayType(StreamDef.AudioType, 'com.youtube.playready'),
      'probably', 'canPlayType result');
  this.runner.succeed();
};


var testWidevineSupport = createEmeTest('WidevineSupport');
testWidevineSupport.prototype.title =
    'Test if canPlay return is correct for Widevine.';
testWidevineSupport.prototype.onsourceopen = function() {
  var video = this.video;

  function createWidevineTest(video, mediaType) {
    return function(codecs, keySystem) {
      var codecString = mediaType;
      if (codecs != null) 
        codecString += '; codecs="' + codecs + '"';
      
      return video.canPlayType(codecString, keySystem);
    }
  }

  var DoAudioTest = createWidevineTest(video, 'audio/webm');
  var DoVideoTest = createWidevineTest(video, 'video/webm');

  if (DoVideoTest('vp9', 'com.widevine.alpha') === '') {
    this.runner.checkEq(
        video.canPlayType('video/mp4; codecs="avc1.640028"', 'com.widevine.alpha'), '',
        'canPlayType result');
    this.runner.checkEq(
        video.canPlayType('audio/mp4; codecs="mp4a.40.2"', 'com.widevine.alpha'), '',
        'canPlayType result');

    this.runner.succeed();
  } else {
    this.runner.checkEq(DoVideoTest('vp9', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('vp9.0', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('vorbis', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('vp9,vp9.0,vorbis', 'com.widevine.alpha'),
        'probably', 'canPlayType result');
    this.runner.checkEq(DoVideoTest(null, 'com.widevine.alpha'), 'maybe',
        'canPlayType result');

    this.runner.checkEq(DoAudioTest('vorbis', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(DoAudioTest(null, 'com.widevine.alpha'), 'maybe',
        'canPlayType result');

    this.runner.checkEq(DoVideoTest('codecs="vp9"', 'com.widevine.'), '',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('codecs="vp9"', 'com.widevine.foo'), '',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('codecs="vp9"', 'com.widevine.alpha.'), '',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('codecs="vp9"', 'com.widevine.alpha.foo'),
        '', 'canPlayType result');
    this.runner.checkEq(DoVideoTest('codecs="vp9"', 'com.widevine.alph'), '',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('codecs="vp9"', 'com.widevine.alphb'), '',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('codecs="vp9"', 'com.widevine.alphaa'), '',
        'canPlayType result');
    this.runner.checkEq(DoVideoTest('codecs="mp4a"', 'com.widevine.alpha'), '',
        'canPlayType result');

    this.runner.checkEq(DoAudioTest('codecs="vp9"', 'com.widevine'), '',
        'canPlayType result');
    this.runner.checkEq(
        DoAudioTest('codecs="vp9,vorbis"', 'com.widevine.alpha'), '',
            'canPlayType result');
    this.runner.checkEq(
        DoAudioTest('codecs="vp9,vorbis"', 'com.widevine.alpha'), '',
            'canPlayType result');

    // Try a semi-valid key.
    var keySystem = 'com.widevine.alpha';
    var initData = new Uint8Array([
        0x53, 0xa6, 0xcb, 0x3a, 0xd8, 0xfb, 0x58, 0x8f,
        0xbe, 0x92, 0xe6, 0xdc, 0x72, 0x65, 0x0c, 0x86]);
    var self = this;
    
    var keyerrorCb = function(e) {
      video.removeEventListener('keyerror', keyerrorCb);
      video.removeEventListener('webkitkeyerror', keyerrorCb);
      if (e instanceof MediaKeyEvent) {
        self.runner.checkNE(e.errorCode.code,
            MediaKeyError.MEDIA_KEYERR_CLIENT);
      } else if ((e instanceof MediaKeyErrorEvent) ||
                 (e instanceof MediaKeyError)) {
        self.runner.checkNE(e.code, MediaKeyError.MEDIA_KEYERR_CLIENT);
      }
      self.runner.succeed();
    };
    video.addEventListener('keyerror', keyerrorCb);
    video.addEventListener('webkitkeyerror', keyerrorCb);

    var keymessageCb = function(keymessage) {
      video.removeEventListener('keymessage', keymessageCb);
      video.removeEventListener('webkitkeymessage', keymessageCb);
      self.runner.succeed();
    };
    video.addEventListener('keymessage', keymessageCb);
    video.addEventListener('webkitkeymessage', keymessageCb);

    try {
      if (video.generateKeyRequest) {
        video.generateKeyRequest(keySystem, initData);
      } else {
        video.webkitGenerateKeyRequest(keySystem, initData);
      } 
    } catch (e) {
      this.runner.checkNE(e.name, 'NotSupportedError');
      this.runner.succeed();
    }
  }
};


var testClearKeyAudio = createEmeTest('ClearKeyAudio');
testClearKeyAudio.prototype.title =
    'Test if we can play audio encrypted with ClearKey encryption.';
testClearKeyAudio.prototype.onsourceopen = function() {
  var runner = this.runner;
  if (StreamDef.isWebM()) {
    runner.succeed();
    return;
  }

  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource(StreamDef.VideoNormal.src, runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource(StreamDef.AudioNormalClearKey.src, runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  media.addEventListener('needkey', function(e) {
    e.target.generateKeyRequest('org.w3.clearkey', e.initData);
  });

  media.addEventListener('keymessage', function(e) {
    var key = new Uint8Array([
        0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
        0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]);
    var keyId = new Uint8Array([
        0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
        0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e]);
    e.target.addKey('org.w3.clearkey', key, keyId, e.sessionId);
  });

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
  if (StreamDef.isWebM()) {
    runner.succeed();
    return;
  }

  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource(StreamDef.VideoNormalClearKey.src, runner.XHRManager,
          runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
          runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  media.addEventListener('needkey', function(e) {
    e.target.generateKeyRequest('org.w3.clearkey', e.initData);
  });

  media.addEventListener('keymessage', function(e) {
    var key = new Uint8Array([
        0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
        0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]);
    var keyId = new Uint8Array([
        0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
        0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e]);
    e.target.addKey('org.w3.clearkey', key, keyId, e.sessionId);
  });

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
  if (StreamDef.isWebM()) {
    runner.succeed();
    return;
  }

  var ms = new MediaSource();
  var testEmeHandler = new EMEHandler();

  var firstLicense = null;
  var licenseTestPass = false;
  testEmeHandler['_onLoad'] = testEmeHandler['onLoad'];
  testEmeHandler['onLoad'] = function(initData, session, e) {
    try {
      testEmeHandler._onLoad(initData, session, e);
    } catch (exp) {
      if (firstLicense)
        runner.fail('Adding second key failed. Perhaps the system does not ' +
                    'support more than one video key?');
      else
        runner.fail('Failed to add first key.');
    }

    var licenseString = arrayToString(
        new Uint8Array(e.target.response)).split('\r\n').pop();
    if (!firstLicense)
      firstLicense = licenseString;
    else if (firstLicense !== licenseString)
      licenseTestPass = true;
    else
      runner.fail('Somehow, the same key was used. ' +
                  'This is a failure of the test video selection.');
  };

  testEmeHandler.init(video);

  var kFlavorMap = {
    playready: 'http://dash-mse-test.appspot.com/api/drm/playready' +
               '?drm_system=playready&source=YOUTUBE&' +
               'video_id=03681262dc412c06&ip=0.0.0.0&ipbits=0&' +
               'expire=19000000000&' +
               'sparams=ip,ipbits,expire,drm_system,source,video_id&' +
               'signature=3BB038322E72D0B027F7233A733CD67D518AF675.' +
               '2B7C39053DA46498D23F3BCB87596EF8FD8B1669&key=test_key1',
    clearkey: 'http://dash-mse-test.appspot.com/api/drm/clearkey?' +
              'drm_system=clearkey&source=YOUTUBE&video_id=03681262dc412c06&' +
              'ip=0.0.0.0&ipbits=0&expire=19000000000&' +
              'sparams=ip,ipbits,expire,drm_system,source,video_id&' +
              'signature=065297462DF2ACB0EFC28506C5BA5E2E509864D3.' +
              '1FEC674BBB2420DE6B0C7FE3ECD8740C58A43420&key=test_key1'
  };

  var kFlavorFiles = {
    playready: [
      StreamDef.VideoStreamYTCenc.src,
      StreamDef.VideoTinyStreamYTCenc.src],
    clearkey: [
      StreamDef.VideoStreamYTCenc.src,
      StreamDef.VideoSmallStreamYTCenc.src]
  };

  var keySystem = 'clearkey';
  var keySystemQuery = /keysystem=([^&]*)/.exec(document.location.search);
  if (keySystemQuery && kFlavorMap[keySystemQuery[1]]) {
    keySystem = keySystemQuery[1];
  }
  try {
    testEmeHandler.setFlavor(kFlavorMap, keySystem);
  } catch (e) {
    runner.fail('Browser does not support the requested key system: ' +
                keySystem);
    return;
  }

  function onError(e) {
    runner.fail('Error reported in TestClearKeyNeedKey');
  }

  // Open two sources. When the second source finishes, it should also call
  // onLoad above. onLoad will then check if the two keys are dissimilar.
  function onSourceOpen(e) {
    var sb = ms.addSourceBuffer('video/mp4; codecs="avc1.640028"');

    var firstFile = new ResetInit(new FileSource(
      kFlavorFiles[keySystem][0],
      runner.XHRManager, runner.timeouts));

    appendUntil(runner.timeouts, video, sb, firstFile, 5, function() {
      sb.abort();

      var secondFile = new ResetInit(new FileSource(
        kFlavorFiles[keySystem][1],
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
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();
};


var testClearKeyNeedKey = createEmeTest('CKNeedKey', 'Optional EME',
                                                false);
testClearKeyNeedKey.prototype.title = 'Test ClearKey needkey callback';
testClearKeyNeedKey.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onNeedKey: function(e) {
      runner.succeed();
    }
  });
};


var testClearKeyGenerateKeyRequest = createEmeTest(
    'CKGenKeyRequest', 'Optional EME', false);
testClearKeyGenerateKeyRequest.prototype.title =
    'Test ClearKey generateKeyRequest input validation';
testClearKeyGenerateKeyRequest.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
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
};


var testClearKeyKeyMessage = createEmeTest('CKKeyMessage',
                                                   'Optional EME', false);
testClearKeyKeyMessage.prototype.title = 'Test ClearKey keymessage event';
testClearKeyKeyMessage.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onKeyMessage: function(evt) {
      runner.succeed();
    }
  });
};


var testClearKeyAddKey = createEmeTest('CKAddKey', 'Optional EME',
                                               false);
testClearKeyAddKey.prototype.title = 'Test ClearKey addKey function';
testClearKeyAddKey.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onLoad: function(initData, session, evt) {
      if (evt.target.status < 200 || evt.target.status > 299)
        throw 'Bad XHR status: ' + evt.target.statusText;

      // Parse "GLS/1.0 0 OK\r\nHeader: Value\r\n\r\n<xml>HERE BE SOAP</xml>
      var responseString = arrayToString(
          new Uint8Array(evt.target.response)).split('\r\n').pop();
      var license = stringToArray(responseString);

      var failed = false;
      try {
        video.addKey(null, license, initData, session);
        failed = true;
      } catch (e) {
        checkDOMError(runner, e);
      }
      if (failed)
        runner.fail('First argument is null. This should throw an exception.');

      try {
        video.addKey(this.keySystem, null, initData, session);
        failed = true;
      } catch (e) {
        checkDOMError(runner, e);
      }
      if (failed)
        runner.fail('Second argument is null. This should throw an exception.');

      try {
        video.addKey(null, null, initData, session);
        failed = true;
      } catch (e) {
        checkDOMError(runner, e);
      }
      if (failed)
        runner.fail('First and second arguments are null. ' +
                    'This should throw an exception.');

      try {
        video.addKey(this.keySystem, new Uint8Array(0), initData, session);
        failed = true;
      } catch (e) {
        checkDOMError(runner, e, DOMException.TYPE_MISMATCH_ERR,
            'TypeMismatchError');
      }
      if (failed)
        runner.fail('Second argument is unexpectedly empty.');

      try {
        video.addKey(this.keySystem, license, initData, 'badsessionid');
        // Have to use a flag since runner.fail will be caught otherwise.
        failed = true;
      } catch (e) {
        checkDOMError(runner, e, DOMException.INVALID_ACCESS_ERR,
            'InvalidAccessError');
      }
      if (failed)
        runner.fail('"badsessionid" is an invalid session ID, ' +
                    'and thus should fail.');

      try {
        video.addKey(this.keySystem, license, initData, session);
      } catch (e) {
        runner.fail('Should not error on valid key.');
      }
      runner.succeed();
    }
  });
};


var testClearKeyAddKeyAsyncEvents = createEmeTest(
    'CKAddKeyAsyncEvents', 'Optional EME', false);
testClearKeyAddKeyAsyncEvents.prototype.title =
    'Test ClearKey addKey response events';
testClearKeyAddKeyAsyncEvents.prototype.start = function(runner, video) {
  var messagesFired = {};

  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onLoad: function(initData, session, evt) {
      video.addEventListener('keyadded', function(e) {
        messagesFired['keyadded'] = true;
        setTimeout(function() {
          if (messagesFired['keymessage'])
            runner.fail('keymessage was also fired in addition to keyadded.');
          else
            runner.succeed();
        }, 2000);
      });
      video.addEventListener('keymessage', function(e) {
        if (messagesFired['keyadded']) {
          messagesFired['keymessage'] = true;
        }
      });

      this._onLoad(initData, session, evt);
    }
  });
};


return {tests: tests, info: info, fields: fields, viewType: 'extra compact'};

};
