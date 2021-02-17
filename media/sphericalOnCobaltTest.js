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

// LINT.IfChange

/**
 * Spherical video playback on Cobalt Test Suite.
 * @class
 * @classdesc This test suite is Cobalt specific (https://cobalt.dev).
 * It validates spherical video playback on Cobalt and
 * the capability of decoding video to texture.
 */
var SphericalOnCobaltTest = function() {
  var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
  var tests = [];
  var info = 'No MSE Support!';
  if (window.MediaSource) {
    info = 'webkit prefix: ' + webkitPrefix.toString();
  }
  info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

  var createSphericalTest =
      function(testId, name, category = 'Playback Performance', mandatory = true) {
    var t = createTest(name, category, mandatory, testId, 'Cobalt Spherical Tests');
    t.prototype.index = tests.length;
    tests.push(t);
    return t;
  };

  // map-to-mesh is provided by Cobalt, for more info:
  // https://cobalt.googlesource.com/cobalt/+/master/src/cobalt/doc/spherical_video.md
  function checkForMapToMeshSupport() {
    return 'CSS' in window && 'supports' in window.CSS &&
           CSS.supports(
               'filter',
               'map-to-mesh(url(p.msh), 100deg 60deg,' +
                   'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),' +
                   'monoscopic)');
  }

  function setUpStyle(videoElement) {
      videoElement.className = 'spinner';
      videoElement.style.filter =
          'map-to-mesh(' +
              'equirectangular,' +
              ' 100deg 60deg,' +
              ' matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),' +
              ' stereoscopic-top-bottom)';
  }

  function getFPS() {
    if ('h5vcc' in window && 'cVal' in window.h5vcc) {
      // Query Cobalt for the average amount of time between the start of
      // each frame.  Translate that into a framerate and then update a
      // framerate counter on the window.
      var average_frame_time_in_us = window.h5vcc.cVal.getValue(
          'Renderer.Rasterize.DurationInterval.Avg');
      if (!average_frame_time_in_us || average_frame_time_in_us <= 0) {
        // In older versions of Cobalt use a different name for the framerate
        // counter, so try falling back to that if the first fails.
        average_frame_time_in_us = window.h5vcc.cVal.getValue(
            'Renderer.Rasterize.Duration.Avg');
      }
      if (average_frame_time_in_us && average_frame_time_in_us > 0) {
        // Convert frame time into frame rate (by taking the inverse).
        // We also multiply by 1000000 to convert from microseconds to
        // seconds.
        return Math.round(1000000.0 / average_frame_time_in_us);
      }
    }
    return 0;
  }

  /**
   * Ensure performance of given spherical video format on Cobalt by
   * comparing the playback frame rate with threshold values.
   */
  var createSphericalPerformanceTest = function(
      testId, videoStream, mandatory) {
    if (mandatory == null) {
      if (videoStream.get('fps') == 30) {
        mandatory = ((util.getMaxWindow()[0] * util.getMaxWindow()[1]) >=
            (videoStream.get('width') * videoStream.get('height')));
      } else {
        mandatory = isTypeSupported(videoStream);
      }
      mandatory = mandatory && util.isCobalt();
    }
    var test = createSphericalTest(
        testId, 'SphericalPerformance' + '.' + videoStream.codec + '.' +
            videoStream.get('resolution') + videoStream.get('fps'),
        'Spherical Video Performance ' + videoStream.codec,
        mandatory);
    test.prototype.title = 'Test spherical video performance.';
    test.prototype.start = function(runner, video) {
      var self = this;
      var frameRateCount = 0;
      var averageFps = 0;

      if (!util.isCobalt()) {
        runner.fail('Device is not Cobalt.');
      } else if (!checkForMapToMeshSupport()) {
        runner.fail("No map-to-mesh support on Cobalt.");
      }
      if (!isTypeSupported(videoStream))
        runner.fail('Format is not supported.');

      var videoPerfMetrics = new VideoPerformanceMetrics(video);
      if (!videoPerfMetrics.supportsVideoPerformanceMetrics()) {
        runner.fail('UserAgent needs to support ' +
                    '\'video.getVideoPlaybackQuality\' or the combined ' +
                    '\'video.webkitDecodedFrameCount\'' +
                    'and video.webkitDroppedFrameCount to execute this test.');
      }
      setUpStyle(video);
      setupMse(video, runner, videoStream, Media.AAC.AudioNormal);
      video.addEventListener('timeupdate', function onTimeUpdate(e) {
        frameRateCount++;
        averageFps += getFPS();

        if (!video.paused && video.currentTime >= 15) {
          video.removeEventListener('timeupdate', onTimeUpdate);
          video.pause();
          averageFps = averageFps / frameRateCount;
          var droppedFrames = videoPerfMetrics.getDroppedVideoFrames();
          var minFps = Math.min(
              (videoPerfMetrics.getTotalDecodedVideoFrames() - droppedFrames) /
                  video.currentTime,
              averageFps);
          test.prototype.status =
              '(' + droppedFrames.toFixed(2) + ', ' + minFps.toFixed(2) + ')';
          runner.updateStatus();

          if (minFps <= 0) {
            runner.fail('UserAgent was unable to render any frames.');
          }
          // Screen refresh rates are capped at 60 so we shouldn't expect
          // greater than 60 fps perfomance.
          if (videoStream.get('fps') < 56) {
            var threshold = 0.994;
            runner.checkGE(
                minFps, videoStream.get('fps') * threshold, 'Video frame rate');
          } else {
            runner.checkGE(minFps, 56, 'Video frame rate');
          }
          runner.checkLE(droppedFrames, 1, 'Total dropped frames');
          runner.succeed();
        }
      });
      video.play();
    };
  };

  createSphericalPerformanceTest('5.1.1.1', Media.VP9.Spherical144s30fps);
  createSphericalPerformanceTest('5.1.2.1', Media.VP9.Spherical240s30fps);
  createSphericalPerformanceTest('5.1.3.1', Media.VP9.Spherical360s30fps);
  createSphericalPerformanceTest('5.1.4.1', Media.VP9.Spherical480s30fps);
  createSphericalPerformanceTest('5.1.5.1', Media.VP9.Spherical720s30fps);
  createSphericalPerformanceTest('5.1.6.1', Media.VP9.Spherical720s60fps);
  createSphericalPerformanceTest('5.1.7.1', Media.VP9.Spherical1080s30fps);
  createSphericalPerformanceTest('5.1.8.1', Media.VP9.Spherical1080s60fps);
  createSphericalPerformanceTest('5.1.9.2', Media.VP9.Spherical1440s30fps);
  createSphericalPerformanceTest('5.1.10.1', Media.VP9.Spherical1440s60fps);
  createSphericalPerformanceTest('5.1.11.2', Media.VP9.Spherical2160s30fps);
  createSphericalPerformanceTest('5.1.12.1', Media.VP9.Spherical2160s60fps);

  createSphericalPerformanceTest('5.2.1.1', Media.H264.Spherical144s30fps);
  createSphericalPerformanceTest('5.2.2.1', Media.H264.Spherical240s30fps);
  createSphericalPerformanceTest('5.2.3.1', Media.H264.Spherical360s30fps);
  createSphericalPerformanceTest('5.2.4.1', Media.H264.Spherical480s30fps);
  createSphericalPerformanceTest('5.2.5.1', Media.H264.Spherical720s30fps);
  createSphericalPerformanceTest('5.2.6.1', Media.H264.Spherical720s60fps);
  createSphericalPerformanceTest('5.2.7.1', Media.H264.Spherical1080s30fps);
  createSphericalPerformanceTest('5.2.8.1', Media.H264.Spherical1080s60fps);
  createSphericalPerformanceTest(
      '5.2.9.2', Media.H264.Spherical1440s30fps, false);
  createSphericalPerformanceTest('5.2.10.1', Media.H264.Spherical1440s60fps);
  createSphericalPerformanceTest(
      '5.2.11.2', Media.H264.Spherical2160s30fps, false);
  createSphericalPerformanceTest('5.2.12.1', Media.H264.Spherical2160s60fps);

  return {
    tests: tests,
    info: info,
    viewType: 'expanded-test-status'
  };

};
window.SphericalOnCobaltTest = SphericalOnCobaltTest;

try {
  exports.getTest = SphericalOnCobaltTest;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}

// LINT.ThenChange(//depot/google3/third_party/javascript/yts/media/sphericalOnCobaltTest.json)
