/* exported init, buildPrefsWidget */
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
// eslint-disable-next-line @typescript-eslint/no-empty-function
function init() { }
function buildPrefsWidget() {
	const builder = new Gtk.Builder();
	const UIFilePath = Me.dir.get_child('ui').get_path() + '/prefs.ui';
	builder.add_from_file(UIFilePath);
	const settings = ExtensionUtils.getSettings();
	const touchpad_speed = builder.get_object('touchpad-speed-scale');
	const touchpad_display_label = builder.get_object('touchpadspeed_speed_display_value');
	touchpad_speed.connect('value-changed', () => {
		const labelValue = Math.exp(touchpad_speed.adjustment.value / Math.LOG2E).toFixed(2);
		touchpad_display_label.set_text(labelValue);
		settings.set_double('touchpad-speed-scale', parseFloat(labelValue));
	});
	const initialValue = Math.log2(settings.get_double('touchpad-speed-scale'));
	touchpad_speed.set_value(initialValue);
	const alttab_delay = builder.get_object('alttab-delay');
	alttab_delay.set_value(settings.get_int('alttab-delay'));
	settings.bind('alttab-delay', alttab_delay.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
	const default_sesssion_workspace = builder.get_object('default-session-workspace');
	default_sesssion_workspace.set_active(settings.get_boolean('default-session-workspace'));
	settings.bind('default-session-workspace', default_sesssion_workspace, 'active', Gio.SettingsBindFlags.DEFAULT);
	const default_overview = builder.get_object('default-overview');
	default_overview.set_active(settings.get_boolean('default-overview'));
	settings.bind('default-overview', default_overview, 'active', Gio.SettingsBindFlags.DEFAULT);
	return builder.get_object('main_prefs');
}
