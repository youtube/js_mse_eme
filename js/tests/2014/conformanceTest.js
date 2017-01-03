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

var ConformanceTest = function() {

var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource)
  info = 'MSE Version: ' + MediaSource.prototype.version;
info += ' / Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

var createConformanceTest = function(name, category, mandatory) {
  var t = createMSTest(name);
  t.prototype.index = tests.length;
  t.prototype.passes = 0;
  t.prototype.failures = 0;
  t.prototype.timeouts = 0;
  t.prototype.category = category || 'General';
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
    src = ms.addSourceBuffer('video/mp4; codecs="avc1.640028"');
    var xhr = xhrManager.createRequest(
      'media/oops_cenc-20121114-145-no-clear-start.mp4',
      function(e) {
        src.append(this.getResponseData());
      }, 0, bufferSize);
    xhr.send();
  }

  ms.addEventListener('sourceopen', onSourceOpen);
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();
}


function revokeVideoSrc(test) {
  if (test.video.src) {
    window.URL.revokeObjectURL(test.video.src);
    test.video.src = null;
  }
}


var testPresence = createConformanceTest('Presence', 'MSE');
testPresence.prototype.title = 'Test if MediaSource object is present.';
testPresence.prototype.start = function(runner, video) {
  if (!window.MediaSource)
    return runner.fail('No MediaSource object available.');
  var ms = new MediaSource();
  if (!ms)
    return runner.fail('Found MediaSource but could not create one');
  if (ms.version)
    this.log('Media source version reported as ' + ms.version);
  else
    this.log('No media source version reported');

  runner.succeed();
};
testPresence.prototype.teardown = function() {};


var testAttach = createConformanceTest('Attach', 'MSE');
testAttach.prototype.timeout = 2000;
testAttach.prototype.title =
    'Test if MediaSource object can be attached to video.';
testAttach.prototype.start = function(runner, video) {
  this.ms = new MediaSource();
  this.ms.addEventListener('sourceopen', function() {
    runner.succeed();
  });
  if (this.ms.isWrapper)
    this.ms.attachTo(video);
  else
    video.src = window.URL.createObjectURL(this.ms);
  video.load();
};
testAttach.prototype.teardown = function() {
  revokeVideoSrc(this);
};


var testAddSourceBuffer = createConformanceTest('addSourceBuffer', 'MSE');
testAddSourceBuffer.prototype.title =
    'Test if we can add source buffer';
testAddSourceBuffer.prototype.onsourceopen = function() {
  this.runner.checkEq(this.ms.sourceBuffers.length, 0, 'Source buffer number');
  this.ms.addSourceBuffer(StreamDef.AudioType);
  this.runner.checkEq(this.ms.sourceBuffers.length, 1, 'Source buffer number');
  this.ms.addSourceBuffer(StreamDef.VideoType);
  this.runner.checkEq(this.ms.sourceBuffers.length, 2, 'Source buffer number');
  this.runner.succeed();
};


var testSupportedFormats = createConformanceTest('SupportedFormats', 'MSE');
testSupportedFormats.prototype.title =
    'Test if we support mp4 video (video/mp4; codecs="avc1.640008") and ' +
    'audio (audio/mp4; codecs="mp4a.40.5") formats, or webm video' +
    '(video/webm; codecs="vorbis,vp8")/(video/webm; codecs="vorbis,vp9") and' +
    'audio (audio/webm; codecs="vorbis").';
testSupportedFormats.prototype.onsourceopen = function() {
  try {
    this.log('Trying format ' + StreamDef.AudioType);
    var src = this.ms.addSourceBuffer(StreamDef.AudioType);
    this.log('Trying format ' + StreamDef.VideoType);
    var src = this.ms.addSourceBuffer(StreamDef.VideoType);
  } catch (e) {
    return this.runner.fail(e);
  }
  this.runner.succeed();
};


var testAddSourceBufferException = createConformanceTest('AddSBException',
                                                         'MSE');
testAddSourceBufferException.prototype.title =
    'Test if add incorrect source buffer type will ' +
    'fire the correct exceptions.';
testAddSourceBufferException.prototype.onsourceopen = function() {
  var runner = this.runner;
  var self = this;
  runner.checkException(function() {
    self.ms.addSourceBuffer('^^^');
  }, DOMException.NOT_SUPPORTED_ERR);
  if (this.ms.isWrapper) {
    runner.checkException(function() {
      var video = document.createElement('video');
      video.webkitSourceAddId('id', StreamDef.AudioType);
    }, DOMException.INVALID_STATE_ERR);
  } else {
    runner.checkException(function() {
      var ms = new MediaSource;
      ms.addSourceBuffer(StreamDef.AudioType);
    }, DOMException.INVALID_STATE_ERR);
  }
  runner.succeed();
};


var createInitialMediaStateTest = function(state, value, check) {
  var test = createConformanceTest('InitialMedia' + util.MakeCapitalName(state),
                                   'MSE');

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when onsourceopen is called';
  test.prototype.onsourceopen = function() {
    this.runner[check](this.video[state], value, state);
    this.runner.succeed();
  };
};

createInitialMediaStateTest('duration', NaN);
createInitialMediaStateTest('videoWidth', 0);
createInitialMediaStateTest('videoHeight', 0);
createInitialMediaStateTest('readyState', HTMLMediaElement.HAVE_NOTHING);
createInitialMediaStateTest('src', '', 'checkNE');
createInitialMediaStateTest('currentSrc', '', 'checkNE');


var createInitialMSStateTest = function(state, value, check) {
  var test = createConformanceTest('InitialMS' + util.MakeCapitalName(state),
                                   'MSE');

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when onsourceopen is called';
  test.prototype.onsourceopen = function() {
    this.runner[check](this.ms[state], value, state);
    this.runner.succeed();
  };
};

createInitialMSStateTest('duration', NaN);
createInitialMSStateTest('readyState', 'open');


var createAppendTest = function(stream) {
  var test = createConformanceTest('Append' + util.MakeCapitalName(stream.name),
                                   'MSE');
  test.prototype.title = 'Test if we can append a whole ' + stream.name +
      ' file whose size is 1MB.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
        function(e) {
      sb.append(xhr.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), stream.duration, 'Range end');
      runner.succeed();
    });
    xhr.send();
  };
};

createAppendTest(StreamDef.Audio1MB);
createAppendTest(StreamDef.Video1MB);


var createAbortTest = function(stream) {
  var test = createConformanceTest('Abort' + util.MakeCapitalName(stream.name),
                                   'MSE');
  test.prototype.title = 'Test if we can abort the current segment.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
        function(e) {
      sb.append(xhr.getResponseData());
      sb.abort();
      sb.append(xhr.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkGr(sb.buffered.end(0), 0, 'Range end');
      runner.succeed();
    }, 0, 200000);
    xhr.send();
  };
};

createAbortTest(StreamDef.Audio1MB);
createAbortTest(StreamDef.Video1MB);


var createTimestampOffsetTest = function(stream) {
  var test = createConformanceTest('TimestampOffset' +
                                   util.MakeCapitalName(stream.name), 'MSE');
  test.prototype.title = 'Test if we can set timestamp offset.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
        function(e) {
      sb.timestampOffset = 5;
      sb.append(xhr.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 5, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), stream.duration + 5,
                           'Range end');
      runner.succeed();
    });
    xhr.send();
  };
};

createTimestampOffsetTest(StreamDef.Audio1MB);
createTimestampOffsetTest(StreamDef.Video1MB);


var testDuration = createConformanceTest('Duration', 'MSE');
testDuration.prototype.title =
    'Test if we can set duration.';
testDuration.prototype.onsourceopen = function() {
  this.ms.duration = 10;
  this.runner.checkEq(this.ms.duration, 10, 'ms.duration');
  this.runner.succeed();
};


var testSourceRemove = createConformanceTest('SourceRemove', 'MSE');
testSourceRemove.prototype.title =
    'Test if we can add/remove source buffer and do it for more than once';
testSourceRemove.prototype.onsourceopen = function() {
  var sb = this.ms.addSourceBuffer(StreamDef.AudioType);
  this.ms.removeSourceBuffer(sb);
  this.runner.checkEq(this.ms.sourceBuffers.length, 0, 'Source buffer number');
  this.ms.addSourceBuffer(StreamDef.AudioType);
  this.runner.checkEq(this.ms.sourceBuffers.length, 1, 'Source buffer number');
  for (var i = 0; i < 10; ++i) {
    try {
      sb = this.ms.addSourceBuffer(StreamDef.VideoType);
      this.runner.checkEq(this.ms.sourceBuffers.length, 2,
                          'Source buffer number');
      this.ms.removeSourceBuffer(sb);
      this.runner.checkEq(this.ms.sourceBuffers.length, 1,
                          'Source buffer number');
    } catch (e) {
      return this.runner.fail(e);
    }
  }
  this.runner.succeed();
};


var createDurationAfterAppendTest = function(type, stream) {
  var test = createConformanceTest('DurationAfterAppend' +
                                   util.MakeCapitalName(type), 'MSE');
  test.prototype.title = 'Test if the duration expands after appending data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.type);
    var self = this;
    var ondurationchange = function() {
      self.log('ondurationchange called');
      media.removeEventListener('durationchange', ondurationchange);
      runner.checkApproxEq(ms.duration, sb.buffered.end(0), 'ms.duration');
      runner.succeed();
    };
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        var data = xhr.getResponseData();
        sb.append(data);
        sb.abort();
        ms.duration = sb.buffered.end(0) / 2;
        media.addEventListener('durationchange', ondurationchange);
        sb.append(data);
      });
    xhr.send();
  };
};

createDurationAfterAppendTest('audio', StreamDef.Audio1MB);
createDurationAfterAppendTest('video', StreamDef.Video1MB);


var createPausedTest = function(type, stream) {
  var test = createConformanceTest('PausedStateWith' +
                                   util.MakeCapitalName(type), 'MSE');
  test.prototype.title = 'Test if the paused state is correct before or ' +
      ' after appending data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.type);

    runner.checkEq(media.paused, true, 'media.paused');

    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        runner.checkEq(media.paused, true, 'media.paused');
        sb.append(xhr.getResponseData());
        runner.checkEq(media.paused, true, 'media.paused');
        runner.succeed();
      });
    xhr.send();
  };
};

createPausedTest('audio', StreamDef.Audio1MB);
createPausedTest('video', StreamDef.Video1MB);


var createMediaElementEventsTest = function() {
  var test = createConformanceTest('MediaElementEvents', 'MSE');
  test.prototype.title = 'Test if the events on MediaSource are correct.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var audioBuffer = this.ms.addSourceBuffer(StreamDef.AudioType);
    var videoBuffer = this.ms.addSourceBuffer(StreamDef.VideoType);
    var lastState = 'open';
    var self = this;
    var videoXhr = runner.XHRManager.createRequest(StreamDef.Video1MB.src,
      function(e) {
        self.log('onload called');
        videoBuffer.append(videoXhr.getResponseData());
        videoBuffer.abort();
        ms.duration = 1;
        ms.endOfStream();
        media.play();
      });
    var audioXhr = runner.XHRManager.createRequest(StreamDef.Audio1MB.src,
      function(e) {
        self.log('onload called');
        audioBuffer.append(audioXhr.getResponseData());
        audioBuffer.abort();
        videoXhr.send();
      });

    media.addEventListener('ended', function() {
      self.log('onended called');
      runner.succeed();
    });

    audioXhr.send();
  };
};

createMediaElementEventsTest();


var createMediaSourceEventsTest = function() {
  var test = createConformanceTest('MediaSourceEvents', 'MSE');
  test.prototype.title = 'Test if the events on MediaSource are correct.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var audioBuffer = this.ms.addSourceBuffer(StreamDef.AudioType);
    var videoBuffer = this.ms.addSourceBuffer(StreamDef.VideoType);
    var lastState = 'open';
    var self = this;
    var videoXhr = runner.XHRManager.createRequest(StreamDef.Video1MB.src,
      function(e) {
        self.log('onload called');
        videoBuffer.append(videoXhr.getResponseData());
        videoBuffer.abort();
        ms.endOfStream();
      });
    var audioXhr = runner.XHRManager.createRequest(StreamDef.Audio1MB.src,
      function(e) {
        self.log('onload called');
        audioBuffer.append(audioXhr.getResponseData());
        audioBuffer.abort();
        videoXhr.send();
      });

    ms.addEventListener('sourceclose', function() {
      self.log('onsourceclose called');
      runner.checkEq(lastState, 'ended', 'The previous state');
      runner.succeed();
    });

    ms.addEventListener('sourceended', function() {
      self.log('onsourceended called');
      runner.checkEq(lastState, 'open', 'The previous state');
      lastState = 'ended';
      media.removeAttribute('src');
      media.load();
    });

    audioXhr.send();
  };
};

createMediaSourceEventsTest();


var testBufferSize = createConformanceTest('VideoBufferSize', 'MSE');
testBufferSize.prototype.title = 'Determines video buffer sizes by ' +
    'appending incrementally until discard occurs, and tests that it meets ' +
    'the minimum requirements for streaming.';
testBufferSize.prototype.onsourceopen = function() {
  var runner = this.runner;
  var sb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;
  var xhr = runner.XHRManager.createRequest('media/test-video-1MB.mp4',
      function(e) {
    // The test clip has a bitrate which is nearly exactly 1MB/sec, and
    // lasts 1s. We start appending it repeatedly until we get eviction.
    var expectedTime = 0;
    while (true) {
      sb.append(xhr.getResponseData());
      if (sb.buffered.start(0) > 0) break;
      if (expectedTime > sb.buffered.end(0) + 0.1) break;
      expectedTime++;
      sb.timestampOffset = expectedTime;
    }
    var MIN_SIZE = 12;
    runner.checkGE(expectedTime - sb.buffered.start(0), MIN_SIZE,
                   'Estimated source buffer size');
    runner.succeed();
  });
  xhr.send();
};


var testSourceChain = createConformanceTest('SourceChain', 'MSE');
testSourceChain.prototype.title =
    'Test if Source Chain works properly. Source Chain is a stack of ' +
    'classes that help with common tasks like appending init segment or ' +
    'append data in random size.';
testSourceChain.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new RandomAppendSize(new ResetInit(
      new FileSource('media/car-20120827-85.mp4', runner.XHRManager,
                     runner.timeouts)));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new FixedAppendSize(new ResetInit(
      new FileSource('media/car-20120827-8b.mp4', runner.XHRManager,
                     runner.timeouts)));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  appendUntil(runner.timeouts, media, videoSb, videoChain, 5, function() {
    appendUntil(runner.timeouts, media, audioSb, audioChain, 5, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 1, 2,
          videoSb, videoChain, audioSb, audioChain, function() {
        runner.checkGE(media.currentTime, 2, 'currentTime');
        runner.succeed();
      });
    });
  });
};


var testVideoDimension = createConformanceTest('VideoDimension', 'MSE');
testVideoDimension.prototype.title =
    'Test if the readyState transition is correct.';
testVideoDimension.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(new FixedAppendSize(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts), 65536));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;

  runner.checkEq(media.videoWidth, 0, 'video width');
  runner.checkEq(media.videoHeight, 0, 'video height');

  media.addEventListener('loadedmetadata', function(e) {
    self.log('loadedmetadata called');
    runner.checkEq(media.videoWidth, 640, 'video width');
    runner.checkEq(media.videoHeight, 360, 'video height');
    runner.succeed();
  });

  runner.checkEq(media.readyState, media.HAVE_NOTHING, 'readyState');
  appendInit(media, videoSb, videoChain, 0, function() {});
};


var testPlaybackState = createConformanceTest('PlaybackState', 'MSE');
testPlaybackState.prototype.title =
    'Test if the playback state transition is correct.';
testPlaybackState.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(new FixedAppendSize(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts), 65536));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(new FixedAppendSize(
      new FileSource('media/car-20120827-8b.mp4', runner.XHRManager,
                     runner.timeouts), 65536));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var self = this;

  media.play();
  runner.checkEq(media.currentTime, 0, 'media.currentTime');
  media.pause();
  runner.checkEq(media.currentTime, 0, 'media.currentTime');

  appendInit(media, audioSb, audioChain, 0, function() {});
  appendInit(media, videoSb, videoChain, 0, function() {});
  callAfterLoadedMetaData(media, function() {
    media.play();
    runner.checkEq(media.currentTime, 0, 'media.currentTime');
    media.pause();
    runner.checkEq(media.currentTime, 0, 'media.currentTime');
    media.play();
    appendUntil(runner.timeouts, media, audioSb, audioChain, 5, function() {
      appendUntil(runner.timeouts, media, videoSb, videoChain, 5, function() {
        playThrough(runner.timeouts, media, 1, 2, audioSb, audioChain,
                    videoSb, videoChain, function() {
          var time = media.currentTime;
          media.pause();
          runner.checkApproxEq(media.currentTime, time,
                               'media.currentTime');
          runner.succeed();
        });
      });
    });
  });
};


var testStartPlayWithoutData = createConformanceTest('StartPlayWithoutData',
                                                     'MSE');
testStartPlayWithoutData.prototype.title =
    'Test if we can start play before feeding any data. The play should ' +
    'start automatically after data is appended';
testStartPlayWithoutData.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource('media/car-20120827-89.mp4', runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource('media/car-20120827-8d.mp4', runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  media.play();
  appendUntil(runner.timeouts, media, videoSb, videoChain, 1, function() {
    appendUntil(runner.timeouts, media, audioSb, audioChain, 1, function() {
      playThrough(
          runner.timeouts, media, 1, 2,
          videoSb, videoChain, audioSb, audioChain, function() {
        runner.checkGE(media.currentTime, 2, 'currentTime');
        runner.succeed();
      });
    });
  });
};


var testPlayPartialSegment = createConformanceTest('PlayPartialSegment', 'MSE');
testPlayPartialSegment.prototype.title =
    'Test if we can play a partially appended video segment.';
testPlayPartialSegment.prototype.onsourceopen = function() {
  var runner = this.runner;
  var video = this.video;
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var videoXhr = runner.XHRManager.createRequest('media/car-20120827-85.mp4',
    function(e) {
      videoSb.append(this.getResponseData());
      video.addEventListener('timeupdate', function(e) {
        if (!video.paused && video.currentTime >= 2) {
          runner.succeed();
        }
      });
      video.play();
    }, 0, 1500000);
  var audioXhr = runner.XHRManager.createRequest('media/car-20120827-8b.mp4',
    function(e) {
      audioSb.append(this.getResponseData());
      videoXhr.send();
    }, 0, 500000);
  audioXhr.send();
};


var testIncrementalAudio = createConformanceTest('IncrementalAudio', 'MSE');
testIncrementalAudio.prototype.title =
    'Test if we can append audio not in the unit of segment.';
testIncrementalAudio.prototype.onsourceopen = function() {
  var runner = this.runner;
  var sb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
    function(e) {
      sb.append(xhr.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), 12.42, 'Range end');
      runner.succeed();
    }, 0, 200000);
  xhr.send();
};


var testAppendAudioOffset = createConformanceTest('AppendAudioOffset', 'MSE');
testAppendAudioOffset.prototype.title =
    'Test if we can append audio data with an explicit offset.';
testAppendAudioOffset.prototype.onsourceopen = function() {
  var runner = this.runner;
  var video = this.video;
  var sb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
    function(e) {
      sb.timestampOffset = 5;
      sb.append(this.getResponseData());
      xhr2.send();
    }, 0, 200000);
  var xhr2 = runner.XHRManager.createRequest('media/car-20120827-8d.mp4',
    function(e) {
      sb.abort();
      sb.timestampOffset = 0;
      sb.append(this.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), 17.42, 'Range end');
      runner.succeed();
    }, 0, 200000);
  xhr.send();
};


var testVideoChangeRate = createConformanceTest('VideoChangeRate', 'MSE');
testVideoChangeRate.prototype.title =
    'Test if we can change the format of video on the fly.';
testVideoChangeRate.prototype.onsourceopen = function() {
  var self = this;
  var runner = this.runner;
  var video = this.video;
  var sb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
    function(e) {
      sb.timestampOffset = 5;
      sb.append(this.getResponseData());
      xhr2.send();
    }, 0, 200000);
  var xhr2 = runner.XHRManager.createRequest('media/car-20120827-85.mp4',
    function(e) {
      sb.abort();
      sb.timestampOffset = 0;
      sb.append(this.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), 11.47, 'Range end');
      callAfterLoadedMetaData(video, function() {
        video.currentTime = 3;
        video.addEventListener('seeked', function(e) {
          self.log('seeked called');
          video.addEventListener('timeupdate', function(e) {
            self.log('timeupdate called with ' + video.currentTime);
            if (!video.paused && video.currentTime >= 2) {
              runner.succeed();
            }
          });
        });
      });
      video.play();
    }, 0, 400000);
  this.ms.duration = 100000000;  // Ensure that we can seek to any position.
  xhr.send();
};


var createAppendMultipleInitTest = function(type, stream) {
  var test = createConformanceTest('AppendMultipleInit' +
                                   util.MakeCapitalName(type), 'MSE');
  test.prototype.title = 'Test if we can append multiple init segments.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FileSource(stream.src, runner.XHRManager, runner.timeouts);
    var src = this.ms.addSourceBuffer(stream.type);
    var init;

    chain.init(0, function(buf) {
      init = buf;
      chain.pull(function(buf) {
        for (var i = 0; i < 10; ++i)
          src.append(init);
        src.append(buf);
        src.abort();
        var end = src.buffered.end(0);
        for (var i = 0; i < 10; ++i)
          src.append(init);
        runner.checkEq(src.buffered.end(0), end, 'Range end');
        runner.succeed();
      });
    });
  };
};

createAppendMultipleInitTest('audio', StreamDef.Audio1MB);
createAppendMultipleInitTest('video', StreamDef.Video1MB);


var testAppendOutOfOrder = createConformanceTest('AppendOutOfOrder', 'MSE');
testAppendOutOfOrder.prototype.title =
    'Test if we can append segments out of order. This is valid according' +
    ' to MSE v0.6 section 2.3.';
testAppendOutOfOrder.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioChain = new FileSource('media/car-20120827-8c.mp4',
                                   runner.XHRManager,
                                   runner.timeouts);
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var bufs = [];

  audioChain.init(0, function(buf) {
    bufs.push(buf);
    audioChain.pull(function(buf) {
      bufs.push(buf);
      audioChain.pull(function(buf) {
        bufs.push(buf);
        audioChain.pull(function(buf) {
          bufs.push(buf);
          audioChain.pull(function(buf) {
            bufs.push(buf);
            audioSb.append(bufs[0]);
            runner.checkEq(audioSb.buffered.length, 0, 'Source buffer number');
            audioSb.append(bufs[2]);
            runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
            runner.checkGr(audioSb.buffered.start(0), 0, 'Range start');
            audioSb.append(bufs[1]);
            runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
            runner.checkEq(audioSb.buffered.start(0), 0, 'Range start');
            audioSb.append(bufs[4]);
            runner.checkEq(audioSb.buffered.length, 2, 'Source buffer number');
            runner.checkEq(audioSb.buffered.start(0), 0, 'Range start');
            audioSb.append(bufs[3]);
            runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
            runner.checkEq(audioSb.buffered.start(0), 0, 'Range start');
            runner.succeed();
          });
        });
      });
    });
  });
};


var testBufferedRange = createConformanceTest('BufferedRange', 'MSE');
testBufferedRange.prototype.title =
    'Test if SourceBuffer.buffered get updated correctly after feeding data.';
testBufferedRange.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  runner.checkEq(videoSb.buffered.length, 0, 'Source buffer number');
  runner.checkEq(audioSb.buffered.length, 0, 'Source buffer number');
  appendInit(media, videoSb, videoChain, 0, function() {
    appendInit(media, audioSb, audioChain, 0, function() {
      runner.checkEq(videoSb.buffered.length, 0, 'Source buffer number');
      runner.checkEq(audioSb.buffered.length, 0, 'Source buffer number');
      appendUntil(runner.timeouts, media, videoSb, videoChain, 5, function() {
        runner.checkEq(videoSb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(videoSb.buffered.start(0), 0, 'Source buffer number');
        runner.checkGE(videoSb.buffered.end(0), 5, 'Range end');
        appendUntil(runner.timeouts, media, audioSb, audioChain, 5, function() {
          runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
          runner.checkEq(audioSb.buffered.start(0), 0, 'Source buffer number');
          runner.checkGE(audioSb.buffered.end(0), 5, 'Range end');
          runner.succeed();
        });
      });
    });
  });
};


var testMediaSourceDuration = createConformanceTest('MediaSourceDuration',
                                                    'MSE');
testMediaSourceDuration.prototype.title =
    'Test if the duration on MediaSource can be set and got sucessfully.';
testMediaSourceDuration.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var ms = this.ms;
  var videoChain = new ResetInit(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;
  var onsourceclose = function() {
    self.log('onsourceclose called');
    runner.assert(isNaN(ms.duration));
    runner.succeed();
  };

  runner.assert(isNaN(media.duration), 'Initial media duration not NaN');
  media.play();
  appendInit(media, videoSb, videoChain, 0, function() {
    appendUntil(runner.timeouts, media, videoSb, videoChain, 10, function() {
      runner.checkEq(ms.duration, Infinity, 'ms.duration');
      ms.duration = 5;
      runner.checkEq(ms.duration, 5, 'ms.duration');
      runner.checkEq(media.duration, 5, 'media.duration');
      runner.checkLE(videoSb.buffered.end(0), 5.1, 'Range end');
      videoSb.abort();
      videoChain.seek(0);
      appendInit(media, videoSb, videoChain, 0, function() {
        appendUntil(runner.timeouts, media,
            videoSb, videoChain, 10, function() {
          runner.checkApproxEq(ms.duration, 10, 'ms.duration');
          ms.duration = 5;
          var duration = videoSb.buffered.end(0);
          ms.endOfStream();
          runner.checkEq(ms.duration, duration, 'ms.duration');
          media.play();
          ms.addEventListener('sourceended', function() {
            runner.checkEq(ms.duration, duration, 'ms.duration');
            runner.checkEq(media.duration, duration, 'media.duration');
            ms.addEventListener('sourceclose', onsourceclose);
            media.removeAttribute('src');
            media.load();
          });
        });
      });
    });
  });
};


var testAudioWithOverlap = createConformanceTest('AudioWithOverlap', 'MSE');
testAudioWithOverlap.prototype.title =
    'Test if audio data with overlap will be merged into one range.';
testAudioWithOverlap.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioChain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.1;

  appendInit(media, audioSb, audioChain, 0, function() {
    audioChain.pull(function(buf) {
      runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
      runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
      var segmentDuration = audioSb.buffered.end(0);
      audioSb.timestampOffset = segmentDuration - GAP;
      audioChain.seek(0);
      audioChain.pull(function(buf) {
        runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
        audioChain.pull(function(buf) {
          runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
          runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
          runner.checkApproxEq(audioSb.buffered.end(0),
                               segmentDuration * 2 - GAP, 'Range end');
          runner.succeed();
        });
      });
    });
  });
};


var testAudioWithSmallGap = createConformanceTest('AudioWithSmallGap', 'MSE');
testAudioWithSmallGap.prototype.title =
    'Test if audio data with a gap smaller than an audio frame size ' +
    'will be merged into one buffered range.';
testAudioWithSmallGap.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioChain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.01;  // The audio frame size of this file is 0.0232

  appendInit(media, audioSb, audioChain, 0, function() {
    audioChain.pull(function(buf) {
      runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
      runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
      var segmentDuration = audioSb.buffered.end(0);
      audioSb.timestampOffset = segmentDuration + GAP;
      audioChain.seek(0);
      audioChain.pull(function(buf) {
        runner.assert(safeAppend(audioSb, buf, 'safeAppend failed'));
        audioChain.pull(function(buf) {
          runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
          runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
          runner.checkApproxEq(audioSb.buffered.end(0),
                               segmentDuration * 2 + GAP, 'Range end');
          runner.succeed();
        });
      });
    });
  });
};


var testAudioWithLargeGap = createConformanceTest('AudioWithLargeGap', 'MSE');
testAudioWithLargeGap.prototype.title =
    'Test if audio data with a gap larger than an audio frame size ' +
    'will not be merged into one buffered range.';
testAudioWithLargeGap.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioChain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.03;  // The audio frame size of this file is 0.0232

  appendInit(media, audioSb, audioChain, 0, function() {
    audioChain.pull(function(buf) {
      runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
      runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
      var segmentDuration = audioSb.buffered.end(0);
      audioSb.timestampOffset = segmentDuration + GAP;
      audioChain.seek(0);
      audioChain.pull(function(buf) {
        runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
        audioChain.pull(function(buf) {
          runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
          runner.checkEq(audioSb.buffered.length, 2, 'Source buffer number');
          runner.succeed();
        });
      });
    });
  });
};


var testSeekTimeUpdate = createConformanceTest('SeekTimeUpdate', 'MSE');
testSeekTimeUpdate.prototype.title =
  'Timeupdate event fired with correct currentTime after seeking.';
testSeekTimeUpdate.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var lastTime = 0;
  var updateCount = 0;
  var xhr = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
      function() {
    videoSb.append(xhr.getResponseData());
    var xhr2 = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
        function() {
      audioSb.append(xhr2.getResponseData());
      callAfterLoadedMetaData(media, function() {
        media.addEventListener('timeupdate', function(e) {
          if (!media.paused) {
            ++updateCount;
            runner.checkGE(media.currentTime, lastTime, 'media.currentTime');
            if (updateCount > 3) {
              updateCount = 0;
              lastTime += 10;
              if (lastTime >= 35)
                runner.succeed();
              else
                media.currentTime = lastTime + 6;
            }
          }
        });
        media.play();
      });
    }, 0, 1000000);
    xhr2.send();
  }, 0, 5000000);
  this.ms.duration = 100000000;  // Ensure that we can seek to any position.
  xhr.send();
};


var testSourceSeek = createConformanceTest('Seek', 'MSE');
testSourceSeek.prototype.title = 'Test if we can seek during playing. It' +
    ' also tests if the implementation properly supports seek operation' +
    ' fired immediately after another seek that hasn\'t been completed.';
testSourceSeek.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(new FileSource(
      'media/car-20120827-86.mp4', runner.XHRManager, runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(new FileSource(
      'media/car-20120827-8c.mp4', runner.XHRManager, runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var self = this;

  this.ms.duration = 100000000;  // Ensure that we can seek to any position.

  appendUntil(runner.timeouts, media, videoSb, videoChain, 20, function() {
    appendUntil(runner.timeouts, media, audioSb, audioChain, 20, function() {
      self.log('Seek to 17s');
      callAfterLoadedMetaData(media, function() {
        media.currentTime = 17;
        media.play();
        playThrough(
            runner.timeouts, media, 10, 19,
            videoSb, videoChain, audioSb, audioChain, function() {
          runner.checkGE(media.currentTime, 19, 'currentTime');
          self.log('Seek to 28s');
          media.currentTime = 53;
          media.currentTime = 58;
          playThrough(
            runner.timeouts, media, 10, 60,
            videoSb, videoChain, audioSb, audioChain,
            function() {
              runner.checkGE(media.currentTime, 60, 'currentTime');
              self.log('Seek to 7s');
              media.currentTime = 0;
              media.currentTime = 7;
              videoChain.seek(7, videoSb);
              audioChain.seek(7, audioSb);
              playThrough(runner.timeouts, media, 10, 9,
                videoSb, videoChain, audioSb, audioChain,
                function() {
                  runner.checkGE(media.currentTime, 9, 'currentTime');
                  runner.succeed();
                });
            }
          );
        });
      });
    });
  });
};


var testBufUnbufSeek = createConformanceTest('BufUnbufSeek', 'MSE');
testBufUnbufSeek.prototype.title = 'Seek into and out of a buffered region.';
testBufUnbufSeek.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
      function() {
    videoSb.append(xhr.getResponseData());
    var xhr2 = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
        function() {
      audioSb.append(xhr2.getResponseData());
      callAfterLoadedMetaData(media, function() {
        var N = 30;
        function loop(i) {
          if (i > N) {
            media.currentTime = 1.005;
            media.addEventListener('timeupdate', function(e) {
              if (!media.paused && media.currentTime > 3)
                runner.succeed();
            });
            return;
          }
          // bored of shitty test scripts now => test scripts get shittier
          media.currentTime = (i++ % 2) * 1.0e6 + 1;
          runner.timeouts.setTimeout(loop.bind(null, i), 50);
        }
        media.play();
        media.addEventListener('play', loop.bind(null, 0));
      });
    }, 0, 100000);
    xhr2.send();
  }, 0, 1000000);
  this.ms.duration = 100000000;  // Ensure that we can seek to any position.
  xhr.send();
};


var createDelayedTest = function(delayed, nonDelayed) {
  var test = createConformanceTest('Delayed' +
                                   util.MakeCapitalName(delayed.name), 'MSE');
  test.prototype.title = 'Test if we can play properly when there' +
    ' is not enough ' + delayed.name + ' data. The play should resume once ' +
    delayed.name + ' data is appended.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FixedAppendSize(new ResetInit(
        new FileSource(nonDelayed.src, runner.XHRManager, runner.timeouts)),
                       65536);
    var src = this.ms.addSourceBuffer(nonDelayed.type);
    var delayedChain = new FixedAppendSize(new ResetInit(
        new FileSource(delayed.src, runner.XHRManager, runner.timeouts)),
                       65536);
    var delayedSrc = this.ms.addSourceBuffer(delayed.type);
    var self = this;
    var ontimeupdate = function(e) {
      if (!media.paused) {
        var end = delayedSrc.buffered.end(0);
        runner.checkLE(media.currentTime, end + 1.0, 'media.currentTime');
      }
    };
    appendUntil(runner.timeouts, media, src, chain, 15, function() {
      appendUntil(runner.timeouts, media, delayedSrc, delayedChain, 8,
                  function() {
        var end = delayedSrc.buffered.end(0);
        self.log('Start play when there is only ' + end + ' seconds of ' +
                 name + ' data.');
        media.play();
        media.addEventListener('timeupdate', ontimeupdate);
        waitUntil(runner.timeouts, media, delayedSrc.buffered.end(0) + 3,
            function() {
          runner.checkLE(media.currentTime, end + 1.0, 'media.currentTime');
          runner.checkGr(media.currentTime, end - 1.0, 'media.currentTime');
          runner.succeed();
        });
      });
    });
  };
};

createDelayedTest(StreamDef.AudioNormal, StreamDef.VideoNormal);
createDelayedTest(StreamDef.VideoNormal, StreamDef.AudioNormal);


var testFrameGaps = createConformanceTest('FrameGaps', 'MSE');
testFrameGaps.prototype.title = 'Test media with frame durations of 24FPS ' +
    'but segment timing corresponding to 23.976FPS';
testFrameGaps.prototype.filename = 'media/nq-frames24-tfdt23.mp4';
testFrameGaps.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new FixedAppendSize(new ResetInit(
      new FileSource(this.filename, runner.XHRManager,
                     runner.timeouts)));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new FixedAppendSize(new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts)));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  media.play();
  playThrough(runner.timeouts, media, 5, 18, videoSb, videoChain,
              audioSb, audioChain, runner.succeed.bind(runner));
};


var testFrameOverlaps = createConformanceTest('FrameOverlaps', 'MSE');
testFrameOverlaps.prototype.title = 'Test media with frame durations of ' +
    '23.976FPS but segment timing corresponding to 24FPS';
testFrameOverlaps.prototype.filename = 'media/nq-frames23-tfdt24.mp4';
testFrameOverlaps.prototype.onsourceopen = testFrameGaps.prototype.onsourceopen;


var testEventTimestamp = createConformanceTest('EventTimestamp', 'MSE');
testEventTimestamp.prototype.title = 'Test Event Timestamp is relative to ' +
    'the epoch';
testEventTimestamp.prototype.onsourceopen = function() {
  var runner = this.runner;
  var video = this.video;
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var last = Date.now();
  runner.checkGr(last, 1360000000000, 'Date.now()');

  var audioXhr = runner.XHRManager.createRequest('media/car-20120827-8b.mp4',
    function(e) {
      audioSb.append(this.getResponseData());
      video.addEventListener('timeupdate', function(e) {
        runner.checkGE(e.timeStamp, last, 'event.timeStamp');
        last = e.timeStamp;
        if (!video.paused && video.currentTime >= 2) {
          runner.succeed();
        }
      });
      video.play();
    }, 0, 500000);

  var videoXhr = runner.XHRManager.createRequest('media/car-20120827-85.mp4',
    function(e) {
      videoSb.append(this.getResponseData());
      audioXhr.send();
    }, 0, 1500000);
  videoXhr.send();
};


var testAAC51 = createConformanceTest('AAC51');
testAAC51.prototype.title = 'Test 5.1-channel AAC';
testAAC51.prototype.audioFilename = 'media/sintel-trunc.mp4';
testAAC51.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var xhr = runner.XHRManager.createRequest(this.audioFilename,
    function(e) {
      audioSb.append(xhr.getResponseData());
      var xhr2 = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
        function(e) {
          videoSb.append(xhr2.getResponseData());
          media.play();
          media.addEventListener('timeupdate', function(e) {
            if (!media.paused && media.currentTime > 2)
              runner.succeed();
          });
        }, 0, 3000000);
      xhr2.send();
    });
  xhr.send();
};


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


var testXHRUint8Array = createConformanceTest('XHRUint8Array', 'General');
testXHRUint8Array.prototype.title = 'Ensure that XHR can send an Uint8Array';
testXHRUint8Array.prototype.timeout = 10000;
testXHRUint8Array.prototype.start = function(runner, video) {
  var s = 'XHR DATA';
  var buf = new ArrayBuffer(s.length);
  var view = new Uint8Array(buf);
  for (var i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i);
  }

  var xhr = runner.XHRManager.createPostRequest(
    'https://drmproxy.appspot.com/echo',
    function(e) {
      runner.checkEq(String.fromCharCode.apply(null, xhr.getResponseData()),
                     s, 'XHR response');
      runner.succeed();
    },
    view.length);
  xhr.send(view);
};


var testXHRAbort = createConformanceTest('XHRAbort', 'General');
testXHRAbort.prototype.title = 'Ensure that XHR aborts actually abort by ' +
    'issuing an absurd number of them and then aborting all but one.';
testXHRAbort.prototype.start = function(runner, video) {
  var N = 100;
  var startTime = Date.now();
  var lastAbortTime;
  function startXHR(i) {
    var xhr = runner.XHRManager.createRequest(
        'media/car-20120827-85.mp4?x=' + Date.now() + '.' + i, function() {
      if (i >= N) {
        xhr.getResponseData();  // This will verify status internally.
        runner.succeed();
      }
    });
    if (i < N) {
      runner.timeouts.setTimeout(xhr.abort.bind(xhr), 10);
      runner.timeouts.setTimeout(startXHR.bind(null, i + 1), 1);
      lastAbortTime = Date.now();
    }
    xhr.send();
  };
  startXHR(0);
};


var testXHROpenState = createConformanceTest('XHROpenState', 'General');
testXHROpenState.prototype.title = 'Ensure XMLHttpRequest.open does not ' +
    'reset XMLHttpRequest.responseType';
testXHROpenState.prototype.start = function(runner, video) {
  var xhr = new XMLHttpRequest;
  // It should not be an error to set responseType before calling open
  xhr.responseType = 'arraybuffer';
  xhr.open('GET', 'http://google.com', true);
  runner.checkEq(xhr.responseType, 'arraybuffer', 'XHR responseType');
  runner.succeed();
};


var testCanPlayClearKey = createConformanceTest('CanPlayClearKey', 'EME');
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


var testCanPlayPlayReady = createConformanceTest('CanPlayPlayReady', 'EME');
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


var testCannotPlayWidevine = createConformanceTest('CannotPlayWidevine', 'EME');
testCannotPlayWidevine.prototype.title =
    'Test if canPlay return is correct for Widevine.';
testCannotPlayWidevine.prototype.onsourceopen = function() {
  var video = this.video;
  this.runner.checkEq(
      video.canPlayType(StreamDef.VideoType, 'com.widevine.alpha'), '',
      'canPlayType result');
  this.runner.checkEq(
      video.canPlayType(StreamDef.AudioType, 'com.widevine.alpha'), '',
      'canPlayType result');
  this.runner.succeed();
};


var testWebM = createConformanceTest('WebMHandling', 'EME');
testWebM.prototype.title = 'Ensure that WebM is either supported or ' +
    'that attempting to add a WebM SourceBuffer results in an error.';
testWebM.prototype.onsourceopen = function() {
  var mime = 'video/webm; codecs="vorbis,vp8"';
  var runner = this.runner;
  try {
    this.log('Add sourceBuffer typed webm');
    var webmSb = this.ms.addSourceBuffer(mime);
  } catch (e) {
    runner.checkEq(e.code, DOMException.NOT_SUPPORTED_ERR,
                          'exception code');
    this.log('Add sourceBuffer typed webm to closed MediaSource');
    try {
      (new MediaSource).addSourceBuffer(mime);
    } catch (e) {
      LOG("WebM with mime '" + mime + "' not supported. (This is okay.)");
      runner.succeed();
      return;
    }
    runner.fail('Add sourceBuffer typed webm to closed MediaSource hasn\'t' +
                ' thrown any exception.');
    return;
  }
  var xhr = runner.XHRManager.createRequest('media/test.webm',
    function(e) {
      try {
        webmSb.append(xhr.getResponseData());
      } catch (e) {
        LOG('WebM support claimed but error on appending data!');
        runner.fail();
        return;
      }
      runner.checkEq(webmSb.buffered.length, 1, 'buffered.length');
      runner.checkApproxEq(webmSb.buffered.end(0), 6.04, 'buffered.end(0)');
      runner.succeed();
    });
  xhr.send();
};


var testClearKeyAudio = createConformanceTest('ClearKeyAudio', 'EME');
testClearKeyAudio.prototype.title =
    'Test if we can play audio encrypted with ClearKey encryption.';
testClearKeyAudio.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource('media/car_cenc-20120827-8c.mp4', runner.XHRManager,
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


var testClearKeyVideo = createConformanceTest('ClearKeyVideo', 'EME');
testClearKeyVideo.prototype.title =
    'Test if we can play video encrypted with ClearKey encryption.';
testClearKeyVideo.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource('media/car_cenc-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
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


var testClearKeyNeedKey = createConformanceTest('CKNeedKey', 'Optional EME',
                                                true);
testClearKeyNeedKey.prototype.title = 'Test ClearKey needkey callback';
testClearKeyNeedKey.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onNeedKey: function(e) {
      runner.succeed();
    }
  });
};


var testClearKeyGenerateKeyRequest = createConformanceTest(
    'CKGenerateKeyRequest', 'Optional EME', true);
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


var testClearKeyKeyMessage = createConformanceTest('CKKeyMessage',
                                                   'Optional EME', true);
testClearKeyKeyMessage.prototype.title = 'Test ClearKey keymessage event';
testClearKeyKeyMessage.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onKeyMessage: function(evt) {
      runner.succeed();
    }
  });
};


var testClearKeyAddKey = createConformanceTest('CKAddKey', 'Optional EME',
                                               true);
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


var testClearKeyAddKeyAsyncEvents = createConformanceTest(
    'CKAddKeyAsyncEvents', 'Optional EME', true);
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


var testClearKeyCancelKeyRequest = createConformanceTest(
    'CKCancelKeyRequest', 'Optional EME', true);
testClearKeyCancelKeyRequest.prototype.title =
    'Test ClearKey cancelKeyRequest()';
testClearKeyCancelKeyRequest.prototype.start = function(runner, video) {
  var messagesFired = {};

  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onKeyMessage: function(evt) {
      var testFailed = false;
      try {
        video.cancelKeyRequest(null, evt.sessionId);
        testFailed = true;
      } catch (e) {
        checkDOMError(runner, e);
      }
      if (testFailed)
        runner.fail('cancelKeyRequest should throw SyntaxError exception ' +
                    'when the first param is null');

      try {
        video.cancelKeyRequest(this.keySystem, 'badsessionID');
        testFailed = true;
      } catch (e) {
        checkDOMError(runner, e, DOMException.INVALID_ACCESS_ERR,
                      'InvalidAccessError');
      }
      if (testFailed)
        runner.fail('cancelKeyRequest should throw InvalidAccessError ' +
                    'exception when the second parameter is invalid');

      video.cancelKeyRequest(this.keySystem, evt.sessionId);
      runner.succeed();
    }
  });
};


var testClearKeyCancelKeyRequestPostAdd = createConformanceTest(
    'CKCancelKeyPostAdd', 'Optional EME', true);
testClearKeyCancelKeyRequestPostAdd.prototype.title =
    'Test ClearKey cancelKeyRequest()';
testClearKeyCancelKeyRequestPostAdd.prototype.start = function(runner, video) {
  var messagesFired = {};

  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onLoad: function(initData, session, evt) {
      video.addEventListener('keyadded', function(keyAddedEvt) {
        if (typeof(keyAddedEvt.sessionId) === 'string') {
          try {
            video.cancelKeyRequest(keyAddedEvt.keySystem,
                                   keyAddedEvt.sessionId);
          } catch (e) {
            checkDOMError(runner, e, DOMException.INVALID_STATE_ERR,
                          'InvalidStateError');
            runner.succeed();
            return;
          }
        } else {
          try {
            video.cancelKeyRequest(keyAddedEvt.keySystem,
                                   keyAddedEvt.sessionId);
            runner.succeed();
            return;
          } catch (e) {
            runner.fail('Without a valid session ID, cancelKeyRequest should ' +
                        'always succeed.');
            return;
          }
        }
        runner.fail('CancelKeyRequest did not throw an error after the add ' +
                    'has completed.');
      });
      this._onLoad(initData, session, evt);
    }
  });
};


var testDualKey = createConformanceTest('DualKey', 'Optional EME', true);
testDualKey.prototype.title = 'Tests multiple video keys';
testDualKey.prototype.start = function(runner, video) {
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
      runner.fail('Somehow, the same key was used. This is a failure of the ' +
                  'test video selection.');
  };

  testEmeHandler.init(video);

  var kFlavorMap = {
    playready: 'http://dash-mse-test.appspot.com/api/drm/playready?' +
               'drm_system=playready&source=YOUTUBE&' +
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
      'media/oops_cenc-20121114-145-no-clear-start.mp4',
      'media/oops_cenc-20121114-145-143.mp4'],
    clearkey: [
      'media/oops_cenc-20121114-145-no-clear-start.mp4',
      'media/oops_cenc-20121114-143-no-clear-start.mp4']
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
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();
};


return {tests: tests, info: info, fields: fields, viewType: 'compact'};

};
