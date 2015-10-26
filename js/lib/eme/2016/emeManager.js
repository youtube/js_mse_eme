/*
Copyright 2015 Google Inc. All rights reserved.

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

function EMEHandler() {}

EMEHandler.prototype.init = function(video, mime, kids, keys, flavor, keyErrorCb) {
  this.video = video;
  this.mime = mime;
  // Expecting mime to have a space separating the container format and codecs.
  this.format = mime.split(" ")[0];
  this.keys = keys instanceof Array ? keys : [keys];
  this.kids = kids instanceof Array ? kids : [kids];

  normalizeAttribute(video, 'generateKeyRequest');
  normalizeAttribute(video, 'addKey');

  this.initDataQueue = [];

  this.flavor = null;
  this.keySystem = null;

  this.keyErrorCb = (!!keyErrorCb ? keyErrorCb : function(e) {});

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

  normalizeAttribute(window, 'MediaKeys');

  attr = prefixedAttributeName(video, 'setMediaKeys');
  if (attr && !window.MediaKeys) {
    // try extra hard to scrounge up a MediaKeys
    var index = attr.indexOf('etMediaKeys');
    if (index != -1) {
      this.mediaKeysPrefix = attr.substring(0, index - 1).toLowerCase();
      window.MediaKeys = window[
          this.mediaKeysPrefix.toUpperCase() + 'MediaKeys'];
    }
  }

  normalizeAttribute(video, 'setMediaKeys');

  this.setFlavor(flavor);

  return this;
};

/**
 * Register EMEHandler.
 */
window.EMEHandler = EMEHandler;

/**
 * Mapping between DRM flavors to the accepted keysystem strings.
 */
EMEHandler.kFlavorToSystem = {
  'clearkey': ['org.w3.clearkey', 'webkit-org.w3.clearkey'],
  'widevine': ['com.widevine.alpha'],
  'playready': ['com.youtube.playready', 'com.microsoft.playready']
};

/**
 * Internal function to sets the DRM flavor to use.
 * @param {string} flavor Optional string to specify specific flavor keystring.
 */
EMEHandler.prototype.setFlavor = function(flavor) {
  var systems = EMEHandler.kFlavorToSystem[flavor];
  for (var i in systems) {
    if (!this.video.canPlayType(this.mime, systems[i])) continue;

    this.flavor = flavor;
    this.keySystem = systems[i];
    return;
  }
  throw 'Could not find a compatible key system';
};

/**
 * Default callback for onNeedKey event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onNeedKey = function(e) {
  dlog(2, 'onNeedKey()');
  if (!this.keySystem) {
    throw 'Not initialized! Bad manifest parse?';
  }

  this.video.generateKeyRequest(this.keySystem, e.initData);
  this.initDataQueue.push(e.initData);
};

/**
 * Default callback for onKeyMessage event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onKeyMessage = function(e) {
  dlog(2, 'onKeyMessage()');
  var message = e.message;
  var initData = this.initDataQueue.shift();
  var key = this.keys.shift();

  // Extract kid.
  var kid = this.kids.shift();
  if (this.keySystem == 'com.microsoft.playready') {
    message = parsePlayReadyKeyMessage(message);
    if (!message)
      throw 1;
  } else if (kid == null) {
    var kid = extractBMFFClearKeyID(initData);
  }

  this.video.addKey(this.keySystem, key, kid, e.sessionId);
};

/**
 * Default callback for onKeyError event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onKeyError = function(e) {
  dlog(2,
       'onKeyError(' + e.keySystem + ', ' +
       e.errorCode.code + ', ' + e.systemCode + ')');
  this.keyErrorCb(e);
};
