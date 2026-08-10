#!/usr/bin/env python3
"""Add official website / repo / docs URLs to entity files.

Only well-established, stable URLs are listed here. Anything uncertain is
left out — a wrong outbound link is worse than a missing one. The Wikidata
step in update-versions.mjs fills `sameAs` separately.
"""
import pathlib

# slug: (website, repo, docs)
LINKS = {
    # ---- distributions ----
    "debian": ("https://www.debian.org", "https://salsa.debian.org", "https://www.debian.org/doc/"),
    "ubuntu": ("https://ubuntu.com", "https://git.launchpad.net/ubuntu", "https://help.ubuntu.com"),
    "fedora": ("https://fedoraproject.org", "https://src.fedoraproject.org", "https://docs.fedoraproject.org"),
    "arch": ("https://archlinux.org", "https://gitlab.archlinux.org/archlinux", "https://wiki.archlinux.org"),
    "linux-mint": ("https://linuxmint.com", "https://github.com/linuxmint", "https://linuxmint-user-guide.readthedocs.io"),
    "opensuse": ("https://www.opensuse.org", "https://github.com/openSUSE", "https://doc.opensuse.org"),
    "opensuse-tumbleweed": ("https://get.opensuse.org/tumbleweed/", "https://github.com/openSUSE", "https://doc.opensuse.org"),
    "manjaro": ("https://manjaro.org", "https://github.com/manjaro", "https://wiki.manjaro.org"),
    "pop-os": ("https://pop.system76.com", "https://github.com/pop-os", "https://support.system76.com"),
    "elementary-os": ("https://elementary.io", "https://github.com/elementary", "https://docs.elementary.io"),
    "zorin-os": ("https://zorin.com/os/", None, "https://help.zorin.com"),
    "mx-linux": ("https://mxlinux.org", "https://github.com/MX-Linux", "https://mxlinux.org/wiki/"),
    "endeavouros": ("https://endeavouros.com", "https://github.com/endeavouros-team", "https://discovery.endeavouros.com"),
    "nixos": ("https://nixos.org", "https://github.com/NixOS/nixpkgs", "https://nixos.org/manual/nixos/stable/"),
    "gentoo": ("https://www.gentoo.org", "https://github.com/gentoo/gentoo", "https://wiki.gentoo.org"),
    "alpine": ("https://alpinelinux.org", "https://gitlab.alpinelinux.org/alpine", "https://docs.alpinelinux.org"),
    "kali": ("https://www.kali.org", "https://gitlab.com/kalilinux", "https://www.kali.org/docs/"),
    "almalinux": ("https://almalinux.org", "https://github.com/AlmaLinux", "https://wiki.almalinux.org"),
    "rocky": ("https://rockylinux.org", "https://github.com/rocky-linux", "https://docs.rockylinux.org"),
    "void": ("https://voidlinux.org", "https://github.com/void-linux/void-packages", "https://docs.voidlinux.org"),
    "garuda": ("https://garudalinux.org", "https://gitlab.com/garuda-linux", "https://wiki.garudalinux.org"),
    "solus": ("https://getsol.us", "https://github.com/getsolus", "https://help.getsol.us"),
    "slackware": ("http://www.slackware.com", None, "https://docs.slackware.com"),
    "kubuntu": ("https://kubuntu.org", None, "https://kubuntu.org/faq/"),
    "xubuntu": ("https://xubuntu.org", None, "https://docs.xubuntu.org"),
    "tails": ("https://tails.net", "https://gitlab.tails.boum.org/tails/tails", "https://tails.net/doc/"),
    "qubes": ("https://www.qubes-os.org", "https://github.com/QubesOS", "https://www.qubes-os.org/doc/"),
    "raspberry-pi-os": ("https://www.raspberrypi.com/software/", "https://github.com/RPi-Distro", "https://www.raspberrypi.com/documentation/"),
    "bazzite": ("https://bazzite.gg", "https://github.com/ublue-os/bazzite", "https://docs.bazzite.gg"),
    "cachyos": ("https://cachyos.org", "https://github.com/CachyOS", "https://wiki.cachyos.org"),

    # ---- desktops ----
    "gnome": ("https://www.gnome.org", "https://gitlab.gnome.org/GNOME", "https://help.gnome.org"),
    "kde-plasma": ("https://kde.org/plasma-desktop/", "https://invent.kde.org/plasma", "https://docs.kde.org"),
    "xfce": ("https://xfce.org", "https://gitlab.xfce.org/xfce", "https://docs.xfce.org"),
    "cinnamon": ("https://projects.linuxmint.com/cinnamon/", "https://github.com/linuxmint/cinnamon", None),
    "mate": ("https://mate-desktop.org", "https://github.com/mate-desktop", "https://mate-desktop.org/help/"),
    "budgie": ("https://buddiesofbudgie.org", "https://github.com/BuddiesOfBudgie", None),
    "lxqt": ("https://lxqt-project.org", "https://github.com/lxqt", None),
    "cosmic": ("https://system76.com/cosmic/", "https://github.com/pop-os/cosmic-epoch", None),
    "pantheon": ("https://elementary.io", "https://github.com/elementary", "https://docs.elementary.io"),
    "deepin-de": ("https://www.deepin.org", "https://github.com/linuxdeepin", None),
    "enlightenment": ("https://www.enlightenment.org", "https://git.enlightenment.org", None),
    "lxde": ("https://www.lxde.org", "https://github.com/lxde", None),
    "cutefish": (None, "https://github.com/cutefishos", None),
    "trinity": ("https://www.trinitydesktop.org", "https://mirror.git.trinitydesktop.org", None),

    # ---- window managers ----
    "hyprland": ("https://hypr.land", "https://github.com/hyprwm/Hyprland", "https://wiki.hypr.land"),
    "sway": ("https://swaywm.org", "https://github.com/swaywm/sway", "https://github.com/swaywm/sway/wiki"),
    "i3": ("https://i3wm.org", "https://github.com/i3/i3", "https://i3wm.org/docs/"),
    "bspwm": (None, "https://github.com/baskerville/bspwm", None),
    "awesomewm": ("https://awesomewm.org", "https://github.com/awesomeWM/awesome", "https://awesomewm.org/doc/api/"),
    "dwm": ("https://dwm.suckless.org", "https://git.suckless.org/dwm/", None),
    "qtile": ("https://qtile.org", "https://github.com/qtile/qtile", "https://docs.qtile.org"),
    "openbox": ("http://openbox.org", "https://github.com/danakj/openbox", None),
    "river": (None, "https://codeberg.org/river/river", None),
    "niri": (None, "https://github.com/YaLTeR/niri", "https://yalter.github.io/niri/"),

    # ---- projects ----
    "linux-kernel": ("https://www.kernel.org", "https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git", "https://docs.kernel.org"),
    "gtk": ("https://www.gtk.org", "https://gitlab.gnome.org/GNOME/gtk", "https://docs.gtk.org"),
    "qt": ("https://www.qt.io", "https://code.qt.io", "https://doc.qt.io"),
    "wayland": ("https://wayland.freedesktop.org", "https://gitlab.freedesktop.org/wayland/wayland", "https://wayland.freedesktop.org/docs/html/"),
    "systemd": ("https://systemd.io", "https://github.com/systemd/systemd", "https://www.freedesktop.org/software/systemd/man/"),
    "flatpak": ("https://flatpak.org", "https://github.com/flatpak/flatpak", "https://docs.flatpak.org"),
    "firefox": ("https://www.mozilla.org/firefox/", "https://github.com/mozilla-firefox/firefox", "https://support.mozilla.org"),
    "libreoffice": ("https://www.libreoffice.org", "https://git.libreoffice.org/core", "https://documentation.libreoffice.org"),
    "blender": ("https://www.blender.org", "https://projects.blender.org/blender/blender", "https://docs.blender.org"),
    "git": ("https://git-scm.com", "https://github.com/git/git", "https://git-scm.com/doc"),

    # ---- communities ----
    "shirazlug": ("https://shirazlug.ir", "https://github.com/shirazlug", None),
    "fosdem": ("https://fosdem.org", None, None),
}

ROOT = pathlib.Path("content/entities")
touched = 0

for path in sorted(ROOT.rglob("*.md")):
    slug = path.stem
    if slug.startswith("_") or slug not in LINKS:
        continue
    website, repo, docs = LINKS[slug]
    text = path.read_text(encoding="utf-8")
    head, sep, body = text.partition("\n---\n")
    if not sep:
        continue

    additions = []
    for key, value in (("website", website), ("repo", repo), ("docs", docs)):
        if value and f"\n{key}:" not in head:
            additions.append(f"{key}: {value}")

    if not additions:
        continue

    # Insert right after `summary:` so the frontmatter stays readable.
    lines = head.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("summary:"):
            lines[i + 1 : i + 1] = additions
            break
    else:
        lines.extend(additions)

    path.write_text("\n".join(lines) + sep + body, encoding="utf-8")
    touched += 1

print(f"updated {touched} entities")
