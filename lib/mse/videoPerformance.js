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

var VideoPerformanceMetrics = function(video) {
  this.video = video;
};

/**
 * Determines if the UA supports the expected APIs to get data on decoded frames
 * and dropped frames.
 */
VideoPerformanceMetrics.prototype.supportsVideoPerformanceMetrics = function() {
  if (this.supports_('getVideoPlaybackQuality') &&
      (this.supports_('webkitDecodedFrameCount') ||
       this.supports_('webkitDroppedFrameCount'))) {
    return false;
  }
  return true;
};

VideoPerformanceMetrics.prototype.supports_ = function(api) {
  if (this.video[api] === undefined) {
    return false;
  }
  return true;
};

VideoPerformanceMetrics.prototype.getDroppedVideoFrames = function() {
  if (this.supports_('webkitDroppedFrameCount')) {
    return this.video['webkitDroppedFrameCount'];
  } else if(this.supports_('getVideoPlaybackQuality')) {
    return this.video.getVideoPlaybackQuality().droppedVideoFrames;
  }
  return NaN;
};

VideoPerformanceMetrics.prototype.getTotalDecodedVideoFrames = function() {
  if (this.supports_('webkitDecodedFrameCount')) {
    return this.video['webkitDecodedFrameCount'];
  } else if(this.supports_('getVideoPlaybackQuality')) {
    return this.video.getVideoPlaybackQuality().totalVideoFrames;
  }
  return NaN;
};
