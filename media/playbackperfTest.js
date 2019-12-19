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
 * Playback Performance Test Suite.
 * @class
 */
var PlaybackperfTest = function(subgroup, suite) {

  var webkitPrefix = MediaSource.prototype.version.indexOf('webkit') >= 0;
  var tests = [];
  // 100 sec to compensate for 0.25 playbackRate tests.
  TestBase.timeout = 100000;
  var info = 'No MSE Support!';
  if (window.MediaSource) {
    info = 'webkit prefix: ' + webkitPrefix.toString();
  }
  info += ' | Default Timeout: ' + TestBase.timeout + 'ms';

  var fields = ['passes', 'failures', 'timeouts'];

  var createPerfTest = function(
      testId, name, category = 'Playback Performance', mandatory = true) {
    var t = createTest(name, category, mandatory, testId, suite);
    t.prototype.index = tests.length;
    t.prototype.emeHandler = new EMEHandler();
    t.prototype.baseTearDown = t.prototype.teardown;
    t.prototype.teardown = function(testSuiteVer, cb) {
      t.prototype.emeHandler.closeAllKeySessions(function() {
        t.prototype.emeHandler = new EMEHandler();
      });
      this.baseTearDown(testSuiteVer, cb);
    };
    tests.push(t);
    return t;
  };

  /**
   * Helper class to update status and do assertion for the performance tests.
   * @private
   */
  class PerfTestUtil_ {
    constructor(test, runner, video) {
      this.test_ = test;
      this.runner_ = runner;
      this.videoPerfMetrics_ = this.getVideoPerfMetrics(video);
    }

    getVideoPerfMetrics(video) {
      var videoPerfMetrics = new VideoPerformanceMetrics(video);
      if (!videoPerfMetrics.supportsVideoPerformanceMetrics()) {
        this.runner_.fail(`UserAgent needs to support
            'video.getVideoPlaybackQuality' or the combined
            'video.webkitDecodedFrameCount'
            and 'video.webkitDroppedFrameCount' to execute this test.`);
      }
      return videoPerfMetrics;
    }

    getTotalDecodedFrames() {
      return this.videoPerfMetrics_.getTotalDecodedVideoFrames();
    }

    getTotalDroppedFrames() {
      return this.videoPerfMetrics_.getDroppedVideoFrames();
    }

    updateVideoPerfMetricsStatus() {
      this.test_.prototype.status =
          `(${this.getTotalDroppedFrames()}/${this.getTotalDecodedFrames()})`;
      this.runner_.updateStatus();
    }

    assertAtLeastOneFrameDecoded() {
      if (this.getTotalDecodedFrames() <= 0) {
        this.test_.prototype.status = 'Fail';
        this.runner_.fail('UserAgent was unable to render any frames.');
      }
    }

    assertMaxDroppedFrames(maxDroppedFrames) {
      this.runner_.checkLE(
          this.getTotalDroppedFrames(),
          maxDroppedFrames,
          'Total dropped frames');
    }

    assertMaxDroppedFramesRatio(maxRatio) {
      this.runner_.checkLE(
          this.getTotalDroppedFrames() / this.getTotalDecodedFrames(),
          maxRatio,
          'Total dropped frames / total decoded frames');
    }
  }

  /**
   * Creates a TotalVideoFrames test that validates whether the
   * totalVideoFrames reported from VideoPlaybackQuality is correct by
   * comparing it against the total frames in the video file.
   */
  var createTotalVideoFramesValidationTest = function(
      testId, videoStream, frames) {
    var test =
        createPerfTest(testId, 'TotalVideoFrames', 'Media Playback Quality');
    test.prototype.title = 'TotalVideoFrames Validation';
    test.prototype.start = function(runner, video) {
      var ms = new MediaSource();
      var audioStream = Media.AAC.Audio1MB;
      var videoSb;
      var audioSb;
      var perfTestUtil = new PerfTestUtil_(test, runner, video);

      var videoXhr = runner.XHRManager.createRequest(
          videoStream.src, function(e) {
        videoSb.appendBuffer(this.getResponseData());
        videoSb.addEventListener('updateend', function() {
          ms.endOfStream();
          video.addEventListener('ended', function() {
            runner.checkEq(
                perfTestUtil.getTotalDecodedFrames(),
                frames,
                'playbackQuality.totalVideoFrames');
            runner.succeed();
          });
        });
        video.addEventListener('timeupdate', function(e) {
          perfTestUtil.updateVideoPerfMetricsStatus();
        });
        video.play();
      });
      var audioXhr = runner.XHRManager.createRequest(
          audioStream.src, function(e) {
        audioSb.appendBuffer(this.getResponseData());
        videoXhr.send();
      }, 0, 131100); // audio is longer than video.

      ms.addEventListener('sourceopen', function() {
        videoSb = ms.addSourceBuffer(videoStream.mimetype);
        audioSb = ms.addSourceBuffer(audioStream.mimetype);
        audioXhr.send();
      });

      video.src = window.URL.createObjectURL(ms);
    };
  };

  /**
   * Ensure that browser is able to detect frame drops by correctly
   * implementing the DroppedFrameCount API.
   */
  var createFrameDropValidationTest = function(
      testId, videoStream1, videoStream2) {
    var test = createPerfTest(testId, 'FrameDrop', 'Media Playback Quality');
    test.prototype.title = 'Frame Drop Validation';
    test.prototype.start = function(runner, video) {
      var perfTestUtil = new PerfTestUtil_(test, runner, video);
      var playVideo = function(videoStream) {
        setupMse(video, runner, videoStream, Media.AAC.AudioNormal);
        video.playbackRate = 2.0;
        video.addEventListener('timeupdate', function onTimeUpdate(e) {
          perfTestUtil.updateVideoPerfMetricsStatus();

          if (!video.paused && video.currentTime >= 15) {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.pause();
            perfTestUtil.assertAtLeastOneFrameDecoded();
            var totalDroppedFrames = perfTestUtil.getTotalDroppedFrames();
            if (totalDroppedFrames > 2) {
              runner.succeed();
            } else if (videoStream2.src == videoStream.src) {
              runner.fail('UserAgent produced ' + totalDroppedFrames +
                  ' dropped frames.');
            } else {
              playVideo(videoStream2);
            }
          }
        });
        video.play();
      };
      playVideo(videoStream1);
    };
  };

  /**
   * Ensure no dropped frame is encountered during playback of specified media
   * format in certain playback rate.
   */
  var createPlaybackPerfTest = function(
      testId, videoStream, playbackRate, category,
      stopPlayback, assertTest, drmScheme, mandatory) {
    // H264 tests that are greater than 1080p are optional
    var isOptionalPlayBackPerfStream = function(videoStream) {
      return videoStream.codec == 'H264' &&
          (util.compareResolutions(
              videoStream.get('resolution'), '1080p') > 0);
    };
    var isOptionalFramePlaybackRate = function(videoStream, playbackRate) {
      return videoStream.get('fps') >= 60 && playbackRate > 1;
    };
    mandatory = (typeof mandatory != 'undefined') ?
      mandatory :
      !isOptionalPlayBackPerfStream(videoStream)
          && isTypeSupported(videoStream)
          && !isOptionalFramePlaybackRate(videoStream, playbackRate);

    var test = createPerfTest(
        testId,
        `PlaybackPerf${videoStream.codec}${videoStream.get('resolution')}` +
            `${videoStream.get('quality') ? videoStream.get('quality') : ''}` +
            `${videoStream.get('fps')}fps@${playbackRate}X`,
        category,
        mandatory);
    test.prototype.title = 'Playback performance test';
    test.prototype.start = function(runner, video) {
      var testEmeHandler = this.emeHandler;
      var perfTestUtil = new PerfTestUtil_(test, runner, video);
      setupMse(video, runner, videoStream, Media.AAC.AudioNormal, 6);
      if (drmScheme) {
        setupEme(runner, testEmeHandler, video, videoStream, drmScheme);
      }
      video.playbackRate = playbackRate;
      video.addEventListener('timeupdate', function onTimeUpdate(e) {
        if (video.currentTime > 0 && video.currentTime < 10) {
          video.currentTime = 10;
          return;
        }
        perfTestUtil.updateVideoPerfMetricsStatus();
        if (stopPlayback(video, testEmeHandler)) {
          video.removeEventListener('timeupdate', onTimeUpdate);
          video.pause();
          if (video.playbackRate != playbackRate) {
            runner.fail('playbackRate is not set');
          }
          assertTest(perfTestUtil);
          runner.succeed();
        }
      });
      video.play();
    };
  };

  var mediaFormatsVP9 = [
    Media.VP9.Webgl144p30fps,
    Media.VP9.Webgl240p30fps,
    Media.VP9.Webgl360p30fps,
    Media.VP9.Webgl480p30fps,
    Media.VP9.Webgl720p30fps,
    Media.VP9.Webgl1080p30fps,
    Media.VP9.Webgl1440p30fps,
    Media.VP9.Webgl2160p30fps
  ];

  var mediaFormatsH264 = [
    Media.H264.Webgl144p15fps,
    Media.H264.Webgl240p30fps,
    Media.H264.Webgl360p30fps,
    Media.H264.Webgl480p30fps,
    Media.H264.Webgl720p30fps,
    Media.H264.Webgl1080p30fps,
    Media.H264.Webgl1440p30fps,
    Media.H264.Webgl2160p30fps
  ];

  var mediaFormatsAV1 = [
    Media.AV1.Bunny144p30fps,
    Media.AV1.Bunny240p30fps,
    Media.AV1.Bunny360p30fps,
    Media.AV1.Bunny480p30fps,
    Media.AV1.Bunny720p30fps,
    Media.AV1.Bunny1080p30fps,
    Media.AV1.Bunny1440p30fps,
    Media.AV1.Sports2160p30fps,
  ];

  var mediaFormatsHfr = [
    Media.VP9.Webgl720p60fps,
    Media.VP9.Webgl1080p60fps,
    Media.VP9.Webgl1440p60fps,
    Media.VP9.Webgl2160p60fps,
    Media.H264.Webgl720p60fps,
    Media.H264.Webgl1080p60fps,
    Media.AV1.Bunny720p60fps,
    Media.AV1.Bunny1080p60fps,
    Media.AV1.Bunny1440p60fps,
  ];

  var widevineMediaFormatsVP9 = [
    Media.VP9.DrmL3NoHDCP240p30fpsEnc,
    Media.VP9.DrmL3NoHDCP360p30fpsEnc,
    Media.VP9.DrmL3NoHDCP480p30fpsEnc,
    Media.VP9.DrmL3NoHDCP480p30fpsMqEnc,
    Media.VP9.DrmL3NoHDCP480p30fpsHqEnc,
    Media.VP9.DrmL3NoHDCP720p30fpsEnc,
    Media.VP9.DrmL3NoHDCP720p30fpsMqEnc,
    Media.VP9.DrmL3NoHDCP720p30fpsHqEnc,
    Media.VP9.DrmL3NoHDCP1080p30fpsEnc,
    Media.VP9.DrmL3NoHDCP1080p30fpsMqEnc,
    Media.VP9.DrmL3NoHDCP1080p30fpsHqEnc,
    Media.VP9.Sintel2kEnc,
    Media.VP9.Sintel4kEnc
  ];

  var widevineMediaFormatsH264 = [
    Media.H264.DrmL3NoHDCP144p30fpsCenc,
    Media.H264.DrmL3NoHDCP240p30fpsCenc,
    Media.H264.DrmL3NoHDCP360p30fpsCenc,
    Media.H264.DrmL3NoHDCP480p30fpsCenc,
    Media.H264.DrmL3NoHDCP480p30fpsMqCenc,
    Media.H264.DrmL3NoHDCP480p30fpsHqCenc,
    Media.H264.DrmL3NoHDCP720p30fpsCenc,
    Media.H264.DrmL3NoHDCP720p30fpsMqCenc,
    Media.H264.DrmL3NoHDCP720p30fpsHqCenc,
    Media.H264.DrmL3NoHDCP1080p30fpsCenc,
    Media.H264.DrmL3NoHDCP1080p30fpsMqCenc,
    Media.H264.DrmL3NoHDCP1080p30fpsHqCenc
  ];

  var widevineMediaFormatsHfr = [
    Media.VP9.DrmL3NoHDCP720p60fpsEnc,
    Media.VP9.DrmL3NoHDCP720p60fpsMqEnc,
    Media.VP9.DrmL3NoHDCP1080p60fpsEnc,
    Media.VP9.DrmL3NoHDCP1080p60fpsMqEnc,
    Media.H264.DrmL3NoHDCP720p60fpsCenc,
    Media.H264.DrmL3NoHDCP720p60fpsMqCenc,
    Media.H264.DrmL3NoHDCP1080p60fpsCenc,
    Media.H264.DrmL3NoHDCP1080p60fpsMqCenc
  ];

  var playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  function shouldStopPlayback(video) {
    return !video.paused && video.currentTime >= 25;
  }

  function shouldStopDrmPlayback(video, emeHandler) {
    return shouldStopPlayback(video) && !emeHandler.keyUnusable;
  }

  function defaultTestAssertion(perfTestUtil) {
    perfTestUtil.assertAtLeastOneFrameDecoded();
    perfTestUtil.assertMaxDroppedFrames(1);
  }

  function HFRHighSpeedPlaybackTestAssertion(perfTestUtil) {
    perfTestUtil.assertAtLeastOneFrameDecoded();
    perfTestUtil.assertMaxDroppedFramesRatio(0.5);
  }

  function getTestAssertion(playbackSpeed, isHFR) {
    if (isHFR && playbackSpeed > 1)
      return HFRHighSpeedPlaybackTestAssertion;
    else
      return defaultTestAssertion;
  }

  /**
   * Create Playback Performance tests for given media formats across all
   * playback speeds.
   */
  function createPlaybackPerfTestSuite(
      suiteId, mediaFormats, category, stopPlayback, isHFR, drmScheme) {
    createTotalVideoFramesValidationTest(
        `${suiteId}.1.1.1`, Media.H264.Video1MB, 25);
    createFrameDropValidationTest(
        `${suiteId}.1.2.1`,
        Media.H264.Webgl1080p60fps,
        Media.VP9.Webgl2160p60fps);
    var testCaseId = 1;
    for (var formatIdx in mediaFormats) {
      for (var s in playbackSpeeds) {
        if (util.compareResolutions(
            mediaFormats[formatIdx].get('resolution'), '720p') < 0
            && playbackSpeeds[s] != 1) {
          continue;
        }
        createPlaybackPerfTest(
            `${suiteId}.2.${testCaseId}.1`,
            mediaFormats[formatIdx],
            playbackSpeeds[s],
            category,
            stopPlayback,
            getTestAssertion(playbackSpeeds[s], isHFR),
            drmScheme);
        testCaseId++;
      }
    }
  }

  switch (subgroup) {
    case 'sfr-vp9':
      createPlaybackPerfTestSuite(
          '7',
          mediaFormatsVP9,
          'VP9 SFR Playback Performance',
          shouldStopPlayback,
          false);
      break;
    case 'sfr-h264':
      createPlaybackPerfTestSuite(
          '8',
          mediaFormatsH264,
          'H264 SFR Playback Performance',
          shouldStopPlayback,
          false);
      break;
    case 'sfr-av1':
      createPlaybackPerfTestSuite(
          '9',
          mediaFormatsAV1,
          'AV1 SFR Playback Performance',
          shouldStopPlayback,
          false);
      break;
    case 'hfr':
      createPlaybackPerfTestSuite(
          '10',
          mediaFormatsHfr,
          'HFR Playback Performance',
          shouldStopPlayback,
          true);
      break;
    case 'widevine-sfr-vp9':
      createPlaybackPerfTestSuite(
          '11',
          widevineMediaFormatsVP9,
          'VP9 Widevine SFR Playback Performance',
          shouldStopDrmPlayback,
          false,
          LicenseManager.WIDEVINE);
      break;
    case 'widevine-sfr-h264':
      createPlaybackPerfTestSuite(
          '12',
          widevineMediaFormatsH264,
          'H264 Widevine SFR Playback Performance',
          shouldStopDrmPlayback,
          false,
          LicenseManager.WIDEVINE);
      break;
    case 'widevine-hfr':
      createPlaybackPerfTestSuite(
          '13',
          widevineMediaFormatsHfr,
          'Widevine HFR Playback Performance',
          shouldStopDrmPlayback,
          true,
          LicenseManager.WIDEVINE);
      break;
  }

  return {
    tests: tests,
    info: info,
    fields: fields,
    viewType: 'expanded-test-status'
  };

};

var PlaybackperfTestAll = function() {
  PlaybackperfTest('sfr-vp9', 'VP9 SFR Tests');
  PlaybackperfTest('sfr-h264', 'H264 SFR Tests');
  PlaybackperfTest('sfr-av1', 'AV1 SFR Tests');
  PlaybackperfTest('hfr', 'HFR Tests');
  PlaybackperfTest('widevine-sfr-vp9', 'VP9 Widevine SFR Tests');
  PlaybackperfTest('widevine-sfr-h264', 'H264 Widevine SFR Tests');
  PlaybackperfTest('widevine-hfr', 'Widevine HFR Tests');
};

try {
  exports.getTest = PlaybackperfTestAll;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
