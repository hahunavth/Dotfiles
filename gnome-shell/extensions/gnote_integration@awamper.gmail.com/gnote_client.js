const Gio = imports.gi.Gio;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const ClientBase = Me.imports.client_base;

const GnoteRemoteControlIface =
    '<node> \
        <interface name="org.gnome.Gnote.RemoteControl"> \
            <method name="AddTagToNote"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="tag_name" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="CreateNamedNote"> \
                <arg type="s" name="linked_title" direction="in"/> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="CreateNote"> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="DeleteNote"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="DisplayNote"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="DisplayNoteWithSearch"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="search" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="DisplaySearch"> \
            </method> \
            <method name="DisplaySearchWithText"> \
                <arg type="s" name="search_text" direction="in"/> \
            </method> \
            <method name="FindNote"> \
                <arg type="s" name="linked_title" direction="in"/> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="FindStartHereNote"> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="GetAllNotesWithTag"> \
                <arg type="s" name="tag_name" direction="in"/> \
                <arg type="as" name="ret" direction="out"/> \
            </method> \
            <method name="GetNoteChangeDate"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="i" name="ret" direction="out"/> \
            </method> \
            <method name="GetNoteCompleteXml"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="GetNoteContents"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="GetNoteContentsXml"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="GetNoteCreateDate"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="i" name="ret" direction="out"/> \
            </method> \
            <method name="GetNoteTitle"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <method name="GetTagsForNote"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="as" name="ret" direction="out"/> \
            </method> \
            <method name="HideNote"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="ListAllNotes"> \
                <arg type="as" name="ret" direction="out"/> \
            </method> \
            <method name="NoteExists"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="RemoveTagFromNote"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="tag_name" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="SearchNotes"> \
                <arg type="s" name="query" direction="in"/> \
                <arg type="b" name="case_sensitive" direction="in"/> \
                <arg type="as" name="ret" direction="out"/> \
            </method> \
            <method name="SetNoteCompleteXml"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="xml_contents" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="SetNoteContents"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="text_contents" direction="in"/> \
                <arg type="b" name="ret" direction="out"/> \
            </method> \
            <method name="SetNoteContentsXml"> \
                <arg type="s" name="uri" direction="in"/> \
                <arg type="s" name="xml_contents" direction="in"/> \
                <arg type="b" name="ret" direction="out"/>       \
            </method> \
            <method name="Version"> \
                <arg type="s" name="ret" direction="out"/> \
            </method> \
            <signal name="NoteAdded"> \
                <arg type="s" name="uri"/> \
            </signal> \
            <signal name="NoteDeleted"> \
                <arg type="s" name="uri"/> \
                <arg type="s" name="title"/> \
            </signal> \
            <signal name="NoteSaved"> \
                <arg type="s" name="uri"/> \
            </signal> \
        </interface> \
    </node>';
const GnoteRemoteControlProxy =
    Gio.DBusProxy.makeProxyWrapper(GnoteRemoteControlIface);

const NAME = 'org.gnome.Gnote';
const PATH = '/org/gnome/Gnote/RemoteControl';
const GNOTE_SETTINGS_SCHEMA = 'org.gnome.gnote';
const PINNED_NOTES_KEY = 'menu-pinned-notes';

const GnoteClient = new Lang.Class({
    Name: "GnoteClient",
    Extends: ClientBase.ClientBase,

    _init: function() {
        this.parent('GnoteClient', NAME, PATH, GnoteRemoteControlProxy);

        this._settings = Utils.getSettings(GNOTE_SETTINGS_SCHEMA);
        this._settings.connect(
            'changed::' + PINNED_NOTES_KEY,
            Lang.bind(this, function() {
                this._load_pinned_notes();
            })
        );
        this._load_pinned_notes();
    },

    _load_pinned_notes: function() {
        let pinned_string = this._settings.get_string(PINNED_NOTES_KEY);
        this._pinned_notes = [];

        if(!Utils.is_blank(pinned_string)) {
            this._pinned_notes = pinned_string.split(' ');
        }
    },

    get_pinned_notes_sync: function() {
        return this._pinned_notes.slice();
    },

    pin_note_sync: function(uri) {
        let pinned_notes = this.get_pinned_notes_sync();
        let index = pinned_notes.indexOf(uri);

        if(Utils.is_blank(uri) || index !== -1) return;

        pinned_notes.unshift(uri);
        this._settings.set_string(
            PINNED_NOTES_KEY,
            pinned_notes.join(' ')
        );
    },

    unpin_note_sync: function(uri) {
        let pinned_notes = this.get_pinned_notes_sync();
        let index = pinned_notes.indexOf(uri);

        if(Utils.is_blank(uri) || index === -1) return;

        pinned_notes.splice(index, 1);
        this._settings.set_string(
            PINNED_NOTES_KEY,
            pinned_notes.join(' ')
        );
    },

    is_note_pinned: function(uri) {
        let notes = this.get_pinned_notes_sync();

        return notes.indexOf(uri) !== -1;
    },

    is_valid_uri: function(uri) {
        let pattern = /note:\/\/gnote\/[0-9a-z-]+/;
        return pattern.test(uri);
    },

    destroy: function() {
        this._settings.run_dispose();
        this.parent();
    }
});
