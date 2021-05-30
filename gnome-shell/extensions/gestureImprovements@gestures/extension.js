'use strict';

const { GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Constants = Me.imports.constants;

const { GestureExtension } = Me.imports.src.gestures;
const { AltTabGestureExtension } = Me.imports.src.altTab;
const { OverviewRoundTripGestureExtension } = Me.imports.src.overviewRoundTrip;
const RELOAD_DELAY = 500;

class Extension {
	constructor() {
		this._extensions = [];
		this.settings = null;
		this._settingConnectors = [];
		this._reloadWaitId = 0;
	}

	enable() {
		this.settings = ExtensionUtils.getSettings();
		this._settingConnectors.push(this.settings.connect(
			'changed::touchpad-speed-scale',
			this.reload.bind(this)
		));

		this._settingConnectors.push(this.settings.connect(
			'changed::alttab-delay',
			this.reload.bind(this)
		));
		this._enable();
	}

	disable() {
		this._settingConnectors.forEach(connectId => {
			this.settings.disconnect(connectId);
		});
		this._disable();

		if (this._reloadWaitId !== 0) {
			GLib.source_remove(this._reloadWaitId);
			this._reloadWaitId = 0;
		}
	}

	reload() {
		if (this._reloadWaitId !== 0) {
			GLib.source_remove(this._reloadWaitId);
			this._reloadWaitId = 0;
		}

		this._reloadWaitId = GLib.timeout_add(
			GLib.PRIORITY_DEFAULT,
			RELOAD_DELAY,
			() => {
				this._disable();
				this._enable();
				this._reloadWaitId = 0;
				return GLib.SOURCE_REMOVE;
			}
		);
	}

	_enable() {
		this._initializeSettings();
		this._extensions = [
			new GestureExtension(),
			new AltTabGestureExtension(),
			new OverviewRoundTripGestureExtension()
		];
		this._extensions.forEach(extension => extension.enable());
	}

	_disable() {
		for (let i = 0; i < this._extensions.length; ++i) {
			this._extensions[i].disable();
			delete this._extensions[i];
		}
		this._extensions = [];
	}

	_initializeSettings() {
		this._updateTouchpadScale();
		this._updateAltTabDelay();
	}

	_updateTouchpadScale() {
		Constants.TouchpadConstants.SWIPE_MULTIPLIER =
			Constants.TouchpadConstants.DEFAULT_SWIPE_MULTIPLIER *
			this.settings.get_double('touchpad-speed-scale');
	}

	_updateAltTabDelay() {
		Constants.AltTabConstants.DELAY_DURATION = this.settings.get_int('alttab-delay');
	}
};

function init() {
	return new Extension();
}
