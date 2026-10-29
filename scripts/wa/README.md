# Bot WhatsApp laporan harian (Mac mini)

Dua proses, tanpa LLM:

- `gateway/` (Baileys): terima bahan dari nomor di `WA_IZIN`, teruskan ke worker (`POST /api/wa/gateway`, header `x-wa-kunci`), dan
  melayani API lokal `127.0.0.1:PORT` (`/send`, `/send-file`) lewat limiter anti-blokir (`gateway/limiter.js`).
  Bahan yang belum tersimpan menunggu di `~/.wa-bot/outbox/` (dicoba ulang tiap 5 menit).
- `otomatis.mjs`: baca bahan hari ini dari worker (`/api/wa/masuk`, token `WA_MESIN`), jalankan
  `data/laporan-bnpb/generator/harian.py` dan `penanganan.py`, kirim PDF + PPTX ke `PENERIMA`.
  Dipicu gateway 2 menit sesudah bahan terakhir tersimpan, dan launchd tiap 10 menit sebagai cadangan (06.00 sampai 23.00 WIB).

Aturan jam (README generator): Harian = rekap Koordalops 24 jam + BMKG pagi, sesudah 12.00 WIB. Penanganan = BMKG pagi + teks Satgas,
sesudah 17.00 WIB. Bahan berubah sesudah terkirim = dibangun ulang dan dikirim lagi dengan awalan "Revisi: ". Galat hanya ke `PEMILIK`.

## Pasang

```bash
cd scripts/wa/gateway && npm ci          # atau npm install saat pertama kali (belum ada package-lock)
cd .. && cp .env.contoh .env && chmod 600 .env   # isi semua nilai
node otomatis.mjs --kering               # uji tanpa kirim apa pun (butuh worker + WA_MESIN)
```

Prasyarat generator (lihat `data/laporan-bnpb/generator/README.md`): python 3.12 ke atas (set `WA_PYTHON` bila `python3` bukan itu),
templat `cache/templat/harian-221026.pptx`, `FIRMS_MAP_KEY`, node + playwright, `soffice`.

1. Jalankan pertama kali di terminal: `node gateway/index.js`. Scan QR dari HP bot (WhatsApp > Perangkat Tertaut). Sesi tersimpan di `~/.wa-bot/auth`. Ctrl+C.
2. Pasang layanan (ganti `__REPO__`, `__NODE__`, `__HOME__` di salinan plist):

```bash
mkdir -p ~/.wa-bot/log
for n in gateway otomatis; do
  sed -e "s#__REPO__#$PWD/../..#" -e "s#__NODE__#$(which node)#" -e "s#__HOME__#$HOME#" \
    launchd/id.centurisk97.wa-$n.plist > ~/Library/LaunchAgents/id.centurisk97.wa-$n.plist
  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/id.centurisk97.wa-$n.plist
done
launchctl print gui/$(id -u)/id.centurisk97.wa-gateway | head      # periksa
launchctl bootout gui/$(id -u)/id.centurisk97.wa-gateway           # berhenti
```

3. Setelah gateway ini hidup, **putuskan perangkat Fonnte** supaya pesan tidak tersimpan dua kali.

Log: `~/.wa-bot/log/`. Status kirim: `~/.wa-bot/state.json`. Keluaran: `~/.wa-bot/keluaran/<tanggal>/`.
Ini WhatsApp Web tidak resmi: pakai nomor khusus, nomor bisa diblokir (lihat `pangantara/wa-gateway/ANTI-BAN.md`).
