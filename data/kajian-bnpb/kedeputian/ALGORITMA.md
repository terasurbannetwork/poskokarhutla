# ALGORITMA Ruang Unit BNPB

Versi 1, 5 November 2026. Satu tempat untuk semua rumus, aturan tenggat, pola pengurai, ambang, dan uji balik Ruang Unit. Pola dokumen meniru `data/kajian-bnpb/kampus/ALGORITMA.md` dan `data/kajian-bnpb/lapangan/ALGORITMA.md`.

Kedudukan: di bawah `KEPUTUSAN-AWAL.md` (KA), `PRD.md`, `DESIGN-SYSTEM.md` (DS), `DESAIN-TEKNIS.md` (DT), `RENCANA-UJI.md` (RU). Dokumen ini tidak menambah sistem dan tidak mengubah ID atau fase (KA §5). Ia merinci rumus yang di dokumen atas hanya disebut, dan menetapkan satu rumus MB-4. Sesi induk sudah memutus (KA §8) bahwa isi rumus, nama kunci Jam Aturan, dan kasus acuan di dokumen ini menang atas PRD, DT, dan RU; hal yang masih terbuka ada di §14.

Singkatan rujukan: KA §n, PRD §n, DS §n, DT §n, RU §n; `riset/N` = `data/kajian-bnpb/kedeputian/riset/N-*.md`. Kasus acuan RU disebut dengan kodenya (S1, K4, X5, J2, E1, dan seterusnya). Hari acuan semua contoh: 5 November 2026 WIB.

---

## 0. Konvensi yang berlaku untuk semua rumus

### 0.1 Fungsi murni, satu sumber angka

1. Tiap rumus ditulis sebagai fungsi murni: Python di `scripts/bnpb/unit/*.py` (self-check `--cek`, DT §9.5) dan, bila juga dipakai layar, JS di `public/inti/jam_aturan.js` atau `public/bnpb/unit/*.js`. Kasus acuan disimpan sekali di `tests/bnpb/fixtures/unit/acuan.json` (RU §2) dan dibaca kedua bahasa. Selisih JS dan Python pada kasus acuan paling besar 1e-9.
2. Semua tenggat, standar kebutuhan, dan ambang bernama tinggal di Jam Aturan (MB-2, §3). Skrip dan layar membaca nilainya lewat kunci, tidak pernah menulis angkanya sendiri (gerbang G-1, RU §6.1).
3. Bobot dan ambang tanpa pasal ditulis sebagai entri Jam Aturan `asumsi: true` dengan `catatan`, atau sebagai konstanta bernama di kepala skrip pemakainya bila hanya dipakai satu sistem. Keduanya tampil berpil "Asumsi" (DS §5.2.1).

### 0.2 Kosong bukan nol

Nilai yang tidak ada disimpan `null` dan tampil "belum ada data" atau kalimat yang lebih khusus ("stok belum dilaporkan", "kapasitas belum ada"). `null` tidak pernah ikut dijumlah, dirata-rata, atau diurutkan sebagai 0. Angka 0 hanya bila sumbernya menyatakan 0 (contoh PUS-1: organisasi CKAN dengan 0 dataset adalah data, RU §5.1).

### 0.3 Label angka

Tiap angka yang tampil membawa satu label (KA §3 butir 3, DS §5.2.1). Kolom "Label" di dokumen ini memakai lima kata DS:

| Label | Arti | Nilai `label` di JSON (DT §4.6) |
| --- | --- | --- |
| resmi | angka dari dokumen atau API resmi BNPB, K/L, BPS (LAKIP, CKAN, INALOGPAL, SIRUP, SK status, Laphar) | `resmi` |
| sekunder | angka berita atau rilis yang diurai MB-7 sebelum dikonfirmasi | `sekunder` |
| hitungan | rumus kita atas data resmi | `hitungan_kita` |
| proksi | pengganti data yang tidak tersedia (raster InaRISK untuk IKD, OSM untuk sirine dan evakuasi) | `proksi` |
| asumsi | ambang atau bobot tanpa pasal | entri Jam Aturan `asumsi: true` atau konstanta skrip berlabel |

Satu kartu boleh membawa lebih dari satu label (DS §5.2.1).

### 0.4 Kunci wilayah

1. Kunci kab/kota = kode 4 digit Kemendagri tanpa titik. `terpapar.json`, `ikd.json`, `risiko_hvc.json`, `dibi_kab_tahun.json` sudah memakai bentuk ini (diperiksa: `3171` = Kota Administrasi Jakarta Pusat di `risiko_hvc.json`, sama dengan `kemendagri: "31.71"` di `public/data/kemitraan/kode.json`). `status_darurat.json` dan `dibi_kejadian.json` memakai bentuk bertitik (`"61.02"`, `"73.17"`): titiknya dihapus sebelum digabung.
2. Kunci provinsi = 2 digit. Penyebut nasional kab/kota = 514 (jumlah baris `terpapar.json`, `ikd.json`, `risiko_hvc.json`); `public/data/bnpb/wilayah.json` memuat 513 (DT §10 butir 10), jadi tidak dipakai sebagai daftar penyebut.
3. Nama ke kode memakai `norm()` dan alias yang sudah ada (`scripts/bnpb/wilayah_kab.py`, `public/laporan_urai.js` `kodeProv`). Nama yang tidak cocok pasti menjadi `null` dan dicatat, tidak ditebak (pola `data/kajian-bnpb/kampus/ALGORITMA.md` §1).

### 0.5 Waktu dan kalender

1. Cap waktu disimpan UTC; tanggal diturunkan di WIB (UTC+7, tanpa musim panas). `2026-11-05T17:30:00Z` adalah 6 November 2026 WIB (RU §2.1).
2. "Hari ini" adalah tanggal WIB saat skrip jalan; skrip menerima `--hari YYYY-MM-DD` untuk uji.
3. Selisih hari = selisih tanggal kalender WIB, bukan jam dibagi 24 (contoh X1: 1 Agustus ke 5 November 2026 = 96 hari).
4. Aturan tambah kalender ada di §3.2.

### 0.6 Persentil

Dipakai MB-4 dan beberapa sistem lain. Untuk himpunan kab yang punya nilai x (n kab, n ≥ 2):

`p(x_k) = r_k / (n - 1)`, r_k = peringkat 0-based menaik; nilai yang sama mendapat rata-rata peringkatnya.

Contoh: nilai [10, 20, 20, 40] memberi p = [0; 0,5; 0,5; 1]. Arah: `arah = +1` bila makin besar makin diprioritaskan; `arah = -1` memakai `1 - p`. Penyebut n adalah jumlah kab yang punya nilai untuk komponen itu, bukan selalu 514. Bila n < 2, komponen dianggap tidak ada untuk semua kab.

### 0.7 Pembulatan

Hitungan memakai presisi penuh; pembulatan hanya di tampilan (`public/inti/format.js`: ribuan titik, desimal koma). Jumlah barang dan orang tampil bulat (pembulatan terdekat, setengah ke atas), kecuali yang memang pembagian dengan langit-langit (jamban, kantong sampah: `ceil`). Persen tampil satu desimal; rasio dan skor dua sampai empat desimal sesuai kartunya. Pembanding toleransi (KEU-1 0,01 poin; kembar 1e-9) dihitung sebelum pembulatan.

### 0.8 Basi

Umur berkas = hari ini - `dibuat`. Basi bila umur lebih dari `basi_jam` (DT §9.4: harian 48, mingguan 240, bulanan 1.080). Angka basi tetap tampil dengan pil "basi sejak ..." (DS §5.2.2). Aturan basi per dataset sumber (PUS-1, PD-4) ada di sistemnya.

### 0.9 Kerangka uji balik

Rumus yang membuat klaim prediksi atau prioritas wajib lulus uji balik sebelum kartunya memakai kata "prioritas", "perkiraan", atau angka rupiah. Polanya mengikuti `scripts/data/lab_kriteria/` (`lab_padam.json` dan sejenisnya):

1. Kriteria, pembagian waktu, metrik, pembanding, dan syarat lulus ditulis ke `scripts/bnpb/unit/lab_kriteria/<sistem>.json` SEBELUM hasil dilihat. Sha256 berkas itu dicatat di keluaran.
2. Pembanding naif wajib ada (contoh: penduduk saja, kejadian masa lalu saja, rata-rata kab).
3. Masukan beku (sha256 dicatat). Bila masukan berubah, uji berkata "masukan berubah", tidak merah diam-diam (RU §2.3).
4. Hasil, lulus atau gagal, ditulis di keluaran sistem kunci `uji_balik: {kriteria_sha, metrik, pembanding, lulus}` dan tampil di `title` kartu.
5. Bila gagal: kartu tetap boleh tampil sebagai daftar atau angka hitungan, tetapi dengan judul netral ("urutan skor", "luas tergenang") dan pil "Asumsi: belum lulus uji balik". Pengulas: `validasi-model`.

Daftar sistem yang wajib uji balik dan syaratnya ada di §12.

---

## 1. Peta rumus ke sistem

| Bagian | Rumus | Dipakai oleh |
| --- | --- | --- |
| §2 | MB-1 deteksi pencabutan dan konflik status | F0-1, HUK-1, HUK-2, SPB-1, G-1 |
| §3 | MB-2 tenggat dan standar (tiap kunci) | F0-2, KPOD-2, REN-3, KS-1, KS-4, RRX-1, PLP-1, PLP-3, PD-1, WIL-1, WIL-2, WIL-3, OJL-3, IRT-1, JF-1, MB-5 |
| §4 | MB-3 pengenalan dokumen daerah, periode, status | PSPB-1, KS-1, PSPB-3 (E-1) |
| §5 | MB-4 skor prioritas (rumus final) | MT-2, DIK-1, PLP-2, PD-2, OJL-2; PERB-1 hanya urutan |
| §6 | MB-5 neraca kebutuhan | PLP-1, WIL-2, RRP-1, RRP-3, OJL-2 |
| §7 | MB-6 indikator rapor | PUS-1, PD-1, KPOD-1, REN-1, KEU-1, SDU-1, IRT-1, OJL-3, PSPB-3 |
| §8 | MB-7 pengurai dokumen dan ambang yakin | KPOD-3, RRP-2, WIL-2, RRI-1, PSPB-1/KS-1 (koreksi) |
| §9 | MB-8 aturan panen (tanpa rumus angka) | PUS-1, RRP-1, RRI-1, OJL-3, SDU-1, REN-2 |
| §10 | Sistem F1 dan F2 per unit | semua yang tidak tuntas di §2-§9 |
| §11 | F3 dan T | ringkas |
| §12 | Uji balik per sistem | sistem berklaim prediksi atau prioritas |

---

## 2. MB-1 Status peraturan

Kode: `scripts/bnpb/hukum.py` (perluasan F0-1, DT §3.1 dan §4.1). Masukan: segmen dokumen (`data/raw/hukum/teks/*.json` di mesin pemilik; `data/hukum/seed.sql` di git), metadata katalog `public/data/bnpb/hukum/katalog.json`.

### 2.1 Relasi per sitasi (aturan yang sudah ada, dibakukan)

Untuk tiap sitasi m di segmen s berjenis `sj` (sitasi = `RX_SITASI`, `hukum.py:479`), dengan jendela `sebelum` dan `sesudah` dari `_konteks()` (`hukum.py:771`: paling jauh 160 huruf ke belakang dan 400 huruf ke depan, dipotong di `;`, `. ` dan sitasi tetangga):

| Urutan | Syarat | Relasi |
| --- | --- | --- |
| 1 | `sj = mengingat` | `mengingat` |
| 2 | `sj` bukan `menimbang`, `menetapkan`, `pasal`, `judul`, atau sasaran tidak sederajat (awalan id sasaran tidak di `SETARA` = perban, perka, kepka, se, juklak, juknis, pedoman, dan tidak sama jenis dengan dokumen pembaca) | `merujuk` |
| 3 | `sebelum` memuat `mengganti|menggantikan` atau `sesudah` memuat `diganti|digantikan` | `mengganti` |
| 4 | `sebelum` memuat `mencabut|dicabut|tidak berlaku` atau `sesudah` memuat `dicabut|dinyatakan tidak berlaku` | `mencabut` |
| 5 | `sebelum` memuat `mengubah`, atau "perubahan atas" menyusul `menetapkan`/`perlu` | `mengubah` |
| 6 | selain itu | `merujuk` |

Pasangan (dari, ke) yang punya relasi selain `merujuk` membuang `merujuk`-nya (`relasi_dari()`, `hukum.py:804`).

### 2.2 Daftar pencabutan berbutir (baru, F0-1)

Penyebab 13 dokumen salah status: butir daftar tidak pernah melihat kata penutupnya (DT §3.1). Aturan tambahan, hanya di segmen `pasal`:

1. Buka daftar: `RX_CABUT_BUKA = pada saat\b[^:]{0,160}?\bmulai berlaku\s*:` (tidak peka huruf).
2. Tutup daftar: kemunculan pertama `\bdicabut\b|\bdinyatakan tidak berlaku\b` sesudah pembuka.
3. Butir = teks dari akhir sitasi sampai `;` berikutnya atau sampai penutup.
4. Sitasi di antara pembuka dan penutup diberi relasi `mencabut` bila (a) sasarannya sederajat, (b) relasi §2.1 untuknya `merujuk`, dan (c) butirnya tidak memuat `tetap berlaku` atau `\bdiubah\b`.

Kasus tepi wajib (RU §3.1 butir 1-4): empat sitasi dengan penutup lebih dari 400 huruf dari butir pertama tetap memberi empat `mencabut`; "Pasal 5 Peraturan X dicabut" tidak mengubah status dokumen X (pencabutan pasal, bukan dokumen; dikenali bila kata `Pasal \d+` mendahului sitasi dalam jendela yang sama); judul kutipan di Mengingat tetap `mengingat`; "telah dicabut" di Menimbang untuk dokumen ketiga tidak berpindah ke dokumen pembaca. Kasus yang belum diperiksa (DT §10 butir 13): frasa "Berita Negara Republik Indonesia Tahun 2021 Nomor 1420" tidak boleh dibaca sebagai sitasi peraturan.

### 2.3 Status efektif dan konflik

Simbol: `status_jdih(d)` = status di JDIH (tidak pernah ditimpa); `B` = himpunan dokumen dengan `status_jdih = BERLAKU`.

- `dicabut_oleh(d) = {a ∈ B : relasi (a, d) ∈ {mencabut, mengganti}}`.
- `status_teks(d) = DICABUT` bila `dicabut_oleh(d)` tidak kosong; `tidak_bisa_dicek` bila dokumen tanpa teks (halaman 0, contoh `juklak-4-2024`, `juklak-6-2024`, `juklak-7-2024`, RU §4); selain itu sama dengan `status_jdih`.
- `konflik` = daftar d dengan `status_jdih = BERLAKU` dan `status_teks = DICABUT`.
- `status_efektif(d)` = `TIDAK BERLAKU` bila d di `konflik` atau `status_jdih` bukan BERLAKU; selain itu `BERLAKU`. Status efektif inilah yang dipakai G-1 (acuan Jam Aturan), SPB-1, dan HUK-2.
- Relasi `mengubah` tidak mengubah status: dokumen yang diubah tetap berlaku dan ditautkan ke pengubahnya (riset/6 H1 aturan c; kontrol `perban-6-2025` diubah `perban-11-2025`).

Invarian (G-2, RU §3.1): jumlah relasi `mencabut`/`mengganti` dari dokumen berstatus efektif BERLAKU ke dokumen berstatus efektif BERLAKU = 0; tiap d dengan `status_teks ≠ status_jdih` ada di `konflik`; `perban-6-2021` tercatat dicabut `perban-4-2025`.

Label kartu HUK-1: "menurut teks" (hitungan) di samping status JDIH (resmi). Jumlah konflik yang terbukti 5 November 2026: 13 (KA §5.0 F0-1), tetapi uji memakai invarian, bukan angka itu.

### 2.4 Amanat pengaturan turunan (dipakai HUK-2)

Per segmen `pasal` dokumen berstatus efektif BERLAKU, kalimat delegasi dikenali bila memuat salah satu pola (riset/6 H2):

`ditetapkan oleh Kepala`, `diatur dengan Peraturan Badan`, `diatur lebih lanjut`, `tercantum dalam .{0,80}Keputusan`.

Topik amanat = frasa benda di kalimat itu sebelum kata kerja delegasi, dipangkas ke 12 kata. Amanat `terpenuhi` bila (a) ada dokumen lebih baru (tgl_tetap > tgl_tetap induk) dengan relasi `merujuk` ke pasal itu, atau (b) skor BM25 judul dokumen lebih baru terhadap topik ≥ ambang `amanat_bm25_min` (asumsi, ditetapkan saat `--cek` pada contoh wajib), atau (c) staf menandai lewat `unit_ketuk` berkas `usulan_amanat`. Usia amanat = hari ini - tgl_tetap induk. Contoh yang wajib terdeteksi sebagai amanat: Perban 4/2025 Pasal 38, 41 ayat (2), 52 ayat (2), 53 ayat (3) (RU §5.2). Amanat dari dokumen berstatus efektif TIDAK BERLAKU ditolak. Label: hitungan; tanda "terpenuhi" otomatis berlabel "dugaan mesin" sampai ditandai staf.

---

## 3. MB-2 Jam Aturan

Berkas: `public/inti/jam_aturan.json` (data, dibaca Python dengan `json.load`) dan `public/inti/jam_aturan.js` (ES module, fungsi) (KA §8, PRD BT-4, DT §4.2). Bentuk entri: `{kunci, jenis, nilai, satuan, sejak, acuan, letak, kutipan, asumsi, catatan}`. Satuan yang sah: `jam`, `hari`, `hari_kerja`, `hari_kalender`, `bulan`, `tahun`, `tanggal_bulan_berikut`, ditambah satuan standar `kg_orang_hari`, `l_orang_hari`, `m2_orang`, `orang_per_unit`, `kk_per_unit_per_3hari`, `kg_orang_bulan`, `persen`, `jiwa_per_paket`, `jp_per_tahun`. Satuan lain ditolak saat berkas dimuat (RU §2.1).

### 3.1 Daftar kunci

Kolom "Dicek" = kutipan sudah ditemukan di `data/hukum/seed.sql` saat dokumen ini ditulis (5 Nov 2026); "G-1" = belum dicek sendiri dan akan dipastikan gerbang. Nama kunci ini baku untuk DT dan RU (KA §8).

| Kunci | Nilai | Sejak | Acuan dan letak | Kutipan pendek (persis) | Dicek | Dipakai |
| --- | --- | --- | --- | --- | --- | --- |
| `kaji_mulai` | 24 jam | informasi diterima | `juklak-3-2022` BAB II huruf C angka 1 (hal. 7) | "Kaji cepat dilakukan paling lambat 1 x 24 jam setelah informasi" | ya | WIL-3 |
| `trc_bergerak` | 24 jam | perintah penugasan diterima | `juklak-3-2022` hal. 8 | "Paling lambat 1 x 24 jam setelah perintah penugasan diterima" | ya | WIL-3 |
| `kaji_awal` | 24 jam | tiba di lokasi | `juklak-3-2022` hal. 16 | "paling lambat 1 x 24 jam setelah tiba di lokasi kejadian" | ya | F0-2, WIL-3 |
| `kaji_lanjutan` | 72 jam | tiba di lokasi | `juklak-3-2022` hal. 16 | "paling lambat 3 x 24 jam setelah tiba di lokasi kejadian" | ya | F0-2, WIL-3 |
| `dsp_laporan_kejadian` | 3 hari | kejadian | `perban-4-2020` Pasal 4 | "paling lambat 3 (tiga) hari sejak terjadinya ancaman atau kejadian Bencana" | RU | KPOD-1, WIL-1 |
| `dsp_laporan_perkembangan` | tanggal 5 | tiap bulan sesudah cair | `perban-4-2020` Pasal 21 ayat (1) | "paling lambat setiap tanggal 5 (lima) bulan berikutnya" | RU | F0-2 |
| `dsp_spj` | 3 bulan | status berakhir | `perban-4-2020` Pasal 21 ayat (2) | "paling lambat 3 (tiga) bulan setelah masa status keadaan darurat bencana berakhir" | RU | F0-2, WIL-1 |
| `r3p` | 90 hari | mulai tanggap darurat | `perban-5-2017` Pasal 2 ayat (2) dan (3) | "paling lama 90 (sembilan puluh) hari" | ya | RRX-1 |
| `renkon_berlaku` | 3 tahun | penetapan | `perban-2-2023` Pasal 21 ayat (1) | "berlaku untuk jangka waktu 3 (tiga) tahun" | RU | F0-2, KS-1 |
| `renkon_reviu` | 6 bulan | penetapan atau reviu terakhir | `perban-2-2023` Pasal 21 ayat (2) | "paling sedikit 6 (enam) bulan sekali" | RU | F0-2, KS-1 |
| `destana_penilaian` | 3 tahun | penilaian terakhir | `perban-7-2025` Pasal 14 ayat (5) | "paling sedikit setiap 3 (tiga) tahun" | RU | F0-2 |
| `destana_evaluasi` | 1 tahun | berulang | `perban-7-2025` Pasal 19 ayat (2) | "minimal 1 (satu) kali dalam kurun waktu 1 (satu) tahun" | ya | REN-3 |
| `ews_evaluasi` | 4 bulan | berulang | `perban-2-2024` Pasal 29 ayat (1) | "minimal 1 (satu) kali dalam kurun waktu 4 (empat) bulan" | ya | PD-1, REN-3 |
| `ews_rapat_platform` | 1 tahun | berulang | `perban-2-2024` Pasal 9 ayat (4) | "paling sedikit 1 (satu) kali dalam 1 (satu) tahun" | ya | REN-3 |
| `pengungsi_mutakhir` | 1 hari | data terakhir | `juknis-9-2023` hal. 10 | "setiap hari" (frasa lengkap dipastikan G-1) | G-1 | WIL-2 |
| `klaster_logistik_mutakhir` | 3 bulan | laporan terakhir | `juklak-16-2025` | "per triwulan/ 3 (tiga) bulan" | ya | OJL-3 |
| `hibah_rr_lapor` | 3 bulan, dan paling lambat 15 hari kalender sesudah tahap berakhir | SPPH, akhir tahap | `juklak-9-2024` BAB II (hal. 9) | "paling lambat 15 (lima belas) hari kalender setelah berakhirnya setiap tahapan" | ya | REN-3 |
| `tlhp` | 60 hari | LHP diterima | `pedoman-1-2025` BAB II | "paling lambat 60 (enam puluh) hari setelah laporan hasil pemeriksaan diterima" | ya | IRT-1, REN-3 |
| `pengaduan_berkadar` | 20 hari kerja | pengaduan diterima | `juklak-5-2025` | "dalam jangka waktu 20 (dua puluh) hari kerja sejak pengaduan diterima" | ya | REN-3 |
| `pengaduan_tak_berkadar` | 15 hari kerja | pengaduan diterima | `juklak-5-2025` | "dalam jangka waktu 15 (lima belas) hari kerja sejak pengaduan diterima" | ya | REN-3 |
| `laporan_pelatihan` | 7 hari kerja | pelatihan selesai | `perban-2-2025` Pasal 14 ayat (3) | "paling lambat 7 (tujuh) hari kerja setelah berakhirnya kegiatan pelatihan" | ya | REN-3 |
| `jf_jp_tahun` | 20 JP per tahun | tahun kalender | `perban-4-2025` Pasal 40 | "paling sedikit 20 (dua puluh) jam pelajaran dalam 1 (satu) tahun" | ya | JF-1 |
| `rpbd_monev` | 1 tahun | berulang | `perban-3-2026` Pasal 47 | dipastikan G-1 | G-1 | PSPB-1, REN-3 |
| `stok_minimal_jam` | 72 jam | penetapan status darurat | `perka-23-2014` Pasal 1 angka 15 | "kurun waktu 72 jam pertama sejak keadaan darurat bencana ditetapkan" | ya | PLP-1 |
| `stok_pr_umum` | 1% | - | `perka-23-2014` Pasal 12 ayat (2) | "1% dari jumlah penduduk" | RU | PLP-1 |
| `stok_pr_khusus` | 4% | - | `perka-23-2014` Pasal 14 ayat (2) | "4% dari jumlah penduduk" | RU | PLP-1 |
| `stok_jiwa_per_paket` | 4 jiwa | - | `perka-23-2014` Pasal 11 huruf b, c; Pasal 13 | "Jumlah Penduduk x Prosentase x Hari/ 4 Jiwa" | ya | PLP-1 |
| `std_beras_kg` | 0,4 kg per orang per hari | - | `perka-7-2008` | "beras 400 gram per orang per hari" | RU | MB-5 |
| `std_air_minum_l` | 2,5 l per orang per hari | - | `perka-7-2008` | "air minum diberikan sejumlah 2.5 liter per orang per hari" | RU | MB-5 |
| `std_air_bersih_l` | 7 l pada 3 hari pertama, lalu 15 l per orang per hari | buka tempat | `perka-7-2008` hal. 12 | "7 liter pada tiga hari pertama, selanjutnya 15 liter per orang per hari" | RU | MB-5 |
| `std_hunian_m2` | 3 m2 per orang | - | `perka-7-2008` | "3 (tiga) meter persegi per orang" | RU | MB-5 |
| `std_jamban_jiwa` | 1 jamban per 20 orang | - | `perka-7-2008`; `juklak-3-2022` hal. 25 | "1 jamban/20 orang" | ya (Juklak) | MB-5 |
| `std_sabun_kg` | 0,25 kg per orang per bulan | - | `perka-7-2008` | "250 gram sabun mandi setiap bulan" | RU | MB-5 |
| `std_sampah_kk` | 1 kantong untuk 3 keluarga per 3 hari | - | `juklak-3-2022` hal. 25 | "untuk 3 (tiga) keluarga selama 3 (tiga) hari" | ya | MB-5 |

Kunci berlabel asumsi (`asumsi: true`, wajib `catatan`; G-1 menolak bila tanda hilang):

| Kunci | Nilai | Alasan tanpa pasal | Dipakai |
| --- | --- | --- | --- |
| `masa_status_kab` | 14 hari | Pedoman Penetapan Status 2016, bukan dokumen JDIH (riset/3 §2; batas atas rentang 7-14 hari) | KPOD-1, WIL-1 |
| `masa_status_prov` | 1 bulan | idem, batas atas 14 hari sampai 1 bulan | KPOD-1, WIL-1 |
| `masa_status_nas` | 3 bulan | idem, batas atas 1 sampai 3 bulan | KPOD-1, WIL-1 |
| `renkon_segera_hari` | 90 hari | tanda internal | KS-1, F0-2 |
| `logistik_setuju_jam` | 24 jam | tanda internal meja | F0-2 |
| `destana_pasif_bulan` | 12 bulan | tanda internal (riset/2 temuan 5) | F0-2 |
| `rehab_macet_hari` | 60 hari | tanda internal meja | F0-2 |
| `hibah_logpal_lapor` | 12 bulan | Juklak 3/2024 tidak menyebut angka (riset/4 Q4) | PLP-3 |
| `hibah_kedaluwarsa_hari` | 90 dan 30 hari | peringatan internal | PLP-3 |
| `ikd_ambang_kelas` | 0,40 dan 0,80 | riset/1 §1.5, tidak ada di korpus | PERB-1 |
| `ews_radius_sirine_km` | 2 km | hipotesis jangkau dengar (riset/2 PD-2) | PD-2 |
| `evakuasi_jarak_km` | tsunami 1 km; banjir 2 km; erupsi 2 km | riset/2 KS-3, belum dicek ke pedoman TES | KS-3 |
| `pr_risiko_rentang` | 1% sampai 4% | penjepit skenario ketiga PLP-1 | PLP-1 |
| `jam_dekat_hari` | 30 hari | ambang pil "dekat" (DS §5.2.3) | semua `.un-jam` |
| `sk_gabung_hari` | 14 hari | pola `perpanjangan` di `status_darurat.json` | RRX-1 |
| `r3p_layak_rumah` | 100 rumah (RB + RS) | ambang internal riset/5 D1 | RRX-1 |
| `tarif_stimulan_juta` | RB 60, RS 30, RR 15 | rilis 2023-2024; Juklak 5/2024 tidak ada di korpus (riset/5 §1) | RRX-1, RRP-1, RRP-3, PERB-2 |
| `kalender_tanpa_libur` | benar | daftar libur nasional belum diisi | semua `hari_kerja` |

### 3.2 Fungsi `tenggat(kunci, mulai)`

Masukan `mulai` = cap waktu UTC atau tanggal ISO. Keluaran tanggal atau cap waktu ISO, atau `null` dan alasan.

| Satuan | Aturan |
| --- | --- |
| `jam` | `mulai + nilai x 3.600 detik` dari cap waktu (bukan dari tanggal). Contoh: tiba 2026-12-31 23.30 WIB + 24 jam = 2027-01-01 23.30 WIB |
| `hari`, `hari_kalender` | tanggal WIB `mulai` + nilai hari |
| `hari_kerja` | mulai hari kerja pertama SESUDAH tanggal `mulai`; hitung Senin sampai Jumat; libur nasional dilewati bila daftar libur di berkas tidak kosong, selain itu keluaran berlabel asumsi `kalender_tanpa_libur`. Contoh: selesai Jumat 2026-11-06, 7 hari kerja = Selasa 2026-11-17 |
| `bulan` | tanggal yang sama N bulan kemudian; bila tanggal itu tidak ada, dipangkas ke hari terakhir bulan itu. 2025-11-30 + 3 bulan = 2026-02-28 |
| `tahun` | 12 x N bulan dengan aturan pangkas yang sama. 2024-02-29 + 3 tahun = 2027-02-28 |
| `tanggal_bulan_berikut` | tanggal ke-`nilai` bulan sesudah bulan `mulai`, selalu bulan berikutnya, walau `mulai` jatuh sebelum tanggal itu. Cair 2026-01-05 memberi 2026-02-05; cair 2026-12-10 memberi 2027-01-05 |

Aturan pangkas akhir bulan dan hari kerja tanpa libur adalah tafsir kita, bukan pasal (RU §9 butir 12); keduanya tercatat di `catatan` berkas.

Status jam (`.un-jam`, DS §5.2.3): `sisa = tenggat - hari ini` (hari, atau jam bila sisa < 48 jam). `lewat` bila sisa < 0; `dekat` bila 0 ≤ sisa ≤ `jam_dekat_hari`; `aman` selain itu; `tanpa` bila `mulai` kosong. Tenggat yang jatuh tepat hari ini berstatus `dekat` dengan sisa 0, bukan `lewat` (kasus `dsp_laporan_kejadian`: kejadian 2026-11-02, laporan 2026-11-05 tepat waktu; 2026-11-06 terlambat 1 hari).

Untuk aturan berulang (`ews_evaluasi`, `renkon_reviu`, `destana_evaluasi`): `tenggat = tenggat(kunci, kejadian_terakhir)`; bila kejadian terakhir tidak diketahui, tenggat tampil sebagai aturan ("tiap 4 bulan"), bukan tanggal (DT §5.12).

Invarian (RU §2.1): tenggat ≥ peristiwa; monoton terhadap peristiwa; dua panggilan memberi hasil sama; tidak pernah jatuh di tanggal yang tidak ada; tanggal kosong atau tidak sah memberi `null` dan alasan, bukan 1970.

### 3.3 Status dokumen berjangka (dipakai F0-2, KS-1)

Untuk renkon dengan `tgl_tetap` dan opsional `reviu_terakhir`:

- `akhir = tenggat(renkon_berlaku, tgl_tetap)`; `reviu_berikut = tenggat(renkon_reviu, maks(tgl_tetap, reviu_terakhir))`.
- Status, diperiksa berurutan: `kedaluwarsa` bila hari ini ≥ akhir; `segera_habis` bila akhir - hari ini ≤ `renkon_segera_hari`; `perlu_reviu` bila hari ini > reviu_berikut; selain itu `berlaku`.
- Kasus: ditetapkan 2024-03-01, reviu 2026-04-30 memberi `perlu_reviu` (reviu berikut 2026-10-30); reviu 2026-06-01 memberi `berlaku`; ditetapkan 2023-10-01 memberi `kedaluwarsa` (RU §3.2).

Destana: `penilaian_kedaluwarsa` bila hari ini ≥ `tenggat(destana_penilaian, tgl_penilaian)`. Kasus: penilaian 2023-10-01 jatuh tempo 2026-10-01, kedaluwarsa.

DSP (F0-2): tanda laporan perkembangan bila hari ini > `tenggat(dsp_laporan_perkembangan, laporan_terakhir atau cair)` dan laporan bulan itu belum ada; tanda SPJ bila hari ini > `tenggat(dsp_spj, tgl_status_berakhir)` dan SPJ belum; `tgl_status_berakhir` kosong memberi tanda "tanggal status berakhir belum diisi", bukan tanda SPJ.

Kaji cepat (F0-2): `rec.dibuat` dipakai sebagai proksi "tiba di lokasi" sampai WIL-3 menyimpan waktu tiba (DT §10 butir 16); tanda "laporan awal lewat 1 x 24 jam" bila lewat `kaji_awal` tanpa laporan awal; "laporan lanjutan lewat 3 x 24 jam" bila lewat `kaji_lanjutan` tanpa lanjutan.

---

## 4. MB-3 Pemanen JDIH daerah

Kode: `scripts/bnpb/unit/jdih_daerah.py` (DT §4.3). Masukan hanya metadata: judul, jenis peraturan, nomor, tahun, tanggal penetapan, URL, nama pemda. Teks penuh tidak dipanen.

### 4.1 Normalisasi judul

`judul_n` = huruf kecil, `–`/`—` menjadi `-`, spasi tunggal, tanda kutip dibuang.

### 4.2 Pengenalan jenis dokumen `kenali(judul_n)`

Diperiksa berurutan; yang pertama cocok menang.

| Urutan | Jenis | Pola (Python `re`, `judul_n`) |
| --- | --- | --- |
| 1 | tolak | `\bpencabutan\b` atau `\bdicabut\b` di judul (dokumen pencabut dicatat terpisah sebagai `cabut` untuk pemda itu, tidak dikenali sebagai dokumen berlaku) |
| 2 | `rpkb` | `rencana penanggulangan kedaruratan bencana` atau `\brpkb\b` |
| 3 | `renkon` | `rencana kontin[jg]ensi` |
| 4 | `rencana_aksi` | `rencana aksi\b.{0,60}(pengurangan risiko bencana|kesiapsiagaan|penanggulangan bencana|\bprb\b)` |
| 5 | `rpbd` | `rencana penanggulangan bencana\b` (tidak diikuti `kedaruratan`) atau `\brpbd?\b` |
| 6 | tidak dikenali | lainnya: `None` |

Tanda tambahan: `perubahan = True` bila judul memuat `perubahan atas`. Dokumen perubahan tidak memulai periode baru kecuali judulnya memuat periode sendiri. Jenis peraturan (`perda`, `perkada`: peraturan bupati, walikota, gubernur; `keputusan`) dibaca dari medan jenis JDIH, bukan dari judul.

### 4.3 Periode `periode(judul_n, tgl_tetap)`

1. Pola utama: `tahun\s+(\d{4})\s*(?:-|s\.?\s?d\.?|sampai dengan)\s*(\d{4})`; cadangan tanpa kata "tahun": `\b(20\d{2})\s*-\s*(20\d{2})\b`.
2. Sah bila 2000 ≤ mulai ≤ 2040, mulai < akhir, dan akhir - mulai ≤ 10. Selain itu periode dianggap tidak ada.
3. Tanpa periode sah: `mulai = tgl_tetap`, `akhir = tenggat(5 tahun, tgl_tetap)`, `periode_diduga = True` (RU §4 MB-3; riset/1 PSPB-1). Lima tahun ini asumsi bawaan riset, bukan pasal; konstanta `rpbd_masa_diduga_tahun` di skrip.

Kasus: "Rencana Penanggulangan Bencana Daerah Tahun 2025-2029" memberi periode 2025-2029; "RPB Kabupaten X" ditetapkan 2022-05-10 memberi berlaku sampai 2027-05-10, diduga.

### 4.4 Pencocokan pemda

`cocok_pemda(nama_pemda)` lewat `scripts/bnpb/wilayah_kab.py` `norm()` dan alias. Hasil hanya diterima bila tepat satu kode cocok; selain itu `null` dan dicatat di `kode_gagal`. Dokumen tanpa kode tidak masuk register.

### 4.5 Status per pemda

Untuk pemda w dan jenis j, ambil dokumen dikenali j dengan `tgl_tetap` terbaru (bukan perubahan, kecuali perubahan membawa periode sendiri).

RPBD (PSPB-1), berurutan:

| Status | Syarat |
| --- | --- |
| `tidak_bisa_dicek` | permintaan ke sumber pemda gagal (HTTP 5xx, waktu habis) atau `diblokir` (penolak bot); bukan `tidak_ditemukan` (RU §4) |
| `sesuai_3_2026` | dokumen ada, periode mencakup tahun ini, dan tgl_tetap ≥ 2026-10-06 (tanggal berlaku Perban 3/2026 menurut riset/1) |
| `berlaku` | dokumen ada dan mulai ≤ tahun ini ≤ akhir (atau hari ini < akhir untuk periode diduga) |
| `habis` | dokumen ada, periode sudah lewat |
| `tidak_ditemukan` | sumber terbaca, tidak ada dokumen dikenali |

Renkon, RPKB, rencana aksi (KS-1): status §3.3 per dokumen. RPKB `perlu_mutakhir` bila ada SK status darurat di daerah itu (kab atau prov, `status_darurat.json`) dengan `mulai` > tgl_tetap RPKB (Perban 9/2025 Pasal 26 ayat (2) huruf c). Renkon dipetakan ke bahaya dengan kata kunci bahaya di judul (`banjir`, `longsor|tanah longsor|gerakan tanah`, `gempa`, `tsunami`, `erupsi|gunung api|gunungapi`, `kebakaran hutan|karhutla`, `kekeringan`, `cuaca ekstrem`); tanpa kata bahaya: `multi`. Tanda "renkon bahaya utama belum ada" bila bahaya `utama` di `risiko_hvc.json` tidak punya renkon berstatus selain `kedaluwarsa`.

Angka kartu: `persen_rpbd = (#berlaku + #sesuai_3_2026) / 552`, dipisah provinsi (/ 38) dan kab/kota (/ 514). `tidak_bisa_dicek` tetap di penyebut dan dilaporkan jumlahnya di `title`. Label: sekunder ("menurut JDIH daerah"); `tidak_ditemukan` berlabel "tidak terbit di JDIH, belum tentu tidak punya"; renkon berlabel "batas bawah".

### 4.6 Ambang yakin MB-3

Pengenalan adalah regex deterministik, jadi "yakin" diukur sebelum tayang: presisi `kenali()` per jenis pada 50 judul berlabel tangan (fixture `tests/bnpb/fixtures/unit/jdih_judul_50.json`, campuran dikenali dan tidak) wajib ≥ 0,95 (ambang asumsi). Jenis yang gagal tidak dipakai di kartu sampai polanya dibetulkan. Koreksi staf lewat `unit_ketuk` (DT §6.2) menimpa hasil mesin untuk pemda itu.

---

## 5. MB-4 Skor prioritas daerah (rumus final)

### 5.1 Masalah yang diputuskan

KA §4 menulis "skor risiko x celah kapasitas x celah layanan per kab/kota dengan bobot yang tampil". Dokumen di bawahnya memberi tiga bentuk yang tidak sama: PRD §5 MB-4 jumlah berbobot persentil, DT §4.4 rata-rata geometrik berbobot persentil, RU §2.2 menguji keduanya ditambah rumus perkalian khusus DIK-1 (`terpapar x (1 - kapasitas) x (1 + kejadian)`). Sesi induk memutus rumus di bawah sebagai satu-satunya (KA §8).

### 5.2 Rumus

Untuk kab k dan himpunan komponen J_k (komponen yang punya nilai untuk k), bobot w_j > 0:

```
q_kj = maks(p_kj, 0,01)        bila komponen j bertipe persentil   (p_kj dari §0.6, dengan arah komponen)
q_kj = v_kj                    bila komponen j bertipe mutlak       (v_kj sudah di [0, 1], 0 bermakna nol)

S_k  = Π_{j ∈ J_k} q_kj ^ (w_j / W_k),      W_k = Σ_{j ∈ J_k} w_j
```

`S_k` di [0, 1]. Bila J_k memuat kurang dari separuh komponen sistem (dihitung atas jumlah bobot: W_k < 0,5 x Σ_j w_j), `S_k = null` dan baris tampil "data kurang". Urutan: S menurun; skor sama diurut kode wilayah menaik.

Nilai kembalian per kab: `{skor, rinci: {j: {nilai_asli, p atau v, q, w}}, hilang: [j], label}`. `rinci` membuat layar bisa menjelaskan urutan per komponen (DT §4.4).

### 5.3 Kenapa rata-rata geometrik

1. **Sesuai KA §4** (otoritas tertinggi): "risiko x celah kapasitas x celah layanan" adalah perkalian. Rata-rata geometrik adalah perkalian yang dipangkatkan bobot, jadi tetap perkalian dan tetap di [0, 1].
2. **Tidak bisa diangkat satu komponen.** Di jumlah berbobot (PRD), kab berisiko tinggi tetapi sudah berkapasitas tinggi dan sudah terlayani tetap masuk daftar karena komponen risikonya besar. Di perkalian, celah yang nol menurunkan skor. Itu arti "celah" di KA.
3. **Bobot tetap tampil dan bermakna**: w_j/W_k adalah pangkat; bobot dua kali lipat berarti komponen itu dua kali lebih menentukan. Jumlah bobot tampil yang dinormalkan = 1 (RU §2.2 invarian).
4. **Monoton**: menaikkan p atau v satu komponen tidak pernah menurunkan S (RU §2.2 invarian 500 pasangan acak tetap berlaku).
5. **Rumus DIK-1 lama dijadikan konfigurasi**, bukan rumus kedua (§5.5). Bentuk `(1 + kejadian)` tidak dipertahankan: ia membuat kejadian tidak pernah bisa menurunkan skor dan tidak terbatas di atas, sehingga tidak bisa disandingkan dengan sistem lain. Kab tanpa kejadian sejarah tidak jatuh ke nol karena persentil memakai peringkat rata-rata untuk nilai sama (§0.6): ratusan kab dengan 0 kejadian berbagi peringkat tengah kelompoknya, bukan 0.
6. **Lantai 0,01 hanya untuk persentil**: kab dengan nilai terendah di satu komponen (p = 0) tidak dihapus seluruhnya, karena "terendah di antara 514" bukan "tidak ada". Komponen mutlak tidak diberi lantai: celah layanan 0 (sudah tercakup penuh) memang berarti tidak perlu, dan skornya 0.

### 5.4 Komponen bawaan

| Komponen | Tipe, arah | Nilai asli dan sumber | Label |
| --- | --- | --- | --- |
| `risiko` | persentil, +1 | jiwa terpapar kelas tinggi, maksimum atas bahaya: `maks_b terpapar.json kab[k].h[b][2]` | proksi (titik pusat desa, `scripts/bnpb/terpapar.py` BATAS) |
| `celah_kapasitas` | persentil, +1 | `1 - ikd.json kab[k].c` | proksi ("bukan IKD resmi", `ikd.json` `catatan`) |
| `kejadian` | persentil, +1 | jumlah `kejadian` 5 tahun kalender terakhir yang lengkap di `dibi_kab_tahun.json` (5 Nov 2026: 2021-2025), semua jenis | resmi (DIBI), dijumlah kita |
| `celah_layanan` | diberikan sistem pemakai | §5.5 | sesuai sistem |

Risiko bawaan memakai jiwa terpapar, bukan `risiko_hvc.json` `R_total`, karena uji yang sudah ada di berkas itu sendiri memberi vonis GAGAL dan korelasi peringkat `R_total` dengan korban jiwa 2022-2025 hanya -0,011, sedangkan penduduk 0,35 (`risiko_hvc.json` `label` dan `uji_peringkat_kab`, dibaca 5 Nov 2026). Sistem boleh memilih `R_total` hanya bila uji baliknya (§5.6) membuktikan lebih baik. Catatan yang sama berlaku untuk kapasitas: `kebalikan_C` berkorelasi -0,223 dengan korban jiwa di uji itu, jadi `celah_kapasitas` wajib ikut diuji balik dan tidak diklaim sebagai penjelas dampak.

Bobot bawaan: sama rata (w = 1 tiap komponen), ditulis di keluaran (`bobot`), tampil di kartu, berpil "Asumsi: bobot sementara". Bobot diubah hanya di satu tempat per sistem (konstanta di kepala skrip pemakai), dan perubahan bobot mengubah sha kriteria uji balik.

### 5.5 Konfigurasi per pemakai

| Sistem | Komponen (tipe) | Celah layanan | Keluaran dan label wajib |
| --- | --- | --- | --- |
| MT-2 | risiko, celah_kapasitas, kejadian (persentil) | tidak ada (fasilitasi mitigasi belum tercatat per kab) | kab prioritas = kuartil atas S (S ≥ persentil 75 dari S yang tidak null); "usulan analis, bukan rekomendasi resmi" |
| DIK-1 | risiko, celah_kapasitas, kejadian (persentil); celah_layanan (mutlak) | `1 - min(alumni_lulus_5thn / sdm_pb_kab, 1)`, `sdm_pb_kab` bawaan 30 orang (asumsi, riset/6 pertanyaan 6) | tanpa unggahan alumni, komponen celah layanan tidak ada dan kartu menulis "cakupan belum ada data" (bukan 0) |
| PLP-2 | risiko (persentil, dari `public/banjir/data/risiko_kecamatan.json` dijumlah ke kab), kejadian (persentil), celah stok PLP-1 (persentil atas `celah` beras kg, kab `belum_dilaporkan` tanpa nilai), celah peralatan (persentil atas `1 - ada/standar` Perka 17/2009), celah kapasitas kelembagaan (persentil `1 - c`), belum menerima 3 tahun (mutlak: 1 belum, 0,5 sudah) | tidak ada | "daftar pendek, keputusan tetap di rapat"; kolom "program prioritas nasional" dan "analisis strategis" kosong untuk rapat, tidak diskor (RU P2) |
| PD-2 | penduduk terpapar tinggi tak terlayani (persentil), kejadian bahaya itu (persentil), celah_kapasitas (persentil) | sudah di komponen pertama | prioritas lokasi paket; "batas bawah dari OSM" |
| OJL-2 | jiwa sasaran N (persentil), jarak ke gudang (persentil, +1) | tidak ada | dipakai hanya untuk mengurutkan saran jelang kejadian bila saran lebih banyak daripada yang bisa ditangani; "saran, bukan perintah" |

Nilai 0,5 untuk "sudah menerima hibah" (PLP-2) adalah asumsi: penerima tidak dicoret, hanya diturunkan. Tanpa daftar penerima (U10 bawaan), komponen itu tidak ada untuk semua kab dan bobotnya dinormalkan ulang.

PERB-1 tidak memakai S: urutannya adalah manfaat dibagi biaya (§10.1), karena ia menjawab pertanyaan lain (dampak ke IRB). PERB-1 memakai konvensi MB-4 untuk label, `rinci`, dan urutan stabil.

### 5.6 Kasus acuan pengganti RU §2.2

Masukan fixture; p dan v diberikan langsung.

| Kasus | Masukan | Diharapkan |
| --- | --- | --- |
| A1 (ganti P1) | 4 komponen persentil, p = 0,9; 0,5; 0,7; 0,1; bobot sama | S = (0,9 x 0,5 x 0,7 x 0,1)^(1/4) = 0,42129 |
| A2 (ganti P3) | A1 tanpa komponen ke-4 untuk kab itu | S = (0,9 x 0,5 x 0,7)^(1/3) = 0,68041; `hilang` memuat komponen ke-4 |
| A3 lantai | A1 dengan p ke-4 = 0 | q = 0,01; S = 0,23691 |
| A4 mutlak nol (ganti M2) | A1 dengan komponen ke-4 mutlak v = 0 (cakupan 1,5 dipangkas 1) | S = 0 |
| A5 DIK-1 (ganti M1) | p risiko 0,8; celah kapasitas 0,7; kejadian 0,5; cakupan 12/30 = 0,4 sehingga v = 0,6 | S = (0,8 x 0,7 x 0,5 x 0,6)^(1/4) = 0,64022 |
| A6 DIK-1 tanpa cakupan | A5 tanpa unggahan | S = (0,8 x 0,7 x 0,5)^(1/3) = 0,65421; "cakupan belum ada data" |
| A7 bobot | p = 0,9; 0,5; 0,1; w = 2; 1; 1 | S = 0,9^0,5 x 0,5^0,25 x 0,1^0,25 = 0,44860; bobot tampil 0,5; 0,25; 0,25 |
| A8 data kurang (ganti M3) | 4 komponen, hanya 1 ada | W_k = 1 < 2: S = `null`, "data kurang", tidak diurutkan sebagai 0 |
| A9 persentil seri | nilai [10, 20, 20, 40] | p = [0; 0,5; 0,5; 1] |
| A10 PLP-2 biner | p 0,9; 0,5; 0,7 dan "sudah menerima" v = 0,5 | S = 0,62997 (lawan 0,74917 bila belum) |

Invarian: S di [0, 1]; monoton per komponen; urutan stabil; jumlah bobot ternormal = 1 (toleransi 1e-9); tiap baris berlabel sesuai §5.5.

### 5.7 Uji balik MB-4

Klaim yang diuji: kab dengan S tinggi adalah kab yang kemudian benar-benar butuh (mengalami dampak). Ini berlaku untuk MT-2, DIK-1, PLP-2, PD-2 (komponen kebutuhan; celah layanan tidak bisa diuji mundur karena datanya tidak punya riwayat).

| Bagian | Isi |
| --- | --- |
| Kriteria | `scripts/bnpb/unit/lab_kriteria/mb4.json`, dikunci sebelum hasil dilihat (§0.9) |
| Masukan | `kejadian` dihitung dari `dibi_kab_tahun.json` 2015-2020 saja; `risiko` dan `celah_kapasitas` adalah potret 2026 (`terpapar.json`, `ikd.json`), dicatat sebagai kebocoran tak langsung yang tidak bisa dihindari |
| Sasaran | per kab, jumlah tahun 2021-2025 yang "berdampak berat": meninggal_hilang ≥ 1, atau mengungsi ≥ 1% penduduk `n`, atau rumah_rusak_berat ≥ 100 (ambang asumsi, ditulis di kriteria) |
| Metrik | (a) korelasi peringkat Spearman S lawan sasaran; (b) angkat 20% teratas = (porsi kab-tahun berdampak berat yang jatuh di 20% kab S teratas) / 0,2 |
| Pembanding | B1 penduduk `n` saja; B2 jumlah kejadian 2015-2020 saja; B3 risiko saja |
| Syarat lulus | angkat ≥ 1,5 DAN Spearman S ≥ Spearman B1 DAN angkat S ≥ angkat B2 |
| Bila gagal | kartu tetap tampil sebagai "urutan skor" dengan pil "Asumsi: belum lulus uji balik" dan baris pembanding yang menang tercetak di `title`; kata "prioritas" tidak dipakai di judul |

Bobot boleh diubah hanya dengan mengunci kriteria baru (sha baru); mencari bobot yang lulus dengan melihat hasil uji dilarang (pemeriksa `validasi-model`).

---

## 6. MB-5 Neraca kebutuhan

Kode: `scripts/bnpb/unit/neraca.py`, kembar JS `kebutuhanDasar()` di `public/inti/jam_aturan.js` (DT §4.5). Standar hanya dari kunci `std_*` dan `stok_*` (§3.1).

### 6.1 Neraca umum

`neraca(butuh, ada)` per barang:

- `ada = null` (tidak dilaporkan): status `belum_dilaporkan`, `celah = null`.
- `ada ≥ butuh`: status `cukup`, `celah = 0` (batas inklusif, RU S8).
- `ada < butuh`: status `kurang`, `celah = butuh - ada`.
- `ada` negatif atau bukan angka ditolak saat muat.

### 6.2 PLP-1 stok penyangga (Perka 23/2014, Perka 7/2008)

Simbol per kab k: JP = `terpapar.json kab[k].n` (jiwa, Dukcapil); PR = persentase (pecahan); H = `stok_minimal_jam` / 24 = 3 hari; b = `kab[k].b` (balita 0-4); `J = stok_jiwa_per_paket` = 4.

| Keluaran | Rumus | Satuan | Pasal | Label |
| --- | --- | --- | --- | --- |
| paket pangan | JP x PR x H | orang-hari | Perka 23/2014 Pasal 11 huruf a, Pasal 13 | hitungan |
| paket sandang, papan (bacaan harfiah) | JP x PR x H / J | paket | Pasal 11 huruf b, c | hitungan, "bacaan harfiah Pasal 11" |
| paket sandang, papan (bacaan per keluarga) | JP x PR / J | paket | tafsir riset/4 Q3 | hitungan, "bacaan per keluarga", tampil berdampingan sampai Q3 dijawab |
| beras | pangan x `std_beras_kg` | kg | Perka 7/2008 | hitungan |
| air minum | pangan x `std_air_minum_l` | liter | Perka 7/2008 | hitungan |
| tambahan balita | PR x b x H | orang-hari | riset/4 P1 (komposisi paket tambahan) | hitungan |
| celah beras | neraca(beras, stok beras) | kg | §6.1 | hitungan |

Tiga skenario PR: `pr1 = stok_pr_umum` (1%, Pasal 12), `pr4 = stok_pr_khusus` (4%, Pasal 14), `pr_risiko = clamp(maks_b h[b][2] / JP, 1%, 4%)` (asumsi `pr_risiko_rentang`). Kasus: S1 sampai S10 (RU §2.3). Contoh nyata Purbalingga 3303 (DT §5.7): JP 1.057.750, PR 1%: pangan 31.732,5 orang-hari, beras 12.693 kg, air minum 79.331 liter, sandang harfiah 7.933 paket, sandang per keluarga 2.644 paket, balita 2.117 orang-hari.

Stok: urutan sumber (1) INALOGPAL `Api/gudang_sumbar` bila U4 mengizinkan (resmi), (2) meja `gudang` (isian BPBD, label resmi bila pengisinya akun BPBD), (3) tidak ada: `belum_dilaporkan`.

Invarian: tepat 514 baris; kebutuhan pr4 = 4 x kebutuhan pr1 per kab; JP ≤ 0 atau bukan angka ditolak.

Uji balik PR (riset/4 P1; RU §2.3): rasio_kt = mengungsi_kt / n_k dari `dibi_kab_tahun.json` 2015-2025, dipangkas di persentil 99 nasional. Keluaran: per kab `rasio_maks`, tahunnya, `lewat_1pct`; nasional: jumlah dan persen kab-tahun > 1% dan > 4% dengan penyebutnya, p95, p99. Penduduk 2026 dipakai untuk semua tahun (berlabel). Ini uji asumsi pasal, bukan klaim prediksi: hasilnya tampil sebagai fakta ("209 dari 5.654 kab-tahun melewati 1%", reproduksi riset/4 dengan sha256 masukan), tidak menggerbangi kartu. Kab yang pernah melewati 1% ditandai "calon PR 4%" (hitungan).

### 6.3 WIL-2 kebutuhan dasar per tempat pengungsian

Simbol per tempat t pada tanggal d: `jiwa` = jumlah 12 kolom umur x kelamin di `pengungsian_harian` (DT §6.15); `kk` = kolom `kk`; `hari_ke = (d - buka) + 1` (hari pertama buka = hari ke-1).

| Barang | Rumus | Satuan | Acuan |
| --- | --- | --- | --- |
| beras | 0,4 x jiwa | kg per hari | `std_beras_kg` |
| air bersih | 7 x jiwa bila hari_ke ≤ 3; 15 x jiwa bila hari_ke ≥ 4 | liter per hari | `std_air_bersih_l` |
| air minum | 2,5 x jiwa | liter per hari | `std_air_minum_l` |
| jamban | ceil(jiwa / 20) | unit | `std_jamban_jiwa` |
| hunian | 3 x jiwa | m2 | `std_hunian_m2` |
| kantong sampah | ceil(kk / 3) | kantong per 3 hari | `std_sampah_kk` |
| sabun mandi | 0,25 x jiwa | kg per bulan | `std_sabun_kg` |

Kasus K1 sampai K3 (RU §2.3): 230 jiwa, 61 KK, buka 2 hari lalu (hari_ke 3): beras 92 kg, air bersih 1.610 l, jamban 12, hunian 690 m2, kantong 21, sabun 57,5 kg; buka 4 hari lalu (hari_ke 5): air bersih 3.450 l; jamban 20 jiwa = 1, 21 jiwa = 2. Kasus tepi: buka 3 hari lalu (hari_ke 4) sudah 15 l; jiwa 0 memberi semua 0 dan jamban 0; `kk` 0 dengan jiwa > 0 ditolak di rute (pengungsi tanpa KK tidak sah). Susu dan popok (riset/3 W2) tidak dihitung sampai ada standar berpasal.

Rekap kab per tanggal d: jumlah atas tempat dengan data berumur ≤ 2 x `pengungsi_mutakhir` = 2 hari (umur = d - tanggal data terakhir). Tempat berumur > 2 hari ditandai basi dan tidak dijumlah (K5). Tempat < 10 jiwa tidak tampil per tempat (DT §9.2).

Panel selisih pusat lawan daerah: `selisih = |P - D| / maks(P, D)`; P = `mengungsi_jiwa` Laphar (resmi, pusat), D = rekap daerah (resmi bila pengirim akun BPBD) atau berita (sekunder). Merah bila selisih > 0,25 (asumsi, riset/3 W2). Kedua angka tampil dengan tanggal dan labelnya; sistem tidak memilih. Kasus K4: P 4.385, D 18.908, selisih 0,768, merah. P = D = 0: selisih 0. Salah satu `null`: panel tidak dihitung.

### 6.4 RRP-1 neraca rumah rusak

Simbol per (kejadian e, kab k): L_t = rumah lapor tingkat t ∈ {RB, RS, RR} dari `dibi_kejadian.json` (`rr_berat`, `rr_sedang`, `rr_ringan`); V_t = verifikasi dari layer ArcGIS (`verif_rb`, `verif_rs`, `verif_rr`, `verif_tmk`, `total_rumah_verif`, kamus kolom per layer `scripts/bnpb/unit/kamus_layer.json`); S = tersalur (RRP-2 diterima dan meja `rehab`).

| Keluaran | Rumus | Label |
| --- | --- | --- |
| kemajuan verifikasi | total_verif / (L_RB + L_RS + L_RR); boleh > 1 | hitungan |
| rasio susut RB | V_RB / L_RB; `null` bila L_RB = 0 | hitungan |
| estimasi V_RB tanpa verifikasi | L_RB x median rasio susut RB kab lain di kejadian sejenis (jenis sama) yang punya V; minimal 3 kab pembanding, selain itu "belum ada pembanding" | hitungan, "estimasi" |
| periksa masuk akal | tanda bila L_total kec > 0,8 x bangunan Open Buildings kec (R2 `bangunan/kec.json`); ambang dari kalibrasi Cianjur (riset/5 P1) | hitungan |
| beban stimulan | Σ_t unit_t x tarif_t, tarif `tarif_stimulan_juta`; dua kolom: lapor dan verifikasi | hitungan, "estimasi kita", tarif berpil asumsi |

Kasus R1 sampai R4 (RU §2.3): Nagekeo rasio susut 314 / 4.079 = 0,077; kemajuan 120.574 / 95.750 = 1,259; beban lapor Rp2.930.385 juta, verifikasi Rp1.336.260 juta. Kejadian sejenis = jenis bencana sama; sumber pembanding dibatasi 5 tahun terakhir. Fixture layer NTT disimpan agregat kab tanpa titik.

---

## 7. MB-6 Indikator rapor

Tiap indikator membawa `rumus` (teks), `masukan` (berkas dan tanggal), `nilai`, `label` (RU §4). Masukan kosong: "belum ada data", tidak ikut rata-rata. Rumus per sistem:

### 7.1 PUS-1 Rapor walidata (Perban 1/2023 Pasal 8 huruf b)

Masukan: CKAN `organization_list?all_fields=true`, `package_search` berhalaman (MB-8). Per organisasi o:

| Indikator | Rumus | Kasus tepi | Label |
| --- | --- | --- | --- |
| n_dataset | jumlah paket o | 0 tampil 0 | resmi |
| umur_median_hari | median (hari ini - `metadata_modified`) | 0 paket: `null` | hitungan |
| persen_metadata | 100 x paket dengan `notes`, `license_id`, `maintainer`, `frequency` semuanya tidak kosong / n_dataset | 0 paket: `null`; daftar kolom wajib bawaan, berlabel asumsi sampai walidata menetapkan | hitungan |
| basi | jumlah paket dengan umur > 2 x periode(`frequency`) (batas eksklusif: umur 60 pada periode 30 tidak basi, 75 basi) | `frequency` tak dikenali: "periode tidak dinyatakan", tidak dinilai basi, dihitung terpisah | hitungan |
| persen_prioritas_terbit (nasional) | 100 x jumlah dari 37 data prioritas LAKIP Lampiran 9 yang cocok judul paket / 37 | cocok = semua kata kunci entri (`scripts/bnpb/unit/data_prioritas.json`) muncul di judul paket ternormal | hitungan |

Periode dari `frequency` (asumsi, tabel di skrip): harian 1, mingguan 7, bulanan 30, triwulan 91, semester 182, tahunan 365 hari; padanan Inggris (`daily`, `weekly`, `monthly`, `quarterly`, `annual`) sama.

### 7.2 PD-1 Penilaian peringatan terbukti

Kode: `scripts/prediksi/rapor_peringatan.py` (DT §6.6). Masukan: D1 `peringatan` (`migrations/0010_peringatan.sql`: `jenis` ∈ gempa, tsunami, karhutla, banjir, cuaca; `tingkat` ∈ Waspada, Siaga, Awas; `kab` berupa NAMA, bukan kode; `dibuat`, `berlaku_hingga` dalam milidetik; `dicabut`); kejadian dari `logbook_riwayat.json` dan `dibi_kejadian.json`.

Langkah:

1. **Kode kab**: `kab` peringatan dipetakan ke kode lewat §0.4 butir 3; peringatan tanpa kode (kab kosong, atau provinsi saja) tidak dinilai dan dihitung terpisah "tanpa kab".
2. **Episode peringatan**: peringatan dengan (kab, jenis) sama yang jendelanya saling bersinggungan atau berjarak ≤ 24 jam digabung menjadi satu episode p; tingkat episode = tingkat tertinggi; `mulai_p` = `dibuat` terawal, `akhir_p` = `berlaku_hingga` terakhir. Tanpa penggabungan, peringatan tiap jam membuat "palsu" berlipat.
3. **Dicabut**: peringatan dengan `dicabut` tidak null dikeluarkan dari penilaian dan dihitung terpisah (asumsi).
4. **Jenis kejadian**: peta peringatan ke kejadian: banjir ke banjir, banjir bandang, banjir rob; cuaca ke cuaca ekstrem, angin kencang, puting beliung; karhutla ke kebakaran hutan dan lahan; gempa ke gempabumi; tsunami ke tsunami. Tabel peta di skrip.
5. **Pasangan**: hit bila ada kejadian e jenis cocok di kab yang sama dengan tanggal e di [tanggal mulai_p, tanggal akhir_p + 1 hari] (WIB); palsu bila tidak ada; terlewat = kejadian e jenis yang bisa diperingatkan tanpa episode p yang `mulai_p` di [tanggal e - 3 hari, tanggal e].
6. Per jenis x tingkat, per periode 4-bulanan (Januari-April, Mei-Agustus, September-Desember, sesuai `ews_evaluasi`):

`POD = hit / (hit + terlewat)`; `FAR = palsu / (hit + palsu)`.

Ambang data: bila hit + terlewat < 10 atau hit + palsu < 10 untuk sel itu, sel menulis "belum cukup data" dan tidak ikut rata-rata (RU §2.7). Kasus: hit 12, terlewat 4, palsu 20 memberi POD 0,75, FAR 0,625.

Keterbatasan wajib di `title`: logbook dan DIBI bukan daftar kejadian lengkap, sehingga "palsu" cenderung terlalu tinggi dan "terlewat" terlalu rendah; tanpa umpan BPBD (U11) tidak bisa dibedakan "tidak terjadi" dari "tidak tercatat". Label: hitungan. Ini menilai peringatan yang sudah terbit (BMKG, InaTEWS, deteksi sendiri), bukan model kita, jadi tidak ada gerbang lulus; yang dijaga adalah ambang n.

### 7.3 KPOD-1 Rapor intervensi status darurat (IKU Program 3)

Masukan: `status_darurat.json` (SK tanggap darurat; `kab_kode` dihapus titiknya), `laphar_riwayat.json` episode dengan medan `pendampingan` (KPOD-3), meja `dsp` dan `logistik` (kosong dilewati).

Per SK s (kab k, mulai t0):

- `terpantau` = ada episode Laphar di k dengan |mulai_episode - t0| ≤ 3 hari. Jarak 4 hari tidak dipasangkan.
- `didampingi` = `terpantau` dan teks pendampingan episode tidak kosong dan tidak memuat kata tolak `TOLAK = [belum, tidak ada, nihil]` (tidak peka huruf).
- Kelas pendampingan (boleh lebih dari satu): `dsp` `dana siap pakai|\bDSP\b|\bRp`, `logistik` `logistik|sembako|tenda|selimut`, `personel` `\btim\b|\bTRC\b|personel|pendampingan`, `udara` `\bOMC\b|heli|water bombing`.
- `tepat_waktu` = intervensi pertama ≤ `dsp_laporan_kejadian` (3 hari) sesudah t0.

`terpantau_persen = #terpantau / #SK`; `IKU = #didampingi / #SK`, per bulan, per direktorat wilayah (`dit_wilayah.json`), per jenis. Angka LAKIP (resmi, 100%) tampil berdampingan, tidak diganti.

Gerbang tampil:

1. Bila `terpantau_persen < 0,80`, kartu menampilkan "penjodohan wilayah belum cukup" alih-alih IKU (DT §6.13). Contoh RU §2.7 (10 SK, 7 berpasangan, 5 didampingi) memberi terpantau 70% dan IKU 50%, jadi fungsi menghitung 50% tetapi kartu menampilkan pesan penjodohan.
2. Kata kunci diuji pada 50 entri berlabel tangan (`tests/bnpb/fixtures/pendampingan_50.json`): presisi `didampingi` ≥ 0,8 (RU §5.2) dan recall ≥ 0,8 (asumsi). Gagal salah satu: kartu tidak tampil.

Label: hitungan; LAKIP resmi.

### 7.4 REN-1 Rapor Reformasi Birokrasi

Masukan: 22 komponen di `data/kajian-bnpb/pustaka/5-lakip.md`, regex DT §5.11. Per komponen i: `poin_hilang_i = bobot_i - nilai_tertimbang_i`; ditolak saat muat bila nilai tertimbang > bobot atau < 0. `prioritas_i = poin_hilang_i x faktor_i`, faktor 1 (cukup ikut pengukuran: Indeks Kualitas Kebijakan, Indeks Reformasi Hukum), 0,5 (perubahan proses), 0,25 (struktural); pemetaan faktor berlabel "penilaian analis" (asumsi). Kasus RU §2.7: IKK 0 dari 1,5 memberi 1,5; LAPOR 0,6 dari 1,5 memberi 0,9; Sistem Merit 2,78 dari 4 memberi 1,22; Capaian IKU 5,5 dari 7 memberi 1,5. Total poin hilang = Σ bobot - Σ tertimbang. Invarian: 22 komponen terurai, Σ bobot sama dengan yang tertulis. Label: resmi (nilai) dan hitungan (poin hilang, prioritas).

### 7.5 KEU-1 Penguji konsistensi angka

Dijalankan lokal atas `pdftotext -layout` draf (DT §5.13). Empat aturan (riset/6 K1):

| Aturan | Rumus | Tanda |
| --- | --- | --- |
| (a) jumlah | |Σ baris - total| > 0,5 x satuan terkecil yang tercetak | "jumlah tidak sama dengan total" |
| (b) persen | |100 x realisasi / pagu - persen_tertulis| > 0,01 poin | "persen dihitung ulang berbeda", dengan dua basis (pagu total, pagu efektif) bila keduanya ada di dokumen |
| (c) kembar | angka berlabel sama (nama baris ternormal sama) di dua tabel berbeda | "angka sama di dua tabel berbeda" |
| (d) basis | kolom persen tanpa kata "pagu efektif" atau "pagu total" di kepala tabel atau 3 baris di atasnya | "basis tidak disebut" |

Kasus: Biro Keuangan 137,2 dari 143,4 tertulis 72,34% memberi hitung ulang 95,68% (95,6764 sebelum dibulatkan; RU §9 butir 5). Keluaran markdown dengan halaman; tidak ke repo, R2, D1. Label: hitungan.

### 7.6 SDU-1 Rapor tata kelola pengadaan

Masukan: SIRUP penyedia dan swakelola per tahun anggaran (`docs/pendanaan/sirup_tarik.py`). Per tahun:

| Indikator | Rumus |
| --- | --- |
| porsi_triwulan1 | paket dengan bulan pemilihan Januari-Maret / jumlah paket penyedia |
| porsi_epurchasing | pagu metode e-Purchasing / pagu penyedia |
| porsi_PDN, porsi_UMK | pagu paket `isPDN` (atau `isUMK`) benar / pagu penyedia |
| porsi_PenL | pagu metode Penunjukan Langsung / pagu penyedia |
| kandidat konsolidasi | kelompok nama paket ternormal (huruf kecil; buang angka, nama bulan, nama wilayah dari `wilayah.json`, tanda baca; spasi tunggal) dengan ≥ 3 paket PL atau PenL dalam setahun DAN Σ pagu kelompok > ambang PL |

Ambang PL: dari Perpres PBJ yang berlaku, dicatat sebagai entri Jam Aturan dengan acuannya; sampai dicek, kolom kandidat konsolidasi berlabel asumsi (DT §6.26). Kasus: fixture SIRUP 2025 beku memberi porsi e-Purchasing 43,2% (reproduksi riset/6, sha256 dicatat). Keluaran agregat, tanpa nama penyedia (G-5). Kata "pemecahan paket" dilarang di keluaran. Label: resmi (SIRUP) dan hitungan.

### 7.7 IRT-1 Umur rekomendasi TLHP

Skrip lokal (U9). Per rekomendasi: `umur = hari ini - tgl_lhp_diterima` (hari kalender). Merah bila umur > `tlhp` (60) dan status ≠ "sesuai" (61 merah, 60 tidak, 200 sesuai tidak). Calon TPTD bila umur > 2 tahun DAN ringkasan memuat kata kunci kriteria TPTD (`unit sudah tidak ada`, `pailit`, `meninggal`), berlabel "saran". `%TL_unit = #sesuai / (#total - #TPTD)`; penyebut 0 memberi `null`. Pembanding target Renstra (75% BPK, 46% sampai 70% APIP). Catatan pasal: 60 hari di `pedoman-1-2025` tertulis untuk rekomendasi BPK; pemakaiannya untuk rekomendasi APIP adalah tafsir (asumsi) sampai pasal APIP ditemukan.

### 7.8 OJL-3 Rapor Klaster Logistik

Masukan: INALOGPAL `get_progress`, `get_count_cluster_all`, `get_count_cluster_sk_all`; beban kejadian per provinsi = Σ kejadian `dibi_kab_tahun.json` 5 tahun terakhir lengkap. Per provinsi: `sk` (ada atau tidak), capaian pra, darurat, pasca (persen dari API, resmi), `hari_sejak_mutakhir`, `beban`. Merah bila beban di sepertiga teratas nasional (persentil ≥ 2/3, §0.6) DAN (capaian maksimum < 25% atau tanpa SK) (RU §2.7: Aceh 11,87% ber-SK beban teratas merah; Banten 0% merah bila bebannya sepertiga teratas). Basi pemutakhiran bila hari_sejak_mutakhir > `klaster_logistik_mutakhir`. Ambang 25% asumsi (riset/4 O3).

### 7.9 PSPB-3 Indikator Sendai

Per kab k dan tahun t, penduduk P_k = `terpapar.json n` tahun terakhir untuk semua tahun (berlabel "penduduk 2026 untuk semua tahun"):

- `A1_kt = (meninggal_hilang_kt) / P_k x 100.000`; nilai tampil = rata-rata bergulir 10 tahun (t-9 sampai t); kurang dari 10 tahun data: rata-rata yang ada dengan jumlah tahunnya di `title`.
- `B1_kt = terdampak_kt / P_k x 100.000` (definisi terdampak DIBI berbeda dari UNDRR; di `title` kolom).
- C-1 dari PERB-2 (kosong bila PERB-2 "belum layak").
- E-1/E-2 dari PSPB-1: persen pemda dengan RPBD `berlaku` atau `sesuai_3_2026`.

Nasional: Σ korban / Σ penduduk, bukan rata-rata rasio kab. P = 0 memberi `null`. Label: hitungan.

---

## 8. MB-7 Penerima dokumen dan pengurai

Kode: `scripts/bnpb/unit/terima.py` (DT §4.7). Tiap usulan baris: `id = sha1(jenis + sumber_url + kunci_baris)[:16]`, `label` (resmi atau sekunder), `keyakinan` (`pola_tetap` atau `pola_longgar`), `isi`, `sumber`.

### 8.1 Tingkat keyakinan dan aturan tampil

| Keyakinan | Pengurai | Tampil sebelum ketuk staf? |
| --- | --- | --- |
| `pola_tetap`, sumber resmi | Laphar lewat `public/laporan_urai.js` `urai()`; pesan WA `#pengungsian` | ya, berpil "belum dikonfirmasi", bila tidak ragu (§8.2) |
| `pola_tetap`, ragu | sama, tetapi kena salah satu syarat ragu | tidak; masuk antrean ketuk |
| `pola_longgar` | regex berita (RRP-2, RRI-1 dari WA bebas) | tidak pernah; hanya sesudah `terima` |

### 8.2 Syarat ragu (baris `pola_tetap` turun ke antrean)

1. `hasil.lewat` pengurai memuat pesan untuk entri itu (contoh "provinsi kosong untuk: ...", `laporan_urai.js`).
2. Kode kab tidak bisa ditentukan pasti (§0.4).
3. Angka di luar batas masuk akal: jiwa mengungsi > penduduk kab `n`; rumah rusak > bangunan kab; angka negatif.
4. Angka hari ini turun lebih dari 50% dari angka kemarin untuk kunci yang sama tanpa kata "pemutakhiran" atau "pengkinian" (ambang asumsi; menangkap salah urai kolom).

### 8.3 Laphar (KPOD-3)

Bentuk dikenali `RE_BENTUK_LAPHAR` (`laporan_urai.js:462`); bagian A dibaca per entri (`RE_ENTRI_LAPHAR`, medan `➢ Label:`), bagian I tabel SK dengan koordinat (`uraiSkDarurat`, butuh `pdftotext -layout`). Medan baru `pendampingan` diambil dari medan "Pendampingan BNPB" dan disimpan sebagai kelas kata kunci §7.3, bukan teks penuh. Ukuran berhasil mesin: `cakupan.sampai` tertinggal ≤ 1 hari.

### 8.4 Pesan WA pengungsian (WIL-2, hanya bila U11)

Tata bahasa (tidak peka huruf, spasi bebas):

```
#pengungsian <nama tempat> KK <n> L0-11b <n> P0-11b <n> L12-59b <n> P12-59b <n> L5-12 <n> P5-12 <n>
             L13-17 <n> P13-17 <n> L18-59 <n> P18-59 <n> L60 <n> P60 <n> [hamil <n>] [menyusui <n>] [disabilitas <n>] [terpisah <n>]
```

`<nama tempat>` = teks antara `#pengungsian` dan kunci pertama, 2-80 huruf. `<n>` = bilangan bulat ≥ 0 (titik ribuan diterima). Wajib: KK dan 12 kunci jiwa; kurang satu: pesan masuk antrean periksa, tidak ditebak. Kunci rentan opsional; yang tidak ada disimpan 0 oleh DEFAULT tabel dan baris membawa tanda "rentan tidak dilaporkan" di rekap. Nama tempat dicocokkan ke `pengungsian_tempat` kab pengirim dengan `lower(nama)`; tidak cocok: usulan tempat baru di antrean.

### 8.5 Berita pemulihan (RRP-2)

Kalimat = potongan teks dibatasi `. `, `;`, atau baris baru.

- Angka: `(?P<n>\d{1,3}(?:\.\d{3})+|\d+)`.
- Hunian: `<n>\s+(?:unit\s+)?(?P<jenis>huntara|huntap|hunian sementara|hunian tetap)`.
- Penerima: `<n>\s+(?P<s>kk|kepala keluarga|rekening)` dengan kata `dana tunggu hunian|\bdth\b|stimulan` di kalimat yang sama.
- Tahap (60 huruf sebelum angka): `selesai|rampung|terbangun|tersalur|diterima|cair` = `selesai`; `dibangun|proses|berjalan|pengerjaan` = `berjalan`; `usulan|diusulkan|direncanakan|target|akan` = `usulan`; tidak ada: `tahap = null`.
- Kab: nama kab dari `wilayah.json` di kalimat yang sama; nol atau lebih dari satu kab: `kab = null`.

Baris dengan `tahap = null` atau `kab = null` tetap jadi usulan tetapi ditandai "lengkapi saat ketuk". Ambang yakin sebelum fitur tayang: presisi ≥ 0,8 pada 30 artikel berlabel tangan (`tests/bnpb/fixtures/pemulihan_30.json`; ambang asumsi, sama dengan KPOD-1). Presisi = baris benar (angka, jenis, tahap, kab semuanya cocok label) / baris diusulkan.

### 8.6 Laporan akses (RRI-1, hanya usulan)

Pola WA: `(jembatan|jalan)\s+(?P<nama>.{2,60}?)\s+(sudah\s+)?(dibuka|bisa dilalui|pulih|putus|tertutup|darurat)`; kata status dipetakan `dibuka|bisa dilalui|pulih` ke `pulih`, `putus|tertutup` ke `putus`, `darurat` ke `darurat`. Cocok ke titik `akses_putus.json` bila nama ternormal sama dan desa sama; selain itu usulan tanpa titik. Selalu `pola_longgar`.

### 8.7 Gabung keputusan

`gabung(usulan, keputusan)`: keputusan terbaru per `usulan_id` menang (`unit_ketuk.waktu`); `dikoreksi` menimpa hanya medan yang dikoreksi; usulan yang `id`-nya tidak muncul lagi di panen berikut tetap disimpan dengan keputusan terakhirnya. Usulan diulang dengan kunci sama idempoten (RU §4 MB-7).

---

## 9. MB-8 Panen sumber resmi terbuka

Tanpa rumus angka; aturan yang memengaruhi angka:

1. Tiap keluaran membawa `sumber: [{nama, url, diambil, lisensi}]` (DT §4.8).
2. ArcGIS: `returnGeometry=false` dan `outFields` daftar putih, tidak pernah `*` (G-5; RU §9 butir 10).
3. Bentuk sumber berubah (kunci hilang, tipe berbeda): skrip keluar bukan 0 dan berkas lama dipertahankan dengan tanggalnya. Angka dari berkas lama tampil dengan pil basi (§0.8).
4. Jeda 1 detik, coba ulang 3 kali (2, 4, 8 detik), cache 20 jam.

---

## 10. Sistem F1 dan F2

Sistem yang rumusnya sudah tuntas di §2-§8 hanya dirujuk. Tiap baris "Masukan" menyebut path; semua sudah diperiksa ada di repo kecuali yang ditandai "belum ada".

### 10.1 PERB-1 Pemilih daerah pendampingan IKD (F1)

Masukan: `public/data/bnpb/risiko_hvc.json` (`kab[k].H` per jenis, `v`), `ikd.json` (`kab[k].c`, proksi), `iku.json` (IKD provinsi Lampiran 2), koordinat pusat kab `public/data/kemitraan/kode.json` `pusat`.

| Simbol | Arti | Satuan |
| --- | --- | --- |
| H_k | maks_j H_kj (agregasi lintas jenis = asumsi dokumen DT §5.1) | indeks 0-1 |
| V_k | `v` | indeks 0-1 |
| C_k | `c` (raster, proksi IKD) | indeks 0-1 |
| d_k | 0,40 - C_k bila C_k < 0,40; 0,80 - C_k bila 0,40 ≤ C_k < 0,80; tidak ada bila C_k ≥ 0,80 | indeks |
| n_k | 1/514 (agregasi IRB rata-rata sederhana, asumsi riset/1 pertanyaan 3) | - |

`R_k(C) = (H_k x V_k x (1 - C))^(1/3)` (Buku RBI hal. 53, riset/1 §1.5).
`manfaat_k = n_k x [R_k(C_k) - R_k(C_k + d_k)]`.
`biaya_k` = jarak garis lurus (haversine, km) pusat kab ke Jakarta (-6,1754; 106,8272).
Urut menurun `manfaat_k / biaya_k`. Kolom `naik_iku2` = benar bila C_k < 0,40 ≤ C_k + d_k dan IKD provinsi k di Lampiran 2 < 0,40 (kolom, bukan bonus angka).

Kelas (`ikd_ambang_kelas`, asumsi): rendah C < 0,40; sedang 0,40 ≤ C < 0,80; tinggi C ≥ 0,80. Ambang ini berbeda dengan `ikd.json` `kelas_ambang` (0,33 dan 0,66) yang dipakai untuk raster; kartu PERB-1 memakai 0,40 dan 0,80 dan menyebut bedanya di `title`.

Kasus E1-E5 (RU §2.4), ditambah nilai E4 yang di RU kosong:

| Kasus | C | d | R(C) | R(C + d) | manfaat |
| --- | --- | --- | --- | --- | --- |
| E1 | 0,35 | 0,05 | 0,67824 | 0,66039 | 0,00003474 |
| E2 | 0,78 | 0,02 | 0,47267 | 0,45789 | 0,00002876 |
| E3 | 0,10 | 0,30 | 0,75595 | 0,66039 | 0,00018593 |
| E4 | 0,40 | 0,40 | 0,66039 | 0,45789 | 0,00039397 |
| E5 | 0,85 | - | - | - | tidak masuk daftar, "sudah kelas tinggi" |

(H = 0,8, V = 0,6 semua kasus.) Kasus tepi: H atau V = 0 memberi manfaat 0 (kab tetap tampil di urutan terbawah); C kosong: baris "kapasitas belum ada", tidak diurutkan. Label: proksi + hitungan, "bukan IRB resmi". Uji balik: §12.

### 10.2 PERB-2 Kerugian ekonomi langsung (F2)

`kerugian_kt = Σ_jenis (RB x c_RB + RS x c_RS + RR x c_RR)`, c dari `tarif_stimulan_juta` (riset/1 pertanyaan 2), dalam juta rupiah. `proporsi_t = Σ_k kerugian_kt / PDB_t` (PDB BPS, `scripts/bnpb/bps.py`). Masukan: RB, RS, RR per kab-tahun; `dibi_kab_tahun.json` hanya punya `rumah_rusak_berat`, dan `dibi_kejadian.json` hanya 365 hari terakhir (2025-10-28 sampai 2026-10-28), jadi kolom rusak sedang dan ringan per tahun harus ditambah di `scripts/banjir/kejadian.py` (pemilik `banjir`) sebelum tahun 2025 bisa dihitung. Label: hitungan, "batas bawah: hanya rumah". Gerbang: §12.

### 10.3 PSPB-1 Register RPBD (F2)

Seluruhnya MB-3 §4.5. Penyebut 552 = 514 + 38.

### 10.4 PSPB-3 Sendai (F2)

§7.9.

### 10.5 SPB-1 Peta NSPK (F2)

Per dokumen d berstatus efektif BERLAKU (§2.3): fase ∈ {pra, darurat, pasca} dan jenis bencana dari kamus kata kunci judul dan subjek (di `scripts/bnpb/unit/spb1.py`; contoh: `pencegahan|mitigasi|kesiapsiagaan|peringatan dini|kontinjensi` pra; `tanggap darurat|siap pakai|pengungsi|kaji cepat|status keadaan darurat` darurat; `rehabilitasi|rekonstruksi|pascabencana|r3p|jitupasna` pasca). Dokumen tanpa kata fase: kolom "umum". Satu dokumen boleh masuk lebih dari satu sel. Sel = jumlah dokumen. Target Renstra Lampiran III `terbit` bila ada dokumen BERLAKU yang judulnya memuat semua kata kunci target dan `tahun ≥ tahun_target - 1`. Dokumen di `konflik` tidak dihitung. Koreksi fase lewat `unit_ketuk` `usulan_nspk`. Label: hitungan.

### 10.6 PUS-1 (F1)

§7.1.

### 10.7 PUS-2 KIB usulan dan pencocok DIBI (F2)

`kib(prov, kab, jenis, tanggal, indeks)` = prov (2 digit) + 2 digit terakhir kode kab + kode bencana (3 digit) + `YYYYMMDD` + indeks (1 digit, 1-9 untuk kejadian sejenis di kab dan hari yang sama, urut waktu catat). Kode bencana (Juknis 7/2023): banjir 101, longsor 102, cuaca 104, kekeringan 105, karhutla 106, gempabumi 107, gunungapi 109, kebakaran permukiman 202, konflik sosial 301; jenis lain tanpa kode: `kib = null`, tidak dikarang. Kasus tetap: banjir Kab. Bogor 19 September 2023 = `3201101202309191`. Indeks ke-10 dan seterusnya: `null` dengan alasan.

Ambang masuk (Juknis 7/2023): kejadian memenuhi minimal satu: meninggal ≥ 1, terdampak atau luka atau mengungsi ≥ 50 orang, rumah atau fasilitas rusak ≥ 5, lahan ≥ 1 ha, permintaan bantuan nasional, penetapan status. Cocok DIBI bila 15 digit pertama sama (prov, kab, jenis, tanggal) dengan toleransi tanggal ±2 hari: untuk kejadian logbook L dan DIBI D, cocok bila prov, kab, jenis sama dan |tanggal_L - tanggal_D| ≤ 2. Satu D hanya dipasangkan ke satu L (terdekat tanggalnya; seri: indeks terkecil). Tiga daftar: cocok; logbook tanpa DIBI dan hari ini - tanggal_L > 7; DIBI tanpa logbook. Label: "KIB usulan", tidak pernah "KIB resmi".

### 10.8 PD-1 (F2)

§7.2.

### 10.9 PD-2 Cakupan layanan peringatan dini (F2)

Masukan: per desa: titik pusat, penduduk, kelas bahaya. Data per desa ini ADA di cache `scripts/bnpb/terpapar.py` (Dukcapil `returnCentroid`) tetapi TIDAK di berkas publik: `terpapar.json` hanya agregat kab, dan `public/data/bnpb/desa/*.json` hanya daftar nama desa per kecamatan tanpa koordinat (diperiksa). PD-2 butuh `terpapar.py` menulis keluaran per desa ke R2 `unit/desa_terpapar.json` (pemilik `ruang-bnpb`). Instrumen: OSM `emergency=siren` (tag belum dipanen; tambahan di `scripts/scrape/tarik_osm.py`, pemilik `pipa-data`), D1 `sensor` (0089).

- `terlayani(desa) = jarak_haversine(pusat desa, instrumen terdekat) ≤ ews_radius_sirine_km` (2 km, hipotesis).
- `cakupan_kb = Σ penduduk desa terpapar tinggi bahaya b di kab k yang terlayani / Σ penduduk desa terpapar tinggi b di k`; penyebut 0 memberi `null`.
- Nasional = rasio jumlah, dibandingkan 6% Renstra; selisih ditulis.
- Prioritas paket: MB-4 §5.5.

Label: proksi, "batas bawah dari OSM"; radius berpil asumsi.

### 10.10 PD-3 Pesan peringatan berstandar (F1)

Tepat enam baris berurutan (Perban 2/2024 Pasal 20 ayat (2)): (1) jenis potensi bencana termasuk turunannya; (2) tingkatan: Waspada, Siaga, Awas, dengan warna Pasal 20 ayat (4); (3) daya rusak = kelas bahaya InaRISK (rendah < 0,33, sedang 0,33-0,66, tinggi > 0,66, ambang `terpapar.json` `ambang`) di kab terdampak; (4) potensi jiwa terpapar = `h[b][0]` (sedang ke atas) kab; (5) prakiraan waktu = `dibuat` sampai `berlaku_hingga` peringatan dalam WIB; (6) sumber daya = stok dan desa langganan terisolir dari `siaga.json`. Unsur tanpa data: "belum ada data". Pesan kurang dari 6 baris ditolak uji. Tidak ada kirim otomatis ke warga (Perban 4/2022 Pasal 7). Label: resmi (peringatan) dan hitungan (jiwa terpapar).

### 10.11 KS-1 Dokumen kesiapsiagaan (F2)

MB-3 §4.5 dan §3.3. Pembanding kartu: IKK 4,27% (resmi, Renstra). Label: sekunder, "batas bawah".

### 10.12 KS-3 Kesenjangan lokasi evakuasi (F2)

Untuk desa terpapar tinggi bahaya b (data per desa seperti PD-2):

- Kandidat: titik OSM `titik_kumpul`, `sekolah`, `pemerintahan` dari `public/data/osm_nasional/<prov>.json` (format `[lat, lon, nama]`). `ibadah_n` TIDAK bisa dipakai: kunci itu berisi jumlah, bukan titik (diperiksa: `ibadah_n: 1582` di `11.json`), jadi DT §6.9 perlu dibetulkan.
- Kandidat di luar zona bila indeks bahaya b di titik kandidat ≤ 0,66 (ambang tinggi `terpapar.json`). Ini butuh pengambilan indeks InaRISK per titik kandidat (pola `terpapar.py`), belum ada.
- `jarak_min(desa) = min haversine(pusat desa, kandidat di luar zona)`; `kurang` bila jarak_min > `evakuasi_jarak_km[b]`.
- Tsunami: `terpapar.py` `LAPISAN` belum memuat lapisan tsunami (hanya banjir, longsor, karhutla, kekeringan, gempa), jadi bahaya tsunami di KS-3 menunggu lapisan itu ditambah.
- Cakupan OSM per kab = jumlah kandidat per 10.000 penduduk, tampil supaya kab dengan OSM tipis terbaca.

Kandidat tidak pernah disebut "lokasi evakuasi resmi". Label: proksi, jarak berpil asumsi.

### 10.13 KS-4 Kalender gladi (F1)

Per kab k: `bulan_awal` = bulan pertama musim bahaya utama di `siaga.json` (bahaya utama = jenis dengan R tertinggi di `risiko_hvc.json kab[k].R`); `bulan_gladi = {bulan_awal - 2, bulan_awal - 1}` modulo 12, dengan tahun mundur bila melewati Januari (RU §2.7: musim November memberi September dan Oktober; Januari memberi November dan Desember tahun sebelumnya). Skenario strategis = kejadian DIBI terburuk kab untuk jenis itu, urut meninggal_hilang, lalu mengungsi, lalu rumah_rusak_berat (Perban 2/2023 lampiran). Kab tanpa musim di `siaga.json`: tanpa saran. Label: hitungan.

### 10.14 MT-1 Pra-telaah Dana Bersama (F2*)

- Skor prioritas usulan = 1 (sesuai RPB/RKPD, dicentang pemohon dengan tautan; pra-isi dari PSPB-1 status `berlaku`) + 1 (kab di kuartil atas `risiko` MB-4 §5.4, berlabel "bukan IRBI resmi") + 1 (kegiatan termasuk subkegiatan SPM). Nilai 0-3.
- Kelas ESMS = kelas tertulis untuk kode kegiatan 02.01.01-02.01.11 di Lampiran I Juklak 4/2025.
- `RAB = Σ komponen volume x harga_satuan`; tanda bila harga_satuan > standar komponen Juklak 2/2026 untuk komponen itu; komponen tanpa padanan di standar: "tanpa standar".
- Ditolak bila usulan memuat lebih dari satu keluaran (Juklak 4/2025 Bab III C).

Label: hitungan; "alat bantu, bukan kanal pengajuan".

### 10.15 MT-2 Prioritas mitigasi (F2)

MB-4 §5.5. Paket kegiatan per kab dari `scripts/bnpb/unit/mitigasi_peta.json`: banjir ke 02.01.09 dan 02.01.07; longsor ke 02.01.10, ditambah 02.01.11 bila desa kelas tinggi berulang (kejadian longsor DIBI di kab ≥ 2 tahun dari 5); abrasi ke 02.01.07. Tiap kab 1-3 kegiatan, urut persentil bahaya terkait. Kegiatan tanpa kode ditolak.

### 10.16 MT-3 Kalender kampanye (F2)

Kab k masuk paket bulan m bila `bulan_awal` musim bahaya b di `siaga.json` ∈ {m + 1, m + 2}. Isi: pesan tindakan bahaya b (`public/ews_tindakan.js`), 10 desa terpapar terbesar (butuh data per desa, §10.9), `porsi_rentan = h[b][3] / h[b][2]` (penyebut 0: `null`). Saluran "tatap muka" bila porsi_rentan > median nasional porsi_rentan untuk b (asumsi). Porsi lansia dan balita terpisah belum bisa: `terpapar.json` menyimpan rentan gabungan.

### 10.17 KPOD-1 (F2)

§7.3.

### 10.18 KPOD-2 Jam Aturan (F1)

§3. Judul kartu "N tenggat berpasal, M asumsi" dihitung dari `ATURAN` (N = entri `asumsi: false`).

### 10.19 KPOD-3 Laphar otomatis (F1)

§8.3.

### 10.20 WIL-1 Meja Wilayah (F2)

Direktorat per provinsi dari `public/data/bnpb/dit_wilayah.json` (Perban 11/2025 Pasal 74, 77, 79A; tiap provinsi tepat satu direktorat). Antrean per direktorat, tipe berurutan (riset/3 W1):

| Tipe | Syarat | Tenggat |
| --- | --- | --- |
| 1 | episode Laphar `berjalan` dengan meninggal > 0 atau mengungsi_jiwa ≥ 1.000, dan teks pendampingan kosong atau kata tolak §7.3 | - |
| 2 | SK aktif dengan `berakhir - hari ini ≤ 2` hari dan episode masih `berjalan` | `berakhir` SK |
| 3 | saran Tanggap Darurat (`saran_status.json`) tanpa SK selama > `dsp_laporan_kejadian` (3 hari) | saran + 3 hari |
| 4 | SK berakhir, DSP cair, SPJ belum | `tenggat(dsp_spj, berakhir)` |
| 5 | prakiraan `/prediksi` +1..+3 tingkat tinggi di kab berstatus Siaga | tanggal prakiraan |

Dalam satu tipe: tenggat terdekat dulu, lalu mengungsi_jiwa menurun, lalu kode wilayah. Tiap butir membawa satu kalimat alasan dan sumber; butir tanpa sumber ditolak. Ambang 1.000 jiwa dan 2 hari adalah asumsi (riset/3 W1). Label sesuai sumber butir.

### 10.21 WIL-2 (F2*)

§6.3 dan §8.4.

### 10.22 WIL-3 Draf kaji cepat (F2)

- Cakupan wilayah: kec dan desa dari laporan warga dan sinyal (`terpapar.json` untuk penduduk terpapar kab, data per desa bila §10.9 sudah ada).
- Rekomendasi status (aturan `scripts/umum/saran_status.py`): Siaga bila hanya sinyal; Tanggap bila ada dampak terverifikasi; gempa tidak pernah Siaga.
- Perkiraan masa = median (berakhir - mulai) SK sejenis (jenis dan status sama) di provinsi itu 5 tahun terakhir dari `status_darurat.json`; kurang dari 3 SK: median nasional jenis itu, berlabel.
- Tenggat laporan dari `kaji_mulai`, `kaji_awal`, `kaji_lanjutan`.

Label: "saran"; yang menetapkan kepala daerah.

### 10.23 PLP-1 (F1)

§6.2.

### 10.24 PLP-2 Daftar pendek hibah logpal (F2)

MB-4 §5.5. Celah peralatan per provinsi = 1 - min(ada / standar, 1) dirata-rata atas jenis peralatan di `standar_peralatan_2009.json` yang punya standar; tanpa inventaris: komponen tidak ada (bukan 0). Kelompok tujuh kriteria Juklak 3/2024 ke komponen: kelembagaan BPBD ke celah kapasitas; Indeks Risiko Bencana ke risiko; karakteristik wilayah dan jenis ancaman ke kejadian 5 tahun; anggaran dan SDM penerima ke celah stok dan celah peralatan; program prioritas nasional dan analisis strategis tidak diskor. Pemetaan ini penilaian analis (asumsi).

### 10.25 PLP-3 Pasca-hibah (F2)

Per baris `hibah_bast`: `jatuh_tempo = tenggat(hibah_logpal_lapor, tgl_bast)` (12 bulan, asumsi). Status: hijau bila `tgl_lapor` ada; kuning bila belum dan jatuh_tempo - hari ini ≤ 90 hari; merah bila belum dan hari ini > jatuh_tempo. Kedaluwarsa barang: kuning ≤ 90 hari, merah ≤ 30 hari sebelum tanggal kedaluwarsa (`hibah_kedaluwarsa_hari`). Kasus: BAST 2025-11-30 jatuh tempo 2026-11-30, hari ini kuning (sisa 25 hari).

### 10.26 OJL-2 Penempatan stok (F2)

Musiman, per gudang g dan bulan m: `target_stok(g, m) = Σ_{k dilayani g} beras_pr1(k) x [m ∈ musim(k)]` (beras PLP-1 skenario PR 1%; musim dari `kalender_operasi.json`). Kab dilayani gudang terdekat garis lurus (tanpa OJL-1; berlabel "tanpa graf jalan"). `saran_pindah = target - stok` per gudang; gudang tanpa stok tercatat: "stok belum dilaporkan", tidak disarankan pindah.

Jelang kejadian, harian: untuk kab k dengan prakiraan `/prediksi` tingkat tinggi +1..+3 DAN jarak ke gudang terdekat > ambang setara 24 jam (bawaan 400 km garis lurus, asumsi, dengan kecepatan efektif 17 km/jam yang tidak berpasal), saran "kirim paket 72 jam untuk N jiwa", `N = min(stok_pr_umum x JP_k, maks_b h[b][2])`. Tiap saran mencatat pemicunya (tanggal prakiraan, tingkat, jarak). Urutan bila banyak: MB-4 §5.5. Gerbang: §12.

### 10.27 OJL-3 (F2)

§7.8.

### 10.28 RRX-1 Jam pascabencana (F1)

Masukan: `status_darurat.json` `sk[]` (`kab_kode` tanpa titik, `jenis`, `status`, `mulai`, `berakhir`, `nomor`), `dibi_kejadian.json`, meja `rehab` (`tgl_r3p`).

1. Hanya SK `status = "Tanggap Darurat"` memulai jam; `Siaga Darurat` dan `Transisi Darurat ke Pemulihan` tidak (X7).
2. Gabung: SK s2 masuk kejadian s1 bila kab dan jenis sama dan `mulai_s2 - berakhir_s1 ≤ sk_gabung_hari` (14). Jeda 6 hari digabung (X1), 15 hari dipisah (X2). `berakhir` kosong dianggap hari ini. Lintas jenis tidak pernah digabung.
3. `hari0` = `mulai` SK pertama; `berjalan = hari ini - hari0`; `sisa = 90 - berjalan`.
4. Kelas: `selesai` bila `tgl_r3p` tercatat (X6); `hijau` sisa > 30; `kuning` 1 ≤ sisa ≤ 30; `merah` sisa ≤ 0. Batas: sisa 0 merah (X5).
5. Dampak dalam rentang [hari0, berakhir terakhir]: RB, RS, RR, jembatan dari `dibi_kejadian.json` (`rr_berat`, `rr_sedang`, `rr_ringan`, `jembatan`) kab itu.
6. `layak` bila RB + RS ≥ `r3p_layak_rumah` (100) atau jembatan ≥ 1 (X8: 40 + 70 = 110 layak; X9: jembatan 1 layak).
7. `beban_juta = RB x 60 + RS x 30 + RR x 15` (X8: Rp7.500 juta). Urutan: kelas (merah, kuning, hijau), lalu beban menurun.
8. `kejadian_ref` = nomor SK pertama; tiap jam menampilkan semua nomor SK sumbernya.

Kasus X1-X9 (RU §2.6). Batas data: `dibi_kejadian.json` hanya 365 hari, jadi kejadian dengan hari0 lebih tua kehilangan dampak dan berlabel "dampak di luar jendela DIBI". Label: resmi (SK) dan hitungan (sisa, beban).

### 10.29 RRP-1 (F2)

§6.4.

### 10.30 RRP-2 (F2)

§8.5.

### 10.31 RRP-3 Kalkulator Jitupasna permukiman (F1)

Perka 15/2011 hlm. 40, 41, 47. Per t ∈ {RB, RS, RR}:

- `kerusakan = Σ_t unit_t x harga_t` (harga kerusakan per unit, isian staf).
- `kebutuhan_dasar = Σ_t unit_t x satuan_t`; `kebutuhan = kebutuhan_dasar x IKK / 100`, IKK = IKK BPS kab dari `unit/ikk.json`; kosong: IKK provinsi berlabel "IKK provinsi" (J4); keduanya kosong: `kebutuhan = null` dengan alasan, kerusakan tetap terhitung (J5).
- `periksa_ganda` bila huntap + stimulan_RB > RB_terverifikasi (J2: 50 + 90 = 140 > 120 bertanda; J3: 30 + 90 = 120 tanpa tanda).
- Unit wajib bilangan bulat ≥ 0; ditolak sebelum hitung (J6).

Kasus J1: kerusakan Rp60.500 juta, kebutuhan dasar Rp28.200 juta, kebutuhan berindeks (IKK 112,5) Rp31.725 juta. Invarian: linear terhadap unit. Label: hitungan; satuan biaya tarif berpil asumsi.

### 10.32 RRI-1 Akses putus (F2)

- Satukan titik dari beberapa sumber bila jarak ≤ 200 m dan nama desa ternormal sama; id = `sha1(sumber, objectid)[:16]` dari titik pertama.
- Kelas pemilik dari ruas OSM terdekat ≤ 50 m: `trunk`/`primary` atau `ref` nasional ke nasional; `secondary` ke provinsi; lainnya ke kab/desa; > 50 m: "tidak diketahui". Label estimasi.
- `umur_putus = hari ini - dt`; status terbaru dari D1 `akses_status`, bawaan `putus`; status hanya `putus`, `darurat`, `pulih`.
- Tanda "aset desa: tidak bisa hibah RR (Perban 4/2024 Pasal 5 huruf e)" bila kelas kab/desa dan ruasnya bukan jalan kabupaten bernomor (`ref` kosong).

### 10.33 RRS-1 Kerugian pertanian (F2)

`kerugian_rp = A x P x Y x G`:

| Simbol | Arti | Satuan | Sumber |
| --- | --- | --- | --- |
| A | luas sawah tergenang ≥ 7 hari (irisan poligon genangan modul banjir dan kelas cropland ESA WorldCover) | ha | `public/banjir/data/`, WorldCover (belum dipanen) |
| P | peluang puso bila tergenang ≥ 7 hari | pecahan | kalibrasi dari `public/data/bnpb/puso.json` |
| Y | produktivitas padi kab | ton per ha | BPS (`BPS_KEY`) |
| G | harga GKP | rupiah per ton | BPS |

Kalibrasi P (per provinsi bila n kab-tahun ≥ 10, selain itu nasional): P = Σ luas puso / Σ A atas kab-tahun latih. `puso.json` bolong per provinsi; sel kosong adalah hilang, bukan 0 (catatan berkas itu). Gerbang: §12. Tanpa lulus: kartu hanya luas tergenang (ha), tanpa rupiah.

### 10.34 RRS-3 Fasilitas sosial rusak (F1)

Fasilitas f dari `osm_nasional/<prov>.json` kunci `sekolah`, `puskesmas`, `rs`, `klinik` (titik; `ibadah_n` hanya jumlah, tidak dipakai, DT §5.10 perlu dibetulkan). f di dalam jejak bila titiknya di dalam poligon kejadian banjir aktif (`public/banjir/data/kejadian_aktif_geo.json`), atau di sel MMI ≥ VII (`public/gempa/data/model_guncangan.json`), atau ≤ 500 m dari titik longsor (`public/longsor/data/kejadian.json`; jarak asumsi). Tanda pendataan bila |#sekolah di jejak - `f_pendidikan` DIBI kab| > 0 (tampil selisihnya, bukan koreksi). Label: proksi, "cakupan OSM, batas bawah".

### 10.35 REN-1 (F1)

§7.4.

### 10.36 REN-2 Belanja lawan risiko (F2)

Per kab k: `pangsa_belanja_k = pagu_k / Σ pagu berlokasi kab` (paket berlokasi pusat atau "Jakarta" karena kantor pusat dikeluarkan dan dilaporkan sebagai porsi "tak berlokasi"); `kebutuhan_k = risiko_k x (1 - c_k)` dengan risiko = jiwa terpapar tinggi maks bahaya (§5.4); `pangsa_kebutuhan_k = kebutuhan_k / Σ kebutuhan`; `rasio_k = pangsa_belanja_k / pangsa_kebutuhan_k`; `kurang dilayani` bila k di 20% teratas kebutuhan dan rasio < 0,5 (asumsi, riset/6 P2). Paket berlokasi banyak kab: pagu dibagi rata ke kab yang disebut (asumsi). DSP tidak masuk RUP, dicatat. Label: resmi (SIRUP) dan hitungan; "RUP adalah rencana".

### 10.37 REN-3 Kalender monev (F1)

Semua entri MB-2 berulang (§3.2 aturan berulang), 12 bulan ke depan. Tenggat yang bergantung peristiwa yang tidak ada di sistem (TLHP sejak LHP) tampil sebagai aturan.

### 10.38 KEU-1 (F1)

§7.5.

### 10.39 SDU-1 (F2)

§7.6.

### 10.40 HUK-1 (F1) dan HUK-2 (F2)

§2.3 dan §2.4.

### 10.41 IRT-1 (F2)

§7.7.

### 10.42 DIK-1 Sasaran diklat (F2)

MB-4 §5.5. Pemilihan: urut S menurun; tambahkan kab sampai `terlayani / sasaran ≥ 0,78` (target Renstra 2026), dengan `sasaran` = kab dengan kebutuhan (S tanpa celah layanan) di 50% teratas, dan kab dihitung terlayani bila punya ≥ 1 angkatan dalam 5 tahun (definisi bawaan riset/6 pertanyaan 6, asumsi). Perkiraan angkatan = jumlah kab terpilih yang belum terlayani. Label: hitungan, proksi (kapasitas raster).

### 10.43 DIK-4 Bank pengajar (F2)

Skor = BM25 pencocok `scripts/kemitraan/**` (rumus di `data/kajian-bnpb/kampus/ALGORITMA.md`, tidak disalin) antara deskripsi mata pelatihan dan profil pakar. Lima calon teratas per mata pelatihan sesudah daftar pengecualian `/direktori` diterapkan. Label: hitungan, "calon".

### 10.44 JF-1 Kamus kompetensi (F1)

Pengurai: kode `PB\.(\d{2})` di segmen `perban-5-2024`; tiap kode memuat nama, definisi, jenis (umum atau khusus), level 1-5 dengan indikator. Invarian: jumlah kode terurai = jumlah kode unik yang ditemukan regex di teks (58 dicetak sebagai pembanding, RU §5.1); tiap kode tepat 5 level. Pemetaan jenjang ke level minimum bawaan (asumsi, menunggu standar kompetensi PermenPANRB): Ahli Pertama 2, Muda 3, Madya 4, Utama 5; Pemula 1, Terampil 2, Mahir 3, Penyelia 4. Kewajiban `jf_jp_tahun`.

### 10.45 JF-2 Kebutuhan formasi JF (F2)

`kebutuhan_jenjang = Σ_kegiatan (volume_tahunan x norma_waktu_jam) / 1.250` (orang). 1.250 jam kerja efektif per tahun adalah pola Analisis Beban Kerja KemenPANRB (riset/6 J2), bukan pasal korpus: berlabel asumsi. Volume tahunan proksi per kab:

| Kegiatan | Volume tahunan | Sumber |
| --- | --- | --- |
| kaji cepat | rata-rata kejadian per tahun 2021-2025 | `dibi_kab_tahun.json` |
| renkon | jumlah bahaya dengan jiwa terpapar tinggi > 0, dibagi 3 (renkon berlaku 3 tahun) | `terpapar.json`, `renkon_berlaku` |
| pendampingan posko | rata-rata SK Tanggap Darurat per tahun | `status_darurat.json` |
| penyuluhan | desa terpapar tinggi | butuh data per desa (§10.9) |

Norma waktu: hanya dari `scripts/bnpb/unit/norma_waktu.json` (belum ada) berlabel "bawaan"; kegiatan tanpa norma dilewati, tidak dikarang. Kasus fixture RU §5.2: 40 kaji cepat x 25 jam + 12 renkon x 60 jam = 1.720 jam; kebutuhan 1,376 orang. Tampilan dibulatkan ke atas ke orang bulat hanya di kolom "usulan formasi"; angka pecahan tetap tampil. Label: "usulan metode" (Pasal 53 ayat (3) Perban 4/2025 belum terbit).

---

## 11. F3 dan T

Rumus inti F3 ada di DT §7.1; dokumen ini tidak menambah. Dua catatan rumus: IRT-2 menjumlah bobot sinyal per kelompok paket (PenL non-darurat +2, berulang di atas ambang PL +2, diumumkan sesudah Oktober +1, swakelola honor besar +1, diubah berulang antarversi +1) dan bobot itu asumsi riset/6 I2; RRS-2 wajib lab dengan kriteria terkunci dan uji plasebo sebelum angka apa pun keluar. Sistem T (PSPB-2, SPB-3, PUS-4, HUK-3) tidak punya rumus di sini (DT §7.2).

---

## 12. Uji balik per sistem

Hanya sistem yang membuat klaim prediksi, perkiraan, atau prioritas. Pola §0.9.

| Sistem | Klaim | Cara uji | Syarat lulus sebelum tayang | Bila gagal |
| --- | --- | --- | --- | --- |
| MB-4 (MT-2, DIK-1, PLP-2, PD-2) | kab skor tinggi lebih butuh | §5.7 | angkat ≥ 1,5, Spearman ≥ pembanding penduduk, angkat ≥ pembanding kejadian masa lalu | "urutan skor", pil belum lulus |
| PERB-1 | daerah dampingan menaikkan IRB paling banyak | retrospektif tidak bisa (IKD per kab tidak ada, U10). Prospektif: kenaikan IKD rata-rata daerah dampingan lawan daerah setara tak dampingan (C dan H dalam ±0,05) pada penilaian berikut; kriteria dikunci saat daftar 2027 diserahkan | tayang hanya sebagai "manfaat hitungan, bukan IRB resmi"; klaim "menaikkan IRB" baru boleh sesudah uji prospektif menunjukkan selisih > 0 dengan n ≥ 10 pasang | tetap label proksi |
| PERB-2 | kerugian tahun berjalan | hitung tahun 2025 lawan angka resmi LAKIP Rp51,3 T | |hitung - resmi| / resmi ≤ 0,30 | "belum layak", tanpa rupiah |
| RRS-1 | rupiah kerugian pertanian | tahun terakhir puso berdata ditahan (uji), sisanya latih; pembanding = rata-rata puso kab pada tahun latih; metrik MAE (ha puso) atas kab-tahun uji | MAE model ≤ 0,9 x MAE pembanding (ambang asumsi), kriteria di `lab_kriteria/rrs1.json` | luas tergenang saja |
| OJL-2 jelang kejadian | kab akan butuh dalam 1-3 hari | memakai rapor prospektif `/prediksi` (`public/prediksi/data/skor.json`) untuk bahaya dan tenggang yang sama | bahaya itu mengalahkan pembanding persistensi dan klimatologi di rapor `/prediksi` | bagian jelang kejadian tidak tampil; musiman tetap |
| KPOD-1 | IKU dari data | presisi dan recall kata kunci pada 50 entri; terpantau ≥ 80% | §7.3 | pesan penjodohan atau kartu tidak tampil |
| RRP-2, MB-7 `pola_longgar` | angka berita benar | presisi pada 30 artikel | presisi ≥ 0,8 | fitur tidak tayang |
| MB-3 | dokumen daerah dikenali benar | presisi `kenali()` pada 50 judul | ≥ 0,95 per jenis | jenis itu tidak dipakai |
| PLP-1 | PR 1% cukup | uji asumsi pasal §6.2 (bukan gerbang) | tidak ada; hasil tampil sebagai fakta | - |

Sistem tanpa klaim prediksi (MB-2, MB-5 hitungan standar, RRX-1, RRP-3, REN-1, KEU-1, SDU-1, IRT-1, PUS-1, PUS-2, JF-1, JF-2, PD-3, KS-4, WIL-1) cukup lulus kasus acuan dan invarian.

---

## 13. Ringkasan ambang tanpa pasal

Semua ambang berikut tampil berpil "Asumsi" dan bisa diganti tanpa mengubah rumus: §3.1 tabel asumsi; MB-4 lantai 0,01, bobot sama rata, syarat "data kurang" separuh bobot, nilai 0,5 penerima hibah; MB-3 masa diduga 5 tahun, presisi 0,95; MB-7 turun 50%, presisi 0,8; PD-1 penggabungan episode 24 jam, jendela terlewat 3 hari, n ≥ 10, pengecualian peringatan dicabut; KPOD-1 recall 0,8; PUS-1 tabel periode `frequency`; WIL-1 1.000 jiwa dan 2 hari; WIL-2 selisih 25%; OJL-2 400 km; OJL-3 25%; REN-2 0,5 dan 20%; RRS-1 0,9 x MAE; RRS-3 500 m; JF-2 1.250 jam; MT-3 median nasional; uji balik MB-4 ambang dampak berat dan angkat 1,5.

---

## 14. Catatan untuk sesi induk

**Kontradiksi dan keputusan yang diambil dokumen ini**

1. **Komponen risiko bawaan MB-4 bukan `risiko_hvc.json` `R_total`** (KA §8). Berkas itu sendiri berlabel "vonis GAGAL" dengan Spearman -0,011 terhadap korban jiwa, sedangkan penduduk 0,35 dan `kebalikan_C` -0,223. Dokumen ini memakai jiwa terpapar tinggi; `celah_kapasitas` tetap ada karena KA memintanya, tetapi korelasi negatif itu membuat uji balik MB-4 berisiko gagal. Pemilik perlu tahu sebelum MT-2, DIK-1, PLP-2 dijanjikan sebagai "prioritas".
2. **Kolom D1 `peringatan` tidak ada `mulai`.** DT §6.6 menyebut `mulai`; skema `0010_peringatan.sql` punya `dibuat` dan `berlaku_hingga` (milidetik), dan `kab` berupa nama sampai 80 huruf, bukan kode. PD-1 memakai `dibuat` dan pemetaan nama ke kode.
3. **`ibadah_n` bukan titik.** DT §5.10 (RRS-3) dan §6.9 (KS-3) memakai `ibadah_n` sebagai daftar titik; di `public/data/osm_nasional/*.json` kunci itu bernilai jumlah (`11.json`: 1582). Rumah ibadah dikeluarkan dari kandidat sampai `tarik_osm.py` menyimpan titiknya.
4. **Data per desa tidak tersedia publik.** PD-2, KS-3, MT-3 (10 desa), JF-2 (penyuluhan) butuh penduduk, kelas bahaya, dan titik pusat per desa. Datanya ada di cache `scripts/bnpb/terpapar.py` tetapi `terpapar.json` hanya agregat kab dan `public/data/bnpb/desa/*.json` hanya nama. Perlu keluaran per desa ke R2 (`ruang-bnpb`) sebelum tiket keempat sistem itu.
5. **Lapisan tsunami belum dipanen.** `terpapar.py` `LAPISAN` tidak memuat tsunami; KS-3 dengan parameter tsunami 1 km tidak bisa jalan sampai lapisan itu ditambah.
6. **Jendela DIBI.** `dibi_kejadian.json` hanya 365 hari (2025-10-28 sampai 2026-10-28) dan `dibi_kab_tahun.json` hanya rusak berat. PERB-2 (uji balik 2025) dan RRX-1 (kejadian lama) kehilangan RS dan RR. Perlu kolom RS dan RR per kab-tahun di `scripts/banjir/kejadian.py` (pemilik `banjir`).
7. **Kode kab bertitik.** `status_darurat.json` dan `dibi_kejadian.json` memakai `"61.02"`, berkas lain `"6102"`. Aturan §0.4 (hapus titik) belum tertulis di DT.
8. **TLHP 60 hari untuk BPK.** Kutipan `pedoman-1-2025` menyebut 60 hari untuk rekomendasi BPK; pemakaian untuk rekomendasi APIP (IRT-1) adalah tafsir. Perlu dicek ada tidaknya tenggat APIP tersendiri.
9. **Label JSON.** DS memakai kata "hitungan", DT JSON `hitungan_kita`. Dokumen ini menulis keduanya (§0.3); perender perlu satu peta.

**Data yang tidak ditemukan**

10. Kutipan `juknis-9-2023` ("setiap hari"), `perban-3-2026` Pasal 47 (`rpbd_monev`), dan seluruh kutipan Perka 7/2008 tidak saya cocokkan sendiri; G-1 yang memastikan.
11. Ambang PL Perpres PBJ, standar komponen Juklak 2/2026, Lampiran I Juklak 4/2025 (kode kegiatan dan ESMS), daftar 37 data prioritas, target Renstra Lampiran III, norma waktu JF, dan standar peralatan Perka 17/2009 belum ada sebagai berkas di repo.
12. `scripts/bnpb/unit/` dan `public/inti/jam_aturan.js` belum ada; semua path skrip di dokumen ini adalah rencana DT.

**Asumsi yang diambil**

13. Ambang yang saya tetapkan sendiri dan belum ada di dokumen atas: lantai MB-4 0,01 hanya untuk persentil; syarat "data kurang" separuh bobot; nilai 0,5 untuk penerima hibah; presisi MB-3 0,95; recall KPOD-1 0,8; turun 50% sebagai ragu MB-7; penggabungan episode peringatan 24 jam dan pengecualian peringatan dicabut; OJL-2 400 km setara 24 jam; RRS-1 0,9 x MAE; RRS-3 500 m; syarat lulus uji balik MB-4. Semuanya tercatat di §13 dan tampil berlabel asumsi.
14. Tenggat yang jatuh tepat hari ini berstatus `dekat` (sisa 0), bukan `lewat`, sesuai kasus `dsp_laporan_kejadian` di RU.
