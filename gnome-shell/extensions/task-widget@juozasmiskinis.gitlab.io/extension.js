'use strict';

const { Atk, Clutter, Gio, GLib, GObject, Meta, Pango, Shell, St } = imports.gi;

const CheckBox = imports.ui.checkBox;
const Gettext = imports.gettext;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const DateMenu = Main.panel.statusArea.dateMenu.menu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

let ECal, EDataServer, ICalGLib;

if (Utils._HAS_EDS) {
    ECal = imports.gi.ECal;
    EDataServer = imports.gi.EDataServer;
    ICalGLib = imports.gi.ICalGLib;
}

// eslint-disable-next-line no-redeclare
const _ = Gettext.domain(Me.metadata.base).gettext;

const NC_ = (context, str) => Gettext.domain(Me.metadata.base)
    .pgettext(context, str);

const TaskWidget = GObject.registerClass(
class TaskWidget extends St.BoxLayout {
    /**
     * Initializes the widget.
     */
    _init() {
        super._init({
            name: 'taskWidget',
            // Re-use style classes. We'll do it in multiple places for
            // better compatibility with custom Shell themes:
            style_class: 'datemenu-calendar-column task-widget-column',
            vertical: true,
        });

        this._calendarArea = DateMenu.box.find_child_by_name('calendarArea');
        this._messageList = this._calendarArea.get_child_at_index(0);
        this._calendarWidget = this._calendarArea.get_child_at_index(1);

        this._calendarWidget.add_style_class_name(
            'task-widget-remove-calendar-margin');

        // Set the size of the widget to the size of the message list widget:
        this.add_constraint(new Clutter.BindConstraint({
            source: this._messageList,
            coordinate: Clutter.BindCoordinate.SIZE,
        }));

        this._calendarArea.add_child(this);

        const dir = Me.metadata.schemas === 'user-specific'
            ? Me.dir.get_child('schemas').get_path() : Me.metadata.schemas;

        const gschema = Gio.SettingsSchemaSource.new_from_directory(
            dir, Gio.SettingsSchemaSource.get_default(),
            false);

        this._settings = new Gio.Settings({
            settings_schema: gschema.lookup(Me.metadata.base, true),
        });

        this.connect('destroy', this._onDestroy.bind(this));
        this._buildPlaceholder();
        this._initTaskLists();
    }

    /**
     * Builds and adds a placeholder which is used to display informational and
     * error messages.
     */
    _buildPlaceholder() {
        this._placeholder = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            x_expand: true,
            y_expand: true,
        });

        const labeledIconBox = new St.BoxLayout({
            vertical: true,
            style_class: 'spacing',
        });

        this._taskIcon = new St.Icon({
            gicon: Gio.ThemedIcon.new('checkbox-checked-symbolic'),
            style_class: 'task-icon',
        });

        this._statusLabel = new St.Label({
            text: _('Loading') + Utils._ELLIPSIS_CHAR,
            reactive: true,
        });

        labeledIconBox.add_child(this._taskIcon);
        labeledIconBox.add_child(this._statusLabel);
        this._placeholder.add_child(labeledIconBox);
        this.add_child(this._placeholder);
    }

    /**
     * Initializes task lists.
     *
     * @todo https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/2661
     */
    async _initTaskLists() {
        try {
            this._contentBox = new St.BoxLayout({
                style_class: 'calendar weather-button',
                vertical: true,
            });

            this._contentBox.bind_property('visible', this._placeholder,
                'visible', GObject.BindingFlags.INVERT_BOOLEAN);

            this.add_child(this._contentBox);

            if (!Utils._HAS_EDS) {
                this._showPlaceholderWithStatus('missing-dependencies');
                return;
            }

            // Holds references (`ECal.ClientView`) of all enabled task lists
            // so we can monitor changes in them:
            this._clientViews = new Map();

            // Facilitates lazy loading of tasks:
            this._upperLimit = 0;

            await this._initSourceRegistry();
            await this._storeTaskLists(true);

            this._buildHeader();

            this._scrollView = new St.ScrollView({
                style_class: 'vfade',
                clip_to_allocation: true,
            });

            this._scrollView.vscroll.adjustment.connect('notify::value',
                Utils._debounce(this._onTaskListScrolled.bind(this),
                    100, false));

            this._taskBox = new St.BoxLayout({
                style_class: 'spacing',
                vertical: true,
            });

            this._scrollView.add_actor(this._taskBox);
            this._contentBox.add_child(this._scrollView);

            this._onMenuOpenId = DateMenu.connect('open-state-changed',
                this._onMenuOpen.bind(this));

            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            this._loadThemeHacks(themeContext);

            this._themeChangedId = themeContext.connect('changed',
                this._loadThemeHacks.bind(this));

            this._settingsChangedId = this._settings.connect('changed',
                this._onSettingsChanged.bind(this));

            if (!this._taskLists.length) {
                this._showPlaceholderWithStatus('no-tasks');
                return;
            }

            this._showActiveTaskList(0);
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Builds a header for task lists. The header consists of a task list name
     * and two buttons to switch to either previous or next task list.
     * Switching is also triggered by scrolling a mouse wheel on the header.
     * If there's more than one task list, user can click on the task list name
     * and activate another task list via the popup menu.
     *
     * @todo https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/2661
     */
    _buildHeader() {
        this._headerBox = new St.BoxLayout({
            reactive: true,
            x_expand: true,
        });

        this._headerBox.connect('scroll-event',
            this._onHeaderScrolled.bind(this));

        this._backButton = new St.Button({
            style_class: 'calendar-change-month-back pager-button',
            accessible_name: _('Previous task list'),
            can_focus: true,
        });

        this._backButton.add_actor(new St.Icon({
            icon_name: 'pan-start-symbolic',
        }));

        this._backButton.connect('clicked',
            this._onTaskListSwitched.bind(this, false));

        this._taskListName = new St.Label({
            style_class: 'calendar-month-label task-list-name',
        });

        this._taskListNameArrow = new St.Icon({
            style_class: 'popup-menu-arrow',
            icon_name: 'pan-down-symbolic',
            accessible_role: Atk.Role.ARROW,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const taskListNameBox = new St.BoxLayout({
            style_class: 'spacing',
        });

        taskListNameBox.add_child(this._taskListName);
        taskListNameBox.add_child(this._taskListNameArrow);

        this._taskListNameButton = new St.Button({
            style_class: 'button task-list-name-button',
            reactive: true,
            track_hover: true,
            can_focus: true,
            x_expand: true,
            accessible_name: _('Select task list'),
            accessible_role: Atk.Role.MENU,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            child: taskListNameBox,
        });

        this._taskListMenu = new PopupMenu.PopupMenu(this._taskListNameButton,
            0.5, St.Side.BOTTOM);

        Main.uiGroup.add_actor(this._taskListMenu.actor);
        this._taskListMenu.actor.hide();

        this._taskListNameButton.connect('clicked', () => {
            this._taskListMenu.removeAll();

            for (const [index, taskList] of this._taskLists.entries()) {
                const name = taskList.name.length > 25
                    ? taskList.name.substring(0, 22) + Utils._ELLIPSIS_CHAR
                    : taskList.name;

                const item = new PopupMenu.PopupMenuItem(name);

                if (index === this._activeTaskList && !this._mergeTaskLists)
                    item.setOrnament(PopupMenu.Ornament.DOT);
                else
                    item.setOrnament(PopupMenu.Ornament.NONE);

                item.connect('activate', () => {
                    if (this._mergeTaskLists)
                        delete this._mergeTaskLists;

                    this._resetTaskBox(true);
                    this._showActiveTaskList(index);
                });

                this._taskListMenu.addMenuItem(item);
            }

            const separator = new PopupMenu.PopupSeparatorMenuItem();
            this._taskListMenu.addMenuItem(separator);
            const allTasksItem = new PopupMenu.PopupMenuItem(_('All Tasks'));

            if (this._mergeTaskLists)
                allTasksItem.setOrnament(PopupMenu.Ornament.DOT);

            allTasksItem.connect('activate', () => {
                this._mergeTaskLists = true;
                this._resetTaskBox(true);
                this._showActiveTaskList(this._activeTaskList);
            });

            this._taskListMenu.addMenuItem(allTasksItem);
            this._taskListMenu.toggle();
        });

        this._taskListMenu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen)
                this._taskListNameButton.add_style_pseudo_class('active');
            else
                this._taskListNameButton.remove_style_pseudo_class('active');
        });

        const manager = new PopupMenu.PopupMenuManager(this._taskListNameButton,
            { actionMode: Shell.ActionMode.NONE });

        manager.addMenu(this._taskListMenu);

        this._forwardButton = new St.Button({
            style_class: 'calendar-change-month-forward pager-button',
            accessible_name: _('Next task list'),
            can_focus: true,
        });

        this._forwardButton.add_actor(new St.Icon({
            icon_name: 'pan-end-symbolic',
        }));

        this._forwardButton.connect('clicked',
            this._onTaskListSwitched.bind(this, true));

        this._headerBox.add_child(this._backButton);
        this._headerBox.add_actor(this._taskListNameButton);
        this._headerBox.add_child(this._forwardButton);
        this._contentBox.add_child(this._headerBox);
    }

    /**
     * Initializes the source registry: defines task lists as desired
     * source type and connects signal handlers to monitor for task list
     * additions, removals and changes.
     */
    async _initSourceRegistry() {
        try {
            this._sourceType = EDataServer.SOURCE_EXTENSION_TASK_LIST;
            this._sourceRegistry = await Utils._getSourceRegistry();

            this._taskListAddedId = this._sourceRegistry.connect(
                'source-added', (registry, source) => {
                    if (source.has_extension(this._sourceType))
                        this._onTaskListAdded(registry, source);
                }
            );

            this._taskListRemovedId = this._sourceRegistry.connect(
                'source-removed', (registry, source) => {
                    if (source.has_extension(this._sourceType))
                        this._onTaskListRemoved(registry, source);
                }
            );

            this._taskListChangedId = this._sourceRegistry.connect(
                'source-changed', (registry, source) => {
                    if (source.has_extension(this._sourceType))
                        this._onTaskListChanged(registry, source);
                }
            );
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Stores a list of task list data (UIDs and names) for quick access.
     * Task lists are sorted according to user-defined order.
     *
     * @param {boolean} [cleanup] - Cleanup the settings (remove obsolete task
     * list uids).
     */
    async _storeTaskLists(cleanup = false) {
        try {
            this._taskLists = [];
            const customOrder = this._settings.get_strv('task-list-order');
            const disabled = this._settings.get_strv('disabled-task-lists');
            const sources = this._sourceRegistry.list_sources(this._sourceType);

            const customSort = customOrder.length ? Utils._customSort.bind(
                this, customOrder) : undefined;

            await Promise.all(sources.filter(source => disabled.indexOf(
                source.uid) === -1).map(source => this._onTaskListAdded(null,
                source)));

            this._taskLists.sort(customSort);

            if (cleanup) {
                this._cleanupSettings(disabled, sources.sort(customSort).map(
                    source => source.uid));
            }
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Handles task list addition events and connects signal handlers to
     * monitor for its task additions, removals and changes.
     *
     * @param {EDataServer.SourceRegistry|null} registry - Source registry.
     * @param {EDataServer.Source} source - Task list that got added.
     */
    async _onTaskListAdded(registry, source) {
        try {
            let client;

            if (!this._clientViews.get(source.uid)) {
                // Since `source` is only a descriptor of a data source, we
                // need an `ECal.Client` - interface to access the data itself:
                client = await Utils._getECalClient(source,
                    ECal.ClientSourceType.TASKS, 1);

                // `ECal.ClientView` allows to receive change notifications on
                // task lists, specifically task additions, removals and
                // changes. Tasks can be matched using a specified query - we
                // use `#t` here which matches all tasks:
                const view = await Utils._getECalClientView(client, '#t');

                view._taskAddedId = view.connect('objects-added',
                    this._onTaskEvent.bind(this));

                view._taskRemovedId = view.connect('objects-removed',
                    this._onTaskEvent.bind(this));

                view._taskChangedId = view.connect('objects-modified',
                    this._onTaskEvent.bind(this));

                // Do not report existing tasks as new tasks:
                view.set_flags(ECal.ClientViewFlags.NONE);
                view.start();
                this._clientViews.set(source.uid, view);
            } else {
                client = this._clientViews.get(source.uid).client;
            }

            if (!await this._filterTasks(client))
                return;

            this._taskLists.push({
                uid: source.uid,
                name: source.display_name,
            });

            if (!registry)
                return;

            if (this._activeTaskList === null)
                this._showActiveTaskList(0);
            else
                this._showActiveTaskList(this._activeTaskList);
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Handles task list removal events.
     *
     * @param {EDataServer.SourceRegistry|null} registry - Source registry.
     * @param {EDataServer.Source} source - Task list that got removed.
     */
    _onTaskListRemoved(registry, source) {
        const view = this._clientViews.get(source.uid);
        view.disconnect(view._taskAddedId);
        view.disconnect(view._taskRemovedId);
        view.disconnect(view._taskChangedId);
        view.stop();
        this._clientViews.delete(source.uid);
        const index = this._taskLists.map(i => i.uid).indexOf(source.uid);

        if (index === -1 || !registry)
            return;

        this._taskLists.splice(index, 1);

        if (!this._taskLists.length) {
            this._showPlaceholderWithStatus('no-tasks');
            return;
        }

        this._showActiveTaskList(--this._activeTaskList < 0 ? 0
            : this._activeTaskList);
    }

    /**
     * Handles task list change events.
     *
     * @param {EDataServer.SourceRegistry} _registry - Source registry.
     * @param {EDataServer.Source} source - Task list that got changed.
     */
    _onTaskListChanged(_registry, source) {
        const index = this._taskLists.map(i => i.uid).indexOf(source.uid);
        const taskList = this._taskLists[index];

        if (taskList) {
            taskList.name = source.display_name;
            this._showActiveTaskList(this._activeTaskList);
        }
    }

    /**
     * Handles task events: additions, removals and changes.
     *
     * @param {ECal.ClientView} view - Task list which received the signal.
     */
    async _onTaskEvent(view) {
        try {
            this._resetTaskBox();
            const uid = view.client.source.uid;
            const index = this._taskLists.map(i => i.uid).indexOf(uid);
            const taskList = this._taskLists[index];
            const updated = await this._filterTasks(view.client);

            if (updated && !taskList) {
                // If we need to show a hidden task list (because it's no
                // longer empty or no longer completed):
                if (this._settings.get_boolean('merge-task-lists')) {
                    await this._storeTaskLists();
                } else {
                    this._taskLists.push({
                        uid: view.client.source.uid,
                        name: view.client.source.display_name,
                    });
                }

                this._showActiveTaskList(this._activeTaskList === null
                    ? 0 : this._activeTaskList);
            } else if (!updated && taskList) {
                // If we need to hide a visible task list (because it's now
                // empty or completed):
                this._taskLists.splice(index, 1);

                if (!this._taskLists.length) {
                    this._showPlaceholderWithStatus('no-tasks');
                    return;
                }

                this._showActiveTaskList(--this._activeTaskList < 0 ? 0
                    : this._activeTaskList);
            } else if (updated && taskList) {
                this._showActiveTaskList(this._activeTaskList);
            }
        } catch (e) {
            logError(e);
        }
    }

    /*
     * Creates data structures required to resolve task hierarchy.
     *
     * @param {[string, ECal.Component]} tasks - A list consisting of task
     * list UIDs and task objects.
     */
    _buildTaskMap(tasks) {
        let index = 0;
        let start = 0;
        this._rootTasks = [];
        this._taskUids = new Set();
        this._relatedTo = new Map();
        this._orphanTasks = new Set();

        for (const [taskListUid, task] of tasks.sort(Utils._sortByName).sort(
            Utils._sortByPriority).sort(Utils._sortByDueDate)) {
            if (!task.get_summary())
                continue;

            task._uid = task.get_icalcomponent().get_uid();
            task._tasklist = taskListUid;
            this._taskUids.add(task._uid);

            task._due = task.get_due() ? new Date(task.get_due().get_value()
                .as_timet_with_zone(ECal.util_get_system_timezone()) * 1000)
                : null;

            const related = task.get_icalcomponent().get_first_property(
                ICalGLib.PropertyKind.RELATEDTO_PROPERTY);

            if (related) {
                const parentUid = related.get_value().get_string();
                const parent = this._relatedTo.get(parentUid);
                task._index = index++;

                if (!this._taskUids.has(parentUid))
                    this._orphanTasks.add(parentUid);

                if (parent)
                    parent.push(task);
                else
                    this._relatedTo.set(parentUid, [task]);
            } else {
                task._index = index++;
                this._rootTasks.push(task);
            }

            if (this._taskUids.has(task._uid))
                this._orphanTasks.delete(task._uid);
        }

        // Orphan tasks are subtasks with inaccessible parents. We will add
        // them as root tasks into correct positions:
        for (const parentUid of this._orphanTasks) {
            for (const task of this._relatedTo.get(parentUid)) {
                task._orphan = true;

                if (!this._rootTasks.length) {
                    this._rootTasks.push(task);
                    continue;
                }

                for (let i = start; i < this._rootTasks.length; i++) {
                    if (task._index < this._rootTasks[i]._index) {
                        this._rootTasks.splice(i, 0, task);
                        start = i;
                        break;
                    }

                    if (i === this._rootTasks.length - 1) {
                        this._rootTasks.push(task);
                        break;
                    }
                }
            }

            this._relatedTo.delete(parentUid);
        }
    }

    /**
     * For a given task list, lists tasks as checkboxes with labels and groups
     * them under appropriate group labels in the widget.
     *
     * @todo https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/3100
     *
     * @param {string} uid - Unique task list identifier.
     * @param {boolean} merge - Task lists will be merged into one.
     * @return {Promise<boolean>} `true` if there's at least one task.
     */
    async _listTasks(uid, merge) {
        try {
            let label, prev, tasks;
            const today = new Date();
            this._allTasksLoaded = false;

            // (User-defined) Merge task lists:
            if (merge) {
                const taskLists = await Promise.all(this._taskLists.map(tl =>
                    this._filterTasks(this._clientViews.get(tl.uid).client)));

                if (!taskLists.length || this._idleAddId)
                    return;

                if (this._settings.get_boolean(
                    'hide-empty-completed-task-lists')) {
                    let allCompleted = true;

                    for (const taskList of taskLists) {
                        for (let i = 0; i < taskList.length; i++) {
                            if (taskList[i].get_status() !==
                                ICalGLib.PropertyStatus.COMPLETED) {
                                allCompleted = false;
                                break;
                            }
                        }

                        if (!allCompleted)
                            break;
                    }

                    if (allCompleted) {
                        this._showPlaceholderWithStatus('no-tasks');
                        return;
                    }
                }

                if (taskLists.some(taskList => !taskList))
                    return;

                tasks = [].concat(...taskLists.map((taskList, index) =>
                    taskList.map(task => [this._taskLists[index].uid, task])));
            } else {
                tasks = await this._filterTasks(this._clientViews.get(
                    uid).client);

                if (!tasks || this._idleAddId)
                    return;

                tasks = tasks.map(task => [uid, task]);
            }

            // Dates have time zone information, which can span regions with
            // different day light savings adjustments. To accurately calculate
            // day differences between two dates, we'll use this to convert
            // the dates to UTC first:
            const toUTC = x => Date.UTC(x.getFullYear(), x.getMonth(),
                x.getDate());

            // Builds task checkboxes:
            const buildCheckbox = (task, root = false) => {
                const checkbox = new CheckBox.CheckBox(task.get_summary()
                    .get_value());

                if (task.get_status() === ICalGLib.PropertyStatus.COMPLETED) {
                    checkbox.checked = true;
                    checkbox.getLabelActor().set_opacity(100);
                }

                if (root)
                    checkbox._rootTask = true;

                checkbox._task = task;
                checkbox._uid = task._uid;

                checkbox.getLabelActor().clutter_text.line_wrap_mode =
                    Pango.WrapMode.WORD_CHAR;

                checkbox.connect('clicked', () => this._taskClicked(checkbox,
                    this._clientViews.get(task._tasklist).client));

                if (task._orphan)
                    return styleOrphanTaskCheckbox(checkbox);

                return checkbox;
            };

            // Adds arrows and margins to denote subtasks:
            const styleSubtaskCheckbox = (checkbox, level) => {
                const arrow = new St.Label({
                    accessible_name: _('Beginning of a subtask list'),
                    accessible_role: Atk.Role.ARROW,
                });

                checkbox._arrow = arrow;
                checkbox.child.insert_child_at_index(arrow, 0);

                checkbox.connect('show', widget => {
                    const scaleFactor = St.ThemeContext
                        .get_for_stage(global.stage).scale_factor;

                    const boxWidth = widget._box.get_width() / scaleFactor;

                    const spacing = Math.floor(widget.child.get_theme_node()
                        .get_length('spacing') / scaleFactor);

                    if (this.text_direction === Clutter.TextDirection.RTL) {
                        widget._arrow.set_text('\u21B2');

                        widget._arrow.set_style(`padding-left: ${boxWidth -
                            widget._arrow.get_width() / scaleFactor}px`);

                        widget.set_style(`margin-right: ${--level *
                            (boxWidth + spacing)}px`);
                    } else {
                        widget._arrow.set_text('\u21B3');

                        widget._arrow.set_style(`padding-right: ${boxWidth -
                            widget._arrow.get_width() / scaleFactor}px`);

                        widget.set_style(`margin-left: ${--level *
                            (boxWidth + spacing)}px`);
                    }
                });

                return checkbox;
            };

            // Adds an arrow indicator to denote orphan tasks:
            const styleOrphanTaskCheckbox = checkbox => {
                const indicator = new St.Label({
                    text: '\u2930',
                    y_align: Clutter.ActorAlign.CENTER,
                    style: 'color: coral',
                    /* Translators: this denotes a subtask with an inaccessible
                    parent task. */
                    accessible_name: _('Orphan task'),
                    accessible_role: Atk.Role.ARROW,
                });

                checkbox.child.insert_child_at_index(indicator, 1);
                return checkbox;
            };

            // Creates a due date label:
            const buildDueDateLabel = (due, root = false, orphan = false) => {
                const label = new St.Label({
                    style_class: 'weather-header',
                    x_align: Clutter.ActorAlign.START,
                });

                if (!root)
                    label.add_style_class_name('location');

                if (due === null && root) {
                    label.text = _('No due date');
                } else if (due.toDateString() === today.toDateString()) {
                    label.text = _('Today');
                } else if (due < today && this._settings.get_boolean(
                    'group-past-tasks') && root) {
                    /* Translators: this is a category name for tasks with
                    due date in the past. */
                    label.text = _('Past');

                    if (prev && !orphan)
                        label._skip = true;

                } else {
                    let format = due.getYear() === today.getYear()
                        ? NC_('task due date', '%A, %B %-d')
                        : NC_('task due date with a year', '%A, %B %-d, %Y');

                    format = Shell.util_translate_time_string(format);
                    const diff = toUTC(due) - toUTC(today);

                    label.text = `${due.toLocaleFormat(format)} (${diff > 0
                        ? '+' : '-'}${Math.floor(Math.abs(diff) /
                            Utils._MSECS_IN_DAY)})`;
                }

                return label;
            };

            // Prepends due date to subtasks:
            const prependDueDate = (checkbox, due) => {
                if (!due || checkbox.checked)
                    return checkbox;

                const box = new St.BoxLayout({
                    vertical: true,
                });

                const label = checkbox.child.get_child_at_index(2);
                checkbox.child.remove_child(label);
                box.add_child(buildDueDateLabel(due));
                box.add_child(label);
                checkbox.child.insert_child_at_index(box, 2);
                return checkbox;
            };

            // Adds subtasks:
            const addSubtasks = (parentCheckbox, parentUid, level = 0) => {
                if (!this._idleAddId)
                    return;

                const subtasks = this._relatedTo.get(parentUid);

                if (!subtasks)
                    return;

                for (const [index, subtask] of subtasks.entries()) {
                    let subtaskCheckbox = buildCheckbox(subtask);

                    subtaskCheckbox = styleSubtaskCheckbox(subtaskCheckbox,
                        level + 1);

                    if (parentCheckbox._subtasks)
                        parentCheckbox._subtasks.push(subtaskCheckbox);
                    else
                        parentCheckbox._subtasks = [subtaskCheckbox];

                    subtaskCheckbox._parentCheckbox = parentCheckbox;

                    if (index !== 0)
                        subtaskCheckbox._arrow.set_opacity(0);

                    subtaskCheckbox = prependDueDate(subtaskCheckbox,
                        subtask._due);

                    idleAddHelper(subtaskCheckbox);
                    this._relatedTo.delete(parentUid);
                    addSubtasks(subtaskCheckbox, subtask._uid, level + 1);
                }
            };

            // Facilitates lazy loading of task box items:
            const idleAddHelper = item => {
                if (!this._idleAddId)
                    return;

                const adjustment = this._scrollView.vscroll.adjustment;
                const height = this._taskBox.get_allocation_box().get_height();
                const limit = this._upperLimit + height;

                if (this._currentChild) {
                    const allocation = this._currentChild.allocation;

                    // If task is not above the visible region:
                    if (allocation.y2 >= adjustment.value) {
                        // Quit when task is below the visible region:
                        if (allocation.y1 > adjustment.value + height)
                            return this._resetTaskBox();

                        // For tasks that are in the visible region:
                        this._taskBox.replace_child(this._currentChild, item);
                        this._currentChild = item.get_next_sibling();
                    } else {
                        this._currentChild = this._currentChild
                            .get_next_sibling();

                        return;
                    }

                    if (this._currentChild) {
                        if (this._currentChild.allocation.y1 <= limit) {
                            this._replaceTasksOnGoing = true;
                        } else {
                            this._replaceTasksOnGoing = false;

                            // Clean tasks below the visible region. These are
                            // leftover tasks from previous longer task lists:
                            while (this._currentChild.get_next_sibling())
                                this._currentChild.get_next_sibling().destroy();
                        }
                    }

                } else {
                    this._taskBox.add_child(item);
                    this._replaceTasksOnGoing = false;
                }

                // Load tasks in small portions;
                if (adjustment.upper > limit && !this._replaceTasksOnGoing)
                    return this._resetTaskBox();
            };

            // Adds task checkboxes:
            const idleAdd = () => {
                const task = this._rootTasks[this._currentRootTask++];

                if (!task) {
                    // Clean leftover tasks from previous task lists:
                    while (this._currentChild) {
                        const next = this._currentChild.get_next_sibling();
                        this._currentChild.destroy();
                        this._currentChild = next;
                    }

                    this._allTasksLoaded = true;
                    return this._resetTaskBox();
                }

                const checkbox = buildCheckbox(task, true);
                const due = task._due;

                // If a task belongs to an already created group:
                if ((due === null && due === prev) || (prev && due &&
                    due.toDateString() === prev.toDateString())) {
                    // Simply add the task:
                    idleAddHelper(checkbox);
                } else {
                    // Otherwise, we need a new group label:
                    label = buildDueDateLabel(due, true);

                    if (label._skip) {
                        idleAddHelper(checkbox);
                        addSubtasks(checkbox, task._uid);
                        return GLib.SOURCE_CONTINUE;
                    } else {
                        idleAddHelper(label);
                        idleAddHelper(checkbox);
                        prev = due;
                    }
                }

                addSubtasks(checkbox, task._uid);
                return GLib.SOURCE_CONTINUE;
            };

            this._buildTaskMap(tasks);
            this._currentRootTask = 0;
            this._currentChild = this._taskBox.first_child;

            if (this._currentChild) {
                this._idleAddId = GLib.idle_add(GLib.PRIORITY_LOW, idleAdd);
            } else {
                this._idleAddId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE,
                    idleAdd);
            }

            return true;
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Filters tasks and task lists based on user-defined settings.
     *
     * @param {ECal.Client} client - Task list to perform filtering on.
     * @return {Promise<ECal.Component[]>} List of tasks.
     */
    async _filterTasks(client) {
        try {
            // (User-defined) Hide completed tasks:
            const tasks = this._settings.get_int('hide-completed-tasks')
                ? await Utils._getTasks(client, this._hideCompletedTasks())
                : await Utils._getTasks(client, '#t');

            // (User-defined) Hide empty and completed task lists:
            if (this._settings.get_boolean('hide-empty-completed-task-lists') &&
                !this._settings.get_boolean('merge-task-lists')) {
                if (!tasks.length)
                    return;

                for (const task of tasks) {
                    if (task.get_status() !== ICalGLib.PropertyStatus.COMPLETED)
                        return tasks;
                }

                return;
            }

            return tasks;
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Builds an S-expression to query tasks based on user-defined settings.
     *
     * @returns {string} An S-expression representing the task query.
     */
    _hideCompletedTasks() {
        const current = ICalGLib.Time.new_current_with_zone(
            ICalGLib.Timezone.get_utc_timezone());

        switch (this._settings.get_int('hide-completed-tasks')) {
            case Utils._HIDE_COMPLETED_TASKS['immediately']:
                return '(not is-completed?)';
            case Utils._HIDE_COMPLETED_TASKS['after-time-period']: {
                const adjust = this._settings.get_int('hct-apotac-value');

                switch (this._settings.get_int('hct-apotac-unit')) {
                    case Utils._TIME_UNITS['seconds']:
                        current.adjust(0, 0, 0, -adjust);
                        break;
                    case Utils._TIME_UNITS['minutes']:
                        current.adjust(0, 0, -adjust, 0);
                        break;
                    case Utils._TIME_UNITS['hours']:
                        current.adjust(0, -adjust, 0, 0);
                        break;
                    case Utils._TIME_UNITS['days']:
                        current.adjust(-adjust, 0, 0, 0);
                }

                return `(not (completed-before? (make-time "${
                    ECal.isodate_from_time_t(current.as_timet())}")))`;
            }
            case Utils._HIDE_COMPLETED_TASKS['after-specified-time']: {
                const start = ICalGLib.Time.new_current_with_zone(
                    ECal.util_get_system_timezone());

                start.set_time(0, 0, 0);

                start.convert_timezone(ECal.util_get_system_timezone(),
                    ICalGLib.Timezone.get_utc_timezone());

                const spec = ICalGLib.Time.new_current_with_zone(
                    ECal.util_get_system_timezone());

                spec.set_time(this._settings.get_int('hct-astod-hour'),
                    this._settings.get_int('hct-astod-minute'), 0);

                spec.convert_timezone(ECal.util_get_system_timezone(),
                    ICalGLib.Timezone.get_utc_timezone());

                if (current.compare(spec) === -1) {
                    return `(not (completed-before? (make-time "${
                        ECal.isodate_from_time_t(start.as_timet())}")))`;
                } else {
                    return '(not is-completed?)';
                }
            }
        }
    }

    /**
     * Handles task click events. Adds/removes styling and stores changes.
     *
     * @param {Checkbox} checkbox - Task's checkbox that got clicked.
     * @param {ECal.Client} client - Task list that the task belongs to.
     */
    async _taskClicked(checkbox, client) {
        try {
            const objects = [];

            const processTask = (checkbox, init = false) => {
                const label = checkbox.getLabelActor();
                const task = checkbox._task;

                if (checkbox.checked) {
                    label.set_opacity(100);

                    if (Utils._shellVersionAtLeast(38)) {
                        ECal.util_mark_task_complete_sync(
                            task.get_icalcomponent(), -1, client, null);
                    } else {
                        task.set_status(ICalGLib.PropertyStatus.COMPLETED);
                        task.set_percent_complete(100);

                        task.set_completed(ICalGLib.Time.new_current_with_zone(
                            ICalGLib.Timezone.get_utc_timezone()));
                    }
                } else {
                    label.set_opacity(255);
                    task.set_status(ICalGLib.PropertyStatus.NEEDSACTION);
                    task.set_percent_complete(0);
                    task.set_completed(null);
                }

                objects.push(task.get_icalcomponent());

                if (init)
                    resolveHierarchy(checkbox);
            };

            const resolveHierarchy = checkbox => {
                if (checkbox.checked) {
                    if (!checkbox._subtasks)
                        return;

                    for (const subtaskCheckbox of checkbox._subtasks) {
                        subtaskCheckbox.set_checked(true);
                        processTask(subtaskCheckbox);
                        resolveHierarchy(subtaskCheckbox);
                    }
                } else {
                    if (!checkbox._parentCheckbox)
                        return;

                    checkbox._parentCheckbox.set_checked(false);
                    processTask(checkbox._parentCheckbox);
                    resolveHierarchy(checkbox._parentCheckbox);
                }
            };

            processTask(checkbox, true);

            const backend = client.source.get_extension(this._sourceType)
                .get_backend_name();

            // Google Tasks API prohibits from unchecking a subtask if parent
            // task is completed. We can circumvent this by handling the
            // parent task first:
            if (backend === 'gtasks')
                objects.sort(task => task._subtasks ? -1 : 1);

            await Utils._modifyObjects(client, objects, ECal.ObjModType.THIS,
                ECal.OperationFlags.NONE, null);
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Either sets and shows the active task list or shows the placeholder.
     *
     * @param {number|null} index - Index of the task list to activate or
     * `null` to show the placeholder instead.
     */
    async _showActiveTaskList(index) {
        try {
            this._activeTaskList = index;

            if (!DateMenu.isOpen && index !== null || this._idleAddId)
                return;

            const taskList = this._taskLists[index];

            if (taskList) {
                if (!this._contentBox.visible)
                    this._contentBox.show();

                const merge = this._settings.get_boolean('merge-task-lists') ||
                    this._mergeTaskLists;

                this._taskListName.set_text(merge ? _('All Tasks')
                    : taskList.name);

                this._setHeader();

                if (!await this._listTasks(taskList.uid, merge)) {
                    Utils._debounce(this._showActiveTaskList.bind(this),
                        100, false)(this._activeTaskList);
                }
            } else if (this._contentBox.visible) {
                this._contentBox.hide();
            }
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Sets placeholder appearance and text.
     *
     * @param {string} status - String to differentiate between various
     * statuses of the placeholder.
     */
    _showPlaceholderWithStatus(status) {
        this._taskLists = [];
        this._showActiveTaskList(null);

        switch (status) {
            case 'no-tasks':
                this._taskIcon.set_gicon(Gio.ThemedIcon.new(
                    'checkbox-checked-symbolic'));

                this._statusLabel.set_text(_('No Tasks'));
                break;
            case 'missing-dependencies': {
                this._taskIcon.set_gicon(Gio.ThemedIcon.new(
                    'dialog-error-symbolic'));

                this._statusLabel.set_text(_('Error: Missing Dependencies'));
                this._statusLabel.add_style_class_name('url-highlighter');

                this._statusLabel.connect('style-changed', () => {
                    const [hasColor, color] = this._statusLabel.get_theme_node()
                        .lookup_color('link-color', false);

                    this._statusLabel.set_style(`color: ${hasColor
                        ? color.to_string().substr(0, 7) : '#629fea'};
                        text-decoration: underline`);
                });

                this._statusLabel.connect('motion-event', () => {
                    global.display.set_cursor(Meta.Cursor.POINTING_HAND);
                    return Clutter.EVENT_PROPAGATE;
                });

                this._statusLabel.connect('leave-event', () => {
                    global.display.set_cursor(Meta.Cursor.DEFAULT);
                    return Clutter.EVENT_PROPAGATE;
                });

                this._statusLabel.connect('button-release-event', () => {
                    Gio.app_info_launch_default_for_uri(
                        Me.metadata.wiki,
                        global.create_app_launch_context(0, -1));

                    DateMenu.close();
                    return Clutter.EVENT_STOP;
                });
            }
        }
    }

    /**
     * Handles switching bewtween task lists in the task list header.
     *
     * @param {boolean} next - Show the next task list in the list.
     * @param {St.Button} button - Associated button.
     */
    _onTaskListSwitched(next, button) {
        let i = this._activeTaskList;

        if (next)
            i = ++i % this._taskLists.length;
        else if (i === 0)
            i = this._taskLists.length - 1;
        else
            i = --i;

        if (this._mergeTaskLists)
            delete this._mergeTaskLists;

        this._taskListMenu.close();
        button.grab_key_focus();
        this._resetTaskBox(true);
        this._showActiveTaskList(i);
    }

    /**
     * Task lists may have a lot of tasks. Loading them all in the widget may
     * noticeably delay the appearance of the top menu. To prevent that, we'll
     * do a lazy loading of tasks: initially only a small portion of them will
     * be loaded. The remaining ones will appear when user scrolls down.
     * This function allows to increase the upper adjustment of the vertical
     * scrollbar if that scrollbar is close to the end of the scrolled window.
     * That in turn will allow to load more tasks.
     *
     * @param {St.Adjustment} adjustment - Vertical scrollbar adjustment.
     */
    _onTaskListScrolled(adjustment) {
        if (this._allTasksLoaded || this._idleAddId || adjustment.value === 0)
            return;

        const height = this._taskBox.allocation.get_height();

        if (adjustment.upper - adjustment.value - height < 100) {
            this._upperLimit += height;
            this._showActiveTaskList(this._activeTaskList);
        }
    }

    /**
     * Sets task list header appearance.
     */
    _setHeader() {
        const singular = this._taskLists.length === 1 || this._settings
            .get_boolean('merge-task-lists');

        if (singular) {
            this._backButton.hide();
            this._forwardButton.hide();
            this._taskListNameArrow.hide();
            this._taskListNameButton.remove_style_class_name('button');
            this._taskListNameButton.set_reactive(false);
        } else {
            this._backButton.show();
            this._forwardButton.show();
            this._taskListNameArrow.show();
            this._taskListNameButton.add_style_class_name('button');
            this._taskListNameButton.set_reactive(true);
        }

        if (!singular || !this._settings.get_boolean(
            'hide-header-for-singular-task-lists'))
            this._headerBox.show();
        else
            this._headerBox.hide();
    }

    /**
     * Stops on-going `GLib.idle_add` operations and resets vertical scrollbar
     * adjustment.
     *
     * @param {boolean} fullReset - Reset vertical scrollbar adjustment.
     */
    _resetTaskBox(fullReset = false) {
        if (this._idleAddId) {
            GLib.source_remove(this._idleAddId);
            delete this._idleAddId;
        }

        if (!fullReset)
            return;

        if (this._upperLimit)
            this._scrollView.vscroll.adjustment.set_values(0, 0, 0, 0, 0, 0);

        this._upperLimit = 0;
    }

    /**
     * Handles scroll events on the task list header.
     *
     * @param {Clutter.Actor} _actor - Actor the event is associated to.
     * @param {Clutter.Event} event - Holds information about the event.
     * @return {boolean} `false` to continue the propagation of the event.
     */
    _onHeaderScrolled(_actor, event) {
        if (this._taskLists.length !== 1 &&
            !this._settings.get_boolean('merge-task-lists')) {
            switch (event.get_scroll_direction()) {
                case Clutter.ScrollDirection.DOWN:
                case Clutter.ScrollDirection.RIGHT:
                    this._onTaskListSwitched(true, this._forwardButton);
                    break;
                case Clutter.ScrollDirection.UP:
                case Clutter.ScrollDirection.LEFT:
                    this._onTaskListSwitched(false, this._backButton);
                    break;
            }

            return Clutter.EVENT_PROPAGATE;
        }
    }

    /**
     * Performs some styling tricks to improve compatibility with custom
     * Shell themes.
     *
     * @param {St.ThemeContext} context - Holds styling information.
     */
    _loadThemeHacks(context) {
        // Swap left and right margins for `contentBox` (because task
        // widget layout is a mirorr image of the message list layout):
        const [t, r, b, l] = [St.Side.TOP, St.Side.RIGHT, St.Side.BOTTOM,
            St.Side.LEFT].map(side => this._messageList._sectionList
            .get_theme_node().get_margin(side) / context.scale_factor);

        this._contentBox.set_style(`margin: ${t}px ${l}px ${b}px ${r}px`);
    }

    /**
     * Task list events may happen when the extension is disabled. In such
     * state, removing one or more task lists will not remove their uids from
     * extension settings. This method runs every time the extension loads and
     * removes such obsolete uids.
     *
     * @param {string[]} disabled - List of disabled task lists.
     * @param {string[]} uids - List of task list uids ordered according to
     * custom user-defined order.
     */
    _cleanupSettings(disabled, uids) {
        if (disabled.length) {
            this._settings.set_strv('disabled-task-lists', disabled.filter(
                list => uids.indexOf(list) !== -1));
        }

        if (this._settings.get_strv('task-list-order').length)
            this._settings.set_strv('task-list-order', uids);

        Gio.Settings.sync();
    }

    /**
     * Shows the active task list whenever user opens the menu. Additionally,
     * initiates updates of the widget every 2 seconds (no remote calls, local
     * data only) if the following three conditions are true: the menu is kept
     * open, hiding of completed tasks is time dependent and the number of
     * occurred refreshes is <= 60.
     *
     * @param {Object|null} _menu - Menu of a `dateMenu` button.
     * @param {boolean} isOpen - Menu is in its opened state.
     */
    _onMenuOpen(_menu, isOpen) {
        if (isOpen && this._activeTaskList !== null) {
            let i = 0;
            this._showActiveTaskList(this._activeTaskList);
            const hct = this._settings.get_int('hide-completed-tasks');

            if (Utils._HIDE_COMPLETED_TASKS_IS_TIME_DEPENDENT(hct)) {
                this._refreshTimeoutId = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT, 2, () => {
                        if (!this._idleAddId)
                            this._showActiveTaskList(this._activeTaskList);

                        if (i++ < 60 && this._activeTaskList !== null)
                            return GLib.SOURCE_CONTINUE;
                        else
                            this._onMenuOpen(null, false);
                    }
                );
            }
        } else if (!isOpen) {
            if (this._refreshTimeoutId) {
                GLib.source_remove(this._refreshTimeoutId);
                delete this._refreshTimeoutId;
            }

            delete this._rootTasks;
            delete this._orphanTasks;
            delete this._taskUids;
            this._resetTaskBox(true);
        }
    }

    /**
     * Updates the widget when extension settings change.
     */
    async _onSettingsChanged() {
        try {
            const active = this._taskLists[this._activeTaskList]
                ? this._taskLists[this._activeTaskList].uid : null;

            await this._storeTaskLists();

            if (!this._taskLists.length) {
                this._showPlaceholderWithStatus('no-tasks');
                return;
            }

            // If enabled task list is the only visible task list, show it:
            if (!this._contentBox.visible) {
                this._showActiveTaskList(0);
            } else {
                // Otherwise, either refresh the current active task list or,
                // if active task list is not visible anymore (i.e. we hid it),
                // show the first task list in the list of visible task lists:
                const index = this._taskLists.map(i => i.uid).indexOf(active);
                this._showActiveTaskList(index !== -1 ? index : 0);
            }
        } catch (e) {
            logError(e);
        }
    }

    /**
     * Cleanup.
     */
    _onDestroy() {
        if (this._calendarWidget.has_style_class_name(
            'task-widget-remove-calendar-margin')) {
            this._calendarWidget.remove_style_class_name(
                'task-widget-remove-calendar-margin');
        }

        if (this._taskListMenu && this._taskListMenu.actor.get_parent() ===
            Main.uiGroup)
            Main.uiGroup.remove_child(this._taskListMenu.actor);

        if (this._themeChangedId) {
            St.ThemeContext.get_for_stage(global.stage).disconnect(
                this._themeChangedId);
        }

        if (this._settingsChangedId)
            this._settings.disconnect(this._settingsChangedId);

        if (this._refreshTimeoutId)
            GLib.source_remove(this._refreshTimeoutId);

        if (this._idleAddId)
            GLib.source_remove(this._idleAddId);

        if (this._onMenuOpenId)
            DateMenu.disconnect(this._onMenuOpenId);

        if (this._taskListAddedId)
            this._sourceRegistry.disconnect(this._taskListAddedId);

        if (this._taskListRemovedId)
            this._sourceRegistry.disconnect(this._taskListRemovedId);

        if (this._taskListChangedId)
            this._sourceRegistry.disconnect(this._taskListChangedId);

        if (this._clientViews) {
            for (const [, view] of this._clientViews)
                this._onTaskListRemoved(null, view.client.source);
        }
    }
});

let _widget;

function enable() {
    _widget = new TaskWidget();
}

function disable() {
    _widget.destroy();
    _widget = null;
}

function init() {
    const dir = Me.metadata.locale === 'user-specific'
        ? Me.dir.get_child('locale').get_path() : Me.metadata.locale;

    Gettext.bindtextdomain(Me.metadata.base, dir);
}
