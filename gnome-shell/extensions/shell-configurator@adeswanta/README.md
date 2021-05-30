# Shell Configurator
### Configure and customize GNOME Shell with advanced settings.

## Purpose
It use for configure and customize GNOME Shell with advanced settings. You can configure it like your own.

## You can configure
1. Panel
2. Dash (or Dock)
3. Overview
4. App Grid

For references, read the [REFERENCES.md](https://gitlab.com/adeswantaTechs/shell-configurator/-/blob/master/REFERENCES.md)

## This extension is supported by the following versions
| GNOME Shell Version          | State                 | Released Since        | End Of Support   |
| ---                          | ---                   | ---                   | ---              |
| Older versions (3.30 - 3.34) | Released              | v1 - 7 May 2021       | May 2026         |
| GNOME Shell 3.36             | Released              | v1 - 7 May 2021       | May 2026         |
| GNOME Shell 3.38             | Released              | v1 - 7 May 2021       | May 2026         |
| GNOME Shell 40               | Released              | v1 - 7 May 2021       | June 2026        |

* **Release state process: Under Construction &rarr; In development &rarr; In review &rarr; Released**
* **After GS Version support reaches the end of support date, the support/release state will be "Unsupported"**

## Installation
You can install this extension with these methods:

### Install from GNOME Shell Extensions website
Go to [GNOME Shell Extension Website](https://extensions.gnome.org), and search "Shell Configurator", then install/enable it.

### Install from GitLab Releases
To install it:
1. Go to [Releases](https://gitlab.com/adeswantaTechs/shell-configurator/-/releases) and download the extension package on Packages section
2. Follow these commands:
```bash
# for GNOME 3.32 below:
$ mkdir -p "/home/$USER/.local/share/gnome-shell/extensions/shell-configurator@adeswanta/"
$ unzip "shell-configurator@adeswanta.shell-extension.zip" -d "/home/$USER/.local/share/gnome-shell/extensions/shell-configurator@adeswanta/"
# for GNOME 3.34 above:
$ gnome-extensions install --force 'shell-configurator@adeswanta.shell-extension.zip'
```
Comming soon when initial release is released (currently in process)

### Build from Source method
Before installing, you need install these packages:
* `git` for cloning repository.
* `zip` for packing and unpacking archive (for GNOME 3.32 below).
* `gnome-shell-extensions` for packing and upcaking extension archive (for GNOME 3.34 above).

To install from source, follow these commands:
```bash
$ git clone https://gitlab.com/adeswantaTechs/shell-configurator.git
$ cd shell-configurator
$ ./installer.sh --build
# to install as user:
$ ./installer.sh --install USER
# or to install as system:
$ ./installer.sh --install SYSTEM
```

## Credits
This extension won't work without these creators/references:
* **[GNOME Shell source code on Gitlab](https://gitlab.gnome.org/GNOME/gnome-shell)** for shell library references
* **[GNOME Javascript Official Website](https://gjs.guide)** for **[porting extension](https://gjs.guide/extensions/upgrading/gnome-shell-40.html)** for GNOME 40 and GTK 4 and **[Documentation](https://gjs-docs.gnome.org/)**
* **[Just Perfection's GNOME Shell Desktop Extension](https://gitlab.com/justperfection.channel/just-perfection-gnome-shell-desktop)** for API reference and Prefs
* Edenhofer's **[Hide Workspace Thumbnails](https://extensions.gnome.org/extension/808/hide-workspace-thumbnails/)** for tweaking GS 3.38 below Workspace Thumbnails from **[Minimalism-Gnome-Shell](https://github.com/Edenhofer/Minimalism-Gnome-Shell)**
* Thoma5's **[Bottom Panel](https://github.com/Thoma5/gnome-shell-extension-bottompanel)** for panel position and callbacks
* Selenium-H's **[App Grid Tweaks](https://github.com/Selenium-H/App-Grid-Tweaks)** for app grid configurations

## License
**Shell Configurator is licensed under The GNU General Public License v3.0. See [LICENSE](https://gitlab.com/adeswantaTechs/shell-configurator/-/blob/master/LICENSE)**
