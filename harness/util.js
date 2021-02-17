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

(function() {

const MEDIA_PATH = '//storage.googleapis.com/ytlr-cert.appspot.com/test-materials/media/';
const CERT_PATH = '//storage.googleapis.com/ytlr-cert.appspot.com/test-materials/cert/';

if (!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      throw new TypeError('What is trying to be bound is not a function');
    }

    var aArgs = Array.prototype.slice.call(arguments, 1);
    var fToBind = this;
    var fNOP = function() {};
    var fBound = function() {
      return fToBind.apply(
          this instanceof fNOP && oThis ? this : oThis,
          aArgs.concat(Array.prototype.slice.call(arguments)));
    };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

var util = {};



util.createElement = function(tag, id, class_, innerHTML) {
  var element = document.createElement(tag);
  if (id != null)
    element.id = id;
  if (innerHTML != null)
    element.innerHTML = innerHTML;
  if (class_ != null)
    element.classList.add(class_);
  return element;
};

util.getClosestElement = function(refElement) {
  if (arguments.length === 1)
    return null;

  var bestElement = arguments[1];
  var bestDistance =
      Math.abs((bestElement.offsetLeft + bestElement.offsetWidth / 2) -
               (refElement.offsetLeft + refElement.offsetWidth / 2));
  for (var i = 2; i < arguments.length; ++i) {
    var currElement = arguments[i];
    var currDistance =
        Math.abs((currElement.offsetLeft + currElement.offsetWidth / 2) -
                 (refElement.offsetLeft + refElement.offsetWidth / 2));
    if (currDistance < bestDistance) {
      bestDistance = currDistance;
      bestElement = currElement;
    }
  }

  return bestElement;
};

util.fireEvent = function(obj, eventName) {
  if (document.createEvent) {
    var event = document.createEvent('MouseEvents');
    event.initEvent(eventName, true, false);
    obj.dispatchEvent(event);
  } else if (document.createEventObject) {
    obj.fireEvent('on' + eventName);
  }
};

util.getElementWidth = function(element) {
  var style = window.getComputedStyle(element);
  var width = 0;

  if (!isNaN(parseInt(style.width))) width += parseInt(style.width);
  if (!isNaN(parseInt(style.marginLeft))) width += parseInt(style.marginLeft);
  if (!isNaN(parseInt(style.marginRight))) width += parseInt(style.marginRight);

  return width;
};

util.isValidArgument = function(arg) {
  return typeof(arg) != 'undefined' && arg != null;
};

util.MakeCapitalName = function(name) {
  name = name.substr(0, 1).toUpperCase() + name.substr(1);
  var offset = 0;
  for (;;) {
    var space = name.indexOf(' ', offset);
    if (space === -1)
      break;
    name = name.substr(0, space + 1) +
        name.substr(space + 1, 1).toUpperCase() + name.substr(space + 2);
    offset = space + 1;
  }
  return name;
};

util.MakeFieldName = function(name) {
  var arr = name.split('-');
  name = arr[0];
  for (var i = 1; i < arr.length; i++) {
    name += util.MakeCapitalName(arr[i]);
  }
  return name;
};

util.Round = function(value, digits) {
  return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
};

util.ElapsedTimeInS = function() {
  return Date.now() / 1000.0;
};

util.SizeToText = function(size, unitType) {
  var unit = 'B';
  if (!!unitType && (unitType == 'B' || unitType == 'b')) {
    unit = unitType;
  }
  if (size >= 1024 * 1024) {
    size /= 1024 * 1024;
    unit = 'M';
  } else if (size >= 1024) {
    size /= 1024;
    unit = 'K';
  }
  if ((size - Math.floor(size)) * 10 <
      Math.floor(size))
    size = Math.floor(size);
  else
    size = util.Round(size, 3);
  return size + unit;
};

util.formatStatus = function(status) {
  if (typeof status === 'undefined')
    return 'undefined';
  else if (typeof status === 'string')
    return '"' + status + '"';
  else if (typeof status === 'number')
    return status.toString();
  else if (typeof status === 'boolean')
    return status ? 'true' : 'false';
  throw 'unknown status type';
};

util.getAttr = function(obj, attr) {
  attr = attr.split('.');
  if (!obj || attr.length === 0)
    return undefined;
  while (attr.length) {
    if (!obj)
      return undefined;
    obj = obj[attr.shift()];
  }
  return obj;
};
util.resize = function(str, newLength, fillValue) {
  if (typeof str != 'string')
    throw 'Only string is supported';
  if (str.length > newLength) {
    str.substr(0, newLength);
  } else {
    while (str.length < newLength)
      str += fillValue;
  }

  return str;
};

util.stringToBoolean = function(str) {
  if (typeof str === 'boolean') {
    return str;
  }
  switch(str.toLowerCase().trim()) {
    case 'false': case 'no': case 'off': case '0': case '': return false;
    default: return true;
  }
};

util.createUint8ArrayFromJSArray = function(arr) {
  var uint8_arr = new Uint8Array(arr.length);
  for (var i = 0; i < arr.length; i++) {
    uint8_arr[i] = arr[i];
  }
  return uint8_arr;
};

var DLOG_LEVEL = 3;

// Log a debug message. Only logs if the given level is less than the current
// value of the global variable DLOG_LEVEL.
util.dlog = function(level) {
  if (typeof(level) !== 'number')
    throw 'level has to be an non-negative integer!';
  // Comment this to prevent debug output
  if (arguments.length > 1 && level <= DLOG_LEVEL) {
    var args = [];
    for (var i = 1; i < arguments.length; ++i)
      args.push(arguments[i]);
    if (window.LOG)
      window.LOG.apply(null, args);
    else
      console.log(args);
  }
};

util.getMaxSupportedWindowSize = function() {
  let vp9 = util.getMaxVp9SupportedWindow();
  let sys = util.getMaxWindow();
  let av1 = util.getMaxAv1SupportedWindow();
  let h264 = util.getMaxH264SupportedWindow();
  let x = Math.max(vp9[0], sys[0], av1[0], h264[0]);
  let y = Math.max(vp9[1], sys[1], av1[1], h264[1]);
  return [x, y];
};

// return [width, height] of current window
util.getMaxWindow = function() {
  return [
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  ];
};

util.getMaxVp9SupportedWindow = function() {
  if (MediaSource.isTypeSupported(
      `video/webm; codecs="${VP9Codec.codecString()}"; width=7680; height=4320;`) &&
          !MediaSource.isTypeSupported(
              `video/webm; codecs="${VP9Codec.codecString()}"; width=9999; height=9999;`)) {
    return [7680, 4320];
  } else if (MediaSource.isTypeSupported(
      `video/webm; codecs="${VP9Codec.codecString()}"; width=3840; height=2160;`) &&
          !MediaSource.isTypeSupported(
              `video/webm; codecs="${VP9Codec.codecString()}"; width=9999; height=9999;`)) {
    return [3840, 2160];
  } else
    return util.getMaxWindow();
};
util.getMaxH264SupportedWindow = function() {
  if (MediaSource.isTypeSupported(
      'video/mp4; codecs="avc1.4d401e"; width=1920; height=1080;') &&
          !MediaSource.isTypeSupported(
              'video/mp4; codecs="avc1.4d401e"; width=9999; height=9999;'))
    return [1920, 1080];
  else
    return util.getMaxWindow();
};

util.getMaxAv1SupportedWindow = function() {
  var checkSupport = spec => {
    var type = [
      'video/mp4',
      `codecs="${AV1Codec.codecString({level: spec.level})}"`,
      `width=${spec.width}`,
      `height=${spec.height}`,
    ].join('; ');
    return MediaSource.isTypeSupported(type);
  };
  if (checkSupport({level: '2.0', width: 9999, height: 9999})) {
    // Invalid resolution, default to window size
    return util.getMaxWindow();
  }

  var specs = [
    {level: '6.0', width: 7680, height: 4320},
    {level: '5.0', width: 3840, height: 2160},
    {level: '4.0', width: 1920, height: 1080},
  ];
  for (var spec of specs) {
    if (checkSupport(spec)) {
      return [spec.width, spec.height];
    }
  }

  // No valid resolutions, default to window size
  return util.getMaxWindow();
};

util.is4k = function() {
  return util.getMaxVp9SupportedWindow()[0] == 3840 &&
      util.getMaxVp9SupportedWindow()[1] == 2160;
};

util.is8k = function() {
  return util.getMaxAv1SupportedWindow()[0] == 7680 &&
      util.getMaxAv1SupportedWindow()[1] == 4320;
};

util.isGtFHD = function() {
  return (util.getMaxSupportedWindowSize()[0] * util.getMaxSupportedWindowSize()[1]) > 2073600;
};

util.isGt4K = function() {
  return (util.getMaxSupportedWindowSize()[0] * util.getMaxSupportedWindowSize()[1]) > 8294400;
};

util.isAv1GtFHD = function() {
  return (util.getMaxAv1SupportedWindow()[0] * util.getMaxAv1SupportedWindow()[1]) > 2073600;
};

util.isAv1Gt4K = function() {
  return (util.getMaxAv1SupportedWindow()[0] * util.getMaxAv1SupportedWindow()[1]) > 8294400;
};

util.isVp9GtFHD = function() {
  return (util.getMaxVp9SupportedWindow()[0] * util.getMaxVp9SupportedWindow()[1]) > 2073600;
};

util.isVp9Gt4K = function() {
  return (util.getMaxVp9SupportedWindow()[0] * util.getMaxVp9SupportedWindow()[1]) > 8294400;
};


util.isCobalt = function() {
  return navigator.userAgent.includes('Cobalt');
};

util.createUrlwithParams = function(url, params) {
  return url + '?' + params.join('&');
};

util.createVideoFormatStr = function(
    video, codec, width, height, framerate, spherical, suffix) {
  return createMimeTypeStr(
      'video/' + video, codec, width, height, framerate, spherical, suffix);
};

util.createSimpleVideoFormatStr = function(video, codec, suffix) {
  return util.createVideoFormatStr(
      video, codec, null, null, null, null, suffix);
};

util.createAudioFormatStr = function(audio, codec, suffix) {
  return createMimeTypeStr(
      'audio/' + audio, codec, null, null, null, null, suffix);
};

util.supportHdr = function() {
  var supportEotf = (eotf, codecString) => {
    return MediaSource.isTypeSupported(util.createVideoFormatStr(
        'webm', codecString, 1280, 720, 30, null, `eotf=${eotf}`));
  };

  if (supportEotf('strobevision', VP9Codec.pqCodecString())) {
    // Invalid EOTF supported: MediaSource.isTypeSupported must be broken.
    return false;
  }

  var eotfToCodecMap = {
    'smpte2084': VP9Codec.pqCodecString(),
    'arib-std-b67': VP9Codec.hlgCodecString(),
  };
  for (var eotf in eotfToCodecMap) {
    if (!supportEotf(eotf, eotfToCodecMap[eotf])) {
      return false;
    }
  }
  return true;
};

util.supportWebSpeech = function() {
  try {
    // check if WebSpeech API is supported.
    var recognition = new SpeechRecognition();
    // check if the microphone itself is correctly connected.
    navigator.mediaDevices.enumerateDevices().then(function(listOfDevices) {
      for (var device of listOfDevices) {
        if (device.kind == "audioinput") {
          return true;
        }
      }
    });
  } catch (e) {}
  return false;
};

util.compareResolutions = function(r1, r2) {
  if (r1[r1.length - 1] != 'p' || r2[r2.length - 1] != 'p') {
    throw "Resolution Format Error: should be {number}p"
  }
  var n1 = parseInt(r1);
  var n2 = parseInt(r2);
  if (isNaN(n1) || isNaN(n2) || n1 <= 0 || n2 <= 0) {
    throw "Resolution Format Error: No valid number could be parsed."
  }
  if (n1 > n2) {
    return 1;
  } else if (n1 == n2) {
    return 0;
  } else {
    return -1;
  }
};

util.getMediaPath = function(filename) {
  return MEDIA_PATH + filename;
};

util.getCertificatePath = function(filename) {
  return CERT_PATH + filename;
};

util.dumpNonAuthQueryParamsFromURL = function() {
  var excludeParams = ["test_type", "cert_scope", "sig", "start_time"];
  var queryParams = window.location.search;
  if (window.location.search.length == 0) {
    return "";
  }

  var paramList = [];
  var regex = new RegExp('(\\?|\\&)(\\w+)=([-:,\\w]+)', 'g');
  var match;
  do {
    match = regex.exec(queryParams);
    if (match) {
      var key = match[2];
      var value = match[3];
      if (!excludeParams.includes(key)) {
        paramList.push(key + "=" + value);
      }
    }
  } while (match);

  return paramList.join("&");
};

function firstCharToUpper(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

util.hasDomProperty = function(obj, prop) {
  if (prop in obj) {
    return true;
  } else if (('webkit' + firstCharToUpper(prop)) in obj) {
    return true;
  } else {
    return false;
  }
};

window.util = util;

})();

try {
  exports.util = window.util;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
