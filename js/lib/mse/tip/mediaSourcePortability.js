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

// The code tries to wrap MediaSource with or without Webkit prefix.
function setupMsePortability(mseSpec) {
  var dlog = function() {
    var forward = window.dlog || console.log.bind(console);
    forward.apply(this, arguments);
  };

  // If we have both MediaSource and WebKitMediaSource, then it's likely we have
  // Chrome with the dual implementation. Then pick the one that is specified by
  // mseSpec.
  // If we only have the unprefixed version, then we can only choose that.
  if (window.MediaSource && window.WebKitMediaSource ||
      window.MediaSource && !window.WebKitMediaSource) {
    window.MediaSource.prototype.version = 'MSE-live';
    return;
  }

  // If we have MSE with webkit prefix
  if (window.WebKitMediaSource) {
    window.MediaSource = window.WebKitMediaSource;
    window.MediaSource.prototype.version = 'MSE-live-webkit';

    var cou = window.URL.createObjectURL;
    var creatingURL = false;
    window.URL.createObjectURL = function(obj) {
      if (!creatingURL) {
        creatingURL = true;
        var url = window.URL.createObjectURL(obj);
        creatingURL = false;
        return url;
      }
      return cou.call(this, obj);
    };

    var generateEventListener = function(elf) {
      return function(type, listener, useCaptures) {
        var re = /^source(open|close|ended)$/;
        var match = re.exec(type);
        if (match) {
          elf.call(this, 'webkit' + type, listener, useCaptures);
        } else {
          elf.call(this, type, listener, useCaptures);
        }
      };
    };

    window.MediaSource.prototype.addEventListener = generateEventListener(
        window.MediaSource.prototype.addEventListener);

    window.MediaSource.prototype.removeEventListener = generateEventListener(
        window.MediaSource.prototype.removeEventListener);

    return;
  }
}
