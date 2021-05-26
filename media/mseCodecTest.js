/**
 * @license
 * Copyright 2019 Google Inc. All rights reserved.
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
 * MSE Codec Test Suite.
 * @class
 */
var MsecodecTest = function() {

var mseVersion = 'Current Editor\'s Draft';
var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource) {
  info = 'MSE Spec Version: ' + mseVersion;
  info += ' | webkit prefix: ' + webkitPrefix.toString();
}
info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

/**
 * @param {!string} name
 * @param {?string} category
 * @param {?boolean} mandatory
 * @param {?Array<Object>} streams If any stream is unsupported, test is marked
 *     optional and fails.
 */
var createCodecTest =
    function(testId, name, category = 'General', mandatory = true, streams = []) {
  var t = createMSTest(testId, name, category, mandatory, 'MSE Codec Tests');
  t.prototype.index = tests.length;
  t.prototype.setStreams(streams);
  tests.push(t);
  return t;
};

/**
 * Test appendBuffer for specified mimetype by appending twice in a row.
 * When the first append happens, the sourceBuffer becomes temporarily unusable
 * and it's updating should be set to true, which makes the second appends
 * unsuccessful and throws INVALID_STATE_ERR exception.
 * However, sometimes the update happens so fast that the second append manage
 * as well.
 */
var createAppendTest = function(testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      'Append' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
  test.prototype.title =
    `Test if we can append 1MB of a ${stream.mediatype} file.`;
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
    }, 0, stream.size);
    xhr.send();
  };
};

/**
 * Ensure sourceBuffer can abort current segment and end up with correct value.
 */
var createAbortTest = function(testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      'Abort' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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

/**
 * Ensure timestamp offset can be set.
 */
var createTimestampOffsetTest = function(
      testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      'TimestampOffset' + stream.codec +
          util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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

/**
 * Test the sourceBuffer DASH switch latency.
 * Validate it's less than 1 second.
 */
var createDASHLatencyTest = function(
    testId, videoStream, audioStream, mandatory) {
  var test = createCodecTest(
      testId,
      'DASHLatency' + videoStream.codec,
      'MSE (' + videoStream.codec + ')',
      mandatory,
      [videoStream, audioStream]);
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

/**
 * Ensure valid duration change after append buffer by halving the duration.
 */
var createDurationAfterAppendTest = function(
    testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      'DurationAfterAppend' + stream.codec +
          util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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

          media.addEventListener(
              'durationchange', function onDurationChange() {
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

/**
 * Test pause state before or after appending data to sourceBuffer.
 */
var createPausedTest = function(testId, stream, mandatory) {
  var test = createCodecTest(
      testId,
      'PausedStateWith' + stream.codec +
          util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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

/**
 * Test if video dimension is correct before or after appending data.
 */
var createVideoDimensionTest = function(
    testId, videoStream, audioStream, mandatory) {
  var test = createCodecTest(
      testId,
      'VideoDimension' + videoStream.codec,
      'MSE (' + videoStream.codec + ')',
      mandatory,
      [videoStream, audioStream]);
  test.prototype.title =
      'Test if video dimension is correct before or after appending data.';
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

/**
 * Test if the playback state transition is correct.
 */
var createPlaybackStateTest = function(testId, stream, mandatory) {
  var test = createCodecTest(
      testId,
      'PlaybackState' + stream.codec,
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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
          appendUntil(
              runner.timeouts, media, audioSb, audioChain, 5, function() {
            appendUntil(
                runner.timeouts, media, videoSb, videoChain, 5, function() {
              playThrough(runner.timeouts, media, 1, 2, audioSb,
                          audioChain, videoSb, videoChain, function() {
                var time = media.currentTime;
                media.pause();
                runner.checkApproxEq(
                    media.currentTime, time, 'media.currentTime');
                runner.succeed();
              });
            });
          });
        });
      });
    });
  };
};

/**
 * Ensure we can play a partially appended video segment.
 */
var createPlayPartialSegmentTest = function(testId, stream, mandatory) {
  var test = createCodecTest(
      testId,
      'PlayPartial' + stream.codec + 'Segment',
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
  test.prototype.title =
      'Test if we can play a partially appended video segment.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var videoStream = stream;
    var audioStream = Media.AAC.AudioTiny;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var videoXhr = runner.XHRManager.createRequest(
        videoStream.src, function(e) {
      videoSb.appendBuffer(this.getResponseData());
      video.addEventListener('timeupdate', function(e) {
        if (!video.paused && video.currentTime >= 2) {
          runner.succeed();
        }
      });
      video.play();
    }, 0, 1500000);
    var audioXhr = runner.XHRManager.createRequest(
        audioStream.src, function(e) {
      audioSb.appendBuffer(this.getResponseData());
      videoXhr.send();
    }, 0, 500000);
    audioXhr.send();
  };
};

/**
 * Ensure we can play a partially appended audio segment.
 */
var createIncrementalAudioTest = function(testId, stream) {
  var test = createCodecTest(
      testId,
      'Incremental' + stream.codec + 'Audio',
      'MSE (' + stream.codec + ')',
      true,
      [stream]);
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
        runner.checkApproxEq(
            sb.buffered.end(0), stream.get(200000), 'Range end');
        runner.succeed();
      });
    }, 0, 200000);
    xhr.send();
  };
};

var createLimitedAudioTest = function(testId, stream) {
  var test = createCodecTest(
      testId,
      'Limited' + stream.codec + 'Audio',
      'MSE (' + stream.codec + ')',
      true,
      [stream]);
  test.prototype.title =
      'Test if we can play an audio segment of only 0.5 seconds.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var videoStream = Media.H264.VideoNormal;
    var audioStream = stream;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var videoXhr = runner.XHRManager.createRequest(
        videoStream.src, function(e) {
      videoSb.appendBuffer(this.getResponseData());
      video.addEventListener('playing', function(e) {
        if (!video.paused) {
          video.pause();
          runner.succeed();
        }
      });
      video.play();
    }, 0, 1500000);
    var audioXhr = runner.XHRManager.createRequest(stream.src, function(e) {
      audioSb.addEventListener('updateend', function() {
        runner.checkEq(audioSb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(audioSb.buffered.start(0), 0, 'Range start');
        runner.checkApproxEq(audioSb.buffered.end(0), 0.5, 'Range end', 0.02);
      });
      audioSb.appendBuffer(this.getResponseData());
      videoXhr.send();
    }, 0, stream.get('halfSecondRangeEnd'));
    audioXhr.send();
  };
};

var createIncrementalLimitedAudioTest = function(testId, stream) {
  var test = createCodecTest(
      testId,
      'IncrementalLimited' + stream.codec + 'Audio',
      'MSE (' + stream.codec + ')',
      true,
      [stream]);
  test.prototype.title =
      'Test if we can append and play 0.5s of audio at a time.';

  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var videoStream = Media.H264.VideoNormal;
    var audioStream = stream;
    var videoSb = this.ms.addSourceBuffer(videoStream.mimetype);
    var audioSb = this.ms.addSourceBuffer(audioStream.mimetype);
    var ms = this.ms;

    var videoPromise = new Promise(function(resolve, reject) {
      var videoXhr = runner.XHRManager.createRequest(
          videoStream.src, function(e) {
        videoSb.appendBuffer(this.getResponseData());
        video.addEventListener('timeupdate', function(e) {
          if (!video.paused &&
              video.currentTime >= stream.get('halfSecondDurationEnd')) {
            runner.succeed();
          }
        });
        resolve();
      }, 0, 1500000);
      videoXhr.send();
    });

    var audioPromise = new Promise(function(resolve, reject) {
      var nextAudioXhr = function(byteIndex) {
        var startBytes = audioStream.get('halfSecondBytes')[byteIndex];
        var endBytes = audioStream.get('halfSecondBytes')[byteIndex + 1] - 1;
        var bytesLength = endBytes - startBytes + 1;
        var xhr = runner.XHRManager.createRequest(audioStream.src, function(e) {
          audioSb.addEventListener('updateend', function callXhr() {
            audioSb.removeEventListener('updateend', callXhr);
            if (byteIndex < audioStream.get('halfSecondBytes').length - 2) {
              resolve();
              nextAudioXhr(byteIndex + 1);
            } else {
              ms.endOfStream();
            }
          });
          audioSb.appendBuffer(this.getResponseData());
        }, startBytes, bytesLength);
        xhr.send();
      };
      nextAudioXhr(0);
    });

    Promise.all([videoPromise, audioPromise]).then(function() {
      video.play();
    });
  };
};

/**
 * Ensure we can append audio data with an explicit offset.
 */
var createAppendAudioOffsetTest = function(testId, stream1, stream2) {
  var test = createCodecTest(
      testId,
      'Append' + stream1.codec + 'AudioOffset',
      'MSE (' + stream1.codec + ')',
      true,
      [stream1, stream2]);
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
        runner.checkApproxEq(
            sb.buffered.end(0), stream2.get('appendAudioOffset'), 'Range end');
        runner.succeed();
      });
    }, 0, 200000);
    xhr.send();
  };
};

/**
 * Ensure we can append video data with an explicit offset.
 */
var createAppendVideoOffsetTest = function(
    testId, stream1, stream2, audioStream, mandatory) {
  var test = createCodecTest(
      testId,
      'Append' + stream1.codec + 'VideoOffset',
      'MSE (' + stream1.codec + ')',
      mandatory,
      [stream1, stream2]);
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

/**
 * Ensure we can append multiple init segments.
 */
var createAppendMultipleInitTest = function(
    testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      'AppendMultipleInit' + stream.codec +
          util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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

/**
 * Test appending segments out of order.
 */
var createAppendOutOfOrderTest = function(
    testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      'Append' + stream.codec + util.MakeCapitalName(stream.mediatype) +
          'OutOfOrder',
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
  test.prototype.title = 'Test appending segments out of order.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FileSource(stream.src, runner.XHRManager, runner.timeouts);
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

/**
 * Test SourceBuffer.buffered get updated correctly after feeding data.
 */
var createBufferedRangeTest = function(testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      'BufferedRange' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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

/**
 * Ensure the duration on MediaSource can be set and retrieved sucessfully.
 */
var createMediaSourceDurationTest =
    function(testId, videoStream, audioStream, mandatory) {
  var test = createCodecTest(
      testId,
      'MediaSourceDuration' + videoStream.codec,
      'MSE (' + videoStream.codec + ')',
      mandatory,
      [videoStream, audioStream]);
  test.prototype.title = 'Test if the duration on MediaSource can be set ' +
      'and retrieved sucessfully.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var videoFileSource = new FileSource(
        videoStream.src, runner.XHRManager, runner.timeouts);
    var videoChain = new ResetInit(videoFileSource);
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
        var duration1 = videoFileSource.segs[1].time;
        var duration2 = videoFileSource.segs[2].time;
        var eps = 0.01;
        appendUntil(runner.timeouts, media, videoSb, videoChain, duration2,
            function() {
          setDuration(duration1, ms, [videoSb, audioSb], function() {
            runner.checkApproxEq(ms.duration, duration1, 'ms.duration', eps);
            runner.checkApproxEq(
                media.duration, duration1, 'media.duration', eps);
            runner.checkLE(
                videoSb.buffered.end(0), duration1 + 0.1, 'Range end');
            videoSb.abort();
            videoChain.seek(0);
            appendInit(media, videoSb, videoChain, 0, function() {
              appendUntil(runner.timeouts, media, videoSb, videoChain,
                  duration2, function() {
                runner.checkApproxEq(
                    ms.duration, duration2, 'ms.duration', eps);
                setDuration(duration1, ms, [videoSb, audioSb], function() {
                  if (videoSb.updating) {
                    runner.fail(
                        'Source buffer is updating on duration change');
                    return;
                  }
                  var duration = videoSb.buffered.end(0);
                  ms.endOfStream();
                  runner.checkApproxEq(
                      ms.duration, duration, 'ms.duration', eps);
                  ms.addEventListener('sourceended', function() {
                    runner.checkApproxEq(
                        ms.duration, duration, 'ms.duration', eps);
                    runner.checkApproxEq(
                        media.duration, duration, 'media.duration', eps);
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

/**
 * Validate media data with overlap is merged into one range.
 */
var createOverlapTest = function(testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      stream.codec + util.MakeCapitalName(stream.mediatype) + 'WithOverlap',
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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
                  runner.checkEq(
                      sb.buffered.length, 1, 'Source buffer number');
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

/**
 * Validate media data with a gap smaller than an media frame size is merged
 * into one buffered range.
 */
var createSmallGapTest = function(testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      stream.codec + util.MakeCapitalName(stream.mediatype) + 'WithSmallGap',
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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
                  runner.checkEq(
                      sb.buffered.length, 1, 'Source buffer number');
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

/**
 * Validate media data with a gap larger than an media frame size will not be
 * merged into one buffered range.
 */
var createLargeGapTest = function(testId, stream, unused_stream, mandatory) {
  var test = createCodecTest(
      testId,
      stream.codec + util.MakeCapitalName(stream.mediatype) + 'WithLargeGap',
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
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
                  runner.checkEq(
                      sb.buffered.length, 2, 'Source buffer number');
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

/**
 * Validate we can seek during playing. It also tests if the implementation
 * properly supports seek operation fired immediately after another seek that
 * hasn't been completed.
 */
var createSeekTest = function(testId, videoStream, mandatory) {
  var test = createCodecTest(
      testId,
      'Seek' + videoStream.codec,
      'MSE (' + videoStream.codec + ')',
      mandatory,
      [videoStream]);
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

/**
 * Seek into and out of a buffered region.
 */
var createBufUnbufSeekTest = function(testId, videoStream, mandatory) {
  var test = createCodecTest(
      testId,
      'BufUnbufSeek' + videoStream.codec,
      'MSE (' + videoStream.codec + ')',
      mandatory,
      [videoStream]);
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

/**
 * Ensure we can play properly when there is not enough audio or video data.
 * The play should resume once src data is appended.
 */
var createDelayedTest = function(testId, delayed, nonDelayed, mandatory) {
  var test = createCodecTest(
      testId,
      'Delayed' + delayed.codec + util.MakeCapitalName(delayed.mediatype),
      'MSE (' + delayed.codec + ')',
      mandatory,
      [delayed, nonDelayed]);
  test.prototype.title = 'Test if we can play properly when there' +
      ' is not enough ' + delayed.mediatype +
      ' data. The play should resume once ' +
      delayed.mediatype + ' data is appended.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    // Chrome allows for 3 seconds of underflow for streams that have audio
    // but are video starved.
    // See code.google.com/p/chromium/issues/detail?id=423801
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
                 test.prototype.name + ' data.');
        media.play();
        media.addEventListener('timeupdate', ontimeupdate);
        waitUntil(runner.timeouts, media, end + 3, function() {
          runner.checkLE(media.currentTime, end + 1.0 + underflowTime,
              'media.currentTime');
          runner.checkGr(media.currentTime, end - 1.0 - underflowTime,
              'media.currentTime');
          runner.succeed();
        });
      });
    });
  };
};

/**
 * Test to check if audio-less or audio-only can be playback properly.
 */
var createSingleSourceBufferPlaybackTest = function(testId, stream, mandatory) {
  var test = createCodecTest(
      testId,
      'PlaybackOnly' + stream.codec + util.MakeCapitalName(stream.mediatype),
      'MSE (' + stream.codec + ')',
      mandatory,
      [stream]);
  test.prototype.title = 'Test if we can playback a single source buffer.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var video = this.video;
    var videoSb = this.ms.addSourceBuffer(stream.mimetype);
    var videoXhr = runner.XHRManager.createRequest(stream.src, function(e) {
      videoSb.appendBuffer(this.getResponseData());
      video.addEventListener('timeupdate', function(e) {
        if (video.currentTime > 5) {
          runner.succeed();
        }
      });
      video.play();
    }, 0, 300000);
    videoXhr.send();
  };
};

// Opus Specific tests.
createAppendTest('2.1.1.1', Media.Opus.SantaHigh, Media.VP9.Video1MB);
createAbortTest('2.1.2.1', Media.Opus.SantaHigh, Media.VP9.Video1MB);
createTimestampOffsetTest('2.1.3.1', Media.Opus.CarLow, Media.VP9.Video1MB);
createDurationAfterAppendTest('2.1.4.1', Media.Opus.CarLow, Media.VP9.Video1MB);
createPausedTest('2.1.5.1', Media.Opus.CarLow);
createIncrementalAudioTest('2.1.6.1', Media.Opus.CarMed);
createLimitedAudioTest('2.1.6.2', Media.Opus.CarMed);
createIncrementalLimitedAudioTest('2.1.6.3', Media.Opus.CarMed);
createAppendAudioOffsetTest('2.1.7.1', Media.Opus.CarMed, Media.Opus.CarHigh);
createAppendMultipleInitTest('2.1.8.1', Media.Opus.CarLow, Media.VP9.Video1MB);
createAppendOutOfOrderTest('2.1.9.1', Media.Opus.CarMed, Media.VP9.Video1MB);
createBufferedRangeTest('2.1.10.1', Media.Opus.CarMed, Media.VP9.Video1MB);
createOverlapTest('2.1.11.1', Media.Opus.CarMed, Media.VP9.Video1MB);
createSmallGapTest('2.1.12.1', Media.Opus.CarMed, Media.VP9.Video1MB);
createLargeGapTest('2.1.13.1', Media.Opus.CarMed, Media.VP9.Video1MB);
createDelayedTest('2.1.14.1', Media.Opus.CarMed, Media.VP9.VideoNormal);
createSingleSourceBufferPlaybackTest('2.1.15.1', Media.Opus.SantaHigh)

// AAC Specific tests.
createAppendTest('2.2.1.1', Media.AAC.Audio1MB, Media.H264.Video1MB);
createAbortTest('2.2.2.1', Media.AAC.Audio1MB, Media.H264.Video1MB);
createTimestampOffsetTest('2.2.3.1', Media.AAC.Audio1MB, Media.H264.Video1MB);
createDurationAfterAppendTest(
    '2.2.4.1', Media.AAC.Audio1MB, Media.H264.Video1MB);
createPausedTest('2.2.5.1', Media.AAC.Audio1MB);
createIncrementalAudioTest(
    '2.2.6.1', Media.AAC.AudioNormal, Media.H264.Video1MB);
createLimitedAudioTest('2.2.6.2', Media.AAC.AudioNormal);
createIncrementalLimitedAudioTest('2.2.6.3', Media.AAC.AudioNormal);
createAppendAudioOffsetTest(
    '2.2.7.1', Media.AAC.AudioNormal, Media.AAC.AudioHuge);
createAppendMultipleInitTest(
    '2.2.8.1', Media.AAC.Audio1MB, Media.H264.Video1MB);
createAppendOutOfOrderTest(
    '2.2.9.1', Media.AAC.AudioNormal, Media.H264.Video1MB);
createBufferedRangeTest('2.2.10.1', Media.AAC.AudioNormal, Media.H264.Video1MB);
createOverlapTest('2.2.11.1', Media.AAC.AudioNormal, Media.H264.Video1MB);
createSmallGapTest('2.2.12.1', Media.AAC.AudioNormal, Media.H264.Video1MB);
createLargeGapTest('2.2.13.1', Media.AAC.AudioNormal, Media.H264.Video1MB);
createDelayedTest('2.2.14.1', Media.AAC.AudioNormal, Media.VP9.VideoNormal);
createSingleSourceBufferPlaybackTest('2.2.15.1', Media.AAC.Audio1MB)

// VP9 Specific tests.
if (!harnessConfig.novp9) {
  createAppendTest('2.3.1.1', Media.VP9.Video1MB, Media.AAC.Audio1MB);
  createAbortTest('2.3.2.1', Media.VP9.Video1MB, Media.AAC.Audio1MB);
  createTimestampOffsetTest('2.3.3.1', Media.VP9.Video1MB, Media.AAC.Audio1MB);
  createDASHLatencyTest('2.3.4.1', Media.VP9.VideoTiny, Media.AAC.Audio1MB);
  createDurationAfterAppendTest(
      '2.3.5.1', Media.VP9.Video1MB, Media.AAC.Audio1MB);
  createPausedTest('2.3.6.1', Media.VP9.Video1MB);
  createVideoDimensionTest(
      '2.3.7.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createPlaybackStateTest('2.3.8.1', Media.VP9.VideoNormal);
  createPlayPartialSegmentTest('2.3.9.1', Media.VP9.VideoTiny);
  createAppendVideoOffsetTest('2.3.10.1',
      Media.VP9.VideoNormal, Media.VP9.VideoTiny, Media.AAC.AudioNormal);
  createAppendMultipleInitTest(
      '2.3.11.1', Media.VP9.Video1MB, Media.AAC.Audio1MB);
  createAppendOutOfOrderTest(
      '2.3.12.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createBufferedRangeTest(
      '2.3.13.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createMediaSourceDurationTest(
      '2.3.14.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createOverlapTest('2.3.15.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createSmallGapTest('2.3.16.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createLargeGapTest('2.3.17.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createSeekTest('2.3.18.1', Media.VP9.VideoNormal);
  createBufUnbufSeekTest('2.3.19.1', Media.VP9.VideoNormal);
  createDelayedTest('2.3.20.1', Media.VP9.VideoNormal, Media.AAC.AudioNormal);
  createSingleSourceBufferPlaybackTest('2.3.21.1', Media.VP9.VideoTiny)
}

// H264 Specific tests.
createAppendTest('2.4.1.1', Media.H264.Video1MB, Media.AAC.Audio1MB);
createAbortTest('2.4.2.1', Media.H264.Video1MB, Media.AAC.Audio1MB);
createTimestampOffsetTest('2.4.3.1', Media.H264.Video1MB, Media.AAC.Audio1MB);
createDASHLatencyTest('2.4.4.1', Media.H264.VideoTiny, Media.AAC.Audio1MB);
createDurationAfterAppendTest(
    '2.4.5.1', Media.H264.Video1MB, Media.AAC.Audio1MB);
createPausedTest('2.4.6.1', Media.H264.Video1MB);
createVideoDimensionTest('2.4.7.1', Media.H264.VideoNormal, Media.AAC.Audio1MB);
createPlaybackStateTest('2.4.8.1', Media.H264.VideoNormal);
createPlayPartialSegmentTest('2.4.9.1', Media.H264.VideoTiny);
createAppendVideoOffsetTest('2.4.10.1',
    Media.H264.VideoNormal, Media.H264.VideoTiny, Media.AAC.Audio1MB);
createAppendMultipleInitTest(
    '2.4.11.1', Media.H264.Video1MB, Media.AAC.Audio1MB);
createAppendOutOfOrderTest(
    '2.4.12.1', Media.H264.CarMedium, Media.AAC.Audio1MB);
createBufferedRangeTest('2.4.13.1', Media.H264.VideoNormal, Media.AAC.Audio1MB);
createMediaSourceDurationTest(
    '2.4.14.1', Media.H264.VideoNormal, Media.AAC.Audio1MB);
createOverlapTest('2.4.15.1', Media.H264.VideoNormal, Media.AAC.Audio1MB);
createSmallGapTest('2.4.16.1', Media.H264.VideoNormal, Media.AAC.Audio1MB);
createLargeGapTest('2.4.17.1', Media.H264.VideoNormal, Media.AAC.Audio1MB);
createSeekTest('2.4.18.1', Media.H264.VideoNormal);
createBufUnbufSeekTest('2.4.19.1', Media.H264.VideoNormal);
createDelayedTest('2.4.20.1', Media.H264.VideoNormal, Media.AAC.AudioNormal);
createSingleSourceBufferPlaybackTest('2.4.21.1', Media.H264.VideoTiny)

// AV1 Specific tests.
createAppendTest('2.5.1.1', Media.AV1.Video1MB, Media.AAC.Audio1MB);
createAbortTest('2.5.2.1', Media.AV1.Video1MB, Media.AAC.Audio1MB);
createTimestampOffsetTest(
    '2.5.3.1', Media.AV1.Bunny144p30fps, Media.AAC.Audio1MB);
createDASHLatencyTest('2.5.4.1', Media.AV1.Bunny240p30fps, Media.AAC.Audio1MB);
createDurationAfterAppendTest(
    '2.5.5.1', Media.AV1.VideoSmall, Media.AAC.Audio1MB);
createPausedTest('2.5.6.1', Media.AV1.Bunny144p30fps);
createVideoDimensionTest(
    '2.5.7.1', Media.AV1.Bunny360p30fps, Media.AAC.Audio1MB);
createPlaybackStateTest('2.5.8.1', Media.AV1.Bunny360p30fps);
createPlayPartialSegmentTest('2.5.9.1', Media.AV1.Bunny240p30fps);
createAppendVideoOffsetTest(
    '2.5.10.1', Media.AV1.Bunny360p30fps, Media.AV1.Bunny240p30fps,
    Media.AAC.Audio1MB);
createAppendMultipleInitTest(
    '2.5.11.1', Media.AV1.Bunny144p30fps, Media.AAC.Audio1MB);
createAppendOutOfOrderTest(
    '2.5.12.1', Media.AV1.Bunny360p30fps, Media.AAC.Audio1MB);
createBufferedRangeTest(
    '2.5.13.1', Media.AV1.Bunny360p30fps, Media.AAC.Audio1MB);
createMediaSourceDurationTest(
    '2.5.14.1', Media.AV1.Bunny360p30fps, Media.AAC.Audio1MB);
createOverlapTest('2.5.15.1', Media.AV1.Bunny360p30fps, Media.AAC.Audio1MB);
createSmallGapTest('2.5.16.1', Media.AV1.Bunny360p30fps, Media.AAC.Audio1MB);
createLargeGapTest('2.5.17.1', Media.AV1.Bunny360p30fps, Media.AAC.Audio1MB);
createSeekTest('2.5.18.1', Media.AV1.Bunny360p30fps);
createBufUnbufSeekTest('2.5.19.1', Media.AV1.Bunny360p30fps);
createDelayedTest('2.5.20.1', Media.AV1.Bunny360p30fps, Media.AAC.AudioNormal);
createSingleSourceBufferPlaybackTest('2.5.21.1', Media.AV1.Bunny240p30fps);

return {tests: tests, info: info, viewType: 'default'};

};
window.MsecodecTest = MsecodecTest;

try {
  exports.getTest = MsecodecTest;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}

