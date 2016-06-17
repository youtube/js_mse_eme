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

function EMEHandler() {}

EMEHandler.prototype.init = function(video, mime, kids, keys, flavor, keyErrorCb) {
  this.video = video;
  this.mime = mime;
  // Expecting mime to have a space separating the container format and codecs.
  this.format = mime.split(" ")[0];
  if (keys != null) {
    this.keys = keys instanceof Array ? keys : [keys];
    this.kids = kids instanceof Array ? kids : [kids];
  } else {
    this.keys = null;
    this.kids = null;
  }

  normalizeAttribute(video, 'generateKeyRequest');
  normalizeAttribute(video, 'addKey');

  this.initDataQueue = [];

  this.licenseServers = {
    playready: 'http://dash-mse-test.appspot.com/api/drm/playready' +
               '?drm_system=playready&source=YOUTUBE&' +
               'video_id=03681262dc412c06&ip=0.0.0.0&ipbits=0&' +
               'expire=19000000000&' +
               'sparams=ip,ipbits,expire,drm_system,source,video_id&' +
               'signature=3BB038322E72D0B027F7233A733CD67D518AF675.' +
               '2B7C39053DA46498D23F3BCB87596EF8FD8B1669&key=test_key1',
    widevine: 'http://dash-mse-test.appspot.com/api/drm/widevine' +
              '?drm_system=widevine&source=YOUTUBE&' +
              'video_id=03681262dc412c06&ip=0.0.0.0&ipbits=0&' +
              'expire=19000000000&' +
              'sparams=ip,ipbits,expire,source,video_id,drm_system&' +
              'signature=289105AFC9747471DB0D2A998544CC1DAF75B8F9.' +
              '18DE89BB7C1CE9B68533315D0F84DF86387C6BB3&key=test_key1'
  };

  this.flavor = null;
  this.keySystem = null;
  this.keyAddedCount = 0;

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

  this.setFlavor(flavor);

  return this;
};

/**
 * Register EMEHandler.
 */
window.EMEHandler = EMEHandler;

EMEHandler.CLEARKEY = 'clearkey';
EMEHandler.WIDEVINE = 'widevine';
EMEHandler.PLAYREADY = 'playready';

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
  var initData = e.initData;
  dlog(2, 'onNeedKey()');
  if (!this.keySystem) {
    throw 'Not initialized! Bad manifest parse?';
  }

  // Add clear key id to initData for gecko based browsers.
  if (this.mime.indexOf('mp4') > -1 && !extractBMFFClearKeyID(e.initData)) {
    initData = addBMFFClearKeyID(e.initData, this.kids[0]);
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
  var initData = this.initDataQueue.shift();

  if (EMEHandler.CLEARKEY == this.flavor) {
    var key = this.keys.shift();

    // Extract kid.
    var kid = this.kids.shift();
    if (kid == null) {
      var kid = extractBMFFClearKeyID(initData);
    }
    this.video.addKey(this.keySystem, key, kid, e.sessionId);
  } else if (EMEHandler.WIDEVINE == this.flavor) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', this.licenseServers[EMEHandler.WIDEVINE]);
    var self = this;
    xhr.addEventListener('load', function(evt) {
      if (evt.target.status < 200 || evt.target.status > 299) {
        dlog(2, 'onload() failure');
      }
      var responseString = arrayToString(
          new Uint8Array(evt.target.response)).split('\r\n').pop();
      var key = stringToArray(responseString);
      self.video.addKey(self.keySystem, key, initData, e.sessionId);
    });
    xhr.responseType = 'arraybuffer';
    xhr.send(message);
  }
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
