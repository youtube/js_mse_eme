/*
Copyright 2014 Google Inc. All rights reserved.

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

var createElement = util.createElement;

function Test(desc, fields) {
  var INDEX = 0;
  var STATUS = INDEX + 1;
  var DESC = STATUS + 1;
  var FIELD = DESC + 1;
  this.index = desc.index;
  this.id = 'test-row' + this.index;
  this.desc = desc;
  this.steps = [];

  this.createElement = function(element) {
    element.id = this.id;
    element.appendChild(createElement('td', null, 'index',
                                      this.index + 1 + '.'));
    element.appendChild(
        createElement('td', null, 'status',
                      '<input type="checkbox" checked="yes"></input> >'));
    element.appendChild(createElement('td', null, 'desc'));

    for (var field = 0; field < fields.length; ++field)
      element.appendChild(createElement('td', null, 'state', 0));

    var link = createElement('a', null, null, desc.desc);
    link.href = 'javascript:;';
    link.onclick = desc.onclick;
    link.title = desc.title;
    element.childNodes[DESC].appendChild(link);
    var explanationPoint = createElement('span', null, 'desc-expl-point', '?');
    var explanation = createElement(
        'span', null, 'desc-expl-popup', desc.title);
    explanationPoint.appendChild(explanation);
    element.childNodes[DESC].appendChild(explanationPoint);
  };

  this.addStep = function(name) {
    var tr = createElement('tr');
    tr.appendChild(createElement('td', null, 'small'));
    tr.appendChild(createElement('td', null, 'small'));
    tr.appendChild(createElement('td', null, 'small',
                                 this.steps.length + 1 + '. ' + name));
    for (var field = 0; field < fields.length; ++field)
      tr.appendChild(createElement('td', null, 'small', 0));

    var element = document.getElementById(this.id);
    if (this.steps.length !== 0)
      element = this.steps[this.steps.length - 1];
    if (element.nextSibling)
      element.parentNode.insertBefore(tr, element.nextSibling);
    else
      element.parentNode.appendChild(tr);
    this.steps.push(tr);
  };

  this.updateStatus = function() {
    var element = document.getElementById(this.id);
    element.childNodes[STATUS].className =
        this.desc.running ? 'status_current' : 'status';
    for (var field = 0; field < fields.length; ++field)
      element.childNodes[FIELD + field].innerHTML =
          this.desc[fields[field].replace(' ', '_')];
  };

  this.selected = function() {
    var element = document.getElementById(this.id);
    return element.childNodes[STATUS].childNodes[0].checked;
  };

  this.select = function() {
    var element = document.getElementById(this.id);
    element.childNodes[STATUS].childNodes[0].checked = true;
  };

  this.deselect = function() {
    var element = document.getElementById(this.id);
    element.childNodes[STATUS].childNodes[0].checked = false;
  };
}

function TestList(fields) {
  var tableId = 'test-list-table';
  var headId = tableId + '-head';
  var bodyId = tableId + '-body';
  var tests = [];

  if (!fields || !fields.length)
    throw 'No test fields';

  this.addColumnHeader = function(class_, text) {
    var head = document.getElementById(headId);
    var th = createElement('th', null, class_, text);
    th.scope = 'col';
    head.appendChild(th);
  };

  this.addTest = function(desc) {
    var test = new Test(desc, fields);
    tests.push(test);
    return test;
  };

  this.generate = function(div) {
    var table = document.createElement('table');
    table.id = tableId;
    div.appendChild(table);

    var thead = createElement('thead');
    table.classList.add('test-table');
    table.innerHTML = '';
    var head = createElement('tr');
    var body = createElement('tbody');

    head.id = headId;
    body.id = bodyId;
    thead.appendChild(head);
    table.appendChild(thead);
    table.appendChild(body);

    this.addColumnHeader('index');
    this.addColumnHeader('status');
    this.addColumnHeader('desc', 'Test');

    for (var i = 0; i < fields.length; ++i)
      this.addColumnHeader('state', util.MakeCapitalName(fields[i]));

    for (var i = 0; i < tests.length; ++i) {
      var tr = createElement('tr');
      body.appendChild(tr);
      tests[i].createElement(tr);
      tests[i].updateStatus();
    }
  };

  this.getTest = function(index) {
    return tests[index];
  };

  this.anySelected = function() {
    for (var i = 0; i < tests.length; ++i)
      if (tests[i].selected())
        return true;
    return false;
  };

  this.selectAll = function() {
    for (var i = 0; i < tests.length; ++i)
      tests[i].select();
  };

  this.deselectAll = function() {
    for (var i = 0; i < tests.length; ++i)
      tests[i].deselect();
  };
};

window.createFullTestList = function(fields) {
  return new TestList(fields);
};

})();
