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
function parseMp4(data) {
  var sidxStartBytes = getSIDXOffset(data);
  var currPos = sidxStartBytes;

  function read(bytes) {
    if (currPos + bytes > data.length)
      throw 'sidx box is incomplete.';
    var result = [];
    for (var i = 0; i < bytes; ++i)
      result.push(data[currPos + i]);
    currPos += bytes;
    return result;
  }

  var size = btoi(read(4));
  var sidxEnd = sidxStartBytes + size;
  var boxType = read(4);
  boxType = btofourcc(boxType);
  if (boxType !== 'sidx')
    throw 'Unrecognized box type ' + boxType;

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
  if (currPos !== sidxEnd)
    throw 'Bad end point' + currPos + sidxEnd;
  return res;
}
