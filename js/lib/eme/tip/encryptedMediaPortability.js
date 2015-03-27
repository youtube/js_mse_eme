/*
Copyright 2014 Google Inc. All rights reserved.

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

/* The code tries to wrapper the EME versions with or without webkit prefix */


function prefixedAttributeName(obj, suffix, opt_preprefix) {
  suffix = suffix.toLowerCase();
  if (opt_preprefix === undefined) {
    opt_preprefix = '';
  }
  for (var attr in obj) {
    var lattr = attr.toLowerCase();
    if (lattr.indexOf(opt_preprefix) == 0 &&
        lattr.indexOf(suffix, lattr.length - suffix.length) != -1) {
      return attr;
    }
  }
  return null;
}

function normalizeAttribute(obj, suffix, opt_preprefix) {
  if (opt_preprefix === undefined) {
    opt_preprefix = '';
  }

  var attr = prefixedAttributeName(obj, suffix, opt_preprefix);
  if (attr) {
    obj[opt_preprefix + suffix] = obj[attr];
  }
}

function stringToArray(s) {
  var array = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) {
    array[i] = s.charCodeAt(i);
  }
  return array;
}


function arrayToString(a) {
  return String.fromCharCode.apply(String, a);
}

function parsePlayReadyKeyMessage(message) {
  // message is UTF-16LE, let's throw out every second element.
  var message_ascii = new Array();
  for (var i = 0; i < message.length; i += 2) {
    message_ascii.push(message[i]);
  }

  var str = String.fromCharCode.apply(String, message_ascii);
  var doc = (new DOMParser()).parseFromString(str, 'text/xml');
  return stringToArray(
      atob(doc.childNodes[0].childNodes[0].childNodes[0].childNodes[0].data));
}

/**
 * Extracts the BMFF Clear Key ID from the init data of the segment.
 * @param {ArrayBuffer} initData Init data for the media segment.
 * @return {ArrayBuffer} Returns the BMFF ClearKey ID if found, otherwise the
 *     initData itself.
 */
function extractBMFFClearKeyID(initData) {
  // Accessing the Uint8Array's underlying ArrayBuffer is impossible, so we
  // copy it to a new one for parsing.
  var abuf = new ArrayBuffer(initData.length);
  var view = new Uint8Array(abuf);
  view.set(initData);

  var dv = new DataView(abuf);
  var pos = 0;
  while (pos < abuf.byteLength) {
    var box_size = dv.getUint32(pos, false);
    var type = dv.getUint32(pos + 4, false);

    if (type != 0x70737368)
      throw 'Box type ' + type.toString(16) + ' not equal to "pssh"';

    // Scan for Clear Key header
    if ((dv.getUint32(pos + 12, false) == 0x58147ec8) &&
        (dv.getUint32(pos + 16, false) == 0x04234659) &&
        (dv.getUint32(pos + 20, false) == 0x92e6f52c) &&
        (dv.getUint32(pos + 24, false) == 0x5ce8c3cc)) {
      var size = dv.getUint32(pos + 28, false);
      if (size != 16) throw 'Unexpected KID size ' + size;
      return new Uint8Array(abuf.slice(pos + 32, pos + 32 + size));
    }

    // Failing that, scan for Widevine protobuf header
    if ((dv.getUint32(pos + 12, false) == 0xedef8ba9) &&
        (dv.getUint32(pos + 16, false) == 0x79d64ace) &&
        (dv.getUint32(pos + 20, false) == 0xa3c827dc) &&
        (dv.getUint32(pos + 24, false) == 0xd51d21ed)) {
      return new Uint8Array(abuf.slice(pos + 36, pos + 52));
    }
    pos += box_size;
  }
  // Couldn't find it, give up hope.
  return initData;
}

function base64_encode(arr) {
  var b64dict = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var b64pad = "=";

  var i;
  var hexStr = "";
  for (i = 0; i < arr.length; i++) {
    var hex = arr[i].toString(16);
    hexStr += hex.length == 1 ? "0" + hex : hex;
  }

  var dest = "";
  var c;
  for (i = 0; i+3 <= hexStr.length; i+=3) {
    c = parseInt(hexStr.substring(i, i+3), 16);
    dest += b64dict.charAt(c >> 6) + b64dict.charAt(c & 63);
  }
  if (i+1 == hexStr.length) {
    c = parseInt(hexStr.substring(i, i+1), 16);
    dest += b64dict.charAt(c << 2);
  } else if (i+2 == hexStr.length) {
    c = parseInt(hexStr.substring(i, i+2), 16);
    dest += b64dict.charAt(c >> 2) + b64dict.charAt((c & 3) << 4);
  }
  
  while ((dest.length & 3) > 0) {
    dest += b64pad;
  }

  return dest;
}

function b64tob64url(s) {
  var b64urlStr = removePadding(s);
  b64urlStr = b64urlStr.replace(/\+/g, "-");
  b64urlStr = b64urlStr.replace(/\//g, "_");
  return b64urlStr;
}

function removePadding(s) {
  return s.replace(/\=/g, "");
}

function base64NoPadding_encode(arr) {
  return removePadding(base64_encode(arr));
}

function base64url_encode(arr) {
  return b64tob64url(base64_encode(arr));
}

(function() {
  var dlog = function() {
    var forward = window.dlog || console.log.bind(console);
    forward.apply(this, arguments);
  };

  var proto = window.HTMLMediaElement.prototype;

  if (proto.addKey || proto.setMediaKeys) {
    return;  // Non-prefix version, needn't wrap.
  }

  if (!proto.webkitAddKey) {
    dlog(1, 'EME is not available');
    return;  // EME is not available at all.
  }

  proto.generateKeyRequest = function(keySystem, initData) {
    if (keySystem === 'org.w3.clearkey')
      keySystem = 'webkit-org.w3.clearkey';
    return proto.webkitGenerateKeyRequest.call(this, keySystem, initData);
  };

  proto.addKey = function(keySystem, key, initData, sessionId) {
    if (keySystem === 'org.w3.clearkey')
      keySystem = 'webkit-org.w3.clearkey';
    return proto.webkitAddKey.call(this, keySystem, key, initData, sessionId);
  };

  proto.cancelKeyRequest = function(keySystem, sessionId) {
    if (keySystem === 'org.w3.clearkey')
      keySystem = 'webkit-org.w3.clearkey';
    return proto.webkitCancelKeyRequest.call(this, keySystem, sessionId);
  };

  var ael = proto.addEventListener;
  var eventWrapper = function(listener, e) {
    if (e.keySystem === 'webkit-org.w3.clearkey')
      e.keySystem = 'org.w3.clearkey';
    listener.call(this, e);
  };

  proto.addEventListener = function(type, listener, useCaptures) {
    var re = /^(keyadded|keyerror|keymessage|needkey)$/;
    var match = re.exec(type);
    if (match) {
      ael.call(this, 'webkit' + type, eventWrapper.bind(this, listener),
               useCaptures);
    } else {
      ael.call(this, type, listener, useCaptures);
    }
  };
})();
