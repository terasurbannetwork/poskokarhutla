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
- Peta bentuk bahannya (kerangka laphar, semua ejaan label, kolom tabel bagian I, bentuk rekap WA):
  **`BAHAN-PUSDALOPS.md`**. Kalau bentuk bahannya berubah, ubah di sana dulu.

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
**Halaman banjir** (slide 4, sebelum penutup; sisipan otomatis bila ada data): status banjir per provinsi, kejadian aktif, titik rob Waspada atau lebih,
hujan 3 hari terbesar, rob 1 sampai 3 hari ke depan. Sumber hanya sistem kita (`public/banjir/data`), dibaca `banjir_data.py`:
`wilayah_hari.json` bila harinya = hari laporan, kalau tidak `status.json` + `rob.json` + `kejadian_aktif_awal.json` + `prakiraan72.json`.
Provinsi berstatus Awas atau Siaga wajib masuk (baris tidak dipotong); hari laporan tidak ada di sumber atau tidak ada satu pun Siaga/Awas,
kejadian aktif, atau rob = halaman tidak dibuat (bukan diisi 0). `terpapar_jiwa` (kolom TERPAPAR) hanya tampil bila sumbernya membawanya. Uji: `python3 banjir_data.py`.

Kawasan tanpa kabupaten (mis. Gunung Arjuno) dipetakan ke kecamatan di `KAWASAN` (harian.py); nama kabupaten WA yang tidak ada di data
website menghentikan generator dengan pesan jelas.

## Penanganan

`Laporan Penanganan Pengendalian Karhutla DDMMYY` (2 slide: peta, tabel). Aturan pemilik 25 Okt 2026: cut-off **17.00 WIB**
hari laporan; kolom D-2, D-1, D dengan D = hari laporan, angka D sementara s.d. 17.00 (catatan kaki "Angka D sementara,
data s.d. 17.00 WIB."); tabel punya **empat** kelompok berbintang FIRESPOT, HOTSPOT, LUAS TERBAKAR, BELUM PADAM, tiga hari
masing-masing; halaman "Operasi Penanganan Karhutla" **dibuang** (sumbernya teks WA satgas, tidak ada untuk hari lampau).

    cd data/laporan-bnpb/generator
    python3 penanganan.py --tanggal 2026-10-25                      # --jam 17:00 bawaan, --out ~/Downloads bawaan
    python3 penanganan.py --tanggal 2026-10-25 --bmkg bmkg.txt      # pil PM2,5 + cuaca dari WA BMKG hari itu

- Angka satelit: `satelit.py` (mesin website, FIRMS ditarik ulang; uji `python3 satelit.py --uji`).
- Firespot per provinsi per hari: `firespot_hari.py` (mesin `scripts/data/harian.py` dengan jam dibekukan; uji
  `python3 firespot_hari.py --uji` membandingkannya dengan arsip `public/data/kluster_hari/` indeks 4, FWI dikunci ke
  fwi.json pipeline supaya yang diuji algoritmanya). Hasil per hari dicache di `cache/firespot-17.00.json`.
  **Satuannya titik, sama dengan hotspot** (keputusan pemilik 25 Okt 2026): lokasi unik ~375 m hari itu yang berada di
  cluster lolos syarat firespot, jadi firespot <= hotspot. Jumlah cluster-nya tidak dipakai di deck ini.
- Cuaca/FWI hari lampau: `cuaca_riwayat.py` (ERA5 300 hari + forecast; uji `python3 cuaca_riwayat.py --uji`).
- Pil PM2,5 + cuaca tanpa `--bmkg`: `pil_sendiri.py` (rata-rata provinsi CAMS + ambang P.14/2020, hujan/angin Open-Meteo
  dengan kelas BMKG; uji `python3 pil_sendiri.py`). Dengan `--bmkg`: `wa_operasi.py` (uji `python3 wa_operasi.py`).
- Skrip deck di `penanganan/`: `kisi.py` (geometri kolom, dipakai bersama), `ganti.py` (tabel, baca param.json),
  `tambah_peta.py`, `peta.mjs`, `bnpb.py` (pil), `sementara.py`, `cek6.py` (gerbang: tiap sel tabel harus cocok angka.json).
- Provinsi 6 teratas tanpa baris di templat (selain 62,16,63,15,61,93,72,64) butuh `penanganan/logo/<kode>.png`; tanpa itu generator berhenti dengan pesan jelas.
