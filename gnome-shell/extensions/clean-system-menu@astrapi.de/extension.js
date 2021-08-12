const { GObject, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const BoxPointer = imports.ui.boxpointer;
const UPower = imports.gi.UPowerGlib;
const SystemActions = imports.misc.systemActions;
const System = Main.panel.statusArea.aggregateMenu._system;
const systemMenu = System.menu;
const BaseIndicator = imports.ui.status.power.Indicator;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Clean System Menu');
        this._systemActions = new SystemActions.getDefault();
        
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.clean-system-menu');
        
        let bindFlags = GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE;
        
        this.add_child(new St.Icon({
            icon_name: 'system-shutdown-symbolic',
            style_class: 'system-status-icon',
        }));

        let suspendItem = new PopupMenu.PopupImageMenuItem(_('Suspend'), 'media-playback-pause-symbolic');
        suspendItem.connect('activate', () => {
            this._systemActions.activateSuspend();
        });
        this.menu.addMenuItem(suspendItem);
        this._systemActions.bind_property('can-suspend', suspendItem, 'visible', bindFlags);
    
        let powerOffItem = new PopupMenu.PopupImageMenuItem(_('Power Off…'), 'system-shutdown-symbolic');
        powerOffItem.connect('activate', () => {
          this.menu.itemActivated(BoxPointer.PopupAnimation.NONE);
          this._systemActions.activatePowerOff();
        });
        this.menu.addMenuItem(powerOffItem);
        this._systemActions.bind_property('can-power-off', powerOffItem, 'visible', bindFlags);

        let restartItem = new PopupMenu.PopupImageMenuItem(_('Restart…'), 'system-reboot-symbolic');
        restartItem.connect('activate', () => {
          this._systemActions.activateRestart();
        });
        this.menu.addMenuItem(restartItem);
        this._systemActions.bind_property('can-restart', restartItem, 'visible', bindFlags);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        let lockScreenItem = new PopupMenu.PopupImageMenuItem(_('Lock'), 'changes-prevent-symbolic');
        lockScreenItem.connect('activate', () => {
          this._systemActions.activateLockScreen();
        });
        this.menu.addMenuItem(lockScreenItem);
    
        let logoutItem = new PopupMenu.PopupImageMenuItem(_('Log Out'), 'system-log-out-symbolic');
        logoutItem.connect('activate', () => {
          this._systemActions.activateLogout();
        });
        this.menu.addMenuItem(logoutItem);

        let loginScreenItem = new PopupMenu.PopupImageMenuItem(_('Switch User…'), 'system-switch-user-symbolic');
        loginScreenItem.connect('activate', () => {
          this._systemActions.activateSwitchUser();
        });
        this.menu.addMenuItem(loginScreenItem);
        this._systemActions.bind_property('can-switch-user', loginScreenItem, 'visible', bindFlags);

        this.settings.connect("changed::power-button-visible", () => this._setVisible())
        this.settings.connect("changed::power-button-position", () => this._setPosition())
        this.settings.connect("changed::power-button-positionnumber", () => this._setPosition())

        this._setVisible();
        this._setStatusMenu();
    }

    _setStatusMenu() {
      this._proxy = Main.panel.statusArea["aggregateMenu"]._power._proxy;
      if (!this._proxy.IsPresent) {
        Main.panel.statusArea.aggregateMenu._power.hide();
      }
    }

    _setVisible() {
      this.visible = this.settings.get_boolean('power-button-visible');
    };

    _setPosition() {
    this.container.get_parent().remove_actor(this.container);
    let boxes = {
      0: Main.panel._leftBox,
      1: Main.panel._centerBox,
      2: Main.panel._rightBox
    };
    let p = this.settings.get_int('power-button-position');
    let i = this.settings.get_int('power-button-positionnumber');
    boxes[p].insert_child_at_index(this.container, i);
  }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.clean-system-menu');
    }

    enable() {
      log(`enabling ${Me.metadata.name}`);
      
      this._indicator = new Indicator();
      Main.panel.addToStatusArea(this._uuid, this._indicator);
      this._indicator._setPosition();

      systemMenu.actor.remove_child(System._sessionSubMenu);
      systemMenu.actor.remove_child(System._lockScreenItem);
    }

    disable() {
      log(`disabling ${Me.metadata.name}`);
      this._indicator.destroy();
      this._indicator = null;
      
      Main.panel.statusArea.aggregateMenu._power.show();
      
      systemMenu.actor.add_child(System._lockScreenItem);
      systemMenu.actor.add_child(System._sessionSubMenu);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
