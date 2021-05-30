/**
 * SCKeys
 * 
 * @Description      Keys manager for prefs settings
 * @Filename         keys.js
 * @License          GNU General Public License v3.0
 */

var SCKeys = class {
    constructor() {
        this.keys = {};
    }

    // addKey: Create the settings key object.
    addKey(category, name, type, supported) {
        // Use for widget/configuration id
        let id = category + '-' + name.replace(/-/g, "_");
        this.keys[id] = {
            'id': id, // Go to line 16-17
            'name': name, // Use for configuration name
            'category': category, // Use for configuration category
            'unseperatedId': category + '-' + name, // Use for schema name
            'type': type, // Use for configuration type
            'supported': supported // Use for configuration support
        }
    }

    // resetEmpty: Removes all SCKeys
    resetEmpty() {
        if (this.keys != {}) {
            // Set to null object
            this.keys = {};
        }
    }

    // getKeys: Gets all settings keys that saved to 'keys' object (publicly)
    getKeys() {
        // Return the keys
        return this.keys;
    }
}