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

var EMEHandler = function() {};

/**
 * Main initialization function.
 * @param {HTMLVideoElement} video The video element this EME Handler wraps.
 * @return {EMEHandler} Returns 'this'.
 */
EMEHandler.prototype.init = function(video) {
  this.video = video;
  normalizeAttribute(video, 'generateKeyRequest');
  normalizeAttribute(video, 'addKey');

  this.initDataQueue = [];

  this.flavor = null;
  this.keySystem = null;
  this.licenseServerURL = null;

  var attr = prefixedAttributeName(video, 'needkey', 'on');
  if (!attr) {
    // just a shot in the dark here
    video.addEventListener('needkey', this.onNeedKey.bind(this));
    video.addEventListener('keymessage', this.onKeyMessage.bind(this));
    video.addEventListener('keyerror', this.onKeyError.bind(this));
  } else {
    video.addEventListener(attr.substring(2), this.onNeedKey.bind(this));

    attr = prefixedAttributeName(video, 'keymessage', 'on');
    if (attr)
      video.addEventListener(attr.substring(2), this.onKeyMessage.bind(this));

    attr = prefixedAttributeName(video, 'keyerror', 'on');
    if (attr)
      video.addEventListener(attr.substring(2), this.onKeyError.bind(this));
  }

  return this;
};

/**
 * The default mime type to use. We only use BMFF for this demo player (soon to
 * change though).
 */
EMEHandler.kMime = 'video/mp4; codecs="avc1.640028"';

/**
 * Mapping between DRM flavors to the accepted keysystem strings.
 */
EMEHandler.kFlavorToSystem = {
  'clearkey': ['org.w3.clearkey', 'webkit-org.w3.clearkey'],
  'widevine': ['com.widevine.alpha'],
  'playready': ['com.youtube.playready']
};

/**
 * Sets the DRM flavor to use.
 * @param {object} licenseMap Mapping from DRM flavors to their license servers.
 * @param {string} optFlavor Optional string to specify specific flavor
 *     keystring.
 */
EMEHandler.prototype.setFlavor = function(licenseMap, optFlavor) {
  this.chooseFlavor(EMEHandler.kMime, licenseMap, optFlavor);
  this.isClearKey = this.flavor == 'clearkey';
};

/**
 * Internal function to sets the DRM flavor to use.
 * @param {string} mime Mime type of the video stream.
 * @param {object} licenseMap Mapping from DRM flavors to their license servers.
 * @param {string} optFlavor Optional string to specify specific flavor
 *     keystring.
 */
EMEHandler.prototype.chooseFlavor = function(mime, licenseMap, optFlavor) {
  for (var flavor in licenseMap) {
    if (optFlavor && flavor != optFlavor)
      continue;

    var systems = EMEHandler.kFlavorToSystem[flavor];
    if (!systems)
      continue;

    for (var i in systems) {
      if (!this.video.canPlayType(mime, systems[i])) {
        continue;
      }

      this.flavor = flavor;
      this.keySystem = systems[i];
      this.licenseServerURL = licenseMap[flavor];
      return;
    }
  }
  throw 'Could not find a compatible key system';
};

/**
 * Default callback for onNeedKey event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onNeedKey = function(e) {
  dlog(2, 'onNeedKey()');
  if (!this.keySystem)
    throw 'Not initialized! Bad manifest parse?';

  if (e.initData.length == 16) {
    dlog(2, 'Dropping non-BMFF needKey event');
    return;
  }

  var initData = e.initData;
  if (this.isClearKey) {
    initData = extractBMFFClearKeyID(e.initData);
  }

  this.video.generateKeyRequest(this.keySystem, initData);
  this.initDataQueue.push(initData);
};

/**
 * Default callback for onKeyMessage event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onKeyMessage = function(e) {
  dlog(2, 'onKeyMessage()');
  var message = e.message;
  if (this.keySystem == 'com.microsoft.playready') {
    message = parsePlayReadyKeyMessage(message);
    if (!message)
      throw 1;
  }
  var initData = this.initDataQueue.shift();
  var xhr = new XMLHttpRequest();
  xhr.open('POST', this.licenseServerURL);
  xhr.addEventListener('load', this.onLoad.bind(this, initData, e.sessionId));
  xhr.responseType = 'arraybuffer';
  xhr.send(message);
};

/**
 * Default callback for onKeyError event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onKeyError = function(e) {
  dlog(2, 'onKeyError(' + e.keySystem + ', ' +
       e.errorCode.code + ', ' + e.systemCode + ')');
};

/**
 * Default callback for onLoad event from EME system.
 * @param {ArrayBuffer} initData Initialization data for stream.
 * @param {string} session Session ID given by the underlying EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onLoad = function(initData, session, e) {
  dlog(2, 'onLoad(' + this.licenseServerURL + ')');
  if (e.target.status < 200 || e.target.status > 299)
    throw 'Bad XHR status: ' + e.target.statusText;

  // Parse "GLS/1.0 0 OK\r\nHeader: Value\r\n\r\n<xml>HERE BE SOAP</xml>
  var responseString = arrayToString(
      new Uint8Array(e.target.response)).split('\r\n').pop();
  var license = stringToArray(responseString);

  this.video.addKey(this.keySystem, license, initData, session);
};
