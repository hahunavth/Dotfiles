'use strict';

// FIXME: ideally these values matches physical touchpad size. We can get the
// correct values for gnome-shell specifically, since mutter uses libinput
// directly, but GTK apps cannot get it, so use an arbitrary value so that
// it's consistent with apps.
var TouchpadConstants = {
    DEFAULT_SWIPE_MULTIPLIER: 0.5,
    SWIPE_MULTIPLIER: 0.5,
    DRAG_THRESHOLD_DISTANCE: 16,
    TOUCHPAD_BASE_HEIGHT: 300,
    TOUCHPAD_BASE_WIDTH: 400
};

var AltTabConstants = {
    DEFAULT_DELAY_DURATION: 100,
    DELAY_DURATION: 100
};