# RISET: bahan yang sudah ada untuk Cek Kabar Luar

Semua angka di bawah diperiksa pada 11 Nov 2026 dari repo dan dari situs produksi centurisk97.id. Praktik lembaga luar (cara GDACS, ReliefWeb, atau OCHA menutup kejadian) **belum diriset**; tidak dikarang di sini.

## 1. Kejadian yang mau dicek

- Sumber: `dalops/<jenis>.json` di R2, dibuat `scripts/data/dalops_banjir.py` dari arsip logbook `data/raw/logbook/arsip/<tahun>/kejadian.jsonl` ditambah rekap WA Koordalops.
- Jenis: banjir, longsor, karhutla, gempa, cuaca, kekeringan, gelombang, permukiman (dua terakhir sejak 11 Nov 2026).
- Tiap baris punya `kab_kode` (daftar kode `"<kode prov>|<nama kab>"`; kejadian tingkat provinsi berakhiran `"|(provinsi)"`), `mulai`, `terakhir` (laporan resmi terakhir), `surut` (selesai menurut jenisnya), `kondisi` (teks terakhir), `riwayat`.
- Aturan "selesai" dari teks sudah ada sebagai regex teruji per jenis: `SUDAH`/`BELUM` (banjir), `LONGSOR_*`, `KARHUTLA_*`, `TANGANI_*`, `KERING_*`, `GELOMBANG_*`, `PERMUKIMAN_*`. Regex yang sama bisa dipakai membaca judul berita (dipakai ulang, bukan disalin).
- Arsip logbook di mesin pemilik terakhir 1 Nov 2026; sesudahnya hanya dari WA.

## 2. Berita

- Mesin: `scripts/umum/berita.py` (Google News RSS, dedup, geocode, topik, sentimen). Leksikon: `scripts/berita/banjir.py`, `karhutla.py`, `pesisir.py`, dan leksikon di modul bencana lain (mis. `scripts/cuaca/berita.py`, `scripts/gempa/berita.py`). Artikel tayang sudah tersaring relevan oleh panennya.
- Keluaran tayang: `/banjir/data/berita.json`, `berita_cuaca.json`, `berita_gempa.json`, `berita_gunungapi.json`, `berita_kekeringan.json`, `berita_udara.json`, `berita_pesisir.json` (rob, gelombang, abrasi; ditulis `lintas.yml`, 10 Nov 2026: 1.500 artikel, 456 ber-`kab`), dan `/data/berita.json` (karhutla). Di produksi bertanggal 10 sampai 11 Nov 2026; di git `main` basi sejak 16 Okt 2026.
- Bentuk artikel: `id, judul, sumber, tgl, ringkas, domain, prov[], kab[], kec[], lat, lon, presisi, topik[], label_situasi, label_respons, url`.
- Contoh `berita.json` banjir 11 Nov 2026: 1.500 artikel (batas), rentang tanggal 4 sampai 10 Nov (sekitar 6 hari walau `jendela_hari` 120), 629 dari 1.500 (42%) punya `kab`. Topik: kejadian 1.500, pencegahan 456, penanganan 324, cuaca 298, infrastruktur 292, korban 218, kebijakan 124. **Tidak ada topik "pulih/selesai".**
- Arsip mentah bergulir ada di `data/raw/berita/<id>/arsip.json` di mesin yang memanen, bukan di mesin pipeline Dalops.

Akibatnya: (a) berkas tayang hanya menjangkau sekitar seminggu, jadi pengecek harus menyimpan arsipnya sendiri; (b) lebih dari separuh artikel tidak bisa dicocokkan ke kab/kota; (c) kata "surut", "padam", "kembali normal" harus dibaca sendiri dari judul.

## 3. Data alam per jenis

| Jenis | Berkas tayang | Isi yang berguna | Catatan |
| --- | --- | --- | --- |
| Banjir, longsor | `/banjir/data/status.json` | per kecamatan `"<prov>|<kab>|<kec>"`: `b` level banjir 4 hari, `l` level longsor, `h3` hujan 3 hari, `a7` | prakiraan model kita, bukan pengamatan genangan |
| Karhutla | `/data/peta_karhutla_kab.json` | per kab `d: [[indeks hari, jumlah titik, ...], ...]` dengan daftar `hari`; tayang 11 Nov 2026 sampai hari 10 Nov | ada sinyal pengamatan harian |
| Kekeringan | `/kekeringan/data/gdo.json` | per kab tiga kelas `kita_spi3, gdo_spi3, gdo_tanah` (SPI-3 ERA5 dan kelembapan tanah GloFAS, Copernicus GDO); tayang bertanggal 7 Nov 2026 | kelas, bukan nilai SPI; bulanan, bukan harian |
| Gelombang pasang | `/pesisir/data/rob_kejadian.json` | rekap rob 2023 sampai 2024 | riwayat, bukan pantauan harian; prakiraan maritim BMKG belum ada di repo. Berita dari `berita_pesisir.json` |
| Cuaca ekstrem | `/banjir/data/cuaca_bmkg_kab10.json` | peringatan BMKG per kab | kejadian cuaca biasanya sehari; yang lama adalah pemulihannya |
| Gempa | `/gempa/data/*` | katalog dan susulan | tidak ada sinyal "selesai" dari alam; pemulihan hanya dari berita |
| Kebakaran permukiman | tidak ada | | hanya berita |

## 4. Yang sudah ada di layar

`public/bnpb/dalops.js` sudah punya bagian "Perlu ditanya" (`H.perluDitanya`) dan tombol WA per kab (`H.pesanWA`). Keduanya bekerja per kelompok kab/kota (`H.kelompok`), bukan per baris, dan "Perlu ditanya" hanya memuat kelompok yang angkanya bolong (`kurang`) atau kabarnya basi. Cek Kabar Luar menambah label dan bukti pada daftar itu, bukan membuat daftar kedua.

Tombol WA tab jenis (`.dl-wa`) belum masuk blok baca-saja di `public/bnpb/menu_pusdalops.css`; hanya `.lm-tagih-aksi` (Laporan Masuk) yang disembunyikan.
