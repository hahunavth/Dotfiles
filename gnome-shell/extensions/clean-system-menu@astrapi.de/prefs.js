'use strict';

const { Gio, Gtk, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
  log(`init ${Me.metadata.name}`);
}

function buildPrefsWidget() {
  log(`create buildPrefsWidget ${Me.metadata.name}`);
  
  this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.clean-system-menu');

  let prefsWidget = new Gtk.Grid({
    margin_top: 18,
    margin_start: 18,
    margin_end: 18,
    margin_bottom: 18,
    column_spacing: 12,
    row_spacing: 12,
    visible: true
  });

  let title = new Gtk.Label({
    label: `<b>Show power button</b>`,
    halign: Gtk.Align.START,
    use_markup: true,
    visible: true
  });
  prefsWidget.attach(title, 0, 0, 1, 1);

  let power_button_visible = new Gtk.Switch({
    active: this.settings.get_boolean ('power-button-visible'),
    hexpand: true,
    halign: Gtk.Align.END,
    visible: true
  });
  prefsWidget.attach(power_button_visible, 1, 0, 1, 1);

  let positionLabel = new Gtk.Label({
    label: 'Position in panel:',
    margin_start: 18,
    halign: Gtk.Align.START,
    visible: true
  });
  prefsWidget.attach(positionLabel, 0, 1, 1, 1);

  let positionBox = new Gtk.Box({
    hexpand: true,
    halign: Gtk.Align.END,
    visible: true
  });
  prefsWidget.attach(positionBox, 1, 1, 1, 1);

  let power_button_position = new Gtk.ComboBoxText({
    margin_end: 18,
    visible: true
  });
  power_button_position.append_text("Left");
  power_button_position.append_text("Center");
  power_button_position.append_text("Right");
  power_button_position.set_active(2);
  positionBox.append(power_button_position);

  let power_button_positionnumber = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 0,
      upper: 99,
      step_increment: 1
    }),
    visible: true
  });
  positionBox.append(power_button_positionnumber);

  let copyright_label = new Gtk.Label({
    use_markup: true,
    label: '<span size="small">'
    + 'Copyright © 2021 Michael Otto (<a href="https://gitlab.gnome.org/astrapi/clean-system-menu">https://gitlab.gnome.org/astrapi/clean-system-menu</a>)'
    + '</span>',
    hexpand: true,
    halign: Gtk.Align.CENTER,
    margin_top: 18
  });
  prefsWidget.attach(copyright_label, 0, 2, 2, 1);

  this.settings.bind('power-button-visible', power_button_visible, 'active', Gio.SettingsBindFlags.DEFAULT);
  this.settings.bind('power-button-position', power_button_position, 'active', Gio.SettingsBindFlags.DEFAULT);
  this.settings.bind('power-button-positionnumber', power_button_positionnumber, 'value', Gio.SettingsBindFlags.DEFAULT);

  power_button_visible.bind_property("active", power_button_position, "sensitive", GObject.BindingFlags.DEFAULT);
  power_button_visible.bind_property("active", power_button_positionnumber, "sensitive", GObject.BindingFlags.DEFAULT);

  if (!this.settings.get_boolean ('power-button-visible')) {
    power_button_position.set_sensitive(false);
    power_button_positionnumber.set_sensitive(false);
  }
  
  return prefsWidget;
}
