// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-
/* Copyright 2012-2013 Sam Bull */

const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const St = imports.gi.St;

const IconGrid = imports.ui.iconGrid;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const NotesData = Extension.imports.notesData.NotesData;

const PATH = GLib.get_user_data_dir() + "/gnome-shell-notes"

/* This is the page object to create our notes view. */
const NotesView = new Lang.Class({
    Name: 'NotesView',

    _init: function() {
        this.notes = new Array();
        // Use IconGrid from AppsDisplay to arrange the notes.
        this._grid = new IconGrid.IconGrid({ xAlign: St.Align.MIDDLE });
        this._grid.actor.connect('style-changed',
                                 Lang.bind(this._grid, _onStyleChanged));

        this.actor = new St.ScrollView({ x_fill: true,
                                         y_fill: false,
                                         y_align: St.Align.START,
                                         x_expand: true,
                                         y_expand: true,
                                         style_class: 'all-apps vfade' });
        this.actor.add_actor(this._grid.actor);
        this.actor.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this._notesData = new NotesData(this);
    },

    _insertNote: function(index, content) {
        let note = new NoteIcon(this, content);
        note.attachButton();
        this.notes.splice(index, 0, note);
        this._grid.addItem(note, index);

        // Animate in
        note.actor.set_scale(0,0);
        let time_ms = Convenience.getSettings().get_int("animation-ms");
        Tweener.addTween(note.actor, {time: time_ms / 1000,
                                      transition: 'easeOutQuad',
                                      scale_x: 1, scale_y: 1});
    },

    /* Callback when last note is edited, and a new one needs to be added. */
    addLastNote: function() {
        let ct = this._lastNote._entry.get_clutter_text();
        ct.disconnect(this.signal_note);
        let note = this._lastNote;
        note.attachButton();
        this.notes.push(note);
        this._lastNote = false;
        this._notesData.addNote(note.content);
    },

    // Remove note after close button has been clicked.
    delNote: function(button) {
        for (let i=0; i < this.notes.length; i++) {
            if (this.notes[i] == button._note) {
                let note = this.notes[i];
                let time_ms = Convenience.getSettings().get_int("animation-ms");
                Tweener.addTween(note.actor, {time: time_ms / 1000,
                                              transition: 'easeOutQuad',
                                              scale_x: 0, scale_y: 0});
                Mainloop.timeout_add(time_ms, Lang.bind(this, function () {
                        // this.page is hacked in from extension.js
                        this.page.grab_key_focus();
                        this._notesData.delNote(i);
                    }));
                break;
            }
        }
    },

    show: function() {
        for (let i=0; i < this.notes.length; i++)
            this.notes[i].show();
    },

    hide: function() {
        for (let i=0; i < this.notes.length; i++)
            this.notes[i].hide();
    },

    // Hide other buttons when a button is shown.
    _onButtonClose: function (note) {
        for (let i=0; i < this.notes.length; i++) {
            let n = this.notes[i];
            if (n == note)
                continue;
            n.hideCloseButton();
        }
    },

    // === Callback functions for NotesData ===

    notes_init: function(notesContent) {
        this.notes = new Array();

        for (let i=0; i < notesContent.length; i++)
            this._insertNote(i, notesContent[i]);

        this._lastNote = new NoteIcon(this, "");
        this._grid.addItem(this._lastNote);
        // Attach signal to last, empty note.
        this.signal_note = this._lastNote._entry.get_clutter_text().connect(
            'text-changed', Lang.bind(this, this.addLastNote));
    },

    notes_new: function(content) {
        if (this._lastNote) {
            // Insert note just before lastNote.
            this._insertNote(this.notes.length, content);
        } else {  // Just edited empty, last note.
            this._lastNote = new NoteIcon(this, "");
            this._grid.addItem(this._lastNote);

            // Attach signal to last, empty note.
            this.signal_note = this._lastNote._entry.get_clutter_text().connect(
                'text-changed', Lang.bind(this, this.addLastNote));

            this._lastNote.actor.set_scale(0,0);
            let time_ms = Convenience.getSettings().get_int("animation-ms");
            Tweener.addTween(this._lastNote.actor, {time: time_ms / 1000,
                                                    transition: 'easeOutQuad',
                                                    scale_x: 1, scale_y: 1});
        }
    },

    notes_changed: function(index, content) {
        this.notes[index].content = content;
    },

    notes_del: function(index) {
        let note = this.notes.splice(index, 1)[0];
        this._grid._items.splice(this._grid._items.indexOf(note), 1);
        note.actor.destroy();
    }
});

/* Increase size of IconGrid items to allow full sized notes. */
function _onStyleChanged() {
    let themeNode = this.actor.get_theme_node();
    this._spacing = themeNode.get_length('spacing');
    this._hItemSize = 200;
    this._vItemSize = 280;
    this._grid.queue_relayout();
}

/* The note item to be added to IconGrid. */
const NoteIcon = new Lang.Class({
    Name: 'NoteIcon',

    _init : function(notesView, text) {
        this.notesView = notesView;

        this._entry = new St.Entry({ style_class: 'entry' });
        this._title = new St.Label({ style_class: 'title' });
        this._entry.set_text(text);
        this._title_out();

        this._box = new St.BoxLayout({ style_class: 'note' });
        this._box.set_reactive(true);
        this._box.set_vertical(true);
        this._box._delegate = this;
        this._box.add_actor(this._title);
        this._box.add_actor(this._entry);

        this.actor = new St.Widget({ layout_manager: new Clutter.BinLayout() });
        this.actor.add_actor(this._box);

        this.icon = new IconGrid.BaseIcon("", {});

        // Tweak text entry properties to better suit notes.
        let clutterText = this._entry.get_clutter_text();
        clutterText.set_single_line_mode(false);
        clutterText.set_activatable(false);
        clutterText.set_line_wrap(true);
        clutterText.set_line_wrap_mode(imports.gi.Pango.WrapMode.WORD_CHAR);

        // Close button
        this._idleToggleCloseId = 0;
        this.button = new St.Button({ style_class: 'window-close' });
        this.button._overlap = 0;
        this.button._note = this;
        this.button.hide();
        this.button.connect('clicked', Lang.bind(notesView, notesView.delNote));
        this.actor.add_actor(this.button);
        this.button.connect('style-changed',
                            Lang.bind(this, this._onStyleChanged));

        // Make sure key entry is accepted after clicking anywhere on actor.
        this._box.connect('button-press-event', function (actor, event) {
            clutterText.event(event, false);
        });

        // Handle displaying and editing of title.
        clutterText.connect('key-focus-in', Lang.bind(this, this._title_in));
        clutterText.connect('key-focus-out', Lang.bind(this, this._title_out));
        // Save data when focus leaves widget.
        clutterText.connect('key-focus-out', Lang.bind(this, this._update));
    },

    get content() {
        if (!this._title.visible)
            return this._entry.get_text();
        else if (this._entry.get_text().length > 0)
            return this._title.get_text() + "\n" + this._entry.get_text();
        else
            return this._title.get_text();
    },

    set content(content) {
        let i = content.indexOf("\n");
        if (i == -1)
            content = [content, ""];
        else
            content = [content.slice(0, i), content.slice(i+1)];
        this._title.set_text(content[0]);
        this._entry.set_text(content[1]);
    },

    get index() {
        return this.notesView.notes.indexOf(this);
    },

    /* Connect a close button to the note. */
    attachButton: function() {
        this._box.connect('enter-event', Lang.bind(this, this._onEnter));
        this._box.connect('leave-event', Lang.bind(this, this._onLeave));
        this.button.connect('leave-event', Lang.bind(this, this._onLeave));
        this.connect('show-close-button', Lang.bind(
            this.notesView, this.notesView._onButtonClose));
    },

    _update: function() {
        if (this !== this.notesView._lastNote)
            this.notesView._notesData.editNote(this.index, this.content);
    },

    // Hide label, and stick title into entry so it's editable.
    _title_in: function() {
        this._title.hide();
        if (this._title.get_text().length > 0 ||
            this._entry.get_text().length > 0) {
            this._entry.set_text(this._title.get_text() + "\n" +
                                 this._entry.get_text());
        }
    },

    // Strip out title, and reshow the title label.
    _title_out: function() {
        this.content = this._entry.get_text();
        this._title.show();
    },

    hide: function() {
        this.button.hide();
    },

    show: function() {
        if (this._entry.has_pointer)
            this.button.show();
    },

    _onStyleChanged: function() {
        let closeNode = this.button.get_theme_node();
        this.button._overlap = closeNode.get_length('-shell-close-overlap');
        this.button.set_position(
            this._box.x + (this._box.width - this.button._overlap),
            this._box.y - (this.button.height - this.button._overlap));

        this.notesView._grid.actor.queue_relayout();
    },

    _onEnter: function() {
        this.button.show();
        this.button.raise_top();
        this.emit('show-close-button');
    },

    _onLeave: function() {
        if (this._idleToggleCloseId == 0)
            this._idleToggleCloseId = Mainloop.timeout_add(
                750, Lang.bind(this, this._idleToggleCloseButton));
    },

    _idleToggleCloseButton: function() {
        this._idleToggleCloseId = 0;
        if (!this._entry.get_clutter_text().has_pointer &&
            !this.button.has_pointer && !this._box.has_pointer)
            this.button.hide();

        return false;
    },

    hideCloseButton: function() {
        if (this._idleToggleCloseId > 0) {
            Mainloop.source_remove(this._idleToggleCloseId);
            this._idleToggleCloseId = 0;
        }
        this.button.hide();
    }
});
imports.signals.addSignalMethods(NoteIcon.prototype);
