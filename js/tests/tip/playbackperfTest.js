/*
Copyright 2017 Google Inc. All rights reserved.

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

var PlaybackperfTest = function() {

var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
var tests = [];
TestBase.timeout = 70000; // 70 sec to compensate for 0.25 playbackRate tests.
var info = 'No MSE Support!';
if (window.MediaSource) {
  info = 'webkit prefix: ' + webkitPrefix.toString();
}
info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

var createPerfTest = function(name, category, mandatory) {
  var t = createTest(name);
  t.prototype.index = tests.length;
  t.prototype.passes = 0;
  t.prototype.failures = 0;
  t.prototype.timeouts = 0;
  t.prototype.category = category || 'Playback Performance';
  if (typeof mandatory === 'boolean') {
    t.prototype.mandatory = mandatory;
  }
  tests.push(t);
  return t;
};


var createPlaybackPerfTest = function(videoStream, playbackRate) {
  if (!playbackRate) {
    playbackRate = 1.0
  }
  var test = createPerfTest('PlaybackPerf' + '.' + videoStream.codec +
      '.' + videoStream.get('resolution') + videoStream.get('fps') + '@' + playbackRate + 'X',
      'Playback Performance');
  test.prototype.title = 'Playback performance test';
  test.prototype.start = function(runner, video) {
    if (video['webkitDecodedFrameCount'] === undefined ||
        video['webkitDroppedFrameCount'] === undefined) {
      runner.fail('UserAgent needs to support ' +
	          '\'video.webkitDecodedFrameCount\'' +
                  'and video.webkitDroppedFrameCount to execute this test.');
    }
    setupMse(video, runner, videoStream, Media.AAC.AudioNormal);
    video.playbackRate = playbackRate;
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      var totalDroppedFrames = video['webkitDroppedFrameCount'];
      var totalDecodedFrames = video['webkitDecodedFrameCount'];
      test.prototype.status = '(' + totalDroppedFrames + '/' +
          totalDecodedFrames + ')';
      runner.updateStatus();
      if (!video.paused && video.currentTime >= 15) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.pause();
        if (totalDecodedFrames <= 0) {
          test.prototype.status = 'Fail';
          runner.fail('UserAgent was unable to render any frames.');
        }
        runner.checkEq(totalDroppedFrames, 0, 'Total dropped frames');
        runner.succeed();
      }
    });
    video.play();
  };
};

var mediaFormats = [Media.VP9.Webgl144p30fps, Media.VP9.Webgl240p30fps,
                    Media.VP9.Webgl360p30fps, Media.VP9.Webgl480p30fps,
                    Media.VP9.Webgl720p30fps, Media.VP9.Webgl720p60fps,
                    Media.VP9.Webgl1080p30fps, Media.VP9.Webgl1080p60fps,
                    Media.VP9.Webgl1440p30fps, Media.VP9.Webgl1440p60fps,
                    Media.VP9.Webgl2160p30fps, Media.VP9.Webgl2160p60fps,
                    Media.H264.Webgl144p15fps, Media.H264.Webgl240p30fps,
                    Media.H264.Webgl360p30fps, Media.H264.Webgl480p30fps,
                    Media.H264.Webgl720p30fps, Media.H264.Webgl720p60fps,
                    Media.H264.Webgl1080p30fps, Media.H264.Webgl1080p60fps,
                    Media.H264.Webgl1440p30fps, Media.H264.Webgl2160p30fps];

for (var formatIdx in mediaFormats) {
  createPlaybackPerfTest(mediaFormats[formatIdx]);
}

createPlaybackPerfTest(Media.VP9.Webgl2160p60fps, 0.25);
createPlaybackPerfTest(Media.H264.Webgl2160p30fps, 0.25);

createPlaybackPerfTest(Media.VP9.Webgl2160p60fps, 0.5);
createPlaybackPerfTest(Media.H264.Webgl2160p30fps, 0.5);

for (var formatIdx in mediaFormats) {
  createPlaybackPerfTest(mediaFormats[formatIdx], 1.25);
}

for (var formatIdx in mediaFormats) {
  createPlaybackPerfTest(mediaFormats[formatIdx], 1.5);
}

for (var formatIdx in mediaFormats) {
  createPlaybackPerfTest(mediaFormats[formatIdx], 2.0);
}

return {tests: tests, info: info, fields: fields, viewType: 'expanded-test-status'};

};
