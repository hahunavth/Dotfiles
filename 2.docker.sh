#!/bin/bash
echo STAGE 2: INSTALL DOCKER, DOCKER DESKTOP, WITHOUT SUDO, ...
set -x

echo Step 1: install docker
# SEE https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo nala update
apt-cache policy docker-ce # Make sure you are about to install from the Docker repo instead of the default Ubuntu repo:

sudo apt install docker-ce -y
# sudo systemctl status docker # check


echo Step 2 — Executing the Docker Command Without Sudo 
sudo usermod -aG docker ${USER}
su - ${USER}
groups
sudo usermod -aG docker ${USER}


echo Step 3 - Test command
docker
docker compose
docker docker-subcommand --help
docker info
