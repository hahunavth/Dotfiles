# The following command creates a list with your packages, that you can curate and store under private versioning control.

pacman -Qqen > pkglist.txt

# And this will create a list with the packages that were installed external to the pacman database, either manually installed or from the AUR.

pacman -Qqem > localpkglist.txt

