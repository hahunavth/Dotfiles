#!/bin/bash
echo STAGE 2: Setup stow
set -x

# see https://community.hetzner.com/tutorials/using-gnu-stow-to-manage-manually-compiled-software
sudo apt install stow build-essential -y
echo "alias stow='sudo STOW_DIR=/usr/local/stow /usr/bin/stow'" >> ~/.zshrc
source ~/.zshrc
