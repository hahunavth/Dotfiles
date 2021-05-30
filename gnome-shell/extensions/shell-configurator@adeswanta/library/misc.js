/**
 * SCMisc
 * 
 * @Description      Some additional functions and tools for Shell Configurator
 * @Filename         misc.js
 * @License          GNU General Public License v3.0
 */

var SCMisc = class {
    constructor(Main, currentPath, shellSettings) {
        this._Main = Main;
        this._currentPath = currentPath;
        this._shellSettings = shellSettings;
    }

    // sendLog: Send LOG message for debugging purpose
    sendLog(message) {
        log('[Shell Configurator] [LOG] ' + message);
    }

    // sendInfo: Send info message for extension library
    sendInfo(filename, details) {
        log('[Shell Configurator] [INFO] ' + details + ' on ' + filename + '.js');
    }    

    // sendError: Send error message when there are something went wrong with this extension
    sendError(filename, details) {
        throw new Error('[Shell Configurator] [ERROR] ' + details + ' on ' + filename + '.js\nExtension will be disabled');
    }

    // isLocked: Check if session mode is in lockscreen 'unlock-dialog'
    isLocked() {
        if (this._Main.sessionMode.currentMode === 'unlock-dialog') {
            return true;
        }
        return false;
    }

    // isExtenionEnabled: Check if this extension is enabled.
    isExtensionEnabled() {
        if (this._shellSettings.get_strv('enabled-extensions').includes(this._currentPath.metadata['uuid'])) {
            return true;
        }
        return false;
    }

    // getSCStyle: get extension class name so that it can add the style name correctly
    getSCStyle(className, support) {
        if (support == 'all')
            return 'sc-' + className;
        else
            return 'sc-' + className + '-' + support.replace('.', '');
    }
}