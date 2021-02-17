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

var LicenseManager = function(video, mediaStreams, flavor) {
  this.video = video;
  // LincenseManager does not handle mixed streams with VP9 video and aac audio
  this.mediaStreams = mediaStreams instanceof Array ?
      mediaStreams : [mediaStreams];
  this.mime = this.mediaStreams[0].mimetype;
  this.flavor = flavor;
  this.keySystem = this.findCompatibleKeySystem_();
  this.failedLicenseServerRequests = 0;
  this.failedIndividualizationRequests = 0;
  // This doesn't handle situtations with multiple licenses.
  this.licenseServer = this.mediaStreams[0].get('license_server');
  if (!this.licenseServer) {
    let key = this.mediaStreams[0].get('key');
    if (!key) {
      key = 'test_key1';
    }
    this.licenseServer = 'https://dash-mse-test.appspot.com/api/drm/' +
        this.flavor + '?drm_system=' + this.flavor +
        '&source=YOUTUBE&ip=0.0.0.0&ipbits=0&' +
        'expire=19000000000&' +
        'key=' + key +
        '&sparams=ip,ipbits,expire,drm_system,' +
        'source,video_id&' +
        'video_id=' + this.mediaStreams[0].get('video_id') +
        '&signature=' +
        this.mediaStreams[0].get(this.flavor + '_signature');
  }
  this.provisionServer =
      'https://content.googleapis.com/certificateprovisioning' +
      '/v1/devicecertificates/create' +
      '?key=AIzaSyA_znRUCwvj-c06YrNcOlhhDtmLkRcVkj8' +
      '&yts=eme';
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
  var externalPSSH = this.mediaStreams[0].get('pssh');
  if (!!externalPSSH) {
    return externalPSSH.buffer;
  }
  return false;
};

/**
 * Makes configuration for KeySystem.
 */
LicenseManager.prototype.makeKeySystemConfig = function() {
  var config = {
    'initDataTypes': ['cenc'],
  };

  for (var stream of this.mediaStreams) {
    if (stream.container == 'webm') {
      config['initDataTypes'].push('webm');
      break;
    }
  }
  if (this.flavor == LicenseManager.PLAYREADY) {
    config['initDataTypes'] = ['keyids', 'cenc'];
  }
  for (var stream of this.mediaStreams) {
    var capabilities = [];
    var encryptionScheme = stream.get('encryptionScheme') ?
        stream.get('encryptionScheme') :
        'cenc';
    capabilities.push({
      'contentType': stream.mimetype,
      'encryptionScheme': encryptionScheme,
    });
    if (stream.mediatype == 'audio') {
      config['audioCapabilities'] = capabilities;
    } else {
      config['videoCapabilities'] = capabilities;
    }
  }
  return [config];
};

/**
 * Internal function to determine the DRM key system to use.
 */
LicenseManager.prototype.findCompatibleKeySystem_ = function() {
  var systems = LicenseManager.flavorToSystem[this.flavor];
  for (var i in systems) {
    if (!MediaSource.isTypeSupported(this.mime)) continue;
    return systems[i];
  }
  throw 'Could not find a compatible key system';
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

/**
 * Function to request a Widevine or PlayReady license from the license server.
 */
LicenseManager.prototype.requestLicense = function(message, cb) {
  if (this.failedLicenseServerRequests > 2) {
    dlog(2, 'Repeated license request failures. Retries exhausted.');
    return;
  }
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', this.licenseServer);
  xhr.addEventListener('readystatechange', function(evt) {
    if (evt.target.readyState != 4) {
      return;
    }
    var responseStatus = evt.target.status;
    if (responseStatus < 200 || responseStatus > 299) {
      dlog(2, 'License request failure, status ' + responseStatus +
          '. Retrying...');
      self.failedLicenseServerRequests++;
      self.requestLicense(message, cb);
      return;
    }
    var responseString = arrayToString(new Uint8Array(evt.target.response));
    // Remove body header for responses from specific license servers.
    var licenseBodyHeaderMark = 'GLS/1.0 0 OK';
    if (responseString.substr(0, licenseBodyHeaderMark.length) ==
        licenseBodyHeaderMark) {
      var headerMark = '\r\n\r\n';
      var headerIdx = responseString.indexOf(headerMark) + headerMark.length;
      responseString = responseString.slice(headerIdx);
    }
    var license = stringToArray(responseString);
    cb(license);
  });
  xhr.responseType = 'arraybuffer';
  xhr.send(message);
};

/**
 * Function to send individualization request to provisioning server.
 */
LicenseManager.prototype.requestIndividualization = function(message, cb) {
  if (this.failedIndividualizationRequests > 2) {
    dlog(2, 'Repeated individualization request failures. Retries exhausted.');
    return;
  }
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', this.provisionServer);
  xhr.setRequestHeader('Content-type', 'application/json')
  xhr.addEventListener('readystatechange', function(evt) {
    if (evt.target.readyState != 4) {
      return;
    }
    var responseStatus = evt.target.status;
    if (responseStatus < 200 || responseStatus > 299) {
      dlog(2, 'Individualization request failure, status ' + responseStatus +
          '. Retrying...');
      self.failedIndividualizationRequests++;
      self.requestIndividualization(message, cb);
      return;
    }
    cb(stringToArray(evt.target.responseText));
  });
  xhr.send(JSON.stringify(
      {signedRequest: arrayToString(new Uint8Array(message))}));
};
window.LicenseManager = LicenseManager;

try {
  exports.LicenseManager = LicenseManager;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
