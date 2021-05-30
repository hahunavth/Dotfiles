/**
 * SCPrefs
 * 
 * @Description      The preferences library for Shell Configurator settings
 * @Filename         preferences.js
 * @License          GNU General Public License v3.0
 */

// Imporrt Gtk, GLib libraries from gi
const { Gtk, GLib } = imports.gi;

var SCPrefs = class {
    constructor(currentPath, SCKeys, extensionSettings, shellVersion) {
        this._currentPath = currentPath;
        this._SCKeys = SCKeys;
        this._extensionSettings = extensionSettings;
        this._shellVersion = shellVersion;

        this._builder = new Gtk.Builder();
        this._releaseTypeLabel = "";
        this._categories = ['panel', 'dash', 'overview', 'appgrid'];
    }

    // _isDevelopment: Check if this extension is in development
    _isDevelopment() {
        if (this._currentPath.metadata['release-state'] === 'development') {
            this._releaseTypeLabel = " - Development Release.";
            return true;
        }
        return false;
    }

    // _addKeys: Add the settings key that are save to keys object from keys.js
    _addKeys() {
        for (let category of this._categories) {
            switch (category) {
                case 'panel':
                    this._SCKeys.addKey(category, 'visibility', 'boolean', true);
                    this._SCKeys.addKey(category, 'height', 'int', true);
                    this._SCKeys.addKey(category, 'position', 'enum', true);
                    break;

                case 'dash':
                    this._SCKeys.addKey(category, 'visibility', 'boolean', true);
                    break;

                case 'overview':
                    this._SCKeys.addKey(category, 'workspace-switcher-visibility', 'boolean', true);
                    this._SCKeys.addKey(category, 'workspace-switcher-peek-width', 'int', this._shellVersion <= 3.38);
                    this._SCKeys.addKey(category, 'workspace-switcher-scale-size', 'int', this._shellVersion >= 40);
                    this._SCKeys.addKey(category, 'search-entry-visibility', 'boolean', true);
                    break;

                case 'appgrid':
                    this._SCKeys.addKey(category, 'rows', 'int', true);
                    this._SCKeys.addKey(category, 'columns', 'int', true);
                    break;
            }
        }
    }

    // _connectSignals: Connect settings signals when user triggering widget signals on prefs
    _connectSignals() {
        // Conenct configuration signals
        for (let [id, key] of Object.entries(this._SCKeys.getKeys())) {
            switch (key.type) {
                case 'boolean':
                    if (key.id === "panel-visibility") {
                        this._builder.get_object(key.id + "-state").connect("state-set", (out) => {
                            this._extensionSettings.set_boolean(key.unseperatedId, out.get_active());
                            this._builder.get_object("panel-height-value").set_sensitive(out.get_active());
                        })
                    } else {
                        this._builder.get_object(key.id + "-state").connect("state-set", (out) => {
                            this._extensionSettings.set_boolean(key.unseperatedId, out.get_active());

                        })
                    }
                    break;
                case 'int':
                    this._builder.get_object(key.id + "-value").connect("value-changed", (out) => {
                        this._extensionSettings.set_int(key.unseperatedId, out.get_value_as_int());
                    })
                    break;
                case 'enum':
                    this._builder.get_object(key.id + "-item").connect("changed", (out) => {
                        this._extensionSettings.set_enum(key.unseperatedId, out.get_active());
                    })
                    break;
            }
        }
        // Refresh configurations value
        this._extensionSettings.connect("changed", () => this._refreshValue());
        // Connect menu signals
        this._builder.get_object('referencesMenu').connect("clicked", () => {
            GLib.spawn_command_line_sync('xdg-open ' + 'https://gitlab.com/adeswantaTechs/shell-configurator/-/blob/master/REFERENCES.md');
            this._builder.get_object('options-popover').popdown();
        });
        this._builder.get_object('websiteMenu').connect("clicked", () => {
            GLib.spawn_command_line_sync('xdg-open ' + 'https://gitlab.com/adeswantaTechs/shell-configurator');
            this._builder.get_object('options-popover').popdown();
        });
    }

    // _refereshValue: Set all prefs settings to current settings.
    _refreshValue() {
        for (let [id, key] of Object.entries(this._SCKeys.getKeys())) {
            switch (key.type) {
                case 'boolean':
                    this._builder.get_object(key.id + "-state").set_active(this._extensionSettings.get_boolean(key.unseperatedId));
                    break;
                case 'int':
                    this._builder.get_object(key.id + "-value").set_value(this._extensionSettings.get_int(key.unseperatedId).toFixed(0));
                    break;
                case 'enum':
                    this._builder.get_object(key.id + "-item").set_active(this._extensionSettings.get_enum(key.unseperatedId));
                    break;
            }
        }
    }

    // _checkCompatibility: Checking GNOME Shell compatibility by hiding configuration if it isn't compatible
    _checkCompatibility() {
        for (let [id, key] of Object.entries(this._SCKeys.getKeys())) {
            if (!key.supported) {
                this._builder.get_object(key.id).set_visible(false);
            }
        }
    }

    // _fixUI: Fixing ui elements
    _fixUI() {
        window.default_width = 512;
        window.default_height = 512;
        if (Gtk.MAJOR_VERSION == 4) {
            this._builder.get_object('menu_button').set_icon_name('open-menu-symbolic');
            this._builder.get_object('menu_button').get_first_child().set_css_classes(['flat']);
        }
        if (Gtk.MAJOR_VERSION == 3) {
            this._builder.get_object("headerbar").set_title('Shell Configurator');
            this._builder.get_object("headerbar").set_show_close_button(true);
            window.set_size_request(512, 512);
            window.resize('512', '512');
        }
    }

    // buildUI: Creates and build prefs UI and return to content widget which is use for buildPrefsWidget on prefs.js
    buildUI() {
        let content;
        // Adding settings.ui file
        this._builder.add_from_file(this._currentPath.dir.get_child('ui').get_path() + '/settings.ui');
        
        // Get content widget
        content = this._builder.get_object('content');

        // Reset all keys
        this._SCKeys.resetEmpty();
        // Add prefs keys
        this._addKeys();
        // Refresh configurations value
        this._refreshValue();

        // Connect content realize signal
        content.connect('realize', () => {
            // Window configuration
            let window = (this._shellVersion >= 40) ? content.get_root() : content.get_toplevel();

            // Headerbar configuration
            let headerBar = this._builder.get_object("headerbar");
            window.set_titlebar(headerBar);

            // Connect Signals
            this._connectSignals();
            // Check configuration compatibility
            this._checkCompatibility();
            // Fix the UI
            this._fixUI(window);
        });
        
        // Set GNOME Shell version label
        this._builder.get_object('shellVersionLabel').set_text("Current GNOME Shell Version: " + this._shellVersion);

        // Check if extension is in development, if true, make development message visible
        if (this._isDevelopment(this._currentPath)) {
            this._builder.get_object('developmentMessage').set_visible(true);
        }
    
        // Set extension version label
        this._builder.get_object('versionLabel').set_text('Version ' + this._currentPath.metadata['version'] + this._releaseTypeLabel);
        
        // Returning content widget
        return content;
    }
}