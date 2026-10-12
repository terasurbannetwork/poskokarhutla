#!/usr/bin/env bash
# Pasang kunci ke .env dan ke GitHub Actions secret. Nilai tidak pernah tampil di layar.
# Kunci yang belum ada di .env ditanyakan lewat kotak isian macOS (input tersembunyi).
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=terasurbannetwork/poskokarhutla
touch .env && chmod 600 .env

tanya() { # $1 = judul kotak isian
  osascript -e "text returned of (display dialog \"$1\" default answer \"\" with hidden answer buttons {\"Lewati\", \"Simpan\"} default button \"Simpan\" with title \"Posko Karhutla\")" 2>/dev/null || true
}

simpan_env() { # $1 nama, $2 nilai: ganti baris lama atau tambah baris baru
  grep -v -E "^$1=" .env > .env.tmp || true
  printf '%s=%s\n' "$1" "$2" >> .env.tmp && mv .env.tmp .env && chmod 600 .env
}

n=0
for pasangan in "FIRMS_MAP_KEY|Tempel NASA FIRMS MAP_KEY" "EARTHDATA_TOKEN|Tempel token NASA Earthdata (boleh dilewati)" \
  "CLOUDFLARE_API_TOKEN|Tempel Cloudflare API token (template Edit Cloudflare Workers)" "CLOUDFLARE_ACCOUNT_ID|Tempel Cloudflare Account ID" \
  "OPENAQ_API_KEY|Tempel OpenAQ API key (boleh dilewati)"; do
  nama=${pasangan%%|*}; judul=${pasangan#*|}
  nilai=$(grep -E "^${nama}=" .env | head -1 | cut -d= -f2- | tr -d '[:space:]"' || true)
  lama=$nilai
  [ "${1:-}" = "--ulang" ] && nilai=""
  if [ -z "$nilai" ]; then
    nilai=$(tanya "$judul" | tr -d '[:space:]"')
    if [ -n "$nilai" ]; then simpan_env "$nama" "$nilai"; else nilai=$lama; fi
  fi
  if [ -z "$nilai" ]; then echo "- $nama dilewati"; continue; fi
  printf '%s' "$nilai" | gh secret set "$nama" --repo "$REPO"
  echo "- $nama terpasang di .env dan GitHub (${#nilai} karakter)"; n=$((n+1))
done
[ "$n" -gt 0 ] || { echo "Tidak ada kunci yang dipasang."; exit 1; }
gh secret list --repo "$REPO"
