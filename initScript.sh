### Manjaro 21.2 init

# Dual boot time fix
timedatectl set-local-rtc 1 --adjust-system-clock

## error: GPGME error: No data

# sudo cp -f "/etc/pacman.conf" "/etc/pacman.conf.orig"
# sudo sed -i 's/SigLevel.*/SigLevel = Never/' /etc/pacman.conf
# sudo pacman -Syy gnupg archlinux-keyring manjaro-keyring --ignore manjaro-system
# sudo mv -f "/etc/pacman.conf.orig" "/etc/pacman.conf"
# sudo pacman -Syu

# sudo rm -r /etc/pacman.d/gnupg 
# sudo pacman -Scc
# sudo pacman-mirrors --country all --api --protocols all
# sudo pacman -Syy gnupg archlinux-keyring manjaro-keyring
# sudo pacman-key --init
# sudo pacman-key --populate archlinux manjaro
# sudo pacman-key --refresh-keys

# ----- OK -----
sudo rm -R /var/lib/pacman/sync
sudo pacman -Syu

sudo pacman -S --needed base-devel
# ATTENTION: Check system time

## E: ERROR: can't list qgroups: quotas not enabled
 btrfs quota enable /

## Check memory chanel
sudo inxi -m

## Install yay
cd /opt
sudo git clone https://aur.archlinux.org/yay-git.git
sudo chown -R kryo:kryo ./yay-git
cd yay-git
makepkg -si

## install downgrade
pamac install downgrade

## ibus
pamac install ibus
pamac install ibus-bamboo

sudo nano /etc/profile
# add 
export GTK_IM_MODULE=ibus
export QT_IM_MODULE=ibus
export XMODIFIERS=@im=ibus
export QT4_IM_MODULE=ibus
export CLUTTER_IM_MODULE=ibus
ibus-daemon -drx

# docker
yay -S docker
sudo systemctl enable docker.service
sudo systemctl start docker.service
sudo usermod -aG docker $USER

# code
yay -S code-git atom notion-app












