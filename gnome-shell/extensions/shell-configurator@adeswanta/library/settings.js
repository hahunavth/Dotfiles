/**
 * SCSettings
 * 
 * @Description      Settings schema manager
 * @Filename         settings.js
 * @License          GNU General Public License v3.0
 */

// Imporrt Gio libraries from gi
const { Gio } = imports.gi;

// newSettings: Create new Gio Settings from trusted/default schemas folder (/usr/share/glib-2.0/schemas)
function newSettings(schemaPath) {
    // Returing Gio.Settings with default schema source
    return new Gio.Settings({
        schema_id: schemaPath
    });
}

// newSettingsFromSource: Create new Gio Settings from custom schema source
function newSettingsFromSource(sourcePath, schemaPath) {
    // Add custom schema source path
    let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        sourcePath,
        Gio.SettingsSchemaSource.get_default(),
        false
    );
    // Returning Gio.Settings with custom schema source
    return new Gio.Settings({ 
        settings_schema : schemaSource.lookup(schemaPath, true) 
    });
}