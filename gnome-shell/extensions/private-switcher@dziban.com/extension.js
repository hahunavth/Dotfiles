
const St = imports.gi.St;
const Main = imports.ui.main;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;

function init() {
}

function enable() {
	Util.spawnCommandLine("gsettings set org.gnome.shell.app-switcher current-workspace-only true");
}

function disable() {
	Util.spawnCommandLine("gsettings set org.gnome.shell.app-switcher current-workspace-only false");
}

function spawnCommandLine(command_line) {
    try {
        let [success, argv] = GLib.shell_parse_argv(command_line);
        trySpawn(argv);
    } catch (err) {
        _handleSpawnError(command_line, err);
    }
}
