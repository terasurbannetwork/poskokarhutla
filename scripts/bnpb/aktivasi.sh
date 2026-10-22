#!/usr/bin/env bash
# Aktivasi produksi api padam: uji kering migrasi tertunda di salinan skema produksi,
# lalu cek secret Worker. Tanpa argumen hanya memeriksa; `--terapkan` menerapkan migrasi
# ke D1 produksi (dijalankan pemilik, bukan agent; AGENTS.md §9).
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=poskowarga
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "1. Ekspor skema produksi (tanpa data)"
npx wrangler d1 export "$DB" --remote --no-data --output "$TMP/skema.sql" >/dev/null
sqlite3 "$TMP/salinan.db" < "$TMP/skema.sql"

# Ekspor tanpa data tidak membawa isi d1_migrations, jadi daftarnya ditanyakan langsung.
sudah=$(npx wrangler d1 execute "$DB" --remote --json --command "SELECT name FROM d1_migrations" \
  | grep -o '"name": *"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
[ -n "$sudah" ] || { echo "   Daftar migrasi produksi kosong atau gagal dibaca; berhenti."; exit 1; }
tertunda=()
for f in migrations/[0-9]*.sql; do
  grep -qx "$(basename "$f")" <<<"$sudah" || tertunda+=("$f")
done
if [ ${#tertunda[@]} -eq 0 ]; then echo "   Semua migrasi sudah diterapkan."; else
  echo "2. Uji kering ${#tertunda[@]} migrasi tertunda di salinan"
  for f in "${tertunda[@]}"; do
    sqlite3 -bail "$TMP/salinan.db" < "$f" || { echo "   GAGAL: $f (produksi tidak disentuh)"; exit 1; }
    echo "   lolos $(basename "$f")"
  done
fi

echo "3. Secret Worker"
ada=$(npx wrangler secret list 2>/dev/null || echo "[]")
for s in VAPID_PUBLIK VAPID_PRIVAT VAPID_SUBJEK PIPA_TOKEN EMAIL_API_KEY; do
  grep -q "\"$s\"" <<<"$ada" && echo "   ada    $s" || echo "   KOSONG $s"
done
# EMAIL_FROM adalah var di wrangler.jsonc; @resend.dev hanya boleh mengirim ke pemilik akun Resend.
grep -q 'resend\.dev' wrangler.jsonc && echo "   EMAIL_FROM masih @resend.dev: email ke instansi tidak terkirim"

if [ "${1:-}" = "--terapkan" ] && [ ${#tertunda[@]} -gt 0 ]; then
  echo "4. Menerapkan ke produksi"
  # cadangan berisi data pribadi (NIP/NRP, email, WA): hanya pemilik berkas yang boleh membaca
  cad="$HOME/cadangan-$DB-$(date +%Y%m%d-%H%M).sql"
  ( umask 077; npx wrangler d1 export "$DB" --remote --output "$cad" )
  echo "   Cadangan: $cad (berisi data pribadi; hapus atau pindahkan ke penyimpanan terenkripsi setelah produksi terbukti sehat)"
  npx wrangler d1 migrations apply "$DB" --remote
  curl -fsS https://centurisk97.id/api/status | head -c 200; echo
elif [ ${#tertunda[@]} -gt 0 ]; then
  echo "Aman diterapkan. Jalankan: scripts/bnpb/aktivasi.sh --terapkan"
fi
