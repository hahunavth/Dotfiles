# PPAs
## Listing all available repositories
```shell
apt policy
```
## Install ppa
```shell
sudo apt-add-repository ppa:user/repository
```
## Remove ppa
-  Remove
```shell
sudo add-apt-repository --remove ppa:whatever/ppa
```
**or**
```shell
ls /etc/apt/sources.list.d
```
and remove `.list` file

- Then update with:
```shell
sudo apt-get update
```

# Package
## Search
```shell
apt-cache search regex | less
```
## Detail of package
```shell
apt show package_name
```