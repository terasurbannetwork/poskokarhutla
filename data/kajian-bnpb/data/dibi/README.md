# Paket `dibi`: rekap kejadian bencana

Bahan untuk dua kajian Kepala BNPB (Okt 2026): Bab 4 dan Lampiran D/G *Grand Design Mitigasi Bencana Indonesia
2026–2030*, serta Bab 5–6 dan Lampiran A/F *Grand Design Ketahanan Air Pulau Jawa 2026–2030*.

Dibangun 23 Okt 2026. DIBI dan CKAN ditarik 23 Okt 2026 pukul 15.23 WIB (stempel di `dibi.json` → `meta` dan di tiap
berkas `mentah/`). Buletin BNPB, berita, dan halaman BPK diakses 23 Okt 2026 (`bangun/dibi_rujukan.json`).

**Format angka.** Di CSV/JSON: UTF-8, pemisah koma, titik desimal, tanpa pemisah ribuan. Di README ini angka ditulis
gaya Indonesia (3.548; 9.305,45).

## Menjalankan ulang

```
python3 data/kajian-bnpb/bangun/dibi.py          # bangun dari mentah/ (luring) + self-check
python3 data/kajian-bnpb/bangun/dibi.py tarik    # tarik ulang DIBI + CKAN ke mentah/, lalu bangun
```

Python 3 stdlib. Kueri Superset DIBI, pencocok nama kab, dan unduh-dengan-coba-ulang dipakai ulang dari
`scripts/banjir/kejadian.py`, `scripts/banjir/umum.py`, `scripts/banjir/wilayah.py`. Self-check (assert, keluar non-nol
bila gagal):

1. Total nasional per tahun (kejadian, meninggal, hilang, mengungsi, menderita, rumah rusak berat, jumlah baris) sama
   persis dengan tarik riset pagi 23 Okt (`riset/mentah/dibi_tahun.json`); tahun berjalan boleh naik, tidak boleh turun.
2. 38 provinsi menjumlah ke nasional, dan kab Jawa menjumlah ke provinsi Jawa, per tahun × kategori × cakupan × metrik.
3. Tepat 119 kab/kota Jawa, semuanya cocok dengan nama `kab` di `public/geo/kabupaten/3[1-6].json`.
4. Tiap baris: kejadian bencana ≤ semua laporan, rumah_rusak = RB + RS + RR, tidak ada angka negatif;
   `menderita_mengungsi` = `menderita` + `mengungsi` di semua baris mentah.
5. Tiap kejadian besar punya ≥ 1 versi; jumlah DIBI per kejadian tidak melebihi total tahunnya.
6. Seri CKAN 2010–2024 (dibekukan Mar 2025) masih 3.472 (2024), 3.397 (2018), 5.400 (2023), sama dengan riset A §4.2.
7. Semua tabel: tanpa None/NaN/inf, label sah, kolom `sumber` terisi.

Uji mutasi dijalankan 23 Okt: menaikkan satu angka di `dibi_tahun.json` dan menghapus satu kab Jawa sama-sama ditolak.

## Label keyakinan

| Label | Arti di paket ini |
| --- | --- |
| `resmi` | instansi pemerintah RI: DIBI, CKAN data.bnpb.go.id, Buletin Info Bencana BNPB, Renstra BNPB (Perban 5/2025), SiPongi KLHK |
| `terverifikasi` | sumber primer non-pemerintah RI yang dibuka: halaman kejadian USGS (dicocokkan 19 Okt 2026 di `public/gempa/data/factsheet_gempa.json`) |
| `sekunder` | berita, ringkasan, atau kutipan yang dokumen primernya tidak dibuka. **Bukan label resmi; jangan dijadikan angka utama.** Disimpan agar versi yang beredar bisa direkonsiliasi |
| `asumsi-kebijakan` | tidak dipakai sebagai label baris. Pilihan penyusun (jendela tanggal dan wilayah kejadian besar, pemetaan jenis hidromet) ditulis di kolom `cakupan_atau_jendela` dan di tabel definisi di bawah |
| `estimasi-model` | tidak dipakai: paket ini tidak memuat keluaran model |

## Berkas

| Berkas | Isi | Sumber | Label | Keterbatasan |
| --- | --- | --- | --- | --- |
| `rekap_nasional_tahunan.csv` | 2008–2026 × 14 kategori DIBI (+ baris `SEMUA`) × cakupan: kejadian, meninggal, hilang, luka/sakit, mengungsi, menderita, rumah rusak berat/sedang/ringan/total, rumah terendam, fasilitas rusak, `n_baris` | DIBI `mentah/dibi_nasional.json` | resmi | 2026 sementara; DIBI data hidup |
| `rekap_provinsi_tahunan.csv` | idem per 38 provinsi, dengan kolom `pulau` | DIBI `mentah/dibi_prov.json` | resmi | kode provinsi = Kemendagri dari nama provinsi DIBI (kolom `id_provinsi_bps` DIBI campur aduk untuk Papua: Papua dan Papua Barat sama-sama 91) |
| `jawa_kab_hidromet.csv` | 119 kab/kota Jawa × 2008–2026 × 9 jenis hidromet × cakupan, metrik sama | DIBI `mentah/dibi_kab_jawa.json` | resmi | hanya baris yang ada (jenis/tahun tanpa laporan tidak ditulis = 0) |
| `jawa_kab_hidromet_ringkas.csv` | 119 baris; jumlah 2015–2026, cakupan `bencana`, per jenis hidromet: kejadian, n_baris, meninggal, mengungsi, menderita, rumah rusak; plus total hidromet | turunan tabel di atas | resmi | 2026 sampai tanggal tarik |
| `kejadian_besar.csv` | 29 kejadian 2004–2025, satu baris per versi angka (DIBI, USGS, Renstra, Buletin BNPB, SiPongi, pustaka) | DIBI `mentah/dibi_peristiwa.json`, `bangun/dibi_rujukan.json`, `public/gempa/data/factsheet_gempa.json`, `public/data/luas_resmi.json` | campuran, per baris | jendela DIBI dipilih penyusun; kejadian pra-2008 dan COVID-19 tanpa baris DIBI |
| `rekonsiliasi.csv` | angka yang bertentangan berdampingan: kejadian nasional 2023/2024/2025, meninggal dan rumah rusak 2024, dan tiap kejadian besar yang punya > 1 nilai, dengan definisi, penjelasan, `status_bukti` (terbukti / sebagian / tidak terbukti) dan dasar buktinya | semua di atas | per baris | penjelasan "tidak terbukti" berarti dugaan, bukan temuan |
| `rekonsiliasi_ckan_dibi.csv` | 2010–2024 × 9 jenis CKAN × 7 pasangan metrik: CKAN lawan DIBI | `mentah/ckan.json`, `mentah/dibi_nasional.json` | resmi | CKAN meninggal membalas *Not Found*; sel CKAN kosong dilewati (daftar di `dibi.json` → `meta.ckan_sel_kosong_dilewati`) |
| `rekonsiliasi_bulanan.csv` | 2024–2025 per bulan: Buletin BNPB lawan DIBI bencana lawan DIBI semua laporan | `bangun/dibi_rujukan.json` (buletin), DIBI | resmi | April 2024 tidak tersedia di buletin |
| `dibi.json` | semua tabel di atas + `meta` (stempel tarik, jumlah baris, status CKAN) | | | |
| `mentah/` | jawaban API apa adanya (lihat bawah) | | | |

### Mentah

| Berkas | Kueri |
| --- | --- |
| `mentah/dibi_nasional.json` | DIBI, `SUM` 19 kolom dampak + `COUNT(*)` per tahun × bulan × id_tipe_bencana × jenis × kategori × is_bencana |
| `mentah/dibi_prov.json` | idem per provinsi (tanpa bulan) |
| `mentah/dibi_kab_jawa.json` | idem per kab, saring `id_provinsi_bps IN (31..36)` |
| `mentah/dibi_peristiwa.json` | baris per tanggal × kab × jenis untuk tiap kejadian besar (saring tahun, kategori, provinsi); jendela tanggal diterapkan saat membangun |
| `mentah/dibi_dasbor.json` | metadata dasbor publik 1 (`/api/v1/dashboard/1` dan `/charts`): teks *Kriteria Bencana*, verifikasi triwulan, definisi grafik |
| `mentah/ckan.json` | CKAN `datastore_search` 7 seri nasional per jenis 2010–2024 + kejadian per provinsi 2010–2024 |

Tabel DIBI = `pdsi_staging.mv_dibi_dampak_by_kejadian`, ditarik lewat `POST https://dibi.bnpb.go.id/api/v1/chart/data`
dengan konteks dasbor publik 1 (tamu, tanpa token). Akses ini tidak resmi: bila Superset diubah, `tarik` gagal dan mentah
lama tetap dipakai. DIBI sempat membalas HTTP 521 beberapa menit pada 23 Okt; `tarik` mencoba ulang 4 kali.

## Definisi yang harus dibawa ke naskah

- **`cakupan = bencana`** = laporan `is_bencana = true`, yaitu yang memenuhi ambang batas Juklak BNPB 7/2023 tentang
  Standar Data Kejadian dan Dampak Bencana (ditetapkan 29 Des 2023): ≥ 1 meninggal; ≥ 50 terdampak/luka/mengungsi; ≥ 5
  rumah/fasilitas publik rusak; ≥ 1 ha lahan; permintaan bantuan nasional; atau status darurat. Teks dasbor DIBI
  menyatakan semua laporan disimpan, tetapi hanya yang memenuhi ambang ditandai *kejadian bencana*. **Pakai cakupan ini
  untuk angka utama.**
- **`cakupan = semua_laporan`** = semua baris, sama dengan grafik publik DIBI (grafiknya tidak menyaring `is_bencana`).
  Bendera `is_bencana = false` baru muncul di data 2024; sebelum 2024 kedua cakupan identik.
- **`kejadian`** = `SUM(jumlah_kejadian)`. Satu kejadian lintas k kab tercatat 1/k per kab (Juklak 7/2023 hlm. 7 butir
  4b), sehingga jumlah nasional = jumlah kejadian dan angka provinsi/kab bisa pecahan (contoh 2025: 9.305,45).
- **`n_baris`** = jumlah rekaman kab-kejadian. Di tingkat kab, Juklak menghitung satu kejadian per kab terdampak, jadi
  untuk memeringkat kab menurut frekuensi pakai `n_baris`; untuk menjumlah ke provinsi/nasional pakai `kejadian`.
- **`menderita`** = terdampak/penderita: masih bisa menempati rumah. **`mengungsi`** = keluar dari rumah. Keduanya
  terpisah menurut definisi Juklak 7/2023 (hlm. 28) dan dijumlah terpisah. "Terdampak" CKAN sama dengan `menderita`
  DIBI (104 dari 124 sel jenis-tahun identik; dengan `menderita + mengungsi` hanya 23), bukan menderita + mengungsi.
- **Meninggal** = nominal terakhir; **menderita, mengungsi, luka** = nominal terbesar selama tanggap darurat (Juklak
  7/2023 hlm. 22). Dijumlah lintas laporan, sehingga satu orang bisa terhitung di lebih dari satu laporan kab/tanggal.
- **Klasifikasi** dan **`kode_jenis_juklak`** = `id_tipe_bencana // 10` DIBI = 13 kode jenis Juklak 7/2023 (hlm. 6
  dan 19): 101–109 alam, 201 epidemi/wabah, 202 kebakaran gedung dan permukiman, 203 gagal teknologi (nonalam),
  301 konflik sosial (sosial), 999 lainnya. Kerusuhan sosial termasuk bencana sosial, sesuai UU 24/2007.
- **`jenis_hidromet`** (pemetaan penyusun dari `id_tipe_bencana`): banjir (1010, 1016 genangan), banjir_bandang (1012),
  banjir_rob (1011), banjir_dan_longsor (1013, tidak dipecah agar tidak terhitung dua kali), tanah_longsor (1020, 1022),
  gelombang_abrasi (1030–1032), cuaca_ekstrem (1040–1043), kekeringan (1050, 1053), karhutla (1060–1063). Karhutla
  dimasukkan karena Renas PB 2025–2029 menggolongkannya hidrometeorologis. Banjir lahar (1093) ikut erupsi.
- **Status data**: menurut dasbor DIBI, data tahun berjalan sementara dan final sekitar Februari tahun berikutnya.
  2026 ditandai `sementara`.

## Angka kunci (DIBI, cakupan `bencana`, resmi)

| Tahun | Kejadian | Meninggal | Hilang | Luka/sakit | Mengungsi | Menderita | Rumah rusak |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2015 | 1.694 | 219 | 57 | 370 | 184.254 | 1.043.675 | 25.532 |
| 2016 | 2.306 | 482 | 96 | 2.675 | 438.925 | 2.723.566 | 47.798 |
| 2017 | 2.866 | 309 | 69 | 1.042 | 324.996 | 3.349.373 | 49.731 |
| 2018 | 3.401 | 5.500 | 764 | 21.218 | 892.453 | 9.524.726 | 370.160 |
| 2019 | 3.829 | 517 | 112 | 3.515 | 443.866 | 5.697.278 | 73.941 |
| 2020 | 4.649 | 376 | 42 | 619 | 922.367 | 5.873.967 | 65.744 |
| 2021 | 5.402 | 728 | 87 | 14.914 | 684.160 | 7.575.147 | 158.658 |
| 2022 | 3.544 | 858 | 37 | 8.733 | 595.422 | 5.492.456 | 95.403 |
| 2023 | 5.400 | 275 | 33 | 5.795 | 150.469 | 8.340.819 | 47.214 |
| 2024 | 3.548 | 579 | 63 | 11.591 | 531.483 | 7.611.299 | 82.225 |
| 2025 | 5.440,45 | 2.030 | 246 | 11.164 | 1.179.213 | 11.809.388 | 289.967 |
| 2026* | 2.299 | 548 | 21 | 3.492 | 252.438 | 5.559.265 | 165.564 |

\* sampai 23 Okt 2026, sementara. Versi semua laporan: 2024 = 3.636, 2025 = 9.305,45, 2026 = 3.021 kejadian.

Jawa, hidromet 2015–2026 (cakupan bencana, porsi nasional): 20.480 kejadian; cuaca ekstrem 7.267, tanah longsor 5.618,
banjir 4.930, karhutla 1.820, kekeringan 463, rob 99,5. Meninggal: longsor 924, banjir 488, cuaca ekstrem 207.

## Rekonsiliasi kejadian 2024 (ringkas; rinci di `rekonsiliasi.csv`)

| Angka | Sumber | Label | Penjelasan | Bukti |
| ---: | --- | --- | --- | --- |
| 3.636 | DIBI semua laporan | resmi | yang tampil di grafik publik DIBI | terbukti |
| 3.548 | DIBI kejadian bencana | resmi | 88 laporan di bawah ambang Juklak 7/2023 dikeluarkan | terbukti |
| 3.472 | CKAN 2010–2024 | resmi | = DIBI kejadian bencana untuk 9 jenis alam (3.471,5); 76,5 sisanya nonalam/sosial/lainnya yang tak ada di CKAN | terbukti |
| 3.129 | Buletin BNPB 2025, pembanding 11 bulan 2024 | resmi | DIBI bencana bulan yang sama 3.335; beda terbesar Januari (205 lawan 347) | sebagian |
| 2.107 | konferensi pers BNPB 7 Jan 2025 | sekunder | diumumkan sebelum verifikasi triwulan akhir; dasbor DIBI mencatat contoh TW1 2025 naik 814 → 1.223 sesudah verifikasi. Berita menyebut "Juklak 2/2023", padahal Juklak 2/2023 tentang klaster logistik; standar data = Juklak 7/2023 | sebagian |
| 5.593 | konferensi pers yang sama, dikutip Antara | sekunder | rincian banjir 2.284 / longsor 933 / cuaca 1.432 jauh di atas DIBI kini (1.457 / 219 / 755,5); tidak dapat direproduksi | tidak terbukti |
| 1.476 | Tulisan Hukum BPK DIY mengutip DIBI | sekunder | 8 jenis alam, tanggal akses tidak tertulis | tidak terbukti |

2025: DIBI semua laporan 9.305,45 lawan kejadian bencana 5.440,45 (3.865 laporan di bawah ambang, terbukti) lawan jumlah
12 Buletin bulanan 2.778 (data Pusdalops sebelum verifikasi triwulan; mekanisme terbukti dari dasbor, besarnya selisih
per bulan tidak terurai). **Angka 9.305 di riset A §4.1 adalah versi semua laporan dan tidak boleh dipakai sebagai
"kejadian bencana 2025".**

## Keterbatasan dan celah

- DIBI data hidup. Tarik ulang bisa mengubah angka; self-check 1 akan gagal bila tahun ≤ 2025 direvisi, dan itu
  disengaja: periksa lalu perbarui `riset/mentah/dibi_tahun.json` dengan sadar.
- Kejadian pra-2008 (Aceh 2004, Nias 2005, Yogyakarta 2006) tidak tersedia di dasbor publik 1, padahal teks dasbor
  menyebut DIBI memuat kejadian sejak 1815 dari kompilasi berbagai sumber. Versinya hanya pustaka/USGS; Nias tanpa
  sumber resmi sama sekali.
- COVID-19, Plumpang 2023, dan kerusuhan akhir Agustus 2025 (selain satu baris Manokwari) tidak tercatat di DIBI.
  Kebakaran TPA 2023 (Sarimukti, Rawa Kucing, Suwung) tidak dicari di DIBI dan tidak punya angka korban di riset A.
- Banyak versi pustaka berlabel `sekunder` dengan URL hanya sampai domain ("URL artikel tidak dicatat riset A"). Sebelum
  dikutip di naskah, buka sumber primernya atau pakai versi resmi di baris yang sama.
- Kerugian rupiah tidak ada di paket ini. Kolom DIBI `estimasi_kerugian_rumah` ditarik ke mentah tetapi tidak diterbitkan
  karena satuannya tidak didokumentasikan. CKAN punya seri nilai kerusakan dan kerugian 2015–2024 dari proposal R3P
  pemda (belum ditarik).
- Luka/sakit DIBI sangat tidak stabil antartahun (2015: 370; 2018: 21.218) dan banyak baris tanpa isian; perlakukan
  sebagai batas bawah.
- Jendela tanggal dan wilayah kejadian besar adalah pilihan penyusun; angka DIBI per kejadian bergeser bila jendela
  diubah (contoh Lombok: 569 dengan Bali dan rangkaian 29 Jul–19 Agu; riset A 564).
