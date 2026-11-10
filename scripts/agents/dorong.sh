#!/bin/sh
# npm run dorong: push main satu per satu, dari membaca posisi GitHub sampai push selesai (10 Nov 2026).
# Antrean di pre-push tidak cukup: git membaca posisi main SEBELUM hook jalan, jadi push yang menunggu uji sesi lain
# membawa posisi basi dan ditolak GitHub ("cannot lock ref"). Di sini tiap giliran menyusul dulu, baru push.
# Uji tetap dijalankan pre-push. Gagal uji berhenti, hanya rebutan posisi yang diulang.
cd "$(git rev-parse --show-toplevel)" || exit 1

kunci="$(git rev-parse --git-common-dir)/dorong.kunci"
until mkdir "$kunci" 2>/dev/null; do
  lain=$(cat "$kunci/pid" 2>/dev/null)
  if [ -n "$lain" ] && ! kill -0 "$lain" 2>/dev/null; then rm -f "$kunci/pid"; rmdir "$kunci" 2>/dev/null; continue; fi
  [ -z "$tunggu" ] && { echo "dorong: menunggu push sesi lain selesai ..."; tunggu=1; }
  sleep 5
done
echo $$ > "$kunci/pid"
catatan=$(mktemp "${TMPDIR:-/tmp}/dorong.XXXXXX") || exit 1
bersih() { rm -f "$catatan" "$kunci/pid"; rmdir "$kunci" 2>/dev/null; }
trap bersih EXIT
trap 'exit 130' INT TERM HUP

percobaan=1
while [ "$percobaan" -le 5 ]; do
  git fetch -q origin main || { echo "dorong: gagal membaca GitHub."; exit 1; }
  if ! git merge-base --is-ancestor origin/main HEAD; then
    if ! git pull -q --rebase --autostash origin main; then
      git rebase --abort 2>/dev/null
      echo "dorong: gagal menyusul origin/main karena bentrok. Commit lokal utuh, belum ada yang didorong."
      exit 1
    fi
  fi
  git push origin main 2>&1 | tee "$catatan"
  git fetch -q origin main
  if git merge-base --is-ancestor HEAD origin/main; then
    echo "dorong: masuk origin/main di $(git rev-parse --short HEAD)."
    exit 0
  fi
  grep -Eq 'sudah maju|cannot lock ref|non-fast-forward|fetch first' "$catatan" || { echo "dorong: gagal, bukan karena rebutan posisi."; exit 1; }
  echo "dorong: main bergerak, menyusul dan mengulang (percobaan $percobaan dari 5)."
  percobaan=$((percobaan + 1))
done
echo "dorong: masih kalah rebutan setelah 5 percobaan."
exit 1
