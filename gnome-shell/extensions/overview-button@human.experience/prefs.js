/* ------------------------------------------------------------------------- */
// eslint configuration for this file
//
/* global imports */
/* global window */


/* exported buildPrefsWidget */
/* exported init */


/* ------------------------------------------------------------------------- */
// enforce strict mode
"use strict";


/* ------------------------------------------------------------------------- */
// enable global used for debugging
window.calendarImproved = {
  debug: false,
};


/* ------------------------------------------------------------------------- */
// language libraries
//const Lang = imports.lang;


/* ------------------------------------------------------------------------- */
// system libraries imports
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;


/* ------------------------------------------------------------------------- */
// gnome shell imports
const gsExtensionUtils = imports.misc.extensionUtils;


/* ------------------------------------------------------------------------- */
// gnome shell imports
const Extension = gsExtensionUtils.getCurrentExtension();


/* ------------------------------------------------------------------------- */
// extension imports
const Convenience = Extension.imports.lib.convenience;
const Utils = Extension.imports.lib.utils;

/* ------------------------------------------------------------------------- */
function init() {
}


/* ------------------------------------------------------------------------- */
function buildPrefsWidget() {

  let preferencesContainer;

  // create preferences container
  preferencesContainer = new PreferencesContainer();

  // show preferences container
  preferencesContainer.showAll();

  // return preferences top level widget to be embedded into preferences window
  return preferencesContainer.getTopLevelWidget();
}


/* ------------------------------------------------------------------------- */
class PreferencesContainer {

  /* ....................................................................... */
  constructor() {

    let settingsSchemaId;
    let preferencesGladeFilePath;

    // initialize preferences logger
    this._logger = new Utils.Logger("prefs.js:PreferencesContainer");

    // get extension setting schema id
    settingsSchemaId = Extension.metadata["settings-schema"];

    // get settings object
    this._settings = Convenience.getSettings(settingsSchemaId);

    // compose preferences.glade path
    preferencesGladeFilePath = GLib.build_filenamev([
      Extension.dir.get_path(),
      "ui",
      "preferences.glade",
    ]);

    // create builder from preferences glade file
    this._builder = Gtk.Builder.new_from_file(preferencesGladeFilePath);

    // get top level widget
    this._topLevelWidget = this._builder.get_object("preferences_viewport");

    // bind settings
    this._bindSettings();

  }

  /* ....................................................................... */
  showAll() {
    // show top level widget and it's children except those that have
    // show_all set to false
    this._topLevelWidget.show_all();
  }

  /* ....................................................................... */
  getTopLevelWidget() {
    // return top level widget
    return this._topLevelWidget;
  }

  /* ....................................................................... */
  _bindSettings() {
    this._bindButtonTabSettings();
  }

  /* ....................................................................... */
  _bindButtonTabSettings() {

    // bind enable settings to sensitive property of boxes containing dependent
    // GUI elements
    this._bindSettingsToComboBoxTextChangeViaEntryBuffer([
      [
        "button-type",
        "button_type_comboboxtext",
        "button_type_comboboxtext_entrybuffer",
      ],
    ]);

    // bind setting to a Scale via adjustment workarounds
    this._bindSettingsToScaleViaAdjustment([
      [
        "button-width",
        "button_width_scale"
      ],
    ]);
    // decorate button width scale
    this._decorateButtonWidthScale();

    // bind reset settings buttons
    this._bindToolButtonClickToSettingReset([
      [
        "button_type_reset_button",
        "button-type"
      ],
      [
        "button_width_reset_button",
        "button-width"
      ]
    ]);

  }

  /* ....................................................................... */
  _decorateButtonWidthScale() {
    let button_width_scale = this._builder.get_object("button_width_scale");

    let marker_label;
    for (let marker_value of [ 96, 64, 48, 32, 24, 16, -1 ]) {
      if (marker_value == -1) {
        marker_label = "Auto";
      }
      else {
        marker_label = marker_value.toString();
      }
      button_width_scale.add_mark(
        marker_value,
        Gtk.PositionType.TOP,
        marker_label
      );
    }

    button_width_scale.connect(
      "format_value",
      (_, value) => {
        if (value === -1 ) {
          return "auto";
        }
        else {
          return value.toString();
        }
      }
    );


  }

  /* ....................................................................... */
  _bindSettingsToGuiElement(
    settingsToElements,
    propertyName,
    bindFlags=Gio.SettingsBindFlags.DEFAULT) {

    // go over each setting id and element Id set and bind the two
    for (let [settingId, elementId] of settingsToElements) {
      this._settings.bind(
        settingId,
        this._builder.get_object(elementId),
        propertyName,
        bindFlags
      );
    }
  }

  /* ....................................................................... */
  _bindSettingsToComboBoxTextChangeViaEntryBuffer(settingsToElements) {

    // go over each setting id and element Id set and bind the two
    for (let [settingId, elementId, entryBufferElementId]
      of settingsToElements) {

      // create binding between setting and entry buffer component
      this._settings.bind(
        settingId,
        this._builder.get_object(entryBufferElementId),
        "text",
        Gio.SettingsBindFlags.DEFAULT
      );

      // bind EntryBuffer of updating text property to update ComboBoxText
      this._builder.get_object(entryBufferElementId).connect(
        "notify::text",
        this._entryBufferToComboBoxTextHandlerFactory(elementId, settingId)
      );

      // connect element to settings
      this._builder.get_object(elementId).connect(
        "changed",
        (widget) => {
          this._settings.set_enum(
            settingId,
            widget.get_active()
          );
        }
      );

      // set ui element to existing setting
      this._builder.get_object(elementId).set_active(
        this._settings.get_enum(settingId)
      );

    }
  }

  /* ....................................................................... */
  _entryBufferToComboBoxTextHandlerFactory(comboBoxTextId, settingId) {

    let eventHandlerFunc;

    // create  handler function to handle EntryBuffer element updates
    eventHandlerFunc = function _comboBoxTextToEntryBufferHandler()
    {
      this._builder.get_object(comboBoxTextId).set_active(
        this._settings.get_enum(settingId)
      );

    };

    // return "this" bound event handler
    return eventHandlerFunc.bind(this);

  }

  /* ....................................................................... */
  _bindSettingsToScaleViaAdjustment(settingsToElements) {
    for (let [settingId, scaleId] of settingsToElements) {
      this._createScaleBindings(settingId, scaleId);
    }
  }

  /* ....................................................................... */
  _createScaleBindings(settingId, scaleId) {
    // create binding between setting and Adjustment attached to Scale
    // since can not bind to Scale itself
    this._settings.bind(
      settingId,
      this._builder.get_object(scaleId).get_adjustment(),
      "value",
      Gio.SettingsBindFlags.DEFAULT
    );
  }

  /* ....................................................................... */
  _bindToolButtonClickToSettingReset(elementsToSettings) {

    // go over each element id and setting id set and bind the tw
    for (let [elementId, settingId] of elementsToSettings) {
      this._builder.get_object(elementId).connect(
        "clicked",
        () => {
          this._settings.reset(settingId);
        }
      );
    }
  }


}
