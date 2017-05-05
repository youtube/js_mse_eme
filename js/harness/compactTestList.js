/*
Copyright 2017 Google Inc. All rights reserved.

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

var ITEMS_IN_COLUMN = 23;  // Test item count in a column
var CATEGORY_SPACE = 1;  // Row between the end of the last category and the
                         // beginning of the next category
var MIN_ROW_AT_THE_BOTTOM = 2;  // If at the bottom of the table and the row
                                // count is less than this, start a new column.

var createElement = util.createElement;

function Category(categoryName) {
  this.setElement = function(nameCell, statusCell) {
    nameCell.className = 'cell-category';
    nameCell.innerHTML = categoryName;
  };

  this.setDoubleElement = function(cellElem) {
    cellElem.className = 'cell-category';
    cellElem.innerHTML = categoryName;
  };
}

function Test(desc, style) {
  var self = this;
  this.index = desc.index;
  this.nameId = 'test-item-name-' + this.index;
  this.statusId = 'test-item-status-' + this.index;
  this.desc = desc;
  this.steps = [];
  this.style = style;

  this.createElement = function(name, status) {
    name.id = this.nameId;
    status.id = this.statusId;
    var link = createElement('span', null, null,
                             this.index + 1 + '. ' + this.desc.desc);
    link.classList.add('focusable');
    link.setAttribute('tabindex', '0');
    link.exec = desc.onclick;
    link.onclick = desc.onclick;
    link.title = desc.title;
    name.appendChild(link);
    this.updateStatus(status);
  };

  this.updateStatus = function(status) {
    var text = this.desc.status;
    var failureStatus = '';
    status = status ? status : document.getElementById(this.statusId);

    if (this.style === 'expanded-test-status') {
      failureStatus = this.desc.mandatory ? 'test-status-fail' :
          'test-status-normal';
      if (this.desc.running) {
        status.innerHTML = text || '...';
        status.className = 'test-status-running';
      } else if (this.desc.failures) {
        status.innerHTML = text || 'Fail';
        status.className = failureStatus;
      } else if (this.desc.timeouts) {
        status.innerHTML = text || 'Fail';
        status.className = failureStatus;
      } else if (this.desc.passes) {
        status.innerHTML = text || 'Pass';
        status.className = 'test-status-pass';
      } else {
        status.innerHTML = ' ';
        status.className = 'test-status-normal';
      }
   } else {
      failureStatus = this.desc.mandatory ? 'test-status-fail' :
          'test-status-optional-fail';
      if (this.desc.running) {
        status.className = 'test-status-running';
      } else if (this.desc.failures) {
        status.className = failureStatus;
      } else if (this.desc.timeouts) {
        status.className = failureStatus;
      } else if (this.desc.passes) {
        status.className = 'test-status-pass';
      } else {
        status.className = 'test-status-none';
      }
    }
  };

  this.selected = function() {
    return true;
  };

  this.getElement = function() {
    return document.getElementById(this.nameId).childNodes[0];
  };
}

function TestList(style) {
  var self = this;
  var tests = [];

  var SINGLE_WIDTH_CELL = 1;
  var DOUBLE_WIDTH_CELL = 2;

  this.style = style || '';

  // returns array [row, column]
  var getTableDimension = function() {
    var lastCategory = '';
    var cells = 0;
    var rowLeft;

    for (var i = 0; i < tests.length; ++i) {
      if (lastCategory !== tests[i].desc.category) {
        rowLeft = ITEMS_IN_COLUMN - cells % ITEMS_IN_COLUMN;
        if (rowLeft < MIN_ROW_AT_THE_BOTTOM)
          cells += rowLeft;
        if (cells % ITEMS_IN_COLUMN !== 0)
          cells += CATEGORY_SPACE;
        cells++;
        lastCategory = tests[i].desc.category;
      } else if (cells % ITEMS_IN_COLUMN === 0) {
        cells++;  // category (continued)
      }
      cells++;
    }

    return [Math.min(cells, ITEMS_IN_COLUMN),
            Math.floor((cells + ITEMS_IN_COLUMN - 1) / ITEMS_IN_COLUMN)];
  };

  var createDefaultTestLayout = function(div, layoutStyle) {
    var table = createElement('div', null, layoutStyle);
    var lastCategory = null;
    var totalCells = 0;
    var totalTests = 0;
    var rowsRemaining = 0;
    var currentColumn = null;
    var j = 0;

    var createEmptyCells = function() {
      if (currentColumn.childNodes.length >= ITEMS_IN_COLUMN) {
        currentColumn = createElement('div', null, 'cell-column');
        table.appendChild(currentColumn);
      }
      var tr = createElement('div');
      currentColumn.appendChild(tr);

      var elems = [
        createElement('div', null, 'test-status-none', '&nbsp;'),
        createElement('div', null, 'cell-name', '&nbsp;')
      ];
      tr.appendChild(elems[0]);
      tr.appendChild(elems[1]);
      return elems;
    };

    var createTestCells = function(testIndex, test) {
      var cells = createEmptyCells();
      tests[testIndex].createElement(cells[1], cells[0]);
    };

    var createCategoryCell = function(categoryName) {
      if (currentColumn.childNodes.length >= ITEMS_IN_COLUMN) {
        currentColumn = createElement('div', null, 'cell-column');
        table.appendChild(currentColumn);
      }
      var tr = createElement('div');
      currentColumn.appendChild(tr);

      var elem = createElement('span', null, 'cell-name');
      tr.appendChild(elem);

      (new Category(categoryName)).setDoubleElement(elem);
    };

    currentColumn = createElement('div', null, 'cell-column');
    table.appendChild(currentColumn);
    for (var i = 0; i < tests.length; ++i) {
      var currCategory = tests[i].desc.category;

      if (lastCategory !== currCategory) {
        rowsRemaining = ITEMS_IN_COLUMN - totalCells % ITEMS_IN_COLUMN;

        if (rowsRemaining < MIN_ROW_AT_THE_BOTTOM) {
          // Add a row for heading.
          for (j = 0; j < rowsRemaining; ++j) {
            createEmptyCells(totalCells % ITEMS_IN_COLUMN);
            totalCells += 1;
          }
        }

        if (totalCells % ITEMS_IN_COLUMN !== 0) {
          // Add a row for extra space before heading, if in middle of column.
          for (j = 0; j < CATEGORY_SPACE; ++j) {
            createEmptyCells();
            totalCells += 1;
          }
        }

        lastCategory = currCategory;
        createCategoryCell(lastCategory);
        totalCells++;
      } else if (totalCells % ITEMS_IN_COLUMN === 0) {
        // category (continued)
        createCategoryCell(lastCategory);
        totalCells++;
      }

      createTestCells(totalTests, lastCategory);
      totalCells++;
      totalTests++;
    }
    div.innerHTML = '';
    div.appendChild(table);
  };

  this.addTest = function(desc) {
    var test = new Test(desc, this.style);
    tests.push(test);
    return test;
  };

  this.generate = function(div) {
    var layoutStyle;
    if (self.style === 'expanded-test-status') {
      layoutStyle = 'expanded-test-status-list';
    } else {
      layoutStyle = 'default-list';
    }
    createDefaultTestLayout(div, layoutStyle);
  };

  this.getTest = function(index) {
    return tests[index];
  };

  this.anySelected = function() {
    return tests.length !== 0;
  };
};

window.createCompactTestList = function(style) {
  return new TestList(style);
};

})();
