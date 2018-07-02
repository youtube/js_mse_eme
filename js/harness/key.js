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

var keydb = {
  0x25:'Left',
  0x27:'Right',
  0x26:'Up',
  0x28:'Down',
  0x0D:'Enter',
  0x1B:'Back',
  0xFA:'Play',
  0x13:'Pause',
  0xB3:'Play/Pause',
  0xB2:'Stop',
  0xE4:'Fast Forward',
  0xE3:'Rewind',
  0x20:'Space',
  0x08:'Backspace',
  0x47:'Delete',
  0x53:'Search',
  0xB1:'Previous',
  0xB0:'Next',
  0x1CC:'Closed Captions',
  0x193:'Red',
  0x194:'Green',
  0x195:'Yellow',
  0x196:'Blue',
  0xAC:'YouTube button',

  /* Samsung Orsay */
  0x04:'Left',
  0x05:'Right',
  0x7314:'Up',
  0x7315:'Down',
  0x4A: 'Play/Pause',
  0x46: 'Stop',
  0x438: 'Previous',
  0x436: 'Next',

  /* Tizen */
  0x2719:'Escape',
  0x019F:'Play',
  0x280C:'Play/Pause',
  0x019D:'Stop',
  0x01A1:'Fast Forward',
  0x019C:'Rewind',
  0x002E:'Delete',
  0x27F1:'Search',
  0x27CE:'Previous',
  0x0022:'Next',

  /* CEA 2014 */
  0x19C: 'Rewind',
  0x19D: 'Stop',
  0x19F: 'Play',
  0x1A1: 'Fast Forward',
  0x1A8: 'Previous',
  0x1A9: 'Next',
  0x1CD: 'Escape',

  /* Gamepad */
  0x8001: 'Escape',
  0x8000: 'Enter',
  0x8008: 'Enter',
  0x8009: 'Enter',
  0x800C: 'Up',
  0x800D: 'Down',
  0x800E: 'Left',
  0x800F: 'Right',
  0x8011: 'Up',
  0x8012: 'Down',
  0x8013: 'Left',
  0x8014: 'Right',
  0x8015: 'Up',
  0x8016: 'Down',
  0x8017: 'Left',
  0x8018: 'Right'
};

function translateKeycode(e) {
  return keydb[e.keyCode];
}
