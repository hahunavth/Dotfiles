
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Clutter = imports.gi.Clutter;
const Lang = imports.lang;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Extension.imports.classes.utils;

const CLOSE_ICON = Gio.icon_new_for_string(Extension.path + "/icons/close_icon.png");
const PLAY_ICON = Gio.icon_new_for_string(Extension.path + "/icons/play_icon.png");
const PAUSE_ICON = Gio.icon_new_for_string(Extension.path + "/icons/pause_icon.png");
const RESTART_ICON = Gio.icon_new_for_string(Extension.path + "/icons/restart_icon.png");
const SETTINGS_ICON = Gio.icon_new_for_string(Extension.path + "/icons/settings_icon.png");
const UP_ICON = Gio.icon_new_for_string(Extension.path + "/icons/up_icon.png");
const DOWN_ICON = Gio.icon_new_for_string(Extension.path + "/icons/down_icon.png");

const PROGRESS_BAR_LENGTH = 400;



function Task(task){
  this._init(task);
}
Task.prototype = {
  __proto__: PopupMenu.PopupMenuItem.prototype,
  _init: function(task){
    this.task = task;
    this.isTask = true;
    this.settingsOpen = false;
    PopupMenu.PopupMenuItem.prototype._init.call(this, this.task.name, false);
    this.actor.add_style_class_name("task");
    this.label.add_style_class_name("label");
    this.durationLabel = new St.Label();
    this.durationLabel.add_style_class_name("durationLabel");
    this.durationLabel.text = Utils.convertTime(this.task.lastStop) + " / " + Utils.convertTime(this.task.currTime) + " / " + Utils.convertTime(this.task.time);
    this.actor.add_actor(this.durationLabel);
    var pixels = Math.floor((this.task.currTime / this.task.time) * PROGRESS_BAR_LENGTH);
    this.actor.set_style('background-color:' + this.task.color + '; background-position:' + pixels + 'px 0px;');
    this.connections = [];

    //Set menu buttons
    this.buttonBox = new St.BoxLayout();
    this.buttonBox.set_vertical(false);
    this.buttonBox.add_style_class_name("button-box");
    this.btn_delete = new St.Button({style_class: 'delete_button', label: ''});
    let icon = new St.Icon({icon_size: 12, gicon: CLOSE_ICON, style_class: 'task-buttons'});
    this.btn_delete.add_actor(icon);
    this.btn_play = new St.Button({label: ""});
    icon = new St.Icon({icon_size: 12, gicon: PLAY_ICON, style_class: 'task-buttons'});
    this.btn_play.add_actor(icon);
    this.btn_pause = new St.Button({label: ""});
    icon = new St.Icon({icon_size: 12, gicon: PAUSE_ICON,style_class: 'task-buttons'});
    this.btn_pause.add_actor(icon);
    this.btn_restart = new St.Button({label: ""});
    icon = new St.Icon({icon_size: 12, gicon: RESTART_ICON,style_class: 'task-buttons'});
    this.btn_restart.add_actor(icon);
    this.btn_settings = new St.Button({label: ""});
    icon = new St.Icon({icon_size: 12, gicon: SETTINGS_ICON,style_class: 'task-buttons'});
    this.btn_settings.add_actor(icon);
    this.btn_up = new St.Button({label: ""});
    icon = new St.Icon({gicon: UP_ICON,style_class: 'move-buttons'});
    this.btn_up.add_actor(icon);
    this.btn_down = new St.Button({label: ""});
    icon = new St.Icon({gicon: DOWN_ICON,style_class: 'move-buttons'});
    this.btn_down.add_actor(icon);
    this.moveBox = new St.BoxLayout();
    this.moveBox.add_style_class_name("move-box");
    this.moveBox.set_vertical(true);
    this.moveBox.add_actor(this.btn_up);
    this.moveBox.add_actor(this.btn_down);
    this.buttonBox.add_actor(this.btn_play);
    this.buttonBox.add_actor(this.btn_pause);
    this.buttonBox.add_actor(this.btn_restart);
    this.buttonBox.add_actor(this.btn_delete);
    this.buttonBox.add_actor(this.moveBox);
    this.buttonBox.add_actor(this.btn_settings);
    this.actor.add_actor(this.buttonBox);
    this.btn_pause.hide();
    this.btn_delete.hide();
    this.moveBox.hide();

    //connect buttons to events
    let conn = this.btn_delete.connect('clicked', Lang.bind(this, this._delete_task));
    this.connections.push([this.btn_delete, conn]);
    conn = this.btn_play.connect("clicked", Lang.bind(this, this._startStop));
    this.connections.push([this.btn_play, conn]);
    conn = this.btn_pause.connect("clicked", Lang.bind(this, this._startStop));
    this.connections.push([this.btn_pause, conn]);
    conn = this.btn_restart.connect("clicked", Lang.bind(this, this._restart));
    this.connections.push([this.btn_restart, conn]);
    conn = this.btn_settings.connect("clicked", Lang.bind(this, this._openCloseSettings));
    this.connections.push([this.btn_settings, conn]);
    conn = this.btn_up.connect("clicked", Lang.bind(this, this._moveUp));
    this.connections.push([this.btn_settings, conn]);
    conn = this.btn_down.connect("clicked", Lang.bind(this, this._moveDown));
    this.connections.push([this.btn_settings, conn]);
  },

  _update : function(loop = true){
      var duration = this.task.time;
          this.task.currTime = this.task.currTime + 1;
          this.task.dateTime = new Date();
          this.task.weekdays = Utils.updateWeeklyTimes(this.task.weekdays, (new Date).getDay(), this.task.currTime, this.task.time, this.task.lastStop);
          this.emit('update_signal', this.task);
          this.durationLabel.text = Utils.convertTime(this.task.lastStop) + " / " + Utils.convertTime(this.task.currTime) + " / " + Utils.convertTime(this.task.time);

      if (this.task.currTime == duration){
          Main.notify("Time limit of " + this.task.name + " reached!");
      } else if (this.task.currTime > duration){
          if (this.task.currTime % 2 == 0){
            this.actor.set_style('background-color:' + this.task.color + '; background-position: 400px 0px;');
          } else {
            this.actor.set_style('background-position: 400px 0px;');
          }
      } else {
          var pixels = Math.floor((this.task.currTime / duration) * PROGRESS_BAR_LENGTH);
          this.actor.set_style('background-color:' + this.task.color + '; background-position:' + pixels + 'px 0px;');
      }
      if (loop){
          this._time_count_id = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._update));
      }
  },

  _startStop : function(){
      this.task.running = !this.task.running;
      if(this.task.running){
        this.btn_play.hide();
        this.btn_pause.show();
        this.emit('stop_signal', this.task);
        this._update();
      } else {
        if (this.task.currTime > this.task.time){
            this.actor.set_style('background-color:' + this.task.color + '; background-position: 400px 0px;');
        }
        this.task.lastStop = this.task.currTime;
        this.task.weekdays = Utils.updateWeeklyTimes(this.task.weekdays, (new Date).getDay(), this.task.currTime, this.task.time, this.task.lastStop);
        this.durationLabel.text = Utils.convertTime(this.task.lastStop) + " / " + Utils.convertTime(this.task.currTime) + " / " + Utils.convertTime(this.task.time);
        this.btn_play.show();
        this.btn_pause.hide();
        this.emit('update_signal', this.task);
        Mainloop.source_remove(this._time_count_id);
      }
  },

  _restart : function(){
      this.task.currTime = 0;
      this.task.running = false;
      Mainloop.source_remove(this._time_count_id);
      this._startStop();
  },

  _moveUp : function() {
      this.emit('moveUp_signal', this.task);
  },

  _moveDown : function() {
      this.emit('moveDown_signal', this.task);
  },

  _openCloseSettings : function(){
    if (this.settingsOpen){
      this.emit('closeSettings_signal', this.task);
      this.btn_delete.hide();
      this.moveBox.hide();
      this.btn_restart.show();
      this.btn_play.show();
    } else {
      if (this.task.running){
        this._startStop();
      }
      this.emit('settings_signal', this.task);
      this.moveBox.show();
      this.btn_play.hide();
      this.btn_pause.hide();
      this.btn_restart.hide();
      this.btn_delete.show();
    }
    this.settingsOpen = !this.settingsOpen;
  },

  destroy: function(){
    Mainloop.source_remove(this._time_count_id);
    for (var connection of this.connections.reverse())
        connection[0].disconnect(connection[1]);
    this.connections = null;
    this.actor.destroy();
  },

  _delete_task: function(){
      this.emit('delete_signal', this.task);
      this.destroy();
  }
}
