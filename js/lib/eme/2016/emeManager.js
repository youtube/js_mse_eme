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

EMEHandler.prototype.init = function(video, licenseManager, keyErrorCb) {
  this.video = video;
  this.licenseManager = licenseManager;
  this.keySystem = licenseManager.keySystem;
  this.keyAddedCount = 0;

  normalizeAttribute(video, 'generateKeyRequest');
  normalizeAttribute(video, 'addKey');

  this.initDataQueue = [];

  this.keyErrorCb = (!!keyErrorCb ? keyErrorCb : function(e) {});

  var attr = prefixedAttributeName(video, 'needkey', 'on');
  if (!attr) {
    // just a shot in the dark here
    video.addEventListener('needkey', this.onNeedKey.bind(this));
    video.addEventListener('keymessage', this.onKeyMessage.bind(this));
    video.addEventListener('keyadded', this.onKeyAdded.bind(this));
    video.addEventListener('keyerror', this.onKeyError.bind(this));
  } else {
    video.addEventListener(attr.substring(2), this.onNeedKey.bind(this));

    attr = prefixedAttributeName(video, 'keymessage', 'on');
    if (attr)
      video.addEventListener(attr.substring(2), this.onKeyMessage.bind(this));

    attr = prefixedAttributeName(video, 'keyadded', 'on');
    if (attr)
      video.addEventListener(attr.substring(2), this.onKeyAdded.bind(this));

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

  return this;
};

/**
 * Default callback for onNeedKey event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onNeedKey = function(e) {
  var initData = e.initData;
  dlog(2, 'onNeedKey()');
  if (!this.keySystem) {
    throw 'Not initialized! Bad manifest parse?';
  }

  // Add clear key id to initData for gecko based browsers.
  if (this.licenseManager.mime.indexOf('mp4') > -1 &&
      !extractBMFFClearKeyID(e.initData)) {
    initData = addBMFFClearKeyID(e.initData, this.licenseManager.kids[0]);
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
  var initData = this.initDataQueue.shift();

  var self = this;
  this.licenseManager.acquireLicense(e.message, initData, function(key, kid) {
    self.video.addKey(self.keySystem, key, kid, e.sessionId);
  });
};

/**
 * Default callback for onKeyAdded event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onKeyAdded = function(e) {
  dlog(2, 'onKeyAdded()');
  this.keyAddedCount++;
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
