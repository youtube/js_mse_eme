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

/**
 * Helper class for WebM parsing. Takes a DataView containing the elements to
 * be parsed. Lifted this out of dash-mse-test.appspot.com.
 *
 * @param {DataView} elemData The element data view.
 * @param {number=} opt_start The byte offset of the earliest stream, relative
 *     to an (unspecified) reference point. The current position relative to
 *     this start point can be queried on the element, and the information will
 *     be passed to subelements.
 *
 * @constructor
 * @private
 */
var WebMElemParser_ = function(elemData, opt_start) {
  /**
   * The element data being processed.
   *
   * @type {DataView}
   * @private
   */
  this.elemData_ = elemData;


  /**
   * The offset of the next byte in the current element data view.
   *
   * @type {number}
   * @private
   */
  this.pos_ = 0;

  /**
   * The start position of the first byte in the data view.
   *
   * @type {number}
   * @private
   */
  this.start_ = opt_start || 0;
};


/**
 * Test if there is data remaining in the stream.
 *
 * @return {boolean} True if data remains.
 */
WebMElemParser_.prototype.atEos = function() {
  return this.pos_ >= this.elemData_.byteLength;
};


/**
 * Read an element identifier from the stream, advancing the read pointer.
 *
 * Note that void elements will automatically be skipped.
 *
 * @return {number} The element ID.
 */
WebMElemParser_.prototype.readId = function() {
  var id = this.readCodedInt_(false);
  while (id == 0xec) {
    this.skipElement();
    id = this.readCodedInt_(false);
  }
  return id;
};


/**
 * Read a subelement from the stream. Returns a new parser which contains the
 * subelement's data, and advances the position of the current parser to the
 * next element at the current level.
 *
 * @return {WebMElemParser_} The new parser.
 */
WebMElemParser_.prototype.readSubElement = function() {
  var size = this.readCodedInt_(true);
  // 'size' could be the size of the entire WebM file, which is legal (as long
  // as the code that uses this doesn't try to read past the end of the data
  // that's present, which it won't. The 'length' parameter is defined as a
  // 'long', and the Web IDL spec does integer wraparound by definition when
  // converting to a 'long', which makes the 'size' param go negative. So we
  // clamp this before the call.
  var end = this.elemData_.byteOffset + this.pos_;
  var length = Math.min(size, this.elemData_.buffer.byteLength - end);
  var subData = new DataView(this.elemData_.buffer, end, length);
  var subStart = this.start_ + this.pos_;
  var parser = new WebMElemParser_(subData, subStart);
  this.pos_ += size;
  return parser;
};


/**
 * Peeks at the size of the next element in the stream.
 * @return {number} The size value.
 */
WebMElemParser_.prototype.peekSize = function() {
  var pos = this.pos_;
  var value = this.readCodedInt_(true);
  this.pos_ = pos;
  return value;
};


/**
 * Read an integer element from the stream.
 *
 * @return {number} The integer value.
 */
WebMElemParser_.prototype.readInt = function() {
  var size = this.readCodedInt_(true);
  var value = this.readSizedInt_(size);
  return value;
};


/**
 * Read a floating-point element from the stream.
 *
 * @return {number} The integer value.
 */
WebMElemParser_.prototype.readFloat = function() {
  var size = this.readCodedInt_(true);
  var value = this.readSizedFloat_(size);
  return value;
};


/**
 * Advance the stream past the current element.
 */
WebMElemParser_.prototype.skipElement = function() {
  var size = this.readCodedInt_(true);
  this.pos_ += size;
};


/**
 * Get the position of the current offset with respect to the start offset
 * supplied to the top-level element at creation.
 *
 * @return {number} The offset.
 */
WebMElemParser_.prototype.getCurrentOffset = function() {
  return this.start_ + this.pos_;
};


/**
 * Read a WebM-encoded integer. This encoding is used to represent element IDs,
 * element data sizes, and unsigned integers. Signed integers are not yet
 * supported.
 *
 * @param {boolean} useMask Whether to mask out the EBML Length Descriptor.
 * @return {number} The value.
 * @private
 * @see http://www.matroska.org/technical/specs/index.html
 */
WebMElemParser_.prototype.readCodedInt_ = function(useMask) {
  var value = this.readByte_();

  if (value == 0x01) {
    // We run into precision problems in this case, handle it separately.
    value = 0;
    for (var i = 0; i < 7; i++) {
      value = (value * 256) + this.readByte_();
    }
    return value;
  }

  var mask = 128;
  for (var i = 0; i < 6 && mask > value; i++) {
    value = (value * 256) + this.readByte_();
    mask *= 128;
  }

  if (useMask) {
    // Can't use bitwise operations because this value can exceed int31.
    return value - mask;
  } else {
    return value;
  }
};


/**
 * Read a raw integer with an arbitrary number of bytes.
 *
 * @param {number} size Number of bytes to read.
 * @return {number} The value.
 * @private
 */
WebMElemParser_.prototype.readSizedInt_ = function(size) {
  var value = this.readByte_();
  for (var i = 1; i < size; i++) {
    value = (value << 8) + this.readByte_();
  }
  return value;
};


/**
 * Read a float.
 *
 * @param {number} size Number of bytes (4 or 8).
 * @return {number} The value.
 * @private
 */
WebMElemParser_.prototype.readSizedFloat_ = function(size) {
  var value = 0;
  if (size == 4) {
    value = this.elemData_.getFloat32(this.pos_);
  } else if (size == 8) {
    value = this.elemData_.getFloat64(this.pos_);
  }
  this.pos_ += size;
  return value;
};


/**
 * Read a single byte from the stream and advance the stream position.
 *
 * @return {number} The byte.
 * @private
 */
WebMElemParser_.prototype.readByte_ = function() {
  return this.elemData_.getUint8(this.pos_++);
};


/**
 * Parse a WebM 'CuePoint' element into a SegmentReference.
 *
 * @param {WebMElemParser_} parser The parser.
 * @param {number} timebase The timebase.
 * @param {number} offset The offset in bytes from the start of the cluster.
 * @return {Array.<number>} A 2-tuple (first byte offset, start time), or
 *     null if there was an error.
 * @private
 */
WebMElemParser_.prototype.readWebMCuePoint_ = function(timebase, offset) {
  // Assumed structure: 'CueTime' followed by one 'CueTrackPositions'. This is
  // not intended to be a generalized parser, and will not handle muxed streams.
  if (this.readId() != 0xb3) {  // 'CueTime' element
    return null;
  }
  var time = this.readInt() * timebase;

  if (this.readId() != 0xb7) {  // 'CueTrackPositions' element
    return null;
  }

  var innerParser = this.readSubElement();

  var clusterPos = offset;
  while (!innerParser.atEos()) {
    var id = innerParser.readId();
    if (id == 0xf1) {  // 'CueClusterPosition' element
      clusterPos = innerParser.readInt() + offset;
    } else {
      innerParser.skipElement();
    }
  }
  return [clusterPos, time];
};


// Given a buffer contains the first 32k of a file, return a list of tables
// containing 'time', 'duration', 'offset', and 'size' properties for each cue.
function parseWebM(data) {
  var dlog = function() {
    var forward = window.dlog || console.log.bind(console);
    forward.apply(this, arguments);
  };

  var parser = new WebMElemParser_(new DataView(data));

  if (parser.readId() != 0x1a45dfa3) {  // 'EBML' element
    dlog(1, 'SegmentIndex: Invalid EBML ID');
    return;
  }
  // Skip the EBML header, which must come first.
  parser.skipElement();

  if (parser.readId() != 0x18538067) {  // 'Segment' element
    dlog(1, 'SegmentIndex: Invalid Segment ID');
    return;
  }

  // Grab the segment size to cap the last segment in the file.
  var segmentSize = parser.peekSize();

  // Discard the segment parser, we're only interested in its contents now
  parser = parser.readSubElement();

  // Capture the offset to the first byte of the contents of the segment to use
  // as the relative base for 'Cues' elements.
  // TODO: This assumes single-segment media streams, which may not be
  // true for live, depending.
  var segmentOffset = parser.getCurrentOffset();
  var cuesDone = false;
  var needsCluster = false;
  var hasTiming = false;
  var id = null;
  var totalDuration = 0;

  while ((!cuesDone || !hasTiming) && !parser.atEos()) {
    id = parser.readId();
    switch(id) {
      case 0x114d9b74:
        var seekParser = parser.readSubElement();
        var cuesPosition = null;
        while (!seekParser.atEos()) {
          if (seekParser.readId() == 0x4dbb) {
            var seekElementParser = seekParser.readSubElement();
            if (seekElementParser.readId() != 0x53ab) {
              dlog(1, 'Seek: Invalid SeekID');
            }
            var seekId = seekElementParser.readSubElement().readId();
            if (seekId == 0x1c53bb6b) {
              if (seekElementParser.readId() != 0x53ac) {
                dlog(1, 'Seek: Invalid SeekPosition');
              }
              cuesPosition = seekElementParser.readInt();
              cuesDone = true;
              break;
            }
          }
          else {
            dlog(1, 'Seek: Invalid SeekID');
          }
        }
        break;

      case 0x1549a966: // 'Segment' element
        if (!cuesDone) {
          // we don't have cues...uh oh, we'll need to manually parse the cluster
          needsCluster = true;
          cuesDone = true;
        }

        var segmentParser = parser.readSubElement();

        var timescaleNum = 1000000;  // Default timescale numerator
        var timescaleDen = 1000000000;  // Default timescale denominator

        while (!segmentParser.atEos()) {
          id = segmentParser.readId();
          if (id == 0x2ad7b1) {  // 'TimecodeScale' element
            timescaleNum = segmentParser.readInt();
          } else if (id == 0x2ad7b2) {  // 'TimecodeScaleDenominator' element
            timescaleDen = segmentParser.readInt();
          } else if (id == 0x4489) {  // 'Duration' element
            totalDuration = segmentParser.readFloat();
          } else {
            segmentParser.skipElement();
          }
        }

        var timebase = timescaleNum / timescaleDen;
        totalDuration *= timebase;

        hasTiming = true;
        break;

      default:
        parser.skipElement();
        break;
    }
  }

  // Done with initialization segment. On to the cues...if there's any.
  var res = [];
  if (needsCluster) {
    var clusterOffset = parser.getCurrentOffset();
    while (!parser.atEos()) {
      if (parser.readId() == 0x1f43b675) {
        var clusterSize = parser.peekSize();
        var clusterParser = parser.readSubElement();
        if (clusterParser.readId() != 0xe7) {
          dlog(1, 'Cluster: Invalid Timecode');
        }
        var timecode = clusterParser.readInt();

        res.push({
          time: timecode,
          duration: 0,
          offset: clusterOffset,
          size: clusterSize
        });

        if (res.length > 1) {
          var rLen = res.length;
          res[rLen - 2].duration = res[rLen - 1].time - res[rLen - 2].time;
          res[rLen - 2].size = res[rLen - 1].offset - res[rLen - 2].offset;
        }
      } else {
        parser.skipElement();
      }
    }
  } else {
    parser = new WebMElemParser_(new DataView(data, segmentOffset + cuesPosition));
    if (parser.readId() != 0x1c53bb6b) {  // 'Cues' element
      dlog(1, 'SegmentIndex: Invalid Cues ID');
      return;
    }

    // As before, we only care about the 'Cues' element contents
    parser = parser.readSubElement();

    while (!parser.atEos()) {
      id = parser.readId();
      if (id == 0xbb) {  // 'CuePoint' element
        var subelem = parser.readSubElement();
        var offAndTime = subelem.readWebMCuePoint_(timebase, segmentOffset);
        res.push({
          time: offAndTime[1],
          duration: 0,
          offset: offAndTime[0],
          size: 0
        });
        if (res.length > 1) {
          var rLen = res.length;
          res[rLen - 2].duration = res[rLen - 1].time - res[rLen - 2].time;
          res[rLen - 2].size = res[rLen - 1].offset - res[rLen - 2].offset;
        }
      } else {
        parser.skipElement();
      }
    }
  }

  if (res.length > 0) {
    // TODO: need to do something with the last cluster for files with cues (as in, size is missing)
    res[res.length - 1].duration = totalDuration - res[res.length - 1].time;
  }
  return res;
}
