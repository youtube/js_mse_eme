/*
Copyright 2014 Google Inc. All rights reserved.

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

EMEHandler.prototype.init = function(video, mime, keyType, flavor, keyErrorCb) {
  this.video = video;
  this.mime = mime;
  // Expecting mime to have a space separating the container format and codecs.
  this.format = mime.split(" ")[0];

  this.keys = new Array();
  this.keys['clearkey'] = new Uint8Array([
      233, 122, 210, 133, 203, 93, 59, 228,
      167, 150, 27, 122, 246, 145, 112, 218]);
  this.keys['clearkey2'] = new Uint8Array([
      131, 162, 92, 175, 153, 178, 172, 41,
      2, 167, 251, 126, 233, 215, 230, 185]);
  this.keys['invalid_widevine'] = new Uint8Array([
      0x53, 0xa6, 0xcb, 0x3a, 0xd8, 0xfb, 0x58, 0x8f,
      0xbe, 0x92, 0xe6, 0xdc, 0x72, 0x65, 0x0c, 0x86]);
  this.keys['audio_clearkey'] = new Uint8Array([
      0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
      0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]);
  this.keys['video_clearkey'] = new Uint8Array([
      0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
      0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]);

  this.kids = new Array();
  this.kids['audio_clearkey'] = new Uint8Array([
      0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
      0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e]);
  this.kids['video_clearkey'] = new Uint8Array([
      0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
      0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e]);

  normalizeAttribute(video, 'generateKeyRequest');
  normalizeAttribute(video, 'addKey');

  this.initDataQueue = [];

  this.flavor = null;
  this.keySystem = null;
  this.keyType = keyType instanceof Array ? keyType : [keyType];

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

  if (e.initData.length == 16) {
    dlog(2, 'Dropping non-BMFF needKey event');
    return;
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
  var keyType = this.keyType.shift();
  if (keyType in this.kids) {
    var kid = this.kids[keyType];
  } else if (this.keySystem == 'com.microsoft.playready') {
    message = parsePlayReadyKeyMessage(message);
    if (!message)
      throw 1;
  } else {
    var kid = extractBMFFClearKeyID(initData);
  }

  var key = this.keys[keyType];
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
