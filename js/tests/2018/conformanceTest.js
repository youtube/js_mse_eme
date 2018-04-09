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

var ConformanceTest = function() {

var mseVersion = 'Candidate Recommendation 05 July 2016';
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


var createInitialMediaStateTest = function(state, value, check) {
  var test = createConformanceTest('InitialMedia' +
                                   util.MakeCapitalName(state), 'Media Element Core');

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


var testXHRUint8Array = createConformanceTest('XHRUint8Array', 'XHR');
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


var testXHRAbort = createConformanceTest('XHRAbort', 'XHR');
testXHRAbort.prototype.title = 'Ensure that XHR aborts actually abort by ' +
    'issuing an absurd number of them and then aborting all but one.';
testXHRAbort.prototype.start = function(runner, video) {
  var N = 100;
  var startTime = Date.now();
  var lastAbortTime;
  function startXHR(i) {
    var xhr = runner.XHRManager.createRequest(
        Media.VP9.VideoNormal.src + '?x=' + Date.now() + '.' + i, function() {
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


var testXHROpenState = createConformanceTest('XHROpenState', 'XHR');
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


var testPresence = createConformanceTest('Presence', 'MSE Core');
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


var testAttach = createConformanceTest('Attach', 'MSE Core');
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


var testAddSourceBuffer = createConformanceTest('AddSourceBuffer', 'MSE Core');
testAddSourceBuffer.prototype.title =
    'Test if we can add source buffer';
testAddSourceBuffer.prototype.onsourceopen = function() {
  try {
    this.runner.checkEq(this.ms.sourceBuffers.length, 0, 'Source buffer number');
    this.ms.addSourceBuffer(Media.AAC.mimetype);
    this.runner.checkEq(this.ms.sourceBuffers.length, 1, 'Source buffer number');
    this.ms.addSourceBuffer(Media.VP9.mimetype);
    this.runner.checkEq(this.ms.sourceBuffers.length, 2, 'Source buffer number');
  } catch (e) {
    this.runner.fail(e);
  }
  this.runner.succeed();
};


var testAddSourceBufferException = createConformanceTest('AddSBException',
                                                         'MSE Core');
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
    ms.addSourceBuffer(Media.AAC.mimetype);
  }, DOMException.INVALID_STATE_ERR);

  runner.succeed();
};


var testSourceRemove = createConformanceTest('RemoveSourceBuffer', 'MSE Core');
testSourceRemove.prototype.title = 'Test if we can add/remove source buffers';
testSourceRemove.prototype.onsourceopen = function() {
  var sb = this.ms.addSourceBuffer(Media.AAC.mimetype);
  this.ms.removeSourceBuffer(sb);
  this.runner.checkEq(this.ms.sourceBuffers.length, 0, 'Source buffer number');
  this.ms.addSourceBuffer(Media.AAC.mimetype);
  this.runner.checkEq(this.ms.sourceBuffers.length, 1, 'Source buffer number');
  for (var i = 0; i < 10; ++i) {
    try {
      sb = this.ms.addSourceBuffer(Media.VP9.mimetype);
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


var createInitialMSStateTest = function(state, value, check) {
  var test = createConformanceTest('InitialMS' + util.MakeCapitalName(state),
                                   'MSE Core');

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


var testDuration = createConformanceTest('Duration', 'MSE Core');
testDuration.prototype.title =
    'Test if we can set duration.';
testDuration.prototype.onsourceopen = function() {
  this.ms.duration = 10;
  this.runner.checkEq(this.ms.duration, 10, 'ms.duration');
  this.runner.succeed();
};


var mediaElementEvents = createConformanceTest('MediaElementEvents', 'MSE Core');
mediaElementEvents.prototype.title = 'Test events on the MediaElement.';
mediaElementEvents.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var ms = this.ms;
  var audioStream = Media.AAC.Audio1MB;
  var videoStream = Media.VP9.Video1MB;
  var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
  var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
  var self = this;
  var videoXhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
    self.log('onload called');
    var onUpdate = function() {
      videoSb.removeEventListener('update', onUpdate);
      setDuration(1.0, ms, [videoSb, audioSb], function() {
        if (audioSb.updating || videoSb.updating) {
          runner.fail('Source buffers are updating on duration change.');
          return;
        }
        ms.endOfStream();
        media.play();
      });
    }
    videoSb.addEventListener('update', onUpdate);
    videoSb.appendBuffer(videoXhr.getResponseData());
  });
  var audioXhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
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


var mediaSourceEvents = createConformanceTest('MediaSourceEvents', 'MSE Core');
mediaSourceEvents.prototype.title = 'Test if the events on MediaSource are correct.';
mediaSourceEvents.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var ms = this.ms;
  var audioStream = Media.AAC.Audio1MB;
  var videoStream = Media.VP9.Video1MB;
  var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
  var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
  var lastState = 'open';
  var self = this;
  var videoXhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
      self.log('onload called');
      videoSb.appendBuffer(videoXhr.getResponseData());
      videoSb.abort();
      ms.endOfStream();
    });
  var audioXhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
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


var testBufferSize = createConformanceTest('VideoBufferSize', 'MSE Core');
testBufferSize.prototype.title = 'Determines video buffer sizes by ' +
    'appending incrementally until discard occurs, and tests that it meets ' +
    'the minimum requirements for streaming.';
testBufferSize.prototype.onsourceopen = function() {
  var runner = this.runner;
  // The test clip has a bitrate which is nearly exactly 1MB/sec, and
  // lasts 1s. We start appending it repeatedly until we get eviction.
  var videoStream = Media.VP9.Video1MB;
  var sb = this.ms.addSourceBuffer(videoStream.mimetype);
  var audioStream = Media.AAC.Audio1MB;
  var unused_audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
  var self = this;
  var MIN_SIZE = 12 * 1024 * 1024;
  var ESTIMATED_MIN_TIME = 12;
  var xhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
    var onBufferFull = function() {
      runner.checkGE(expectedTime - sb.buffered.start(0), ESTIMATED_MIN_TIME,
                     'Estimated source buffer size');
      runner.succeed();
    };
    var expectedTime = 0;
    var expectedSize = 0;
    var appendCount = 0;
    sb.addEventListener('updateend', function onUpdate() {
      appendCount++;
      self.log('Append count ' + appendCount);
      if (sb.buffered.start(0) > 0 || expectedTime > sb.buffered.end(0)) {
        sb.removeEventListener('updateend', onUpdate);
        onBufferFull();
      } else {
        expectedTime += videoStream.duration;
        expectedSize += videoStream.size;
        // Pass the test if the UA can handle 10x more than expected.
        if (expectedSize > (10 * MIN_SIZE)) {
          sb.removeEventListener('updateend', onUpdate);
          onBufferFull();
	  return;
        }
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
    sb.appendBuffer(xhr.getResponseData());
  });
  xhr.send();
};


var testStartPlayWithoutData = createConformanceTest('StartPlayWithoutData',
                                                     'MSE Core');
testStartPlayWithoutData.prototype.title =
    'Test if we can start play before feeding any data. The play should ' +
    'start automatically after data is appended';
testStartPlayWithoutData.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioStream = Media.AAC.AudioHuge;
  var videoStream = Media.VP9.VideoHuge;
  var videoChain = new ResetInit(
      new FileSource(videoStream.src, runner.XHRManager, runner.timeouts));
  var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
  var audioChain = new ResetInit(
      new FileSource(audioStream.src, runner.XHRManager, runner.timeouts));
  var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);

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


var testEventTimestamp = createConformanceTest('EventTimestamp', 'MSE Core');
testEventTimestamp.prototype.title = 'Test Event Timestamp is relative to ' +
    'the initial page load';
testEventTimestamp.prototype.onsourceopen = function() {
  var runner = this.runner;
  var video = this.video;
  var videoStream = Media.VP9.VideoTiny;
  var audioStream = Media.AAC.AudioTiny;
  var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
  var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
  runner.checkGr(Date.now(), 1360000000000, 'Date.now()');
  var lastTime = 0.0;
  var requestCounter = 0;

  var audioXhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
    audioSb.appendBuffer(this.getResponseData());
    video.addEventListener('timeupdate', function(e) {
      runner.checkGE(e.timeStamp, lastTime, 'event.timeStamp');
      lastTime = e.timeStamp;
      if (!video.paused && video.currentTime >= 2 && requestCounter >= 3) {
        runner.succeed();
      }
      requestCounter++;
    });
    video.play();
  }, 0, 500000);

  var videoXhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
    videoSb.appendBuffer(this.getResponseData());
    audioXhr.send();
  }, 0, 1500000);
  videoXhr.send();
};


var testSeekTimeUpdate = createConformanceTest('SeekTimeUpdate', 'MSE Core');
testSeekTimeUpdate.prototype.title =
  'Timeupdate event fired with correct currentTime after seeking.';
testSeekTimeUpdate.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var videoStream = Media.VP9.VideoNormal;
  var audioStream = Media.AAC.AudioNormal;
  var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
  var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
  var lastTime = 0;
  var updateCount = 0;
  var xhr = runner.XHRManager.createRequest(videoStream.src, function() {
    videoSb.appendBuffer(xhr.getResponseData());
    var xhr2 = runner.XHRManager.createRequest(audioStream.src, function() {
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


var createSupportTest = function(mimetype, desc) {
  var test = createConformanceTest(desc + 'Support', 'MSE Formats');
  test.prototype.title =
      'Test if we support ' + desc + ' with mimetype: ' + mimetype;
  test.prototype.onsourceopen = function() {
    try {
      this.log('Trying format ' + mimetype);
      var src = this.ms.addSourceBuffer(mimetype);
    } catch (e) {
      return this.runner.fail(e);
    }
    this.runner.succeed();
  };
};

createSupportTest(Media.AAC.mimetype, 'AAC');
createSupportTest(Media.H264.mimetype, 'H264');
createSupportTest(Media.VP9.mimetype, 'VP9');
createSupportTest(Media.Opus.mimetype, 'Opus');


var createAppendTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      'Append' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test if we can append a whole ' +
      stream.mediatype + ' file whose size is 1MB.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
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
          if (e.code === e.INVALID_STATE_ERR) {
            runner.succeed();
          } else {
            runner.fail('Invalid error on double append: ' + e);
          }
          caught = true;
        }

        if (!caught) {
          // We may have updated so fast that we didn't encounter the error.
          if (sb.updating) {
            // Not a great check due to race conditions, but will have to do.
            runner.fail('Implementation did not throw INVALID_STATE_ERR.');
          } else {
            runner.succeed();
          }
        }
      }
      sb.addEventListener('updateend', updateEnd);
      sb.appendBuffer(data);
    });
    xhr.send();
  };
};


var createAbortTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      'Abort' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test if we can abort the current segment.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
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


var createTimestampOffsetTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      'TimestampOffset' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test if we can set timestamp offset.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
    var xhr = runner.XHRManager.createRequest(stream.src, function(e) {
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


var createDASHLatencyTest = function(videoStream, audioStream) {
  var test = createConformanceTest('DASHLatency' + videoStream.codec,
      'MSE (' + videoStream.codec + ')');
  test.prototype.title = 'Test SourceBuffer DASH switch latency';
  test.prototype.onsourceopen = function() {
    var self = this;
    var runner = this.runner;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var video = this.video;

    var videoXhr = runner.XHRManager.createRequest(videoStream.src,
        function(e) {
      var videoContent = videoXhr.getResponseData();
      var expectedTime = 0;
      var loopCount = 0;
      var MAX_ITER = 300;
      var OVERFLOW_OFFSET = 1.0;

      var onBufferFull = function() {
        var bufferSize = loopCount * videoStream.size / 1048576;
        self.log('Buffer size: ' + Math.round(bufferSize) + 'MB');

        var DASH_MAX_LATENCY = 1;
        var newContentStartTime = videoSb.buffered.start(0) + 2;
        self.log('Source buffer updated as exceeding buffer limit');

        video.addEventListener('timeupdate', function onTimeUpdate(e) {
          if (video.currentTime > newContentStartTime + DASH_MAX_LATENCY) {
            video.removeEventListener('timeupdate', onTimeUpdate);
            runner.succeed();
          }
        });
        video.play();
      }

      videoSb.addEventListener('update', function onUpdate() {
        expectedTime += videoStream.duration;
        videoSb.timestampOffset = expectedTime;
        loopCount++;

        if (loopCount > MAX_ITER) {
          videoSb.removeEventListener('update', onUpdate);
          runner.fail('Failed to fill up source buffer.');
          return;
        }

        // Fill up the buffer such that it overflow implementations.
        if (expectedTime > videoSb.buffered.end(0) + OVERFLOW_OFFSET) {
          videoSb.removeEventListener('update', onUpdate);
          onBufferFull();
        }
        try {
          videoSb.appendBuffer(videoContent);
        } catch (e) {
          videoSb.removeEventListener('update', onUpdate);
          var QUOTA_EXCEEDED_ERROR_CODE = 22;
          if (e.code == QUOTA_EXCEEDED_ERROR_CODE) {
            onBufferFull();
          } else {
            runner.fail(e);
          }
        }
      });
      videoSb.appendBuffer(videoContent);;
    });

    var audioXhr = runner.XHRManager.createRequest(audioStream.src,
        function(e) {
      var audioContent = audioXhr.getResponseData();
      audioSb.appendBuffer(audioContent);
      videoXhr.send();
    });
    audioXhr.send();
  };
};


var createDurationAfterAppendTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      'DurationAfterAppend' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test if the duration expands after appending data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.mimetype);
    var unused_sb = ms.addSourceBuffer(unused_stream.mimetype);
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

          halfDuration = sb.buffered.end(0) / 2;
          setDuration(halfDuration, ms, sb, function() {
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
        };

        sb.addEventListener('updateend', updateCb);
        sb.appendBuffer(data);
      });
    xhr.send();
  };
};


var createPausedTest = function(stream) {
  var test = createConformanceTest(
      'PausedStateWith' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test if the paused state is correct before or ' +
      ' after appending data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.mimetype);

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


var createVideoDimensionTest = function(videoStream, audioStream) {
  var test = createConformanceTest('VideoDimension' + videoStream.codec,
      'MSE (' + videoStream.codec + ')');
  test.prototype.title =
      'Test if the readyState transition is correct.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var videoChain = new ResetInit(new FixedAppendSize(
        new FileSource(videoStream.src, runner.XHRManager, runner.timeouts),
        65536));
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
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
    var audioXhr = runner.XHRManager.createRequest(audioStream.src,
        function(e) {
      var audioContent = audioXhr.getResponseData();
      audioSb.appendBuffer(audioContent);
      appendInit(media, videoSb, videoChain, 0, checkSuccess);
    });
    audioXhr.send();
  };
};


var createPlaybackStateTest = function(stream) {
  var test = createConformanceTest('PlaybackState' + stream.codec,
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test if the playback state transition is correct.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var videoStream = stream;
    var audioStream = Media.AAC.AudioTiny;
    var videoChain = new ResetInit(new FixedAppendSize(
	new FileSource(videoStream.src, runner.XHRManager, runner.timeouts),
	65536));
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioChain = new ResetInit(new FixedAppendSize(
	new FileSource(audioStream.src, runner.XHRManager, runner.timeouts),
	65536));
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
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
};


var createPlayPartialSegmentTest = function(stream) {
  var test = createConformanceTest('PlayPartial' + stream.codec + 'Segment',
      'MSE (' + stream.codec + ')');
  test.prototype.title =
      'Test if we can play a partially appended video segment.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var videoStream = stream;
    var audioStream = Media.AAC.AudioTiny;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var videoXhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
      videoSb.appendBuffer(this.getResponseData());
      video.addEventListener('timeupdate', function(e) {
	if (!video.paused && video.currentTime >= 2) {
	  runner.succeed();
	}
      });
      video.play();
    }, 0, 1500000);
    var audioXhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
      audioSb.appendBuffer(this.getResponseData());
      videoXhr.send();
    }, 0, 500000);
    audioXhr.send();
  };
};


var createIncrementalAudioTest = function(stream) {
  var test = createConformanceTest('Incremental' + stream.codec + 'Audio',
      'MSE (' + stream.codec + ')');
  test.prototype.title =
      'Test if we can play a partially appended audio segment.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(Media.VP9.mimetype);
    var xhr = runner.XHRManager.createRequest(stream.src, function(e) {
      sb.appendBuffer(xhr.getResponseData());
      sb.addEventListener('updateend', function() {
	runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
	runner.checkEq(sb.buffered.start(0), 0, 'Range start');
	runner.checkApproxEq(sb.buffered.end(0), stream.get(200000), 'Range end');
	runner.succeed();
      });
    }, 0, 200000);
    xhr.send();
  };
};


var createAppendAudioOffsetTest = function(stream1, stream2) {
  var test = createConformanceTest('Append' + stream1.codec + 'AudioOffset',
      'MSE (' + stream1.codec + ')');
  test.prototype.title =
      'Test if we can append audio data with an explicit offset.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var unused_sb = this.ms.addSourceBuffer(Media.VP9.mimetype);
    var sb = this.ms.addSourceBuffer(stream1.mimetype);
    var xhr = runner.XHRManager.createRequest(stream1.src, function(e) {
      sb.timestampOffset = 5;
      sb.appendBuffer(this.getResponseData());
      sb.addEventListener('updateend', function callXhr2() {
	sb.removeEventListener('updateend', callXhr2);
	xhr2.send();
      });
    }, 0, 200000);
    var xhr2 = runner.XHRManager.createRequest(stream2.src, function(e) {
      sb.abort();
      sb.timestampOffset = 0;
      sb.appendBuffer(this.getResponseData());
      sb.addEventListener('updateend', function() {
	runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
	runner.checkEq(sb.buffered.start(0), 0, 'Range start');
	runner.checkApproxEq(sb.buffered.end(0),
	  stream2.get('appendAudioOffset'), 'Range end');
	runner.succeed();
      });
    }, 0, 200000);
    xhr.send();
  };
};


var createAppendVideoOffsetTest = function(stream1, stream2, audioStream) {
  var test = createConformanceTest('Append' + stream1.codec + 'VideoOffset',
      'MSE (' + stream1.codec + ')');
  test.prototype.title =
      'Test if we can append video data with an explicit offset.';
  test.prototype.onsourceopen = function() {
    var self = this;
    var runner = this.runner;
    var video = this.video;
    var sb = this.ms.addSourceBuffer(stream1.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var xhr = runner.XHRManager.createRequest(stream1.src, function(e) {
      sb.timestampOffset = 5;
      sb.appendBuffer(this.getResponseData());
      sb.addEventListener('update', function callXhr2() {
        sb.removeEventListener('update', callXhr2);
        xhr2.send();
      });
    }, 0, 200000);
    var xhr2 = runner.XHRManager.createRequest(stream2.src, function(e) {
      sb.abort();
      sb.timestampOffset = 0;
      sb.appendBuffer(this.getResponseData());
      sb.addEventListener('updateend', function() {
        runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(sb.buffered.start(0), 0, 'Range start');
        runner.checkApproxEq(sb.buffered.end(0),
            stream2.get('videoChangeRate'), 'Range end');
        callAfterLoadedMetaData(video, function() {
          video.addEventListener('seeked', function(e) {
            self.log('seeked called');
            video.addEventListener('timeupdate', function(e) {
              self.log('timeupdate called with ' + video.currentTime);
              if (!video.paused && video.currentTime >= 6) {
                runner.succeed();
              }
            });
          });
          video.currentTime = 6;
        });
      });
      video.play();
    }, 0, 400000);
    this.ms.duration = 100000000;  // Ensure that we can seek to any position.
    var audioXhr = runner.XHRManager.createRequest(audioStream.src,
        function(e) {
      var audioContent = audioXhr.getResponseData();
      audioSb.appendBuffer(audioContent);
      xhr.send();
    });
    audioXhr.send();
  };
};


var createAppendMultipleInitTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      'AppendMultipleInit' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test if we can append multiple init segments.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FileSource(stream.src, runner.XHRManager, runner.timeouts,
                               0, stream.size, stream.size);
    var src = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
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


var createAppendOutOfOrderTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      'Append' + stream.codec + util.MakeCapitalName(stream.mediatype) + 'OutOfOrder',
      'MSE (' + stream.codec + ')');
  test.prototype.title = 'Test appending segments out of order.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FileSource(stream.src, runner.XHRManager,
	runner.timeouts);
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
    var bufs = [];

    var i = 0;
    // Append order of the segments.
    var appendOrder = [0, 2, 1, 4, 3];
    // Number of segments given the append order, since segments get merged.
    var bufferedLength = [0, 1, 1, 2, 1];

    sb.addEventListener('updateend', function() {
      runner.checkEq(sb.buffered.length, bufferedLength[i],
          'Source buffer number');
      if (i == 1) {
        runner.checkGr(sb.buffered.start(0), 0, 'Range start');
      } else if (i > 0) {
        runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      }

      i++;
      if (i >= bufs.length) {
        runner.succeed();
      } else {
        sb.appendBuffer(bufs[appendOrder[i]]);
      }
    });

    chain.init(0, function(buf) {
      bufs.push(buf);
      chain.pull(function(buf) {
	bufs.push(buf);
	chain.pull(function(buf) {
	  bufs.push(buf);
	  chain.pull(function(buf) {
	    bufs.push(buf);
	    chain.pull(function(buf) {
	      bufs.push(buf);
	      sb.appendBuffer(bufs[0]);
	    });
	  });
	});
      });
    });
  };
};


var createBufferedRangeTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      'BufferedRange' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')');
  test.prototype.title =
      'Test SourceBuffer.buffered get updated correctly after feeding data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new ResetInit(
	new FileSource(stream.src, runner.XHRManager, runner.timeouts));
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);

    runner.checkEq(sb.buffered.length, 0, 'Source buffer number');
    appendInit(media, sb, chain, 0, function() {
      runner.checkEq(sb.buffered.length, 0, 'Source buffer number');
      appendUntil(runner.timeouts, media, sb, chain, 5, function() {
	runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
	runner.checkEq(sb.buffered.start(0), 0, 'Source buffer number');
	runner.checkGE(sb.buffered.end(0), 5, 'Range end');
	runner.succeed();
      });
    });
  };
};


var createMediaSourceDurationTest = function(videoStream, audioStream) {
  var test = createConformanceTest('MediaSourceDuration' + videoStream.codec,
      'MSE (' + videoStream.codec + ')');
  test.prototype.title = 'Test if the duration on MediaSource can be set and ' +
      'retrieved sucessfully.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var videoChain = new ResetInit(
        new FileSource(videoStream.src, runner.XHRManager, runner.timeouts));
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var self = this;
    var onsourceclose = function() {
      self.log('onsourceclose called');
      runner.assert(isNaN(ms.duration));
      runner.succeed();
    };

    var appendVideo = function() {
      runner.assert(isNaN(media.duration), 'Initial media duration not NaN');
      media.play();
      appendInit(media, videoSb, videoChain, 0, function() {
        appendUntil(runner.timeouts, media, videoSb, videoChain, 10,
            function() {
          setDuration(5, ms, [videoSb, audioSb], function() {
            runner.checkEq(ms.duration, 5, 'ms.duration');
            runner.checkEq(media.duration, 5, 'media.duration');
            runner.checkLE(videoSb.buffered.end(0), 5.1, 'Range end');
            videoSb.abort();
            videoChain.seek(0);
            appendInit(media, videoSb, videoChain, 0, function() {
              appendUntil(runner.timeouts, media, videoSb, videoChain, 10,
                          function() {
                runner.checkApproxEq(ms.duration, 10, 'ms.duration');
                setDuration(5, ms, [videoSb, audioSb], function() {
                  if (videoSb.updating) {
                    runner.fail('Source buffer is updating on duration change');
                    return;
                  }
                  var duration = videoSb.buffered.end(0);
                  ms.endOfStream();
                  runner.checkApproxEq(ms.duration, duration, 'ms.duration',
                                       0.01);
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
              });
            });
          });
        });
      });
    };

    var audioXhr = runner.XHRManager.createRequest(audioStream.src,
        function(e) {
      audioSb.addEventListener('updateend', function onAudioUpdate() {
        audioSb.removeEventListener('updateend', onAudioUpdate);
        appendVideo();
      });
      var audioContent = audioXhr.getResponseData();
      audioSb.appendBuffer(audioContent);
    });
    audioXhr.send();
  };
};


var createOverlapTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      stream.codec + util.MakeCapitalName(stream.mediatype) + 'WithOverlap',
      'MSE (' + stream.codec + ')');
  test.prototype.title =
      'Test if media data with overlap will be merged into one range.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new ResetInit(
	new FileSource(stream.src, runner.XHRManager, runner.timeouts));
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
    var GAP = 0.1;

    appendInit(media, sb, chain, 0, function() {
      chain.pull(function(buf) {
	sb.addEventListener('update', function appendOuter() {
	  sb.removeEventListener('update', appendOuter);
	  runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
	  var segmentDuration = sb.buffered.end(0);
	  sb.timestampOffset = segmentDuration - GAP;
	  chain.seek(0);
	  chain.pull(function(buf) {
	    sb.addEventListener('update', function appendMiddle() {
	      sb.removeEventListener('update', appendMiddle);
	      chain.pull(function(buf) {
		sb.addEventListener('update', function appendInner() {
		  runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
		  runner.checkApproxEq(sb.buffered.end(0),
				       segmentDuration * 2 - GAP, 'Range end');
		  runner.succeed();
		});
		runner.assert(safeAppend(sb, buf), 'safeAppend failed');
	      });
	    });
	    runner.assert(safeAppend(sb, buf), 'safeAppend failed');
	  });
	});
	runner.assert(safeAppend(sb, buf), 'safeAppend failed');
      });
    });
  };
};


var createSmallGapTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      stream.codec + util.MakeCapitalName(stream.mediatype) + 'WithSmallGap',
      'MSE (' + stream.codec + ')');
  test.prototype.title =
      'Test if media data with a gap smaller than an media frame size ' +
      'will be merged into one buffered range.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new ResetInit(
        new FileSource(stream.src, runner.XHRManager, runner.timeouts));
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
    var GAP = 0.01;

    appendInit(media, sb, chain, 0, function() {
      chain.pull(function(buf) {
        sb.addEventListener('update', function appendOuter() {
          sb.removeEventListener('update', appendOuter);
          runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
          var segmentDuration = sb.buffered.end(0);
          sb.timestampOffset = segmentDuration + GAP;
          chain.seek(0);
          chain.pull(function(buf) {
            sb.addEventListener('update', function appendMiddle() {
              sb.removeEventListener('update', appendMiddle);
              chain.pull(function(buf) {
                sb.addEventListener('update', function appendInner() {
                  runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
                  runner.checkApproxEq(sb.buffered.end(0),
                                       segmentDuration * 2 + GAP, 'Range end');
                  runner.succeed();
                });
                runner.assert(safeAppend(sb, buf), 'safeAppend failed');
              });
            });
            runner.assert(safeAppend(sb, buf), 'safeAppend failed');
          });
        });
        runner.assert(safeAppend(sb, buf), 'safeAppend failed');
      });
    });
  };
};


var createLargeGapTest = function(stream, unused_stream) {
  var test = createConformanceTest(
      stream.codec + util.MakeCapitalName(stream.mediatype) + 'WithLargeGap',
      'MSE (' + stream.codec + ')');
  test.prototype.title =
      'Test if media data with a gap larger than an media frame size ' +
      'will not be merged into one buffered range.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new ResetInit(
        new FileSource(stream.src, runner.XHRManager, runner.timeouts));
    var sb = this.ms.addSourceBuffer(stream.mimetype);
    var unused_sb = this.ms.addSourceBuffer(unused_stream.mimetype);
    var GAP = 0.3;

    appendInit(media, sb, chain, 0, function() {
      chain.pull(function(buf) {
        sb.addEventListener('update', function appendOuter() {
          sb.removeEventListener('update', appendOuter);
          runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
          var segmentDuration = sb.buffered.end(0);
          sb.timestampOffset = segmentDuration + GAP;
          chain.seek(0);
          chain.pull(function(buf) {
            sb.addEventListener('update', function appendMiddle() {
              sb.removeEventListener('update', appendMiddle);
              chain.pull(function(buf) {
                sb.addEventListener('update', function appendInner() {
                  runner.checkEq(sb.buffered.length, 2, 'Source buffer number');
                  runner.succeed();
                });
                runner.assert(safeAppend(sb, buf), 'safeAppend failed');
              });
            });
            runner.assert(safeAppend(sb, buf), 'safeAppend failed');
          });
        });
        runner.assert(safeAppend(sb, buf), 'safeAppend failed');
      });
    });
  };
};


var createSeekTest = function(videoStream) {
  var test = createConformanceTest('Seek' + videoStream.codec,
      'MSE (' + videoStream.codec + ')');
  test.prototype.title = 'Test if we can seek during playing. It' +
      ' also tests if the implementation properly supports seek operation' +
      ' fired immediately after another seek that hasn\'t been completed.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var audioStream = Media.AAC.AudioNormal;
    var videoChain = new ResetInit(new FileSource(
        videoStream.src, runner.XHRManager, runner.timeouts));
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioChain = new ResetInit(new FileSource(
        audioStream.src, runner.XHRManager, runner.timeouts));
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
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
};


var createBufUnbufSeekTest = function(videoStream) {
  var test = createConformanceTest('BufUnbufSeek' + videoStream.codec,
      'MSE (' + videoStream.codec + ')');
  test.prototype.title = 'Seek into and out of a buffered region.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var audioStream = Media.AAC.AudioNormal;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var xhr = runner.XHRManager.createRequest(videoStream.src, function() {
      videoSb.appendBuffer(xhr.getResponseData());
      var xhr2 = runner.XHRManager.createRequest(audioStream.src, function() {
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
};


var createDelayedTest = function(delayed, nonDelayed) {
  var test = createConformanceTest(
      'Delayed' + delayed.codec + util.MakeCapitalName(delayed.mediatype),
      'MSE (' + delayed.codec + ')');
  test.prototype.title = 'Test if we can play properly when there' +
    ' is not enough ' + delayed.mediatype + ' data. The play should resume once ' +
    delayed.mediatype + ' data is appended.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    // Chrome allows for 3 seconds of underflow for streams that have audio
    // but are video starved. See code.google.com/p/chromium/issues/detail?id=423801
    var underflowTime = 0.0;
    if (delayed.mediatype == 'video') {
      underflowTime = 3.0;
    }
    var chain = new FixedAppendSize(
      new ResetInit(
        new FileSource(nonDelayed.src, runner.XHRManager, runner.timeouts)
      ), 16384);
    var src = this.ms.addSourceBuffer(nonDelayed.mimetype);
    var delayedChain = new FixedAppendSize(
      new ResetInit(
        new FileSource(delayed.src, runner.XHRManager, runner.timeouts)
      ), 16384);
    var delayedSrc = this.ms.addSourceBuffer(delayed.mimetype);
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


// Opus Specific tests.
createAppendTest(Media.Opus.SantaHigh, Media.VP9.Video1MB);
createAbortTest(Media.Opus.SantaHigh, Media.VP9.Video1MB);
createTimestampOffsetTest(Media.Opus.CarLow, Media.VP9.Video1MB);
createDurationAfterAppendTest(Media.Opus.CarLow, Media.VP9.Video1MB);
createPausedTest(Media.Opus.CarLow);
createIncrementalAudioTest(Media.Opus.CarMed);
createAppendAudioOffsetTest(Media.Opus.CarMed, Media.Opus.CarHigh);
createAppendMultipleInitTest(Media.Opus.CarLow, Media.VP9.Video1MB);
createAppendOutOfOrderTest(Media.Opus.CarMed, Media.VP9.Video1MB);
createBufferedRangeTest(Media.Opus.CarMed, Media.VP9.Video1MB);
createOverlapTest(Media.Opus.CarMed, Media.VP9.Video1MB);
createSmallGapTest(Media.Opus.CarMed, Media.VP9.Video1MB);
createLargeGapTest(Media.Opus.CarMed, Media.VP9.Video1MB);
createDelayedTest(Media.Opus.CarMed, Media.VP9.VideoNormal);


// AAC Specific tests.
createAppendTest(Media.AAC.Audio1MB, Media.H264.Video1MB);
createAbortTest(Media.AAC.Audio1MB, Media.H264.Video1MB);
createTimestampOffsetTest(Media.AAC.Audio1MB, Media.H264.Video1MB);
createDurationAfterAppendTest(Media.AAC.Audio1MB, Media.H264.Video1MB);
createPausedTest(Media.AAC.Audio1MB);
createIncrementalAudioTest(Media.AAC.AudioNormal, Media.H264.Video1MB);
createAppendAudioOffsetTest(Media.AAC.AudioNormal, Media.AAC.AudioHuge);
createAppendMultipleInitTest(Media.AAC.Audio1MB, Media.H264.Video1MB);
createAppendOutOfOrderTest(Media.AAC.AudioNormal, Media.H264.Video1MB);
createBufferedRangeTest(Media.AAC.AudioNormal, Media.H264.Video1MB);
createOverlapTest(Media.AAC.AudioNormal, Media.H264.Video1MB);
createSmallGapTest(Media.AAC.AudioNormal, Media.H264.Video1MB);
createLargeGapTest(Media.AAC.AudioNormal, Media.H264.Video1MB);
createDelayedTest(Media.AAC.AudioNormal, Media.VP9.VideoNormal);

// VP9 Specific tests.
createAppendTest(Media.VP9.Video1MB, Media.AAC.Audio1MB);
createAbortTest(Media.VP9.Video1MB, Media.AAC.Audio1MB);
createTimestampOffsetTest(Media.VP9.Video1MB, Media.AAC.Audio1MB);
createDASHLatencyTest(Media.VP9.VideoTiny, Media.AAC.Audio1MB);
createDurationAfterAppendTest(Media.VP9.Video1MB, Media.AAC.Audio1MB);
createPausedTest(Media.VP9.Video1MB);
createVideoDimensionTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);
createPlaybackStateTest(Media.VP9.VideoNormal);
createPlayPartialSegmentTest(Media.VP9.VideoTiny);
createAppendVideoOffsetTest(Media.VP9.VideoNormal, Media.VP9.VideoTiny,
                            Media.AAC.AudioNormal);
createAppendMultipleInitTest(Media.VP9.Video1MB, Media.AAC.Audio1MB);
createAppendOutOfOrderTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);
createBufferedRangeTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);
createMediaSourceDurationTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);
createOverlapTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);
createSmallGapTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);
createLargeGapTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);
createSeekTest(Media.VP9.VideoNormal);
createBufUnbufSeekTest(Media.VP9.VideoNormal);
createDelayedTest(Media.VP9.VideoNormal, Media.AAC.AudioNormal);

// H264 Specific tests.
createAppendTest(Media.H264.Video1MB, Media.AAC.Audio1MB);
createAbortTest(Media.H264.Video1MB, Media.AAC.Audio1MB);
createTimestampOffsetTest(Media.H264.Video1MB, Media.AAC.Audio1MB);
createDASHLatencyTest(Media.H264.VideoTiny, Media.AAC.Audio1MB);
createDurationAfterAppendTest(Media.H264.Video1MB, Media.AAC.Audio1MB);
createPausedTest(Media.H264.Video1MB);
createVideoDimensionTest(Media.H264.VideoNormal, Media.AAC.Audio1MB);
createPlaybackStateTest(Media.H264.VideoNormal);
createPlayPartialSegmentTest(Media.H264.VideoTiny);
createAppendVideoOffsetTest(Media.H264.VideoNormal, Media.H264.VideoTiny,
                            Media.AAC.Audio1MB);
createAppendMultipleInitTest(Media.H264.Video1MB, Media.AAC.Audio1MB);
createAppendOutOfOrderTest(Media.H264.CarMedium, Media.AAC.Audio1MB);
createBufferedRangeTest(Media.H264.VideoNormal, Media.AAC.Audio1MB);
createMediaSourceDurationTest(Media.H264.VideoNormal, Media.AAC.Audio1MB);
createOverlapTest(Media.H264.VideoNormal, Media.AAC.Audio1MB);
createSmallGapTest(Media.H264.VideoNormal, Media.AAC.Audio1MB);
createLargeGapTest(Media.H264.VideoNormal, Media.AAC.Audio1MB);
createSeekTest(Media.H264.VideoNormal);
createBufUnbufSeekTest(Media.H264.VideoNormal);
createDelayedTest(Media.H264.VideoNormal, Media.AAC.AudioNormal);


var testWAAContext = createConformanceTest('WAAPresence', 'MSE WAA');
testWAAContext.prototype.title = '' + 'Test if AudioContext is supported';
testWAAContext.prototype.start = function(runner, video) {
  var Ctor = window.AudioContext || window.webkitAudioContext;

  if (!Ctor)
    return runner.fail('No AudioContext object available.');

  var ctx = new Ctor();
  if (!ctx)
    return runner.fail('Found AudioContext but could not create one');

  runner.succeed();
};


var createCreateMESTest = function(audioStream, videoStream) {
  var test = createConformanceTest(
    audioStream.codec + '/' + videoStream.codec + 'CreateMediaElementSource',
    'MSE WAA (Optional)',
    false);
  test.prototype.title = '' +
      'Test if AudioContext#createMediaElementSource supports mimetype ' +
      audioStream.mimetype + '/' + videoStream.mimetype;
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var self = this;

    var Ctor = window.AudioContext || window.webkitAudioContext;
    var ctx = self.ctx = new Ctor();

    try {
      var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
      var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    } catch (e) {
      runner.fail(e.message);
      return;
    }

    var audioXhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
      var data = audioXhr.getResponseData();
      function updateEnd(e) {
        runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(audioSb.buffered.start(0), 0, 'Range start');
        runner.checkApproxEq(audioSb.buffered.end(0), audioStream.duration,
            'Range end');
        audioSb.removeEventListener('updateend', updateEnd);
        video.play();
      }
      audioSb.addEventListener('updateend', updateEnd);
      audioSb.appendBuffer(data);
    });

    var videoXhr = runner.XHRManager.createRequest(videoStream.src,
        function(e) {
      var data = videoXhr.getResponseData();
      videoSb.appendBuffer(data);
      audioXhr.send();
    });
    videoXhr.send();

    video.addEventListener('timeupdate', function onTimeUpdate() {
      if (!video.paused && video.currentTime >= 5) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        try {
          runner.log('Creating MES');
          var source = ctx.createMediaElementSource(video);
        } catch (e) {
          runner.fail(e);
          return;
        }
        runner.checkNE(source, null, 'MediaElementSource');
        runner.succeed();
      }
    });
  }
}


createCreateMESTest(Media.Opus.CarLow, Media.VP9.VideoNormal);
createCreateMESTest(Media.AAC.Audio1MB, Media.VP9.VideoNormal);
createCreateMESTest(Media.AAC.Audio1MB, Media.H264.VideoNormal);


var frameTestOnSourceOpen = function() {
  var runner = this.runner;
  var media = this.video;
  var audioStream = Media.AAC.AudioNormal;
  var videoChain = new FixedAppendSize(new ResetInit(
      new FileSource(this.filename, runner.XHRManager, runner.timeouts)));
  var videoSb = this.ms.addSourceBuffer(Media.H264.mimetype);
  var audioChain = new FixedAppendSize(new ResetInit(
      new FileSource(audioStream.src, runner.XHRManager, runner.timeouts)));
  var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
  media.play();
  playThrough(runner.timeouts, media, 5, 18, videoSb, videoChain,
              audioSb, audioChain, runner.succeed.bind(runner));
};


var testFrameGaps = createConformanceTest('H264FrameGaps', 'Media');
testFrameGaps.prototype.title = 'Test media with frame durations of 24FPS ' +
    'but segment timing corresponding to 23.976FPS';
testFrameGaps.prototype.filename = Media.H264.FrameGap.src;
testFrameGaps.prototype.onsourceopen = frameTestOnSourceOpen;


var testFrameOverlaps = createConformanceTest('H264FrameOverlaps', 'Media');
testFrameOverlaps.prototype.title = 'Test media with frame durations of ' +
    '23.976FPS but segment timing corresponding to 24FPS';
testFrameOverlaps.prototype.filename = Media.H264.FrameOverlap.src;
testFrameOverlaps.prototype.onsourceopen = frameTestOnSourceOpen;


var createAudio51Test = function(audioStream, optional) {
  optional = !optional;
  var test = createConformanceTest(audioStream.codec + '5.1', 'Media',
                                   optional);
  test.prototype.title = 'Test 5.1-channel ' + audioStream.codec;
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var videoStream = Media.VP9.VideoNormal;
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var xhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
      audioSb.appendBuffer(xhr.getResponseData());
      var xhr2 = runner.XHRManager.createRequest(videoStream.src, function(e) {
          videoSb.appendBuffer(xhr2.getResponseData());
          media.play();
          media.addEventListener('timeupdate', function(e) {
            if (!media.paused && media.currentTime > 2) {
              runner.succeed();
            }
          });
        }, 0, 3000000);
      xhr2.send();
    });
    xhr.send();
  }
}


createAudio51Test(Media.Opus.Audio51);
createAudio51Test(Media.AAC.Audio51, true);


var createHeAacTest = function(audioStream) {
  var test = createConformanceTest('HE-AAC/' +
      audioStream.get('sbrSignaling') + 'SBR', 'Media');
  test.prototype.title = 'Test playback of HE-AAC with ' +
      audioStream.get('sbrSignaling') +  ' SBR signaling.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var videoStream = Media.VP9.Video1MB;
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var xhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
      audioSb.addEventListener('update', function() {
        var xhr2 = runner.XHRManager.createRequest(videoStream.src,
            function(e) {
          videoSb.addEventListener('update', function() {
            ms.endOfStream();
            media.addEventListener('ended', function(e) {
              if (media.currentTime > audioStream.duration + 1) {
                runner.fail();
              } else {
                runner.checkApproxEq(media.currentTime, audioStream.duration,
                    'media.currentTime');
                runner.succeed();
              }
            });
            media.play();
          });
          videoSb.appendBuffer(xhr2.getResponseData());
        }, 0, videoStream.size);
        xhr2.send();
      });
      audioSb.appendBuffer(xhr.getResponseData());
    }, 0, audioStream.size);
    xhr.send();
  }
}


createHeAacTest(Media.AAC.AudioLowExplicitHE);
createHeAacTest(Media.AAC.AudioLowImplicitHE);


return {tests: tests, info: info, fields: fields, viewType: 'default'};

};
