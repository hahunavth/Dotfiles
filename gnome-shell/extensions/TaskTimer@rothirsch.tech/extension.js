const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
//const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
const Shell = imports.gi.Shell;
const Util = imports.misc.util;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const task_timer = Extension.imports.classes.task_timer;

let newTaskMenu;
function init()  {
}

function enable()  {
  taskTimer = new task_timer.TaskTimer();
  Main.panel.addToStatusArea('taskTimer', taskTimer);
}

function disable()  {
  taskTimer.disable();
  taskTimer.destroy();
  taskTimer = null;
}
