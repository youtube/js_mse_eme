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
 * Progressive Test Suite.
 * @class
 */
var ProgressiveTest = function() {

var tests = [];
var info = 'Default Timeout: ' + TestBase.timeout + 'ms';

var createProgressiveTest = function(testId, category, name, mandatory = true) {
  var t = createTest(name, category, mandatory, testId, 'Progressive Tests');
  t.prototype.index = tests.length;
  tests.push(t);
  return t;
};

/**
 * Test the inital state of a video element.
 */
var createInitialMediaStateTest = function(testId, state, value, check) {
  var test = createProgressiveTest(testId, 'state before initial', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is just created';
  test.prototype.start = function(runner, video) {
    test.prototype.status = util.formatStatus(util.getAttr(video, state));
    runner[check](util.getAttr(video, state), value, state);
    runner.succeed();
  };
};

createInitialMediaStateTest('6.1.1.1', 'src', '');  // can actually be undefined
createInitialMediaStateTest('6.1.2.1', 'currentSrc', '');
createInitialMediaStateTest('6.1.3.1', 'defaultPlaybackRate', 1);
createInitialMediaStateTest('6.1.4.1', 'playbackRate', 1);
createInitialMediaStateTest('6.1.5.1', 'duration', NaN);
createInitialMediaStateTest('6.1.6.1', 'paused', true);
createInitialMediaStateTest('6.1.7.1', 'seeking', false);
createInitialMediaStateTest('6.1.8.1', 'ended', false);
createInitialMediaStateTest('6.1.9.1', 'videoWidth', 0);
createInitialMediaStateTest('6.1.10.1', 'videoHeight', 0);
createInitialMediaStateTest('6.1.11.1', 'buffered.length', 0);
createInitialMediaStateTest('6.1.12.1', 'played.length', 0);
createInitialMediaStateTest('6.1.13.1', 'seekable.length', 0);
createInitialMediaStateTest(
    '6.1.14.1', 'networkState', HTMLMediaElement.NETWORK_EMPTY);
createInitialMediaStateTest(
    '6.1.15.1', 'readyState', HTMLMediaElement.HAVE_NOTHING);

/**
 * Test the state when a src has been assigned to the video element.
 */
var createMediaStateAfterSrcAssignedTest = function(testId, state, value, check) {
  var test = createProgressiveTest(testId, 'state after src assigned', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is a src has been assigned';
  test.prototype.start = function(runner, video) {
    video.src = Media.H264.ProgressiveLow.src;
    test.prototype.status = util.formatStatus(util.getAttr(video, state));
    runner[check](util.getAttr(video, state), value, state);
    runner.succeed();
  };
};

createMediaStateAfterSrcAssignedTest(
    '6.2.1.1', 'networkState', HTMLMediaElement.NETWORK_NO_SOURCE);
createMediaStateAfterSrcAssignedTest(
    '6.2.2.1', 'readyState', HTMLMediaElement.HAVE_NOTHING);
createMediaStateAfterSrcAssignedTest('6.2.3.1', 'src', '', 'checkNE');

/**
 * Test the state of video element when loadstart event is fired.
 */
var createMediaStateInLoadStart = function(testId, state, value, check) {
  var test = createProgressiveTest(testId, 'state in loadstart', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is in loadstart';
  test.prototype.start = function(runner, video) {
    video.addEventListener('loadstart', function() {
      test.prototype.status = util.formatStatus(util.getAttr(video, state));
      runner[check](util.getAttr(video, state), value, state);
      runner.succeed();
    });
    video.src = Media.H264.ProgressiveLow.src;
  };
};

createMediaStateInLoadStart('6.3.1.1', 'networkState', HTMLMediaElement.NETWORK_LOADING);
createMediaStateInLoadStart('6.3.2.1', 'readyState', HTMLMediaElement.HAVE_NOTHING);
createMediaStateInLoadStart('6.3.3.1', 'currentSrc', '', 'checkNE');

/**
 * Test if there is progress event.
 */
var createProgressTest = function(testId) {
  var test = createProgressiveTest(testId, 'event', 'onprogress');

  test.prototype.title = 'Test if there is progress event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = Media.H264.ProgressiveLow.src + '?' + Date.now();
    video.addEventListener('progress', function() {
      self.log('onprogress called');
      runner.succeed();
    });
  };
};

createProgressTest('6.4.1.1');

/**
 * Test timeupdate event of video element.
 */
var createTimeUpdateTest = function(testId) {
  var test = createProgressiveTest(testId, 'event', 'ontimeupdate');

  test.prototype.title = 'Test if there is timeupdate event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = Media.H264.ProgressiveLow.src;
    video.addEventListener('timeupdate', function() {
      self.log('ontimeupdate called');
      runner.succeed();
    });
    video.play();
  };
};

createTimeUpdateTest('6.4.2.1');

/**
 * Test canplay event in video element.
 */
var createCanPlayTest = function(testId) {
  var test = createProgressiveTest(testId, 'event', 'canplay');

  test.prototype.title = 'Test if there is canplay event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = Media.H264.ProgressiveLow.src;
    video.addEventListener('canplay', function() {
      self.log('canplay called');
      runner.succeed();
    });
  };
};

createCanPlayTest('6.4.3.1');

/**
 * Test the autoplay attribute in video element.
 */
var createAutoPlayTest = function(testId) {
  var test = createProgressiveTest(testId, 'control', 'autoplay');

  test.prototype.title = 'Test if autoplay works';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.autoplay = true;
    video.src = Media.H264.ProgressiveLow.src;
    video.addEventListener('timeupdate', function() {
      self.log('ontimeupdate called');
      runner.succeed();
    });
  };
};

createAutoPlayTest('6.5.1.1');

/**
 * Test the network states of video element.
 */
var createNetworkStateTest = function(testId) {
  var test = createProgressiveTest(testId, 'state', 'networkState');

  test.prototype.title = 'Test if the network state is correct';
  test.prototype.start = function(runner, video) {
    var self = this;
    runner.checkEq(video.networkState, HTMLMediaElement.NETWORK_EMPTY,
                   'networkState');
    video.addEventListener('suspend', function() {
      self.log('onsuspend called');
      var networkState = video.networkState;
      if (networkState == HTMLMediaElement.NETWORK_LOADING) {
        // Skip NETWORK_LOADING state wait until next suspend event to find
        // NETWORK_IDLE state.
        return;
      }
      runner.checkEq(networkState, HTMLMediaElement.NETWORK_IDLE,
                     'networkState');
      runner.succeed();
    });
    video.src = Media.H264.ProgressiveLow.src;
  };
};

createNetworkStateTest('6.6.1.1');

/**
 * Test video without valid source data. The video should pause.
 */
var createPlayingWithoutDataPaused = function(testId) {
  var test = createProgressiveTest(testId, 'play without data', 'paused');

  test.prototype.title = 'Test if we can play without any data';
  test.prototype.start = function(runner, video) {
    video.src = 'hang.py';
    video.play();
    test.prototype.status = util.formatStatus(video.paused);
    runner.checkEq(video.paused, false, 'video.paused');
    runner.succeed();
  };
};

createPlayingWithoutDataPaused('6.7.1.1');

/**
 * Test playing a video without valid source data. Waiting event should occur.
 */
var createPlayingWithoutDataWaiting = function(testId) {
  var test = createProgressiveTest(testId, 'play without data', 'onwaiting');

  test.prototype.title = 'Test if we can play without any data';
  test.prototype.start = function(runner, video) {
    video.addEventListener('waiting', function() {
      runner.checkEq(video.currentTime, 0, 'video.currentTime');
      runner.succeed();
    });
    video.src = 'hang.py';
    video.play();
  };
};

createPlayingWithoutDataWaiting('6.7.2.1');

/**
 * Test the maximum timupdate event granularity for different playbackRate.
 * It should be smaller than 0.26.
 */
var createTimeUpdateMaxGranularity = function(testId, playbackRate) {
  var test =
      createProgressiveTest(testId, 'timeupdate', 'maxGranularityPlaybackRate' +
      parseFloat(playbackRate).toFixed(2));

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var warmUpCount = 15;
    var maxGranularity = 0;
    var times = 0;
    var last = 0;
    video.addEventListener('loadstart', function() {
      video.playbackRate = playbackRate;
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times >= warmUpCount) {
          var interval = Date.now() - last;
          if (interval > maxGranularity)
            maxGranularity = interval;
        }
        if (times === 50 + warmUpCount) {
          maxGranularity = maxGranularity / 1000.0;
          runner.checkLE(maxGranularity, 0.26, 'maxGranularity');
          runner.succeed();
        }
        last = Date.now();
        ++times;
      });
    });
    video.src = Media.H264.ProgressiveLow.src;
  };
};

createTimeUpdateMaxGranularity('6.8.1.1', 0.25);
createTimeUpdateMaxGranularity('6.8.2.1', 0.50);
createTimeUpdateMaxGranularity('6.8.3.1', 1.00);
createTimeUpdateMaxGranularity('6.8.4.1', 1.25);
createTimeUpdateMaxGranularity('6.8.5.1', 1.50);
createTimeUpdateMaxGranularity('6.8.6.1', 2.0);

/**
 * Test the minimum timupdate event granularity for different playbackRate.
 * It should be larger than 0.015.
 */
var createTimeUpdateMinGranularity = function(testId, playbackRate) {
  var test =
      createProgressiveTest(testId, 'timeupdate', 'minGranularityPlaybackRate' +
      parseFloat(playbackRate).toFixed(2));

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var warmUpCount = 15;
    var minGranularity = Infinity;
    var times = 0;
    var last = 0;
    video.addEventListener('loadstart', function() {
      video.playbackRate = playbackRate;
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times >= warmUpCount) {
          var interval = Date.now() - last;
          if (interval > 1 && interval < minGranularity)
            minGranularity = interval;
        }
        if (times === 50 + warmUpCount) {
          minGranularity = minGranularity / 1000.0;
          runner.checkGE(minGranularity, 0.015, 'minGranularity');
          runner.succeed();
        }
        last = Date.now();
        ++times;
      });
    });
    video.src = Media.H264.ProgressiveLow.src;
  };
};

createTimeUpdateMinGranularity('6.8.7.1', 0.25);
createTimeUpdateMinGranularity('6.8.8.1', 0.50);
createTimeUpdateMinGranularity('6.8.9.1', 1.00);
createTimeUpdateMinGranularity('6.8.10.1', 1.25);
createTimeUpdateMinGranularity('6.8.11.1', 1.50);
createTimeUpdateMinGranularity('6.8.12.1', 2.0);

/**
 * Test the timeupdate accuracy by video.currentTime.
 */
var createTimeUpdateAccuracy = function(testId) {
  var test = createProgressiveTest(testId, 'timeupdate', 'accuracy');

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var maxTimeDiff = 0;
    var baseTimeDiff = 0;
    var times = 0;
    video.addEventListener('canplaythrough', function() {
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times === 0) {
          baseTimeDiff = util.ElapsedTimeInS() - video.currentTime;
        } else {
          var timeDiff = util.ElapsedTimeInS() - video.currentTime;
          maxTimeDiff = Math.max(
              Math.abs(timeDiff - baseTimeDiff), maxTimeDiff);
        }
        if (times > 500 || video.currentTime > 10) {
          test.prototype.status = util.Round(maxTimeDiff, 2);
          runner.checkLE(maxTimeDiff, 0.25, 'maxTimeDiff');
          runner.succeed();
        }
        ++times;
      });
    });
    video.src = Media.H264.ProgressiveLow.src;
  };
};

createTimeUpdateAccuracy('6.8.13.1');

/**
 * Test if time updates progress when video is playing.
 */
var createTimeUpdateProgressing = function(testId) {
  var test = createProgressiveTest(testId, 'timeupdate', 'progressing');

  test.prototype.title = 'Test if the time updates progress.';
  test.prototype.start = function(runner, video) {
    var last = 0;
    var times = 0;
    video.addEventListener('timeupdate', function() {
      if (times === 0) {
        last = video.currentTime;
      } else {
        runner.checkGE(video.currentTime, last, 'video.currentTime');
        last = video.currentTime;
      }
      if (video.currentTime > 10) {
        test.prototype.status = util.Round(video.currentTime, 2);
        runner.succeed();
      }
      ++times;
    });
    video.src = Media.H264.ProgressiveLow.src;
    video.play();
  };
};

createTimeUpdateProgressing('6.8.14.1');

/**
 * Test if time updates progress when video is playing with initial seek.
 */
var createTimeUpdateProgressingWithInitialSeek = function(testId) {
  var test =
      createProgressiveTest(testId, 'timeupdate', 'progressing after seek');

  test.prototype.title = 'Test if the time updates progress.';
  test.prototype.start = function(runner, video) {
    var last = 0;
    var times = 0;
    video.addEventListener('canplay', function() {
      if (times == 0) {
        video.currentTime = 0.001;
        video.play();
        video.addEventListener('timeupdate', function() {
          if (times === 0) {
            last = video.currentTime;
          } else {
            runner.checkGE(video.currentTime, last, 'video.currentTime');
            last = video.currentTime;
          }
          if (video.currentTime > 10) {
            test.prototype.status = util.Round(video.currentTime, 2);
            runner.succeed();
          }
          ++times;
        });
      }
    });
    video.src = Media.H264.ProgressiveLow.src;
  };
};

createTimeUpdateProgressingWithInitialSeek('6.8.15.1');

/**
 * Test if time updates progress when video is playing with duration check.
 */
var createTimeUpdateProgressingWithDurationCheck = function(testId) {
  var test =
      createProgressiveTest(testId, 'timeupdate', 'duration on timeupdate');

  test.prototype.title = 'Test if the duration is non-negative when time ' +
      'updates.';
  test.prototype.start = function(runner, video) {
    video.addEventListener('timeupdate', function() {
      runner.checkGE(video.duration, 0, 'video.duration');
      if (video.currentTime > 1) {
        runner.succeed();
      }
    });
    video.src = Media.H264.ProgressiveLow.src;
    video.play();
  };
};

createTimeUpdateProgressingWithDurationCheck('6.8.16.1');

/**
 * Test if video plays at expected playback rate.
 */
var createPlaybackRateTest = function(testId, playbackRate) {
  var test = createProgressiveTest(testId, 'playbackRate', 'PlaybackRate' +
      parseFloat(playbackRate).toFixed(2));
  test.prototype.title = 'Test playbackRate plays back at the expected rate.';
  test.prototype.start = function(runner, video) {
    video.addEventListener('loadstart', function() {
      video.playbackRate = playbackRate;
      video.play();
      var warmUpCount = 15;
      var times = 0;
      var realTimeLast;
      var playTimeLast;
      video.addEventListener('timeupdate', function() {
        if (times <= warmUpCount) {
          realTimeLast = Date.now();
          playTimeLast = video.currentTime;
        } else {
          var realTimeNext = Date.now();
          var playTimeNext = video.currentTime;
          var realTimeDelta = (realTimeNext - realTimeLast) / 1000.0;
          var playTimeDelta = playTimeNext - playTimeLast;
          runner.checkApproxEq(playTimeDelta, realTimeDelta * playbackRate,
              'playback time delta', 0.25);
          realTimeLast = realTimeNext;
          playTimeLast = playTimeNext;
        }
        if (times === 50 + warmUpCount) {
          runner.succeed();
        }
        times++;
      });
    });
    video.src = Media.H264.ProgressiveLow.src;
  };
};

createPlaybackRateTest('6.9.1.1', 0.25);
createPlaybackRateTest('6.9.2.1', 0.50);
createPlaybackRateTest('6.9.3.1', 1.00);
createPlaybackRateTest('6.9.4.1', 1.25);
createPlaybackRateTest('6.9.5.1', 1.50);
createPlaybackRateTest('6.9.6.1', 2.0);


return {tests: tests, info: info, viewType: 'default'};

};
window.ProgressiveTest = ProgressiveTest;

try {
  exports.getTest = ProgressiveTest;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
