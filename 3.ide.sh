#!/bin/bash
echo STAGE 3: INSTALL VSCODE, ...
set -x

# SEE https://www.makeuseof.com/how-to-install-visual-studio-code-ubuntu/
echo INSTALL VSCODE
wget -q https://packages.microsoft.com/keys/microsoft.asc -O- | sudo apt-key add -
# fixme: require press enter
sudo add-apt-repository "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main"
sudo nala install code -y
code --version

# SEE https://dev.to/janetmutua/installing-jetbrains-toolbox-on-ubuntu-527f
echo INSTALL JETBRAIN TOOLBOX
sudo apt install libfuse2 -y
cd /tmp
wget -c https://download-cdn.jetbrains.com/toolbox/jetbrains-toolbox-2.1.0.18144.tar.gz
sudo tar -xzf jetbrains-toolbox-2.1.0.18144.tar.gz -C /opt
cd -
/opt/jetbrains-toolbox-2.1.0.18144/jetbrains-toolbox

# MANUALLY: 
# login vscode, enable sync
# update version jetbrain toolbox

