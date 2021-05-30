const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;

class Extension {
    constructor() {
    	this._indicator = null;
    }

    enable() {
    	log(`enabling ${Me.metadata.name}`);
    	
        Main.panel.statusArea.aggregateMenu._power.hide();
    	Main.panel.statusArea.aggregateMenu.menu.box.get_last_child().hide()
    }

    disable() {
    	log(`disabling ${Me.metadata.name}`);
    	
    	Main.panel.statusArea.aggregateMenu._power.show();
    	Main.panel.statusArea.aggregateMenu.menu.box.get_last_child().show()
    }
}

function init() {
	log(`initializing ${Me.metadata.name}`);
	
	return new Extension();
}

