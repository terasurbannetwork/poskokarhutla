# Generator laporan BNPB

## Semua PPT lewat deck.py (pemilik 31 Okt 2026)

"Kalo bentuknya dalam ppt semuanya harus pasti ke deck.py." Generator tetap menghitung data dan menggambar slide isi;
`lewat_deck.py` lalu membingkai ulang berkasnya dengan mesin deck BNPB (`~/.claude/skills/ppt-konsultan/bnpb/scripts/deck.py`,
atau setel `DECK_BNPB`): sampul dan penutup templat terbaru, pita kaki navy, warna dipaskan ke palet, penanda bagian, dan
gerbang QA deck.py. Format di `deck.py` (`FORMAT`): `harian`, `penanganan`, `daerah`, `kajian`.

- `harian.py` sudah lewat deck.py (slide 1 jadi sampul, "Terima kasih" jadi penutup, sisanya slide `impor`).
- `penanganan.py` BELUM: templatnya memakai huruf 4,5 pt (batas deck.py 6 pt), perlu ditata ulang dulu.
- Mesin tanpa skill (Windows) berhenti dengan pesan jelas; jalankan langkah akhir di Mac yang punya skill.
- Gerbang QA deck.py GAGAL = berkas tetap dibuat, proses berhenti; baca `qa/` sebelum menyerahkan.

## Keluaran per folder revisi (pemilik 9 Nov 2026)

Berlaku untuk Laporan Kejadian Bencana Harian dan Laporan Penanganan Pengendalian Karhutla. Tiap keluaran masuk foldernya sendiri:
`Revisi 3/<nama deck>.pptx` dan `.pdf`, nama berkas tanpa `(rev3)`. Panggil `lewat_deck.serah_revisi(pptx, pdf)` di akhir skrip
harian (`jalan_rev4.py`, `bingkai.py`); berkas kerja (isi, spek, manifest) tetap di folder hari. Nama tanpa `(revN)` otomatis masuk folder
bernomor berikutnya, jadi saat menyalin skrip ke hari baru, buang `(revN)` dari namanya. Gerbang: `tests/agen/gerbang-folder-revisi.test.mjs`,
memeriksa folder hari sejak 10 Nov 2026. Bot WA di Mac mini (`scripts/wa/otomatis.mjs`) memakai folder keluarannya sendiri dan tidak diubah.

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

**Menjalankan di Windows** (disiapkan 30 Okt 2026):

- Python 3.12 ke atas (`C:\Python314\python`); f-string di `harian.py` tidak terbaca Python 3.11. Jalankan dengan `PYTHONUTF8=1`,
  karena teks WA berisi karakter Unicode dan `open()` di Windows bawaannya cp1252.
- Playwright: `pw.mjs` mencari modul di `PLAYWRIGHT_MJS`, path Mac lama, lalu `cache/node/node_modules/playwright-core`
  (pasang sekali: `npm i --prefix cache/node playwright-core@1.52.0`), dan browser di `CHROMIUM_SHELL`, headless shell
  ms-playwright, atau Chrome/Edge terpasang.
- PDF: `pdf.py` memakai soffice bila ada, kalau tidak PowerPoint lewat COM (`python pdf.py <berkas.pptx>`).
- **Pantau Banjir ikut diperbarui** (pemilik 5 Nov 2026): sesudah `data.json` ditulis, `jalan.py` memanggil
  `scripts/data/dalops_banjir.py --unggah`. Kejadian banjir WA Koordalops (tanggal laphar = H-1) menimpa kondisi, angka terdampak,
  pengungsi, dan status surut kab yang sama di `/bnpb/dalops`; kejadian baru jadi baris baru. Mesin tanpa arsip logbook menempel ke
  berkas R2 yang tayang. Butuh `wrangler login`; gagal unggah tidak menghentikan laporan. Baris ini ikut tiap salinan `jalan.py`
  (gerbang `tests/bnpb/dalops.test.mjs`).
- `jalan.py` harian memanggil FIRMS dengan kunci `'publik'` (cache/raw diisi manual di Mac); tanpa cache itu `satelit.py` menarik
  dengan `FIRMS_MAP_KEY` dari `.env`.

```powershell
$env:PYTHONUTF8=1; C:\Python314\python data\laporan-bnpb\harian-2026-10-29\jalan.py
C:\Python314\python data\laporan-bnpb\generator\pdf.py "data\laporan-bnpb\harian-2026-10-29\Laporan Kejadian Bencana Harian 291026.pptx"
```

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
hari laporan; kolom D-2, D-1, D dengan D = hari laporan, angka D sementara s.d. 17.00 (catatan kaki cukup teks baku sumber data;
kalimat Firespot dan "Angka D sementara" dibuang pemilik 27 Okt 2026); tabel punya **empat** kelompok berbintang, tiga hari
masing-masing (urutan HOTSPOT, FIRESPOT, LUAS TERBAKAR, BELUM PADAM, sama dengan slide peta); halaman "Operasi Penanganan Karhutla"
**dibuang** (sumbernya teks WA satgas, tidak ada untuk hari lampau), kecuali teks WA satgas hari itu diberikan lewat `--operasi wa.txt`
(27 Okt 2026; contoh `../satelit-2026-10-27/wa-satgas.txt`).

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
  `tambah_peta.py`, `peta.mjs`, `bnpb.py` (pil, slide operasi), `ikon.mjs` (ikon Pemda; ikon FIRESPOT disalin dari deck 25 Okt), `cek6.py` (gerbang: tiap sel tabel harus cocok angka.json).
- Provinsi 6 teratas tanpa baris di templat (selain 62,16,63,15,61,93,72,64) memakai `penanganan/logo/<kode>.png` bila ada, kalau tidak lambang layar `public/lambang/provinsi/<kode>.png` (semua 38 provinsi tersedia); baris disalin dari baris Kaltim.

### Halaman perusahaan dan konsesi (hanya deck 081126)

Halaman top 10 perusahaan, pemegang saham asing, dan lampiran 99 perusahaan dibuat khusus untuk deck 8 Nov 2026 (`../satelit-2026-11-08/perusahaan.py`). Pemilik 9 Nov: untuk
tanggal lain seperti biasa. Saat menyalin `bingkai.py` 8 Nov ke hari baru, buang `import perusahaan`, bagian Perusahaan, dan halaman 4 ke atas di `susun`. Gerbang:
`tests/agen/gerbang-perusahaan-sekali.test.mjs`.

### Lampiran kab/kota (opsional, tidak dipasang bawaan)

Lampiran "Rincian Kabupaten/Kota Enam Provinsi" dibuat 5 Nov 2026 atas permintaan pemilik dan Bang Ghozi, karena angka per provinsi
bisa menyesatkan. Pada 6 Nov pemilik minta lampiran itu dihapus dari deck ("lampirannya hapus aja"), jadi lampiran hanya dipasang bila
diminta lagi. Skrip terakhirnya ada di `../satelit-2026-11-06/` (`lampiran_hitung.py`, `lampiran_slide.py`, `ikon-kepala/`). Untuk
memakainya lagi, salin ketiganya ke folder hari laporan, ganti tanggal dan jam cut-off di kedua skrip, lalu jalankan berurutan:

1. `jalan.py` hari itu. Skrip ini menyiapkan salinan `web/` dan deck generator.
2. `PYTHONUTF8=1 DECK_BNPB=<skill>/bnpb C:/Python314/python lampiran_hitung.py` menulis `lampiran-kab.json` dan
   `<skill>/bnpb/assets/proyek-bnpb/data/lap/penanganan-DDMMYY-kab.csv`. Isinya per kab/kota untuk enam provinsi tabel:
   - hotspot dari `satelit.hitung` tingkat kab atas hotspot.json web;
   - firespot dari `fs_ini` di kluster.json, dengan kunci `prov|kab|kec`;
   - luas dan belum padam:
     - versi "per sekarang" (`belum_kini` hari laporan sudah terbit): luas dari rumus `luas_sendiri` jalan.py dan belum padam dari
       `satelit.hitung` tingkat kab;
     - versi "hari utuh" (`belum_kini` belum terbit): sebaran dari `peta_karhutla_kab.json` hari D-1. Tiap baris `d` berbentuk
       `[indeks hari, luas, belum]`.

     Pada kedua versi, total provinsi di slide 2 dibagi ke kab/kota sesuai porsi itu, dengan pembulatan sisa terbesar. Assert
     memastikan jumlah per provinsi sama persis dengan slide 2.
3. `lampiran_slide.py` menggambar lampiran dengan mesin `harian.Deck`, memakai templat dan ikon dari folder kerja deck harian hari yang
   sama (`../harian-YYYY-MM-DD/kerja-DDMMYY`; deck harian hari itu harus sudah dibangun). Hasilnya `lampiran-kab.pptx` dan
   `lampiran-kab-halaman.json`. Gayanya: dua kolom per halaman, kepala kolom berupa kotak berwarna seperti slide 2 (hotspot navy,
   firespot merah, luas abu-biru, belum padam oranye, masing-masing berikon), angka polos rata tengah, nilai 0 abu, baris induk provinsi
   lalu anak kab/kota, dan kotak KETERANGAN di bawah.
4. Di `bingkai.py`, tambahkan halaman impor ke `susun`:
   `[{'jenis': 'impor', 'pptx': 'lampiran-kab.pptx', 'halaman': n, 'sumber': SG + '; luas dan belum padam per kab/kota dibagi dari
   angka provinsi slide 2 sesuai sebaran titik'} for n in json.load(open('lampiran-kab-halaman.json'))]`.
   Contohnya ada di `../satelit-2026-11-05/bingkai.py`.

## Penanganan banjir, longsor dan rob

`penanganan_banjir.py` membuat kembaran deck Penanganan untuk banjir. Hasilnya 2 slide: peta status dan tabel 6 provinsi, dengan
kolom D-2, D-1, dan D. Mesin dan templatnya sama dengan deck karhutla (`penanganan/*`), dipilih lewat env `BENCANA=banjir` yang
dipasang skrip ini sendiri. Tanpa env itu, deck karhutla keluar sama persis byte demi byte.

```bash
cd data/laporan-bnpb/generator
~/.claude/skills/ppt-konsultan/bnpb/.venv/bin/python penanganan_banjir.py --tanggal 2026-10-27 --out ~/Downloads
```

- Angkanya diambil dari situs yang tayang (`https://centurisk97.id/banjir/data/laporan.json` dan `hari/<tanggal>.json`), karena
  data banjir harian tidak di-commit ke git. `public/banjir/data/laporan.json` di repo memang tertinggal.
- Isi kolom:
  - BANJIR: kecamatan Siaga atau Awas banjir.
  - LONGSOR: kecamatan Siaga atau Awas longsor.
  - ROB SIAGA: titik pantau rob BMKG berstatus Siaga. Provinsi tanpa titik pantau ditulis "–".
  - TERPAPAR: penduduk kecamatan Siaga atau Awas banjir, dalam ribu jiwa.
- Pil di tiap baris tabel: status banjir provinsi hari D, dan hujan 3 hari tertinggi kecamatan.
- Angka ini status prakiraan, bukan kejadian lapangan. Rumah terendam dan pengungsi tidak ada di sistem kita.
- Arsip `hari/` baru mulai 27 Okt 2026, jadi hari sebelum itu tidak bisa dibuat.
- Python yang dipakai harus versi 3.12 ke atas dan punya Pillow; subprosesnya ikut memakai python yang sama.
- Peta digambar lewat playwright. Kalau browser bawaan playwright tidak ada, yang dipakai Google Chrome yang terpasang.
