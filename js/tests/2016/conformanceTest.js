/*
Copyright 2015 Google Inc. All rights reserved.

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

var mseVersion = '10 December 2013';
var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource) {
  info = 'MSE Spec Version: ' + mseVersion;
  info += ' | webkit prefix: ' + webkitPrefix.toString();
}
info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

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


var createAppendTest = function(stream) {
  var test = createConformanceTest(
      'Append' + util.MakeCapitalName(stream.name), 'MSE');
  test.prototype.title = 'Test if we can append a whole ' +
      stream.name + ' file whose size is 1MB.';
  test.prototype.onsourceopen = function() {
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

createAppendTest(StreamDef.Audio1MB);
createAppendTest(StreamDef.Video1MB);


var createAbortTest = function(stream) {
  var test = createConformanceTest(
      'Abort' + util.MakeCapitalName(stream.name), 'MSE');
  test.prototype.title = 'Test if we can abort the current segment.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src, function(e) {
      var responseData = xhr.getResponseData();
      var abortEnded = function(e) {
        sb.removeEventListener('updateend', abortEnded);
        sb.addEventListener('update', function(e) {
          runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
          runner.checkEq(sb.buffered.start(0), 0, 'Range start');
          runner.checkGr(sb.buffered.end(0), 0, 'Range end');
          runner.succeed();
        });
        sb.appendBuffer(responseData);
      }
      var appendStarted = function(e) {
        sb.removeEventListener('update', appendStarted);
        sb.addEventListener('updateend', abortEnded);
        sb.abort();
      }
      sb.addEventListener('update', appendStarted);
      sb.appendBuffer(responseData);
    }, 0, stream.size);
    xhr.send();
  };
};

createAbortTest(StreamDef.Audio1MB);
createAbortTest(StreamDef.Video1MB);


var createTimestampOffsetTest = function(stream) {
  var test = createConformanceTest(
      'TimestampOffset' + util.MakeCapitalName(stream.name),
      'MSE');
  test.prototype.title = 'Test if we can set timestamp offset.';
  test.prototype.onsourceopen = function() {
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

createTimestampOffsetTest(StreamDef.Audio1MB);
createTimestampOffsetTest(StreamDef.Video1MB);


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

    var onBufferFull = function() {
      var bufferSize = loopCount * StreamDef.VideoTiny.size / 1048576;
      self.log('Buffer size: ' + Math.round(bufferSize) + 'MB');

      var oldWidth = video.videoWidth;
      var DASH_MAX_LATENCY = 1;
      var newContentStartTime = sb.buffered.start(0) + 2;
      self.log('Source buffer updated as exceeding buffer limit');

      video.addEventListener('timeupdate', function onTimeUpdate(e) {
        if (video.currentTime > newContentStartTime + DASH_MAX_LATENCY) {
          video.removeEventListener('timeupdate', onTimeUpdate);
          runner.succeed();
        }
      });
      video.play();
    }

    sb.addEventListener('update', function onUpdate() {
      expectedTime += StreamDef.VideoTiny.duration;
      sb.timestampOffset = expectedTime;
      loopCount++;

      if (loopCount > MAX_ITER) {
        runner.fail('Failed to fill up source buffer.');
      }

      // Fill up the buffer such that it overflow implementations.
      if (expectedTime > sb.buffered.end(0) + OVERFLOW_OFFSET) {
        sb.removeEventListener('update', onUpdate);
        onBufferFull();
      }
      try {
        sb.appendBuffer(videoContent);
      } catch (e) {
        sb.removeEventListener('update', onUpdate);
        var QUOTA_EXCEEDED_ERROR_CODE = 22;
        if (e.code == QUOTA_EXCEEDED_ERROR_CODE) {
          onBufferFull();
        } else {
          runner.fail(e);
        }
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


var createDurationAfterAppendTest = function(stream) {
  var test = createConformanceTest('DurationAfterAppend' +
      util.MakeCapitalName(stream.name), 'MSE');
  test.prototype.title = 'Test if the duration expands after appending data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.type);
    var self = this;

    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        var data = xhr.getResponseData();

        var updateCb = function() {
          var halfDuration;
          var durationChanged = false;
          var sbUpdated = false;
          sb.removeEventListener('updateend', updateCb);
          sb.abort();

          if (sb.updating) {
            runner.fail();
            return;
          }

          media.addEventListener('durationchange', function onDurationChange() {
            media.removeEventListener('durationchange', onDurationChange);
            self.log('Duration change complete.');
            runner.checkApproxEq(ms.duration, halfDuration, 'ms.duration');
            durationChanged = true;
            if (durationChanged && sbUpdated) {
              runner.succeed();
            }
          });

          sb.addEventListener('updateend', function onDurationChangeUpdate() {
            sb.removeEventListener('updateend', onDurationChangeUpdate);
            self.log('Remove() complete.');
            runner.checkApproxEq(ms.duration, halfDuration, 'ms.duration');
            runner.checkApproxEq(sb.buffered.end(0), halfDuration,
                                 'sb.buffered.end(0)');
            sb.addEventListener('updateend', function onUpdate() {
              sb.removeEventListener('updateend', onUpdate);
              runner.checkApproxEq(ms.duration, sb.buffered.end(0),
                                   'ms.duration');
              sbUpdated = true;
              if (durationChanged && sbUpdated) {
                runner.succeed();
              }
            });
            sb.appendBuffer(data);
          });
          halfDuration = sb.buffered.end(0) / 2;
          ms.duration = halfDuration;
        };

        sb.addEventListener('updateend', updateCb);
        sb.appendBuffer(data);
      });
    xhr.send();
  };
};

createDurationAfterAppendTest(StreamDef.Audio1MB);
createDurationAfterAppendTest(StreamDef.Video1MB);


var createPausedTest = function(stream) {
  var test = createConformanceTest('PausedStateWith' +
      util.MakeCapitalName(stream.name), 'MSE');
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

createPausedTest(StreamDef.Audio1MB);
createPausedTest(StreamDef.Video1MB);


var createMediaElementEventsTest = function() {
  var test = createConformanceTest('MediaElementEvents', 'MSE');
  test.prototype.title = 'Test events on the MediaElement.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
    var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
    var self = this;
    var videoXhr = runner.XHRManager.createRequest(StreamDef.Video1MB.src,
        function(e) {
      self.log('onload called');
      var onDurationChange = function() {
        ms.endOfStream();
        media.play();
      }
      var onUpdate = function() {
        videoSb.removeEventListener('update', onUpdate);
        videoSb.addEventListener('update', onDurationChange);
        ms.duration = 1;
      }
      videoSb.addEventListener('update', onUpdate);
      videoSb.appendBuffer(videoXhr.getResponseData());
    });
    var audioXhr = runner.XHRManager.createRequest(StreamDef.Audio1MB.src,
        function(e) {
      self.log('onload called');
      var onAudioUpdate =  function() {
        audioSb.removeEventListener('update', onAudioUpdate);
        videoXhr.send();
      }
      audioSb.addEventListener('update', onAudioUpdate);
      audioSb.appendBuffer(audioXhr.getResponseData());
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
    var onBufferFull = function() {
      var MIN_SIZE = 12;
      runner.checkGE(expectedTime - sb.buffered.start(0), MIN_SIZE,
                     'Estimated source buffer size');
      runner.succeed();
    };
    // The test clip has a bitrate which is nearly exactly 1MB/sec, and
    // lasts 1s. We start appending it repeatedly until we get eviction.
    var expectedTime = 0;
    sb.appendBuffer(xhr.getResponseData());
    sb.addEventListener('updateend', function onUpdate() {
      if (sb.buffered.start(0) > 0 || expectedTime > sb.buffered.end(0) + 0.1) {
        sb.removeEventListener('updateend', onUpdate);
        onBufferFull();
      } else {
        expectedTime++;
        sb.timestampOffset = expectedTime;
        try {
          sb.appendBuffer(xhr.getResponseData());
        } catch (e) {
          var QUOTA_EXCEEDED_ERROR_CODE = 22;
          if (e.code == QUOTA_EXCEEDED_ERROR_CODE) {
            sb.removeEventListener('updateend', onUpdate);
            onBufferFull();
          } else {
            runner.fail(e);
          }
        }
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


var createAppendMultipleInitTest = function(stream) {
  var test = createConformanceTest(
      'AppendMultipleInit' + util.MakeCapitalName(stream.name), 'MSE');
  test.prototype.title = 'Test if we can append multiple init segments.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FileSource(stream.src, runner.XHRManager, runner.timeouts,
                               0, stream.size, stream.size);
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

createAppendMultipleInitTest(StreamDef.Audio1MB);
createAppendMultipleInitTest(StreamDef.Video1MB);


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

  runner.assert(isNaN(media.duration), 'Initial media duration not NaN');
  media.play();
  appendInit(media, videoSb, videoChain, 0, function() {
    appendUntil(runner.timeouts, media, videoSb, videoChain, 10, function() {
      runner.checkApproxEq(ms.duration,
                           StreamDef.VideoNormal.customMap.mediaSourceDuration,
                           'ms.duration', 0.01);
      videoSb.addEventListener('update', function onDurationChange() {
        videoSb.removeEventListener('update', onDurationChange);
        runner.checkEq(ms.duration, 5, 'ms.duration');
        runner.checkEq(media.duration, 5, 'media.duration');
        runner.checkLE(videoSb.buffered.end(0), 5.1, 'Range end');
        videoSb.abort();
        videoChain.seek(0);
        appendInit(media, videoSb, videoChain, 0, function() {
          appendUntil(runner.timeouts, media, videoSb, videoChain, 10,
                      function() {
            runner.checkApproxEq(ms.duration, 10, 'ms.duration');
            videoSb.addEventListener('update', function buffersRemoved() {
              videoSb.removeEventListener('update', buffersRemoved);
              var duration = videoSb.buffered.end(0);
              ms.endOfStream();
              runner.checkApproxEq(ms.duration, duration, 'ms.duration', 0.01);
              ms.addEventListener('sourceended', function() {
                runner.checkApproxEq(ms.duration, duration, 'ms.duration',
                                     0.01);
                runner.checkEq(media.duration, duration, 'media.duration');
                ms.addEventListener('sourceclose', onsourceclose);
                media.removeAttribute('src');
                media.load();
              });
              media.play();
            });
            ms.duration = 5;
          });
        });
      });
      ms.duration = 5;
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


var createDelayedTest = function(delayed, nonDelayed) {
  var test = createConformanceTest('Delayed' +
      util.MakeCapitalName(delayed.name), 'MSE');
  test.prototype.title = 'Test if we can play properly when there' +
    ' is not enough ' + delayed.name + ' data. The play should resume once ' +
    delayed.name + ' data is appended.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    // Chrome allows for 3 seconds of underflow for streams that have audio
    // but are video starved. See code.google.com/p/chromium/issues/detail?id=423801
    var underflowTime = 0.0;
    if (delayed.name == 'video') {
      underflowTime = 3.0;
    }
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
        runner.checkLE(media.currentTime, end + 1.0 + underflowTime,
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
        waitUntil(runner.timeouts, media, end + 3, function() {
          runner.checkLE(media.currentTime, end + 1.0 + underflowTime, 'media.currentTime');
          runner.checkGr(media.currentTime, end - 1.0 - underflowTime, 'media.currentTime');
          runner.succeed();
        });
      });
    });
  };
};

createDelayedTest(StreamDef.AudioNormal, StreamDef.VideoNormal);
createDelayedTest(StreamDef.VideoNormal, StreamDef.AudioNormal);


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


var frameTestOnSourceOpen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoChain = new FixedAppendSize(new ResetInit(
      new FileSource(this.filename, runner.XHRManager,
                     runner.timeouts)));
  var videoSb = this.ms.addSourceBuffer(StreamDef.H264.VideoType);
  var audioChain = new FixedAppendSize(new ResetInit(
      new FileSource(StreamDef.AudioNormal.src, runner.XHRManager,
                     runner.timeouts)));
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  media.play();
  playThrough(runner.timeouts, media, 5, 18, videoSb, videoChain,
              audioSb, audioChain, runner.succeed.bind(runner));
};


var testFrameGaps = createConformanceTest('FrameGaps', 'MSE Media');
testFrameGaps.prototype.title = 'Test media with frame durations of 24FPS ' +
    'but segment timing corresponding to 23.976FPS';
testFrameGaps.prototype.filename = StreamDef.H264.FrameGap.src;
testFrameGaps.prototype.onsourceopen = frameTestOnSourceOpen;


var testFrameOverlaps = createConformanceTest('FrameOverlaps', 'MSE Media');
testFrameOverlaps.prototype.title = 'Test media with frame durations of ' +
    '23.976FPS but segment timing corresponding to 24FPS';
testFrameOverlaps.prototype.filename = StreamDef.H264.FrameOverlap.src;
testFrameOverlaps.prototype.onsourceopen = frameTestOnSourceOpen;


var testAAC51 = createConformanceTest('AAC51', 'MSE Media');
testAAC51.prototype.title = 'Test 5.1-channel AAC';
testAAC51.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioSb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var videoSb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var xhr = runner.XHRManager.createRequest(StreamDef.Audio51.src,
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


return {tests: tests, info: info, fields: fields, viewType: 'extra compact'};

};
