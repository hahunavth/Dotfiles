
const Main = imports.ui.main;
const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const TaskItem = Extension.imports.classes.task_item;
const Utils = Extension.imports.classes.utils;

const ADD_ICON = Gio.icon_new_for_string(Extension.path + "/icons/add_task_icon.png");

const KEY_RETURN = 65293;
const KEY_ENTER = 65421;
const SECONDS_OF_DAY = 86400;

  function TaskSettings(task, totalTime){
    this._init(task, totalTime);
}

TaskSettings.prototype = {
  __proto__: PopupMenu.PopupMenuSection.prototype,

  _init : function(task, totalTime){
      PopupMenu.PopupMenuSection.prototype._init.call(this);
      this.task = task;
      this.restTime = SECONDS_OF_DAY - totalTime;
      //Set up Boxlayouts for the settings
      this.descriptionBox = new St.BoxLayout({style_class: 'settings-box'});
      this.description = new St.Entry({style_class: 'description-label', text: this.task.description, can_focus: true});
      this.description.hide();
      this.descriptionBtn = new St.Button();
      this.descriptionBtn.connect("clicked", Lang.bind(this, this._clickDescription));
      this.descriptionBox.add_actor(this.descriptionBtn);
      this.descriptionBtn.set_label(Utils.addNewLines(this.task.description));
      this.descriptionBtn.add_style_class_name("description-btn");
      this.descriptionBox.add_actor(this.description);
      this.weeklyLabels = new St.BoxLayout();
      this.weeklyLabels.set_vertical(false);
      this.weeklyLabels.add_style_class_name("settings-box");
      this.weeklyNumbers = new St.BoxLayout();
      this.weeklyNumbers.set_vertical(false);
      this.weeklyNumbers.add_style_class_name("settings-box");
      this.currTimeBox = new St.BoxLayout();
      this.currTimeBox.set_vertical(false);
      this.currTimeBox.add_style_class_name("settings-box");
      this.totalTimeBox = new St.BoxLayout();
      this.totalTimeBox.set_vertical(false);
      this.totalTimeBox.add_style_class_name("settings-box");
      this.newNameBox = new St.BoxLayout();
      //Create view for weekly timeSlider
      let weekLabel = new St.Label({text:_("")});
      weekLabel.add_style_class_name("weekday-header");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Mon")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Tue")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Wed")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Thu")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Fri")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Sat")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Sun")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);
      weekLabel = new St.Label({text:_("Total")});
      weekLabel.add_style_class_name("weekday-label");
      this.weeklyLabels.add_actor(weekLabel);

      let headerLabel = new St.Label({text:_("Current:\nMax:")});
      headerLabel.add_style_class_name("weekday-header");
      this.weeklyNumbers.add_actor(headerLabel);
      this.mondayLabel = new St.Label();
      this.mondayLabel.add_style_class_name("weekday-times");
      this.mondayLabel.text = this.task.weekdays.monday.split("/")[0] + "\n" + this.task.weekdays.monday.split("/")[1];
      this.weeklyNumbers.add_actor(this.mondayLabel);
      this.tuesdayLabel = new St.Label();
      this.tuesdayLabel.add_style_class_name("weekday-times");
      this.tuesdayLabel.text = this.task.weekdays.tuesday.split("/")[0] + "\n" + this.task.weekdays.tuesday.split("/")[1];
      this.weeklyNumbers.add_actor(this.tuesdayLabel);
      this.wednesdayLabel = new St.Label();
      this.wednesdayLabel.add_style_class_name("weekday-times");
      this.wednesdayLabel.text = this.task.weekdays.wednesday.split("/")[0] + "\n" + this.task.weekdays.wednesday.split("/")[1];
      this.weeklyNumbers.add_actor(this.wednesdayLabel);
      this.thursdayLabel = new St.Label();
      this.thursdayLabel.add_style_class_name("weekday-times");
      this.thursdayLabel.text = this.task.weekdays.thursday.split("/")[0] + "\n" + this.task.weekdays.thursday.split("/")[1];
      this.weeklyNumbers.add_actor(this.thursdayLabel);
      this.fridayLabel = new St.Label();
      this.fridayLabel.add_style_class_name("weekday-times");
      this.fridayLabel.text = this.task.weekdays.friday.split("/")[0] + "\n" + this.task.weekdays.friday.split("/")[1];
      this.weeklyNumbers.add_actor(this.fridayLabel);
      this.saturdayLabel = new St.Label();
      this.saturdayLabel.add_style_class_name("weekday-times");
      this.saturdayLabel.text = this.task.weekdays.saturday.split("/")[0] + "\n" + this.task.weekdays.saturday.split("/")[1];
      this.weeklyNumbers.add_actor(this.saturdayLabel);
      this.sundayLabel = new St.Label();
      this.sundayLabel.add_style_class_name("weekday-times");
      this.sundayLabel.text = this.task.weekdays.sunday.split("/")[0] + "\n" + this.task.weekdays.sunday.split("/")[1];
      this.weeklyNumbers.add_actor(this.sundayLabel);
      this.totalLabel = new St.Label();
      this.totalLabel.add_style_class_name("weekday-times");
      this.totalLabel.text = Utils.calcTotal(this.task.weekdays);
      this.weeklyNumbers.add_actor(this.totalLabel);


      // Create Label and slider for current time _onSliderValueChange
      let label = new St.Label({text:_("Current time:")});
      label.add_style_class_name("settings-label");
      this.currTimeSlider = new Slider.Slider(this.task.currTime/(this.restTime));
      this.currTimeSlider.actor.add_style_class_name("time-slider");
      this.currTimeSlider.connect('value-changed', Lang.bind(this, this._onCurrTimeChange));
      this.currTimeBox.add_actor(label);
      this.currTimeBox.add_actor(this.currTimeSlider.actor);
      label = new St.Label({text:_("Total time:")});
      label.add_style_class_name("settings-label");
      this.totalTimeSlider = new Slider.Slider(this.task.time/(this.restTime));
      this.totalTimeSlider.actor.add_style_class_name("time-slider");
      this.totalTimeSlider.connect('value-changed', Lang.bind(this, this._onTotalTimeChange));
      this.totalTimeBox.add_actor(label);
      this.totalTimeBox.add_actor(this.totalTimeSlider.actor);
      this.actor.add_actor((new PopupMenu.PopupSeparatorMenuItem).actor);
      this.actor.add_actor(this.descriptionBox);
      this.actor.add_actor((new PopupMenu.PopupSeparatorMenuItem).actor);
      this.actor.add_actor(this.weeklyLabels);
      this.actor.add_actor(this.weeklyNumbers);
      this.actor.add_actor((new PopupMenu.PopupSeparatorMenuItem).actor);
      this.actor.add_actor(this.currTimeBox);
      this.actor.add_actor(this.totalTimeBox);
      this.actor.add_actor((new PopupMenu.PopupSeparatorMenuItem).actor);

      this.descriptionText = this.description.clutter_text;
      this.descriptionText.connect('key_focus_out', Lang.bind(this, this._changeDescription));
      this.descriptionText.connect('key-press-event', Lang.bind(this, this._enterDescription));
  },

  _clickDescription : function(){
    this.description.show();
    this.descriptionBtn.hide();
  },

  _enterDescription : function(o, e){
    let symbol = e.get_key_symbol();
    if (symbol == KEY_RETURN || symbol == KEY_ENTER) {
      this.description.hide();
      this.descriptionBtn.show();
    }
  },

  _changeDescription : function(){
      this.task.description = this.description.text;
      this.descriptionBtn.set_label(Utils.addNewLines(this.task.description));
      if (this.task.description == ""){
        this.task.description = "Enter description here!";
      }
      this.emit('update_signal', this.task);
  },

  _onCurrTimeChange : function(slider, value){
    let time = Math.floor(value*(this.restTime/60));
    this.task.currTime = time*60;
    this.emit('update_signal', this.task);
    this._updateWeeklyTimes();
  },

  _onTotalTimeChange : function(slider, value){
    let time = Math.floor(value*(this.restTime/60));
    this.task.time = time*60;
    this.emit('update_signal', this.task);
    this._updateWeeklyTimes();
  },

  _updateWeeklyTimes : function(){
      this.mondayLabel.text = this.task.weekdays.monday.split("/")[0] + "\n" + this.task.weekdays.monday.split("/")[1];
      this.tuesdayLabel.text = this.task.weekdays.tuesday.split("/")[0] + "\n" + this.task.weekdays.tuesday.split("/")[1];
      this.wednesdayLabel.text = this.task.weekdays.wednesday.split("/")[0] + "\n" + this.task.weekdays.wednesday.split("/")[1];
      this.thursdayLabel.text = this.task.weekdays.thursday.split("/")[0] + "\n" + this.task.weekdays.thursday.split("/")[1];
      this.fridayLabel.text = this.task.weekdays.friday.split("/")[0] + "\n" + this.task.weekdays.friday.split("/")[1];
      this.saturdayLabel.text = this.task.weekdays.saturday.split("/")[0] + "\n" + this.task.weekdays.saturday.split("/")[1];
      this.sundayLabel.text = this.task.weekdays.sunday.split("/")[0] + "\n" + this.task.weekdays.sunday.split("/")[1];
      this.totalLabel.text = Utils.calcTotal(this.task.weekdays);
  },

  destroy : function() {
      this.descriptionBtn.disconnect('clicked');
      this.currTimeSlider.actor.disconnect('value-changed');
      this.descriptionText.disconnect('key_focus_out');
      this.descriptionText.disconnect('key_press_event');
      this.actor.destroy();
  }

}
