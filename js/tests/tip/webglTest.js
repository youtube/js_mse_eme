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

var WebglTest = function() {

var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource) {
  info = ' | webkit prefix: ' + webkitPrefix.toString();
}
info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

var createWebglTest = function(name, category, mandatory) {
  var t = createTest(name);
  t.prototype.index = tests.length;
  t.prototype.passes = 0;
  t.prototype.failures = 0;
  t.prototype.timeouts = 0;
  t.prototype.category = category || 'WebGL';
  if (typeof mandatory === 'boolean') {
    t.prototype.mandatory = mandatory;
  }
  tests.push(t);
  return t;
};

function setupWebglTest(video, runner, videoStream) {
  setupMse(video, runner, videoStream, null);

  // Create canvas in testarea.
  var testarea = document.getElementById('testarea');
  var canvas = util.createElement('canvas', 'canvas1');
  testarea.appendChild(canvas);

  return new WebglHandler(video, canvas);
}


var createWebglPerformanceTest = function(videoStream) {
  var test = createWebglTest('WebGLPerformance' + '.' + videoStream.codec +
      '.' + videoStream.get('resolution') + videoStream.get('fps'),
      'WebGL Performance ' + videoStream.codec);
  test.prototype.title = 'Test WebGL performance.';
  test.prototype.start = function(runner, video) {
    if (video['webkitDecodedFrameCount'] === undefined) {
      runner.fail('UserAgent needs to support \'video.webkitDecodedFrameCount\'' +
                  ' to execute this test.');
    }
    var webglHandler = setupWebglTest(video, runner, videoStream);
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      test.prototype.status =
          '(' + webglHandler.getVideoFrameRate().toFixed(3) + ', ' +
          webglHandler.getWebglFrameRate().toFixed(3) + ')';
      runner.updateStatus();
      if (!video.paused && video.currentTime >= 15) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.pause();
        // Screen refresh rates are capped at 60 so we shouldn't expect greater
        // than 60 fps perfomance.
        if (videoStream.get('fps') < 55) {
          runner.checkGE(webglHandler.getVideoFrameRate(),
              videoStream.get('fps'), 'Video frame rate');
          runner.checkGE(webglHandler.getWebglFrameRate(),
              videoStream.get('fps'), 'WebGL frame rate');
        } else {
          runner.checkGE(webglHandler.getVideoFrameRate(), 55, 'Video frame rate');
          runner.checkGE(webglHandler.getWebglFrameRate(), 55, 'WebGL frame rate');
        }
        runner.succeed();
      }
    });
    webglHandler.play();
  };
};

createWebglPerformanceTest(Media.VP9.Webgl144p30fps);
createWebglPerformanceTest(Media.VP9.Webgl240p30fps);
createWebglPerformanceTest(Media.VP9.Webgl360p30fps);
createWebglPerformanceTest(Media.VP9.Webgl480p30fps);
createWebglPerformanceTest(Media.VP9.Webgl720p30fps);
createWebglPerformanceTest(Media.VP9.Webgl720p60fps);
createWebglPerformanceTest(Media.VP9.Webgl1080p30fps);
createWebglPerformanceTest(Media.VP9.Webgl1080p60fps);
createWebglPerformanceTest(Media.VP9.Webgl1440p30fps);
createWebglPerformanceTest(Media.VP9.Webgl1440p60fps);
createWebglPerformanceTest(Media.VP9.Webgl2160p30fps);
createWebglPerformanceTest(Media.VP9.Webgl2160p60fps);

createWebglPerformanceTest(Media.H264.Webgl144p15fps);
createWebglPerformanceTest(Media.H264.Webgl240p30fps);
createWebglPerformanceTest(Media.H264.Webgl360p30fps);
createWebglPerformanceTest(Media.H264.Webgl480p30fps);
createWebglPerformanceTest(Media.H264.Webgl720p30fps);
createWebglPerformanceTest(Media.H264.Webgl720p60fps);
createWebglPerformanceTest(Media.H264.Webgl1080p30fps);
createWebglPerformanceTest(Media.H264.Webgl1080p60fps);
createWebglPerformanceTest(Media.H264.Webgl1440p30fps);
createWebglPerformanceTest(Media.H264.Webgl2160p30fps);

return {tests: tests, info: info, fields: fields, viewType: 'compact'};

};
