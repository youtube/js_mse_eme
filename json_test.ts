import 'jasmine';

import * as fs from 'fs';
import * as path from 'path';
const fg = require('fast-glob');

declare interface TestFileJson {
  test_case: TestCaseJson[];
}

declare interface TestCaseJson {
  test_case_id: string;
  test_case: {
    test_category?: string,
    test_title?: string,
    test_suite?: string,
    status?: 1|2|3,
    certification_program?: string[],
    effective_start_year?: number,
    effective_end_year?: number,
    is_manual?: boolean,
  };
}

function loadTestSuite(testType: string) {
  const g = global as any;
  let testName = testType.substr(0, testType.indexOf('-'));
  if (testName === 'playbackperf') {
    const subgroup = testType.substring(
        testType.indexOf('-') + 1, testType.lastIndexOf('-'));
    return g['PlaybackperfTest'](subgroup);
  } else {
    testName = `${g.util.MakeCapitalName(testName)}Test`;
    return g[testName]();
  }
}

function loadJavaScript(): TestCaseJson[] {
  const g = global as any;
  g.window = g;
  g.HTMLMediaElement = {};
  g.HTMLMediaElement.prototype = {};
  g.document = {};
  g.document.createElement = () => ({});
  g.document.createEvent = () => ({});
  g.document.createTextNode = () => ({});
  g.document.getElementById = () => {};
  g.document.documentElement = {};
  g.document.body = {};
  g.document.getElementsByTagName = () => (['a']);
  g.log = () => {};
  g.MediaSource = {};
  g.MediaSource.prototype = {};
  g.MediaSource.prototype.version = '';
  g.MediaSource.isTypeSupported = () => {};
  g.harnessConfig = {};
  g.window.location = {};
  g.navigator = {};
  g.navigator.userAgent = 'cobalt';

  const YTS_JS_BUNDLE = 'third_party/javascript/yts/yts_core_bin-bundle.js';
  require(path.join(process.cwd(), YTS_JS_BUNDLE));

  const result: TestCaseJson[] = [];
  for (const testSuiteId of g.testSuiteVersions[g.testVersion].testSuites) {
    const testSuiteName = g.testSuiteDescriptions[testSuiteId].name;
    if (testSuiteId === 'manual-test') continue;
    const testSuite = loadTestSuite(testSuiteId);
    for (const test of testSuite.tests) {
      const t = test.prototype;
      result.push({
        test_case_id: t.id,
        test_case: {
          test_suite: testSuiteName,
          test_category: t.category,
          test_title: t.name,
        }
      });
    }
  }
  return result;
}

describe('json', () => {
  it('validation', async () => {
    //
    // Load tests from JavaScript files.
    //
    const jsTests = loadJavaScript();
    const jsTestsById = new Map<string, TestCaseJson>();
    for (const test of jsTests) {
      const id = test.test_case_id;
      if (jsTestsById.has(id)) {
        fail(`Duplicate test ID "${id}" found in JavaScript code.`);
      }
      jsTestsById.set(id, test);
    }

    //
    // Load tests from JSON files.
    //
    const jsonFiles = await fg([
      'third_party/javascript/yts/functional/**/*.json',
      'third_party/javascript/yts/media/**/*.json',
      'third_party/javascript/yts/test_json/**/*.json',
    ]);
    const jsonTestsById = new Map<string, TestCaseJson>();
    const fullNames = new Set<string>();
    for (const jsonFile of jsonFiles) {
      const s = fs.readFileSync(jsonFile, {encoding: 'utf8'});
      const json = JSON.parse(s) as TestFileJson;
      for (const test of json.test_case) {
        const id = test.test_case_id;
        if (jsonTestsById.has(id)) {
          fail(`Duplicate test ID "${id}" found in JSON files.`);
        }
        jsonTestsById.set(id, test);

        if (!test.test_case.is_manual) {
          const fullName = [
            test.test_case.test_suite,
            test.test_case.test_category,
            test.test_case.test_title,
          ].join(' ');
          const fullNameLower = fullName.toLowerCase();
          if (fullNames.has(fullNameLower)) {
            fail(`Duplicate full name "${fullName}" found in JSON files.`);
          }
          fullNames.add(fullNameLower);
        }
      }
    }

    //
    // Compare JavaScript and JSON
    //
    for (const jsTest of jsTestsById.values()) {
      const id = jsTest.test_case_id;
      const jsonTest = jsonTestsById.get(id);
      if (!jsonTest) {
        fail(`Test "${id} ${
            jsTest.test_case.test_title}" was not found in JSON files.`);
      } else {
        const compare = (prop: 'test_suite'|'test_category'|'test_title') => {
          const fromJs = jsTest.test_case[prop];
          const fromJson = jsonTest.test_case[prop];
          if (fromJs?.toLowerCase() !== fromJson?.toLowerCase()) {
            fail(`Property "${prop}" of test "${id}" in JSON (${
                fromJson}) didn't match its JavaScript counterpart (${
                fromJs})`);
          }
        };

        compare('test_suite');
        compare('test_category');
        compare('test_title');
      }
    }

    expect(true).toBe(true);  // suppress 'no expectations' warning
  });
});
