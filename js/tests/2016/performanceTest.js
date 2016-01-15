/*
Copyright 2016 Google Inc. All rights reserved.

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

var PerformanceTest = function() {

var tests = [];
var info = 'These tests can evaluate the quality of the implementation.';
var fields = ['times', 'min', 'max', 'average', 'baseline PC',
    'baseline device'];

function Profiler() {
  var start = Date.now();
  var last = Date.now();
  var times = 0;

  this.min = Infinity;
  this.max = -Infinity;
  this.average = 0;

  this.tick = function() {
    var curr = Date.now();
    var elapsed = (curr - last) / 1000.;
    last = curr;
    ++times;
    if (elapsed > this.max) this.max = elapsed;
    if (elapsed < this.min) this.min = elapsed;
    this.average = (curr - start) / times / 1000.;
  };
};

var createPerformanceTest = function(name) {
  var t = createMSTest(name);
  t.prototype.index = tests.length;
  t.prototype.times = 0;
  t.prototype.min = 0;
  t.prototype.max = 0;
  t.prototype.average = 0;
  t.prototype.baseline_PC = 'N/A';
  t.prototype.baseline_device = 'N/A';
  t.prototype.timeout = 2147483647;
  tests.push(t);
  return t;
};


var createCreateUint8ArrayTest = function(size, times, refPC, refDevice) {
  var test = createPerformanceTest(
      'create Uint8Array in ' + util.SizeToText(size));
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Measure Uint8Array creation performance.';
  test.prototype.start = function(runner, video) {
    var profiler = new Profiler;
    test.prototype.times = 0;
    var array;
    for (var i = 0; i < times; ++i) {
      array = new Uint8Array(new ArrayBuffer(size));
      array = new Uint8Array(array);
      profiler.tick();
      ++test.prototype.times;
      test.prototype.min = profiler.min;
      test.prototype.max = profiler.max;
      test.prototype.average = util.Round(profiler.average, 3);
      runner.updateStatus();
    }
    runner.succeed();
  };
};

createCreateUint8ArrayTest(1024 * 1024, 1, 0.001, 0.002);


var createXHRRequestTest = function(size, times) {
  var test = createPerformanceTest('XHR Request in ' + util.SizeToText(size));
  test.prototype.title = 'Measure XHR request performance.';
  test.prototype.start = function(runner, video) {
    var startTime = Date.now();
    var profiler = new Profiler;
    test.prototype.times = 0;
    function startXHR(i) {
      var xhr = runner.XHRManager.createRequest(
          'media/car-20120827-85.mp4?x=' + Date.now() + '.' + i,
          function() {
            xhr.getResponseData();
            profiler.tick();
            ++test.prototype.times;
            test.prototype.min = profiler.min;
            test.prototype.max = profiler.max;
            test.prototype.average = util.Round(profiler.average, 3);
            runner.updateStatus();
            if (i < times)
              runner.timeouts.setTimeout(startXHR.bind(null, i + 1), 10);
            else
              runner.succeed();
          }, 0, size);
      xhr.send();
    };
    startXHR(1);
  };
};

createXHRRequestTest(4096, 32);
createXHRRequestTest(1024 * 1024, 16);
createXHRRequestTest(4 * 1024 * 1024, 16);


var createXHRAbortTest = function(size, times, refPC, refDevice) {
  var test = createPerformanceTest('Abort XHR Request in ' +
                                   util.SizeToText(size));
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Measure how fast to abort XHR request.';
  test.prototype.start = function(runner, video) {
    var startTime = Date.now();
    var profiler = new Profiler;
    test.prototype.times = 0;
    function startXHR(i) {
      var xhr = runner.XHRManager.createRequest(
          'media/car-20120827-85.mp4?x=' + Date.now() + '.' + i,
          function() {});
      xhr.send();
      runner.timeouts.setTimeout(function() {
        xhr.abort();
        profiler.tick();
        ++test.prototype.times;
        test.prototype.min = profiler.min;
        test.prototype.max = profiler.max;
        test.prototype.average = util.Round(profiler.average, 3);
        runner.updateStatus();
        if (i < times)
          startXHR(i + 1);
        else
          runner.succeed();
      }, 0, size);
    };
    startXHR(1);
  };
};

createXHRAbortTest(4096, 64, 0.098, 0.125);
createXHRAbortTest(1024 * 1024, 64, 0.116, 0.14);
createXHRAbortTest(4 * 1024 * 1024, 64, 0.126, 0.15);


var createAppendTest = function(stream, size, times, refPC, refDevice) {
  var test = createPerformanceTest('Append ' + util.SizeToText(size) +
                                   ' to ' + stream.name + ' source buffer');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Measure source buffer append performance.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var chunkSize = size / times;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        var profiler = new Profiler;
        var responseData = xhr.getResponseData();
        test.prototype.times = 0;
        sb.addEventListener('update', function(e) {
          profiler.tick();
          ++test.prototype.times;
          test.prototype.min = profiler.min;
          test.prototype.max = profiler.max;
          test.prototype.average = util.Round(profiler.average, 3);
          runner.updateStatus();
          sb.appendBuffer(responseData.subarray(chunkSize * times, chunkSize * (times + 1)));
          if (test.prototype.times >= times) {
            runner.succeed();
          }
        });
        sb.appendBuffer(responseData.subarray(0, chunkSize));
      }, 0, size);
    xhr.send();
  };
};

createAppendTest(StreamDef.AudioNormal, 16384, 1024, 0.002, 0.12);
createAppendTest(StreamDef.AudioNormal, 2 * 1024 * 1024, 128, 0.098, 0.19);
createAppendTest(StreamDef.VideoNormal, 16384, 1024, 0.002, 0.1);
createAppendTest(StreamDef.VideoNormal, 4 * 1024 * 1024, 64, 0.015, 0.15);


var createSeekAccuracyTest = function(stream, times, step) {
  var test = createPerformanceTest('Video Seek Accuracy Test');
  test.prototype.baseline_PC = 0;
  test.prototype.baseline_device = 0;
  test.prototype.title = 'Measure video seeking accuracy.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var sb = this.ms.addSourceBuffer(stream.type);
    var seekTime = 0;
    var minimumTimeAfterSeek = Infinity;
    var totalDiff = 0;
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        test.prototype.times = 0;
        test.prototype.min = Infinity;
        test.prototype.max = 0;
        sb.appendBuffer(xhr.getResponseData());
        media.addEventListener('timeupdate', function(e) {
          if (media.currentTime < minimumTimeAfterSeek)
            minimumTimeAfterSeek = media.currentTime;
        });
        media.addEventListener('seeked', function(e) {
          if (media.currentTime < minimumTimeAfterSeek)
            minimumTimeAfterSeek = media.currentTime;
          var diff = minimumTimeAfterSeek - seekTime;
          totalDiff += diff;
          ++test.prototype.times;
          if (diff < test.prototype.min) test.prototype.min = diff;
          if (diff > test.prototype.max) test.prototype.max = diff;
          test.prototype.average =
            util.Round(totalDiff / test.prototype.times, 3);
          seekTime += step;
          minimumTimeAfterSeek = Infinity;
          runner.updateStatus();
          if (seekTime < times)
            media.currentTime = seekTime;
          else
            runner.succeed();
        });
        callAfterLoadedMetaData(media, function() {
          media.play();
          media.currentTime = seekTime;
        });
      }, 0, stream.size);
    xhr.send();
  };
};

createSeekAccuracyTest(StreamDef.VideoNormal, 100, 1);


var createSeekBackwardsTest = function(audio, video) {
  var test = createPerformanceTest('Seek Backwards Test');
  test.prototype.baseline_PC = 0;
  test.prototype.baseline_device = 0;
  test.prototype.title = 'Measure seeking accuracy while seeking backwards.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var audio_chain = new ResetInit(
        new FileSource(audio.src, runner.XHRManager, runner.timeouts));
    var video_chain = new ResetInit(
        new FileSource(video.src, runner.XHRManager, runner.timeouts, 0,
                       video.size, video.size));
    var audio_src = this.ms.addSourceBuffer(audio.type);
    var video_src = this.ms.addSourceBuffer(video.type);
    var seekTime = video.duration - 5;
    var minimumTimeAfterSeek = Infinity;
    var totalDiff = 0;
    var doingSeek = false;

    test.prototype.times = 0;
    test.prototype.min = 0;
    test.prototype.max = 0;
    runner.updateStatus();

    var ontimeupdate = function() {
      media.removeEventListener('timeupdate', ontimeupdate);
      if (seekTime > 5) {
        seekTime -= 1;
        doSeek();
      } else {
        runner.succeed();
      }
    };

    var onseeked = function() {
      media.removeEventListener('seeked', onseeked);
      media.addEventListener('timeupdate', ontimeupdate);
    };

    var doSeek = function() {
      if (doingSeek) {
        runner.timeouts.setTimeout(doSeek, 100);
        return;
      }
      doingSeek = true;
      media.addEventListener('seeked', onseeked);
      audio_chain.seek(Math.max(seekTime, 0), audio_src);
      video_chain.seek(seekTime, video_src);
      media.currentTime = seekTime;

      var finishedAppends = 0;
      var finishAppend = function() {
        if (finishedAppends >= 2) {
          video_src.removeEventListener('update', finishAppend);
          audio_src.removeEventListener('update', finishAppend);
          doingSeek = false;
        }
      };

      var append = function(src, chain, maxAppends) {
        var numAppends = 0;
        var appendCb = function() {
          src.removeEventListener('update', appendCb);
          chain.pull(function(data) {
            numAppends++;
            if (numAppends < maxAppends) {
              src.addEventListener('update', appendCb);
            } else {
              finishedAppends++;
              src.addEventListener('update', finishAppend);
            }
            src.appendBuffer(data);
          });
        };
        chain.pull(function(data) {
          src.addEventListener('update', appendCb);
          src.appendBuffer(data);
          numAppends++;
        });
      };

      append(audio_src, audio_chain, 2);
      append(video_src, video_chain, 3);
    };

    this.ms.duration = 100000000;  // Ensure that we can seek to any position.
    audio_chain.init(0, function(data) {
      audio_src.appendBuffer(data);
      video_chain.init(0, function(data) {
        video_src.appendBuffer(data);
        media.play();
        callAfterLoadedMetaData(media, doSeek);
      });
    });
  };
};

createSeekBackwardsTest(StreamDef.AudioNormal, StreamDef.VideoNormal);


var createBufferSizeTest = function(stream, refPC, refDevice) {
  var test = createPerformanceTest(
      'Buffer Size for ' + stream.name + ' in ' +
      util.SizeToText(stream.bps) + ' bps');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Determines buffer sizes for different stream ' +
      'types and qualites.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var size = Math.min(stream.size, 1024 * 1024);
    var xhr = runner.XHRManager.createRequest(stream.src, function() {
      var buf = xhr.getResponseData();
      sb.addEventListener('update', function() {
        var new_end = sb.buffered.length ? sb.buffered.end(0) : 0;
        test.prototype.min = Math.floor(new_end);
        test.prototype.max = Math.floor(new_end);
        test.prototype.average = Math.floor(new_end);
        runner.updateStatus();
        runner.succeed();
      });
      var old_end = sb.buffered.length ? sb.buffered.end(0) : 0;
      sb.timestampOffset = old_end;
      sb.appendBuffer(buf);
    }, 0, size);
    xhr.send();
  };
};

createBufferSizeTest(StreamDef.AudioTiny, 3147, 512);
createBufferSizeTest(StreamDef.AudioNormal, 786, 128);
createBufferSizeTest(StreamDef.AudioHuge, 393, 64);

createBufferSizeTest(StreamDef.VideoTiny, 4610, 784);
createBufferSizeTest(StreamDef.VideoNormal, 1062, 182);
createBufferSizeTest(StreamDef.VideoHuge, 281, 47);


var createPrerollSizeTest = function(stream, refPC, refDevice) {
  var test = createPerformanceTest(
      'Preroll Size for ' + stream.name + ' in ' +
      util.SizeToText(stream.bps) + ' bps');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Determines preroll sizes for different stream ' +
      'types and qualites.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var size = Math.min(stream.size, 5 * 1024 * 1024);
    var buf = new Uint8Array(size);
    var sb = this.ms.addSourceBuffer(stream.type);
    var end = 0;

    test.prototype.times = 0;
    test.prototype.min = 0;
    test.prototype.max = 0;
    test.prototype.average = 0;
    runner.updateStatus();

    function timeupdate(e) {
      if (this.currentTime) {
        runner.succeed();
      }
    };

    function appendBuffer() {
      if (sb.buffered.length && sb.buffered.end(0) - end > 0.1) {
        end = sb.buffered.end(0);
        test.prototype.min = util.Round(end, 3); 
        test.prototype.max = util.Round(end, 3); 
        test.prototype.average = util.Round(end, 3);
        runner.updateStatus();
        runner.timeouts.setTimeout(appendBuffer.bind(null, buf), 500);
      } else {
        sb.removeEventListener('update', appendBuffer);
        sb.addEventListener('update', appendBuffer);
        var appendSize = Math.min(1, buf.length);
        sb.appendBuffer(buf.subarray(0, appendSize));
        buf = buf.subarray(appendSize);
        ++test.prototype.times;
      }
    };

    function startXHR() {
      var xhr = runner.XHRManager.createRequest(
          stream.src,
          function() {
            buf.set(xhr.getResponseData());
            appendBuffer();
          }, 0, size);
      xhr.send();
    };

    this.video.addEventListener('timeupdate', timeupdate);
    this.video.play();
    startXHR();
  };
};

createPrerollSizeTest(StreamDef.AudioTiny, 1.486, 0.557);
createPrerollSizeTest(StreamDef.AudioNormal, 0.418, 0.209);
createPrerollSizeTest(StreamDef.AudioHuge, 0.418, 0.209);

createPrerollSizeTest(StreamDef.VideoTiny, 0.25, 0.751);
createPrerollSizeTest(StreamDef.VideoNormal, 0.25, 0.667);
createPrerollSizeTest(StreamDef.VideoHuge, 0.25, 0.584);


var createSizeToPauseTest = function(stream, refPC, refDevice) {
  var test = createPerformanceTest(
      'Buffer Size Before Pausing ' + stream.name + ' in ' +
      util.SizeToText(stream.bps) + ' bps');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Determines preroll sizes for different stream ' +
      'types and qualites.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new ResetInit(new FileSource(stream.src, runner.XHRManager,
                                             runner.timeouts));
    var src = this.ms.addSourceBuffer(stream.type);

    test.prototype.times = 0;
    test.prototype.min = 0;
    test.prototype.max = 0;
    test.prototype.average = 0;
    runner.updateStatus();

    appendUntil(runner.timeouts, media, src, chain, 10, function() {
      function timeupdate(e) {
        if (this.currentTime) {
          runner.timeouts.setTimeout(function() {
            var gap = src.buffered.end(0) - media.currentTime;
            gap = util.Round(gap, 3);
            test.prototype.times = 1;
            test.prototype.min = gap;
            test.prototype.max = gap;
            test.prototype.average = gap;
            runner.updateStatus();
            runner.succeed();
          }, (src.buffered.end(0) + 3) * 1000);
        }
      };
      media.addEventListener('timeupdate', timeupdate);
      media.play();
    });
  };
};

createSizeToPauseTest(StreamDef.AudioTiny, 0, 0.094);
createSizeToPauseTest(StreamDef.AudioNormal, 0, 0.047);
createSizeToPauseTest(StreamDef.AudioHuge, 0, 0.047);

createSizeToPauseTest(StreamDef.VideoTiny, 0.083, 0.043);
createSizeToPauseTest(StreamDef.VideoNormal, 0.125, 0.084);
createSizeToPauseTest(StreamDef.VideoHuge, 0.083, 0.043);

return {tests: tests, info: info, fields: fields, viewType: 'full'};

};
