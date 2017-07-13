/*
Copyright 2017 Google Inc. All rights reserved.

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

var LicenseManager = function(video, mediaStreams, flavor) {
  this.video = video;
  // LincenseManager does not handle mixed streams with VP9 video and aac audio.
  this.mediaStreams = mediaStreams instanceof Array ?
      mediaStreams : [mediaStreams];
  this.mime = this.mediaStreams[0].mimetype;
  this.flavor = flavor;
  this.keySystem = this.findCompatibleKeySystem_();
  // This doesn't handle situtations with multiple licenses.
  this.licenseServer = this.mediaStreams[0].get('license_server');
  if (!this.licenseServer) {
    this.licenseServer = 'https://dash-mse-test.appspot.com/api/drm/' +
                         this.flavor + '?drm_system=' + this.flavor +
                         '&source=YOUTUBE&ip=0.0.0.0&ipbits=0&' +
                         'expire=19000000000&key=test_key1&' +
                         'sparams=ip,ipbits,expire,drm_system,' +
                         'source,video_id&' +
                         'video_id=' + this.mediaStreams[0].get('video_id') +
                         '&signature=' +
                         this.mediaStreams[0].get(this.flavor + '_signature');
  }
};

LicenseManager.CLEARKEY = 'clearkey';
LicenseManager.WIDEVINE = 'widevine';
LicenseManager.PLAYREADY = 'playready';

/**
 * Mapping between DRM flavors to the accepted key systems.
 */
LicenseManager.flavorToSystem = {
  'clearkey': ['org.w3.clearkey', 'webkit-org.w3.clearkey'],
  'widevine': ['com.widevine.alpha'],
  'playready': ['com.youtube.playready']
};

/**
 * Gets an external PSSH atom if it is being used.
 */
LicenseManager.prototype.getExternalPSSH = function() {
  return this.mediaStreams[0].get('pssh');
};

/**
 * Internal function to determine the DRM key system to use.
 */
LicenseManager.prototype.findCompatibleKeySystem_ = function() {
  var systems = LicenseManager.flavorToSystem[this.flavor];
  for (var i in systems) {
    if (!this.video.canPlayType(this.mime, systems[i])) continue;
    return systems[i];
  }
  throw 'Could not find a compatible key system';
};

/**
 * Function to request a Widevine or PlayReady license from the license server.
 */
LicenseManager.prototype.requestLicense = function(message, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', this.licenseServer);
  xhr.addEventListener('load', function(evt) {
    if (evt.target.status < 200 || evt.target.status > 299) {
      dlog(2, 'License request failure, status ' + evt.target.status + '.');
    }
    var responseString = arrayToString(
        new Uint8Array(evt.target.response)).split('\r\n').pop();
    var license = stringToArray(responseString);
    cb(license);
  });
  xhr.responseType = 'arraybuffer';
  xhr.send(message);
};

/**
 * Function to acquire the key and initData/key id for the media.
 */
LicenseManager.prototype.acquireLicense = function(message, cb) {
  if (LicenseManager.WIDEVINE == this.flavor ||
      LicenseManager.PLAYREADY == this.flavor) {
    this.requestLicense(message, function(license) {
      cb(license);
    });
  } else {
    dlog(2, 'Unsupported DRM flavor.');
  }
};
