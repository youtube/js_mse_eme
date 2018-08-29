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


var createMediaStateAfterSrcAssignedTest = function(state, value, check) {
  var test = createProgressiveTest('state after src assigned', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is a src has been assigned';
  test.prototype.start = function(runner, video) {
    video.src = StreamDef.ProgressiveLow.src;
    test.prototype.status = util.formatStatus(util.getAttr(video, state));
    runner[check](util.getAttr(video, state), value, state);
    runner.succeed();
  };
};

createMediaStateAfterSrcAssignedTest('networkState',
                                     HTMLMediaElement.NETWORK_NO_SOURCE);
createMediaStateAfterSrcAssignedTest('readyState',
                                     HTMLMediaElement.HAVE_NOTHING);
createMediaStateAfterSrcAssignedTest('src', '', 'checkNE');


var createMediaStateInLoadStart = function(state, value, check) {
  var test = createProgressiveTest('state in loadstart', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is a src has been assigned';
  test.prototype.start = function(runner, video) {
    video.addEventListener('loadstart', function() {
      test.prototype.status = util.formatStatus(util.getAttr(video, state));
      runner[check](util.getAttr(video, state), value, state);
      runner.succeed();
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};

createMediaStateInLoadStart('networkState', HTMLMediaElement.NETWORK_LOADING);
createMediaStateInLoadStart('readyState', HTMLMediaElement.HAVE_NOTHING);
createMediaStateInLoadStart('currentSrc', '', 'checkNE');


var createProgressTest = function() {
  var test = createProgressiveTest('event', 'onprogress');

  test.prototype.title = 'Test if there is progress event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src + '?' + Date.now();
    video.addEventListener('progress', function() {
      self.log('onprogress called');
      runner.succeed();
    });
  };
};

createProgressTest();


var createTimeUpdateTest = function() {
  var test = createProgressiveTest('event', 'ontimeupdate');

  test.prototype.title = 'Test if there is timeupdate event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('timeupdate', function() {
      self.log('ontimeupdate called');
      runner.succeed();
    });
    video.play();
  };
};

createTimeUpdateTest();


var createCanPlayTest = function() {
  var test = createProgressiveTest('event', 'canplay');

  test.prototype.title = 'Test if there is canplay event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('canplay', function() {
      self.log('canplay called');
      runner.succeed();
    });
  };
};

createCanPlayTest();


var createAutoPlayTest = function() {
  var test = createProgressiveTest('control', 'autoplay');

  test.prototype.title = 'Test if autoplay works';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.autoplay = true;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('timeupdate', function() {
      self.log('ontimeupdate called');
      runner.succeed();
    });
  };
};

createAutoPlayTest();


var createNetworkStateTest = function() {
  var test = createProgressiveTest('state', 'networkState', false);

  test.prototype.title = 'Test if the network state is correct';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('suspend', function() {
      self.log('onsuspend called');
      runner.checkEq(video.networkState, HTMLMediaElement.NETWORK_IDLE,
                     'networkState');
      runner.succeed();
    });
  };
};

createNetworkStateTest();


var createOnLoadedMetadataTest = function() {
  var test = createProgressiveTest('event', 'onloadedmetadata');

  test.prototype.title = 'Test if the onloadedmetadata is called correctly';
  test.prototype.start = function(runner, video) {
    video.addEventListener('loadedmetadata', function() {
      runner.succeed();
    });
    video.src = 'getvideo.py';
  };
};


// getvideo.py is not supported by AppEngine.
// createOnLoadedMetadataTest();


var createPlayingWithoutDataPaused = function() {
  var test = createProgressiveTest('play without data', 'paused',
                                   false);

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


var createPlayingWithoutDataWaiting = function() {
  var test = createProgressiveTest('play without data', 'onwaiting',
                                   false);

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


var createTimeUpdateMaxGranularity = function(suffix, playbackRatio) {
  var test = createProgressiveTest(
      'timeupdate', 'max granularity' + suffix, false);

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var maxGranularity = 0;
    var times = 0;
    var last = 0;
    video.addEventListener('suspend', function() {
      video.playbackRate = playbackRatio;
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times !== 0) {
          var interval = Date.now() - last;
          if (interval > maxGranularity)
            maxGranularity = interval;
        }
        if (times === 50) {
          maxGranularity = maxGranularity / 1000.0;
          test.prototype.status = util.Round(maxGranularity, 2);
          runner.checkLE(maxGranularity, 0.26, 'maxGranularity');
          runner.succeed();
        }
        last = Date.now();
        ++times;
      });
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};

createTimeUpdateMaxGranularity('', 1.0);
createTimeUpdateMaxGranularity(' slow motion', 0.2);
createTimeUpdateMaxGranularity(' fast motion', 2.0);


var createTimeUpdateMinGranularity = function(suffix, playbackRatio) {
  var test = createProgressiveTest(
      'timeupdate', 'min granularity' + suffix, false);

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var minGranularity = Infinity;
    var times = 0;
    var last = 0;
    video.addEventListener('suspend', function() {
      video.playbackRate = playbackRatio;
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times !== 0) {
          var interval = Date.now() - last;
          if (interval > 1 && interval < minGranularity)
            minGranularity = interval;
        }
        if (times === 50) {
          minGranularity = minGranularity / 1000.0;
          test.prototype.status = util.Round(minGranularity, 2);
          runner.checkGE(minGranularity, 0.015, 'minGranularity');
          runner.succeed();
        }
        last = Date.now();
        ++times;
      });
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};

createTimeUpdateMinGranularity('', 1.0);
createTimeUpdateMinGranularity(' slow motion', 0.2);
createTimeUpdateMinGranularity(' fast motion', 2.0);


var createTimeUpdateAccuracy = function() {
  var test = createProgressiveTest('timeupdate', 'accuracy', false);

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var maxTimeDiff = 0;
    var baseTimeDiff = 0;
    var times = 0;
    video.addEventListener('suspend', function() {
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
          runner.checkLE(maxTimeDiff, 0.5, 'maxTimeDiff');
          runner.succeed();
        }
        ++times;
      });
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};
createTimeUpdateAccuracy();


var createTimeUpdateProgressing = function() {
  var test = createProgressiveTest('timeupdate', 'progressing', false);

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
    video.src = StreamDef.ProgressiveLow.src;
    video.play();
  };
};

createTimeUpdateProgressing();


var createTimeUpdateProgressingWithInitialSeek = function() {
  var test = createProgressiveTest(
      'timeupdate', 'progressing after seek', false);

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
    video.src = StreamDef.ProgressiveLow.src;
  };
};

createTimeUpdateProgressingWithInitialSeek();


var createTimeUpdateProgressingWithDurationCheck = function() {
  var test = createProgressiveTest(
      'timeupdate', 'duration on timeupdate', true);

  test.prototype.title = 'Test if the duration is non-negative when time ' +
      'updates.';
  test.prototype.start = function(runner, video) {
    video.addEventListener('timeupdate', function() {
      runner.checkGE(video.duration, 0, 'video.duration');
      if (video.currentTime > 1) {
        runner.succeed();
      }
    });
    video.src = StreamDef.ProgressiveLow.src;
    video.play();
  };
};

createTimeUpdateProgressingWithDurationCheck();

return {tests: tests, info: info, fields: fields, viewType: 'default'};

};

