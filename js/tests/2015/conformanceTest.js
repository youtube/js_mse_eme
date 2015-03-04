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

var ConformanceTest = function() {

var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource)
  info = 'MSE Version: ' + MediaSource.prototype.version;
info += ' / Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

var containerTypes = [
  'video/mp4; codecs="avc1.640028"',
  'video/webm; codecs="vorbis,vp8"',
  'video/webm; codecs="vorbis,vp9"'
];

var testVideos = [
  ['media/oops_cenc-20121114-145-no-clear-start.mp4']
];

var mediaIndex = 0; // Index into containerTypes and testVideos


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
    src = ms.addSourceBuffer(containerTypes[mediaIndex]);
    var xhr = xhrManager.createRequest(
      testVideos[mediaIndex][0],
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
testAddSourceBufferException.prototype.title = 'Test if add incorrect source ' +
    'buffer type will fire the correct exceptions.';
testAddSourceBufferException.prototype.onsourceopen = function() {
  var runner = this.runner;
  var self = this;
  runner.checkException(function() {
    self.ms.addSourceBuffer('^^^');
  }, DOMException.NOT_SUPPORTED_ERR);

  runner.checkException(function() {
    var ms = new MediaSource;
    ms.addSourceBuffer(StreamDef.AudioType);
  }, DOMException.INVALID_STATE_ERR);

  runner.succeed();
};


var createInitialMediaStateTest = function(state, value, check) {
  var test = createConformanceTest('InitialMedia' +
                                   util.MakeCapitalName(state), 'MSE');

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


var createAppendTest = function(streamName) {
  var test = createConformanceTest(
      'Append' + util.MakeCapitalName(StreamDef[streamName].name), 'MSE');
  test.prototype.title = 'Test if we can append a whole ' +
      StreamDef[streamName].name + ' file whose size is 1MB.';
  test.prototype.onsourceopen = function() {
    var stream = StreamDef[streamName];
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src, function(e) {
      var data = xhr.getResponseData();
      function updateEnd(e) {
        runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(sb.buffered.start(0), 0, 'Range start');
        runner.checkApproxEq(sb.buffered.end(0), stream.duration, 'Range end');

        // Try appending twice in a row --
        // this should throw an INVALID_STATE_ERR exception.
        var caught = false;
        try {
          sb.removeEventListener('updateend', updateEnd);
          sb.appendBuffer(data);
          sb.appendBuffer(data);
        }
        catch (e) {
          if (e.code === e.INVALID_STATE_ERR)
            runner.succeed();
          else
            runner.fail('Invalid error on double append: ' + e);

          caught = true;
        }

        if (!caught) {
          // We may have updated so fast that we didn't encounter the error.
          if (sb.updating)
            // Not a great check due to race conditions, but will have to do.
            runner.fail('Implementation did not throw INVALID_STATE_ERR.');
          else
            runner.succeed();
        }
      }
      sb.addEventListener('updateend', updateEnd);
      sb.appendBuffer(data);
    });
    xhr.send();
  };
};

createAppendTest('Audio1MB');
createAppendTest('Video1MB');


var createAbortTest = function(streamName) {
  var test = createConformanceTest(
      'Abort' + util.MakeCapitalName(StreamDef[streamName].name), 'MSE');
  test.prototype.title = 'Test if we can abort the current segment.';
  test.prototype.onsourceopen = function() {
    var stream = StreamDef[streamName];
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
        function(e) {
      sb.appendBuffer(xhr.getResponseData());
      sb.abort();
      sb.appendBuffer(xhr.getResponseData());
      sb.addEventListener('update', function(e) {
        runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(sb.buffered.start(0), 0, 'Range start');
        runner.checkGr(sb.buffered.end(0), 0, 'Range end');
        runner.succeed();
      });
    }, 0, 200000);
    xhr.send();
  };
};

createAbortTest('Audio1MB');
createAbortTest('Video1MB');


var createTimestampOffsetTest = function(streamName) {
  var test = createConformanceTest(
      'TimestampOffset' + util.MakeCapitalName(StreamDef[streamName].name),
      'MSE');
  test.prototype.title = 'Test if we can set timestamp offset.';
  test.prototype.onsourceopen = function() {
    var stream = StreamDef[streamName];
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
        function(e) {
      sb.timestampOffset = 5;
      sb.appendBuffer(xhr.getResponseData());
      sb.addEventListener('updateend', function() {
        runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(sb.buffered.start(0), 5, 'Range start');
        runner.checkApproxEq(sb.buffered.end(0), stream.duration + 5,
                             'Range end');
        runner.succeed();
      });
    });
    xhr.send();
  };
};

createTimestampOffsetTest('Audio1MB');
createTimestampOffsetTest('Video1MB');


var testDASHLatency = createConformanceTest('DASHLatency', 'MSE');
testDASHLatency.prototype.title = 'Test SourceBuffer DASH switch latency';
testDASHLatency.prototype.onsourceopen = function() {
  var self = this;
  var runner = this.runner;
  var sb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var video = this.video;

  var xhr = runner.XHRManager.createRequest(StreamDef.VideoTiny.src,
      function(e) {
    var videoContent = xhr.getResponseData();
    var expectedTime = 0;
    var loopCount = 0;
    var MAX_ITER = 300;
    var OVERFLOW_OFFSET = 1.0;

    sb.addEventListener('update', function onUpdate() {
      expectedTime += StreamDef.VideoTiny.duration;
      sb.timestampOffset = expectedTime;
      loopCount++;

      if (loopCount > MAX_ITER) {
        runner.fail('Failed to fill up source buffer.');
      }
 
      // Fill up the buffer such that it triggers implementations that move
      // data to the track buffers.
      if (expectedTime > sb.buffered.end(0) + OVERFLOW_OFFSET) {
        sb.removeEventListener('update', onUpdate);
        var bufferSize = loopCount * StreamDef.VideoTiny.size / 1048576;
        self.log('Buffer size: ' + Math.round(bufferSize) + 'MB');

        var oldWidth = video.videoWidth;
        var DASH_MAX_LATENCY = 1;
        var newContentStartTime = sb.buffered.start(0) + 2;
        sb.timestampOffset = newContentStartTime;

        sb.addEventListener('update', function onUpdate() {
          sb.removeEventListener('update', onUpdate);
          self.log('Source buffer updated as exceeding buffer limit');

          video.addEventListener('timeupdate', function onTimeUpdate(e) {
            if (video.currentTime > newContentStartTime + DASH_MAX_LATENCY) {
              video.removeEventListener('timeupdate', onTimeUpdate);
              // If TimestampOffset* tests failed, then this will fail too.
              runner.succeed();
            }
          });
          video.play();
        });
        sb.appendBuffer(videoContent);
      } else {
        sb.appendBuffer(videoContent);
      }
    });
    sb.appendBuffer(videoContent);;
  });
  xhr.send();
};


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


var createDurationAfterAppendTest = function(streamName) {
  var test = createConformanceTest('DurationAfterAppend' +
      util.MakeCapitalName(StreamDef[streamName].name), 'MSE');
  test.prototype.title = 'Test if the duration expands after appending data.';
  test.prototype.onsourceopen = function() {
    var stream = StreamDef[streamName];
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.type);
    var self = this;

    // TODO: figure out duration
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        var data = xhr.getResponseData();

        var updateCb = function() {
          sb.removeEventListener('update', updateCb);
          sb.abort();

          if (sb.updating) {
            runner.fail();
          } else {
            media.addEventListener(
                'durationchange', function onFirstDurationChange() {
              self.log('onFirstDurationChange called');
              media.removeEventListener('durationchange',
                                        onFirstDurationChange);
              // This will fail if the buffer hasn't been trimmed.
              runner.checkApproxEq(ms.duration, sb.buffered.end(0),
                                   'ms.duration');
              sb.addEventListener('update', function() {
                self.log('onSecondDurationChange called');
                runner.checkApproxEq(ms.duration, sb.buffered.end(0),
                                     'ms.duration');
                runner.succeed();
              });
              sb.appendBuffer(data);
            });
            ms.duration = sb.buffered.end(0) / 2;
          }
        };

        sb.addEventListener('update', updateCb);
        sb.appendBuffer(data);
      });
    xhr.send();
  };
};

createDurationAfterAppendTest('Audio1MB');
createDurationAfterAppendTest('Video1MB');


var createPausedTest = function(streamName) {
  var test = createConformanceTest('PausedStateWith' +
      util.MakeCapitalName(StreamDef[streamName].name), 'MSE');
  test.prototype.title = 'Test if the paused state is correct before or ' +
      ' after appending data.';
  test.prototype.onsourceopen = function() {
    var stream = StreamDef[streamName];
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.type);

    runner.checkEq(media.paused, true, 'media.paused');

    var xhr = runner.XHRManager.createRequest(stream.src,
        function(e) {
      runner.checkEq(media.paused, true, 'media.paused');
      sb.appendBuffer(xhr.getResponseData());
      runner.checkEq(media.paused, true, 'media.paused');
      sb.addEventListener('updateend', function() {
        runner.checkEq(media.paused, true, 'media.paused');
        runner.succeed();
      });
    });
    xhr.send();
  };
};

createPausedTest('Audio1MB');
createPausedTest('Video1MB');


var createMediaElementEventsTest = function() {
  var test = createConformanceTest('MediaElementEvents', 'MSE');
  test.prototype.title = 'Test if the events on MediaSource are correct.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
    var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
    var lastState = 'open';
    var self = this;
    var videoXhr = runner.XHRManager.createRequest(StreamDef.Video1MB.src,
        function(e) {
      self.log('onload called');
      videoSb.appendBuffer(videoXhr.getResponseData());
      videoSb.addEventListener('update', function() {
        videoSb.abort();
        ms.duration = 1;
        ms.endOfStream();
        media.play();
      });
    });
    var audioXhr = runner.XHRManager.createRequest(StreamDef.Audio1MB.src,
        function(e) {
      self.log('onload called');
      audioSb.appendBuffer(audioXhr.getResponseData());
      audioSb.addEventListener('update', function() {
        audioSb.abort();
        videoXhr.send();
      });
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
    var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
    var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
    var lastState = 'open';
    var self = this;
    var videoXhr = runner.XHRManager.createRequest(StreamDef.Video1MB.src,
      function(e) {
        self.log('onload called');
        videoSb.appendBuffer(videoXhr.getResponseData());
        videoSb.abort();
        ms.endOfStream();
      });
    var audioXhr = runner.XHRManager.createRequest(StreamDef.Audio1MB.src,
      function(e) {
        self.log('onload called');
        audioSb.appendBuffer(audioXhr.getResponseData());
        audioSb.abort();
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
  var xhr = runner.XHRManager.createRequest(StreamDef.Video1MB.src,
      function(e) {
    // The test clip has a bitrate which is nearly exactly 1MB/sec, and
    // lasts 1s. We start appending it repeatedly until we get eviction.
    var expectedTime = 0;
    sb.appendBuffer(xhr.getResponseData());
    sb.addEventListener('updateend', function onUpdate() {
      if (sb.buffered.start(0) > 0 || expectedTime > sb.buffered.end(0) + 0.1) {
        sb.removeEventListener('updateend', onUpdate);

        var MIN_SIZE = 12;
        runner.checkGE(expectedTime - sb.buffered.start(0), MIN_SIZE,
                       'Estimated source buffer size');
        runner.succeed();
      } else {
        expectedTime++;
        sb.timestampOffset = expectedTime;
        sb.appendBuffer(xhr.getResponseData());
      }
    });
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
      new FileSource(StreamDef.VideoTiny.src, runner.XHRManager,
                     runner.timeouts)));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new FixedAppendSize(new ResetInit(
      new FileSource(StreamDef.AudioTiny.src, runner.XHRManager,
                     runner.timeouts)));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);

  appendUntil(runner.timeouts, media, videoSb, videoChain, 5, function() {
    appendUntil(runner.timeouts, media, audioSb, audioChain, 5, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 1, 2, videoSb,
          videoChain, audioSb, audioChain, function() {
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
      new FileSource(StreamDef.VideoNormal.src, runner.XHRManager,
                     runner.timeouts), 65536));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;

  runner.checkEq(media.videoWidth, 0, 'video width');
  runner.checkEq(media.videoHeight, 0, 'video height');

  var totalSuccess = 0;
  function checkSuccess() {
    totalSuccess++;
    if (totalSuccess == 2)
      runner.succeed();
  }

  media.addEventListener('loadedmetadata', function(e) {
    self.log('loadedmetadata called');
    runner.checkEq(media.videoWidth, 640, 'video width');
    runner.checkEq(media.videoHeight, 360, 'video height');
    checkSuccess();
  });

  runner.checkEq(media.readyState, media.HAVE_NOTHING, 'readyState');
  appendInit(media, videoSb, videoChain, 0, checkSuccess);
};


var testPlaybackState = createConformanceTest('PlaybackState', 'MSE');
testPlaybackState.prototype.title =
    'Test if the playback state transition is correct.';
testPlaybackState.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(new FixedAppendSize(
      new FileSource(StreamDef.VideoNormal.src, runner.XHRManager,
                     runner.timeouts), 65536));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(new FixedAppendSize(
      new FileSource(StreamDef.AudioTiny.src, runner.XHRManager,
                     runner.timeouts), 65536));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var self = this;

  media.play();
  runner.checkEq(media.currentTime, 0, 'media.currentTime');
  media.pause();
  runner.checkEq(media.currentTime, 0, 'media.currentTime');

  appendInit(media, audioSb, audioChain, 0, function() {
    appendInit(media, videoSb, videoChain, 0, function() {
      callAfterLoadedMetaData(media, function() {
        media.play();
        runner.checkEq(media.currentTime, 0, 'media.currentTime');
        media.pause();
        runner.checkEq(media.currentTime, 0, 'media.currentTime');
        media.play();
        appendUntil(runner.timeouts, media, audioSb, audioChain, 5, function() {
          appendUntil(runner.timeouts, media,
                      videoSb, videoChain, 5, function() {
            playThrough(runner.timeouts, media, 1, 2,
                        audioSb, audioChain, videoSb, videoChain, function() {
              var time = media.currentTime;
              media.pause();
              runner.checkApproxEq(media.currentTime, time,
                                   'media.currentTime');
              runner.succeed();
            });
          });
        });
      });
    });
  });
};


var testStartPlayWithoutData = createConformanceTest(
    'StartPlayWithoutData', 'MSE');
testStartPlayWithoutData.prototype.title =
    'Test if we can start play before feeding any data. The play should ' +
    'start automatically after data is appended';
testStartPlayWithoutData.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource(StreamDef.VideoHuge.src, runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource(StreamDef.AudioHuge.src, runner.XHRManager,
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
  var videoXhr = runner.XHRManager.createRequest(StreamDef.VideoTiny.src,
      function(e) {
    videoSb.appendBuffer(this.getResponseData());
    video.addEventListener('timeupdate', function(e) {
      if (!video.paused && video.currentTime >= 2) {
        runner.succeed();
      }
    });
    video.play();
  }, 0, 1500000);
  var audioXhr = runner.XHRManager.createRequest(StreamDef.AudioTiny.src,
      function(e) {
    audioSb.appendBuffer(this.getResponseData());
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
  var xhr = runner.XHRManager.createRequest(StreamDef.AudioNormalAdv.src,
      function(e) {
    sb.appendBuffer(xhr.getResponseData());
    sb.addEventListener('updateend', function() {
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0),
          StreamDef.AudioNormalAdv.customMap[200000], 'Range end');
      runner.succeed();
    });
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
  var xhr = runner.XHRManager.createRequest(StreamDef.AudioNormalAdv.src,
      function(e) {
    sb.timestampOffset = 5;
    sb.appendBuffer(this.getResponseData());
    sb.addEventListener('updateend', function callXhr2() {
      sb.removeEventListener('updateend', callXhr2);
      xhr2.send();
    });
  }, 0, 200000);
  var xhr2 = runner.XHRManager.createRequest(StreamDef.AudioHuge.src,
      function(e) {
    sb.abort();
    sb.timestampOffset = 0;
    sb.appendBuffer(this.getResponseData());
    sb.addEventListener('updateend', function() {
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0),
        StreamDef.AudioHuge.customMap['appendAudioOffset'], 'Range end');
      runner.succeed();
    });
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
  var xhr = runner.XHRManager.createRequest(StreamDef.VideoNormal.src,
      function(e) {
    sb.timestampOffset = 5;
    sb.appendBuffer(this.getResponseData());
    sb.addEventListener('update', function callXhr2() {
      sb.removeEventListener('update', callXhr2);
      xhr2.send();
    });
  }, 0, 200000);
  var xhr2 = runner.XHRManager.createRequest(StreamDef.VideoTiny.src,
      function(e) {
    sb.abort();
    sb.timestampOffset = 0;
    sb.appendBuffer(this.getResponseData());
    sb.addEventListener('updateend', function() {
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0),
          StreamDef.VideoTiny.customMap['videoChangeRate'], 'Range end');
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
    });
    video.play();
  }, 0, 400000);
  this.ms.duration = 100000000;  // Ensure that we can seek to any position.
  xhr.send();
};


var createAppendMultipleInitTest = function(type, stream) {
  var test = createConformanceTest(
      'AppendMultipleInit' + util.MakeCapitalName(type), 'MSE');
  test.prototype.title = 'Test if we can append multiple init segments.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FileSource(stream.src, runner.XHRManager, runner.timeouts);
    var src = this.ms.addSourceBuffer(stream.type);
    var init;

    function getEventAppend(cb, endCb) {
      var chainCount = 0;
      return function() {
        if (chainCount < 10) {
          ++chainCount;
          cb();
        } else {
          endCb();
        }
      };
    }

    chain.init(0, function(buf) {
      init = buf;
      chain.pull(function(buf) {
        var firstAppend = getEventAppend(function() {
            src.appendBuffer(init);
          }, function() {
            src.removeEventListener('update', firstAppend);
            src.addEventListener('update', function abortAppend() {
              src.removeEventListener('update', abortAppend);
              src.abort();
              var end = src.buffered.end(0);

              var secondAppend = getEventAppend(function() {
                src.appendBuffer(init);
              }, function() {
                runner.checkEq(src.buffered.end(0), end, 'Range end');
                runner.succeed();
              });
              src.addEventListener('update', secondAppend);
              secondAppend();
            });
            src.appendBuffer(buf);
          });
        src.addEventListener('update', firstAppend);
        firstAppend();
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
  var audioChain = new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
      runner.timeouts);
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var bufs = [];

  function createAppendHook() {
    var i = 0;
    // Append order of the segments.
    var appendOrder = [0, 2, 1, 4, 3];
    // Number of segments given the append order, since segments get merged.
    var bufferedLength = [0, 1, 1, 2, 1];

    audioSb.addEventListener('update', function() {
      runner.checkEq(audioSb.buffered.length, bufferedLength[i],
                     'Source buffer number');
      if (i == 1)
        runner.checkGr(audioSb.buffered.start(0), 0, 'Range start');
      else if (i > 0)
        runner.checkEq(audioSb.buffered.start(0), 0, 'Range start');

      ++i;
      if (i < bufs.length)
        runner.succeed();
      else
        audioSb.appendBuffer(bufs[appendOrder[i]]);
    });
  };

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
            createAppendHook();
            audioSb.appendBuffer(bufs[0]);
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
      new FileSource(StreamDef.VideoNormal.src, runner.XHRManager,
                     runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
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


var testMediaSourceDuration = createConformanceTest(
    'MediaSourceDuration', 'MSE');
testMediaSourceDuration.prototype.title =
    'Test if the duration on MediaSource can be set and retrieved sucessfully.';
testMediaSourceDuration.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var ms = this.ms;
  var videoChain = new ResetInit(
      new FileSource(StreamDef.VideoNormal.src, runner.XHRManager,
          runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;
  var onsourceclose = function() {
    self.log('onsourceclose called');
    runner.assert(isNaN(ms.duration));
    runner.succeed();
  };

  // TODO: figure out duration
  runner.assert(isNaN(media.duration), 'Initial media duration not NaN');
  media.play();
  appendInit(media, videoSb, videoChain, 0, function() {
    appendUntil(runner.timeouts, media, videoSb, videoChain, 10, function() {
      runner.checkEq(ms.duration,
          StreamDef.VideoNormal.customMap.mediaSourceDuration, 'ms.duration');
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
          videoSb.addEventListener('update', function buffersRemoved() {
            videoSb.removeEventListener('update', buffersRemoved);
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
          ms.duration = 5;
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
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.1;

  appendInit(media, audioSb, audioChain, 0, function() {
    audioChain.pull(function(buf) {
      audioSb.addEventListener('update', function appendOuter() {
        audioSb.removeEventListener('update', appendOuter);
        runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
        var segmentDuration = audioSb.buffered.end(0);
        audioSb.timestampOffset = segmentDuration - GAP;
        audioChain.seek(0);
        audioChain.pull(function(buf) {
          audioSb.addEventListener('update', function appendMiddle() {
            audioSb.removeEventListener('update', appendMiddle);
            audioChain.pull(function(buf) {
              audioSb.addEventListener('update', function appendInner() {
                runner.checkEq(audioSb.buffered.length, 1,
                               'Source buffer number');
                runner.checkApproxEq(audioSb.buffered.end(0),
                                     segmentDuration * 2 - GAP, 'Range end');
                runner.succeed();
              });
              runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
            });
          });
          runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
        });
      });
      runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
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
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.01;  // The audio frame size of this file is 0.0232

  appendInit(media, audioSb, audioChain, 0, function() {
    audioChain.pull(function(buf) {
      audioSb.addEventListener('update', function appendOuter() {
        audioSb.removeEventListener('update', appendOuter);
        runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
        var segmentDuration = audioSb.buffered.end(0);
        audioSb.timestampOffset = segmentDuration + GAP;
        audioChain.seek(0);
        audioChain.pull(function(buf) {
          audioSb.addEventListener('update', function appendMiddle() {
            audioSb.removeEventListener('update', appendMiddle);
            audioChain.pull(function(buf) {
              audioSb.addEventListener('update', function appendInner() {
                runner.checkEq(audioSb.buffered.length, 1,
                               'Source buffer number');
                runner.checkApproxEq(audioSb.buffered.end(0),
                                     segmentDuration * 2 + GAP, 'Range end');
                runner.succeed();
              });
              runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
            });
          });
          runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
        });
      });
      runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
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
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
                     runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.03;  // The audio frame size of this file is 0.0232

  appendInit(media, audioSb, audioChain, 0, function() {
    audioChain.pull(function(buf) {
      audioSb.addEventListener('update', function appendOuter() {
        audioSb.removeEventListener('update', appendOuter);
        runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
        var segmentDuration = audioSb.buffered.end(0);
        audioSb.timestampOffset = segmentDuration + GAP;
        audioChain.seek(0);
        audioChain.pull(function(buf) {
          audioSb.addEventListener('update', function appendMiddle() {
            audioSb.removeEventListener('update', appendMiddle);
            audioChain.pull(function(buf) {
              audioSb.addEventListener('update', function appendInner() {
                runner.checkEq(audioSb.buffered.length, 2,
                               'Source buffer number');
                runner.succeed();
              });
              runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
            });
          });
          runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
        });
      });
      runner.assert(safeAppend(audioSb, buf), 'safeAppend failed');
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
  var xhr = runner.XHRManager.createRequest(StreamDef.VideoNormal.src,
      function() {
    videoSb.appendBuffer(xhr.getResponseData());
    var xhr2 = runner.XHRManager.createRequest(StreamDef.AudioNormal.src,
        function() {
      audioSb.appendBuffer(xhr2.getResponseData());
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
      StreamDef.VideoNormal.src, runner.XHRManager, runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new ResetInit(new FileSource(
      StreamDef.AudioNormal.src, runner.XHRManager, runner.timeouts));
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
              videoSb, videoChain, audioSb, audioChain, function() {
            runner.checkGE(media.currentTime, 60, 'currentTime');
            self.log('Seek to 7s');
            media.currentTime = 0;
            media.currentTime = 7;
            videoChain.seek(7, videoSb);
            audioChain.seek(7, audioSb);
            playThrough(runner.timeouts, media, 10, 9,
                videoSb, videoChain, audioSb, audioChain, function() {
              runner.checkGE(media.currentTime, 9, 'currentTime');
              runner.succeed();
            });
          });
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
  var xhr = runner.XHRManager.createRequest(StreamDef.VideoNormal.src,
      function() {
    videoSb.appendBuffer(xhr.getResponseData());
    var xhr2 = runner.XHRManager.createRequest(StreamDef.AudioNormal.src,
        function() {
      audioSb.appendBuffer(xhr2.getResponseData());
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


var createDelayedTest = function(delayedName, delayedType,
    nonDelayedName, nonDelayedType) {
  var test = createConformanceTest('Delayed' +
      util.MakeCapitalName(delayedType), 'MSE');
  test.prototype.title = 'Test if we can play properly when there' +
    ' is not enough ' + delayedType + ' data. The play should resume once ' +
    delayedType + ' data is appended.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var delayed = StreamDef[delayedName];
    var nonDelayed = StreamDef[nonDelayedName];
    var chain = new FixedAppendSize(
      new ResetInit(
        new FileSource(nonDelayed.src, runner.XHRManager, runner.timeouts)
      ), 16384);
    var src = this.ms.addSourceBuffer(nonDelayed.type);
    var delayedChain = new FixedAppendSize(
      new ResetInit(
        new FileSource(delayed.src, runner.XHRManager, runner.timeouts)
      ), 16384);
    var delayedSrc = this.ms.addSourceBuffer(delayed.type);
    var self = this;
    var ontimeupdate = function(e) {
      if (!media.paused) {
        var end = delayedSrc.buffered.end(0);
        runner.checkLE(media.currentTime, end + 1.0,
          'media.currentTime (' + media.readyState + ')');
      }
    };

    appendUntil(runner.timeouts, media, src, chain, 15, function() {
      appendUntil(runner.timeouts, media, delayedSrc, delayedChain, 8,
                  function() {
        var end = delayedSrc.buffered.end(0);
        self.log('Start play when there is only ' + end + ' seconds of ' +
                 test.prototype.desc + ' data.');
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

createDelayedTest('AudioNormal', 'audio', 'VideoNormal', 'video');
createDelayedTest('VideoNormal', 'video', 'AudioNormal', 'audio');


var testFrameGaps = createConformanceTest('FrameGaps', 'MSE');
testFrameGaps.prototype.title = 'Test media with frame durations of 24FPS ' +
    'but segment timing corresponding to 23.976FPS';
testFrameGaps.prototype.filename = 'media/nq-frames24-tfdt23.mp4';
testFrameGaps.prototype.onsourceopen = function() {
  var runner = this.runner;
  if (StreamDef.isWebM()) {
    runner.succeed();
    return;
  }

  var media = this.video;
  var videoChain = new FixedAppendSize(new ResetInit(
      new FileSource(this.filename, runner.XHRManager,
                     runner.timeouts)));
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audioChain = new FixedAppendSize(new ResetInit(
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
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


var testAAC51 = createConformanceTest('AAC51', 'MSE');
testAAC51.prototype.title = 'Test 5.1-channel AAC';
testAAC51.prototype.audioFilename = 'media/sintel-trunc.mp4';
testAAC51.prototype.onsourceopen = function() {
  var runner = this.runner;
  if (StreamDef.isWebM()) {
    runner.succeed();
    return;
  }

  var media = this.video;
  var audioSb = this.ms.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var xhr = runner.XHRManager.createRequest(this.audioFilename,
      function(e) {
    audioSb.appendBuffer(xhr.getResponseData());
    var xhr2 = runner.XHRManager.createRequest(StreamDef.VideoNormal.src,
      function(e) {
        videoSb.appendBuffer(xhr2.getResponseData());
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

  var audioXhr = runner.XHRManager.createRequest(StreamDef.AudioTiny.src,
      function(e) {
    audioSb.appendBuffer(this.getResponseData());
    video.addEventListener('timeupdate', function(e) {
      runner.checkGE(e.timeStamp, last, 'event.timeStamp');
      last = e.timeStamp;
      if (!video.paused && video.currentTime >= 2) {
        runner.succeed();
      }
    });
    video.play();
  }, 0, 500000);

  var videoXhr = runner.XHRManager.createRequest(StreamDef.VideoTiny.src,
      function(e) {
    videoSb.appendBuffer(this.getResponseData());
    audioXhr.send();
  }, 0, 1500000);
  videoXhr.send();
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
        StreamDef.VideoNormal.src + '?x=' + Date.now() + '.' + i, function() {
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


var testWidevineSupport = createConformanceTest('WidevineSupport', 'EME');
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
        video.canPlayType('video/mp4; codecs="avc1.640028"', 'com.widevine.alpha'), 'probably',
        'canPlayType result');
    this.runner.checkEq(
        video.canPlayType('audio/mp4; codecs="mp4a.40.2"', 'com.widevine.alpha'), 'probably',
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


var testClearKeyAudio = createConformanceTest('ClearKeyAudio', 'EME');
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
  if (StreamDef.isWebM()) {
    runner.succeed();
    return;
  }

  var media = this.video;
  var videoChain = new ResetInit(
      new FileSource('media/car_cenc-20120827-86.mp4', runner.XHRManager,
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


var testDualKey = createConformanceTest('DualKey', 'EME');
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
  ms.addEventListener('webkitsourceopen', onSourceOpen);
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();
};


var testClearKeyNeedKey = createConformanceTest('CKNeedKey', 'Optional EME',
                                                false);
testClearKeyNeedKey.prototype.title = 'Test ClearKey needkey callback';
testClearKeyNeedKey.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onNeedKey: function(e) {
      runner.succeed();
    }
  });
};


var testClearKeyGenerateKeyRequest = createConformanceTest(
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


var testClearKeyKeyMessage = createConformanceTest('CKKeyMessage',
                                                   'Optional EME', false);
testClearKeyKeyMessage.prototype.title = 'Test ClearKey keymessage event';
testClearKeyKeyMessage.prototype.start = function(runner, video) {
  setupBaseEmeTest(video, runner.XHRManager, 100000, {
    onKeyMessage: function(evt) {
      runner.succeed();
    }
  });
};


var testClearKeyAddKey = createConformanceTest('CKAddKey', 'Optional EME',
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


var testClearKeyAddKeyAsyncEvents = createConformanceTest(
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
