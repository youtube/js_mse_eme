/*
Copyright 2018 Google Inc. All rights reserved.

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

var DLOG_LEVEL = 3;

// Log a debug message. Only logs if the given level is less than the current
// value of the global variable DLOG_LEVEL.
window.dlog = function(level) {
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

var ensureUID = (function() {
  var uid = 0;

  return function(sb) {
    if (!sb.uid) sb.uid = uid++;
  };
})();

var elementInBody = function(element) {
  while (element && element !== document.body)
    element = element.parentNode;
  return Boolean(element);
};

// A version of 'SourceBuffer.append()' that automatically handles EOS
// (indicated by the 'null' values. Returns true if append succeeded,
// false if EOS.
window.safeAppend = function(sb, buf) {
  ensureUID(sb);

  if (!buf)
    dlog(2, 'EOS appended to ' + sb.uid);
  else
    sb.append(buf);

  return Boolean(buf);
};

// Convert a 4-byte array into a signed 32-bit int.
function btoi(data, offset) {
  offset = offset || 0;
  var result = data[offset] >>> 0;
  result = (result << 8) + (data[offset + 1] >>> 0);
  result = (result << 8) + (data[offset + 2] >>> 0);
  result = (result << 8) + (data[offset + 3] >>> 0);
  return result;
}

// Convert a 4-byte array into a fourcc.
function btofourcc(data, offset) {
  offset = offset || 0;
  return String.fromCharCode(data[offset], data[offset + 1],
                             data[offset + 2], data[offset + 3]);
}

// Convert a signed 32-bit int into a 4-byte array.
function itob(value) {
  return [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff,
         value & 0xff];
}

// Return the offset of sidx box
function getSIDXOffset(data) {
  var length = data.length;
  var pos = 0;

  while (pos + 8 <= length) {
    var size = [];

    for (var i = 0; i < 4; ++i)
      size.push(data[pos + i]);

    size = btoi(size);
    if (size < 8) throw 'Unexpectedly small size';
    if (pos + size >= data.length) break;

    if (btofourcc(data, pos + 4) === 'sidx')
      return pos;

    pos += size;
  }

  throw 'Cannot find sidx box in first ' + data.length + ' bytes of file';
}

// Given a buffer contains the first 32k of a file, return a list of tables
// containing 'time', 'duration', 'offset', and 'size' properties for each
// subsegment.
function parseSIDX(data) {
  var sidxStartBytes = getSIDXOffset(data);
  var currPos = sidxStartBytes;

  function read(bytes) {
    if (currPos + bytes > data.length) throw 'sidx box is incomplete.';
    var result = [];
    for (var i = 0; i < bytes; ++i) result.push(data[currPos + i]);
    currPos += bytes;
    return result;
  }

  var size = btoi(read(4));
  var sidxEnd = sidxStartBytes + size;
  var boxType = read(4);
  boxType = btofourcc(boxType);
  if (boxType !== 'sidx') throw 'Unrecognized box type ' + boxType;

  var verFlags = btoi(read(4));
  var refId = read(4);
  var timescale = btoi(read(4));

  var earliestPts, offset;
  if (verFlags === 0) {
    earliestPts = btoi(read(4));
    offset = btoi(read(4));
  } else {
    dlog(2, 'Warning: may be truncating sidx values');
    read(4);
    earliestPts = btoi(read(4));
    read(4);
    offset = btoi(read(4));
  }
  offset = offset + sidxEnd;

  var count = btoi(read(4));
  var time = earliestPts;

  var res = [];
  for (var i = 0; i < count; ++i) {
    var size = btoi(read(4));
    var duration = btoi(read(4));
    var sapStuff = read(4);
    res.push({
      time: time / timescale,
      duration: duration / timescale,
      offset: offset,
      size: size
    });
    time = time + duration;
    offset = offset + size;
  }
  if (currPos !== sidxEnd) throw 'Bad end point' + currPos + sidxEnd;
  return res;
}

// Given a BufferedRange object, find the one that contains the given time
// 't'. Returns the end time of the buffered range. If a suitable buffered
// range is not found, returns 'null'.
function findBufferedRangeEndForTime(sb, t) {
  var buf = sb.buffered;
  ensureUID(sb);
  for (var i = 0; i < buf.length; ++i) {
    var s = buf.start(i), e = buf.end(i);
    dlog(4, 'findBuf: uid=' + sb.uid + ' index=' + i + ' time=' + t +
         ' start=' + s + ' end=' + e);
    if (t >= s && t <= e)
      return e;
  }

  return null;
}

// This part defines the... source, for the, erm... media. But it's not the
// Media Source. No. No way.
//
// Let's call it "source chain" instead.
//
// At the end of a source chain is a file source. File sources implement the
// following methods:
//
//  init(t, cb): Gets the (cached) initialization segment buffer for t.
//  Current position is not affected. If cb is null, it will return the init
//  segment, otherwise it will call cb with the asynchronously received init
//  segment. If will throw is init segment is not ready and cb is null.
//
//  seek(t): Sets the maximum time of the next segment to be appended. Will
//  likely round down to the nearest segment start time. (To reset a source
//  after EOF, seek to 0.)
//
//  pull(cb): Call the cb with the next media segment.
//  return value of EOS('null') indicates that the chain has been exhausted.
//
// Most source chain elements will return entire media segments, and many will
// expect incoming data to begin on a media segment boundary. Those elements
// that either do not require this property, or return output that doesn't
// follow it, will be noted.
//
// All source chain elements will forward messages that are not handled to the
// upstream element until they reach the file source.

// Produces a FileSource table.
window.FileSource = function(path, xhrManager, timeoutManager,
                             startIndex, endIndex) {
  this.path = path;
  this.startIndex = startIndex;
  this.endIndex = endIndex;
  this.segs = null;
  this.segIdx = 0;
  this.initBuf = null;

  this.init = function(t, cb) {
    if (!cb) {
      if (!this.initBuf)
        throw 'Calling init synchronusly when the init seg is not ready';
      return this.initBuf;
    }
    self = this;
    if (this.initBuf) {
      timeoutManager.setTimeout(cb.bind(this, this.initBuf), 1);
    } else {
      var self = this;
      var xhr = xhrManager.createRequest(this.path, function(e) {
        self.segs = parseSIDX(this.getResponseData());

        self.startIndex = self.startIndex || 0;
        self.endIndex = self.endIndex || self.segs.length - 1;
        self.endIndex = Math.min(self.endIndex, self.segs.length - 1);
        self.startIndex = Math.min(self.startIndex, self.endIndex);
        self.segIdx = self.startIndex;

        xhr = xhrManager.createRequest(self.path, function(e) {
          self.initBuf = this.getResponseData();
          cb.call(self, self.initBuf);
        }, 0, self.segs[0].offset);
        xhr.send();
      }, 0, 32 * 1024);
      xhr.send();
    }
  };

  this.seek = function(t, sb) {
    if (!this.initBuf)
      throw 'Seek must be called after init';

    if (sb)
      sb.abort();
    else if (t !== 0)
      throw 'You can only seek to the beginning without providing a sb';

    t += this.segs[this.startIndex].time;
    var i = this.startIndex;
    while (i <= this.endIndex && this.segs[i].time <= t)
      ++i;
    this.segIdx = i - 1;
    dlog(2, 'Seeking to segment index=' + this.segIdx + ' time=' + t +
         ' start=' + this.segs[this.segIdx].time +
         ' length=' + this.segs[this.segIdx].duration);
  };

  this.pull = function(cb) {
    if (this.segIdx > this.endIndex) {
      timeoutManager.setTimeout(cb.bind(this, null), 1);
      return;
    }
    var seg = this.segs[this.segIdx];
    ++this.segIdx;
    var self = this;
    var xhr = xhrManager.createRequest(this.path, function(e) {
      cb.call(self, this.getResponseData());
    }, seg.offset, seg.size);
    xhr.send();
  };
  this.duration = function() {
    var last = this.segs[this.segs.length - 1];
    return last.time + last.duration;
  };
  this.currSegDuration = function() {
    if (!this.segs || !this.segs[this.segIdx])
      return 0;
    return this.segs[this.segIdx].duration;
  };
};

function attachChain(downstream, upstream) {
  downstream.upstream = upstream;
  downstream.init = function(t, cb) {
    return upstream.init(t, cb);
  };
  downstream.seek = function(t, sb) {
    return upstream.seek(t, sb);
  };
  downstream.pull = function(cb) {
    return upstream.pull(cb);
  };
  downstream.duration = function() {
    return upstream.duration();
  };
  downstream.currSegDuration = function() {
    return upstream.currSegDuration();
  };
}

window.ResetInit = function(upstream) {
  this.initSent = false;
  attachChain(this, upstream);

  this.init = function(t, cb) {
    this.initSent = true;
    return this.upstream.init(t, cb);
  };

  this.seek = function(t, sb) {
    this.initSent = false;
    return this.upstream.seek(t, sb);
  };

  this.pull = function(cb) {
    if (!this.initSent) {
      this.initSent = true;
      this.upstream.init(0, function(initSeg) {
        cb(initSeg);
      });
      return;
    }
    var self = this;
    this.upstream.pull(function(rsp) {
      if (!rsp)
        self.initSent = false;
      cb(rsp);
    });
  };
};

// This function _blindly_ parses the mdhd header in the segment to find the
// timescale. It doesn't take any box hierarchy into account.
function parseTimeScale(data) {
  for (var i = 0; i < data.length - 3; ++i) {
    if (btofourcc(data, i) !== 'mdhd')
      continue;
    var off = i + 16;
    if (data[i + 4] != 0)
      off = i + 28;

    return btoi(data, off);
  }

  throw 'Failed to find mdhd box in the segment provided';
}

function replaceTFDT(data, tfdt) {
  for (var i = 0; i < data.length - 3; ++i) {
    if (btofourcc(data, i) !== 'tfdt')
      continue;
    tfdt = itob(tfdt);  // convert it into array
    var off = i + 8;
    if (data[i + 4] === 0) {
      data[off] = tfdt[0];
      data[off + 1] = tfdt[1];
      data[off + 2] = tfdt[2];
      data[off + 3] = tfdt[3];
    } else {
      data[off] = 0;
      data[off + 1] = 0;
      data[off + 2] = 0;
      data[off + 3] = 0;
      data[off + 4] = tfdt[0];
      data[off + 5] = tfdt[1];
      data[off + 6] = tfdt[2];
      data[off + 7] = tfdt[3];
    }

    return true;
  }
  // the init segment doesn't have tfdt box.
  return false;
}

// It will repeat a normal stream to turn it into an infinite stream.
// This type of stream cannot be seeked.
window.InfiniteStream = function(upstream) {
  this.upstream = upstream;
  this.timescale = null;
  this.elapsed = 0;
  attachChain(this, upstream);

  this.seek = function(t, sb) {
    throw 'InfiniteStream cannot be seeked';
  };

  this.pull = function(cb) {
    var self = this;
    var currSegDuration = self.upstream.currSegDuration();
    function onPull(buf) {
      if (!buf) {
        self.upstream.seek(0, null);
        self.upstream.pull(onPull);
        return;
      }
      if (!self.timescale) {
        var initBuf = self.upstream.init(0);
        self.timescale = parseTimeScale(initBuf);
      }
      var tfdt = Math.floor(self.timescale * self.elapsed);
      if (tfdt === 1) tfdt = 0;
      dlog(3, 'TFDT: time=' + self.elapsed + ' timescale=' + self.timescale +
           ' tfdt=' + tfdt);
      if (replaceTFDT(buf, tfdt))
        self.elapsed = self.elapsed + currSegDuration;
      cb(buf);
    }
    this.upstream.pull(onPull);
  };

  return this;
};

// Pull 'len' bytes from upstream chain element 'elem'. 'cache'
// is a temporary buffer of bytes left over from the last pull.
//
// This function will send exactly 0 or 1 pull messages upstream. If 'len' is
// greater than the number of bytes in the combined values of 'cache' and the
// pulled buffer, it will be capped to the available bytes. This avoids a
// number of nasty edge cases.
//
// Returns 'rsp, newCache'. 'newCache' should be passed as 'cache' to the
// next invocation.
function pullBytes(elem, len, cache, cb) {
  if (!cache) {
    // Always return EOS if cache is EOS, the caller should call seek before
    // reusing the source chain.
    cb(cache, null);
    return;
  }

  if (len <= cache.length) {
    var buf = cache.subarray(0, len);
    cache = cache.subarray(len);
    cb(buf, cache);
    return;
  }

  elem.pull(function(buf) {
    if (!buf) {  // EOS
      cb(cache, buf);
      return;
    }
    var newCache = new Uint8Array(cache.length + buf.length);
    newCache.set(cache);
    newCache.set(buf, cache.length);
    cache = newCache;

    if (cache.length <= len) {
      cb(cache, new Uint8Array());
    } else {
      buf = cache.subarray(0, len);
      cache = cache.subarray(len);
      cb(buf, cache);
    }
  });
}

window.FixedAppendSize = function(upstream, size) {
  this.cache = new Uint8Array(0);
  attachChain(this, upstream);
  this.appendSize = function() {
    return size || 512 * 1024;
  };
  this.seek = function(t, sb) {
    this.cache = new Uint8Array(0);
    return this.upstream.seek(t, sb);
  };
  this.pull = function(cb) {
    var len = this.appendSize();
    var self = this;
    pullBytes(this.upstream, len, this.cache, function(buf, cache) {
      self.cache = cache;
      cb(buf);
    });
  };
};

window.RandomAppendSize = function(upstream, min, max) {
  FixedAppendSize.apply(this, arguments);
  this.appendSize = function() {
    min = min || 100;
    max = max || 10000;
    return Math.floor(Math.random() * (max - min + 1) + min);
  };
};

window.RandomAppendSize.prototype = new window.FixedAppendSize;
window.RandomAppendSize.prototype.constructor = window.RandomAppendSize;

// This function appends the init segment to media source
window.appendInit = function(mp, sb, chain, t, cb) {
  chain.init(t, function(initSeg) {
    sb.append(initSeg);
    cb();
  });
};

// This is a simple append loop. It pulls data from 'chain' and appends it to
// 'sb' until the end of the buffered range contains time 't'.
// It starts from the current playback location.
window.appendUntil = function(timeoutManager, mp, sb, chain, t, cb) {
  if (!elementInBody(mp)) {
    cb();
      return;
  }

  var started = sb.buffered.length !== 0;
  var current = mp.currentTime;
  var bufferedEnd = findBufferedRangeEndForTime(sb, current);

  if (bufferedEnd) {
    bufferedEnd = bufferedEnd + 0.1;
  } else {
    bufferedEnd = 0;
    if (started) {
      chain.seek(0, sb);
    }
  }

  (function loop(buffer) {
    if (!elementInBody(mp)) {
      cb();
      return;
    }
    if (buffer) {
      if (!safeAppend(sb, buffer)) {
        cb();
        return;
      }
      bufferedEnd = findBufferedRangeEndForTime(sb, bufferedEnd);
      if (bufferedEnd) {
        bufferedEnd = bufferedEnd + 0.1;
      } else {
        bufferedEnd = 0;
      }
      timeoutManager.setTimeout(loop, 0);
    } else {
      if (t >= bufferedEnd && !mp.error)
        chain.pull(loop);
      else
        cb();
    }
  })();
};

// This is a simple append loop. It pulls data from 'chain' and appends it to
// 'sb' until the end of the buffered range that contains time 't' is at
// least 'gap' seconds beyond 't'. If 't' is not currently in a buffered
// range, it first seeks to a time before 't' and appends until 't' is
// covered.
window.appendAt = function(timeoutManager, mp, sb, chain, t, gap, cb) {
  if (!elementInBody(mp)) {
    cb();
    return;
  }

  gap = gap || 3;

  var bufferedEnd = findBufferedRangeEndForTime(sb, t);

  (function loop(buffer) {
    if (!elementInBody(mp)) {
      cb();
      return;
    }
    if (buffer) {
      if (!safeAppend(sb, buffer))
        return;
      bufferedEnd = findBufferedRangeEndForTime(sb, t);
      timeoutManager.setTimeout(loop, 0);
    } else {
      if (t + gap >= (bufferedEnd || 0) && !mp.error) {
        chain.pull(loop);
      } else {
        cb();
      }
    }
  })();
};

// Append data from chains 'f1' and 'f2' to source buffers 's1' and 's2',
// maintaining 'lead' seconds of time between current playback time and end of
// current buffered range. Continue to do this until the current playback time
// reaches 'endTime'.
// It supports play one stream, where 's2' and 'f2' are null.
//
// 'lead' may be small or negative, which usually triggers some interesting
// fireworks with regard to the network buffer level state machine.
//
// TODO: catch transition to HAVE_CURRENT_DATA or lower and append enough to
// resume in that case
window.playThrough = function(timeoutManager, mp, lead, endTime, s1, f1, s2,
                              f2, cb) {
  var yieldTime = 0.03;

  function loop() {
    if (!elementInBody(mp))
      return;
    if (mp.currentTime <= endTime && !mp.error)
      timeoutManager.setTimeout(playThrough.bind(
          null, timeoutManager, mp, lead, endTime, s1, f1, s2, f2, cb),
          yieldTime * 1000);
    else
      cb();
  };
  appendAt(timeoutManager, mp, s1, f1, mp.currentTime, yieldTime + lead,
           function() {
             if (s2)
               appendAt(timeoutManager, mp, s2, f2, mp.currentTime,
                        yieldTime + lead, loop);
             else
               loop();
           });
};

window.waitUntil = function(timeouts, media, target, cb) {
  var initTime = media.currentTime;
  var lastTime = lastTime;
  var check = function() {
    if (media.currentTime === initTime) {
      timeouts.setTimeout(check, 500);
    } else if (media.currentTime === lastTime || media.currentTime > target) {
      cb();
    } else {
      lastTime = media.currentTime;
      timeouts.setTimeout(check, 500);
    }
  };

  timeouts.setTimeout(check, 500);
};

window.callAfterLoadedMetaData = function(media, testFunc) {
  var onLoadedMetadata = function() {
    LOG('onLoadedMetadata called');
    media.removeEventListener('loadedmetadata', onLoadedMetadata);
    testFunc();
  };

  if (media.readyState >= media.HAVE_METADATA) {
    LOG('onLoadedMetadata bypassed');
    testFunc();
  } else {
    media.addEventListener('loadedmetadata', onLoadedMetadata);
  }
};

})();
