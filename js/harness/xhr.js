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

(function() {

var BYPASS_CACHE = false;

// Hook the onload event for request that is finished successfully
var Request = function(manager, logger, file, onload, postLength,
                       start, length) {
  var self = this;

  this.open = function() {
    this.xhr = new XMLHttpRequest();

    this.onload = onload;
    this.type = util.isValidArgument(postLength) ? 'POST' : 'GET';

    this.xhr.open(this.type,
                  file + (BYPASS_CACHE ? '?' + (new Date()).getTime() : ''));
    this.xhr.responseType = 'arraybuffer';

    this.startTime = new Date().getTime();
    this.lastUpdate = this.startTime;

    if (start != null && length != null)
      this.xhr.setRequestHeader(
          'Range', 'bytes=' + start + '-' + (start + length - 1));

    this.xhr.addEventListener('error', function(e) {
      if (self.xhr.status === 404)
        alert('Failed to find "' + file +
              '" with error 404. Is it on the server?');
      manager.requestFinished(self);
      logger.log('XHR error with code', self.xhr.status);
      self.open();
      self.send();
    });

    this.xhr.addEventListener('timeout', function(e) {
      manager.requestFinished(self);
      logger.log('XHR timeout');
      self.open();
      self.send();
    });

    this.xhr.addEventListener('load', function(e) {
      manager.requestFinished(self);
      return self.onload(e);
    });

    this.xhr.addEventListener('progress', function onProgress(e) {
      if (e.lengthComputable && (e.loaded === e.total)) {
        self.xhr.removeEventListener('progress', onProgress);
      }
      self.lastUpdate = new Date().getTime();
    });
  };

  this.getRawResponse = function() {
    if (this.xhr.status === 404)
      alert('Failed to find "' + file +
            '" with error 404. Is it on the server?');
    logger.assert(this.xhr.status >= 200 && this.xhr.status < 300,
                  'XHR bad status: ' + this.xhr.status);
    return this.xhr.response;
  };

  this.getResponseData = function() {
    if (this.xhr.status === 404)
      alert('Failed to find "' + file +
            '" with error 404. Is it on the server?');
    logger.assert(this.xhr.status >= 200 && this.xhr.status < 300,
                  'XHR bad status: ' + this.xhr.status);
    var result = new Uint8Array(this.xhr.response);
    if (length != null) {
      var rangeHeader = this.xhr.getResponseHeader('Content-Range');
      var lengthHeader = this.xhr.getResponseHeader('Content-Length');
      if (!rangeHeader && lengthHeader) {
        logger.assert(length <= lengthHeader,
                      'Length of response is smaller than request');
        result = result.subarray(start, start + length);
        logger.checkEq(result.length, length, 'XHR length', true);
        return result;
      }
      logger.checkEq(result.length, length, 'XHR length', true);
    }
    return result;
  };

  this.send = function(postData) {
    manager.addRequest(this);
    if (postData) {
      logger.checkEq(this.type, 'POST', 'XHR requestType', true);
      this.xhr.send(postData);
    } else {
      logger.checkEq(this.type, 'GET', 'XHR requestType', true);
      this.xhr.send();
    }
  };

  this.abort = function() {
    this.xhr.abort();
  };

  this.open();
};

var XHRManager = function(logger) {
  var requests = [];
  this.totalRequestDuration = 0;

  this.addRequest = function(request) {
    logger.checkEq(requests.indexOf(request), -1, 'request index', true);
    requests.push(request);
  };

  this.requestFinished = function(request) {
    var currentTime = new Date().getTime();
    this.totalRequestDuration += currentTime - request.startTime;
    logger.checkNE(requests.indexOf(request), -1, 'request index', true);
    requests.splice(requests.indexOf(request), 1);
  };

  this.abortAll = function() {
    for (var i = 0; i < requests.length; ++i)
      requests[i].abort();
    requests = [];
  };

  this.createRequest = function(file, onload, start, length) {
    return new Request(this, logger, file, onload, null, start, length);
  };

  this.createPostRequest = function(file, onload, postLength, start, length) {
    return new Request(this, logger, file, onload, postLength, start, length);
  };

  this.hasActiveRequests = function() {
    if (requests.length > 0) {
      return true;
    }
    return false;
  }

  this.getLastUpdate = function() {
    if (requests.length == 0) {
      return null;
    }

    var latestUpdate = 0;
    for (var i in requests) {
      latestUpdate = Math.max(requests[i].lastUpdate, latestUpdate);
    }
    return latestUpdate;
  };
};

window.createXHRManager = function(logger) {
  return new XHRManager(logger);
};

})();

