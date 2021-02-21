// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-
/* Copyright 2013 Sam Bull */

const GLib = imports.gi.GLib;
const Goa = imports.gi.Goa;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Main = imports.ui.main;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const httpSession = new Soup.SessionAsync();

const PATH = GLib.get_user_data_dir() + "/gnome-shell-notes"

/* This is the page object to create our notes view. */
const NotesData = new Lang.Class({
    Name: 'NotesData',

    /* callback_object will be called when data changes. */
    _init: function(callback_object) {
        this.callback_object = callback_object;
        this._syncMessages = {};
        this._syncQueue = new Array();
        this._owncloudNewProcessing = false;
        this._workId = Main.initializeDeferredWork(
            callback_object.actor, Lang.bind(this, this._loadFromDisk));

        let accounts = Goa.Client.new_sync(null).get_accounts();
        for (let i=0; i < accounts.length; i++) {
            let account = accounts[i].get_account();
            if (account.provider_type == "owncloud") {
                let pwd_based = accounts[i].get_password_based()
                let id = account.presentation_identity.split("@");

                // Remove a trailing slash
                if (id[1].charAt(id[1].length-1) == "/")
                    id[1] = id[1].slice(0, -1);

                this.owncloud_user = id[0];
                this.owncloud_url = id[1];
                this.owncloud_pwd = pwd_based.call_get_password_sync(
                    "", null, null)[1];
            }
        }
    },

    get owncloudUrl() {
        let prefix = Convenience.getSettings().get_boolean("owncloud-https");
        prefix = prefix ? "https://" : "http://";
        return prefix.concat(this.owncloud_user, ":", this.owncloud_pwd,
                             "@", this.owncloud_url,
                             "/index.php/apps/notes/api/v0.2/");
    },

    /* Initialises the sync. */
    owncloudStartSync: function() {
        if (!Convenience.getSettings().get_boolean("enable-owncloud"))
            return;

        let msg = Soup.Message.new("GET", this.owncloudUrl.concat("notes"));
        httpSession.queue_message(msg, Lang.bind(this, this.owncloudSync));
    },

    /* Perform the full 2-way sync. */
    owncloudSync: function(session, message) {
        if (message.status_code != 200) {
            Main.notifyError(
                (message.status_code.toString() + 
                 " error while syncing notes with Owncloud"),
                ("While attempting to sync notes with Owncloud a " +
                 message.status_code.toString() +
                 " HTTP status code was encountered"));
            return;
        }

        let owncloud_notes = JSON.parse(message.response_body.data);

        let ocIds = {false: true};
        let newlastId = this._lastId;
        for (let i=0; i < owncloud_notes.length; i++) {
            let n = owncloud_notes[i];
            ocIds[n.id] = n;

            // Create new local note
            if (n.id > this._lastId) {
                if (n.id > newlastId)
                    newlastId = n.id;
                this._addNote(n.content, n.id, n.modified);
            }
        }
        this._lastId = newlastId;

        let ids = {};
        let deleteQueue = new Array();
        // Use deleteQueue, otherwise indices of array changes as we iterate.
        for (let i=0; i < this._notes.length; i++) {
            let n = this._notes[i];

            // Delete local note
            if (!(n.id in ocIds))
                deleteQueue.push(this._notes[i]);
            else
                ids[n.id] = n;

            // Create new remote note
            if (n.id === false)
                this.owncloudNew(n);
        }
        // Process deleteQueue
        for (let i=0; i < deleteQueue.length; i++)
            this._delNote(this._notes.indexOf(deleteQueue[i]));

        for (let i=0; i < owncloud_notes.length; i++) {
            let n = owncloud_notes[i];

            // Delete remote note
            if (!(n.id in ids)) {
                delete ocIds[n.id];
                this.owncloudDel(n.id);
            }

            // Update note contents
            if (n.id in ocIds) {
                if (n.modified > ids[n.id].modified)  // Update local
                    this._editNote(this._notes.indexOf(ids[n.id]),
                                  n.content, n.modified);
                else if (n.modified < ids[n.id].modified) // Update remote
                    this.owncloudEdit(n.id, ids[n.id].content);
            }
        }

        this.save();
    },

    /* Sync new notes upto given ID. */
    owncloudSyncGetNew: function(id) {
        for (let i=this._lastId+1; i < id; i++) {
            let msg = Soup.Message.new("GET", this.owncloudUrl.concat("notes/",
                                                                      i));
            httpSession.queue_message(
                msg, Lang.bind(this, this.owncloudSyncGetNewReturn));
        }
        this._lastId = id;
    },

    owncloudSyncGetNewReturn: function(session, message) {
        if (message.status_code != 200)
            return;

        let response = JSON.parse(message.response_body.data);
        this._addNote(response.content, response.id, response.modified);
    },

    owncloudDel: function(id) {
        let msg = Soup.Message.new(
            "DELETE", this.owncloudUrl.concat("notes/", id));
        httpSession.queue_message(msg, function() {});
    },

    owncloudNew: function(note) {
        let msg = Soup.Message.new(
            "POST", this.owncloudUrl.concat("notes"));
        let body = JSON.stringify({content: note.content});
        msg.set_request('application/json', Soup.MemoryUse.COPY,
                        body, body.length);
        this._syncMessages[msg] = note;
        this._syncQueue.push(msg);

        if (!this._owncloudNewProcessing)
            this.owncloudNewProcessNext();
    },

    owncloudNewProcessNext: function() {
        if (this._syncQueue.length <= 0)
            return;

        this._owncloudNewProcessing = true;

        let msg = this._syncQueue.pop();
        httpSession.queue_message(msg, Lang.bind(this, this.owncloudNewReturn));
    },

    owncloudNewReturn: function(session, message) {
        if (message.status_code != 200)
            return;

        let response = JSON.parse(message.response_body.data);
        let note = this._syncMessages[message]
        note.id = response.id;
        note.modified = response.modified;
        delete this._syncMessages[message];

        this.owncloudSyncGetNew(note.id);
        this.save();

        this._owncloudNewProcessing = false;
        this.owncloudNewProcessNext();
    },

    owncloudEdit: function(id, noteContent) {
        let msg = Soup.Message.new(
            "PUT", this.owncloudUrl.concat("notes/", id));
        let body = JSON.stringify({content: noteContent});
        msg.set_request('application/json', Soup.MemoryUse.COPY,
                        body, body.length);
        httpSession.queue_message(msg,
                                  Lang.bind(this, this.owncloudEditReturn));
    },

    owncloudEditReturn: function(session, message) {
        if (message.status_code != 200)
            return;

        let response = JSON.parse(message.response_body.data);
        for (let i=0; i < this._notes; i++) {
            if (this._notes[i].id == response.id) {
                this._notes[i].modified = response.modified;
                break;
            }
        }
        this.save();
    },

    _loadFromDisk: function() {
        // Read contents from file
        let content;
        try {
            content = GLib.file_get_contents(PATH)[1];
        } catch (e) {
            content = "[-1]";
        }

        // If not JSON, try converting from old format.
        try {
            this._notes = JSON.parse(content);
        } catch (e) {
            this._notes = this._convertData(content);
        }
        this._lastId = this._notes.splice(0, 1)[0];

        let contents = new Array();
        for (let i=0; i < this._notes.length; i++)
            contents.push(this._notes[i].content);
        this.callback_object.notes_init(contents);

        // Prepare ownCloud sync
        let time_s = Convenience.getSettings().get_int("sync-interval-s");
        Mainloop.timeout_add_seconds(
            time_s, Lang.bind(this, this.owncloudStartSync));
        // Run immediately
        this.owncloudStartSync();
    },

    /* Convert from old data format to JSON. */
    _convertData: function(content) {
        let now = Math.floor(new Date().getTime() / 1000);

        // Split individual notes using a private unicode character.
        content = content.toString().split("\uE000");

        let notes = [-1];
        for (let i=0; i < content.length; i++)
            notes.push({"modified": now, "id": false, "content": content[i]});

        return notes;
    },

    /* Return the content of a note. */
    getNote: function(index) {
        return this._notes[index].content;
    },

    _addNote: function(content, id, modified) {
        if (content === undefined)
            content = "";
        if (id === undefined)
            id = false;
        if (modified === undefined)
            modified = Math.floor(new Date().getTime() / 1000);

        let note = {"modified": modified, "id": id, "content": content}
        this._notes.push(note);

        this.callback_object.notes_new(note.content);

        this.save();

        return note;
    },

    addNote: function(content, id, modified) {
        let note = this._addNote(content, id, modified);

        if (Convenience.getSettings().get_boolean("enable-owncloud"))
            this.owncloudNew(note);
    },

    _delNote: function(index) {
        this._notes.splice(index, 1);
        this.callback_object.notes_del(index);

        this.save();
    },

    delNote: function(index) {
        if (Convenience.getSettings().get_boolean("enable-owncloud") &&
            this._notes[index].id !== false)
            this.owncloudDel(this._notes[index].id);

        this._delNote(index);
    },

    _editNote: function(index, content, modified) {
        if (modified === undefined)
            modified = Math.floor(new Date().getTime() / 1000);

        this._notes[index].content = content;
        this._notes[index].modified = modified;
        this.callback_object.notes_changed(index, content);

        this.save();
    },

    editNote: function(index, content, modified) {
        this._editNote(index, content, modified);

        if (Convenience.getSettings().get_boolean("enable-owncloud") &&
            this._notes[index].id !== false)
            this.owncloudEdit(this._notes[index].id, content);
    },

    // Save notes to file.
    save: function() {
        GLib.file_set_contents(PATH, JSON.stringify(
            [this._lastId].concat(this._notes)));
    }
});
