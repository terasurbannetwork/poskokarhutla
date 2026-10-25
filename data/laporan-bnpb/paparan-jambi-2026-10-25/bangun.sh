#!/bin/sh
# Bangun paparan Jambi. Pakai: ./bangun.sh [cut-off ISO, bawaan 2026-10-25T06:00] [--tanpa-tarik]
set -e
cd "$(dirname "$0")"
CUT=${1:-2026-10-25T06:00}
CH=${CHROME:-$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell}
[ "$2" = "--tanpa-tarik" ] || ./tarik.sh
python3 data.py "$CUT"
[ -f ik/api-navy.png ] || python3 ikon.py "$CH"
python3 peta.py "$CH"
TG=$(echo "$CUT" | awk -F'[-T]' '{print $3 $2 substr($1,3,2)}')
python3 buat.py "Paparan Karhutla Provinsi Jambi $TG.pptx"
python3 pratinjau.py "Paparan Karhutla Provinsi Jambi $TG.pptx" "Paparan Karhutla Provinsi Jambi $TG.pdf" "$CH"
