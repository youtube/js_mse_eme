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

var ATTRIBUTE_NAME = 'media_element_test_attr_to_dump';
var EVENT_PREFIX = 'handle';

var dumpObject = function(object) {
  var attributes = object[ATTRIBUTE_NAME];
  if (!attributes)
    throw 'Cannot find attributes in object';

  var output = '';
  for (var i = 0; i < attributes.length; ++i) {
    var attr = object[attributes[i]];
    if (typeof attr == 'undefined')
      attr = 'undefined';
    else if (attr === null)
      attr = 'null';
    // A special case for TimeRanges. Could be using some regisertation
    // mechanisms but it is enough for the tests.
    else if (attr instanceof TimeRanges) {
      var repr = attr.length + ' ';
      for (var j = 0; j < attr.length; ++j) {
        repr += '(' + attr.start(j) + ',' + attr.end(j) + ')';
        if (j != attr.length - 1)
          repr += ' ';
      }
      attr = repr;
    } else if (isNaN(attr))
      attr = 'NaN';

    if (attributes[i] != 'readyState' &&
        attributes[i] != 'networkState' &&
        attributes[i] in object.lastAttrs &&
        object.lastAttrs[attributes[i]] == attr)
      continue;
    output += attributes[i] + ': ' + attr + ' ';
    object.lastAttrs[attributes[i]] = attr;
  }

  return output;
};

var eventHandler = function(name, e) {
  if (e.target[EVENT_PREFIX + name])
    e.target[EVENT_PREFIX + name](e);
  console.log(name + ' called with: ' + dumpObject(e.target));
};

window.createEventListener = function(object, events, attributes) {
  for (var i = 0; i < events.length; ++i) {
    object.addEventListener(events[i], eventHandler.bind(object, events[i]));
  }
  object[ATTRIBUTE_NAME] = attributes;
  object.lastAttrs = {};
  console.log('Initial state: ' + dumpObject(object));
};

})();

