'use strict';

/* exported init buildPrefsWidget createPrefsWidgetClass */

const { GObject, Gio, Gtk } = imports.gi;

const PALETTE_SIZE = 16;

function palette_widget_id(i) {
    return `palette${i}`;
}

function palette_widgets() {
    const widgets = [];

    for (let i = 0; i < PALETTE_SIZE; i++)
        widgets.push(palette_widget_id(i));

    return widgets;
}

function accelerator_parse(accel) {
    const parsed = Gtk.accelerator_parse(accel);

    if (Gtk.get_major_version() === 3)
        return parsed;

    return parsed.slice(1);
}

function createPrefsWidgetClass(resource_path, util) {
    const cls = GObject.registerClass(
        {
            Template: resource_path.get_child(`prefs-gtk${Gtk.get_major_version()}.ui`).get_uri(),
            Children: [
                'font_chooser',
                'custom_font_check',
                'opacity_adjustment',
                'accel_renderer',
                'shortcuts_list',
                'spawn_custom_command',
                'custom_command_entry',
                'limit_scrollback_check',
                'scrollback_adjustment',
                'scrollback_spin',
                'text_blink_mode_combo',
                'cursor_blink_mode_combo',
                'cursor_shape_combo',
                'foreground_color',
                'background_color',
                'bold_color',
                'cursor_foreground_color',
                'cursor_background_color',
                'highlight_foreground_color',
                'highlight_background_color',
                'bold_color_check',
                'color_scheme_editor',
                'color_scheme_combo',
                'palette_combo',
                'theme_variant_combo',
                'tab_policy_combo',
                'backspace_binding_combo',
                'delete_binding_combo',
                'ambiguous_width_combo',
                'reset_compatibility_button',
                'tab_title_template_buffer',
                'reset_tab_title_button',
                'window_type_hint_combo',
                'window_height_adjustment',
            ].concat(palette_widgets()),
            Properties: {
                'settings': GObject.ParamSpec.object('settings', '', '', GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY, Gio.Settings),
            },
        },
        class PrefsWidget extends Gtk.Box {
            _init(params) {
                super._init(params);

                const actions = Gio.SimpleActionGroup.new();
                this.insert_action_group('settings', actions);

                [
                    'window-above',
                    'window-stick',
                    'window-skip-taskbar',
                    'hide-when-focus-lost',
                    'hide-window-on-esc',
                    'pointer-autohide',
                    'force-x11-gdk-backend',
                    'tab-expand',
                    'tab-close-buttons',
                    'new-tab-button',
                    'new-tab-front-button',
                    'tab-switcher-popup',
                    'allow-hyperlink',
                    'audible-bell',
                    'cursor-colors-set',
                    'highlight-colors-set',
                    'use-theme-colors',
                    'bold-is-bright',
                    'command',
                    'show-scrollbar',
                    'scroll-on-output',
                    'scroll-on-keystroke',
                    'shortcuts-enabled',
                    'window-resizable',
                    'detect-urls',
                ].forEach(
                    key => actions.add_action(this.settings.create_action(key))
                );

                this.settings_bind('theme-variant', this.theme_variant_combo, 'active-id');
                this.settings_bind('window-type-hint', this.window_type_hint_combo, 'active-id');
                this.settings_bind('tab-policy', this.tab_policy_combo, 'active-id');
                this.settings_bind('tab-title-template', this.tab_title_template_buffer, 'text');
                this.signal_connect(this.reset_tab_title_button, 'clicked', () => {
                    this.settings.reset('tab-title-template');
                });

                this.settings_bind('custom-font', this.font_chooser, 'font');
                this.settings_bind('use-system-font', this.custom_font_check, 'active', Gio.SettingsBindFlags.INVERT_BOOLEAN);
                this.bind_sensitive('use-system-font', this.font_chooser.parent, true);
                this.settings_bind('text-blink-mode', this.text_blink_mode_combo, 'active-id');
                this.settings_bind('cursor-blink-mode', this.cursor_blink_mode_combo, 'active-id');
                this.settings_bind('cursor-shape', this.cursor_shape_combo, 'active-id');

                this.bind_color('foreground-color', this.foreground_color);
                this.bind_color('background-color', this.background_color);

                this.bind_color('bold-color', this.bold_color);
                this.settings_bind('bold-color-same-as-fg', this.bold_color_check, 'active', Gio.SettingsBindFlags.INVERT_BOOLEAN);
                this.bind_sensitive('bold-color-same-as-fg', this.bold_color.parent, true);

                this.bind_color('cursor-foreground-color', this.cursor_foreground_color);
                this.bind_color('cursor-background-color', this.cursor_background_color);
                this.bind_sensitive('cursor-colors-set', this.cursor_foreground_color.parent);
                this.bind_sensitive('cursor-colors-set', this.cursor_background_color.parent);

                this.bind_color('highlight-foreground-color', this.highlight_foreground_color);
                this.bind_color('highlight-background-color', this.highlight_background_color, 'highlight-colors-set');
                this.bind_sensitive('highlight-colors-set', this.highlight_foreground_color.parent);
                this.bind_sensitive('highlight-colors-set', this.highlight_background_color.parent);

                this.settings_bind('background-opacity', this.opacity_adjustment, 'value');
                this.settings_bind('window-height', this.window_height_adjustment, 'value');

                this.bind_sensitive('use-theme-colors', this.color_scheme_editor, true);

                this.setting_color_scheme = false;
                this.method_handler(this.settings, 'changed::foreground-color', this.update_builtin_color_scheme);
                this.method_handler(this.settings, 'changed::background-color', this.update_builtin_color_scheme);
                this.update_builtin_color_scheme();
                this.method_handler(this.color_scheme_combo, 'changed', this.set_builtin_color_scheme);

                this.method_handler(this.settings, 'changed::palette', this.load_palette_from_settings);
                this.load_palette_from_settings();
                this.method_handler(this.palette_combo, 'changed', this.load_builtin_palette);

                for (let i = 0; i < PALETTE_SIZE; i++)
                    this.method_handler(this.palette_widget(i), 'color-set', this.edit_palette);

                this.settings_bind('custom-command', this.custom_command_entry, 'text');
                this.spawn_custom_command.bind_property('active', this.custom_command_entry.parent, 'sensitive', GObject.BindingFlags.SYNC_CREATE);

                this.settings_bind('scrollback-unlimited', this.limit_scrollback_check, 'active', Gio.SettingsBindFlags.INVERT_BOOLEAN);
                this.settings_bind('scrollback-lines', this.scrollback_adjustment, 'value');
                this.bind_sensitive('scrollback-unlimited', this.scrollback_spin.parent, true);

                this.settings_bind('backspace-binding', this.backspace_binding_combo, 'active-id');
                this.settings_bind('delete-binding', this.delete_binding_combo, 'active-id');
                this.settings_bind('cjk-utf8-ambiguous-width', this.ambiguous_width_combo, 'active-id');
                this.signal_connect(this.reset_compatibility_button, 'clicked', () => {
                    this.settings.reset('backspace-binding');
                    this.settings.reset('delete-binding');
                    this.settings.reset('cjk-utf8-ambiguous-width');
                });

                for (let [ok, i] = this.shortcuts_list.get_iter_first(); ok && this.shortcuts_list.iter_next(i);) {
                    const settings_key = this.shortcuts_list.get_value(i, 0);
                    this.method_handler(this.settings, `changed::${settings_key}`, this.update_shortcuts_from_settings);
                }
                this.update_shortcuts_from_settings();

                this.method_handler(this.accel_renderer, 'accel-edited', this.accel_edited);
                this.method_handler(this.accel_renderer, 'accel-cleared', this.accel_cleared);
            }

            bind_sensitive(key, widget, invert = false) {
                let flags = Gio.SettingsBindFlags.GET | Gio.SettingsBindFlags.NO_SENSITIVITY;

                if (invert)
                    flags |= Gio.SettingsBindFlags.INVERT_BOOLEAN;

                this.settings_bind(key, widget, 'sensitive', flags);
            }

            palette_widget(i) {
                return this[palette_widget_id(i)];
            }

            load_palette_from_settings() {
                const palette = this.settings.get_strv('palette').map(util.parse_rgba);

                for (let i = 0; i < PALETTE_SIZE; i++)
                    this.palette_widget(i).rgba = palette[i];

                const model = this.palette_combo.model;
                const [ok, i] = model.get_iter_first();
                if (!ok)
                    return;

                do {
                    const builtin_palette = this.get_builtin_palette(i);
                    if (!builtin_palette || builtin_palette.every((v, j) => util.parse_rgba(v).equal(palette[j]))) {
                        this.palette_combo.set_active_iter(i);
                        break;
                    }
                } while (model.iter_next(i));
            }

            get_builtin_palette(iter) {
                const model = this.palette_combo.model;
                const palette = [];

                for (let i = 0; i < PALETTE_SIZE; i++)
                    palette.push(model.get_value(iter, i + 1));

                if (palette.every(e => !e))
                    return null;  // Custom palette

                return palette;
            }

            load_builtin_palette() {
                const [ok, active_iter] = this.palette_combo.get_active_iter();
                if (!ok)
                    return;

                const palette = this.get_builtin_palette(active_iter);

                if (palette)
                    this.settings.set_strv('palette', palette);
            }

            edit_palette() {
                const palette = [];

                for (let i = 0; i < PALETTE_SIZE; i++)
                    palette.push(this.palette_widget(i).rgba.to_string());

                this.settings.set_strv('palette', palette);
            }

            bind_color(setting, widget) {
                this.signal_connect(widget, 'color-set', () => {
                    this.settings.set_string(setting, widget.rgba.to_string());
                });

                const update = () => {
                    widget.set_rgba(util.parse_rgba(this.settings.get_string(setting)));
                };
                this.signal_connect(this.settings, `changed::${setting}`, update);
                update();

                this.settings.bind_writable(setting, widget, 'sensitive', false);
                this.run_on_destroy(
                    Gio.Settings.unbind.bind(null, widget, 'sensitive'),
                    widget
                );
            }

            set_builtin_color_scheme() {
                const [ok, active_iter] = this.color_scheme_combo.get_active_iter();
                if (!ok)
                    return;

                const foreground = this.color_scheme_combo.model.get_value(active_iter, 1);
                const background = this.color_scheme_combo.model.get_value(active_iter, 2);

                if (!foreground && !background)
                    return;

                try {
                    this.setting_color_scheme = true;
                    this.settings.set_string('foreground-color', foreground);
                    this.settings.set_string('background-color', background);
                } finally {
                    this.setting_color_scheme = false;
                }
            }

            update_builtin_color_scheme() {
                if (this.setting_color_scheme)
                    return;

                const [ok, i] = this.color_scheme_combo.model.get_iter_first();
                if (!ok)
                    return;

                const foreground = util.parse_rgba(this.settings.get_string('foreground-color'));
                const background = util.parse_rgba(this.settings.get_string('background-color'));

                do {
                    const i_foreground = util.parse_rgba(this.color_scheme_combo.model.get_value(i, 1));
                    const i_background = util.parse_rgba(this.color_scheme_combo.model.get_value(i, 2));

                    if (foreground !== null &&
                        background !== null &&
                        i_foreground !== null &&
                        i_background !== null &&
                        foreground.equal(i_foreground) &&
                        background.equal(i_background)
                    ) {
                        this.color_scheme_combo.set_active_iter(i);
                        return;
                    }

                    if (i_foreground === null && i_background === null) {
                        // Last - "Custom"
                        this.color_scheme_combo.set_active_iter(i);
                        return;
                    }
                } while (this.color_scheme_combo.model.iter_next(i));
            }

            accel_edited(_, path, accel_key, accel_mods) {
                const [ok, iter] = this.shortcuts_list.get_iter_from_string(path);
                if (!ok)
                    return;

                const action = this.shortcuts_list.get_value(iter, 0);
                this.settings.set_strv(action, [
                    Gtk.accelerator_name(accel_key, accel_mods),
                ]);
            }

            accel_cleared(_, path) {
                const [ok, iter] = this.shortcuts_list.get_iter_from_string(path);
                if (!ok)
                    return;

                const action = this.shortcuts_list.get_value(iter, 0);
                this.settings.set_strv(action, []);
            }

            update_shortcuts_from_settings(settings = null, changed_key = null) {
                if (settings === null)
                    settings = this.settings;

                let [ok, i] = this.shortcuts_list.get_iter_first();
                if (!ok)
                    return;

                do {
                    const action = this.shortcuts_list.get_value(i, 0);

                    if (changed_key && action !== changed_key)
                        continue;

                    const cur_accel_key = this.shortcuts_list.get_value(i, 2);
                    const cur_accel_mods = this.shortcuts_list.get_value(i, 3);

                    const shortcuts = settings.get_strv(action);
                    if (shortcuts && shortcuts.length) {
                        const [accel_key, accel_mods] = accelerator_parse(shortcuts[0]);

                        if (cur_accel_key !== accel_key || cur_accel_mods !== accel_mods)
                            this.shortcuts_list.set(i, [2, 3], [accel_key, accel_mods]);
                    } else if (cur_accel_key !== 0 || cur_accel_mods !== 0) {
                        this.shortcuts_list.set(i, [2, 3], [0, 0]);
                    }
                } while (this.shortcuts_list.iter_next(i));
            }
        }
    );

    Object.assign(cls.prototype, util.UtilMixin);

    return cls;
}

function init() {}

let prefsWidgetClass = null;

function buildPrefsWidget() {
    const Me = imports.misc.extensionUtils.getCurrentExtension();

    if (prefsWidgetClass === null)
        prefsWidgetClass = createPrefsWidgetClass(Me.dir, Me.imports.util);

    const settings = imports.misc.extensionUtils.getSettings();

    const widget = new prefsWidgetClass({
        settings,
    });

    return widget;
}
