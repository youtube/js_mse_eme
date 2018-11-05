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

var EMEHandler = function() {};

EMEHandler.prototype.init = function(video, licenseManager) {
  this.video = video;
  this.licenseManager = licenseManager;
  this.keySystem = licenseManager.keySystem;
  this.keyUnusable = false;
  this.keyCount = 0;
  this.keySessions = [];
  this.licenseDelay = 10; // In milliseconds.

  video.addEventListener('encrypted', this.onEncrypted.bind(this));

  return this;
};

EMEHandler.prototype.addEventSpies = function(eventSpies) {
  for (var spy in eventSpies) {
    this['_' + spy] = this[spy];
    this[spy] = eventSpies[spy];
  }
};

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
  var initData = this.licenseManager.getExternalPSSH();
  if (!initData) {
    initData = event.initData;
  }
  var initDataType = event.initDataType
  var video = event.target;

  var config = this.licenseManager.makeKeySystemConfig();
  var promise = navigator.requestMediaKeySystemAccess(this.keySystem, config);
  promise.then(function(keySystemAccess) {
    keySystemAccess.createMediaKeys().then(
      function(createdMediaKeys) {
        var mediaKeys = video.mediaKeys;
        if (!mediaKeys) {
          video.setMediaKeys(createdMediaKeys);
          mediaKeys = createdMediaKeys;
        }
        var keySession = mediaKeys.createSession();
        keySession.addEventListener(
          'message', self.onMessage.bind(self), false);
        keySession.addEventListener(
          'keystatuseschange', self.onKeyStatusesChange.bind(self), false);
        keySession.generateRequest(initDataType, initData);
        self.keySessions.push(keySession);
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
  var licenseDelay = this.licenseDelay;

  this.licenseManager.acquireLicense(message, function(license) {
    setTimeout(function() {
      keySession.update(license);
    }, licenseDelay);
  });
};

/**
 * Default callback for keystatuseschange event from EME system.
 * @param {Event} event Event passed in by the EME system.
 */
EMEHandler.prototype.onKeyStatusesChange = function(event) {
  dlog(2, 'onKeyStatusesChange()');
  var self = this;
  event.target.keyStatuses.forEach(function(status, kid) {
    self.keyCount++;
    if (status != 'usable') {
      self.keyUnusable = true;
    }
  });
};

EMEHandler.prototype.closeAllKeySessions = function (cb) {
  if (this.keySessions === undefined) {
    cb();
    return;
  }
  var self = this;
  var closeAllSessions = function() {
    if (self.keySessions.length == 0) {
      cb();
      return;
    }

    dlog(2, 'Closing key session');
    var keySession = self.keySessions.pop();
    var promise = keySession.close();
    promise.then(closeAllSessions);
  };
  closeAllSessions();
};
