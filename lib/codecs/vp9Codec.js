/**
 * @license
 * Copyright 2020 Google Inc. All rights reserved.
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

(function() {

/**
 * @fileoverview Utility for generating an VP9 codec string.
 *
 * VP9 Metadata is used to construct an VP9 codec string.
 * Values are not provided if we don't have a test stream that uses that value.
 *
 * @see https://www.webmproject.org/vp9/mp4/
 */
const VP9Codec = {};

/**
 * An integer that specifies the VP9 codec profile.
 * @enum {number}
 */
VP9Codec.Profile = {
  /**
   * Bit Depth: 8 or 10
   * Monochrome Support: Yes
   * Chrome subsampling: YUV 4:2:0
   */
  VP9_MAIN: 0,
  VP9_2: 2,
};

/**
 * @enum {number}
 */
VP9Codec.BitDepth = {
  SDR: 8,
  HDR: 10,
};

/**
 * @enum {number}
 */
VP9Codec.ChromaSubsampling = {
  YUV_420: 1,  // YUV 4:2:0
};

/**
 * @enum {number}
 */
VP9Codec.ColorPrimaries = {
  CP_BT_709: 1,   // BT.709
  CP_BT_2020: 9,  // BT.2020
};

/**
 * @enum {number}
 */
VP9Codec.TransferCharacteristics = {
  TC_BT_709: 1,       // BT.709
  TC_SMPTE_2084: 16,  // SMPTE ST 2084, ITU BT.2100 PQ
  TC_HLG: 18,         // BT.2100 HLG, ARIB STD-B67
};

/**
 * @enum {number}
 */
VP9Codec.MatrixCoefficients = {
  MC_BT_709: 1,       // BT.709
  MC_BT_2020_NCL: 9,  // BT.2020 non-constant luminance, BT.2100 YCbCr
};

/**
 * @enum {number}
 */
VP9Codec.VideoFullRangeFlag = {
  TV: 0,  // TV (limited) range
};

/**
 * Returns the value of seq_level_idx as defined in the spec.
 * @param {string} level e.g. '2.1'
 * @return {number} the corresponding integer 21.
 */
VP9Codec.seqLevelIdx = function(level) {
  var xY = level.split('.');
  var x = parseInt(xY[0], 10);
  var y = parseInt(xY[1], 10);
  return x * 10 + y;
};

VP9Codec.defaultVp9Metadata = function() {
  return {
    profile: this.Profile.VP9_MAIN,
    level: '5.1',
    bitDepth: this.BitDepth.SDR,
    chromaSubsampling: this.ChromaSubsampling.YUV_420,
    colorPrimaries: this.ColorPrimaries.CP_BT_709,
    transferCharacteristics: this.TransferCharacteristics.TC_BT_709,
    matrixCoefficients: this.MatrixCoefficients.MC_BT_709,
    videoFullRangeFlag: this.VideoFullRangeFlag.TV,
  };
};

/**
 * Default HDR metadata without detiailed HDR characteristics.
 */
VP9Codec.defaultHdrMetadata = function() {
  return {
    profile: this.Profile.VP9_2,
    level: '5.1',
    bitDepth: this.BitDepth.HDR,
    chromaSubsampling: this.ChromaSubsampling.YUV_420,
    colorPrimaries: this.ColorPrimaries.CP_BT_2020,
    matrixCoefficients: this.MatrixCoefficients.MC_BT_2020_NCL,
    videoFullRangeFlag: this.VideoFullRangeFlag.TV,
  };
};

/**
 * Common overrides for HDR HLG streams.
 */
VP9Codec.hlgMetadata = function() {
  return Object.assign({}, this.defaultHdrMetadata(), {
    transferCharacteristics: this.TransferCharacteristics.TC_HLG,
  });
};

/**
 * Common overrides for HDR PQ streams.
 */
VP9Codec.pqMetadata = function() {
  return Object.assign({}, this.defaultHdrMetadata(), {
    transferCharacteristics: this.TransferCharacteristics.TC_SMPTE_2084,
  });
};

/**
 * Returns an VP9 codecs parameter string,
 * e.g. "vp09.02.10.10.01.09.16.09.01".
 * See https://www.webmproject.org/vp9/mp4/
 * @param {!object} metadataOverrides Values that differ from the defaults
 *   in defaultVp9Metadata.
 * @param {?boolean=} forceLongForm If false, return a short form codec string
 *   if no optional metadata values are overridden.
 * @param {!string} forceForm return the correspondning codec string
 *   L - longForm, M - Medium form.
 * @return {string}
 */
VP9Codec.codecString = function(metadataOverrides, forceForm = null) {
  const defaultMetadata = this.defaultVp9Metadata();
  const longFormRequired = vp9Metadata => {
    const optionalKeys = [
      'chromaSubsampling',
      'colorPrimaries',
      'matrixCoefficients',
      'transferCharacteristics',
      'videoFullRangeFlag',
    ];
    for (let i = 0; i < optionalKeys.length; i++) {
      const key = optionalKeys[i];
      if (vp9Metadata[key] != defaultMetadata[key]) {
        return true;
      }
    }
    return false;
  };

  const vp9Metadata = Object.assign({}, defaultMetadata, metadataOverrides);

  // Mandatory values
  const outputArray = ['vp09'];
  outputArray.push(vp9Metadata.profile.toString().padStart(2, '0'));
  outputArray.push(
      `${this.seqLevelIdx(vp9Metadata.level).toString().padStart(2, '0')}`);
  outputArray.push(vp9Metadata.bitDepth.toString().padStart(2, '0'));

  // Optional values
  if (longFormRequired(vp9Metadata) && forceForm != 'M') {
    forceForm = 'L';
  }
  if (forceForm && forceForm != 'L' && forceForm != 'M') {
    util.dlog(2, 'Invalid parameter: forceForm must be either \'L\' or \'M\'.');
  } else if (forceForm) {
    outputArray.push(vp9Metadata.chromaSubsampling.toString().padStart(2, '0'));
    outputArray.push(vp9Metadata.colorPrimaries.toString().padStart(2, '0'));
    outputArray.push(
        vp9Metadata.transferCharacteristics.toString().padStart(2, '0'));
    outputArray.push(
        vp9Metadata.matrixCoefficients.toString().padStart(2, '0'));

    if (forceForm == 'L') {
      outputArray.push(
          vp9Metadata.videoFullRangeFlag.toString().padStart(2, '0'));
    }
  }
  return outputArray.join('.');
};

/**
 * Add common HDR HLG metadata before generating the codec string.
 * @param {!object} metadataOverrides Values that differ from the
 *     defaults
 *   in hlgMetadata or defaultVp9Metadata.
 * @return {string}
 */
VP9Codec.hlgCodecString = function(metadataOverrides) {
  return this.codecString(
      Object.assign({}, this.hlgMetadata(), metadataOverrides));
};

/**
 * Add common HDR PQ metadata before generating the codec string.
 * @param {!object} metadataOverrides Values that differ from the
 *     defaults
 *   in pqMetadata or defaultVp9Metadata.
 * @return {string}
 */
VP9Codec.pqCodecString = function(metadataOverrides) {
  return this.codecString(
      Object.assign({}, this.pqMetadata(), metadataOverrides));
};

window.VP9Codec = VP9Codec;
})();

try {
  exports.VP9Codec = window.VP9Codec;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
