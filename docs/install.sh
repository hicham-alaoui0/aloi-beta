#!/bin/sh
# Install Aloi for the current user on macOS or Linux. No administrator rights needed.
#
#   From the web:    curl -fsSL https://hicham-alaoui0.github.io/aloi-beta/install.sh | sh
#   From a file:     sh install.sh /path/to/aloi-linux-x64.tar.gz
#
# It unpacks the program to ~/.local/share/aloi and puts an `aloi` command in ~/.local/bin,
# so that typing `aloi` in any new terminal starts it. Your settings live in ~/.aloi and are
# left alone by installs and updates.

set -eu

case "$(uname -s)" in
    Linux) system=linux ;;
    Darwin) system=macos ;;
    *) echo "This installer is for macOS and Linux. On Windows, use install.ps1." >&2; exit 1 ;;
esac
case "$(uname -m)" in
    x86_64 | amd64) machine=x64 ;;
    arm64 | aarch64) machine=arm64 ;;
    *) machine=$(uname -m) ;;
esac
# A terminal running under Rosetta on an Apple Silicon Mac reports an Intel processor.
if [ "$system" = macos ] && [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = 1 ]; then machine=arm64; fi
case "$system-$machine" in
    linux-x64 | macos-arm64) ;;
    *) echo "There is no Aloi build for $system on $machine yet." >&2; exit 1 ;;
esac

# An archive on this machine or at a URL. The default is the latest release on GitHub.
source="${1:-${ALOI_DOWNLOAD_URL:-https://github.com/hicham-alaoui0/aloi-beta/releases/latest/download/aloi-$system-$machine.tar.gz}}"
target="$HOME/.local/share/aloi"
bin="$HOME/.local/bin"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

case "$source" in
    http://* | https://*)
        case "$source" in
            *YOUR-HOST*) echo "No download address is set. Pass the path or URL of the Aloi archive." >&2; exit 1 ;;
        esac
        echo "Downloading Aloi..."
        curl -fsSL "$source" -o "$work/aloi.tar.gz"
        archive="$work/aloi.tar.gz"
        ;;
    *) archive="$source" ;;
esac

echo "Unpacking..."
tar -xzf "$archive" -C "$work"
if [ ! -x "$work/aloi/aloi" ]; then echo "This archive does not contain Aloi." >&2; exit 1; fi

rm -rf "$target"
mkdir -p "$(dirname "$target")" "$bin"
mv "$work/aloi" "$target"
# A small script rather than a link: the program looks for its libraries next to itself.
printf '#!/bin/sh\nexec "%s/aloi" "$@"\n' "$target" > "$bin/aloi"
chmod +x "$bin/aloi"

# Put ~/.local/bin on the PATH of future terminals, once, if it is not there already.
case ":$PATH:" in
    *":$bin:"*) reopen="" ;;
    *)
        case "${SHELL:-}" in
            */zsh) profile="$HOME/.zshrc" ;;
            */bash) if [ "$system" = macos ]; then profile="$HOME/.bash_profile"; else profile="$HOME/.bashrc"; fi ;;
            *) profile="$HOME/.profile" ;;
        esac
        if ! grep -qs '\.local/bin' "$profile"; then
            printf '\n# Added by the Aloi installer\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$profile"
        fi
        reopen=" Open a new terminal first, so that it finds the command."
        ;;
esac

echo ""
echo "Installed $("$target/aloi" --version) in $target"
echo "Type  aloi  to start.$reopen"
