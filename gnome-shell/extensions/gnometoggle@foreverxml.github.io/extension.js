const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Ornament = imports.ui.popupMenu.Ornament;
const Util = imports.misc.util;
const St = imports.gi.St;

function init() {}

function enable() {
    this.mainMenu = Main.panel.statusArea['aggregateMenu'].menu;

    this.themeMenu = new PopupMenu.PopupSubMenuMenuItem("Appearance", true);
    this.mainMenu.addMenuItem(themeMenu, 8);
    this.themeMenu.icon.icon_name = "weather-clear-symbolic";

    this.light = new PopupMenu.PopupMenuItem("Light");
    this.light.connect('activate', (item, event) => {
        this.reset_ornament();
        this.set_theme("Adwaita");
        item.setOrnament(Ornament.DOT);
    });
    this.themeMenu.menu.addMenuItem(this.light, 0);

    this.dark = new PopupMenu.PopupMenuItem("Dark");
    this.dark.connect('activate', (item, event) => {
        this.reset_ornament();
        this.set_theme("Adwaita-dark");
        item.setOrnament(Ornament.DOT);
    });
    this.themeMenu.menu.addMenuItem(this.dark, 1);

    this.reset_ornament();
}

function set_theme(theme) {
    set_user_theme(theme);
    set_theme_label(theme);
}

function set_theme_label(theme){
    if(theme == "Adwaita") {
        this.themeMenu.label.text = "Light Appearance";
        this.themeMenu.icon.icon_name = "weather-clear-symbolic";
    } else if (theme == "Adwaita-dark") {
        this.themeMenu.label.text = "Dark Appearance";
        this.themeMenu.icon.icon_name = "weather-clear-night-symbolic";
    }
}

function set_user_theme(theme) {
    Util.trySpawn(["dconf", "write", "/org/gnome/desktop/interface/gtk-theme", "'" + theme +"'"]);
}

function reset_ornament() {
    this.light.setOrnament(Ornament.NONE);
    this.dark.setOrnament(Ornament.NONE);
}

function disable() {
    if (this.light) {
        this.light.destroy();
        this.light = 0;
    }

    if (this.dark) {
        this.dark.destroy();
        this.dark = 0;
    }

    if (this.themeMenu) {
        this.themeMenu.destroy();
        this.themeMenu = 0;
    }
}
