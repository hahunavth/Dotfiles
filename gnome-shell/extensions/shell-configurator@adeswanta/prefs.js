// Define currentPath and imprort it's library
const SC = imports.misc.extensionUtils.getCurrentExtension();
const { preferences, keys, settings:SCSettings } = SC.imports.library;

// Define current GNOME Shell version
const shellVersion = parseFloat(imports.misc.config.PACKAGE_VERSION);

// Define extension metadata
const SCMetadata = SC.metadata;

// Define install type varible to get installation type after installation
var installedAsUser = (SCMetadata['install-type'] == 'User') ? true : false;

// Define settings schemas
var extensionPath = 'org.gnome.shell.extensions.shell-configurator';
var extensionSettings = (installedAsUser) ? SCSettings.newSettingsFromSource(SC.dir.get_child('schema').get_path(), extensionPath) : SCSettings.newSettings(extensionPath);

// Define the new class of a library
const SCKeys = new keys.SCKeys();
const SCPrefs = new preferences.SCPrefs(SC, SCKeys, extensionSettings, shellVersion);

function init() {  }

function buildPrefsWidget() {
    // Build Prefs UI and return as content widget. See preferences.js on library
    return SCPrefs.buildUI();
}