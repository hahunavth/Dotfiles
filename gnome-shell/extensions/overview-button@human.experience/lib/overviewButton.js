/* ------------------------------------------------------------------------- */
// eslint configuration for this file
//
/* global imports */
/* global global */

/* exported OverviewButton */


/* ------------------------------------------------------------------------- */
// enforce strict mode
"use strict";


/* ------------------------------------------------------------------------- */
// system libraries imports
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
var Meta = imports.gi.Meta;
const St = imports.gi.St;

/* ------------------------------------------------------------------------- */
// gnome shell imports
const gsMain = imports.ui.main;
const gsExtensionUtils = imports.misc.extensionUtils;


/* ------------------------------------------------------------------------- */
// extension imports
const Extension = gsExtensionUtils.getCurrentExtension();
const Constants = Extension.imports.lib.constants;
const Convenience = Extension.imports.lib.convenience;
const Utils = Extension.imports.lib.utils;


/* ------------------------------------------------------------------------- */
var OverviewButton = class OverviewButton {

  constructor() {
    let settingsSchemaName;

    // logger
    this._logger = new Utils.Logger(
      "overviewButton.js::OverviewButton"
    );

    // get settings
    settingsSchemaName = Extension.metadata["settings-schema"];
    this._settings = Convenience.getSettings(settingsSchemaName);
    this._wmSettings = Convenience.getSettings(
      "org.gnome.desktop.wm.preferences"
    );

    // init icon
    this._icon = null;

    // get activities parent
    this._activities = gsMain.panel.statusArea.activities;

    // activities actor (gnome version dependent)
    let gnomeVersion = imports.misc.config.PACKAGE_VERSION.split(".");
    if (gnomeVersion[0] >= 3 && gnomeVersion[1] >= 34) {
      this._activitiesActor = this._activities;
    }
    else {
      this._activitiesActor = gsMain.panel.statusArea.activities.actor;
    }

    // init workspace label
    this._workspaceLabel = null;
    // workspace manager was introduced in 3.30, before it it was global.screen
    if (global.workspace_manager !== undefined) {
      this._workspaceManager = global.workspace_manager;
    }
    else {
      this._workspaceManager = global.screen;
    }
    // init signal id for workspace switch
    this._workspaceSwitchedId = null;
    // init signal id for workspace name
    this._workspaceNamesChangeId = null;

    // bind button type settings change
    this._buttonTypeChangedId = this._settings.connect(
      "changed::button-type",
      this._changeButtonType.bind(this)
    );

    // bind button type settings change
    this._buttonWidthChangedId = this._settings.connect(
      "changed::button-width",
      this._setButtonWidth.bind(this)
    );

  }

  /* ....................................................................... */
  enable() {
    let currentButtonType = this._getButtonType();
    if (this._activities != null) {
      if (currentButtonType === Constants.BUTTON_TYPE.ICON) {
        this._enableShowingIcon();
      }
      else if (currentButtonType === Constants.BUTTON_TYPE.WORKSPACE_NAME) {
        this._enableShowingWorkspaceName();
      }
    }
  }

  /* ....................................................................... */
  disable() {
    let currentButtonType = this._getButtonType();
    if (this._activities != null) {
      if (currentButtonType === Constants.BUTTON_TYPE.ICON) {
        this._disableShowingIcon();
      }
      else if (currentButtonType === Constants.BUTTON_TYPE.WORKSPACE_NAME) {
        this._disableShowingWorkspaceName();
      }
    }

    this._settings.disconnect(this._buttonTypeChangedId);
    this._settings.disconnect(this._buttonWidthChangedId);
  }

  /* ....................................................................... */
  _changeButtonType() {
    let currentButtonType = this._getButtonType();
    this._disableShowingIcon();
    this._disableShowingWorkspaceName();
    if (currentButtonType === Constants.BUTTON_TYPE.ICON) {
      this._enableShowingIcon();
    }
    else if (currentButtonType === Constants.BUTTON_TYPE.WORKSPACE_NAME) {
      this._enableShowingWorkspaceName();
    }
  }

  /* ....................................................................... */
  _setButtonWidth() {
    let currentButtonType = this._getButtonType();
    let buttonWidth = this._settings.get_int("button-width");

    if (buttonWidth === 0) {
      buttonWidth = -1;
    }

    if (currentButtonType === Constants.BUTTON_TYPE.ICON) {
      this._icon.set_width(buttonWidth);
    }
    else if (currentButtonType === Constants.BUTTON_TYPE.WORKSPACE_NAME) {
      this._workspaceLabel.set_width(buttonWidth);
    }
  }

  /* ....................................................................... */
  _getButtonType() {
    return this._settings.get_enum("button-type");
  }

  /* ....................................................................... */
  _enableShowingWorkspaceName() {

    // create label
    this._workspaceLabel = new St.Label(
      {
        text: "",
        y_align: Clutter.ActorAlign.CENTER,
        style: "text-align: center;"
      }
    );
    // set button width
    this._setButtonWidth();

    this._workspaceSwitchedId = this._workspaceManager.connect_after(
      "workspace-switched",
      this._setWorkspaceLabelText.bind(this)
    );

    this._workspaceNamesChangeId = this._wmSettings.connect(
      "changed::workspace-names",
      this._setWorkspaceLabelText.bind(this)
    );

    // remove "activities" label child
    this._activitiesActor.remove_child(this._activities._label);

    // add label child
    this._activitiesActor.add_actor(this._workspaceLabel);

    // set current workspace name
    this._setWorkspaceLabelText();

    this._currentButtonType = Constants.BUTTON_TYPE.WORKSPACE_NAME;
  }

  /* ....................................................................... */
  _setWorkspaceLabelText() {
    // get workspace index
    let workspaceIndex = this._workspaceManager.get_active_workspace_index();

    // get workspace name
    let workspaceName = Meta.prefs_get_workspace_name(workspaceIndex);

    // set workspace label text to workspace name
    this._workspaceLabel.text = workspaceName;

  }

  /* ....................................................................... */
  _disableShowingWorkspaceName() {

    // remove label child
    if (this._workspaceLabel !== null) {
      this._activitiesActor.remove_actor(this._workspaceLabel);

      // remove signal
      if (this._workspaceSwitchedId !== null ) {
        this._workspaceManager.disconnect(this._workspaceSwitchedId);
        this._workspaceSwitchedId = null;
      }

      if (this._workspaceNamesChangeId !== null) {
        this._wmSettings.disconnect(this._workspaceNamesChangeId);
        this._workspaceNamesChangeId = null;
      }

      // destroy label
      this._workspaceLabel.destroy();
      this._workspaceLabel = null;

      // add "activities" label child
      this._activitiesActor.add_child(this._activities._label);

    }
  }

  /* ....................................................................... */
  _enableShowingIcon() {

    // compose icon file path
    let iconPath = GLib.build_filenamev([
      Extension.dir.get_path(),
      "icons",
      "overview-button.svg",
    ]);

    // create new gicon
    let gicon = Gio.icon_new_for_string(iconPath);

    // create overview button St.Icon
    this._icon = new St.Icon({
      gicon: gicon,
      style_class: "system-status-icon",
      style: "text-align: center;"
    });
    // set button width
    this._setButtonWidth();

    // remove label child
    this._activitiesActor.remove_child(this._activities._label);

    // add icon child
    this._activitiesActor.add_actor(this._icon);

    this._currentButtonType = Constants.BUTTON_TYPE.ICON;
  }

  /* ....................................................................... */
  _disableShowingIcon() {
    // remove icon child
    if (this._icon !== null) {
      this._activitiesActor.remove_actor(this._icon);
      // destroy icon
      this._icon = null;

      // add "activities" label child
      this._activitiesActor.add_child(this._activities._label);
    }

  }


};
