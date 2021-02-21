/* ------------------------------------------------------------------------- */
// eslint configuration for this file
//
/* global imports */
/* global window */


/* exported init */
/* exported disable */
/* exported enable */


/* ------------------------------------------------------------------------- */
// enforce strict mode
"use strict";


/* ------------------------------------------------------------------------- */
// enable global used for debugging
window.overviewButton = {
  debug: false,
};


/* ------------------------------------------------------------------------- */
// gnome shell imports
const ExtensionUtils = imports.misc.extensionUtils;


/* ------------------------------------------------------------------------- */
// extension imports
const Extension = ExtensionUtils.getCurrentExtension();
const OverviewButton = Extension.imports.lib.overviewButton;


/* ------------------------------------------------------------------------- */
// extension globals
var overviewButtonInstance;


/* ------------------------------------------------------------------------- */
function init() {
  overviewButtonInstance = null;
}


/* ------------------------------------------------------------------------- */
function enable() {
  overviewButtonInstance = new OverviewButton.OverviewButton();
  overviewButtonInstance.enable();
}


/* ------------------------------------------------------------------------- */
function disable() {
  overviewButtonInstance.disable();
  overviewButtonInstance = null;
}
