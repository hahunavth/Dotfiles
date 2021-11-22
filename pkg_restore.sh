
# Install from the package list
# In order to install from these lists you can do

sudo pacman -S --needed $(comm -12 <(pacman -Slq|sort) <(sort pkglist.txt) )

# and

pacaur -S --noedit --noconfirm --needed localpkglist.txt


