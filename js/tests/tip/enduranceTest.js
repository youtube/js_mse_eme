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

var EnduranceTest = function() {

var tests = [];
var info = 'Please use these tests to check for resource leaks or ' +
    'accumulating issues.';
var fields = ['elapsed'];

var createEnduranceTest = function(name) {
  var t = createMSTest(name);
  t.prototype.index = tests.length;
  t.prototype.elapsed = 0;
  t.prototype.timeout = 2147483647;
  tests.push(t);
  return t;
};

var enableProgressUpdate = function(test, runner, media) {
  test.prototype.elapsed = 0;
  runner.updateStatus();

  runner.timeouts.setInterval(function() {
    test.prototype.elapsed = util.Round(media.currentTime, 3);
    runner.updateStatus();
  }, 1000);
};

var createOneShotTest = function(stream) {
  var test = createEnduranceTest(util.MakeCapitalName(stream.name) + 'OneShot');
  test.prototype.title = 'XHR and Play media once.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var sb = this.ms.addSourceBuffer(stream.type);
    sb.addEventListener('update', function(e) {
      var end = util.Round(sb.buffered.end(0), 2);
      media.addEventListener('timeupdate', function(e) {
        if (!media.paused && media.currentTime > end - 1) {
          media.pause();
          runner.succeed();
        }
      });
      media.play();
    });

    enableProgressUpdate(test, runner, media);

    var xhr = runner.XHRManager.createRequest(stream.src, function(e) {
      sb.appendBuffer(this.getResponseData());
    });
    xhr.send();
  };
};

createOneShotTest(StreamDef.AudioNormal);
createOneShotTest(StreamDef.VideoNormal);


var createInfiniteLoopTest = function(stream) {
  var test = createEnduranceTest('Infinite' +
                                   util.MakeCapitalName(stream.name) + 'Loop');
  test.prototype.title = 'Play in an infinite loop, good way to see if ' +
      'there is any resource leak.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new InfiniteStream(new ResetInit(
        new FileSource(stream.src, runner.XHRManager, runner.timeouts)));
    var src = this.ms.addSourceBuffer(stream.type);

    enableProgressUpdate(test, runner, media);

    appendUntil(runner.timeouts, media, src, chain, 1, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 20, Infinity, src, chain, null, null,
          function() {}
      );
    });
  };
};

createInfiniteLoopTest(StreamDef.AudioNormal);
createInfiniteLoopTest(StreamDef.VideoNormal);


var createInfiniteAVLoopTest = function(audio, video, desc) {
  var test = createEnduranceTest('InfiniteAVLoop' + desc);
  test.prototype.times = 'n/a';
  test.prototype.length = 'n/a';
  test.prototype.title =
    'Play in an infinite loop, good way to see if there is any resource leak.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var timeouts = runner.timeouts;
    var media = this.video;
    var video_chain = new InfiniteStream(new ResetInit(
        new FileSource(video.src, runner.XHRManager, runner.timeouts)));
    var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
    var audio_chain = new InfiniteStream(new ResetInit(
        new FileSource(audio.src, runner.XHRManager, runner.timeouts)));
    var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);

    enableProgressUpdate(test, runner, media);

    media.addEventListener('needkey', function(e) {
      e.target.generateKeyRequest('org.w3.clearkey', e.initData);
    });

    media.addEventListener('keymessage', function(e) {
      var key = new Uint8Array([
          0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
          0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]);
      var key_id = new Uint8Array([
          0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
          0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e]);
      e.target.addKey('org.w3.clearkey', key, key_id, e.sessionId);
    });
    appendUntil(timeouts, media, video_src, video_chain, 1, function() {
      appendUntil(timeouts, media, audio_src, audio_chain, 1, function() {
        media.play();
        playThrough(
            timeouts, media, 5, Infinity, video_src, video_chain,
            audio_src, audio_chain, function() {}
        );
      });
    });
  };
};

createInfiniteAVLoopTest(StreamDef.AudioTiny, StreamDef.VideoTiny, 'Tiny');
createInfiniteAVLoopTest(StreamDef.AudioNormal, StreamDef.VideoNormal,
                         'Normal');
createInfiniteAVLoopTest(StreamDef.AudioHuge, StreamDef.VideoHuge, 'Huge');

var createSourceAbortTest = function(stream) {
  var test = createEnduranceTest('Source Abort Test');
  test.prototype.title = 'Source Abort Test.';
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

    var segs = [];
    var i = 0;
    var j = 0;
    var k = 0;

    src.addEventListener('update', function(e) {
      if (i < segs[1].length) { 
        if (j < segs[2].length) { 
          if (k < segs[3].length) {
            src.appendBuffer(segs[1].subarray(0, i));
            src.abort();
            src.appendBuffer(segs[2].subarray(0, j));
            src.abort();
            src.appendBuffer(segs[3].subarray(0, k));
            src.abort();
            test.prototype.elapsed++;
            runner.updateStatus();
            k++;
            if (k == segs[3].length) {
              k = 0;
              j++;
              if (j == segs[2].length) {
                j = 0;
                i++;
                if (i == segs[1].length) {
                  runner.succeed();
                  return;
                }
              }
            }
            runner.timeouts.setTimeout(doTest, 0);
          }
        }
      }
    });

    function doTest() {
      src.appendBuffer(segs[0]);
    }

    chain.pull(function(data) {
      segs.push(data);
      chain.pull(function(data) {
        segs.push(data);
        chain.pull(function(data) {
          segs.push(data);
          chain.pull(function(data) {
            segs.push(data);
            doTest();
          });
        });
      });
    });
  };
};

createSourceAbortTest(StreamDef.VideoHuge);

return {tests: tests, info: info, fields: fields, viewType: 'full'};

};

