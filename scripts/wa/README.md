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

Python generator (harus 3.12 ke atas + Pillow, seluruh pohon prosesnya; `otomatis.mjs` menaruh `~/.wa-bot/py/bin` paling depan di PATH, ubah lewat `WA_PY_BIN`):

```bash
uv venv --python 3.13 ~/.wa-bot/py && uv pip install --python ~/.wa-bot/py/bin/python pillow
cp "<Laporan Kejadian Bencana Harian 221026.pptx milik pemilik>" data/laporan-bnpb/generator/cache/templat/harian-221026.pptx   # di luar git
```

Prasyarat lain (lihat `data/laporan-bnpb/generator/README.md`): templat di atas (jangan di-commit), `FIRMS_MAP_KEY`, node + playwright, `soffice`.

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

## Google Drive (opsional)

Akun Google pribadi pemilik lewat OAuth; berjalan di proses gateway dan `otomatis.mjs`, tanpa paket tambahan (`drive.cjs`). Tanpa konfigurasi semua alur di bawah mati diam-diam dan bot berjalan seperti biasa.

Pasang sekali:

1. Google Cloud Console: buat proyek, aktifkan **Google Drive API**, layar persetujuan OAuth (tambahkan akun pemilik sebagai pengguna uji), lalu buat **OAuth client ID** bertipe **Desktop app**.
2. Isi `DRIVE_CLIENT_ID` dan `DRIVE_CLIENT_SECRET` di `scripts/wa/.env`.
3. Buat satu folder root di Drive (mis. "Bot Laporan"), salin id-nya dari URL (`.../folders/<id>`) ke `DRIVE_ROOT`.
4. Jalankan `node scripts/wa/drive-masuk.mjs`, buka alamat yang dicetak, setujui. Refresh token tersimpan di `~/.wa-bot/drive.json` (mode 0600) dan tidak pernah dicetak.
5. Restart gateway (`launchctl kickstart -k gui/$(id -u)/id.centurisk97.wa-gateway`).

Empat alur, semuanya di bawah folder root:

- `Bahan WA/YYYY-MM-DD/` (tanggal WIB): tiap pesan dari `WA_IZIN` disalin lewat antrean lokal `~/.wa-bot/drive-antre/` (dicoba ulang tiap 5 menit; ditolak permanen pindah ke `drive-rusak/` dan pemilik dikabari; disapu 14 hari, batas 500 MB). Teks menjadi `HHMM-<nama pengirim>.txt`, lampiran `HHMM-<nama asli>`.
- `Laporan/YYYY-MM-DD/`: PDF dan PPTX hasil generator diunggah, link folder ditambahkan ke caption WA. Drive gagal = laporan WA tetap terkirim tanpa link dan pemilik dikabari. Revisi diunggah sebagai berkas baru berawalan "Revisi ".
- `Masuk/`: berkas yang ditaruh manusia diperiksa tiap 5 menit (Docs menjadi .docx, Sheets .xlsx, Slides .pdf; maks 20 MB, jenis sama dengan WA), dimasukkan ke outbox yang sama dengan pesan WA (dari nomor `PEMILIK`, nama "Google Drive"), lalu dipindah ke `Masuk/Sudah/`. Id Drive yang sudah diproses dicatat di `~/.wa-bot/drive-diproses.json`.
- Perintah WA `cari <kata>` dari `WA_IZIN`: tidak diteruskan sebagai bahan; bot membalas maksimal 5 berkas (nama, tanggal ubah, link) dari pencarian nama dan isi, hanya di dalam pohon folder root.

Log: `~/.wa-bot/log/`. Status kirim: `~/.wa-bot/state.json`. Keluaran: `~/.wa-bot/keluaran/<tanggal>/`.
Ini WhatsApp Web tidak resmi: pakai nomor khusus, nomor bisa diblokir (lihat `pangantara/wa-gateway/ANTI-BAN.md`).

## Banjir

- Laporan Penanganan Banjir, Longsor dan Rob (`penanganan_banjir.py`) berjalan otomatis sesudah 17.00 WIB tanpa bahan WA (angkanya dari situs yang tayang), dikirim PDF + PPTX ke `PENERIMA`. Tidak diunggah ke `/pelaporan` (worker hanya menerima harian dan penanganan). Mati bawaan; hidupkan dengan `LAPORAN_BANJIR=1` setelah contoh deck diperiksa. Halaman banjir di laporan harian sudah otomatis ikut bila `public/banjir/data/wilayah_hari.json` hari itu ada di repo mesin.
- Peringatan dini hujan lebat per kabupaten H+1..H+3 (`peringatan_banjir.mjs`): teks sekali sehari sesudah 07.00 WIB, hanya bila `peluang.json` situs dibuat hari itu. Penerima `PENERIMA_PERINGATAN_BANJIR`, kosong = mati.
