/* exported subscribe, unsubscribeAll, drop_proxy */

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const GObject = imports.gi.GObject;
const Util = imports.misc.util;
const X11GestureDaemonXml = `<node>
	<interface name="org.gestureImprovements.gestures">
		<signal name="TouchpadSwipe">
		<arg name="event" type="(siddu)"/>
		</signal>
	</interface>
</node>`;
const DBusWrapperGIExtension = GObject.registerClass({
	Signals: {
		'TouchpadSwipe': {
			param_types: [
				GObject.TYPE_STRING,
				GObject.TYPE_INT,
				GObject.TYPE_DOUBLE,
				GObject.TYPE_DOUBLE,
				GObject.TYPE_UINT
			],
			flags: GObject.SignalFlags.RUN_LAST,
			accumulator: GObject.AccumulatorType.TRUE_HANDLED,
			return_type: GObject.TYPE_BOOLEAN,
		},
	},
}, class DBusWrapperGIExtension extends GObject.Object {
	_init() {
		super._init();
		this._proxyConnectSignalId = 0;
		if (!Meta.is_wayland_compositor()) {
			const ProxyClass = Gio.DBusProxy.makeProxyWrapper(X11GestureDaemonXml);
			this._proxy = new ProxyClass(Gio.DBus.session, 'org.gestureImprovements.gestures', '/org/gestureImprovements/gestures');
			this._proxyConnectSignalId = this._proxy.connectSignal('TouchpadSwipe', this._handleDbusSignal.bind(this));
		}
	}
	dropProxy() {
		if (this._proxy) {
			this._proxy.disconnectSignal(this._proxyConnectSignalId);
			this._proxy.run_dispose();
			this._proxy = undefined;
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	_handleDbusSignal(_proxy, _sender, params) {
		const [sphase, fingers, dx, dy, time] = params[0];
		this.emit('TouchpadSwipe', sphase, fingers, dx, dy, time);
	}
});
let proxy;
let connectedSignalIds = [];
function subscribe(callback) {
	if (!proxy) {
		if (!Meta.is_wayland_compositor()) {
			Util.spawn(['systemctl', '--user', 'start', 'gesture_improvements_gesture_daemon.service']);
		}
		connectedSignalIds = [];
		proxy = new DBusWrapperGIExtension();
	}
	connectedSignalIds.push(proxy.connect('TouchpadSwipe', (_proxy, sphase, fingers, dx, dy, time) => {
		const event = {
			type: () => Clutter.EventType.TOUCHPAD_SWIPE,
			get_gesture_phase: () => {
				switch (sphase) {
					case 'Begin':
						return Clutter.TouchpadGesturePhase.BEGIN;
					case 'Update':
						return Clutter.TouchpadGesturePhase.UPDATE;
					default:
						return Clutter.TouchpadGesturePhase.END;
				}
			},
			get_touchpad_gesture_finger_count: () => fingers,
			get_coords: () => global.get_pointer().slice(0, 2),
			get_gesture_motion_delta_unaccelerated: () => [dx, dy],
			get_time: () => time,
		};
		return callback(undefined, event);
	}));
}
function unsubscribeAll() {
	if (proxy) {
		connectedSignalIds.forEach(id => proxy === null || proxy === void 0 ? void 0 : proxy.disconnect(id));
		connectedSignalIds = [];
	}
}
function drop_proxy() {
	if (proxy) {
		unsubscribeAll();
		proxy.dropProxy();
		proxy.run_dispose();
		proxy = undefined;
		if (!Meta.is_wayland_compositor()) {
			Util.spawn(['systemctl', '--user', 'stop', 'gesture_improvements_gesture_daemon.service']);
		}
	}
}
