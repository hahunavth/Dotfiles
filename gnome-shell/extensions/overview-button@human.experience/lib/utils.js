// ------------------------------------------------------------------------- //
// eslint configuration for this file
//
/* global window */

/* exported Logger */


// ------------------------------------------------------------------------- //
// enforce strict mode
"use strict";


// ------------------------------------------------------------------------- //
var Logger = class Logger {

  // ....................................................................... //
  constructor(moduleName) {
    this.applicationName = "[overview-button]";
    this.moduleName = moduleName;
  }

  // ....................................................................... //
  debug(message) {
    if (window.overviewButton.debug === true) {
      let msg = `[${this.applicationName}] > ${this.moduleName}: ${message}`;
      window.log(msg);
    }
  }

};
