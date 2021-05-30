'use strict';

const { GObject } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const { TouchpadSwipeGesture } = ExtensionUtils.getCurrentExtension().imports.src.swipeTracker;

var GestureExtension = class GestureExtension {
	constructor() {
		this._swipeTrackers = [
			/// swipeTracker, number of fingers for gesture, disable old gestures
			// [Main.overview._swipeTracker, [4], false],
			[Main.wm._workspaceAnimation._swipeTracker, [4], true],
			[Main.overview._overview.controls._workspacesDisplay._swipeTracker, [4], false]
		];
	}

	enable() {
		this._swipeTrackers.forEach(entry => {
			let [swipeTracker, nfingers, disablePrevious] = entry;
			let touchpadGesture = new TouchpadSwipeGesture(
				nfingers,
				swipeTracker._allowedModes,
				swipeTracker.orientation);

			this._attachGestureToTracker(swipeTracker, touchpadGesture, disablePrevious);
		});
	}

	disable() {
		this._swipeTrackers.forEach(entry => {
			let [swipeTracker, _, disablePrevious] = entry;
			swipeTracker._touchpadGesture.destroy();
			delete swipeTracker._touchpadGesture;

			swipeTracker._touchpadGesture = swipeTracker.__oldTouchpadGesture;
			if (disablePrevious) {
				swipeTracker._touchpadGesture._stageCaptureEvent =
					global.stage.connect(
						'captured-event::touchpad',
						swipeTracker._touchpadGesture._handleEvent.bind(swipeTracker._touchpadGesture)
					);
			}
		});
	}

	_attachGestureToTracker(swipeTracker, touchpadSwipeGesture, disablePrevious) {
		if (swipeTracker._touchpadGesture) {
			if (disablePrevious && swipeTracker._touchpadGesture._stageCaptureEvent) {
				global.stage.disconnect(swipeTracker._touchpadGesture._stageCaptureEvent);
				delete swipeTracker._touchpadGesture._stageCaptureEvent;
			}
			swipeTracker.__oldTouchpadGesture = swipeTracker._touchpadGesture;
		}
		swipeTracker._touchpadGesture = touchpadSwipeGesture;
		swipeTracker._touchpadGesture.connect('begin', swipeTracker._beginGesture.bind(swipeTracker));
		swipeTracker._touchpadGesture.connect('update', swipeTracker._updateGesture.bind(swipeTracker));
		swipeTracker._touchpadGesture.connect('end', swipeTracker._endTouchpadGesture.bind(swipeTracker));
		swipeTracker.bind_property('enabled', swipeTracker._touchpadGesture, 'enabled', 0);
		swipeTracker.bind_property('orientation', swipeTracker._touchpadGesture, 'orientation',
			GObject.BindingFlags.SYNC_CREATE);
	}
};