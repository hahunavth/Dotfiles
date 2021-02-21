'use strict';

const { Gdk, Gio, GLib, GObject, Gtk } = imports.gi;

const Cairo = imports.cairo;
const Gettext = imports.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

let ECal, EDataServer, ICalGLib;

if (Utils._HAS_EDS) {
    ECal = imports.gi.ECal;
    EDataServer = imports.gi.EDataServer;
    ICalGLib = imports.gi.ICalGLib;
}

// eslint-disable-next-line no-redeclare
const _ = Gettext.gettext;

// Enable the use of context in translation of plurals:
const _npgettext = (context, singular, plural, n) => {
    if (n !== 1)
        return Gettext.ngettext(`${context}\u0004${singular}`, plural, n);
    else
        return Gettext.pgettext(context, singular);
};

Gio.Resource.load(GLib.build_filenamev([Me.dir.get_path(),
    Me.metadata.gresource]))._register();

function init() {
    const dir = Me.metadata.locale === 'user-specific'
        ? Me.dir.get_child('locale').get_path() : Me.metadata.locale;

    Gettext.textdomain(Me.metadata.base);
    Gettext.bindtextdomain(Me.metadata.base, dir);
}

/**
 * Returns the settings widget if Evolution Data Server (and required
 * dependencies) are installed and if there are no prior instances of the
 * settings window. Otherwise, an instance of `BeGoneWidget` is returned.
 *
 * @return {Gtk.ScrolledWindow} Scrolled window with either widget in it.
 */
function buildPrefsWidget() {
    const widget = Gtk.Window.list_toplevels().filter(win => win._uuid &&
        win._uuid === Me.uuid).length === 1 && Utils._HAS_EDS
        ? new TaskWidgetSettings() : new BeGoneWidget();

    const scrolledWindow = new Gtk.ScrolledWindow();
    scrolledWindow.add(widget);
    scrolledWindow.show_all();
    return scrolledWindow;
}

const BeGoneWidget = GObject.registerClass(
class BeGoneWidget extends Gtk.Box {
    /**
     * Shows a message dialog if Evolution Data Server is not installed on the
     * system. Also, closes the settings window if there's another instance of
     * it already opened.
     */
    _init() {
        super._init();
        this.connect('realize', () => {
            this.get_toplevel().close();

            if (Utils._HAS_EDS)
                return;

            let [dialog] = Gtk.Window.list_toplevels().filter(window =>
                window.get_name() === 'task-widget-error');

            if (dialog)
                return;

            dialog = new Gtk.MessageDialog({
                buttons: Gtk.ButtonsType.CLOSE,
                text: _('Error: Missing Dependencies'),
                secondary_text: _('Please install Evolution Data' +
                    ' Server to use this extension.'),
            });

            dialog.add_button(_('Help'), 0);
            dialog.set_keep_above(true);
            dialog.set_name('task-widget-error');
            dialog.present();

            dialog.connect('response', (dialog, responseId) =>  {
                if (responseId === 0) {
                    Gio.AppInfo.launch_default_for_uri_async(Me.metadata.wiki,
                        null, null, null);
                }

                dialog.destroy();
            });
        });
    }
});

const TaskWidgetSettings = GObject.registerClass({
    GTypeName: 'TaskWidgetSettings',
    Template: `resource://${Me.metadata.epath}/settings-window.ui`,
    InternalChildren: [
        'mtlSwitch',
        'gptSwitch',
        'hhfstlSwitch',
        'heactlSwitch',
        'hctSettingsRevealer',
        'hctComboBox',
        'hctSettingsStack',
        'hctApotacComboBox',
        'hctApotacSpinButton',
        'hctAstodSpinButtonHour',
        'hctAstodSpinButtonMinute',
        'taskListBox',
        'refreshTaskLists',
        'refreshTaskListsBox',
        'backendRefreshButton',
        'backendRefreshButtonImage',
        'backendRefreshButtonSpinner',
    ],
}, class TaskWidgetSettings extends Gtk.Box {
    /**
     * Initializes the settings widget.
     */
    _init() {
        super._init();

        const provider = new Gtk.CssProvider();
        provider.load_from_resource(`${Me.metadata.epath}/prefs.css`);

        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
            provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        this.connect('realize', this._onRealized.bind(this));
        this.connect('unrealize', this._onUnrealized.bind(this));

        const dir = Me.metadata.schemas === 'user-specific'
            ? Me.dir.get_child('schemas').get_path() : Me.metadata.schemas;

        const gschema = Gio.SettingsSchemaSource.new_from_directory(
            dir, Gio.SettingsSchemaSource.get_default(), false);

        this._settings = new Gio.Settings({
            settings_schema: gschema.lookup(Me.metadata.base, true),
        });

        this._hctComboBox.connect('changed', option => {
            switch (option.active) {
                case Utils._HIDE_COMPLETED_TASKS['never']:
                case Utils._HIDE_COMPLETED_TASKS['immediately']:
                    this._hctSettingsRevealer.reveal_child = false;
                    break;
                case Utils._HIDE_COMPLETED_TASKS['after-time-period']:
                    this._hctSettingsRevealer.reveal_child = true;

                    this._hctSettingsStack.set_visible_child_name(
                        'hctApotacPage');

                    break;
                case Utils._HIDE_COMPLETED_TASKS['after-specified-time']:
                    this._hctSettingsRevealer.reveal_child = true;

                    this._hctSettingsStack.set_visible_child_name(
                        'hctAstodPage');
            }
        });

        this._settings.bind('merge-task-lists', this._mtlSwitch, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind('group-past-tasks', this._gptSwitch, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind('hide-header-for-singular-task-lists',
            this._hhfstlSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind('hide-empty-completed-task-lists',
            this._heactlSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind('hide-completed-tasks', this._hctComboBox,
            'active', Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind('hct-apotac-value', this._hctApotacSpinButton,
            'value', Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind('hct-astod-hour', this._hctAstodSpinButtonHour,
            'value', Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind('hct-astod-minute', this._hctAstodSpinButtonMinute,
            'value', Gio.SettingsBindFlags.DEFAULT);

        this._fillApotacComboBox(this._hctApotacSpinButton.value);

        this._settings.bind('hct-apotac-unit', this._hctApotacComboBox,
            'active', Gio.SettingsBindFlags.DEFAULT);

        this._hctApotacSpinButton.connect('value-changed', button =>
            this._fillApotacComboBox(button.get_value(),
                this._hctApotacComboBox.active_id));

        this._hctAstodSpinButtonHour.connect('output', this._timeOutput
            .bind(this));

        this._hctAstodSpinButtonMinute.connect('output', this._timeOutput
            .bind(this));

        this._taskListBox.set_header_func((row, before) => {
            if (!before || row.get_header())
                return;

            row.set_header(new Gtk.Separator({ orientation:
                Gtk.Orientation.HORIZONTAL }));
        });

        this._taskListBox.set_selection_mode(Gtk.SelectionMode.NONE);

        // Enable drag and drop in the task list box:
        this._taskListBox.drag_dest_set(Gtk.DestDefaults.MOTION |
            Gtk.DestDefaults.DROP, [Gtk.TargetEntry.new('Gtk.ListBoxRow',
            Gtk.TargetFlags.SAME_APP, 0)], Gdk.DragAction.MOVE);

        // Connect signal handlers for drag and drop operations:
        this._taskListBox.connect('drag-motion', this._dragMotion.bind(this));
        this._taskListBox.connect('drag-leave', this._dragLeave.bind(this));

        this._taskListBox.connect('drag-data-received',
            this._dragDataReceived.bind(this));

        this._listTaskListsAndAccounts(false, true);
    }

    /**
     * Fills "After a period of time after completion" Gtk.ComboBox with
     * time units.
     *
     * @param {number} duration - Time to elapse before hiding the task.
     * @param {string} [active] - ID of the active Gtk.ComboBox item.
     */
    _fillApotacComboBox(duration, active = null) {
        const time = new Map([
            [Utils._TIME_UNITS['seconds'], _npgettext('after X second(s)',
                'second', 'seconds', duration)],
            [Utils._TIME_UNITS['minutes'], _npgettext('after X minute(s)',
                'minute', 'minutes', duration)],
            [Utils._TIME_UNITS['hours'], _npgettext('after X hour(s)', 'hour',
                'hours', duration)],
            [Utils._TIME_UNITS['days'], _npgettext('after X day(s)', 'day',
                'days', duration)],
        ]);

        this._hctApotacComboBox.remove_all();

        time.forEach((label, i) => this._hctApotacComboBox
            .append(`${i}`, label));

        if (active !== null)
            this._hctApotacComboBox.set_active_id(active);
    }

    /**
     * Lists task lists and accounts of remote task lists.
     *
     * @param {boolean} accountsOnly - Only refresh the account list.
     * @param {boolean} [init] - Marks initialization of the settings window.
     */
    async _listTaskListsAndAccounts(accountsOnly, init = false) {
        try {
            if (init) {
                this._sourceType = EDataServer.SOURCE_EXTENSION_TASK_LIST;
                this._sourceRegistry = await Utils._getSourceRegistry(null);
                const customOrder = this._settings.get_strv('task-list-order');

                const customSort = customOrder.length ? Utils._customSort.bind(
                    this, customOrder) : undefined;

                const sources = this._sourceRegistry.list_sources(
                    this._sourceType).sort(customSort);

                const clients = await Promise.all(sources.map(source =>
                    Utils._getECalClient(source, ECal.ClientSourceType.TASKS,
                        1, null)));

                this._clients = new Map(clients.map(client =>
                    [client.source.uid, client]));
            }

            const accounts = new Map();

            for (const [, client] of this._clients) {
                const remote = client.check_refresh_supported();

                if (remote) {
                    // Account name (usually an email address):
                    const account = this._sourceRegistry.ref_source(
                        client.source.get_parent()).display_name;

                    // Keep an object of unique accounts:
                    if (!accounts.get(account)) {
                        accounts.set(account, this._sourceRegistry.ref_source(
                            client.source.get_parent()));
                    }
                }

                if (accountsOnly)
                    continue;

                const taskListRow = new TaskListRow(client,
                    this._sourceRegistry, remote, this._settings);

                this._taskListBox.add(taskListRow);
                taskListRow.show_all();
            }

            if (!accounts.size) {
                this._backendRefreshButton.set_sensitive(false);

                this._backendRefreshButton.set_tooltip_text(
                    _('No remote task lists found'));

                if (accountsOnly)
                    return;
            } else {
                this._backendRefreshButton.set_sensitive(true);

                this._backendRefreshButton.set_tooltip_text(
                    _('Refresh the list of account task lists'));
            }

            for (const [account, source] of accounts) {
                const accountButton = Gtk.ModelButton.new();
                accountButton.text = account;
                this._refreshTaskListsBox.add(accountButton);

                accountButton.connect('clicked',
                    this._onAccountButtonClicked.bind(this, source, account));
            }

            this._refreshTaskListsBox.show_all();

            if (accountsOnly)
                return;

            this._taskListAddedId = this._sourceRegistry.connect(
                'source-added', (_registry, source) => {
                    if (source.has_extension(this._sourceType))
                        this._onTaskListEvent('added', source);
                }
            );

            this._taskListRemovedId = this._sourceRegistry.connect(
                'source-removed', (_registry, source) => {
                    if (source.has_extension(this._sourceType))
                        this._onTaskListEvent('removed', source);
                }
            );

            this._taskListChangedId = this._sourceRegistry.connect(
                'source-changed', (_registry, source) => {
                    if (source.has_extension(this._sourceType))
                        this._onTaskListEvent('changed', source);
                }
            );
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Handles account button click events.
     *
     * @param {EDataServer.SourceCollection} source - Account data source.
     * @param {string} account - Account name.
     */
    async _onAccountButtonClicked(source, account) {
        try {
            const extension = EDataServer.SOURCE_EXTENSION_COLLECTION;

            if (!source.has_extension(extension))
                throw new Error(`${account} is not refreshable`);

            const tooltip = this._backendRefreshButton.get_tooltip_text();

            // Refresh list of account task lists:
            if (!await Utils._refreshBackend(this._sourceRegistry,
                source.uid, null))
                throw new Error(`${account} could not be refreshed`);

            this._backendRefreshButton.set_tooltip_text(
                _('Refresh in progress') + Utils._ELLIPSIS_CHAR);

            this._backendRefreshButtonImage.set_visible(false);
            this._backendRefreshButtonSpinner.set_visible(true);
            this._backendRefreshButton.set_sensitive(false);

            GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10,
                () => {
                    this._backendRefreshButton.set_tooltip_text(tooltip);
                    this._backendRefreshButtonImage.set_visible(true);
                    this._backendRefreshButtonSpinner.set_visible(false);
                    this._backendRefreshButton.set_sensitive(true);
                    return GLib.SOURCE_REMOVE;
                }
            );
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Handles task list events (additions, removals and changes).
     *
     * @param {string} event - Type of event.
     * @param {EDataServer.Source} source - Associated data source.
     */
    async _onTaskListEvent(event, source) {
        try {
            switch (event) {
                case 'added': {
                    const client = await Utils._getECalClient(source,
                        ECal.ClientSourceType.TASKS, 1, null);

                    this._clients.set(source.uid, client);

                    const taskListRow = new TaskListRow(client,
                        this._sourceRegistry, client.check_refresh_supported(),
                        this._settings);

                    this._taskListBox.add(taskListRow);
                    taskListRow.show_all();
                    break;
                }
                case 'removed':
                    this._clients.delete(source.uid);

                    this._taskListBox.foreach(row => {
                        if (row._uid === source.uid)
                            row.destroy();
                    });

                    break;
                case 'changed':
                    this._taskListBox.foreach(row => {
                        if (row._uid === source.uid)
                            row._taskListName.set_text(source.display_name);
                    });
            }

            // Refresh the list of accounts:
            this._refreshTaskListsBox.foreach(account => account.destroy());
            this._listTaskListsAndAccounts(true);
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Processes data received from the drag and drop operation.
     *
     * @param {*} widget - Widget involved in the operation.
     * @param {Gdk.DragContext} _context - Drag context.
     * @param {number} _x - x coordinate of where the drop happened.
     * @param {number} _y - y coordinate of where the drop happened.
     * @param {Gtk.SelectionData} data - Received data.
     */
    _dragDataReceived(widget, _context, _x, _y, data) {
        let index = parseInt(imports.byteArray.toString(data.get_data()));
        const source = widget.get_row_at_index(index);

        // Do nothing if we didn't move the row into new position:
        if ((widget.dragRow === widget.rowAbove) || source === widget.rowBelow)
            return;

        // Remove the row and insert it into new position:
        source.get_parent().remove(source);

        index = widget.rowBelow ? widget.rowBelow.get_index()
            : widget.rowAbove.get_index() + 1;

        widget.insert(source, index);

        // Update the order of task lists:
        this._settings.set_strv('task-list-order',
            widget.get_children().map(row => row._uid));

        delete widget.rowAbove;
        delete widget.rowBelow;
    }

    /**
     * Handles events taking place during the drag and drop operation.
     *
     * @param {*} widget - Widget involved in the operation.
     * @param {Gdk.DragContext} _context - Drag context.
     * @param {number} _x - x coordinate of the current cursor position.
     * @param {number} y - y coordinate of the current cursor position.
     */
    _dragMotion(widget, _context, _x, y) {
        widget.dragRow.get_style_context().remove_class('drag-hover');

        if (widget.rowAbove) {
            widget.rowAbove.get_style_context()
                .remove_class('drag-hover-bottom');
        }

        if (widget.rowBelow) {
            widget.rowBelow.get_style_context().remove_class('drag-hover-top');

            if (widget.rowBelow.get_header()) {
                widget.rowBelow.get_header().get_style_context()
                    .remove_class('row-separator');
            }
        }

        // Get the row under the mouse cursor:
        const row = widget.get_row_at_y(y);

        if (row) {
            const allocation = row.get_allocation();

            // Check if the cursor is in the top half of that row:
            const topHalf = y < allocation.y + allocation.height / 2;

            widget.rowBelow = topHalf ? row : widget.get_row_at_index(
                row.get_index() + 1);

            widget.rowAbove = topHalf
                ? widget.get_row_at_index(row.get_index() - 1) : row;
        }

        if (widget.dragRow === widget.rowAbove ||
            widget.dragRow === widget.rowBelow) {
            widget.dragRow.get_style_context().add_class('drag-hover');
        } else {
            if (widget.rowAbove) {
                widget.rowAbove.get_style_context().add_class(
                    'drag-hover-bottom');
            }

            if (widget.rowBelow) {
                widget.rowBelow.get_style_context().add_class('drag-hover-top');

                if (widget.rowBelow.get_header()) {
                    widget.rowBelow.get_header().get_style_context()
                        .add_class('row-separator');
                }
            }
        }
    }

    /**
     * Finalizes drag and drop operations.
     *
     * @param {*} widget - Widget involved in the operation.
     */
    _dragLeave(widget) {
        if (widget.rowAbove) {
            widget.rowAbove.get_style_context()
                .remove_class('drag-hover-bottom');
        }

        if (widget.rowBelow) {
            widget.rowBelow.get_style_context().remove_class('drag-hover-top');

            if (widget.rowBelow.get_header()) {
                widget.rowBelow.get_header().get_style_context()
                    .remove_class('row-separator');
            }
        }
    }

    /**
     * Pads values of Gtk.SpinButton with zeros so that they always contain
     * two digits.
     *
     * @param {Gtk.SpinButton} button - Widget involved in the operation.
     * @return {boolean} `true` to display the formatted value.
     */
    _timeOutput(button) {
        button.set_text(button.adjustment.value.toString().padStart(2, 0));
        return true;
    }

    /**
     * Disconnects signal handlers when settings window gets closed.
     */
    _onUnrealized() {
        if (this._taskListAddedId)
            this._sourceRegistry.disconnect(this._taskListAddedId);

        if (this._taskListRemovedId)
            this._sourceRegistry.disconnect(this._taskListRemovedId);

        if (this._taskListChangedId)
            this._sourceRegistry.disconnect(this._taskListChangedId);
    }

    /**
     * Adds a settings menu button to the header bar as soon as the widget gets
     * realized.
     *
     * @param {TaskWidgetSettings} widget - Widget that has been realized.
     */
    _onRealized(widget) {
        const window = widget.get_toplevel();
        window._headerBar.pack_end(new SettingsMenuButton(window));
        window._headerBar.show_all();
    }
});

const TaskListRow = GObject.registerClass({
    GTypeName: 'TaskListRow',
    Template: `resource://${Me.metadata.epath}/task-list-row.ui`,
    InternalChildren: [
        'taskListSwitch',
        'taskListName',
        'taskListProvider',
        'dragBox',
        'rowMenuRefresh',
        'rowMenuMoveUp',
        'rowMenuMoveDown',
        'rowMenuProps',
        'taskListOptionsButton',
        'taskListOptionsImage',
        'taskListOptionsSpinner',
    ],
}, class TaskListRow extends Gtk.ListBoxRow {
    /**
     * Initializes a task list row.
     *
     * @param {ECal.Client} client - `ECal.Client` of the task list.
     * @param {EDataServer.SourceRegistry} registry - Source registry.
     * @param {boolean} remote - It's a remote task list.
     * @param {Gio.Settings} settings - API for storing and retrieving
     * extension settings.
     */
    _init(client, registry, remote, settings) {
        super._init();

        const source = client.source;
        this._settings = settings;
        this._uid = source.uid;
        this._taskListName.set_text(source.display_name);

        this._taskListProvider.set_text(registry.ref_source(source.get_parent())
            .display_name);

        this._taskListSwitch.active = this._settings.get_strv(
            'disabled-task-lists').indexOf(source.uid) === -1;

        this._rowMenuMoveUp.connect('clicked', this._moveRow.bind(this, true));

        this._rowMenuMoveDown.connect('clicked', this._moveRow.bind(this,
            false));

        this._taskListSwitch.connect('state-set', this._setTaskListState.bind(
            this, source));

        if (!remote) {
            this._rowMenuRefresh.set_visible(false);
            this._rowMenuProps.set_visible(false);
        } else {
            this._rowMenuProps.connect('clicked', button => {
                const dialog = new TaskListPropertiesDialog(
                    button.get_toplevel(), source);

                dialog.run();
            });

            this._rowMenuRefresh.connect('clicked',
                this._onRefreshButtonClicked.bind(this, client));
        }

        // Make the row draggable:
        this._dragBox.drag_source_set(Gdk.ModifierType.BUTTON1_MASK,
            [Gtk.TargetEntry.new('Gtk.ListBoxRow', Gtk.TargetFlags.SAME_APP,
                0)], Gdk.DragAction.MOVE);

        // Connect to signals required for drag and drop operations:
        this._dragBox.connect('drag-begin', this._dragBegin.bind(this));
        this._dragBox.connect('drag-end', this._dragEnd.bind(this));
        this._dragBox.connect('drag-data-get', this._dragDataGet.bind(this));
    }

    /**
     * Updates the task content of the task list when it's `Refresh Tasks`
     * button gets clicked.
     *
     * @param {ECal.Client} client - `ECal.Client` of the task list.
     */
    async _onRefreshButtonClicked(client) {
        try {
            this._taskListOptionsImage.set_visible(false);
            this._taskListOptionsSpinner.set_visible(true);
            this._taskListOptionsButton.set_sensitive(false);

            GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1,
                () => {
                    this._taskListOptionsImage.set_visible(true);
                    this._taskListOptionsSpinner.set_visible(false);
                    this._taskListOptionsButton.set_sensitive(true);
                    return GLib.SOURCE_REMOVE;
                }
            );

            if (!await Utils._refreshClient(client, null)) {
                throw new Error('Cannot refresh the task list: ' +
                    client.source.display_name);
            }
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Moves the row up or down in the list of task lists.
     *
     * @param {boolean} up - Move the row upwards.
     */
    _moveRow(up) {
        const parent = this.get_parent();
        let index = this.get_index();
        parent.remove(this);

        if (up)
            index = --index;
        else if (parent.get_row_at_index(index))
            index = ++index;
        else
            index = 0;

        parent.insert(this, index);

        this._settings.set_strv('task-list-order',
            parent.get_children().map(row => row._uid));
    }

    /**
     * Initializes the drag and drop operation.
     *
     * @todo Use set_device_offsef() if/when gjs supports it.
     *
     * @param {*} widget - Widget involved in the operation.
     * @param {Gdk.DragContext} context - Drag context.
     */
    _dragBegin(widget, context) {
        const taskListRow = widget.get_ancestor(Gtk.ListBoxRow.$gtype);
        const rowSize = taskListRow.get_allocation();

        const imageSurface = new Cairo.ImageSurface(Cairo.Format.ARGB32,
            rowSize.width, rowSize.height);

        const cairoContext = new Cairo.Context(imageSurface);
        taskListRow.get_style_context().add_class('drag-icon');
        taskListRow.draw(cairoContext);
        taskListRow.get_style_context().remove_class('drag-icon');
        /*
         * // Adjust the position of a floating row image:
         * const [x, y] = widget.translate_coordinates(row, 0, 0);
         * surface.set_device_offset(-x, -y);
        */
        Gtk.drag_set_icon_surface(context, imageSurface);
        taskListRow.get_parent().dragRow = taskListRow;
        taskListRow.get_style_context().add_class('drag-row');
        cairoContext.$dispose();
    }

    /**
     * Finalizes the drag and drop operation.

     * @param {*} widget - Widget involved in the operation.
     */
    _dragEnd(widget) {
        const taskListRow = widget.get_ancestor(Gtk.ListBoxRow.$gtype);
        taskListRow.get_parent().dragRow = null;
        taskListRow.get_style_context().remove_class('drag-row');
        taskListRow.get_style_context().remove_class('drag-hover');
    }

    /**
     * Stores data (index of the task list row being dragged) for the drag and
     * drop operation.
     *
     * @param {*} widget - Widget involved in the operation.
     * @param {Gdk.DragContext} _context - Drag context.
     * @param {Gtk.SelectionData} data - Gtk.SelectionData to be filled with
     * the dragged data.
     */
    _dragDataGet(widget, _context, data) {
        data.set(Gdk.Atom.intern_static_string('Gtk.ListBoxRow'), 8,
            `${widget.get_ancestor(Gtk.ListBoxRow.$gtype).get_index()}`);
    }

    /**
     * Adds or removes the task list from the list of disabled task lists.
     *
     * @param {EDataServer.Source} source - Source of the task list.
     * @param {Gtk.Switch} _widget - Switch whose state is handled.
     * @param {boolean} enabled - Switch is in its enabled state.
     */
    _setTaskListState(source, _widget, enabled) {
        const disabled = this._settings.get_strv('disabled-task-lists');

        if (enabled) {
            const index = disabled.indexOf(source.uid);

            if (index !== -1)
                disabled.splice(index, 1);
        } else {
            disabled.push(source.uid);
        }

        this._settings.set_strv('disabled-task-lists', disabled);
    }
});

const TaskListPropertiesDialog = GObject.registerClass({
    GTypeName: 'TaskListPropertiesDialog',
    Template: `resource://${Me.metadata.epath}/task-list-properties-dialog.ui`,
    InternalChildren: [
        'taskListPropertiesDialogComboBox',
        'taskListPropertiesDialogSpinButton',
    ],
}, class TaskListPropertiesDialog extends Gtk.Dialog {
    /**
     * Initializes a dialog for task list properties.
     *
     * @param {Gtk.Window} window - Extension settings window.
     * @param {EDataServer.Source} source - Source of the task list.
     */
    _init(window, source) {
        super._init();

        this.set_transient_for(window);
        this.set_title(`${this.get_title()} — ${source.display_name}`);
        this._source = source;

        this._extension = source.get_extension(
            EDataServer.SOURCE_EXTENSION_REFRESH);

        let units;
        let interval = this._extension.interval_minutes;

        if (interval === 0) {
            units = Utils._TIME_UNITS['minutes'];
        } else if (interval % Utils._MINUTES_PER_DAY === 0) {
            interval /= Utils._MINUTES_PER_DAY;
            units = Utils._TIME_UNITS['days'];
        } else if (interval % Utils._MINUTES_PER_HOUR === 0) {
            interval /= Utils._MINUTES_PER_HOUR;
            units = Utils._TIME_UNITS['hours'];
        } else {
            units = Utils._TIME_UNITS['minutes'];
        }

        this._fillTimeUnitComboBox(interval, `${units}`);
        this._taskListPropertiesDialogSpinButton.set_value(interval);

        this._taskListPropertiesDialogSpinButton.connect('value-changed',
            button => this._fillTimeUnitComboBox(button.value));
    }

    /**
     * Fills Gtk.ComboBox with time units.
     *
     * @param {number} interval - Time interval used to update the task list.
     * @param {string} [active] - ID of the active Gtk.ComboBox item.
     */
    _fillTimeUnitComboBox(interval, active = null) {
        const time = new Map([
            [Utils._TIME_UNITS['minutes'], _npgettext(
                'refresh every X minutes(s)', 'minute', 'minutes', interval)],
            [Utils._TIME_UNITS['hours'], _npgettext(
                'refresh every X hour(s)', 'hour', 'hours', interval)],
            [Utils._TIME_UNITS['days'], _npgettext(
                'refresh every X day(s)', 'day', 'days', interval)],
        ]);

        const comboBox = this._taskListPropertiesDialogComboBox;
        active = active !== null ? active : comboBox.active_id;
        comboBox.remove_all();
        time.forEach((label, i) => comboBox.append(`${i}`, label));
        comboBox.set_active_id(active);
    }

    /**
     * Handles closing of the dialog.
     *
     * @param {Gtk.ResponseType} id - Response type id returned after closing
     * the dialog.
     */
    vfunc_response(id) {
        if (id === Gtk.ResponseType.OK) {
            const active = this._taskListPropertiesDialogComboBox.active_id;
            let interval = this._taskListPropertiesDialogSpinButton.value;

            switch (parseInt(active)) {
                case Utils._TIME_UNITS['hours']:
                    interval *= Utils._MINUTES_PER_HOUR;
                    break;
                case Utils._TIME_UNITS['days']:
                    interval *= Utils._MINUTES_PER_DAY;
            }

            this._extension.set_interval_minutes(interval);
            this._source.write_sync(null);
        }

        this.destroy();
    }
});

const SettingsMenuButton = GObject.registerClass({
    GTypeName: 'SettingsMenuButton',
    Template: `resource://${Me.metadata.epath}/settings-menu.ui`,
    InternalChildren: [
        'settingsMenuAbout',
        'settingsMenuSupportLog',
        'settingsMenuHelp',
        'aboutDialog',
        'supportLogDialog',
    ],
}, class SettingsMenuButton extends Gtk.MenuButton {
    /**
     * Initializes the settings menu.
     *
     * @todo xgettext cannot extract translatable strings from JSON files yet,
     * therefore extension name and description in the "About" dialog will
     * not be translated.
     *
     * @param {Gtk.Window} window - Extension settings window.
     */
    _init(window) {
        super._init();

        const modal = window.modal;
        this._aboutDialog.transient_for = window;
        this._aboutDialog.program_name = _(Me.metadata.name);
        this._aboutDialog.version = Me.metadata.version.toString();
        this._aboutDialog.website = Me.metadata.url;
        this._aboutDialog.comments = _(Me.metadata.description);

        this._aboutDialog.translator_credits =
            /* Translators: put down your name/nickname and email (optional)
            according to the format below. This will credit you in the "About"
            window of the extension settings. */
            Gettext.pgettext('translator name <email>', 'translator-credits');

        this._settingsMenuAbout.connect('clicked', () =>
            this._aboutDialog.run());

        this._aboutDialog.connect('response', dialog => dialog.hide());

        this._settingsMenuSupportLog.connect('clicked', () => {
            this._supportLogDialog._time =
                GLib.DateTime.new_now_local().format('%F %T');

            if (modal)
                window.set_modal(false);

            this._supportLogDialog.present();
            this.set_sensitive(false);
        });

        this._supportLogDialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.OK)
                this._generateSupportLog(dialog._time);

            if (modal)
                window.set_modal(true);

            this.set_sensitive(true);
            dialog._time = null;
            dialog.hide();
        });

        this._supportLogDialog.connect('delete-event', () => true);
        window.connect('destroy', () => this._supportLogDialog.destroy());

        this._settingsMenuHelp.connect('clicked', () => Gio.AppInfo
            .launch_default_for_uri_async(Me.metadata.wiki, null, null, null));
    }

    /**
     * Generates the support log. User is notified to remove or censor any
     * information he/she considers to be private.
     *
     * @author Andy Holmes <andrew.g.r.holmes@gmail.com> (the original code was
     * extended to include more data)
     *
     * @param {GLib.DateTime} time - Restricts log entries displayed to those
     * after this time.
     */
    async _generateSupportLog(time) {
        try {
            const gschema = id => new Gio.Settings({
                settings_schema: Gio.SettingsSchemaSource.get_default()
                    .lookup(id, true),
            });

            const [file, stream] = Gio.File.new_tmp('taskwidget.XXXXXX');
            const logFile = stream.get_output_stream();
            const widgetName = `${Me.metadata.name} v${Me.metadata.version}`;

            const iconTheme = gschema('org.gnome.desktop.interface')
                .get_string('icon-theme');

            const gtkTheme = gschema('org.gnome.desktop.interface')
                .get_string('gtk-theme');

            const userType = Me.metadata.locale === 'user-specific' ? 'user'
                : 'system';

            let shellTheme;

            try {
                shellTheme = gschema('org.gnome.shell.extensions.user-theme')
                    .get_string('name');

                if (!shellTheme)
                    throw new Error();
            } catch (e) {
                shellTheme = 'Adwaita (default)';
            }

            const logHeader = widgetName + ' (' + userType + ')\n' +
                GLib.get_os_info('PRETTY_NAME') + '\n' +
                'GNOME Shell ' + imports.misc.config.PACKAGE_VERSION + '\n' +
                'gjs ' + imports.system.version + '\n' +
                'Language: ' + GLib.getenv('LANG') + '\n' +
                'XDG Session Type: ' + GLib.getenv('XDG_SESSION_TYPE') + '\n' +
                'GDM Session Type: ' + GLib.getenv('GDMSESSION') + '\n' +
                'Shell Theme: ' + shellTheme + '\n' +
                'Icon Theme: ' + iconTheme + '\n' +
                'GTK Theme: ' + gtkTheme + '\n\n';

            await Utils._writeBytesAsync(logFile, new GLib.Bytes(logHeader), 0,
                null);

            const process = new Gio.Subprocess({
                flags: Gio.SubprocessFlags.STDOUT_PIPE |
                       Gio.SubprocessFlags.STDERR_MERGE,
                argv: ['journalctl', '--no-host', '--since', time],
            });

            process.init(null);

            logFile.splice_async(process.get_stdout_pipe(),
                Gio.OutputStreamSpliceFlags.CLOSE_TARGET, GLib.PRIORITY_DEFAULT,
                null, (source, result) => {
                    try {
                        source.splice_finish(result);
                    } catch (e) {
                        logError(e);
                    }
                }
            );

            await Utils._waitCheckAsync(process, null);

            Gio.AppInfo.launch_default_for_uri_async(file.get_uri(), null,
                null, null);
        } catch (e) {
            logError(e);
        }
    }
});
