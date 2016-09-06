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

EMEHandler.prototype.init = function(video, licenseManager) {
  this.video = video;
  this.licenseManager = licenseManager;
  this.keySystem = licenseManager.keySystem;
  this.keyUnusable = false;

  video.addEventListener('encrypted', this.onEncrypted.bind(this));

  return this;
};

/**
 * Register EMEHandler.
 */
window.EMEHandler = EMEHandler;

/**
 * Default callback for onEncrypted event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onEncrypted = function(event) {
  if (!this.keySystem) {
    throw 'Not initialized! Bad manifest parse?';
  }

  dlog(2, 'onEncrypted()');
  var self = this;
  var initData = event.initData;
  var initDataType = event.initDataType
  var video = event.target;

  var config = [
    { 'initDataTypes': ['cenc', 'webm'],
      'audioCapabilities': [
        {'contentType': 'audio/mp4; codecs="mp4a.40.2"'}
      ],
      'videoCapabilities': [
        {'contentType': 'video/mp4; codecs="avc1.640028"'},
        {'contentType': 'video/webm; codecs="vp9"'}
      ]
    }
  ];
  var promise = navigator.requestMediaKeySystemAccess(this.keySystem, config);
  promise.then(function(keySystemAccess) {
    keySystemAccess.createMediaKeys().then(
      function(createdMediaKeys) {
        video.setMediaKeys(createdMediaKeys);
        var keySession = createdMediaKeys.createSession();
        keySession.addEventListener('message', self.onMessage.bind(self),
                                    false);
        keySession.addEventListener('keystatuseschange',
                                    self.onKeyStatusesChange.bind(self), false);
        keySession.generateRequest(initDataType, initData);
      }
    );
  }).catch(function(error) {
    dlog(2, 'error requesting media keys system access');
  });
};

/**
 * Default callback for onMessage event from EME system.
 * @param {Event} e Event passed in by the EME system.
 */
EMEHandler.prototype.onMessage = function(event) {
  dlog(2, 'onMessage()');

  var keySession = event.target;
  var message = event.message;
  this.licenseManager.acquireLicense(message, function(license) {
    keySession.update(license);
  });
};

/**
 * Default callback for keystatuseschange event from EME system.
 * @param {Event} event Event passed in by the EME system.
 */
EMEHandler.prototype.onKeyStatusesChange = function(event) {
  dlog(2, 'onKeyStatusesChange()');
  this.keyUnusable = false;
  event.target.keyStatuses.forEach(function(status, kid) {
    if  (status != 'usable') {
      this.keyUnusable = true;
    }
  });
};
