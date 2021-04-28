
declare const testVersion: string;
declare const testSuiteDescriptions: {[testType: string]: {name: string;}};
declare const testSuiteVersions:
    {[testVersion: string]: {testSuites: string[]}};
declare function setupMsePortability(): void;

declare namespace util {
  function MakeCapitalName(name: string): string;
  function isCobalt(): boolean;
  function supportHdr(): boolean;
  function supportWebSpeech(): boolean;
}

declare class TestExecutor {
  constructor(testSuite: unknown, testsMask?: string, testSuiteVer?: string);
  testView: unknown;
  startTest(startIndex: number, numOfTestToRun: number): void;
  testList: Array<{prototype: yts.TestDescription}>;
  startNextTest(): void;
  teardownCurrentTest(isTimeout: boolean, errorMsg?: string): void;
  error(msg: unknown, isTimeout: boolean): void;
}

declare namespace yts {
  interface TestDescription {
    id: string;
    name: string;
    category: string;
    timeout: number;
    mandatory: boolean;
  }
}
