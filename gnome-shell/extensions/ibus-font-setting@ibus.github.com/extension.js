const Gio = imports.gi.Gio;
const Pango = imports.gi.Pango;

const IBus = imports.misc.ibusManager.IBus;
const IBusManager = imports.misc.ibusManager;

let _ibusManager = IBusManager.getIBusManager();
let _candidatePopup = null;
let _ibusSettings = null;

let _useCustomFontId = null;
let _customFontId = null;

function init() {
}

function _updateFont() {
    // We restore the default font style.
    _candidatePopup.actor.style = '';

    let useCustomFont = _ibusSettings.get_boolean('use-custom-font');
    if (!useCustomFont)
        return;

    let fontName = _ibusSettings.get_string('custom-font');
    let fontDesc = Pango.FontDescription.from_string(fontName);
    // We ignore everything but size and style.
    _candidatePopup.actor.style =
        'font-size: ' + fontDesc.get_size() / 1024. + (fontDesc.get_size_is_absolute() ? 'px' : 'pt') + ';'
        + 'font-family: "' + fontDesc.get_family() + '";';
}

function enable() {
    _candidatePopup = _ibusManager._candidatePopup;

    _ibusSettings = new Gio.Settings({ schema_id: 'org.freedesktop.ibus.panel' });
    _useCustomFontId = _ibusSettings.connect('changed::use-custom-font', _updateFont);
    _customFontId = _ibusSettings.connect('changed::custom-font', _updateFont);

    _updateFont();
}

function disable() {
    _ibusSettings.disconnect(_useCustomFontId);
    _useCustomFontId = null;

    _ibusSettings.disconnect(_customFontId);
    _customFontId = null;

    _candidatePopup.actor.style = '';
}
