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

var fields = ['passes', 'failures', 'timeouts'];

var createProgressiveTest = function(category, name, mandatory) {
  var t = createTest(name);
  t.prototype.category = category;
  t.prototype.index = tests.length;
  t.prototype.passes = 0;
  t.prototype.failures = 0;
  t.prototype.timeouts = 0;
  t.prototype.mandatory = true;
  if (typeof mandatory == 'boolean' && !mandatory)
    t.prototype.mandatory = false;
  tests.push(t);
  return t;
};

/**
 * Test the inital state of a video element.
 */
var createInitialMediaStateTest = function(state, value, check) {
  var test = createProgressiveTest('state before initial', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is just created';
  test.prototype.start = function(runner, video) {
    test.prototype.status = util.formatStatus(util.getAttr(video, state));
    runner[check](util.getAttr(video, state), value, state);
    runner.succeed();
  };
};

createInitialMediaStateTest('src', '');  // can actually be undefined
createInitialMediaStateTest('currentSrc', '');
createInitialMediaStateTest('defaultPlaybackRate', 1);
createInitialMediaStateTest('playbackRate', 1);
createInitialMediaStateTest('duration', NaN);
createInitialMediaStateTest('paused', true);
createInitialMediaStateTest('seeking', false);
createInitialMediaStateTest('ended', false);
createInitialMediaStateTest('videoWidth', 0);
createInitialMediaStateTest('videoHeight', 0);
createInitialMediaStateTest('buffered.length', 0);
createInitialMediaStateTest('played.length', 0);
createInitialMediaStateTest('seekable.length', 0);
createInitialMediaStateTest('networkState', HTMLMediaElement.NETWORK_EMPTY);
createInitialMediaStateTest('readyState', HTMLMediaElement.HAVE_NOTHING);

/**
 * Test the state when a src has been assigned to the video element.
 */
var createMediaStateAfterSrcAssignedTest = function(state, value, check) {
  var test = createProgressiveTest('state after src assigned', state);

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
    'networkState', HTMLMediaElement.NETWORK_NO_SOURCE);
createMediaStateAfterSrcAssignedTest(
    'readyState', HTMLMediaElement.HAVE_NOTHING);
createMediaStateAfterSrcAssignedTest('src', '', 'checkNE');

/**
 * Test the state of video element when loadstart event is fired.
 */
var createMediaStateInLoadStart = function(state, value, check) {
  var test = createProgressiveTest('state in loadstart', state);

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

createMediaStateInLoadStart('networkState', HTMLMediaElement.NETWORK_LOADING);
createMediaStateInLoadStart('readyState', HTMLMediaElement.HAVE_NOTHING);
createMediaStateInLoadStart('currentSrc', '', 'checkNE');

/**
 * Test if there is progress event.
 */
var createProgressTest = function() {
  var test = createProgressiveTest('event', 'onprogress');

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

createProgressTest();

/**
 * Test timeupdate event of video element.
 */
var createTimeUpdateTest = function() {
  var test = createProgressiveTest('event', 'ontimeupdate');

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

createTimeUpdateTest();

/**
 * Test canplay event in video element.
 */
var createCanPlayTest = function() {
  var test = createProgressiveTest('event', 'canplay');

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

createCanPlayTest();

/**
 * Test the autoplay attribute in video element.
 */
var createAutoPlayTest = function() {
  var test = createProgressiveTest('control', 'autoplay');

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

createAutoPlayTest();

/**
 * Test the network states of video element.
 */
var createNetworkStateTest = function() {
  var test = createProgressiveTest('state', 'networkState');

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

createNetworkStateTest();

/**
 * Test video without valid source data. The video should pause.
 */
var createPlayingWithoutDataPaused = function() {
  var test = createProgressiveTest('play without data', 'paused');

  test.prototype.title = 'Test if we can play without any data';
  test.prototype.start = function(runner, video) {
    video.src = 'hang.py';
    video.play();
    test.prototype.status = util.formatStatus(video.paused);
    runner.checkEq(video.paused, false, 'video.paused');
    runner.succeed();
  };
};

createPlayingWithoutDataPaused();

/**
 * Test playing a video without valid source data. Waiting event should occur.
 */
var createPlayingWithoutDataWaiting = function() {
  var test = createProgressiveTest('play without data', 'onwaiting');

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

createPlayingWithoutDataWaiting();

/**
 * Test the maximum timupdate event granularity for different playbackRate.
 * It should be smaller than 0.26.
 */
var createTimeUpdateMaxGranularity = function(playbackRate) {
  var test = createProgressiveTest('timeupdate', 'maxGranularityPlaybackRate' +
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

createTimeUpdateMaxGranularity(0.25);
createTimeUpdateMaxGranularity(0.50);
createTimeUpdateMaxGranularity(1.00);
createTimeUpdateMaxGranularity(1.25);
createTimeUpdateMaxGranularity(1.50);
createTimeUpdateMaxGranularity(2.0);

/**
 * Test the minimum timupdate event granularity for different playbackRate.
 * It should be larger than 0.015.
 */
var createTimeUpdateMinGranularity = function(playbackRate) {
  var test = createProgressiveTest('timeupdate', 'minGranularityPlaybackRate' +
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

createTimeUpdateMinGranularity(0.25);
createTimeUpdateMinGranularity(0.50);
createTimeUpdateMinGranularity(1.00);
createTimeUpdateMinGranularity(1.25);
createTimeUpdateMinGranularity(1.50);
createTimeUpdateMinGranularity(2.0);

/**
 * Test the timeupdate accuracy by video.currentTime.
 */
var createTimeUpdateAccuracy = function() {
  var test = createProgressiveTest('timeupdate', 'accuracy');

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var maxTimeDiff = 0;
    var baseTimeDiff = 0;
    var times = 0;
    video.addEventListener('loadstart', function() {
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times === 0) {
          baseTimeDiff = util.ElapsedTimeInS() - video.currentTime;
        } else {
          var timeDiff = util.ElapsedTimeInS() - video.currentTime;
          maxTimeDiff = Math.max(Math.abs(timeDiff - baseTimeDiff),
                                 maxTimeDiff);
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
createTimeUpdateAccuracy();

/**
 * Test if time updates progress when video is playing.
 */
var createTimeUpdateProgressing = function() {
  var test = createProgressiveTest('timeupdate', 'progressing');

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

createTimeUpdateProgressing();

/**
 * Test if time updates progress when video is playing with initial seek.
 */
var createTimeUpdateProgressingWithInitialSeek = function() {
  var test = createProgressiveTest('timeupdate', 'progressing after seek');

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

createTimeUpdateProgressingWithInitialSeek();

/**
 * Test if time updates progress when video is playing with duration check.
 */
var createTimeUpdateProgressingWithDurationCheck = function() {
  var test = createProgressiveTest('timeupdate', 'duration on timeupdate');

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

createTimeUpdateProgressingWithDurationCheck();

/**
 * Test if video plays at expected playback rate.
 */
var createPlaybackRateTest = function(playbackRate) {
  var test = createProgressiveTest('playbackRate', 'PlaybackRate' +
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

createPlaybackRateTest(0.25);
createPlaybackRateTest(0.50);
createPlaybackRateTest(1.00);
createPlaybackRateTest(1.25);
createPlaybackRateTest(1.50);
createPlaybackRateTest(2.0);


return {tests: tests, info: info, fields: fields, viewType: 'default'};

};
