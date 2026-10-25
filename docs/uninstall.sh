#!/bin/sh
# Remove Aloi for the current user on macOS or Linux.
#
#   sh uninstall.sh            removes the program; your settings, portfolio and watchlist stay
#   sh uninstall.sh --purge    also removes ~/.aloi (the saved API key stays in the system's
#                              credential store; remove "aloi" there if you want it gone too)

set -eu

rm -rf "$HOME/.local/share/aloi"
rm -f "$HOME/.local/bin/aloi"
if [ "${1:-}" = "--purge" ]; then rm -rf "$HOME/.aloi"; fi
echo "Aloi is removed."
