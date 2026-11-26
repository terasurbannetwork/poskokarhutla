#!/bin/sh
# Pasang surut BMKG dari Mac pemilik (26 Nov 2026). Sejak 24 Nov 2026 maritim.bmkg.go.id membalas IP runner GitHub dengan
# tantangan Cloudflare (HTTP 403 "Just a moment"), dari jaringan Mac masih 200. Langkah pasut di banjir.yml tetap ada dan
# pulih sendiri bila BMKG membuka lagi; skrip ini cadangan yang dijalankan launchd (scripts/agents/pasut_lokal.plist).
# Hanya pasut.json dan pasut_30h.json yang di-commit, lewat index sementara, supaya suntingan sesi lain di index bersama
# tidak ikut terbawa. Push lewat npm run dorong (uji pre-push tetap jalan). Pasang: npm run pasut:pasang.
set -eu
cd "$(dirname "$0")/../.."
PY="uv run --no-project --python 3.12 python"
F="public/banjir/data/pasut.json public/banjir/data/pasut_30h.json"
echo "pasut_lokal $(date '+%Y-%m-%d %H:%M')"
[ "$(git symbolic-ref -q --short HEAD)" = main ] || { echo "bukan di main, dilewati"; exit 0; }
$PY scripts/banjir/pasut.py uji
$PY scripts/banjir/pasut.py
git diff --quiet HEAD -- $F && { echo "pasut tidak berubah"; exit 0; }
idx=$(mktemp "${TMPDIR:-/tmp}/pasut-idx.XXXXXX"); trap 'rm -f "$idx"' EXIT
lama=$(git rev-parse HEAD)
GIT_INDEX_FILE=$idx git read-tree "$lama"
GIT_INDEX_FILE=$idx git add -- $F
baru=$(git commit-tree "$(GIT_INDEX_FILE=$idx git write-tree)" -p "$lama" -m "Pasut: prediksi pasang surut BMKG dari Mac (runner GitHub diblokir Cloudflare BMKG)")
git update-ref refs/heads/main "$baru" "$lama"
git reset -q -- $F   # index bersama ikut HEAD untuk dua berkas ini, selebihnya tidak disentuh
npm run --silent dorong
