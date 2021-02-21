'use strict';

const { Gio, GLib } = imports.gi;

var _debounceTimeoutId;
var _HAS_EDS = true;
var _ELLIPSIS_CHAR = '\u2026';
var _MINUTES_PER_HOUR = 60;
var _MINUTES_PER_DAY = _MINUTES_PER_HOUR * 24;
var _MSECS_IN_DAY = _MINUTES_PER_DAY * 60 * 1000;

let ECal, EDataServer, ICalGLib;

try {
    ECal = imports.gi.ECal;
    EDataServer = imports.gi.EDataServer;
    ICalGLib = imports.gi.ICalGLib;
} catch (e) {
    _HAS_EDS = false;
}

var _TIME_UNITS = {
    'seconds': 0,
    'minutes': 1,
    'hours': 2,
    'days': 3,
};

var _HIDE_COMPLETED_TASKS = {
    'never': 0,
    'immediately': 1,
    'after-time-period': 2,
    'after-specified-time': 3,
};

var _HIDE_COMPLETED_TASKS_IS_TIME_DEPENDENT = value => {
    return [_HIDE_COMPLETED_TASKS['after-time-period'],
        _HIDE_COMPLETED_TASKS['after-specified-time']].includes(value);
};

/**
 * Gets the source registry.
 *
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<EDataServer.SourceRegistry>} Source registry.
 */
function _getSourceRegistry(cancellable = null) {
    return new Promise((resolve, reject) => {
        EDataServer.SourceRegistry.new(cancellable, (_registry, res) => {
            try {
                resolve(EDataServer.SourceRegistry.new_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Gets the interface to access and modify calendar sources (including task
 * lists).
 *
 * @param {EDataServer.Source} source - Data source.
 * @param {ECal.ClientSourceType} type - Source type of the calendar.
 * @param {number} wait - Timeout, in seconds, to wait for the backend to be
 * fully connected.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<ECal.Client>} `ECal.Client` of the source.
 */
function _getECalClient(source, type, wait, cancellable = null) {
    return new Promise((resolve, reject) => {
        ECal.Client.connect(source, type, wait, cancellable, (_source, res) => {
            try {
                resolve(ECal.Client.connect_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Gets the interface to receive notifications on calendar sources (including
 * task lists).
 *
 * @param {ECal.Client} client - `ECal.Client` of the source.
 * @param {string} query - An S-expression representing the query.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<ECal.ClientView>} `ECal.ClientView` of the source.
 */
function _getECalClientView(client, query, cancellable = null) {
    return new Promise((resolve, reject) => {
        client.get_view(query, cancellable, (client, res) => {
            try {
                resolve(client.get_view_finish(res)[1]);
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Refreshes collection backend for a source. In case of task lists, this
 * would refresh the account those task lists belong to, to retrieve, delete or
 * change remote task lists.
 *
 * @param {ECal.SourceRegistry} registry - Source registry
 * @param {str} uid - UID of a collection source whose backend to refresh.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<boolean>} `true` if no errors occurred.
 */
function _refreshBackend(registry, uid, cancellable = null) {
    return new Promise((resolve, reject) => {
        registry.refresh_backend(uid, cancellable, (registry, res) => {
            try {
                resolve(registry.refresh_backend_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Refreshes a source. In case of task lists, this would refresh its task
 * content.
 *
 * @param {EDataServer.Client} client - `EDataServer.Client` of a source.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<boolean>} `true` if no errors occurred.
 */
function _refreshClient(client, cancellable = null) {
    return new Promise((resolve, reject) => {
        client.refresh(cancellable, (client, res) => {
            try {
                resolve(client.refresh_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Gets a list of objects from the calendar that match the specified query. In
 * the case of task lists, this would get the tasks of a given task list.
 *
 * @param {ECal.Client} client - `ECal.Client` of a source.
 * @param {str} query - An S-expression representing the query.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<ECal.Component[]>} A list of objects.
 */
function _getTasks(client, query, cancellable = null) {
    return new Promise((resolve, reject) => {
        client.get_object_list_as_comps(query, cancellable, (client, res) => {
            try {
                resolve(client.get_object_list_as_comps_finish(res)[1]);
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Requests the calendar backend to modify existing objects. In the case of
 * task lists, this would modify given tasks.
 *
 * @param {ECal.Client} client - `ECal.Client` of a source.
 * @param {ICalGLib.Component[]} obj - Components to modify.
 * @param {ECal.ObjModType} mod - Type of modification.
 * @param {int} flag - bit-or of `ECal.OperationFlags`.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<boolean>} `true` if no errors occurred.
 */
function _modifyObjects(client, obj, mod, flag, cancellable = null) {
    return new Promise((resolve, reject) => {
        client.modify_objects(obj, mod, flag, cancellable, (client, res) => {
            try {
                resolve(client.modify_objects_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Sorts task lists according to the given order of their uids. If task list
 * uid is not in the list, move it to the end of the list.
 *
 * @param {string[]} order - A list of task list uids.
 * @param {Object} a - Task list object.
 * @param {Object} b - Task list object.
 * @return {int} Negative, zero or positive value to facilitate sorting.
 */
function _customSort(order, a, b) {
    if (order.indexOf(a.uid) === -1)
        return 1;

    if (order.indexOf(b.uid) === -1)
        return -1;

    return order.indexOf(a.uid) - order.indexOf(b.uid);
}

/**
 * Sorts tasks by their name.
 * @param {[string, ECal.Component]} a - A list consisting of task list UIDs
 * and task objects.
 * @param {[string, ECal.Component]} b - A list consisting of task list UIDs
 * and task objects.
 * @return {int} Negative, zero or positive value to facilitate sorting.
 */
function _sortByName(a, b) {
    const lc = x => x[1].get_summary().get_value().toLowerCase();

    if (a[1].get_summary() === null)
        return 1;

    if (b[1].get_summary() === null)
        return -1;

    return lc(a).localeCompare(lc(b));
}

/**
 * Sorts tasks by their due date. If a task has no due date, move it to the
 * end of the list.
 *
 * @param {[string, ECal.Component]} a - A list consisting of task list UIDs
 * and task objects.
 * @param {[string, ECal.Component]} b - A list consisting of task list UIDs
 * and task objects.
 * @return {int} Negative, zero or positive value to facilitate sorting.
 */
function _sortByDueDate(a, b) {
    const time = x => x[1].get_due().get_value().as_timet();

    if (b[1].get_due() === null)
        return -1;

    if (a[1].get_due() === null)
        return 1;

    return time(a) - time(b);
}

/**
 * Sorts tasks by their priority. If a task has no priority, move it to the
 * end of the list.
 *
 * @param {[string, ECal.Component]} a - A list consisting of task list UIDs
 * and task objects.
 * @param {[string, ECal.Component]} b - A list consisting of task list UIDs
 * and task objects.
 * @return {int} Negative, zero or positive value to facilitate sorting.
 */
function _sortByPriority(a, b) {
    const priority = x => x[1].get_priority();

    if (priority(b) < 1)
        return -1;

    if (priority(a) < 1)
        return 1;

    return priority(a) - priority(b);
}

/**
 * Requests an asynchronous write of bytes into the stream.
 *
 * @param {Gio.OutputStream} output - Stream to write bytes to.
 * @param {ByteArray} bytes - The bytes to write.
 * @param {number} priority - The io priority of the request.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<number>} Number of bytes written to the stream.
 */
function _writeBytesAsync(output, bytes, priority, cancellable = null) {
    return new Promise((resolve, reject) => {
        output.write_bytes_async(bytes, priority, cancellable, (file, res) => {
            try {
                resolve(file.write_bytes_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Waits for the subprocess to terminate and checks its exit status.
 *
 * @param {Gio.Subprocess} process - Process.
 * @param {Gio.Cancellable} [cancellable] - Cancellable object.
 * @return {Promise<boolean>} `true` if successful.
 */
function _waitCheckAsync(process, cancellable = null) {
    return new Promise((resolve, reject) => {
        process.wait_check_async(cancellable, (process, result) => {
            try {
                if (!process.wait_check_finish(result)) {
                    const status = process.get_exit_status();

                    throw new Gio.IOErrorEnum({
                        code: Gio.io_error_from_errno(status),
                        message: GLib.strerror(status),
                    });
                }

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * A simple debounce function. Returns a function, that, as long as it
 * continues to be invoked, will not be triggered. The function will be called
 * after it stops being called for `wait` milliseconds.
 *
 * @param {function} func - Function to debounce.
 * @param {number} wait - Milliseconds to wait before calling the function.
 * @param {boolean} [immediate] - If true, trigger the function on the
 * leading edge, instead of the trailing.
 * @return {function} The `func` function with all its arguments.
 */
function _debounce(func, wait, immediate = false) {
    return (...args) => {
        const later = () => {
            _debounceTimeoutId = 0;

            if (!immediate)
                func(...args);
        };

        if (_debounceTimeoutId)
            GLib.source_remove(_debounceTimeoutId);

        _debounceTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT,
            wait, later);

        if (immediate && !_debounceTimeoutId)
            func(...args);
    };
}

/**
 * Checks if running GNOME Shell version is at least `required`.
 *
 * @param {number} required - Lower bound for required GNOME Shell version.
 * @return {boolean} `true` if GNOME Shell version is at least `required`.
 */
function _shellVersionAtLeast(required) {
    const [major, minor] = imports.misc.config.PACKAGE_VERSION.split('.');
    return parseInt(minor ? minor : major) >= required;
}
