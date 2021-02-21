/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e };

const IBusSettingsWidget = new GObject.Class({
    Name: 'IBus.Prefs.IBusSettingsWidget',
    GTypeName: 'IBusSettingsWidget',
    Extends: Gtk.Box,

    _init : function(params) {
        this.parent(params);

        this._settings = new Gio.Settings({ schema_id: 'org.freedesktop.ibus.panel' });

        let fontLabel = '<b>' + _("IBus Candidates Font") + '</b>';
        this.pack_start(new Gtk.Label({ label: fontLabel, use_markup: true}),
                        false, false, 6);

        let fontButton = new Gtk.FontButton();
        let fontName = "Sans 10";

        let useCustomFont = this._settings.get_boolean('use-custom-font');
        if (useCustomFont) {
            fontName = this._settings.get_string('custom-font');
        }

        fontButton.font_name = fontName;

        fontButton.connect('font-set', Lang.bind(this, function(widget) {
            fontName = widget.font_name;
            this._settings.set_boolean('use-custom-font', true);
            this._settings.set_string('custom-font', fontName);
        }));
        
        this.pack_end(fontButton, false, false, 6);
    },
});

function init() {
}

function buildPrefsWidget() {
    let widget = new IBusSettingsWidget();
    widget.show_all();

    return widget;
}
