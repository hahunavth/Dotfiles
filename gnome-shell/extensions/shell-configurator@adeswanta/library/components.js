/**
 * SCComponents
 * 
 * @Description      Shell components for configuring shell properties and make it compatible
 * @Filename         components.js
 * @License          GNU General Public License v3.0
 */

// Panel (Top Panel) Component
var Panel = class {
    constructor(Main, SCMisc, shellVersion) {
        this._Main = Main;
        this._SCMisc = SCMisc;
        this._shellVersion = shellVersion;
    }

    // backup: Backup shell properties
    backup() {
        if (this._origin) {
            this._origin = {}
        }
        this._origin = {
            'visibility': (this._shellVersion >= 3.36) ?
                            this._Main.panel.visible :
                            this._Main.panel.actor.visible,
            'height': (this._shellVersion >= 3.36) ?
                        this._Main.panel.height :
                        this._Main.panel.actor.height,
            'panelPosition': this._getPosition()
        }
    }

    // restore: Restore properties
    restore() {
        this.visbility(this._origin['visibility']);
        this.height(this._origin['height']);
        this.position(this._origin['panelPosition']);
    }

    // visibility: Panel visibility
    visbility(state) {
        if (!this._SCMisc.isLocked()) {
            if (state) {
                // Set to previous panel height
                this.height((this.heightTemp) ? this.heightTemp : this._origin['height'], true);
                // Show the panel ghost
                if (this._shellVersion <= 3.38) {
                    this._Main.overview._overview.get_children()[0].show();
                }
                // Show the panel
                if (this._shellVersion >= 3.36) {
                    this._Main.panel.show();
                } else {
                    this._Main.panel.actor.show();
                }
                // Remove 'fix-338 / fix-40' style
                if (this._shellVersion >= 40) {
                    this._Main.layoutManager.uiGroup.remove_style_class_name('fix-40');
                } else {
                    this._Main.layoutManager.uiGroup.remove_style_class_name('fix-338');
                }
                // Remove 'no-top-panel' style
                this._Main.layoutManager.uiGroup.remove_style_class_name(this._SCMisc.getSCStyle('no-top-panel', 'all'));
            } else {
                // Add 'no-top-panel' style
                this._Main.layoutManager.uiGroup.add_style_class_name(this._SCMisc.getSCStyle('no-top-panel', 'all'));
                // Add 'fix-338 / fix-40' style to make search entry not closer to top
                if (this._shellVersion >= 40) {
                    this._Main.layoutManager.uiGroup.add_style_class_name('fix-40');
                } else {
                    this._Main.layoutManager.uiGroup.add_style_class_name('fix-338');
                }
                // Hide the panel
                if (this._shellVersion >= 3.36) {
                    this._Main.panel.hide();
                } else {
                    this._Main.panel.actor.hide();
                }
                // Hide the panel ghost
                if (this._shellVersion <= 3.38) {
                    this._Main.overview._overview.get_children()[0].hide();
                }
                this.heightTemp = (this._shellVersion >= 3.36) ? this._Main.panel.height : this._Main.panel.actor.height;
                this.height(0, true);
            }
        }
    }

    // height: Panel height size
    height(size, unlimited) {
        if (!this._SCMisc.isLocked()) {
            // It use for temporary
            if (unlimited) {
                if (this._shellVersion >= 3.36)
                    this._Main.panel.height = size;
                else
                    this._Main.panel.actor.height = size;
                return;
            }
            if (size >= 16 && size <= 128) {
                // Check if panel is visible. If true set panel height
                if (this._isVisible()) {
                    // Set panel height
                    if (this._shellVersion >= 3.36)
                        this._Main.panel.height = size;
                    else
                        this._Main.panel.actor.height = size;
                }
            }
        }
    }

    // position: Panel position
    position(position) {
        if (!this._SCMisc.isLocked()) {
            switch (position) {
                case 0: // TOP
                    // Set pivot point to top
                    //this._Main.layoutManager.panelBox.set_pivot_point(0, 0);
                    // Set position to top
                    this._Main.layoutManager.panelBox.set_position(0, 0);

                    // Check if panel is visible. If true, remove style classes
                    if (this._isVisible()) {
                        // Remove 'no-top-panel' style
                        this._Main.layoutManager.uiGroup.remove_style_class_name(this._SCMisc.getSCStyle('no-top-panel', 'all'));
                        // Remove 'fix-338 / fix-40' style
                        if (this._shellVersion >= 40) {
                            this._Main.layoutManager.uiGroup.remove_style_class_name('fix-40');
                        } else {
                            this._Main.layoutManager.uiGroup.remove_style_class_name('fix-338');
                        }
                        // Show the panel ghost
                        if (this._shellVersion <= 3.38) {
                            this._Main.overview._overview.get_children()[0].show();
                        }
                    }
                    // Reset the overview control style
                    if (this._shellVersion >= 3.36)
                        this._Main.overview._overview._controls.style = null;
                    else
                        this._Main.overview._controls.actor.style = null;
                    
                    // Remove 'bottom-panel' style
                    this._Main.layoutManager.uiGroup.remove_style_class_name('bottom-panel');
                    break;

                case 1: // BOTTOM
                    // Declare primary monitor resolution size
                    let primaryMonitor = this._Main.layoutManager.primaryMonitor.height;
                    let panelHeight = (this._shellVersion >= 3.36) ? this._Main.panel.height : this._Main.panel.actor.height;
                    // Set pivot point to top
                    //this._Main.layoutManager.panelBox.set_pivot_point(0, (-1) * (primaryMonitor - panelHeight));
                    // Set position to bottom
                    this._Main.layoutManager.panelBox.set_position(0, primaryMonitor - panelHeight);

                    // Add 'no-top-panel' style
                    this._Main.layoutManager.uiGroup.add_style_class_name(this._SCMisc.getSCStyle('no-top-panel', 'all'));
                    // Add 'bottom-panel' style to make panel menu move closer to bottom panel
                    this._Main.layoutManager.uiGroup.add_style_class_name('bottom-panel');
                    // Add 'fix-338 / fix-40' style to make search entry not closer to top
                    if (this._shellVersion >= 40) {
                        this._Main.layoutManager.uiGroup.add_style_class_name('fix-40');
                    } else {
                        this._Main.layoutManager.uiGroup.add_style_class_name('fix-338');
                    }

                    // Hide the panel ghost
                    if (this._shellVersion <= 3.38) {
                        this._Main.overview._overview.get_children()[0].hide();
                    }

                    // Set overview controls style to make panel didn't overlap the overview/window previews
                    if (this._shellVersion >= 3.36)
                        this._Main.overview._overview._controls.style = "margin-bottom: " + this._Main.panel.height + "px;";
                    else
                        this._Main.overview._controls.actor.style = "margin-bottom: " + this._Main.panel.actor.height + "px;";
                    break;

                default: this._SCMisc.sendError('manager', 'Unknown position');
            }
        }
    }

    // _getPosition: Get panel position
    _getPosition() {
        // Check panel y position
        let panelYPosition = this._Main.layoutManager.panelBox.get_position()[1];
        if (panelYPosition !== 0) {
            return 1; // return BOTTOM
        }
        return 0; // return TOP
    }

    _isVisible() {
        if (this._shellVersion >= 3.36) {
            // Return the panel visibility state
            return this._Main.panel.visible;
        } else {
            // Return the panel visibility state
            return this._Main.panel.actor.visible;
        } 
    }
}

// Dash (Dock) Component
var Dash = class {
    constructor(Main, SCMisc, shellVersion) {
        this._Main = Main;
        this._SCMisc = SCMisc;
        this._shellVersion = shellVersion;
    }

    // backup: Backup shell properties
    backup() {
        if (this._origin) {
            this._origin = {}
        }
        this._origin = {
            'visibility': (this._shellVersion >= 3.36) ? 
                            this._Main.overview.dash.visible :
                            this._Main.overview._dash.actor.visible,
        }
    }

    // restore: Restore properties
    restore() {
        this.visbility(this._origin['visibility']);
    }

    // visibility: Dash visibility
    visbility(state) {
        if (!this._SCMisc.isLocked()) {
            if (state) {
                // Show the dash
                if (this._shellVersion >= 3.36)
                    this._Main.overview.dash.show(); 
                else
                    this._Main.overview._dash.actor.show();
                // Set dash size to -1 (Default/fit)
                if (this._shellVersion >= 40) {
                    this._Main.overview.dash.height = -1;
                    this._Main.overview.dash.setMaxSize(-1, -1);
                    // Remove 'hidden-dash' style
                    this._Main.layoutManager.uiGroup.remove_style_class_name(this._SCMisc.getSCStyle('hidden-dash', '40'));
                } else if (this._shellVersion >= 3.36) {
                    this._Main.overview.dash.width = -1;
                    this._Main.overview.dash._maxHeight = -1;
                }
            } else {
                // Hide the dash
                if (this._shellVersion >= 3.36) 
                    this._Main.overview.dash.hide();
                else
                    this._Main.overview._dash.actor.hide();
                // Set dash size to 0 (not shown) to make view selector/workspace move closer to bottom/left
                if (this._shellVersion >= 40) {
                    this._Main.overview.dash.height = 0;
                    this._Main.overview.dash.setMaxSize(0, 0);
                    // Add 'hidden-dash' style for ui improvement
                    this._Main.layoutManager.uiGroup.add_style_class_name(this._SCMisc.getSCStyle('hidden-dash', '40'));
                } else if (this._shellVersion >= 3.36) {
                    this._Main.overview.dash.width = 0;
                    this._Main.overview.dash._maxHeight = 0;
                }
            }
        }
    }
}

// (Activities) Overview component
var Overview = class {
    constructor(Main, overviewControls, workspaceThumbnail, SCMisc, shellVersion) {
        this._Main = Main;
        this._OverviewControls = overviewControls;
        this._WorkspaceThumbnail = workspaceThumbnail
        this._SCMisc = SCMisc;
        this._shellVersion = shellVersion;
    }

    // backup: Backup shell properties
    backup() {
        if (this._origin) {
            this._origin = {}
        }
        this._origin = {
            'workspaceSwitcherVisibility': (this._shellVersion <= 3.38) ?
                                            this._OverviewControls.ThumbnailsSlider.prototype._getAlwaysZoomOut :
                                            this._workspaceSwitcherScaleIsZero(),
            'workspaceSwitcherPeekWidth': (this._shellVersion <= 3.38) ? this._OverviewControls.ThumbnailsSlider.prototype.getNonExpandedWidth : 0,
            'workspaceSwitcherScaleSize': (this._shellVersion >= 40) ? this._WorkspaceThumbnail.MAX_THUMBNAIL_SCALE : 5,
            'searchEntryVisibility': (this._shellVersion >= 3.36) ? 
                                        this._Main.overview.searchEntry.visible :
                                        this._Main.overview._searchEntry.visible
        }
    }

    // restore: Restore properties
    restore() {
        this.workspaceSwitcherVisibility(true);
        if (this._shellVersion <= 3.38) {
            this.workspaceSwitcherPeekWidth(-1);
        } else {
            this.workspaceSwitcherScaleSize(this._origin['workspaceSwitcherScaleSize'] * 100, false);
        }
        this.searchEntryVisibility(this._origin['searchEntryVisibility']);
    }

    // workspaceSwitcherVisibility: Workspace switcher visibility
    workspaceSwitcherVisibility(state, originSize) {
        if (state) {
            if (this._shellVersion >= 40) {
                // Set scale size to previous size
                this.workspaceSwitcherScaleSize(originSize, true);
                // Remove 'hidden-workspace-switcher' style
                this._Main.layoutManager.uiGroup.remove_style_class_name(this._SCMisc.getSCStyle('hidden-workspace-switcher', '40'));
            } else {
                // Make thumbnail slider trigger again like previous.
                this._OverviewControls.ThumbnailsSlider.prototype._getAlwaysZoomOut = this._origin['workspaceSwitcherVisibility'];
                // Set peek width to previous width
                this.workspaceSwitcherPeekWidth(originSize);
                // Remove 'hidden-workspace-switcher' style
                this._Main.layoutManager.uiGroup.remove_style_class_name(this._SCMisc.getSCStyle('hidden-workspace-switcher', '3.38'));
            }
        } else {
            if (this._shellVersion >= 40) {
                // Set scale size to 0
                this.workspaceSwitcherScaleSize(0, true);
                // Add 'hidden-workspace-switcher' style to make workspace indicator not shown
                this._Main.layoutManager.uiGroup.add_style_class_name(this._SCMisc.getSCStyle('hidden-workspace-switcher', '40'));
            } else {
                // Make thumbnail slider didn't trigger
                this._OverviewControls.ThumbnailsSlider.prototype._getAlwaysZoomOut = () => { return false; };
                // Set peek width to 0
                this.workspaceSwitcherPeekWidth(0);
                // Add 'hidden-workspace-switcher' style
                this._Main.layoutManager.uiGroup.add_style_class_name(this._SCMisc.getSCStyle('hidden-workspace-switcher', '3.38'));
            }
        }
    }

    // workspaceSwitcherPeekWidth: Workspace switcher peek width when it isn't in expanded state
    workspaceSwitcherPeekWidth(width) {
        if (this._shellVersion <= 3.38) {
            if (width == -1) {
                // Set peek width to previous width
                this._OverviewControls.ThumbnailsSlider.prototype.getNonExpandedWidth = this._origin['workspaceSwitcherPeekWidth'];
            } else if (width >= 0 && width <= 96) {
                // Set peek width by returning user value
                this._OverviewControls.ThumbnailsSlider.prototype.getNonExpandedWidth = () => {
                    return width;
                }
            }
        }
    }

    // workspaceSwitcherScaleSize: Workspace switcher scale size on the top of overview on overview state
    workspaceSwitcherScaleSize(precentage, unlimited) {
        if (this._shellVersion >= 40) {
            // It use for temporary
            if (unlimited) {
                this._WorkspaceThumbnail.MAX_THUMBNAIL_SCALE = precentage / 100;
                return;
            }
            if (precentage >= 2 && precentage <= 10) {
                // Set scale size by chaning maximum scale size
                this._WorkspaceThumbnail.MAX_THUMBNAIL_SCALE = precentage / 100;
            }
        }
    }

    // _workspaceSwitcherScaleIsZero: Check if workspace switcher scale size is 0 (zero)
    _workspaceSwitcherScaleIsZero() {
        // Check by getting MAX_THUMBNAIL_SCALE varibale from WorkspaceThumnail library
        if (this._shellVersion >= 40) {
            if (this._WorkspaceThumbnail.MAX_THUMBNAIL_SCALE >= 0.02) {
                return true;
            } else {
                return false;
            }
        }
    }

    // searchEntryVisibility: Search entry visiblity
    searchEntryVisibility(state) {
        if (state) {
             // Show search entry
             if (this._shellVersion >= 3.36)
                 this._Main.overview.searchEntry.show();
             else
                 this._Main.overview._searchEntry.show();
        } else {
            // Hide search entry
            if (this._shellVersion >= 3.36)
                this._Main.overview.searchEntry.hide();
            else
                this._Main.overview._searchEntry.hide();
        }
    }
}

// App Grid (View Selector) components
var AppGrid = class {
    constructor(Main, SCMisc, shellVersion) {
        this._Main = Main;
        this._SCMisc = SCMisc;
        this._shellVersion = shellVersion;
    }

    // backup: Backup shell properties
    backup() {
        if (this._origin) {
            this._origin = {}
        }
        this._origin = {
            'rows': (this._shellVersion >= 3.38) ? 
                        (this._shellVersion >= 40) ?
                            this._Main.overview._overview._controls._appDisplay._grid.layout_manager.rows_per_page :
                            this._Main.overview.viewSelector.appDisplay._grid.layout_manager.rows_per_page : 
                        this._Main.overview.viewSelector.appDisplay._views[0].view._grid._minRows ||
                        this._Main.overview.viewSelector.appDisplay._views[1].view._grid._minRows,
            'columns': (this._shellVersion >= 3.38) ? 
                            (this._shellVersion >= 40) ?
                                this._Main.overview._overview._controls._appDisplay._grid.layout_manager.columns_per_page :
                                this._Main.overview.viewSelector.appDisplay._grid.layout_manager.columns_per_page :
                            this._Main.overview.viewSelector.appDisplay._views[0].view._grid._colLimit ||
                            this._Main.overview.viewSelector.appDisplay._views[1].view._grid._colLimit,
        }
    }

    // restore: Restore properties
    restore() {
        this.rows(this._origin['rows']);
        this.columns(this._origin['columns']);
    }

    // rows: AppGrid row page item
    rows(size) {
        if (size >= 2 && size <= 12) {
            if (this._shellVersion >= 3.38) {
                if (this._shellVersion >= 40) {
                    // Set row size
                    this._Main.overview._overview._controls._appDisplay._grid.layout_manager.rows_per_page = size;
                    // Refresh App Display look
                    this._Main.overview._overview._controls._appDisplay._redisplay();
                } else {
                    // Set row size
                    this._Main.overview.viewSelector.appDisplay._grid.layout_manager.rows_per_page = size;
                    // Refresh App Display look
                    this._Main.overview.viewSelector.appDisplay._redisplay();
                }
            } else {
                // Set row size for frequent page
                this._Main.overview.viewSelector.appDisplay._views[0].view._grid._minRows = size;
                // Refresh App Display look
                this._Main.overview.viewSelector.appDisplay._views[0].view._redisplay();
                // Set row size for all (apps) page
                this._Main.overview.viewSelector.appDisplay._views[1].view._grid._minRows = size;
                // Refresh App Display look
                this._Main.overview.viewSelector.appDisplay._views[1].view._redisplay();
            }
        } else {
            this._SCMisc.sendError('manager', 'Item must be around 2 - 12');
        }
    }

    // columns: AppGrid column page item
    columns(size) {
        if (size >= 2 && size <= 12) {
            if (this._shellVersion >= 3.38) {
                if (this._shellVersion >= 40) {
                    // Set row size
                    this._Main.overview._overview._controls._appDisplay._grid.layout_manager.columns_per_page = size;
                    // Refresh App Display look
                    this._Main.overview._overview._controls._appDisplay._redisplay();
                } else {
                    // Set column size
                    this._Main.overview.viewSelector.appDisplay._grid.layout_manager.columns_per_page = size;
                    // Refresh App Display look
                    this._Main.overview.viewSelector.appDisplay._redisplay();
                }
            } else {
                // Set column size for frequent page
                this._Main.overview.viewSelector.appDisplay._views[0].view._grid._colLimit = size;
                // Refresh App Display look
                this._Main.overview.viewSelector.appDisplay._views[0].view._redisplay();
                // Set column size for all (apps) page
                this._Main.overview.viewSelector.appDisplay._views[1].view._grid._colLimit = size;
                // Refresh App Display look
                this._Main.overview.viewSelector.appDisplay._views[1].view._redisplay();
            }
        } else {
            this._SCMisc.sendError('manager', 'Size must be around 2 - 12');
        }
    }
}