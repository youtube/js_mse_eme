/*
Copyright 2016 Google Inc. All rights reserved.

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

var ITEM_IN_COLUMN = 23;  // Test item count in a column
var CATEGORY_SPACE = 1;  // Row between the end of the last category and the
                         // beginning of the next category
var MIN_ROW_AT_THE_BOTTOM = 2;  // If at the bottom of the table and the row
                                // count is less than this, start a new column.

var createElement = util.createElement;

function Category(categoryName) {
  this.setElement = function(nameCell, statusCell) {
    nameCell.className = 'cell-category';
    nameCell.innerText = categoryName;
  };

  this.setDoubleElement = function(cellElem) {
    cellElem.className = 'cell-category';
    cellElem.setAttribute('colspan', 2);
    cellElem.innerText = categoryName;
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
    var link = createElement('a', null, null,
                             this.index + 1 + '. ' + this.desc.desc);
    link.href = 'javascript:;';
    link.onclick = desc.onclick;
    link.title = desc.title;
    name.appendChild(link);
    this.updateStatus(status);
  };

  this.updateStatus = function(status) {
    var text = this.desc.status;
    var failureStatus = '';
    if (text && text.length > 5) text = '';
    status = status ? status : document.getElementById(this.statusId);

    if (this.style === 'extra compact') {
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
    } else {
      failureStatus = this.desc.mandatory ? 'cell-status-fail' :
          'cell-status-normal';
      if (this.desc.running) {
        status.innerHTML = '&nbsp;...&nbsp;';
        status.className = 'cell-status-running';
      } else if (this.desc.failures) {
        status.innerHTML = text || '&nbsp;Fail&nbsp;';
        status.className = failureStatus;
      } else if (this.desc.timeouts) {
        status.innerHTML = text || '&nbsp;Fail&nbsp;';
        status.className = failureStatus;
      } else if (this.desc.passes) {
        status.innerHTML = text || '&nbsp;Pass&nbsp;';
        status.className = 'cell-status-pass';
      } else {
        status.innerHTML = ' ';
        status.className = 'cell-status-normal';
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
        rowLeft = ITEM_IN_COLUMN - cells % ITEM_IN_COLUMN;
        if (rowLeft < MIN_ROW_AT_THE_BOTTOM)
          cells += rowLeft;
        if (cells % ITEM_IN_COLUMN !== 0)
          cells += CATEGORY_SPACE;
        cells++;
        lastCategory = tests[i].desc.category;
      } else if (cells % ITEM_IN_COLUMN === 0) {
        cells++;  // category (continued)
      }
      cells++;
    }

    return [Math.min(cells, ITEM_IN_COLUMN),
            Math.floor((cells + ITEM_IN_COLUMN - 1) / ITEM_IN_COLUMN)];
  };

  var createExtraCompactTable = function(div, table) {
    var lastCategory = null;
    var totalCells = 0;
    var totalTests = 0;
    var rowsRemaining = 0;
    var layoutColumnSpan = [];
    var rows = [];
    var j = 0;

    var createEmptyCells = function(row) {
      if (table.childNodes.length <= row) {
        table.appendChild(createElement('tr'));
      }

      var tr = table.childNodes[row];
      var elems = [
        createElement('td', null, 'test-status-none'),
        createElement('td', null, 'cell-name', '&nbsp;')
      ];
      tr.appendChild(elems[0]);
      tr.appendChild(elems[1]);
      return elems;
    };

    var createTestCells = function(testIndex, row, test) {
      var cells = createEmptyCells(row);
      tests[testIndex].createElement(cells[1], cells[0]);
    };

    var createCategoryCell = function(row, categoryName) {
      if (table.childNodes.length <= row) {
        table.appendChild(createElement('tr'));
      }

      var tr = table.childNodes[row];
      var elem = createElement('td', null, 'cell-name', '&nbsp;');
      tr.appendChild(elem);

      (new Category(categoryName)).setDoubleElement(elem);
    };

    for (var i = 0; i < tests.length; ++i) {
      var currCategory = tests[i].desc.category;

      if (lastCategory !== currCategory) {
        rowsRemaining = ITEM_IN_COLUMN - totalCells % ITEM_IN_COLUMN;

        if (rowsRemaining < MIN_ROW_AT_THE_BOTTOM) {
          // Add a row for heading.
          for (j = 0; j < rowsRemaining; ++j) {
            createEmptyCells(totalCells % ITEM_IN_COLUMN);
            totalCells += 1;
          }
        }

        if (totalCells % ITEM_IN_COLUMN !== 0) {
          // Add a row for extra space before heading, if in middle of column.
          for (j = 0; j < CATEGORY_SPACE; ++j) {
            createEmptyCells(totalCells % ITEM_IN_COLUMN);
            totalCells += 1;
          }
        }

        lastCategory = currCategory;
        createCategoryCell(totalCells % ITEM_IN_COLUMN, lastCategory);
        totalCells++;
      } else if (totalCells % ITEM_IN_COLUMN === 0) {
        // category (continued)
        createCategoryCell(totalCells % ITEM_IN_COLUMN, lastCategory);
        totalCells++;
      }

      createTestCells(totalTests, totalCells % ITEM_IN_COLUMN, lastCategory);
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
    var table = createElement('table', null, 'compact-list');
    var tr;
    var dim = getTableDimension();
    var lastCategory = '';
    var row;
    var column;

    if (self.style === 'extra compact') {
      createExtraCompactTable(div, table);
    } else {
      for (row = 0; row < dim[0]; ++row) {
        tr = createElement('tr');
        table.appendChild(tr);
        for (column = 0; column < dim[1]; ++column) {
          tr.appendChild(createElement('td', null, 'cell-name', '&nbsp;'));
          tr.appendChild(createElement('td', null, 'cell-divider'));
          tr.appendChild(createElement('td', null, 'cell-status-normal'));
        }
      }

      div.innerHTML = '';
      div.appendChild(table);

      row = column = 0;

      for (var i = 0; i < tests.length; ++i) {
        if (lastCategory !== tests[i].desc.category) {
          if (ITEM_IN_COLUMN - row <= MIN_ROW_AT_THE_BOTTOM) {
            row = 0;
            column++;
          }

          if (row % ITEM_IN_COLUMN !== 0)
            row += CATEGORY_SPACE;

          lastCategory = tests[i].desc.category;
          (new Category(lastCategory)).setElement(
              table.childNodes[row].childNodes[column * 3],
              table.childNodes[row].childNodes[column * 3 + 2]);
          row++;
        } else if (row === 0) {
          (new Category(lastCategory)).setElement(
              table.childNodes[row].childNodes[column * 3],
              table.childNodes[row].childNodes[column * 3 + 2]);
          row++;
        }

        tests[i].createElement(
            table.childNodes[row].childNodes[column * 3],
            table.childNodes[row].childNodes[column * 3 + 2]);
        row++;

        if (row === ITEM_IN_COLUMN) {
          row = 0;
          column++;
        }
      }
    }
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
