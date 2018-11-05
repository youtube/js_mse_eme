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

window.createMimeTypeStr = function(
    mimeType, codecs, width, height, framerate, spherical, suffix) {
  var mimeTypeStr = mimeType;
  if (!!(codecs))
    mimeTypeStr += '; codecs="' + codecs + '"';
  if (!!(width))
    mimeTypeStr += '; width=' + width;
  if (!!(height))
    mimeTypeStr += '; height=' + height;
  if (!!(framerate))
    mimeTypeStr += '; framerate=' + framerate;
  if (!!(spherical))
    mimeTypeStr += '; decode-to-texture=' + spherical;
  if (!!(suffix))
    mimeTypeStr += '; ' + suffix;
  return mimeTypeStr;
};

window.isTypeSupported = function(videoStream) {
  return MediaSource.isTypeSupported(createMimeTypeStr(
      videoStream.mimetype,
      null,
      videoStream.get("width"),
      videoStream.get("height"),
      videoStream.get("fps"),
      videoStream.get("spherical")));
};

// A version of 'SourceBuffer.append()' that automatically handles EOS
// (indicated by the 'null' values. Returns true if append succeeded,
// false if EOS.
window.safeAppend = function(sb, buf) {
  ensureUID(sb);

  if (!buf)
    dlog(2, 'EOS appended to ' + sb.uid);
  else
    sb.appendBuffer(buf);

  return Boolean(buf);
};

// Convert a 4-byte array into a signed 32-bit int.
window.btoi = function(data, offset) {
  offset = offset || 0;
  var result = data[offset] >>> 0;
  result = (result << 8) + (data[offset + 1] >>> 0);
  result = (result << 8) + (data[offset + 2] >>> 0);
  result = (result << 8) + (data[offset + 3] >>> 0);
  return result;
}

// Convert a 4-byte array into a fourcc.
window.btofourcc = function(data, offset) {
  offset = offset || 0;
  return String.fromCharCode(data[offset], data[offset + 1],
      data[offset + 2], data[offset + 3]);
}

// Convert a signed 32-bit int into a 4-byte array.
window.itob = function(value) {
  return [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff,
      value & 0xff];
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

// Removes segments from all 'buffers' to satisfy 'duration'. Once complete
// 'ms.duration' is set and 'cb' is called.
window.setDuration = function(duration, ms, buffers, cb) {
  buffers = buffers instanceof Array ? buffers : [buffers];
  if (buffers.length == 0) {
    ms.duration = duration;
    cb();
    return;
  }
  var buffer = buffers.pop();
  for (var rangeIdx = 0; rangeIdx < buffer.buffered.length; rangeIdx++) {
    var bufferedEnd = buffer.buffered.end(rangeIdx);
    if (bufferedEnd > duration) {
      var buf = buffer;
      buffer.addEventListener('update', function onDurationChange() {
        buf.removeEventListener('update', onDurationChange);
        setDuration(duration, ms, buffers, cb);
      });
      buffer.remove(duration, bufferedEnd);
      return;
    }
  }
  setDuration(duration, ms, buffers, cb);
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
window.FileSource = function(
    path, xhrManager, timeoutManager, startIndex, endIndex, forceSize) {
  this.path = path;
  this.startIndex = startIndex;
  this.endIndex = endIndex;
  this.forceSize = forceSize;
  this.segs = null;
  this.segIndex = 0;
  this.initBuf = null;

  this.init = function(t, cb) {
    this.initLength = forceSize || 32 * 1024;
    if (!cb) {
      if (!this.initBuf)
        throw 'Calling init synchronusly when the init seg is not ready';
      return this.initBuf;
    }
    if (this.initBuf) {
      timeoutManager.setTimeout(cb.bind(this, this.initBuf), 1);
    }
    else {
      var self = this;
      var fileExtPattern = /\.(webm|mp4)$/;
      var extResult = fileExtPattern.exec(this.path)[1];
      if (extResult !== 'mp4' && extResult !== 'webm') {
        throw 'File extension "' + extResult + '" not supported!';
      }
      var xhr = xhrManager.createRequest(this.path, function(e) {
        self.segs = null;
        var response = this.getResponseData();
        if (extResult === 'mp4') {
          self.segs = parseMp4(response);
        } else {
          if (!!self.forceSize) {
            self.segs = parseWebM(response.buffer, self.forceSize);
          } else {
            self.segs = parseWebM(response.buffer);
          }
        }
        self.startIndex = self.startIndex || 0;
        self.endIndex = self.endIndex || self.segs.length - 1;
        self.endIndex = Math.min(self.endIndex, self.segs.length - 1);
        self.startIndex = Math.min(self.startIndex, self.endIndex);
        self.segIndex = self.startIndex;

        xhr = xhrManager.createRequest(self.path, function(e) {
          self.initBuf = this.getResponseData();
          cb.call(self, self.initBuf);
        }, 0, self.segs[0].offset);
        xhr.send();
      }, 0, self.initLength);
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
    this.segIndex = i - 1;
    dlog(2, 'Seeking to segment index=' + this.segIndex + ' time=' + t +
         ' start=' + this.segs[this.segIndex].time +
         ' length=' + this.segs[this.segIndex].duration);
  };

  this.pull = function(cb) {
    if (this.segIndex > this.endIndex) {
      timeoutManager.setTimeout(cb.bind(this, null), 1);
      return;
    }
    var seg = this.segs[this.segIndex];
    ++this.segIndex;
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
    if (!this.segs || !this.segs[this.segIndex])
      return 0;
    return this.segs[this.segIndex].duration;
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
  this.init_sent = false;
  attachChain(this, upstream);

  this.init = function(t, cb) {
    this.init_sent = true;
    return this.upstream.init(t, cb);
  };

  this.seek = function(t, sb) {
    this.init_sent = false;
    return this.upstream.seek(t, sb);
  };

  this.pull = function(cb) {
    if (!this.init_sent) {
      this.init_sent = true;
      this.upstream.init(0, function(init_seg) {
        cb(init_seg);
      });
      return;
    }
    var self = this;
    this.upstream.pull(function(rsp) {
      if (!rsp)
        self.init_sent = false;
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
// Returns 'rsp, new_cache'. 'new_cache' should be passed as 'cache' to the
// next invocation.
function pullBytes(elem, len, cache, cb) {
  if (!cache) {
    // always return EOS if cache is EOS, the caller should call seek before
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
    var new_cache = new Uint8Array(cache.length + buf.length);
    new_cache.set(cache);
    new_cache.set(buf, cache.length);
    cache = new_cache;

    if (cache.length <= len) {
      cb(cache, new Uint8Array(0));
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
  chain.init(t, function(init_seg) {
    sb.addEventListener('update', function appendedCb() {
      sb.removeEventListener('update', appendedCb);
      cb();
    });
    sb.appendBuffer(init_seg);
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
  var buffered_end = findBufferedRangeEndForTime(sb, current);

  if (buffered_end) {
    buffered_end = buffered_end + 0.1;
  }
  else {
    buffered_end = 0;
    if (started) {
      chain.seek(0, sb);
    }
  }
  var appendHandler = (function(sb) {
    var totalAppends = 0;
    var appendCbs = 0;
    var shouldCallCb = false;
    var postAppendBufferCb = null;

    function startedAppendBuffer(cb) {
      totalAppends++;
      postAppendBufferCb = cb;
    }

    function appendBufferFinished() {
      appendCbs++;

      buffered_end = findBufferedRangeEndForTime(sb, buffered_end);
      if (buffered_end) {
        buffered_end = buffered_end + 0.1;
      } else {
        buffered_end = 0;
      }
      if (shouldCallCb && (appendCbs === totalAppends)) {
        done();
      }
      else {
        postAppendBufferCb();
      }
    }

    function done() {
      // calls the actual callback (cb) function when all the appends are done
      if (totalAppends === appendCbs) {
        sb.removeEventListener('update', appendBufferFinished);
        cb();
      }

      // Looks like there are outstanding append cbs; let those "append cbs"
      // call the real cb.
      shouldCallCb = true;
    }

    sb.addEventListener('update', appendBufferFinished);

    return {
      'startedAppendBuffer': startedAppendBuffer,
      'appendBufferFinished': appendBufferFinished,
      'done': done
    };
  })(sb);

  (function loop(buffer) {
    if (!elementInBody(mp)) {
      appendHandler.done();
      return;
    }

    if (buffer) {
      if (!safeAppend(sb, buffer)) {
        appendHandler.done();
        return;
      }
      appendHandler.startedAppendBuffer(loop);

      //timeoutManager.setTimeout(loop, 0);
    }
    else {
      if (t >= buffered_end && !mp.error)
        chain.pull(loop);
      else
        appendHandler.done();
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

  var buffered_end = findBufferedRangeEndForTime(sb, t);

  (function loop(buffer) {
    if (!elementInBody(mp)) {
      cb();
      return;
    }
    if (buffer) {
      if (sb.updating) {
        timeoutManager.setTimeout(function() {
          loop(buffer);
        }, 0);
      } else {
        if (!safeAppend(sb, buffer))
          return;
        timeoutManager.setTimeout(loop, 0);
      }
    } else {
      buffered_end = findBufferedRangeEndForTime(sb, t);
      if (t + gap >= (buffered_end || 0) && !mp.error) {
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
window.playThrough =
    function(timeoutManager, mp, lead, endTime, s1, f1, s2, f2, cb) {
  var yieldTime = 0.03;

  function loop() {
    if (!elementInBody(mp))
      return;
    if (mp.currentTime <= endTime && !mp.error)
      timeoutManager.setTimeout(
          playThrough.bind(
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

window.setupMse = function(video, runner, videoStreams, audioStreams) {
  videoStreams = videoStreams instanceof Array ? videoStreams : [videoStreams];
  audioStreams = audioStreams instanceof Array ? audioStreams : [audioStreams];
  var ms = new MediaSource();
  var videoSbs = [];
  var audioSbs = [];

  function onError(e) {
    switch (e.target.error.code) {
      case e.target.error.MEDIA_ERR_ABORTED:
        runner.fail('Test failure: You aborted the video playback.');
        break;
      case e.target.error.MEDIA_ERR_NETWORK:
        runner.fail('Test failure: A network error caused the video' +
                    ' download to fail part-way.');
        break;
      case e.target.error.MEDIA_ERR_DECODE:
        runner.fail('Test failure: The video playback was aborted due to' +
                    ' a corruption problem or because the video used' +
                    ' features your browser did not support.');
        break;
      case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        runner.fail('Test failure: The video could not be loaded, either' +
                    ' because the server or network failed or because the' +
                    ' format is not supported.');
        break;
      default:
        runner.fail('Test failure: An unknown error occurred.');
        break;
    }
  }

  function fetchStream(stream, cb, start, end) {
    var xhr = runner.XHRManager.createRequest(stream.src, cb, start, end);
    xhr.send();
  }

  function appendLoop(stream, sb) {
    var parsedData;
    var segmentIdx = 0;
    var maxSegments = 4;
    fetchStream(stream, function() {
      if (stream.codec == 'H264' || stream.codec == 'AAC') {
        parsedData = parseMp4(this.getResponseData());
      } else if(stream.codec == 'VP9' || stream.codec == 'Opus') {
        parsedData = parseWebM(this.getResponseData().buffer);
      } else {
        runner.fail('Unsupported codec in appendLoop.');
      }
      fetchStream(stream, function() {
        sb.addEventListener('updateend', function append() {
          if (maxSegments - segmentIdx <= 0) {
            sb.removeEventListener('updateend', append);
            return;
          }
          fetchStream(stream, function() {
            sb.appendBuffer(this.getResponseData());
            segmentIdx += 1
          }, parsedData[segmentIdx].offset, parsedData[segmentIdx].size);
        });
        sb.appendBuffer(this.getResponseData());
        segmentIdx += 1
      }, 0, parsedData[0].size + parsedData[0].offset);
    }, 0, 32 * 1024);
  }

  function onSourceOpen(e) {
    for (var audioStreamIdx in audioStreams) {
      var audioStream = audioStreams[audioStreamIdx];
      if (audioStream != null) {
        audioSbs.push(ms.addSourceBuffer(audioStream.mimetype));
        appendLoop(audioStream, audioSbs[audioSbs.length - 1]);
      }
    }

    for (var videoStreamIdx in videoStreams) {
      var videoStream = videoStreams[videoStreamIdx];
      if (videoStream != null) {
        videoSbs.push(ms.addSourceBuffer(videoStream.mimetype));
        appendLoop(videoStream, videoSbs[videoSbs.length - 1]);
      }
    }
  }

  ms.addEventListener('sourceopen', onSourceOpen);
  video.addEventListener('error', onError);
  video.src = window.URL.createObjectURL(ms);
  video.load();
};

})();
