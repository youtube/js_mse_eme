/**
 * @fileoverview Typings to be used by YTS web test modules to interact with YTS
 * framework.
 */

declare namespace yts {
  /**
   * Registers a function as a YTS script that can be called remotely. Such
   * script will run in browser (Cobalt) on a Living Room device but it can be
   * called remotely from YTS CLI. This mechanism is used by YTS tests that have
   * logic on both sides (on the host and on the device).
   */
  function script(name: string, func: Function): void;
}
