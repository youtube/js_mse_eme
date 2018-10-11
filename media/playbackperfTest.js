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

/**
 * Playback Performance Test Suite.
 * @class
 */
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

/**
 * Creates a TotalVideoFrames test that validates whether the totalVideoFrames
 * reported from VideoPlaybackQuality is correct by comparing it against the
 * total frames in the video file.
 */
var createTotalVideoFramesValidationTest = function(videoStream, frames) {
  var test = createPerfTest('TotalVideoFrames', 'Media Playback Quality');
  test.prototype.title = 'TotalVideoFrames Validation';
  test.prototype.start = function(runner, video) {
    var ms = new MediaSource();
    var audioStream = Media.AAC.Audio1MB;
    var videoSb;
    var audioSb;
    var totalDecodedFrames = 0;
    var videoPerfMetrics = new VideoPerformanceMetrics(video);
    if (!videoPerfMetrics.supportsVideoPerformanceMetrics()) {
      runner.fail('UserAgent needs to support ' +
                  '\'video.getVideoPlaybackQuality\' or the combined ' +
                  '\'video.webkitDecodedFrameCount\'' +
                  'and video.webkitDroppedFrameCount to execute this test.');
    }
    ms.addEventListener('sourceopen', function() {
      videoSb = ms.addSourceBuffer(videoStream.mimetype);
      audioSb = ms.addSourceBuffer(audioStream.mimetype);
    });
    video.src = window.URL.createObjectURL(ms);

    var videoXhr = runner.XHRManager.createRequest(
        videoStream.src, function(e) {
      videoSb.appendBuffer(this.getResponseData());
      videoSb.addEventListener('updateend', function() {
        ms.endOfStream();
        video.addEventListener('ended', function() {
          runner.checkEq(
              totalDecodedFrames, frames, 'playbackQuality.totalVideoFrames');
          runner.succeed();
        });
      });
      video.addEventListener('timeupdate', function(e) {
          totalDecodedFrames = videoPerfMetrics.getTotalDecodedVideoFrames();
          test.prototype.status = '(' + totalDecodedFrames + ')';
          runner.updateStatus();
      });
      video.play();
    });
    var audioXhr = runner.XHRManager.createRequest(
        audioStream.src, function(e) {
      audioSb.appendBuffer(this.getResponseData());
      videoXhr.send();
    }, 0, 131100); // audio is longer than video.
    audioXhr.send();
  };
};

createTotalVideoFramesValidationTest(Media.H264.Video1MB, 25);

/**
 * Ensure that browser is able to detect frame drops by correctly implementing
 * the DroppedFrameCount API.
 */
var createFrameDropValidationTest = function(videoStream1, videoStream2) {
  var test = createPerfTest('FrameDrop', 'Media Playback Quality');
  test.prototype.title = 'Frame Drop Validation';
  test.prototype.start = function(runner, video) {
    var videoPerfMetrics = new VideoPerformanceMetrics(video);
    if (!videoPerfMetrics.supportsVideoPerformanceMetrics()) {
      runner.fail('UserAgent needs to support ' +
          '\'video.getVideoPlaybackQuality\' or the combined ' +
          '\'video.webkitDecodedFrameCount\'' +
          'and video.webkitDroppedFrameCount to execute this test.');
    }
    var playVideo = function(videoStream) {
      setupMse(video, runner, videoStream, Media.AAC.AudioNormal);
      video.playbackRate = 2.0;
      video.addEventListener('timeupdate', function onTimeUpdate(e) {
        var totalDroppedFrames = videoPerfMetrics.getDroppedVideoFrames();
        var totalDecodedFrames = videoPerfMetrics.getTotalDecodedVideoFrames();
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

createFrameDropValidationTest(
    Media.H264.Webgl1080p60fps, Media.VP9.Webgl2160p60fps);

/**
 * Ensure no dropped frame is encountered during playback of specified media
 * format in certain playback rate.
 */
var createPlaybackPerfTest = function(
    videoStream, playbackRate, category, mandatory) {
  // H264 tests that are greater than 1080p are optional
  var isOptionalPlayBackPerfStream = function(videoStream) {
    return videoStream.codec == 'H264' &&
        (util.compareResolutions(videoStream.get('resolution'), '1080p') > 0);
  };

  mandatory = mandatory? mandatory : !isOptionalPlayBackPerfStream(videoStream);

  var test = createPerfTest('PlaybackPerf' + '.' + videoStream.codec +
      '.' + videoStream.get('resolution') + videoStream.get('fps') + '@' +
      playbackRate + 'X', category, mandatory);
  test.prototype.title = 'Playback performance test';
  test.prototype.start = function(runner, video) {
    var videoPerfMetrics = new VideoPerformanceMetrics(video);
    if (!videoPerfMetrics.supportsVideoPerformanceMetrics()) {
      runner.fail('UserAgent needs to support ' +
          '\'video.getVideoPlaybackQuality\' or the combined ' +
          '\'video.webkitDecodedFrameCount\'' +
          'and video.webkitDroppedFrameCount to execute this test.');
    }
    setupMse(video, runner, videoStream, Media.AAC.AudioNormal);
    video.playbackRate = playbackRate;
    video.addEventListener('timeupdate', function onTimeUpdate(e) {
      var totalDroppedFrames = videoPerfMetrics.getDroppedVideoFrames();
      var totalDecodedFrames = videoPerfMetrics.getTotalDecodedVideoFrames();
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
        runner.checkLE(totalDroppedFrames, 1, 'Total dropped frames');
        runner.succeed();
      }
    });
    video.play();
  };
};

var mediaFormats = [Media.VP9.Webgl144p30fps, Media.VP9.Webgl240p30fps,
                    Media.VP9.Webgl360p30fps, Media.VP9.Webgl480p30fps,
                    Media.VP9.Webgl720p30fps, Media.VP9.Webgl1080p30fps,
                    Media.VP9.Webgl1440p30fps, Media.VP9.Webgl2160p30fps,
                    Media.H264.Webgl144p15fps, Media.H264.Webgl240p30fps,
                    Media.H264.Webgl360p30fps, Media.H264.Webgl480p30fps,
                    Media.H264.Webgl720p30fps, Media.H264.Webgl1080p30fps,
                    Media.H264.Webgl1440p30fps, Media.H264.Webgl2160p30fps];

var mediaFormatsHfr = [Media.VP9.Webgl720p60fps, Media.VP9.Webgl1080p60fps,
                       Media.VP9.Webgl1440p60fps, Media.VP9.Webgl2160p60fps,
                       Media.H264.Webgl720p60fps, Media.H264.Webgl1080p60fps];

var allMediaFormats = mediaFormats.concat(mediaFormatsHfr);

for (var formatIdx in allMediaFormats) {
  createPlaybackPerfTest(
      allMediaFormats[formatIdx], 1.0, 'Playback Performance');
}

createPlaybackPerfTest(
    Media.VP9.Webgl720p60fps, 0.25, 'Playback Rate Performance');
createPlaybackPerfTest(
    Media.VP9.Webgl2160p60fps, 0.25, 'Playback Rate Performance');
createPlaybackPerfTest(
    Media.H264.Webgl720p30fps, 0.25, 'Playback Rate Performance');
createPlaybackPerfTest(
    Media.H264.Webgl2160p30fps, 0.25, 'Playback Rate Performance');

createPlaybackPerfTest(
    Media.VP9.Webgl720p60fps, 0.5, 'Playback Rate Performance');
createPlaybackPerfTest(
    Media.VP9.Webgl2160p60fps, 0.5, 'Playback Rate Performance');
createPlaybackPerfTest(
    Media.H264.Webgl720p30fps, 0.5, 'Playback Rate Performance');
createPlaybackPerfTest(
    Media.H264.Webgl2160p30fps, 0.5, 'Playback Rate Performance');

for (var formatIdx in mediaFormats) {
  createPlaybackPerfTest(
      mediaFormats[formatIdx], 1.25, 'Playback Rate Performance');
}

for (var formatIdx in mediaFormats) {
  createPlaybackPerfTest(
      mediaFormats[formatIdx], 1.5, 'Playback Rate Performance');
}

for (var formatIdx in mediaFormats) {
  createPlaybackPerfTest(
      mediaFormats[formatIdx], 2.0, 'Playback Rate Performance');
}

for (var formatIdx in mediaFormatsHfr) {
  createPlaybackPerfTest(
      mediaFormatsHfr[formatIdx], 1.25, 'HFR Playback Rate Performance', false);
}

for (var formatIdx in mediaFormatsHfr) {
  createPlaybackPerfTest(
      mediaFormatsHfr[formatIdx], 1.5, 'HFR Playback Rate Performance', false);
}

for (var formatIdx in mediaFormatsHfr) {
  createPlaybackPerfTest(
      mediaFormatsHfr[formatIdx], 2.0, 'HFR Playback Rate Performance', false);
}

return {
  tests: tests,
  info: info,
  fields: fields,
  viewType: 'expanded-test-status'
};

};
