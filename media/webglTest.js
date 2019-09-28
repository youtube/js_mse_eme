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
 * WebGL Performance Test Suite.
 * @class
 */
var WebglTest = function() {

var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
var tests = [];
var info = 'No MSE Support!';
if (window.MediaSource) {
  info = 'webkit prefix: ' + webkitPrefix.toString();
}
info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

var createWebglTest = function(
    testId, name, category = 'WebGL', mandatory = true) {
  var t = createTest(name, category, mandatory && harnessConfig.support_webgl,
      testId, 'WebGL Performance Tests');
  t.prototype.index = tests.length;
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

/**
 * Ensure WebGL performance of given video format by comparing the playback
 * frame rate with threshold values.
 */
var createWebglPerformanceTest = function(testId, videoStream) {
  var test = createWebglTest(
      testId,
      'WebGLPerformance' + '.' + videoStream.codec + '.' +
          videoStream.get('resolution') + videoStream.get('fps'),
      'WebGL Performance ' + videoStream.codec);
  test.prototype.title = 'Test WebGL performance.';
  test.prototype.start = function(runner, video) {
    if (video['webkitDecodedFrameCount'] === undefined) {
      runner.fail('UserAgent needs to support ' +
          '\'video.webkitDecodedFrameCount\' to execute this test.');
    }
    var webglHandler = setupWebglTest(video, runner, videoStream);
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      test.prototype.status =
          '(' + webglHandler.getVideoFrameRate().toFixed(2) + ', ' +
          webglHandler.getWebglFrameRate().toFixed(2) + ')';
      runner.updateStatus();
      if (!video.paused && video.currentTime >= 15) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.pause();
        if (webglHandler.getVideoFrameRate() < 0 ||
            webglHandler.getWebglFrameRate() < 0) {
          test.prototype.status = 'Fail';
          runner.fail('UserAgent was unable to render any frames.');
        }
        // Screen refresh rates are capped at 60 so we shouldn't expect greater
        // than 60 fps perfomance.
        if (videoStream.get('fps') < 56) {
          var threshold = 0.994;
          runner.checkGE(webglHandler.getVideoFrameRate(),
              videoStream.get('fps') * threshold, 'Video frame rate');
          runner.checkGE(webglHandler.getWebglFrameRate(),
              videoStream.get('fps') * threshold, 'WebGL frame rate');
        } else {
          runner.checkGE(
              webglHandler.getVideoFrameRate(), 56, 'Video frame rate');
          runner.checkGE(
              webglHandler.getWebglFrameRate(), 56, 'WebGL frame rate');
        }
        runner.succeed();
      }
    });
    webglHandler.play();
  };
};

createWebglPerformanceTest('4.1.1.1', Media.VP9.Webgl144p30fps);
createWebglPerformanceTest('4.1.2.1', Media.VP9.Webgl240p30fps);
createWebglPerformanceTest('4.1.3.1', Media.VP9.Webgl360p30fps);
createWebglPerformanceTest('4.1.4.1', Media.VP9.Webgl480p30fps);
createWebglPerformanceTest('4.1.5.1', Media.VP9.Webgl720p30fps);
createWebglPerformanceTest('4.1.6.1', Media.VP9.Webgl720p60fps);
createWebglPerformanceTest('4.1.7.1', Media.VP9.Webgl1080p30fps);
createWebglPerformanceTest('4.1.8.1', Media.VP9.Webgl1080p60fps);
createWebglPerformanceTest('4.1.9.1', Media.VP9.Webgl1440p30fps);
createWebglPerformanceTest('4.1.10.1', Media.VP9.Webgl1440p60fps);
createWebglPerformanceTest('4.1.11.1', Media.VP9.Webgl2160p30fps);
createWebglPerformanceTest('4.1.12.1', Media.VP9.Webgl2160p60fps);

createWebglPerformanceTest('4.2.1.1', Media.H264.Webgl144p15fps);
createWebglPerformanceTest('4.2.2.1', Media.H264.Webgl240p30fps);
createWebglPerformanceTest('4.2.3.1', Media.H264.Webgl360p30fps);
createWebglPerformanceTest('4.2.4.1', Media.H264.Webgl480p30fps);
createWebglPerformanceTest('4.2.5.1', Media.H264.Webgl720p30fps);
createWebglPerformanceTest('4.2.6.1', Media.H264.Webgl720p60fps);
createWebglPerformanceTest('4.2.7.1', Media.H264.Webgl1080p30fps);
createWebglPerformanceTest('4.2.8.1', Media.H264.Webgl1080p60fps);
createWebglPerformanceTest('4.2.9.1', Media.H264.Webgl1440p30fps);
createWebglPerformanceTest('4.2.10.1', Media.H264.Webgl2160p30fps);

return {
  tests: tests,
  info: info,
  fields: fields,
  viewType: 'expanded-test-status'
};

};

try {
  exports.getTest = WebglTest;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}