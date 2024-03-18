#!/bin/bash
echo STAGE 0: INSTALL IBUS BAMBOO, MOZC, ...
set -x

# see https://tuong.me/huong-dan-cai-dat-bo-go-tieng-viet-cho-ubuntu-ibus-unikey/
sudo add-apt-repository ppa:bamboo-engine/ibus-bamboo -y
sudo apt-get update
sudo apt-get install ibus ibus-bamboo –install-recommends +
ibus restart

# see https://linux-packages.com/ubuntu-jammy-jellyfish/package/ibus-mozc
sudo apt install ibus-mozc -y

ibus restart

# MANUALLY: 
# - logout and login again
# - Set input source in gnome setting
