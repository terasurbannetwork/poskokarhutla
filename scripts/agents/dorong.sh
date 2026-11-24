#!/bin/sh
# npm run dorong: push main satu per satu, dari membaca posisi GitHub sampai push selesai (10 Nov 2026).
# Antrean di pre-push tidak cukup: git membaca posisi main SEBELUM hook jalan, jadi push yang menunggu uji sesi lain
# membawa posisi basi dan ditolak GitHub ("cannot lock ref"). Di sini tiap giliran menyusul dulu, baru push.
# Uji tetap dijalankan pre-push. Gagal uji berhenti, hanya rebutan posisi yang diulang.
cd "$(git rev-parse --show-toplevel)" || exit 1

# Satu pendorong (pemilik 20 Nov 2026: "cukup satu sesi aja yang push. Jika sudah ada yang lainnya ga bisa"): bila sesi lain sedang mendorong,
# keluar 0 dan biarkan pendorong itu membawa commit ini; pendorong mengulang sampai tidak ada commit lokal yang tertinggal.
# Dulu tiap sesi antre dan menguji ulang hal yang sama (20 Nov 2026: enam antrean, yang terlama 54 menit).
kunci="$(git rev-parse --git-common-dir)/dorong.kunci"
until mkdir "$kunci" 2>/dev/null; do
  lain=$(cat "$kunci/pid" 2>/dev/null)
  if [ -n "$lain" ] && ! kill -0 "$lain" 2>/dev/null; then rm -f "$kunci/pid"; rmdir "$kunci" 2>/dev/null; continue; fi
  if [ -n "$lain" ]; then
    echo "dorong: push sedang dijalankan sesi lain (pid $lain). Commit lokal ikut terbawa olehnya; tidak perlu menunggu atau push lagi."
    exit 0
  fi
  sleep 1   # kunci baru dibuat tetapi pid belum tertulis
done
echo $$ > "$kunci/pid"
catatan=$(mktemp "${TMPDIR:-/tmp}/dorong.XXXXXX") || exit 1
bersih() { rm -f "$catatan" "$kunci/pid"; rmdir "$kunci" 2>/dev/null; }
trap bersih EXIT
trap 'exit 130' INT TERM HUP

percobaan=1; putaran=0
while [ "$percobaan" -le 5 ]; do
  git fetch -q origin main || { echo "dorong: gagal membaca GitHub."; exit 1; }
  if ! git merge-base --is-ancestor origin/main HEAD; then
    if ! git pull -q --rebase --autostash origin main; then
      git rebase --abort 2>/dev/null
      # 24 Nov 2026: rebase meratakan commit gabung lokal dan bentrok saat memutar ulang commit "gas" yang sudah tergabung,
      # padahal gabung biasa bersih. Coba gabung dulu sebelum menyerah.
      if ! git merge -q --no-edit origin/main; then
        git merge --abort 2>/dev/null
        echo "dorong: gagal menyusul origin/main karena bentrok. Commit lokal utuh, belum ada yang didorong."
        exit 1
      fi
    fi
  fi
  didorong=$(git rev-parse HEAD)
  git push origin main 2>&1 | tee "$catatan"
  git fetch -q origin main
  if git merge-base --is-ancestor "$didorong" origin/main; then
    echo "dorong: masuk origin/main di $(git rev-parse --short "$didorong")."
    # commit sesi lain yang masuk selama push ini berjalan ikut didorong di putaran berikutnya (sesi itu sudah keluar karena kunci)
    if git merge-base --is-ancestor HEAD origin/main; then
      # kunci dilepas dulu, lalu cek sekali lagi: commit yang masuk tepat sebelum kunci lepas (sesinya keluar karena kunci) tidak tertinggal
      bersih; trap - EXIT
      git merge-base --is-ancestor HEAD origin/main || { echo "dorong: ada commit baru tepat saat selesai; mendorong lagi."; exec sh "$0"; }
      exit 0
    fi
    putaran=$((putaran + 1)); [ "$putaran" -gt 10 ] && { echo "dorong: sudah 10 putaran berturut-turut; sisanya didorong push berikutnya."; exit 0; }
    echo "dorong: ada commit baru sejak push ini mulai; mendorong lagi."
    continue
  fi
  grep -Eq 'sudah maju|cannot lock ref|non-fast-forward|fetch first' "$catatan" || { echo "dorong: gagal, bukan karena rebutan posisi."; exit 1; }
  echo "dorong: main bergerak, menyusul dan mengulang (percobaan $percobaan dari 5)."
  percobaan=$((percobaan + 1))
done
echo "dorong: masih kalah rebutan setelah 5 percobaan."
exit 1
