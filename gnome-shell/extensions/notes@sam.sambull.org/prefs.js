// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-

const GLib = imports.gi.GLib;
const Goa = imports.gi.Goa;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('gnome-shell-extensions-notes');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

function init() {
    Convenience.initTranslations();
}

const NotesKeybindingsWidget = new GObject.Class({
    Name: 'Notes.Keybindings.Widget',
    GTypeName: 'NotesKeybindingsWidget',
    Extends: Gtk.Box,

    _init: function(keybindings, settings) {
        this.parent();
        this.set_orientation(Gtk.Orientation.VERTICAL);

        this._keybindings = keybindings;
        this._settings = settings;

        let scrolled_window = new Gtk.ScrolledWindow();
        scrolled_window.set_policy(
            Gtk.PolicyType.AUTOMATIC,
            Gtk.PolicyType.AUTOMATIC
        );

        this._columns = {
            NAME: 0,
            ACCEL_NAME: 1,
            MODS: 2,
            KEY: 3
        };

        this._store = new Gtk.ListStore();
        this._store.set_column_types([
            GObject.TYPE_STRING,
            GObject.TYPE_STRING,
            GObject.TYPE_INT,
            GObject.TYPE_INT
        ]);

        this._tree_view = new Gtk.TreeView({
            model: this._store,
            hexpand: true,
            vexpand: true
        });
        this._tree_view.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

        let action_renderer = new Gtk.CellRendererText();
        let action_column = new Gtk.TreeViewColumn({
            'title': _("Action"),
            'expand': true
        });
        action_column.pack_start(action_renderer, true);
        action_column.add_attribute(action_renderer, 'text', 1);
        this._tree_view.append_column(action_column);

        let keybinding_renderer = new Gtk.CellRendererAccel({
            'editable': true,
            'accel-mode': Gtk.CellRendererAccelMode.GTK
        });
        keybinding_renderer.connect('accel-edited',
            Lang.bind(this, function(renderer, iter, key, mods) {
                let value = Gtk.accelerator_name(key, mods);
                let [success, iterator ] =
                    this._store.get_iter_from_string(iter);

                if(!success) {
                    printerr(_("Can't change keybinding"));
                }

                let name = this._store.get_value(iterator, 0);

                this._store.set(
                    iterator,
                    [this._columns.MODS, this._columns.KEY],
                    [mods, key]
                );
                this._settings.set_strv(name, [value]);
            })
        );

        let keybinding_column = new Gtk.TreeViewColumn({
            'title': _("Modify")
        });
        keybinding_column.pack_end(keybinding_renderer, false);
        keybinding_column.add_attribute(
            keybinding_renderer,
            'accel-mods',
            this._columns.MODS
        );
        keybinding_column.add_attribute(
            keybinding_renderer,
            'accel-key',
            this._columns.KEY
        );
        this._tree_view.append_column(keybinding_column);

        scrolled_window.add(this._tree_view);
        this.add(scrolled_window);

        this._refresh();
    },

    _refresh: function() {
        this._store.clear();

        for(let settings_key in this._keybindings) {
            let [key, mods] = Gtk.accelerator_parse(
                this._settings.get_strv(settings_key)[0]
            );

            let iter = this._store.append();
            this._store.set(iter,
                [
                    this._columns.NAME,
                    this._columns.ACCEL_NAME,
                    this._columns.MODS,
                    this._columns.KEY
                ],
                [
                    settings_key,
                    this._keybindings[settings_key],
                    mods,
                    key
                ]
            );
        }
    }
});

const NotesPrefsWidget = new GObject.Class({
    Name: 'Notes.Prefs.Widget',
    GTypeName: 'NotesPrefsWidget',
    Extends: Gtk.Box,

    _init: function(params) {
	    this.parent(params);
        this.orientation = Gtk.Orientation.VERTICAL;
            this.margin = this.row_spacing = this.column_spacing = 10;

        let keybindings = {"toggle-notes-view": _("Shortcut to open notes view.")};
        this.settings = Convenience.getSettings();

        let accountExists = this.owncloudAccountExists();

        let hbox = new Gtk.Box;
        let label = new Gtk.Label({
            label: _("<span foreground='white' background='#900'> Must enable notes app in ownCloud to support syncing. </span>"),
            use_markup: true})
        hbox.pack_start(label, false, false, 0);
        this.pack_start(hbox, false, false, 0);

        if (!accountExists) {
            hbox = new Gtk.Box;
            label = new Gtk.Label({
                label: _("<span foreground='white' background='#900'> Please add an ownCloud account in online accounts to enable syncing. </span>"),
                use_markup: true})
            hbox.pack_start(label, false, false, 4);
            this.pack_start(hbox, false, false, 0);
        }

        hbox = new Gtk.Box;
        label = new Gtk.Label({
            label: _("<b>OwnCloud syncing</b>"),
            use_markup: true});
        let owncloudSwitch = new Gtk.Switch();
        this.settings.bind("enable-owncloud", owncloudSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
        hbox.pack_start(owncloudSwitch, false, false, 0);
        hbox.pack_start(label, false, false, 10);
        this.pack_start(hbox, false, false, 4);

        hbox = new Gtk.Box;
        hbox.set_margin_left(50);
        label = new Gtk.Label({label: _("Use Secure HTTP (recommended)")});
        let httpsSwitch = new Gtk.Switch();
        this.settings.bind("owncloud-https", httpsSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
        hbox.pack_start(httpsSwitch, false, false, 0);
        hbox.pack_start(label, false, false, 10);
        this.pack_start(hbox, false, false, 4);

        let keybindings_widget = new NotesKeybindingsWidget(keybindings, this.settings);
        this.pack_start(keybindings_widget, true, true, 10);

        // Disable controls if no account is found.
        owncloudSwitch.set_sensitive(accountExists);
        httpsSwitch.set_sensitive(accountExists);
    },

    owncloudAccountExists: function() {
        let accounts = Goa.Client.new_sync(null).get_accounts();
        for (let i=0; i < accounts.length; i++)
            if (accounts[i].get_account().provider_type == "owncloud")
                return true;
        return false;
    }
});

function buildPrefsWidget() {
    let widget = new NotesPrefsWidget();
    widget.show_all();

    return widget;
}
