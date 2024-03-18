#!/bin/bash
echo STAGE 1: INSTALL ZSH, OMZ, ...
set -x

echo Install zsh
sudo apt install zsh -y

echo Install oh my zsh
sh -c "$(wget https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"

# plugins
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
echo NOTE: require edit .zshrc

# change default shell
chsh -s $(which zsh)
echo NOTE: if you use gnome-terminal, change the default command in app setting.
