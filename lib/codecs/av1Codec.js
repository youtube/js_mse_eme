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
   * @fileoverview Utility for generating an AV1 codec string.
   *
   * AV1 Metadata is used to construct an AV1 codec string.
   * Values are not provided if we don't have a test stream that uses that value.
   *
   * @see https://aomediacodec.github.io/av1-isobmff/#codecsparam
   * @see https://aomediacodec.github.io/av1-spec/av1-spec.pdf
   */
  const AV1Codec = {};

  /**
   * Specifies the features that can be used in the coded video sequence.
   * Also called seq_profile.
   * @enum {number}
   */
  AV1Codec.Profile = {
    /**
     * Bit Depth: 8 or 10
     * Monochrome Support: Yes
     * Chrome subsampling: YUV 4:2:0
     */
    AV1_MAIN: 0,
  };

  /**
   * @enum {number}
   */
  AV1Codec.Tier = {
    MAIN: 'M',
    // None of our streams currently support High tier.
  };

  /**
   * @enum {number}
   */
  AV1Codec.BitDepth = {
    SDR: 8,
    HDR: 10,
  };

  /**
   * @enum {number}
   */
  AV1Codec.Monochrome = {
    NO: 0,
  };

  /**
   * @enum {number}
   */
  AV1Codec.ChromaSubsamplingX = {
    YUV_420: 1,  // YUV 4:2:0
  };

  /**
   * @enum {number}
   */
  AV1Codec.ChromaSubsamplingY = {
    YUV_420: 1,  // YUV 4:2:0
  };

  /**
   * @enum {number}
   */
  AV1Codec.ChromaSamplePosition = {
    /**
     * Unknown (in this case the source video transfer function must be
     * signaled outside the AV1 bitstream).
     */
    CSP_UNKNOWN: 0,
  };

  /**
   * @enum {number}
   */
  AV1Codec.ColorPrimaries = {
    CP_BT_709: 1,   // BT.709
    CP_BT_2020: 9,  // BT.2020
  };

  /**
   * @enum {number}
   */
  AV1Codec.TransferCharacteristics = {
    TC_BT_709: 1,       // BT.709
    TC_SMPTE_2084: 16,  // SMPTE ST 2084, ITU BT.2100 PQ
    TC_HLG: 18,         // BT.2100 HLG, ARIB STD-B67
  };

  /**
   * @enum {number}
   */
  AV1Codec.MatrixCoefficients = {
    MC_BT_709: 1,       // BT.709
    MC_BT_2020_NCL: 9,  // BT.2020 non-constant luminance, BT.2100 YCbCr
  };

  /**
   * @enum {number}
   */
  AV1Codec.VideoFullRangeFlag = {
    TV: 0,  // TV (limited) range
  };

  /**
   * Returns the value of seq_level_idx as defined in the spec.
   * @param {string} level e.g. '2.1'
   * @return {number} integer from 1 to 31.
   */
  AV1Codec.seqLevelIdx = function(level) {
    var xY = level.split('.');
    var x = parseInt(xY[0], 10);
    var y = parseInt(xY[1], 10);
    return ((x - 2) * 4) + y;
  };

  AV1Codec.defaultAv1Metadata = function() {
    return {
      profile: this.Profile.AV1_MAIN,
      level: '2.0',
      tier: this.Tier.MAIN,
      bitDepth: this.BitDepth.SDR,
      monochrome: this.Monochrome.NO,
      chromaSubsamplingX: this.ChromaSubsamplingX.YUV_420,
      chromaSubsamplingY: this.ChromaSubsamplingY.YUV_420,
      chromaSamplePosition: this.ChromaSamplePosition.CSP_UNKNOWN,
      colorPrimaries: this.ColorPrimaries.CP_BT_709,
      transferCharacteristics: this.TransferCharacteristics.TC_BT_709,
      matrixCoefficients: this.MatrixCoefficients.MC_BT_709,
      videoFullRangeFlag: this.VideoFullRangeFlag.TV,
    };
  };

  /**
   * Common overrides for HDR HLG streams.
   */
  AV1Codec.hlgMetadata = function() {
    return {
      bitDepth: this.BitDepth.HDR,
      colorPrimaries: this.ColorPrimaries.CP_BT_2020,
      transferCharacteristics: this.TransferCharacteristics.TC_HLG,
      matrixCoefficients: this.MatrixCoefficients.MC_BT_709,
    };
  };

  /**
   * Common overrides for HDR PQ streams.
   */
  AV1Codec.pqMetadata = function() {
    return {
      bitDepth: this.BitDepth.HDR,
      colorPrimaries: this.ColorPrimaries.CP_BT_2020,
      transferCharacteristics: this.TransferCharacteristics.TC_SMPTE_2084,
      matrixCoefficients: this.MatrixCoefficients.MC_BT_2020_NCL,
    };
  };

  /**
   * Returns an AV1 codecs parameter string,
   * e.g. "av01.0.04M.10.0.112.09.16.09.0".
   * See https://aomediacodec.github.io/av1-isobmff/#codecsparam
   * @param {!object} av1MetadataOverrides Values that differ from the defaults
   *   in defaultAv1Metadata.
   * @param {?boolean=} forceLongForm If false, return a short form codec string
   *   if no optional metadata values are overridden.
   * @return {string}
   */
  AV1Codec.codecString = function(av1MetadataOverrides, forceLongForm = false) {
    const defaultAv1Metadata = this.defaultAv1Metadata();
    const longFormRequired = av1Metadata => {
      const optionalKeys = [
        'monochrome',
        'chromaSubsamplingX',
        'chromaSubsamplingY',
        'chromaSamplePosition',
        'colorPrimaries',
        'transferCharacteristics',
        'matrixCoefficients',
        'videoFullRangeFlag',
      ];
      for (let i = 0; i < optionalKeys.length; i++) {
        const key = optionalKeys[i];
        if (av1Metadata[key] != defaultAv1Metadata[key]) {
          return true;
        }
      }
      return false;
    };

    const av1Metadata =
        Object.assign({}, defaultAv1Metadata, av1MetadataOverrides);

    // Mandatory values
    const outputArray = ['av01'];
    outputArray.push(av1Metadata.profile.toString());
    outputArray.push(
        `${this.seqLevelIdx(av1Metadata.level).toString().padStart(2, '0')}${
            av1Metadata.tier}`);
    outputArray.push(av1Metadata.bitDepth.toString().padStart(2, '0'));

    // Optional values
    if (forceLongForm || longFormRequired(av1Metadata)) {
      outputArray.push(av1Metadata.monochrome.toString());
      let chromaSubsampling =
          `${av1Metadata.chromaSubsamplingX}${av1Metadata.chromaSubsamplingY}`;
      if (av1Metadata.chromaSubsamplingX == 1 &&
          av1Metadata.chromaSubsamplingY == 1) {
        chromaSubsampling += av1Metadata.chromaSamplePosition.toString();
      } else {
        chromaSubsampling += '0';
      }
      outputArray.push(chromaSubsampling);

      outputArray.push(av1Metadata.colorPrimaries.toString().padStart(2, '0'));
      outputArray.push(
          av1Metadata.transferCharacteristics.toString().padStart(2, '0'));
      outputArray.push(
          av1Metadata.matrixCoefficients.toString().padStart(2, '0'));
      outputArray.push(av1Metadata.videoFullRangeFlag.toString());
    }
    return outputArray.join('.');
  };

  /**
   * Add common HDR HLG metadata before generating the codec string.
   * @param {!object} av1MetadataOverrides Values that differ from the defaults
   *   in hlgMetadata or defaultAv1Metadata.
   * @return {string}
   */
  AV1Codec.hlgCodecString = function(av1MetadataOverrides) {
    return this.codecString(
        Object.assign({}, this.hlgMetadata(), av1MetadataOverrides));
  };

  /**
   * Add common HDR PQ metadata before generating the codec string.
   * @param {!object} av1MetadataOverrides Values that differ from the defaults
   *   in pqMetadata or defaultAv1Metadata.
   * @return {string}
   */
  AV1Codec.pqCodecString = function(av1MetadataOverrides) {
    return this.codecString(
        Object.assign({}, this.pqMetadata(), av1MetadataOverrides));
  };

  window.AV1Codec = AV1Codec;
})();

try {
  exports.AV1Codec = window.AV1Codec;
} catch (e) {
  // do nothing, this function is not supposed to work for browser, but it's for
  // Node js to generate json file instead.
}
