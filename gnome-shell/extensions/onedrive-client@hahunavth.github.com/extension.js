try {
  const St = imports.gi.St;
} catch(err) {
  log("St doesn't exist");
}

try {
  const Main = imports.ui.main;
} catch(err) {
  log("Main doesn't exist");
}

let panelButton, panelButtonText;

function init() {
  try{
    panelButton = St.Bin({
      style_class: "panel-button" 
    })
    
    panelButtonText = St.Label({
      style_class: "examplePanelText",
      text: "starting..."
    });
    panelButton.set_child(panelButtonText);
  } catch(err) {
    log('err in init');
  }
}

function enable() {
  try {
      Main.panel._rightBox.insert_child_at_index(panelButton, 1);
  }catch(err) {
    log('err in enable func');
  }
}

function disable() {
  try{
    Main.panel._rightBox.remove_child(panelButton);
  }catch (err) {
     log('err in disable func')
   }
}
