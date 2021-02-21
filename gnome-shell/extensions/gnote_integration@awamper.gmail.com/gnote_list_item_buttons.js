const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;
const ButtonsBar = Me.imports.buttons_bar;
const DesktopNotes = Me.imports.desktop_notes;
const Shared = Me.imports.shared;

const GnoteListItemButtons = new Lang.Class({
    Name: 'GnoteListItemButtons',

    _init: function(uri) {
        this._uri = uri;

        if(Shared.gnote_integration === null) {
            throw new Error(
                'GnoteListItemButtons:_init():Shared.gnote_integration is null'
            );
        }

        this._gnote_integration = Shared.gnote_integration;

        this._buttons_bar = new ButtonsBar.ButtonsBar({
            style_class: 'gnote-snippet-buttons-box'
        });

        this._init_copy_button();
        this._init_show_on_desktop_button();
        this._init_pin_button();
        this._init_delete_button();
    },

    _init_copy_button: function() {
        let button_params = {
            icon_name: Utils.ICONS.COPY,
            icon_style: 'gnote-snippet-buttons-bar-icon',
            label_text: '',
            tip_text: 'Copy note to clipboard',
            button_style_class: 'gnote-snippet-buttons-bar-button',
            confirmation_dialog: false,
            action: Lang.bind(this, function() {
                function on_copied(result) {
                    if(result) Main.notify('Copied to clipboard');
                    else Main.notify('Error');
                }

                Utils.copy_note_content_to_clipboard(
                    this._uri,
                    false,
                    Lang.bind(this, on_copied)
                );
            })
        };
        this._copy_btn = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttons_bar.add_button(this._copy_btn);
    },

    _init_pin_button: function() {
        let button_params = {
            icon_name: Utils.ICONS.PINNED,
            icon_style: 'gnote-snippet-buttons-bar-icon',
            label_text: '',
            tip_text: 'Pin note',
            button_style_class: 'gnote-snippet-buttons-bar-toggle-button',
            toggle_mode: true,
            action: Lang.bind(this, function() {
                let checked = this._pin_btn.get_checked();

                if(checked) {
                    Utils.get_client().pin_note_sync(this._uri);
                }
                else {
                    Utils.get_client().unpin_note_sync(this._uri);
                }

                this._pin_btn.set_checked(checked);
            })
        };

        this._pin_btn = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttons_bar.add_button(this._pin_btn);

        let checked = Utils.get_client().is_note_pinned(this._uri);
        this._pin_btn.set_checked(checked);
    },

    _init_show_on_desktop_button: function() {
        if(!Utils.SETTINGS.get_boolean(PrefsKeys.ENABLE_DESKTOP_NOTES_KEY)) return;

        let button_params = {
            icon_name: Utils.ICONS.SHOW_ON_DESKTOP,
            icon_style: 'gnote-snippet-buttons-bar-icon',
            label_text: '',
            tip_text: 'Show on desktop',
            button_style_class: 'gnote-snippet-buttons-bar-toggle-button',
            toggle_mode: true,
            action: Lang.bind(this, function() {
                let checked = this._show_on_desktop_btn.get_checked();

                if(checked) {
                    DesktopNotes.get_desktop_notes().add_note(this._uri);
                }
                else {
                    DesktopNotes.get_desktop_notes().remove_note(this._uri);
                }

                this._show_on_desktop_btn.set_checked(checked);
            })
        };

        this._show_on_desktop_btn = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttons_bar.add_button(this._show_on_desktop_btn);

        let checked = DesktopNotes.get_desktop_notes().is_note_on_desktop(this._uri);
        this._show_on_desktop_btn.set_checked(checked);
    },

    _init_delete_button: function() {
        let button_params = {
            icon_name: Utils.ICONS.DELETE,
            icon_style: 'gnote-snippet-buttons-bar-icon',
            label_text: '',
            tip_text: 'Delete note',
            button_style_class: 'gnote-snippet-buttons-bar-button',
            confirmation_dialog: true,
            action: Lang.bind(this, function() {
                this._gnote_integration.delete_note(this._uri);
            })
        };
        this._delete_btn = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttons_bar.add_button(this._delete_btn);
    },

    destroy: function() {
        this._buttons_bar.destroy();
    },

    get actor() {
        return this._buttons_bar.actor;
    }
});
