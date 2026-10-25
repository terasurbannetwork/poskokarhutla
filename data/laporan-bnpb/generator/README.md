# Generator laporan BNPB

## Bahan Pusdalops di layar (/laporan-bnpb)

Sejak 25 Okt 2026 bahan harian Dit. Koordalops juga bisa dimasukkan lewat layar, tanpa menjalankan
skrip di sini: panel **Bahan Pusdalops** menerima tempelan rekap WA atau unggahan **laphar PDF**, lalu
mengisi tabel Kejadian menonjol, kartu **Pusdalops: rincian entri laphar** (medan bagian A laphar), dan
tabel **Status darurat daerah** (rekapitulasi SK darurat, bagian I laphar).

- Pengurai: `public/laporan_urai.js` (murni, tanpa jaringan). Pembaca berkas: `public/laporan_impor.js` (pdf.js).
- Tabel bagian I hanya terbaca dari **unggahan PDF**: selnya rata tengah tegak, jadi baris logisnya cuma
  bisa dipisah dari koordinat kata. Teks tempelan biasa tetap mengisi bagian A, dan layar mengatakan
  bagian mana yang tidak ikut terbaca.
- Teks yang bentuknya tidak dikenali bisa dicoba lewat tombol **Urai dengan model** (`POST /api/laporan-bnpb/urai`,
  Workers AI). Tiap nilai yang dikembalikan model wajib benar-benar ada di teks sumber (`periksaSalinan`
  di `src/laporan_bnpb_spek.js`); yang tidak ada dibuang, jadi angka tidak pernah dikarang.
- Uji: `node --test tests/warga/laporan_urai.test.mjs` (bahan asli 24 Okt 2026 di `tests/warga/fixtures/`).

Jalur Python di bawah tetap dipakai untuk membuat decknya.

## Harian

Laporan Kejadian Bencana Harian DDMMYY: 4 slide (sampul, ringkasan + peta, rincian, penutup) dalam format deck pemilik 221026.

Cut-off baku pemilik (24 Okt 2026): **laporan harian bencana jam 12.00 WIB**. Angka karhutla hari laporan dihitung sementara
sampai jam itu (`satelit.hitung`, mesin website). Kejadian lapangan diurai dari teks WA.

```bash
cd data/laporan-bnpb/generator
python3 wa_harian.py                      # uji pengurai WA terhadap isian 24 Okt
python3 harian.py --tanggal 2026-10-25 --koordalops wa_koordalops.txt --bmkg wa_bmkg.txt --out ~/Downloads
```

- `--koordalops`: teks WA Dit. Koordalops laporan pagi (s.d. 07.00) apa adanya. Laporan 19.00 ditolak.
- `--bmkg`: teks WA BMKG (PM2.5 dan potensi cuaca), apa adanya.
- `--jam 12:00` bawaan; `--jam lengkap` = mode lama (hari kemarin penuh langsung dari berkas website), untuk cek.
- Templat: salin `Laporan Kejadian Bencana Harian 221026.pptx` pemilik ke `cache/templat/harian-221026.pptx` (di luar git).
- Butuh `FIRMS_MAP_KEY` (env atau `.env` repo), node + playwright (peta dan ikon), soffice (PDF).
- Keluaran: `<out>/Laporan Kejadian Bencana Harian DDMMYY.pptx` dan `.pdf`; berkas antara di `<out>/kerja-DDMMYY/` (data.json, peta.png).

Aturan pemilik yang dikunci di kode: status karhutla ikut sisa belum padam data kita; provinsi berstatus Prioritas di website wajib masuk;
perlu perhatian semua jenis; luas karhutla hanya angka kita; tiap pil berikon; panel setinggi isinya; tanpa titik tengah dan em dash.
Kawasan tanpa kabupaten (mis. Gunung Arjuno) dipetakan ke kecamatan di `KAWASAN` (harian.py); nama kabupaten WA yang tidak ada di data
website menghentikan generator dengan pesan jelas.

## Penanganan

`Laporan Penanganan Pengendalian Karhutla DDMMYY` (3 slide). Aturan pemilik 24 Okt 2026: cut-off **15.00 WIB** hari laporan; kolom D-2, D-1, D
dengan D = hari laporan, angka D sementara s.d. 15.00 (catatan kaki "Angka D sementara, data s.d. 15.00 WIB.").

    cd data/laporan-bnpb/generator
    python3 penanganan.py --tanggal 2026-10-25 --wa wa_operasi.txt --bmkg bmkg.txt          # --jam 15:00 bawaan, --out ~/Downloads bawaan

- `wa_operasi.txt` = teks WA "LAPORAN UPAYA PEMADAMAN KARHUTLA OLEH SATGAS ..." apa adanya (slide 3, data hari sebelumnya).
- `bmkg.txt` = teks WA "Laporan Meteorologi dan Klimatologi (BMKG)" (PM2.5 tertinggi + potensi cuaca) apa adanya (pil slide 2).
- Angka satelit: `satelit.py` (mesin website, FIRMS ditarik ulang; uji `python3 satelit.py --uji`). Pengurai WA: `wa_operasi.py` (uji `python3 wa_operasi.py`).
- Skrip deck di `penanganan/` (turunan satelit-2026-10-24): `ganti.py` (tabel, baca param.json), `tambah_peta.py`, `peta.mjs`, `bnpb.py` (pil + operasi), `sementara.py`, `cek6.py`.
- Provinsi 6 teratas tanpa baris di templat (selain 62,16,63,15,61,93,72,64) butuh `penanganan/logo/<kode>.png`; tanpa itu generator berhenti dengan pesan jelas.
- Slide 3: OMC selalu 4 baris templat (Kalbar, Kalteng, Sumsel, Kalsel); hujan dihitung hanya bila tanggalnya = hari data. Semai = 2 provinsi berbahan terbanyak.
