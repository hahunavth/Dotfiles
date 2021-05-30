'use strict';

const { Clutter, GLib, Shell, St, GObject } = imports.gi;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const { SwipeTracker } = imports.ui.swipeTracker;
const { TouchpadSwipeGesture } = ExtensionUtils.getCurrentExtension().imports.src.swipeTracker;


const ExtensionState = {
	DISABLED: 0,
	DEFAULT: 1,
	CUSTOM: 2
};

const OverviewControlsState = {
	APP_GRID_P: -1,
	HIDDEN: 0,
	WINDOW_PICKER: 1,
	APP_GRID: 2,
	HIDDEN_N: 3
}

var OverviewRoundTripGestureExtension = class OverviewRoundTripGestureExtension {
	constructor() {
		this._overviewControls = Main.overview._overview._controls;
		this._stateAdjustment = this._overviewControls._stateAdjustment;
		this._oldUpdateAppDisplayVisibility = this._overviewControls._updateAppDisplayVisibility;
		this._oldGetStateTransitionParams = this._overviewControls._stateAdjustment.getStateTransitionParams;
		this._swipeTracker = null;
		this._progress = 0;
		this._extensionState = ExtensionState.DISABLED;
		this._connectors = [];
	}

	_updateAppDisplayVisibility(stateTransitionParams = null) {
		if (!stateTransitionParams)
			stateTransitionParams = this._stateAdjustment.getStateTransitionParams();

		const { currentState, finalState } = stateTransitionParams;
		const state = Math.max(currentState, finalState);

		// log(`_updateAppDisplayVisibility: state=${state}, searchActive=${this._overviewControls._searchController.searchActive}`);
		this._overviewControls._appDisplay.visible =
			state > OverviewControlsState.WINDOW_PICKER &&
			!this._overviewControls._searchController.searchActive;
	}

	_getStateTransitionParams() {
		if (this._extensionState <= ExtensionState.DEFAULT) {
			// log(`getStateTransitionParams: state=${this._extensionState}`);
			return this._oldGetStateTransitionParams.call(this._stateAdjustment);
		}
		else if (this._extensionState === ExtensionState.CUSTOM) {
			let currentState = this._stateAdjustment.value;
			let initialState = OverviewControlsState.HIDDEN;
			let finalState = OverviewControlsState.APP_GRID;

			let length = Math.abs(finalState - initialState);
			let progress = Math.abs((currentState - initialState) / length);

			// log(`getStateTransitionParams: state=${this._extensionState}, progress=${this._progress}`);
			// log(`currentState=${currentState}, initialState=${initialState}, finalState=${finalState}, transition progress=${progress}`);
			return {
				transitioning: true,
				currentState,
				initialState,
				finalState,
				progress,
			};
		}
	}

	_createSwipeTracker() {
		// create swipeTracker
		let swipeTracker = new SwipeTracker(global.stage,
			Clutter.Orientation.VERTICAL,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
			{ allowDrag: false, allowScroll: false });

		// remove old touchpad gesture from swipeTracker
		if (swipeTracker._touchpadGesture) {
			swipeTracker._touchpadGesture.destroy();
			delete swipeTracker._touchpadGesture;
		}

		// add touchpadBindings to tracker
		swipeTracker._touchpadGesture = new TouchpadSwipeGesture(
			[3, 4],
			swipeTracker._allowedModes,
			swipeTracker.orientation);
		swipeTracker._touchpadGesture.connect('begin', swipeTracker._beginGesture.bind(swipeTracker));
		swipeTracker._touchpadGesture.connect('update', swipeTracker._updateGesture.bind(swipeTracker));
		swipeTracker._touchpadGesture.connect('end', swipeTracker._endTouchpadGesture.bind(swipeTracker));
		swipeTracker.bind_property('enabled', swipeTracker._touchpadGesture, 'enabled', 0);
		swipeTracker.bind_property('orientation', swipeTracker._touchpadGesture, 'orientation',
			GObject.BindingFlags.SYNC_CREATE);

		return swipeTracker;
	}

	enable() {
		Main.overview._swipeTracker.enabled = false;

		this._swipeTracker = this._createSwipeTracker();
		this._swipeTracker.orientation = Clutter.Orientation.VERTICAL;
		this._connectors.push(this._swipeTracker.connect('begin', this._gestureBegin.bind(this)));
		this._connectors.push(this._swipeTracker.connect('update', this._gestureUpdate.bind(this)));
		this._connectors.push(this._swipeTracker.connect('end', this._gestureEnd.bind(this)));

		// override 'getStateTransitionParams' function
		this._stateAdjustment.getStateTransitionParams = this._getStateTransitionParams.bind(this);
		this._overviewControls._updateAppDisplayVisibility = this._updateAppDisplayVisibility.bind(this);

		this._extensionState = ExtensionState.DEFAULT;
		this._progress = 0;

		// reset extension state to default, when overview is shown and hidden (not showing/hidding event)
		this._shownEventId = Main.overview.connect('shown', () => this._extensionState = ExtensionState.DEFAULT);
		this._hiddenEventId = Main.overview.connect('hidden', () => this._extensionState = ExtensionState.DEFAULT);

	}

	disable() {
		this._extensionState = ExtensionState.DISABLED;
		this._connectors.forEach(connector => this._swipeTracker.disconnect(connector));
		this._swipeTracker.destroy();
		delete this._swipeTracker;
		this._swipeTracker = null;

		Main.overview._swipeTracker.enabled = true;
		this._stateAdjustment.getStateTransitionParams = this._oldGetStateTransitionParams.bind(this._stateAdjustment);
		this._overviewControls._updateAppDisplayVisibility = this._oldUpdateAppDisplayVisibility.bind(this._overviewControls);
		Main.overview.disconnect(this._shownEventId);
		Main.overview.disconnect(this._hiddenEventId);
	}

	_gestureBegin(tracker, monitor) {
		let _tracker = {
			confirmSwipe: (distance, snapPoints, currentProgress, cancelProgress) => {
				snapPoints.unshift(OverviewControlsState.APP_GRID_P);
				snapPoints.push(OverviewControlsState.HIDDEN_N);
				tracker.confirmSwipe(
					distance,
					snapPoints,
					currentProgress,
					cancelProgress
				);
			}
		};

		Main.overview._gestureBegin(_tracker, monitor);
		this._progress = this._stateAdjustment.value;
		this._extensionState = ExtensionState.DEFAULT;
		// log(`begin: progress=${this._progress}`);
	}

	_gestureUpdate(tracker, progress) {
		if (progress < OverviewControlsState.HIDDEN ||
			progress > OverviewControlsState.APP_GRID) {
			this._extensionState = ExtensionState.CUSTOM;
		}
		else {
			this._extensionState = ExtensionState.DEFAULT;
		}

		this._progress = progress;
		// log(`update: progress=${progress}, overview progress=${this._getOverviewProgressValue(progress)}`);
		Main.overview._gestureUpdate(tracker, this._getOverviewProgressValue(progress));
	}

	_gestureEnd(tracker, duration, endProgress) {
		if (this._progress < OverviewControlsState.HIDDEN) {
			this._extensionState = ExtensionState.CUSTOM;
			if (endProgress === OverviewControlsState.WINDOW_PICKER) {
				endProgress = OverviewControlsState.HIDDEN;
			}
		}
		else if (this._progress > OverviewControlsState.APP_GRID) {
			this._extensionState = ExtensionState.CUSTOM;
			if (endProgress === OverviewControlsState.WINDOW_PICKER) {
				endProgress = OverviewControlsState.APP_GRID;
			}
		}
		else {
			this._extensionState = ExtensionState.DEFAULT;
		}

		// log(`end: progress=${this._progress}, endProgress=${endProgress}, overview progress=${this._getOverviewProgressValue(endProgress)}`)
		Main.overview._gestureEnd(tracker, duration, this._getOverviewProgressValue(endProgress));
	}

	_getOverviewProgressValue(progress) {
		if (progress < OverviewControlsState.HIDDEN) {
			return Math.min(
				OverviewControlsState.APP_GRID,
				2 * Math.abs(OverviewControlsState.HIDDEN - progress)
			);
		}
		else if (progress > OverviewControlsState.APP_GRID) {
			return Math.min(
				OverviewControlsState.APP_GRID,
				2 * Math.abs(OverviewControlsState.HIDDEN_N - progress)
			);
		}

		return progress;
	}
};