/* exported init */
const GLib = imports.gi.GLib;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Constants = Me.imports.constants;
const { GestureExtension } = Me.imports.src.gestures;
const { AltTabGestureExtension } = Me.imports.src.altTab;
const { OverviewRoundTripGestureExtension } = Me.imports.src.overviewRoundTrip;
const { SnapWindowExtension } = Me.imports.src.snapWindow;
const DBusUtils = Me.imports.src.utils.dbus;

const ExtensionUtils = imports.misc.extensionUtils;
class Extension {
	constructor() {
		this._settingChangedId = 0;
		this._reloadWaitId = 0;
		this._extensions = [];
		this._noReloadDelayFor = [
			'default-session-workspace',
			'default-overview',
		];
	}
	enable() {
		this.settings = ExtensionUtils.getSettings();
		this._settingChangedId = this.settings.connect('changed', this.reload.bind(this));
		this._enable();
	}
	disable() {
		if (this.settings) {
			this.settings.disconnect(this._settingChangedId);
		}
		if (this._reloadWaitId !== 0) {
			GLib.source_remove(this._reloadWaitId);
			this._reloadWaitId = 0;
		}
		this._disable();
		DBusUtils.drop_proxy();
	}
	reload(_settings, key) {
		if (this._reloadWaitId !== 0) {
			GLib.source_remove(this._reloadWaitId);
			this._reloadWaitId = 0;
		}
		this._reloadWaitId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, (this._noReloadDelayFor.includes(key) ? 0 : Constants.RELOAD_DELAY), () => {
			this._disable();
			this._enable();
			this._reloadWaitId = 0;
			return GLib.SOURCE_REMOVE;
		});
	}
	_enable() {
		this._initializeSettings();
		this._extensions = [
			new AltTabGestureExtension(),
			new OverviewRoundTripGestureExtension(),
			new GestureExtension(),
			new SnapWindowExtension(),
		];
		this._extensions.forEach(extension => extension.apply());
	}
	_disable() {
		DBusUtils.unsubscribeAll();
		this._extensions.reverse().forEach(extension => extension.destroy());
		this._extensions = [];
	}
	_initializeSettings() {
		if (this.settings) {
			Constants.ExtSettings.DEFAULT_SESSION_WORKSPACE_GESTURE = this.settings.get_boolean('default-session-workspace');
			Constants.ExtSettings.DEFAULT_OVERVIEW_GESTURE = this.settings.get_boolean('default-overview');
			Constants.TouchpadConstants.SWIPE_MULTIPLIER = Constants.TouchpadConstants.DEFAULT_SWIPE_MULTIPLIER * this.settings.get_double('touchpad-speed-scale');
			Constants.AltTabConstants.DELAY_DURATION = this.settings.get_int('alttab-delay');
		}
	}
}
function init() {
	return new Extension();
}
