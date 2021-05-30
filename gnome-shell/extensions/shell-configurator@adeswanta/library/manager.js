/**
 * SCManager
 * 
 * @Description      Components manager for Shell Configurator Settings
 * @Filename         manager.js
 * @License          GNU General Public License v3.0
 */

var SCManager = class {
    constructor(currentPath, shellLibraries, SCMisc, shellVersion, shellSettings, extensionSettings) {
        this._currentPath = currentPath;

        // Declerate Shell libraries
        this._Main = shellLibraries['Main'] || null;
        this._OverviewControls = shellLibraries['OverviewControls'] || null;
        this._WorkspaceThumbnail = shellLibraries['WorkspaceThumbnail'] || null;


        // Declerate SC Libraries
        this._SCMisc = SCMisc;

        // Declare GNOME Shell Version
        this._shellVersion = shellVersion;

        // Define settings
        this._shellSettings = shellSettings;
        this._extensionSettings = extensionSettings;
    }

    // importComponents: imports required library and components
    importComponents(components) {
        this._panel = new components.Panel(this._Main, this._SCMisc, this._shellVersion);
        this._dash = new components.Dash(this._Main, this._SCMisc, this._shellVersion);
        this._overview = new components.Overview(this._Main, this._OverviewControls, this._WorkspaceThumbnail, this._SCMisc, this._shellVersion);
        this._appgrid = new components.AppGrid(this._Main, this._SCMisc, this._shellVersion);
    }

    // backupDefault: Saves the current shell properties before the extension is enabled/running
    backupDefault() {
        this._panel.backup();
        this._dash.backup();
        this._overview.backup();
        this._appgrid.backup();
    }

    // restoreDefault: Set to previous shell properties when extension is disabled
    restoreDefault() {
        this._panel.restore();
        this._dash.restore();
        this._overview.restore();
        this._appgrid.restore();
    }

    // applyChanges: Sets all shell properties from shell settings
    applyChanges() {
        // Panel
        this._panel.visbility(this._extensionSettings.get_boolean('panel-visibility'));
        this._panel.height(this._extensionSettings.get_int('panel-height'));
        this._panel.position(this._extensionSettings.get_enum('panel-position'));
        // Dash
        this._dash.visbility(this._extensionSettings.get_boolean('dash-visibility'));
        // Overview
        this._overview.workspaceSwitcherVisibility(this._extensionSettings.get_boolean('overview-workspace-switcher-visibility'));
        if (this._shellVersion >= 40) {
            this._overview.workspaceSwitcherScaleSize(this._extensionSettings.get_int('overview-workspace-switcher-scale-size'), false);
        } else {
            this._overview.workspaceSwitcherPeekWidth(this._extensionSettings.get_int('overview-workspace-switcher-peek-width'));
        }
        this._overview.searchEntryVisibility(this._extensionSettings.get_boolean('overview-search-entry-visibility'));
        this._appgrid.rows(this._extensionSettings.get_int('appgrid-rows'));
        this._appgrid.columns(this._extensionSettings.get_int('appgrid-columns'));
    }

    // connectSignals: Connects all extension settings signals when user change the settings
    connectSignals() {
        this._signals = [
            // Panel
            [
                this._extensionSettings.connect('changed::panel-visibility', () => {
                    this._panel.visbility(this._extensionSettings.get_boolean('panel-visibility'));
                }),

                this._extensionSettings.connect('changed::panel-height', () => {
                    this._panel.height(this._extensionSettings.get_int('panel-height'), false);
                }),

                this._extensionSettings.connect('changed::panel-position', () => {
                    this._panel.position(this._extensionSettings.get_enum('panel-position'));
                })
            ],
            // Dash
            [
                this._extensionSettings.connect('changed::dash-visibility', () => {
                    this._dash.visbility(this._extensionSettings.get_boolean('dash-visibility'));
                })
            ],
            // Overview
            [
                this._extensionSettings.connect('changed::overview-workspace-switcher-visibility', () => {
                    this._overview.workspaceSwitcherVisibility(this._extensionSettings.get_boolean('overview-workspace-switcher-visibility'), (this._shellVersion >= 40) ? this._extensionSettings.get_int('overview-workspace-switcher-scale-size') : this._extensionSettings.get_int('overview-workspace-switcher-peek-width'));
                }),
                this._extensionSettings.connect('changed::overview-workspace-switcher-peek-width', () => {
                    if (this._shellVersion <= 3.38 && this._SCMisc.isExtensionEnabled(this._currentPath, this._shellSettings) && this._extensionSettings.get_boolean('overview-workspace-switcher-visibility'))
                        this._overview.workspaceSwitcherPeekWidth(this._extensionSettings.get_int('overview-workspace-switcher-peek-width'));
                }),
                this._extensionSettings.connect('changed::overview-workspace-switcher-scale-size', () => {
                    if (this._shellVersion >= 40 && this._SCMisc.isExtensionEnabled(this._currentPath, this._shellSettings) && this._extensionSettings.get_boolean('overview-workspace-switcher-visibility'))
                        this._overview.workspaceSwitcherScaleSize(this._extensionSettings.get_int('overview-workspace-switcher-scale-size'));
                }),
                this._extensionSettings.connect('changed::overview-search-entry-visibility', () => {
                    this._overview.searchEntryVisibility(this._extensionSettings.get_boolean('overview-search-entry-visibility'));
                })
            ],
            // App Grid
            [
                this._extensionSettings.connect('changed::appgrid-rows', () => {
                    this._appgrid.rows(this._extensionSettings.get_int('appgrid-rows'));
                }),
                this._extensionSettings.connect('changed::appgrid-columns', () => {
                    this._appgrid.columns(this._extensionSettings.get_int('appgrid-columns'));
                })
            ]
        ];
    }

    // disconnectSignals: Disconnect all extension settings signals that prevent from user changes the settings
    disconnectSignals() {
        for (let category of this._signals) {
            for (let signal of category) {
                this._extensionSettings.disconnect(signal);
            }
        }
    }

    // connectCallbacks: Connects all extension callbacks when other shell settings changed
    connectCallbacks() {
        this._callbacks = [
            this._Main.layoutManager.connect("monitors-changed", () => {
                this._extensionSettings.set_int('panel-height', (this._shellVersion >= 3.36) ? this._Main.panel.height : this._Main.panel.actor.height);
                this._panel.position(this._extensionSettings.get_enum('panel-position'));
            }),
            this._Main.layoutManager.panelBox.connect("notify::height", () => {
                this._extensionSettings.set_int('panel-height', (this._shellVersion >= 3.36) ? this._Main.panel.height : this._Main.panel.actor.height);
                this._panel.position(this._extensionSettings.get_enum('panel-position'));
            })
        ]
    }

    // disconnectCallbacks: Disconnect all extension callbacks that prevent from shell changes the properties
    disconnectCallbacks() {
        this._Main.layoutManager.disconnect(this._callbacks[0]);
        this._Main.layoutManager.panelBox.disconnect(this._callbacks[1]);
    }
}