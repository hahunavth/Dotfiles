echo 'EXEC: rpm -qa > ./package_all.bak'
rpm -qa > ./list/package_all.bak
echo 'EXEC: sudo dnf history userinstalled > ./package_user.bak'
apt-mark showmanual > ./list/package_user.bak
echo 'EXEC: snap list > package_snap.bak'
snap list > ./list/package_snap.bak
echo 'EXEC: flatpak list > package_flatpak.bak' 
flatpak list > ./list/package_flatpak.bak
echo 'Enjoy!'
