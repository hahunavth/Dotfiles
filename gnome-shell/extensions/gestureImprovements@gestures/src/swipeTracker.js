'use strict';

const { Clutter, GObject, Shell, Gio } = imports.gi;

const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Constants = Me.imports.constants;

const TouchpadState = {
	NONE: 0,
	PENDING: 1,
	HANDLING: 2,
	IGNORED: 3,
};

var TouchpadSwipeGesture = GObject.registerClass({
	Properties: {
		'enabled': GObject.ParamSpec.boolean(
			'enabled', 'enabled', 'enabled',
			GObject.ParamFlags.READWRITE,
			true),
		'orientation': GObject.ParamSpec.enum(
			'orientation', 'orientation', 'orientation',
			GObject.ParamFlags.READWRITE,
			Clutter.Orientation, Clutter.Orientation.HORIZONTAL),
	},
	Signals: {
		'begin': { param_types: [GObject.TYPE_UINT, GObject.TYPE_DOUBLE, GObject.TYPE_DOUBLE] },
		'update': { param_types: [GObject.TYPE_UINT, GObject.TYPE_DOUBLE, GObject.TYPE_DOUBLE] },
		'end': { param_types: [GObject.TYPE_UINT, GObject.TYPE_DOUBLE] },
	},
}, class TouchpadSwipeGesture extends GObject.Object {
	_init(nfingers, allowedModes, orientation, followNaturalScroll = true, extension = null) {
		super._init();
		this._nfingers = nfingers;
		this._allowedModes = allowedModes;
		this.orientation = orientation;
		this._state = TouchpadState.NONE;
		this._extension = extension;
		this._cumulativeX = 0;
		this._cumulativeY = 0;
		this._followNaturalScroll = followNaturalScroll;
		this._touchpadSettings = new Gio.Settings({
			schema_id: 'org.gnome.desktop.peripherals.touchpad',
		});
		this._stageCaptureEvent = global.stage.connect('captured-event::touchpad', this._handleEvent.bind(this));

		this.TOUCHPAD_BASE_HEIGHT = Constants.TouchpadConstants.TOUCHPAD_BASE_HEIGHT;
		this.TOUCHPAD_BASE_WIDTH = Constants.TouchpadConstants.TOUCHPAD_BASE_WIDTH;
		this.SWIPE_MULTIPLIER = Constants.TouchpadConstants.SWIPE_MULTIPLIER;
		this.DRAG_THRESHOLD_DISTANCE = Constants.TouchpadConstants.DRAG_THRESHOLD_DISTANCE;
	}

	_handleEvent(actor, event) {
		// log(`swipe multiplier = ${this.SWIPE_MULTIPLIER}`);
		if (event.type() !== Clutter.EventType.TOUCHPAD_SWIPE)
			return Clutter.EVENT_PROPAGATE;

		if (!this.enabled)
			return Clutter.EVENT_PROPAGATE;

		if (event.get_gesture_phase() === Clutter.TouchpadGesturePhase.BEGIN)
			this._state = TouchpadState.NONE;

		if (this._state === TouchpadState.IGNORED)
			return Clutter.EVENT_PROPAGATE;

		if (!this._nfingers.includes(event.get_touchpad_gesture_finger_count()))
			return Clutter.EVENT_PROPAGATE;

		if (this._extension !== null) {
			if (this._extension.state === 0)
				return Clutter.EVENT_PROPAGATE;
			if (this._state === TouchpadState.HANDLING &&
				this._extension.state === 1 &&
				event.get_gesture_phase() === Clutter.TouchpadGesturePhase.UPDATE) {
				return Clutter.EVENT_PROPAGATE;
			}
		}

		if ((this._allowedModes !== Shell.ActionMode.ALL) && ((this._allowedModes & Main.actionMode) === 0))
			return Clutter.EVENT_PROPAGATE;

		let time = event.get_time();

		const [x, y] = event.get_coords();
		let [dx, dy] = event.get_gesture_motion_delta();

		if (this._state === TouchpadState.NONE) {
			if (dx === 0 && dy === 0)
				return Clutter.EVENT_PROPAGATE;

			this._cumulativeX = 0;
			this._cumulativeY = 0;
			this._state = TouchpadState.PENDING;
		}

		if (this._state === TouchpadState.PENDING) {
			this._cumulativeX += dx * this.SWIPE_MULTIPLIER;
			this._cumulativeY += dy * this.SWIPE_MULTIPLIER;

			const cdx = this._cumulativeX;
			const cdy = this._cumulativeY;
			const distance = Math.sqrt(cdx * cdx + cdy * cdy);

			if (distance >= this.DRAG_THRESHOLD_DISTANCE) {
				const gestureOrientation = Math.abs(cdx) > Math.abs(cdy)
					? Clutter.Orientation.HORIZONTAL
					: Clutter.Orientation.VERTICAL;

				this._cumulativeX = 0;
				this._cumulativeY = 0;

				if (gestureOrientation === this.orientation) {
					this._state = TouchpadState.HANDLING;
					this.emit('begin', time, x, y);
				} else {
					this._state = TouchpadState.IGNORED;
					return Clutter.EVENT_PROPAGATE;
				}
			} else {
				return Clutter.EVENT_PROPAGATE;
			}
		}

		const vertical = this.orientation === Clutter.Orientation.VERTICAL;
		let delta = (vertical ? dy : dx) * this.SWIPE_MULTIPLIER;
		const distance = vertical ? this.TOUCHPAD_BASE_HEIGHT : this.TOUCHPAD_BASE_WIDTH;

		switch (event.get_gesture_phase()) {
			case Clutter.TouchpadGesturePhase.BEGIN:
			case Clutter.TouchpadGesturePhase.UPDATE:
				if (this._followNaturalScroll && this._touchpadSettings.get_boolean('natural-scroll'))
					delta = -delta;

				this.emit('update', time, delta, distance);
				break;

			case Clutter.TouchpadGesturePhase.END:
			case Clutter.TouchpadGesturePhase.CANCEL:
				this.emit('end', time, distance);
				this._state = TouchpadState.NONE;
				break;
		}

		return this._state === TouchpadState.HANDLING
			? Clutter.EVENT_STOP
			: Clutter.EVENT_PROPAGATE;
	}

	destroy() {
		if (this._stageCaptureEvent) {
			global.stage.disconnect(this._stageCaptureEvent);
			delete this._stageCaptureEvent;
		}
	}
});