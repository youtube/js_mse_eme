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

EMEHandler.prototype.init = function(video, mime, keyType, flavor, keySessionErrorCb) {
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

  this.initDataQueue = [];

  this.flavor = null;
  this.keySystem = null;
  this.keyType = keyType instanceof Array ? keyType : [keyType];

  this.keySessionErrorCb = (!!keySessionErrorCb ? keySessionErrorCb : function(e) { dlog(2, e.toString()); });

  video.addEventListener('encrypted', this.onEncrypted.bind(this));

  normalizeAttribute(window, 'MediaKeys');

  var attr = prefixedAttributeName(video, 'setMediaKeys');
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
  if (!window.MediaKeys || !MediaKeys.isTypeSupported) {
    throw 'EME version does not support MediaKeys.isTypeSupported';
  }

  var systems = EMEHandler.kFlavorToSystem[flavor];
  for (var i in systems) {
    if (MediaKeys.isTypeSupported(systems[i], this.format, this.mime)) {
      this.flavor = flavor;
      this.keySystem = systems[i];
      return;
    }
  }
  throw 'Could not find a compatible key system';
};

/**
 * Default callback for encrypted event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onEncrypted = function(e) {
  dlog(2, 'onEncrypted()');
  if (!this.keySystem) {
    throw 'Not initialized! Bad manifest parse?';
  }

  var initData = e.initData;
  this.initDataQueue.push(new Uint8Array(initData));

  var self = this;
  if (!this.mediaKeys) {
    navigator.requestMediaKeySystemAccess(this.keySystem).then(
      function(keySystemAccess) {
        var promise = keySystemAccess.createMediaKeys();
        promise.catch(
          function(e) {
            dlog(2, "Unable to create media keys.")
          }
        );
        promise.then(
          function(createdMediaKeys) {
            self.mediaKeys = createdMediaKeys;
            return self.video.setMediaKeys(createdMediaKeys);
          }
        ).catch(
          function(e) {
            dlog(2, "Unable to set MediaKeys.")
          }
        );
        promise.then(
          function(createdMediaKeys) {
            var keySession = createdMediaKeys.createSession();
            keySession.addEventListener("message", self.onMessage.bind(self), false);
            return keySession.generateRequest("cenc", initData);
          }
        ).catch(
          function(e) {
            dlog(2, "Unable to create key session.")
          }
        );
      }
    );
  } else {
    var keySession = this.mediaKeys.createSession();
    keySession.addEventListener("message", self.onMessage.bind(self), false);
    keySession.generateRequest("cenc", initData);
  }
};

/**
 * Default callback for onMessage event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onMessage = function(e) {
  dlog(2, 'onMessage()');
  // Message kid doesn't look right, so lets use our own by extracting it directly from the BMFF.
  // Message appears to only be json for clearkey.
  var message = String.fromCharCode.apply(null, new Uint8Array(e.message));
  if (this.flavor == 'clearkey') {
    message = JSON.parse(message);
    var messageKid = base64NoPadding_encode(message['kids'][0]);
  }

  // Build a license.
  var keySession = e.target;
  var keys = new Array();
  for (var i = 0; i < this.keyType.length; i++) {
    var kid = null;
    if (this.keyType[i] in this.kids) {
      kid = base64NoPadding_encode(this.kids[this.keyType[i]]);
    } else if (i in this.initDataQueue) {
      kid = base64NoPadding_encode(extractBMFFClearKeyID(this.initDataQueue[i]));
    } else {
      continue;
    }
    var key = base64NoPadding_encode(this.keys[this.keyType[i]]);
    keys.push({"kty":"oct","alg":"A128KW","k":key,"kid":kid});
  }
  var jwkSet = JSON.stringify({"keys":keys,"type":"temporary"});
  var encoder = new TextEncoder("utf-8");
  var license = encoder.encode(jwkSet);
  var promise = keySession.update(license.buffer);
  promise.catch(this.keySessionErrorCb);
};
