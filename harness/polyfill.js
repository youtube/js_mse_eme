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

/**
 * @fileoverview Polyfills all the undefined functions that is not covered by
 * Spidermonkey.
 */
'use strict';

if (!String.prototype.padStart) {
  /**
   * Polyfill padstart if it's not available.
   * @param {?int} targetLength How long to pad the ending string into.
   * @param {?string} padString What string to pad.
   * @return {string} a padded string.
   */
  String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = Number(targetLength);
    padString = String((typeof padString !== 'undefined' ? padString : ' '));
    if (this.length > targetLength) {
      return String(this);
    } else {
      targetLength = targetLength - this.length;
      var rPadString = padString;
      while (targetLength > padString.length) {
        padString += rPadString;
      }
      return padString.slice(0, targetLength) + String(this);
    }
  };
}
