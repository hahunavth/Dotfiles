const Panel = imports.ui.main.panel;
const { GObject } = imports.gi;
const GLib = imports.gi.GLib;
const BaseIndicator = imports.ui.status.power.Indicator;

let aggregateMenu = Panel.statusArea['aggregateMenu'];
let origIndicator;
let newIndicator;

const BatPath = "/sys/class/power_supply/BAT0"

function init() {}

function enable() {
	origIndicator = aggregateMenu._power;
	newIndicator = new Indicator();
	aggregateMenu._indicators.replace_child(origIndicator, newIndicator);
}

function disable() {
	aggregateMenu._indicators.replace_child(newIndicator, origIndicator);
}

function readFile(filepath) {
	return String(GLib.file_get_contents(filepath)[1]).replace("\n", "");
}

var Indicator = GObject.registerClass(
	class Indicator extends BaseIndicator {
		_getCorrectPercentage() {
			let charge_full = parseInt(readFile(BatPath + "/charge_full"));
			let charge_now = parseInt(readFile(BatPath + "/charge_now"));
			let percentage = Math.trunc((charge_now/charge_full) * 100);
			return percentage + "%";
		}
		_sync() {
			super._sync();
			this._percentageLabel.text = this._getCorrectPercentage();
		}
	}
);
