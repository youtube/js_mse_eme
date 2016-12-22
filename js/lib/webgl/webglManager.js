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

var WebglHandler = function(video, canvas) {
  this.video = video;
  this.canvas = canvas;

  this.gl = this.canvas.getContext('webgl');
  this.texture = this.gl.createTexture();
  
  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER,
                        this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER,
                        this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S,
                        this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T,
                        this.gl.CLAMP_TO_EDGE);

  this.decodeStarted = false;
  this.totalWebglFrameCount = 0;
  this.totalTextureUploadTime = 0;
  this.previousTime = 0; 
  this.totalFrameDelay = 0;
};


/**
 * Default method for animating a texture using a video for input.
 */
WebglHandler.prototype.onAnimate = function() {
    // Keep looping until we are in a readyState.
    // End animation loop when readyState = 0 after decoding has started.
    if (this.video.readyState == 0) {
      if (!this.decodeStarted) {
        requestAnimationFrame(this.onAnimate.bind(this));
      }
      return;
    }
    if (!this.decodeStarted) {
      this.decodeStarted = true;
    }

    var time1 = new Date();
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA,
                       this.gl.UNSIGNED_BYTE, this.video);
    var time2 = new Date();
    this.totalTextureUploadTime += time2 - time1;
    this.totalWebglFrameCount++;
    if (this.previousTime) {
      this.totalFrameDelay += time1 - this.previousTime;
    }
    this.previousTime = time1;

    requestAnimationFrame(this.onAnimate.bind(this));
};


/**
 * Plays video and animates frame on a texture.
 */
WebglHandler.prototype.play = function() {
  this.video.play();
  requestAnimationFrame(this.onAnimate.bind(this));
};


/**
 * Returns frame rate for rendering video.
 */
WebglHandler.prototype.getVideoFrameRate = function() {
  if (this.totalFrameDelay == 0) {
    return -1;
  }
  return 1000 * (this.video['webkitDecodedFrameCount']) / this.totalFrameDelay;
};


/**
 * Returns frame rate for rendering video in a WebGL texture.
 */
WebglHandler.prototype.getWebglFrameRate = function() {
  if (this.totalFrameDelay == 0) {
    return -1;
  }
  return 1000 * (this.totalWebglFrameCount - 1) / this.totalFrameDelay;
};


/**
 * Returns average time to render a frame in a WebGL texture.
 */
WebglHandler.prototype.getAverageUploadTime = function() {
  return this.totalTextureUploadTime / this.totalWebglFrameCount;
};
