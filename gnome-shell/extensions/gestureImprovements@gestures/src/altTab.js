'use strict';

const { Clutter, GLib, Shell, St } = imports.gi;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const { WindowSwitcherPopup } = imports.ui.altTab;
const OverviewControlsState = imports.ui.overviewControls.ControlsState;
const { TouchpadSwipeGesture } = ExtensionUtils.getCurrentExtension().imports.src.swipeTracker;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Constants = Me.imports.constants;
const POPUP_SCROLL_TIME = 100; // milliseconds

const AltTabExtState = {
	DISABLED: 0,
	DEFAULT: 1,
	ALTTABDELAY: 2,
	ALTTAB: 3,
	OVERVIEWTAB: 4
};

var AltTabGestureExtension = class AltTabGestureExtension {
	constructor() {
		this._connectHandlers = [];
		this._touchpadSwipeTracker = null;
		this._adjustment = null;
		this._switcher = null;
		this._workspaceContainerLayout = null;
		this._windowPreview = null;
		this._extState = AltTabExtState.DISABLED;
	}

	enable() {
		this._touchpadSwipeTracker = new TouchpadSwipeGesture(
			[3],
			Shell.ActionMode.ALL,
			Clutter.Orientation.HORIZONTAL,
			false,
			this);

		this._adjustment = new St.Adjustment({
			value: 0,
			lower: 0,
			upper: 1,
		});
		this._adjustment.connect('notify::value', this._onUpdateAdjustmentValue.bind(this));

		this._connectHandlers.push(this._touchpadSwipeTracker.connect('begin', this._gestureBegin.bind(this)));
		this._connectHandlers.push(this._touchpadSwipeTracker.connect('update', this._gestureUpdate.bind(this)));
		this._connectHandlers.push(this._touchpadSwipeTracker.connect('end', this._gestureEnd.bind(this)));
		this._extState = AltTabExtState.DEFAULT;
	}

	disable() {
		this._extState = AltTabExtState.DISABLED;
		this._connectHandlers.forEach(handle => this._touchpadSwipeTracker.disconnect(handle));
		this._connectHandlers = [];

		this._touchpadSwipeTracker.destroy();
		delete this._touchpadSwipeTracker;
		delete this._adjustment;
		if (this._switcher) {
			this._switcher.destroy();
		}
	}

	_onUpdateAdjustmentValue() {
		if (this._extState === AltTabExtState.ALTTAB) {
			let nelement = this._switcher._items.length;
			if (nelement > 1) {
				let n = Math.floor((nelement + 2) * this._adjustment.value);
				n = Math.clamp(n, 1, nelement) - 1;
				this._switcher._select(n);
				let adjustment = this._switcher._switcherList._scrollView.hscroll.adjustment;
				let transition = adjustment.get_transition('value');
				if (transition) {
					transition.advance(POPUP_SCROLL_TIME);
				}
			}
		}
	}

	_gestureBegin(gesture, time, x, y) {
		this._progress = 0;
		if (Main.actionMode === Shell.ActionMode.NORMAL &&
			this._extState === AltTabExtState.DEFAULT
		) {
			this._switcher = new WindowSwitcherPopup();
			let nelement = this._switcher._items.length
			if (nelement > 0) {
				this._switcher.show(false, "switch-windows", 0);
				if (this._switcher._noModsTimeoutId != 0) {
					GLib.source_remove(this._switcher._noModsTimeoutId);
					this._switcher._noModsTimeoutId = 0;
				}
				if (this._switcher._initialDelayTimeoutId !== 0) {
					GLib.source_remove(this._switcher._initialDelayTimeoutId);
        			this._switcher._initialDelayTimeoutId = 0;
				}

				if (nelement === 1) {
					this._switcher._select(0);
					this._progress = 0;
				} else {
					this._progress = 2.5 / (nelement + 2);
					this._switcher._select(1);
				}
				this._adjustment.value = 0;
				this._extState = AltTabExtState.ALTTABDELAY;
				this._altTabTimeoutId = GLib.timeout_add(
					GLib.PRIORITY_DEFAULT,
					Constants.AltTabConstants.DELAY_DURATION,
					() => {
						Main.osdWindowManager.hideAll();
        				this._switcher.opacity = 255;
						this._adjustment.value = this._progress;
						this._extState = AltTabExtState.ALTTAB;
						this._altTabTimeoutId = 0;
						return GLib.SOURCE_REMOVE;
					}
				);
			} else {
				this._switcher.destroy();
			}
		}
	}

	_gestureUpdate(gesture, time, delta, distance) {
		if (this._extState > AltTabExtState.ALTTABDELAY) {
			this._progress = Math.clamp(this._progress + delta / distance, 0, 1);
			this._adjustment.value = this._progress;
		}
	}

	_gestureEnd(gesture, time, distance) {
		if (this._extState === AltTabExtState.ALTTAB ||
			this._extState === AltTabExtState.ALTTABDELAY) {
			this._extState = AltTabExtState.DEFAULT;
			if (this._altTabTimeoutId != 0) {
				GLib.source_remove(this._altTabTimeoutId);
				this._altTabTimeoutId = 0;
			}
			let win = this._switcher._items[this._switcher._selectedIndex].window;
			Main.activateWindow(win);
			this._switcher.destroy();
			this._switcher = null;
			this._progress = 0;
			this._adjustment.value = 0;
		}
		this._extState = AltTabExtState.DEFAULT;
	}

	get state() {
		return this._extState;
	}
};