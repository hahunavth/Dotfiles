# Dotfiles
**./Dotfiles**
```bash
.vimrc
.zshrc
.config/nvim/init.vim
.config/onedrive/config
.config/onedrive/
.local/share/gnome-shell
.themes
.icons
.autojump
.oh-my-zsh
```

### Usage:
 - Config: edit ./Dotfiles
 - Backup:
     ```bash
     ./backup.sh
     ```
 - Restore:
     ```bash
     ./restore.sh
     ```

### Install zsh:
```bash
# zsh
sudo apt install zsh
chsh -s $(which zsh)

# oh my zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# autojump
git clone git://github.com/wting/autojump.git
cd autojump
./install.py

# rust
curl https://sh.rustup.rs -sSf | sh

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
nvm install --lts
nvm ls-remote
nvm use v14.17.6
npm install -g yarn

# pyenv
git clone https://github.com/pyenv/pyenv.git ~/.pyenv
cd ~/.pyenv && src/configure && make -C src
pyenv install --list
python -v
pip install --upgrade pip

# r
sudo apt-get install r-base r-base-dev

```

### Package
#### Debian
- For debian: [Debian.md](./Debian.md)
#### Snap
```bash
snap install alacritty atom notion-snap sublime-text heroku
```
#### Flatpak
```sh
```