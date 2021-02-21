const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const ButtonsBar = Me.imports.buttons_bar;
const NoteColorChooser = Me.imports.note_color_chooser;
const NotePageChooser = Me.imports.note_page_chooser;
const Tooltips = Me.imports.tooltips;

const DesktopNoteToolbar = new Lang.Class({
    Name: "DesktopNoteToolbar",

    _init: function(note_container) {
        this.actor = new St.BoxLayout({
            style_class: 'desktop-note-toolbar-box'
        });

        this._note_container = note_container;
        this._buttonsbar = new ButtonsBar.ButtonsBar();
        this.actor.add_child(this._buttonsbar.actor);

        this._color_chooser = new NoteColorChooser.NoteColorChooser();
        this._color_chooser.connect('color-activated',
            Lang.bind(this, function(button, clutter_color) {
                this._note_container.update_properties({
                    color: clutter_color.to_string()
                });
                this._note_container.set_note_background(clutter_color);
                this._color_chooser.hide();
            })
        );

        this._page_chooser = new NotePageChooser.NotePageChooser();
        this._page_chooser.connect('page-activated',
            Lang.bind(this, function(button, page_index) {
                let old_page = this._note_container.note.properties.page;
                this._note_container.update_properties({
                    page: page_index
                });
                this._page_chooser.hide();
                this._note_container.animate_to_new_page(page_index, old_page);
                this._note_container.desktop_notes.indicate_pages();
            })
        );

        this._init_copy_button();
        this._init_page_button();
        this._init_color_button();
        this._init_edit_button();
    },

    _init_copy_button: function() {
        let button_params = {
            icon_name: Utils.ICONS.COPY,
            icon_style: 'desktop-note-toolbar-icon',
            button_style_class: 'desktop-note-toolbar-button',
            tip_text: 'Copy note content to clipboard',
            action: Lang.bind(this, function() {
                function on_copied(result) {
                    if(result) Main.notify('Copied to clipboard');
                    else Main.notify('Error');
                }

                Utils.copy_note_content_to_clipboard(
                    this._note_container.uri,
                    false,
                    Lang.bind(this, on_copied)
                );
            })
        };
        this.copy_button = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttonsbar.add_button(this.copy_button);
    },

    _init_page_button: function() {
        let button_params = {
            icon_name: Utils.ICONS.PAGE,
            icon_style: 'desktop-note-toolbar-icon',
            button_style_class: 'desktop-note-toolbar-button',
            tip_text: 'Change page',
            action: Lang.bind(this, function() {
                this._page_chooser.selected =
                    this._note_container.note.properties.page;
                this._page_chooser.show();
            })
        };
        this.page_button = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttonsbar.add_button(this.page_button);
    },

    _init_color_button: function() {
        let button_params = {
            icon_name: Utils.ICONS.NOTE_COLOR,
            icon_style: 'desktop-note-toolbar-icon',
            button_style_class: 'desktop-note-toolbar-button',
            tip_text: 'Change color',
            action: Lang.bind(this, function() {
                this._color_chooser.show();
            })
        };
        this.color_button = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttonsbar.add_button(this.color_button);
    },

    _init_edit_button: function() {
        let button_params = {
            icon_name: Utils.ICONS.EDIT,
            icon_style: 'desktop-note-toolbar-icon',
            button_style_class: 'desktop-note-toolbar-button',
            tip_text: 'Edit note',
            action: Lang.bind(this, function() {
                this._note_container.desktop_notes.hide_modal();
                Utils.get_client().display_note(this._note_container.uri);
            })
        };
        this.edit_button = new ButtonsBar.ButtonsBarButton(button_params);
        this._buttonsbar.add_button(this.edit_button);
    },

    destroy: function() {
        this._color_chooser.destroy();
        this._page_chooser.destroy();
        this._buttonsbar.destroy();
        this.actor.destroy();
    }
});
