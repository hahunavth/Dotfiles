'use strict';

const { GObject, Gtk, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {

}

function buildPrefsWidget() {
    let builder = new Gtk.Builder();

    let UIFilePath = Me.dir.get_child("ui").get_path() + '/prefs.ui';
    builder.add_from_file(UIFilePath);

    let settings = ExtensionUtils.getSettings();

    let touchpad_speed = builder.get_object('touchpad-speed-scale');
    let touchpad_display_label = builder.get_object('touchpadspeed_speed_display_value');

    touchpad_speed.connect("value-changed", () => {
        let labelValue = Math.exp(touchpad_speed.adjustment.value / Math.LOG2E).toFixed(2);
        touchpad_display_label.set_text(labelValue);
        settings.set_double('touchpad-speed-scale', labelValue);
    });

    let initialValue = Math.log2(settings.get_double('touchpad-speed-scale'));
    touchpad_speed.set_value(initialValue);

    let alttab_delay = builder.get_object('alttab-delay');
    alttab_delay.set_value(settings.get_int('alttab-delay'));
    settings.bind('alttab-delay', alttab_delay.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);

    return builder.get_object('main_prefs');
}