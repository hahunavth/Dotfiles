/* Copyright 2012-2013 Sam Bull */

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Main = imports.ui.main;
const IconGrid = imports.ui.iconGrid;
const Lang = imports.lang;
const Dash = imports.ui.dash;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const NotesView = Extension.imports.view.NotesView;
const NotesIconPath = Extension.path + '/notes-icon.svg';

let dash, viewSelector;
let _a11yFocusPageOld, _onStageKeyPressOld, slideOutOld;

let showNotesIcon;
let notesView, notesPage;
let signal_notes, signal_apps, signal_show;

/* The button to be added to the dash. */
const ShowNotesIcon = new Lang.Class({
    Name: 'ShowNotesIcon',
    Extends: Dash.DashItemContainer,

    _init: function() {
        this.parent();

        this.toggleButton = new St.Button({ style_class: 'show-apps',
                                            track_hover: true,
                                            can_focus: true,
                                            toggle_mode: true });
        this._iconActor = null;
        this.icon = new IconGrid.BaseIcon(_("Show Notes"),
                                           { setSizeManually: true,
                                             showLabel: false,
                                             createIcon: Lang.bind(
                                                this, this._createIcon) });
        this.toggleButton.add_actor(this.icon.actor);
        this.toggleButton._delegate = this;

        this.setChild(this.toggleButton);
        this.setLabelText(_("Show Notes"));
    },

    _createIcon: function(size) {
        this._iconActor = new St.Icon({ gicon: Gio.icon_new_for_string(
                                            NotesIconPath),
                                        icon_size: size,
                                        style_class: 'show-apps-icon',
                                        track_hover: true });
        return this._iconActor;
    }
});

/* Replace ViewSelector's method to allow notes view to be displayed. */
function onButtonToggled() {
    if (showNotesIcon.toggleButton.checked) {
        viewSelector._showAppsButton.checked = false;
        viewSelector._showPage(notesPage);
    } else if (viewSelector._showAppsButton.checked == false)
        viewSelector._showPage(viewSelector._workspacesPage);
}

/* Replace ViewSelector's to allow notes view to be selected with CtrlAltTab. */
function _a11yFocusPage(page) {
    this._showAppsButton.checked = page == this._appsPage;
    showNotesIcon.toggleButton.checked = page == notesPage;
    page.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
}

/* Augment ViewSelector's stageKeyPress to hide notes view on Esc. */
function _onStageKeyPress(actor, event) {
    let symbol = event.get_key_symbol();

    if (symbol == Clutter.Escape && showNotesIcon.toggleButton.checked) {
        for (let i=0; i < notesView.notes.length; i++)
            // Escape from text entry
            if (notesView.notes[i]._entry.get_clutter_text().has_key_focus()) {
                notesPage.grab_key_focus();
                return true;
            }
        showNotesIcon.toggleButton.checked = false;
    } else if (!showNotesIcon.toggleButton.checked)
        return _onStageKeyPressOld.apply(this, [actor, event]);
    return true;
}

const ViewSelector = imports.ui.viewSelector;
/* Wrap dash's slideOut to stop it animating at the wrong time.*/
function slideOut() {
    let activePage = viewSelector.getActivePage();
    let dashVisible = (activePage == ViewSelector.ViewPage.WINDOWS ||
                       activePage == ViewSelector.ViewPage.APPS ||
                       viewSelector._activePage == notesPage);

    if (!dashVisible)
        slideOutOld();
}

function toggleNotesPage() {
    Main.overview.show();
    showNotesIcon.toggleButton.checked = !showNotesIcon.toggleButton.checked;
}

function init() {
    dash = Main.overview._dash;
    viewSelector = Main.overview.viewSelector;

    _a11yFocusPageOld = viewSelector._a11yFocusPage;
    _onStageKeyPressOld = viewSelector._onStageKeyPress;
    slideOutOld = Main.overview._controls._dashSlider.slideOut;
}

function enable() {
    // Replace show apps button
    showNotesIcon = new ShowNotesIcon();
    showNotesIcon.childScale = 1;
    showNotesIcon.childOpacity = 255;
    showNotesIcon.icon.setIconSize(dash.iconSize);
    dash._hookUpLabel(showNotesIcon);
    dash._box.insert_child_at_index(showNotesIcon, -1);

    // Add notes page
    notesView = new NotesView()
    notesPage = viewSelector._addPage(notesView.actor, _("Notes"),
                                      'system-run-symbolic');
    notesPage.hide();
    notesPage.connect('show', Lang.bind(notesView, notesView.show));
    notesPage.connect('hide', Lang.bind(notesView, notesView.hide));
    notesView.page = notesPage;  // Give reference to page for focus handling.

    // Rewire viewSelector's behaviour
    signal_notes = showNotesIcon.toggleButton.connect('notify::checked',
                                                      onButtonToggled);
    signal_apps = viewSelector._showAppsButton.connect_after(
        'notify::checked', Lang.bind(this, function () {
            if (viewSelector._showAppsButton.checked)
                showNotesIcon.toggleButton.checked = false;
        }));
    signal_show = Main.overview.connect('showing',
        function () { showNotesIcon.toggleButton.checked = false; });
    viewSelector._a11yFocusPage = _a11yFocusPage;
    viewSelector._onStageKeyPress = _onStageKeyPress;
    Main.overview._controls._dashSlider.slideOut = slideOut;

    // Add shortcut
    Main.wm.addKeybinding('toggle-notes-view',
                          Convenience.getSettings(),
                          Meta.KeyBindingFlags.NONE,
                          Shell.ActionMode.NORMAL |
                          Shell.ActionMode.OVERVIEW,
                          toggleNotesPage);
}

function disable() {
    Main.wm.removeKeybinding('toggle-notes-view');

    Main.overview._controls._dashSlider.slideOut = slideOutOld;
    viewSelector._onStageKeyPress = _onStageKeyPressOld;
    viewSelector._a11yFocusPage = _a11yFocusPageOld;
    Main.overview.disconnect(signal_show);
    viewSelector._showAppsButton.disconnect(signal_apps);
    showNotesIcon.toggleButton.disconnect(signal_notes);

    notesPage.destroy();
    notesPage = null;
    notesView = null;

    dash._box.remove_actor(showNotesIcon);
    showNotesIcon.destroy();
    showNotesIcon = null;
}
