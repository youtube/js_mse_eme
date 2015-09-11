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

(function() {

var INFINITY = 100000;
var CLOSE = 50;
var MAX_FUDGE = INFINITY;
var DIRECTION_WEIGHT = 0.5;

var LEFT = new Pair(-1, 0);
var UP = new Pair(0, -1);
var RIGHT = new Pair(1, 0);
var DOWN = new Pair(0, 1);

function Pair(x, y) {
  this.x = x;
  this.y = y;

  this.add = function(operand) {
    return new Pair(this.x + operand.x, this.y + operand.y);
  };

  this.sub = function(operand) {
    return new Pair(this.x - operand.x, this.y - operand.y);
  };

  this.dot = function(operand) {
    return this.x * operand.x + this.y * operand.y;
  };

  this.dotRelative = function(ref, operand) {
    return this.x * (operand.x - ref.x) + this.y * (operand.y - ref.y);
  };

  this.distTo = function(operand) {
    return Math.sqrt(this.x * operand.x + this.y * operand.y);
  };

  this.distTo2 = function(operand) {
    return this.x * operand.x + this.y * operand.y;
  };

  this.cross = function(operand) {
    return this.x * operand.y - this.y * operand.x;
  };
}

function Rect(left, top, width, height) {
  this.left = left;
  this.top = top;
  this.width = width;
  this.height = height;
  this.right = this.left + this.width;
  this.bottom = this.top + this.height;

  var rangeDist = function(start, end, startRef, endRef) {
    if (start < startRef) {
      if (end < startRef)
        return startRef - end;
      return 0;
    }
    if (start <= endRef)
      return 0;
    return start - endRef;
  };

  this.valid = function() {
    return this.width !== 0 && this.height !== 0;
  };

  this.inside = function(x, y) {
    // Technically speaking, this is not correct. However, this works out for
    // our usage.
    return x >= this.left && x < this.left + this.width &&
        y >= this.top && y < this.top + this.height;
  };

  this.intersect = function(that) {
    return this.inside(that.left, that.top) ||
        this.inside(that.right, that.top) ||
        this.inside(that.left, that.bottom) ||
        this.inside(that.right, that.bottom) ||
        that.inside(this.left, this.top) ||
        that.inside(this.right, this.top) ||
        that.inside(this.left, this.bottom) ||
        that.inside(this.right, this.bottom);
  };

  this.intersectComplete = function(that) {
    var centerXThat = (that.left + that.right) * 0.5;
    var centerYThat = (that.top + that.bottom) * 0.5;
    var halfThatWidth = that.width * 0.5;
    var halfThatHeight = that.height * 0.5;
    var expandedRect = new Rect(
        this.left - halfThatWidth, this.top - halfThatHeight,
        this.width + that.width, this.height + that.height);
    return expandedRect.inside(centerXThat, centerYThat);
  };

  this.distanceSquared = function(ref, dir) {
    var x, y;
    if (dir.x === -1) {
      x = Math.max((ref.left - this.right) * DIRECTION_WEIGHT, 0);
      y = rangeDist(this.top, this.bottom, ref.top, ref.bottom);
    } else if (dir.x === 1) {
      x = Math.max((this.left - ref.right) * DIRECTION_WEIGHT, 0);
      y = rangeDist(this.top, this.bottom, ref.top, ref.bottom);
    } else if (dir.y === -1) {
      x = rangeDist(this.left, this.right, ref.left, ref.right);
      y = Math.max((ref.top - this.bottom) * DIRECTION_WEIGHT, 0);
    } else {
      x = rangeDist(this.left, this.right, ref.left, ref.right);
      y = Math.max((this.top - ref.bottom) * DIRECTION_WEIGHT, 0);
    }

    return x * x + y * y;
  };

  this.generateSideSliver = function(dir) {
    var left, right, top, bottom;

    if (dir === LEFT) {
      left = this.left - CLOSE;
      right = this.left - 1;
      top = (this.top + this.bottom) * 0.5;
      bottom = top;
    } else if (dir === RIGHT) {
      left = this.right + 1;
      right = this.right + CLOSE;
      top = (this.top + this.bottom) * 0.5;
      bottom = top;
    } else if (dir === UP) {
      left = (this.left + this.right) * 0.5;
      right = (this.left + this.right) * 0.5;
      top = this.top - CLOSE;
      bottom = this.top - 1;
    } else {
      left = (this.left + this.right) * 0.5;
      right = (this.left + this.right) * 0.5;
      top = this.bottom + 1;
      bottom = this.bottom + CLOSE;
    }

    return new Rect(left, top, right - left, bottom - top);
  };

  // Generates a rectangle to check if there are any other rectangles strictly
  // to one side (defined by dir) of 'this'.
  this.generateSideRect = function(dir, fudge) {
    if (!fudge) {
      return this.generateSideSliver(dir);
    }

    var left, right, top, bottom;

    if (dir === LEFT) {
      left = -INFINITY;
      right = this.left - 1;
      top = this.top - fudge;
      bottom = this.bottom + fudge;
    } else if (dir === RIGHT) {
      left = this.right + 1;
      right = INFINITY;
      top = this.top - fudge;
      bottom = this.bottom + fudge;
    } else if (dir === UP) {
      left = this.left - fudge;
      right = this.right + fudge;
      top = -INFINITY;
      bottom = this.top - 1;
    } else {
      left = this.left - fudge;
      right = this.right + fudge;
      top = this.bottom + 1;
      bottom = INFINITY;
    }

    return new Rect(left, top, right - left, bottom - top);
  };

  this.toSideOf = function(target, dir) {
    var testX = [0, this.right - this.center.x, this.left - this.center.x];
    var testY = [0, this.bottom - this.center.y, this.top - this.center.y];

    var testLineSegRel0 = new Pair(
        testX[dir.x - (dir.x != 0)], testY[dir.y - (dir.y != 0)]);
    var testLineSegRel1 = new Pair(
        testY[dir.x + (dir.x != 0)], testY[dir.y + (dir.y != 0)]);

    return dir.cross(testLineSegRel0) * dir.cross(testLineSegRel1) <= 0 &&
        this.intersect(target);
  };

  this.toString = function() {
    return '(' + this.left + ', ' + this.top + ', ' + this.right + ', ' +
        this.bottom + ')';
  };
};

function createRect(element) {
  var offsetLeft = element.offsetLeft;
  var offsetTop = element.offsetTop;
  var e = element.offsetParent;
  while (e && e !== document.body) {
    offsetLeft += e.offsetLeft;
    offsetTop += e.offsetTop;
    e = e.offsetParent;
  }
  return new Rect(offsetLeft, offsetTop,
                  element.offsetWidth, element.offsetHeight);
};

function FocusManager() {
  var elements = [];
  var handlers = [];

  var pickElement_ = function(currElem, dir, fudge) {
    var rect = createRect(currElem);
    var rectSide = rect.generateSideRect(dir, fudge);
    var bestDistanceSquared = INFINITY * INFINITY;
    var bestElement = null;

    for (var i = 0; i < elements.length; ++i) {
      if (elements[i] !== currElem) {
        var r = createRect(elements[i]);

        if (r.valid() && r.intersectComplete(rectSide)) {
          var distanceSquared = r.distanceSquared(rect, dir);
          if (!bestElement || distanceSquared < bestDistanceSquared) {
            bestElement = elements[i];
            bestDistanceSquared = distanceSquared;
          }
        }
      }
    }

    return bestElement;
  };

  var pickElement = function(currElem, dir) {
    return pickElement_(currElem, dir) ||
        pickElement_(currElem, dir, 2) ||
        pickElement_(currElem, dir, MAX_FUDGE);
  };

  var onkeydown = function(e) {
    if (elements.indexOf(e.target) !== -1) {
      var dir;
      if (e.keyCode === 37) {  // left
        dir = LEFT;
      } else if (e.keyCode === 38) {  // up
        dir = UP;
      } else if (e.keyCode === 39) {  // right
        dir = RIGHT;
      } else if (e.keyCode === 40) {  // down
        dir = DOWN;
      } else {
        return true;
      }
      var element = pickElement(e.target, dir);
      if (element) {
        element.focus();
        e.stopPropagation();
        e.preventDefault();
      }
    }

    return true;
  };

  this.add = function(element) {
    if (elements.indexOf(element) === -1) {
      elements.push(element);
      handlers.push(element.addEventListener('keydown', onkeydown));
    }
  };
};

window.addEventListener('load', function() {
  var focusManager = new FocusManager;
  var elements = document.getElementsByClassName('focusable');
  for (var i = 0; i < elements.length; ++i)
    focusManager.add(elements[i]);

  var links = document.getElementsByTagName('A');
  for (var i = 0; i < links.length; ++i)
    focusManager.add(links[i]);
});

})();
