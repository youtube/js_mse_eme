/**
 * @license
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * MSE Conformance Test Suite.
 * @class
 */
var ConformanceTest = function() {

var mseVersion = 'Current Editor\'s Draft';
var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource) {
  info = 'MSE Spec Version: ' + mseVersion;
  info += ' | webkit prefix: ' + webkitPrefix.toString();
}
info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

/**
 * @param {!string} name
 * @param {?string} category
 * @param {?boolean} mandatory
 * @param {?Array<Object>} streams If any stream is unsupported, test is marked
 *     optional and fails.
 */
var createConformanceTest =
    function(name, category = 'General', mandatory = true, streams = []) {
  var t = createMSTest(name, category, mandatory);
  t.prototype.index = tests.length;
  t.prototype.setStreams(streams);
  tests.push(t);
  return t;
};

/**
 * Test if the value of video state is expected when onsourceopen
 * event happens.
 */
var createInitialMediaStateTest = function(state, value, check) {
  var test = createConformanceTest(
      'InitialMedia' + util.MakeCapitalName(state), 'Media Element Core');
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

/**
 * Validate the XHR request can send Uint8Array.
 */
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

/**
 * Ensure that XHR aborts actually abort by issuing an absurd number of them
 * and then aborting all but one.
 */
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

/**
 * Ensure XMLHttpRequest.open does not reset XMLHttpRequest.responseType.
 */
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

/**
 * Validate existence of MediaSource object.
 */
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

/**
 * Ensure MediaSource object can be attached to video.
 */
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

/**
 * Test addSourceBuffer is working correctly.
 */
var testAddSourceBuffer = createConformanceTest('AddSourceBuffer', 'MSE Core');
testAddSourceBuffer.prototype.title =
    'Test if we can add source buffer';
testAddSourceBuffer.prototype.onsourceopen = function() {
  try {
    this.runner.checkEq(
        this.ms.sourceBuffers.length, 0, 'Source buffer number');
    this.ms.addSourceBuffer(Media.AAC.mimetype);
    this.runner.checkEq(
        this.ms.sourceBuffers.length, 1, 'Source buffer number');
    this.ms.addSourceBuffer(Media.VP9.mimetype);
    this.runner.checkEq(
        this.ms.sourceBuffers.length, 2, 'Source buffer number');
  } catch (e) {
    this.runner.fail(e);
  }
  this.runner.succeed();
};

/**
 * Ensure add incorrect source buffer type will fire the correct exceptions.
 */
var testAddSourceBufferException =
    createConformanceTest('AddSBException', 'MSE Core');
testAddSourceBufferException.prototype.title = 'Test if add incorrect ' +
    'source buffer type will fire the correct exceptions.';
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

/**
 * Test addSourceBuffer and removeSourceBuffer are working correctly.
 */
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

/**
 * Ensure MediaSource state has the expected value when onsourceopen happens.
 */
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

/**
 * Ensure we can set MediaSource.duration.
 */
var testDuration = createConformanceTest('Duration', 'MSE Core');
testDuration.prototype.title =
    'Test if we can set duration.';
testDuration.prototype.onsourceopen = function() {
  this.ms.duration = 10;
  this.runner.checkEq(this.ms.duration, 10, 'ms.duration');
  this.runner.succeed();
};

/**
 * Test events on the MediaElement.
 */
var mediaElementEvents =
    createConformanceTest('MediaElementEvents', 'MSE Core');
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

/**
 * Test if the events on MediaSource are correct.
 */
var mediaSourceEvents = createConformanceTest('MediaSourceEvents', 'MSE Core');
mediaSourceEvents.prototype.title =
    'Test if the events on MediaSource are correct.';
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

/**
 * Append to buffer until exceeding the quota error.
 */
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

/**
 * Ensure we can start play before feeding any data. The play should
 * start automatically after data is appended.
 */
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

/**
 * Ensure we can start playback from a non-zero position.
 */
var createStartPlayAtNonZeroPositionTest = function(
    audioStream, audioSegments, videoStream, videoSegments, startAtSec) {
  var test = createConformanceTest(
      `StartPlayAtTimeGt0${videoStream.codec}+${audioStream.codec}`,
      'MSE Core',
      true,
      [videoStream, audioStream]);
  test.prototype.title =
      'Test if we can start playback from time > 0.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);

    var fetchStream = function(stream, callBack, start, end) {
      var xhr =
          runner.XHRManager.createRequest(stream.src, callBack, start, end);
      xhr.send();
    }
    var appendLoop = function(stream, sourceBuffer, segments, playAndSeek) {
      var parsedData;
      var segmentIdx = 0;
      var maxSegments = segments.length;

      fetchStream(stream, function() {
        if (stream.codec == 'H264' || stream.codec == 'AAC') {
          parsedData = parseMp4(this.getResponseData());
        } else if(stream.codec == 'VP9' || stream.codec == 'Opus') {
          parsedData = parseWebM(this.getResponseData().buffer);
        } else {
          runner.fail('Unsupported codec in appendLoop.');
        }
        fetchStream(stream, function() {
          sourceBuffer.addEventListener('updateend', function append() {
            if (playAndSeek && segmentIdx == 0) {
              video.play();
            }
            if (maxSegments - segmentIdx <= 0) {
              sourceBuffer.removeEventListener('updateend', append);
              if (playAndSeek) {
                video.currentTime = playAndSeek;
              }
              return;
            }
            fetchStream(stream, function() {
              sourceBuffer.appendBuffer(this.getResponseData());
              segmentIdx += 1;
            },
            parsedData[segments[segmentIdx]].offset,
            parsedData[segments[segmentIdx]].size);
          });
          sourceBuffer.appendBuffer(this.getResponseData());
        }, 0, parsedData[0].offset); // Init segment.
      }, 0, 32 * 1024); // Enough data to parse the stream.
    };
    video.addEventListener('timeupdate', function timeupdate() {
      if (!video.paused && video.currentTime > startAtSec + 5) {
        runner.succeed();
      }
    });
    appendLoop(audioStream, audioSb, audioSegments);
    appendLoop(videoStream, videoSb, videoSegments, startAtSec);
  };
};

createStartPlayAtNonZeroPositionTest(
    Media.AAC.AudioNormal, [1, 2], Media.H264.VideoNormal, [2, 3, 4], 12);
createStartPlayAtNonZeroPositionTest(
    Media.Opus.CarLow, [1, 2], Media.VP9.VideoNormal, [2, 3, 4], 12);

/**
 * Ensure event timestamp is relative to the initial page load.
 */
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

/**
 * Ensure timeupdate event fired with correct currentTime value after seeking.
 */
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

/**
 * Test SourceBuffer.appendWindowStart can be correctly set and applied.
 */
var testAppendWindowStart =
  createConformanceTest('AppendWindowStart', 'MSE Core');
testAppendWindowStart.prototype.title =
  'Test if SourceBuffer respects appendWindowStart for appending.';
testAppendWindowStart.prototype.onsourceopen = function() {
  var runner = this.runner;
  var start = 3.4;
  var videoStream = Media.VP9.VideoNormal;
  var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
  // appendWindowStart cannot be smaller than 0
  // or greater than or equal to appendWindowEnd.
  try {
    videoSb.appendWindowStart = -1;
  } catch (e) {
    runner.checkEq(e.name, 'TypeError', 'Expected error');
  }
  try {
    videoSb.appendWindowEnd = 10;
    videoSb.appendWindowStart = 11;
  } catch (e) {
    runner.checkEq(e.name, 'TypeError', 'Expected error');
  }
  runner.checkEq(videoSb.appendWindowStart, 0, 'appendWindowStart');

  videoSb.appendWindowStart = start;
  var xhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
    videoSb.appendBuffer(this.getResponseData());

    videoSb.addEventListener('updateend', function() {
      runner.checkEq(videoSb.appendWindowStart, start, 'appendWindowStart');
      // More frames maybe dropped due to missing key frame.
      runner.checkGE(videoSb.buffered.start(0), start, 'Buffered range start');
      runner.succeed();
    });
  }, 0, 3000000);
  xhr.send();
};

/**
 * Test SourceBuffer.appendWindowEnd can be correctly set and applied.
 */
var testAppendWindowEnd =
  createConformanceTest('AppendWindowEnd', 'MSE Core');
testAppendWindowEnd.prototype.title =
  'Test if SourceBuffer respects appendWindowEnd for appending.';
testAppendWindowEnd.prototype.onsourceopen = function() {
  var runner = this.runner;
  var end = 5.3;
  var videoStream = Media.VP9.VideoNormal;
  var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
  // appendWindowEnd cannot be smaller than appendWindowStart.
  try {
    videoSb.appendWindowStart = 2;
    videoSb.appendWindowEnd = 1;
  } catch (e) {
    runner.checkEq(e.name, 'TypeError', 'Expected error');
  }
  runner.checkEq(videoSb.appendWindowEnd, 'Infinity', 'appendWindowEnd');

  videoSb.appendWindowStart = 0;
  videoSb.appendWindowEnd = end;
  var xhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
    videoSb.appendBuffer(this.getResponseData());

    videoSb.addEventListener('updateend', function() {
      runner.checkEq(videoSb.appendWindowEnd, end, 'appendWindowEnd');
      runner.checkApproxEq(
          videoSb.buffered.end(0), end, 'Buffered range end', 0.05);
      runner.succeed();
    });
  }, 0, 3000000);
  xhr.send();
};

var createSourceBufferChangeTypeTest = function(fromStream, toStream) {
  var test = createConformanceTest(
      `ChangeType.${fromStream.codec}.${toStream.codec}`,
      'MSE Core',
      false,
      [fromStream, toStream]);
  test.prototype.title =
      `Test SourceBuffer.changeType() from ${fromStream.codec} ` +
      `to ${toStream.codec}`;
  test.prototype.onsourceopen = function() {
    var video = this.video;
    var ms = this.ms;
    var runner = this.runner;
    var videoStreams = [fromStream, toStream];
    function feedVideoElement(streamIndex) {
      var secondsToBuffer = 2;
      if (streamIndex == videoStreams.length) {
        ms.endOfStream();
        video.addEventListener('timeupdate', function(e) {
          if (!video.paused && video.currentTime >= secondsToBuffer * 2) {
            runner.succeed();
          }
        });
        video.play();
        return;
      }

      try {
        var sourceBuffer;
        var videoStream = videoStreams[streamIndex];

        if (ms.sourceBuffers.length == 0) {
          sourceBuffer = ms.addSourceBuffer(videoStream.mimetype);
          sourceBuffer.mode = 'sequence';
        } else {
          sourceBuffer = ms.sourceBuffers[0];
          sourceBuffer.changeType(videoStream.mimetype);
        }

        var xhr = runner.XHRManager.createRequest(videoStream.src, function(e) {
          sourceBuffer.appendBuffer(this.getResponseData());
          sourceBuffer.addEventListener('updateend', function() {
            feedVideoElement(++streamIndex);
          }, { once: true });
        }, 0, videoStream.bps * secondsToBuffer);
        xhr.send();

      } catch(error) {
        runner.fail(error);
      }
    }
    feedVideoElement(0);
  }
}

createSourceBufferChangeTypeTest(Media.H264.VideoTiny, Media.VP9.VideoTiny);
createSourceBufferChangeTypeTest(Media.H264.VideoTiny,
    Media.AV1.Bunny144p30fps);
createSourceBufferChangeTypeTest(Media.VP9.VideoTiny, Media.H264.VideoTiny);
createSourceBufferChangeTypeTest(Media.VP9.VideoTiny,
    Media.AV1.Bunny144p30fps);
createSourceBufferChangeTypeTest(Media.AV1.Bunny144p30fps,
    Media.H264.VideoTiny);
createSourceBufferChangeTypeTest(Media.AV1.Bunny144p30fps,
    Media.VP9.VideoTiny);

/**
 * Creates a MSE currentTime Accuracy test to validate if the media.currentTime
 * is accurate to within 250 milliseconds during active playback. This can
 * be used for video features a standard frame rate or a high frame rate.
 */
var createCurrentTimeAccuracyTest =
    function(videoStream, audioStream, frameRate) {
  var test = createConformanceTest(
      frameRate + 'Accuracy', 'MSE currentTime');
  test.prototype.title = 'Test the currentTime granularity.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var maxTimeDiff = 0;
    var baseTimeDiff = 0;
    var times = 0;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);

    var videoXhr = runner.XHRManager.createRequest(
        videoStream.src, function(e) {
      videoSb.appendBuffer(this.getResponseData());
      video.addEventListener('timeupdate', function(e) {
        if (times === 0) {
          baseTimeDiff = util.ElapsedTimeInS() - video.currentTime;
        } else {
          var timeDiff = util.ElapsedTimeInS() - video.currentTime;
          maxTimeDiff = Math.max(
              Math.abs(timeDiff - baseTimeDiff), maxTimeDiff);
        }
        if (times > 500 || video.currentTime > 10) {
          runner.checkLE(
              maxTimeDiff, 0.25, 'media.currentTime diff during playback');
          runner.succeed();
        }
        ++times;
      });
      video.addEventListener('canplaythrough', function(e) {
        video.play();
      });
    }, 0, 2500000);
    var audioXhr = runner.XHRManager.createRequest(
        audioStream.src, function(e) {
      audioSb.appendBuffer(this.getResponseData());
      videoXhr.send();
    }, 0, 2500000);
    audioXhr.send();
  };
};

createCurrentTimeAccuracyTest(
    Media.H264.Webgl720p30fps, Media.AAC.AudioNormal, 'SFR');
createCurrentTimeAccuracyTest(
    Media.H264.Webgl720p60fps, Media.AAC.AudioNormal, 'HFR');

/**
 * Creates a MSE currentTime PausedAccuracy test to validate if
 * the media.currentTime is accurate to within 32 milliseconds when content
 * is paused. This can be used for video features a standard frame rate
 * or a high frame rate. Test checks the accuracy of media.currentTime at
 * two events: when content is paused and when content is played again after
 * the pause, if either one meets the threshold, test passes.
 */
var createCurrentTimePausedAccuracyTest =
    function(videoStream, audioStream, frameRate) {
  var test = createConformanceTest(
      frameRate + 'PausedAccuracy', 'MSE currentTime', false);
  test.prototype.title = 'Test the currentTime granularity when pause.';
  test.prototype.onsourceopen = function() {
    var maxDiffInS = 0.032;
    var runner = this.runner;
    var video = this.video;
    var baseTimeDiff = 0;
    var times = 0;
    var assertTimeAtPlay = false;
    var currentTimeIsAccurate = false;
    var self = this;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);

    var videoXhr = runner.XHRManager.createRequest(
        videoStream.src, function(e) {
      videoSb.appendBuffer(this.getResponseData());

      function onTimeUpdate(e) {
        if (times === 0) {
          baseTimeDiff = util.ElapsedTimeInS() - video.currentTime;
        }
        if (times > 500 || video.currentTime > 10) {
          video.removeEventListener('timeupdate', onTimeUpdate);
          video.pause();
        }
        ++times;
      };
      video.addEventListener('play', function() {
        if (assertTimeAtPlay) {
          var timeDiff = util.ElapsedTimeInS() - video.currentTime;
          var currentTimeDiff = Math.abs(baseTimeDiff - timeDiff);
          self.log('media.currentTime is ' + currentTimeDiff + 's different' +
              ' from actual time when video is played after a pause.');
          currentTimeIsAccurate =
              currentTimeIsAccurate || (currentTimeDiff <= maxDiffInS);
          runner.checkEq(
              currentTimeIsAccurate,
              true,
              'media.currentTime diff is within ' + maxDiffInS + 's');
          assertTimeAtPlay = false;
          runner.succeed();
        }
      });
      video.addEventListener('pause', function(e) {
        var timeDiff = util.ElapsedTimeInS() - video.currentTime;
        var currentTimeDiff = Math.abs(baseTimeDiff - timeDiff);
        runner.checkEq(video.paused, true, 'media.paused');
        self.log('meida.currentTime is ' + currentTimeDiff +
            's different from actual time when video is paused.');
        currentTimeIsAccurate = currentTimeDiff <= maxDiffInS;
        assertTimeAtPlay = true;
        video.play();
      });
      video.addEventListener('timeupdate', onTimeUpdate);

      video.addEventListener('canplaythrough', function(e) {
        video.play();
      })
    }, 0, 2500000);
    var audioXhr = runner.XHRManager.createRequest(
        audioStream.src, function(e) {
      audioSb.appendBuffer(this.getResponseData());
      videoXhr.send();
    }, 0, 2500000);
    audioXhr.send();
  };
};

createCurrentTimePausedAccuracyTest(
    Media.VP9.Webgl720p30fps, Media.AAC.AudioNormal, 'SFR');
createCurrentTimePausedAccuracyTest(
    Media.VP9.Webgl720p60fps, Media.AAC.AudioNormal, 'HFR');

/**
 * Validate specified mimetype is supported.
 */
var createSupportTest = function(mimetype, desc, mandatory) {
  var test = createConformanceTest(desc + 'Support', 'MSE Formats', mandatory);
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
createSupportTest(Media.AV1.mimetype, 'AV1', util.requireAV1());

/**
 * Ensure AudioContext is supported.
 */
var testWAAContext = createConformanceTest('WAAPresence', 'MSE Web Audio API');
testWAAContext.prototype.title = 'Test if AudioContext is supported';
testWAAContext.prototype.start = function(runner, video) {
  var Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor)
    return runner.fail('No AudioContext object available.');

  var ctx = new Ctor();
  if (!ctx)
    return runner.fail('Found AudioContext but could not create one');

  runner.succeed();
};

/**
 * Validate AudioContext#createMediaElementSource supports specified video and
 * audio mimetype.
 */
var createCreateMESTest = function(audioStream, videoStream) {
  var test = createConformanceTest(
      audioStream.codec + '/' + videoStream.codec + 'CreateMediaElementSource',
      'MSE Web Audio API (Optional)',
      false,
      [audioStream, videoStream]);
  test.prototype.title =
      'Test if AudioContext#createMediaElementSource supports mimetype ' +
      audioStream.mimetype + '/' + videoStream.mimetype;
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;

    try {
      var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
      var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    } catch (e) {
      runner.fail(e.message);
      return;
    }
    var Ctor = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctor();

    var audioXhr =
        runner.XHRManager.createRequest(audioStream.src, function(e) {
      var data = audioXhr.getResponseData();
      function updateEnd(e) {
        runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(audioSb.buffered.start(0), 0, 'Range start');
        runner.checkApproxEq(
            audioSb.buffered.end(0), audioStream.duration, 'Range end');
        audioSb.removeEventListener('updateend', updateEnd);
        video.play();
      }
      audioSb.addEventListener('updateend', updateEnd);
      audioSb.appendBuffer(data);
    });
    var videoXhr =
        runner.XHRManager.createRequest(videoStream.src, function(e) {
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
        } finally {
          ctx.close();
        }
        runner.checkNE(source, null, 'MediaElementSource');
        runner.succeed();
      }
    });
  }
}

createCreateMESTest(Media.Opus.CarLow, Media.VP9.VideoNormal);
createCreateMESTest(Media.Opus.CarLow, Media.AV1.Bunny360p30fps,
    util.requireAV1());
createCreateMESTest(Media.AAC.Audio1MB, Media.VP9.VideoNormal);
createCreateMESTest(Media.AAC.Audio1MB, Media.H264.VideoNormal);
createCreateMESTest(Media.AAC.Audio1MB, Media.AV1.Bunny360p30fps,
    util.requireAV1());

/**
 * Test media with mismatched frame duration and segment timing.
 */
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

/**
 * Test playback of HE-AAC (High-Efficiency Advanced Audio Coding) with
 * specified type of SBR signaling.
 */
var createHeAacTest = function(audioStream) {
  var test = createConformanceTest('HE-AAC/' +
      audioStream.get('sbrSignaling') + 'SBR', 'Media');
  test.prototype.title = 'Test playback of HE-AAC with ' +
      audioStream.get('sbrSignaling') +  ' SBR signaling.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var videoStream = Media.H264.Video1MB;
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
