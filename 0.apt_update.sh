#!/bin/bash

echo STAGE 0: 

set -x


# apt update
sudo apt update
sudo apt upgrade -y
sudo apt install software-properties-common apt-transport-https wget -y

# install new package manager
sudo apt install nala -y

echo require set manualy
sudo nala fetch


# install packages

sudo nala install curl git neovim -y
