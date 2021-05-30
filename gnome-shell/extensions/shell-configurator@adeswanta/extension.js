// Import Main library from ui
const { main:Main, overviewControls:OverviewControls, workspaceThumbnail:WorkspaceThumbnail } = imports.ui;

// Define currentPath and imprort it's library
const SC = imports.misc.extensionUtils.getCurrentExtension();
const { misc:Misc, manager:Manager, settings:SCSettings, components:SCComponents } = SC.imports.library;

// Define current GNOME Shell version
const shellVersion = parseFloat(imports.misc.config.PACKAGE_VERSION);

// Define extension metadata
const SCMetadata = SC.metadata;

// Define install type varible to get installation type after installation
var installedAsUser = (SCMetadata['install-type'] == 'User') ? true : false;

// Define settings schemas
var shellSettings = SCSettings.newSettings('org.gnome.shell');
var extensionPath = 'org.gnome.shell.extensions.shell-configurator';
var extensionSettings = (installedAsUser) ? SCSettings.newSettingsFromSource(SC.dir.get_child('schema').get_path(), extensionPath) : SCSettings.newSettings(extensionPath);

// Define SC global variables
let SCMisc, SCManager;

function init() {  }

function enable() {
    // Define the new SC classes of SC libraries
    SCMisc = new Misc.SCMisc(Main, SC, shellSettings);
    SCManager = new Manager.SCManager(SC, {
        // Shell libraries:
        'Main': Main,
        'OverviewControls': OverviewControls,
        'WorkspaceThumbnail': WorkspaceThumbnail
    }, SCMisc, shellVersion, shellSettings, extensionSettings);

    SCMisc.sendLog('Enabling extension...');
    SCManager.importComponents(SCComponents);  // Import components
    SCManager.backupDefault();                 // Backup current properties
    SCManager.connectSignals();                // Connect all settings signals
    SCManager.connectCallbacks();              // Connect all callbacks
    SCManager.applyChanges();                  // Apply all properties from shell settings
    SCMisc.sendLog('Extension enabled.');
}

function disable() {
    SCMisc.sendLog('Disabliing extension...');
    SCManager.disconnectCallbacks();            // Disconnect all callbacks
    SCManager.disconnectSignals();              // Disconnect all settings signals
    SCManager.restoreDefault();                 // Restore from previous properties
    SCMisc.sendLog('Extension disbaled.');

    // Set all SC Clases to null (in order not to make increasing memory)
    SCMisc = null;
    SCManager = null;
}