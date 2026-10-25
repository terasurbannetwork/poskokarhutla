# Paket `dibi`: rekap kejadian bencana

Bahan untuk dua kajian Kepala BNPB (Okt 2026): Bab 4 dan Lampiran D/G *Grand Design Mitigasi Bencana Indonesia
2026–2030*, serta Bab 5–6 dan Lampiran A/F *Grand Design Ketahanan Air Pulau Jawa 2026–2030*.

Dibangun 23 Okt 2026. DIBI dan CKAN ditarik 23 Okt 2026 pukul 15.23 WIB (stempel di `dibi.json` → `meta` dan di tiap
berkas `mentah/`). Buletin BNPB, berita, halaman BPK, dan halaman event USGS diakses 23 Okt 2026
(`bangun/dibi_rujukan.json`). Git blob dan waktu ubah tiap berkas masukan repo (`public/…`, rujukan, riset) dicatat di
`dibi.json` → `meta.masukan`.

**Format angka.** Di CSV/JSON: UTF-8, pemisah koma, titik desimal, tanpa pemisah ribuan. Di README ini angka ditulis
gaya Indonesia (3.548; 9.305,45).

## Menjalankan ulang

```
python3 data/kajian-bnpb/bangun/dibi.py          # bangun dari mentah/ (luring) + self-check
python3 data/kajian-bnpb/bangun/dibi.py tarik    # tarik ulang ke mentah.baru/, bangun + uji di sana, lalu tukar ke mentah/
```

Python 3 stdlib. Kueri Superset DIBI, pencocok nama kab, dan unduh-dengan-coba-ulang dipakai ulang dari
`scripts/banjir/kejadian.py`, `scripts/banjir/umum.py`, `scripts/banjir/wilayah.py`.

Keluaran ditulis ke direktori sementara `.baru-*` dan baru dipindah (`os.replace`) setelah self-check lolos, jadi uji yang
gagal tidak meninggalkan CSV rusak. `tarik` menulis ke `mentah.baru/`; bila bangun atau uji gagal, `mentah/` lama dan
keluaran lama tetap utuh dan `mentah.baru/` disimpan untuk diperiksa.

Self-check (assert, keluar non-nol bila gagal):

1. Total nasional per tahun (kejadian, meninggal, hilang, mengungsi, menderita, rumah rusak berat, jumlah baris) sama
   persis dengan tarik riset pagi 23 Okt (`riset/mentah/dibi_tahun.json`) untuk tahun yang sudah final saat itu
   (≤ 2025); tahun berjalan saat riset pagi (2026) boleh naik, tidak boleh turun. Status `sementara`/`final` memakai tahun
   tarik (stempel `mentah/`), bukan tanggal hari bangun.
2. 38 provinsi menjumlah ke nasional, dan kab Jawa menjumlah ke provinsi Jawa, per tahun × kategori × cakupan × metrik.
3. Tepat 119 kab/kota Jawa, semuanya cocok dengan nama `kab` di `public/geo/kabupaten/3[1-6].json`.
4. rumah_rusak = RB + RS + RR, tidak ada angka negatif; `menderita_mengungsi` = `menderita` + `mengungsi` di semua baris
   mentah.
5. Tiap kejadian besar punya ≥ 1 versi, dan jumlah semua baris `mentah/dibi_peristiwa.json` per kejadian (tanpa jendela)
   sama persis dengan agregat `mentah/dibi_prov.json` dengan saring yang sama (19 metrik + jumlah baris). Dua kueri ini
   terpisah, jadi baris kab yang tersunting di mentah peristiwa ketahuan.
6. Seri CKAN 2010–2024 (dibekukan Mar 2025) masih 3.472 (2024), 3.397 (2018), 5.400 (2023), sama dengan riset A §4.2.
7. Semua tabel: tanpa None/NaN/inf, `label` salah satu dari 4 kode, `verifikasi` primer/sekunder, kolom `sumber` terisi.
   Daftar putih: label `resmi` hanya bila kolom `sumber` diawali penerbit instansi/lembaga negara RI (DIBI, CKAN, Buletin
   BNPB, SiPongi/KLHK, Renstra, BNPB, BPBD, BRR, Bappenas, Presiden RI, Komnas HAM, Kemenkes, BPK); verifikasi `primer`
   hanya bila url berada di domain penerbit sendiri (dibi/data/bnpb.go.id, setkab.go.id, korpus JDIH,
   `public/data/luas_resmi.json`, earthquake.usgs.gov). URL berita selalu `sekunder`.
8. Tiap angka rujukan yang url-nya `data/raw/hukum/teks/<slug>.json#halaman=N` (Renstra) ada di teks halaman itu dalam
   format Indonesia.
9. Teks dasbor DIBI masih memuat angka verifikasi TW1 2025 yang dikutip (814, 1223, 1768).
10. Penjaga salin-tangan buletin: tiap angka bulanan 30–120% dari DIBI bencana alam bulan yang sama.
11. Angka di README ini (tabel Angka kunci, kalimat Jawa, tabel rekonsiliasi) sama dengan data; README yang basi gagal.

Tiap jalan juga mencetak jumlah baris `is_bencana = false` yang membawa korban meninggal.

Uji mutasi dijalankan 23 Okt di salinan scratchpad, semuanya ditolak: menaikkan satu angka di `dibi_tahun.json`;
menghapus satu kab Jawa; Renstra Jabodetabek 61 → 610 (#8); label Dewan Adat Papua terverifikasi → resmi (#7); verifikasi
baris berita sekunder → primer (#7); Buletin Jan 2025 302 → 3020 (#10 dan #11); Kota Palu 3.624 → 1.624 di
`mentah/dibi_peristiwa.json` (#5); README dengan satu angka basi (#11).

## Label keyakinan dan verifikasi

Kolom `label` hanya memakai empat kode kosakata keyakinan (`tema.json`, NASKAH-SPEK §9). Kolom `verifikasi` (NASKAH-SPEK
§7, medan pustaka) mencatat apakah angka dibaca di dokumen penerbitnya sendiri. Naskah `status: final` menolak sumber
`sekunder`.

| Label | Arti di paket ini |
| --- | --- |
| `resmi` | penerbit asli angka instansi/lembaga negara RI: DIBI, CKAN data.bnpb.go.id, Buletin Info Bencana BNPB, Renstra BNPB (Perban 5/2025), SiPongi KLHK (kini Kementerian Kehutanan), BNPB/BPBD/BRR/Bappenas/Kemenkes/Komnas HAM yang dikutip |
| `terverifikasi` | penerbit asli non-pemerintah RI: halaman event USGS, Bank Dunia, PBB/UNDRR, LSM, media dengan liputan sendiri, akademisi |
| `asumsi-kebijakan` | tidak dipakai sebagai label baris |
| `estimasi-model` | tidak dipakai: paket ini tidak memuat keluaran model |

| Verifikasi | Arti |
| --- | --- |
| `primer` | angka dibaca langsung di dokumen/halaman penerbitnya (API DIBI/CKAN, korpus JDIH, PDF buletin bnpb.go.id, halaman event USGS, berkas SiPongi di repo) |
| `sekunder` | angka dibaca dari kutipan pihak lain (berita, jurnal, ringkasan, skripsi) atau dokumennya belum dibuka. Contoh: konferensi pers BNPB yang dikutip Metro TV = `resmi` + `sekunder`. **Jangan dijadikan angka utama**; disimpan agar versi yang beredar bisa direkonsiliasi |

| `turunan_penyusun` | Arti (hanya di `kejadian_besar.csv` dan `rekonsiliasi.csv`) |
| --- | --- |
| `ya` | angka DIBI-nya resmi, tetapi jumlah per kejadian bergantung pada jendela tanggal, kategori, dan wilayah yang dipilih penyusun (kolom `cakupan_atau_jendela`). Menjumlah semua laporan, termasuk `is_bencana = false` (banyaknya baris dan korbannya disebut di `catatan`) |
| `tidak` | angka apa adanya dari sumbernya |

## Berkas

| Berkas | Isi | Sumber | Label | Keterbatasan |
| --- | --- | --- | --- | --- |
| `rekap_nasional_tahunan.csv` | 2008–2026 × 14 kategori DIBI (+ baris `SEMUA`) × cakupan: kejadian, meninggal, hilang, luka/sakit, mengungsi, menderita, rumah rusak berat/sedang/ringan/total, rumah terendam, fasilitas rusak, `n_baris`; kolom `seri` (`pra2024` / `juklak2023`, lihat patahan seri) | DIBI `mentah/dibi_nasional.json` | resmi, primer | 2026 sementara; DIBI data hidup; patahan seri 2024 |
| `rekap_provinsi_tahunan.csv` | idem per 38 provinsi, dengan kolom `pulau` | DIBI `mentah/dibi_prov.json` | resmi, primer | kode provinsi = Kemendagri dari nama provinsi DIBI, karena `id_provinsi_bps` DIBI memakai kode lama untuk Papua: 91 = Papua + Papua Barat, 94 = Papua Pegunungan + Papua Selatan + Papua Tengah, 96 = Papua Barat Daya |
| `jawa_kab_hidromet.csv` | 119 kab/kota Jawa × 2008–2026 × 9 jenis hidromet × cakupan, metrik sama | DIBI `mentah/dibi_kab_jawa.json` | resmi, primer | hanya baris yang ada (jenis/tahun tanpa laporan tidak ditulis = 0) |
| `jawa_kab_hidromet_ringkas.csv` | 119 baris; jumlah 2015–2026, cakupan `bencana`, per jenis hidromet: kejadian, n_baris, meninggal, mengungsi, menderita, rumah rusak; plus total hidromet | turunan tabel di atas | resmi, primer | 2026 sampai tanggal tarik |
| `kejadian_besar.csv` | 29 kejadian 2004–2025, satu baris per versi angka (DIBI, USGS, Renstra, Buletin BNPB, SiPongi, pustaka), dengan `verifikasi` dan `turunan_penyusun` | DIBI `mentah/dibi_peristiwa.json`, `bangun/dibi_rujukan.json`, `public/gempa/data/factsheet_gempa.json`, `public/data/luas_resmi.json` | per baris | jendela DIBI dipilih penyusun; kejadian pra-2008 dan COVID-19 tanpa baris DIBI |
| `rekonsiliasi.csv` | angka yang bertentangan berdampingan: kejadian nasional 2023/2024/2025 (semua laporan, bencana, bencana alam, CKAN, buletin, pers), meninggal dan rumah rusak 2024, dan tiap kejadian besar yang punya > 1 nilai, dengan definisi, penjelasan, `status_bukti` (terbukti / sebagian / tidak terbukti) dan dasar buktinya | semua di atas | per baris | "tidak terbukti" berarti dugaan, bukan temuan; angka di penjelasan dibentuk dari data |
| `rekonsiliasi_ckan_dibi.csv` | 2010–2024 × 9 jenis CKAN × 7 pasangan metrik: CKAN lawan DIBI | `mentah/ckan.json`, `mentah/dibi_nasional.json` | resmi, primer | CKAN meninggal membalas *Not Found*; sel CKAN kosong dilewati (daftar di `dibi.json` → `meta.ckan_sel_kosong_dilewati`) |
| `rekonsiliasi_bulanan.csv` | 2024–2025 per bulan: Buletin BNPB lawan DIBI bencana alam (101–109) lawan DIBI bencana semua klasifikasi lawan DIBI semua laporan | `bangun/dibi_rujukan.json` (buletin), DIBI | resmi, primer | April 2024 tidak tersedia di buletin |
| `dibi.json` | semua tabel di atas + `meta` (stempel tarik, git blob masukan, jumlah baris, status CKAN). Bisa dibangun ulang dan 11 MB, jadi tidak di-commit (`.gitignore`) | | | |
| `mentah/` | jawaban API apa adanya (lihat bawah); titik pulih yang layak di-commit | | | |

### Mentah

| Berkas | Kueri |
| --- | --- |
| `mentah/dibi_nasional.json` | DIBI, `SUM` 19 kolom dampak + `COUNT(*)` per tahun × bulan × id_tipe_bencana × jenis × kategori × is_bencana |
| `mentah/dibi_prov.json` | idem per provinsi (tanpa bulan) |
| `mentah/dibi_kab_jawa.json` | idem per kab, saring `id_provinsi_bps IN (31..36)` |
| `mentah/dibi_peristiwa.json` | baris per tanggal × kab × jenis untuk tiap kejadian besar (saring tahun, kategori, `id_provinsi_bps` DIBI); jendela tanggal diterapkan saat membangun |
| `mentah/dibi_dasbor.json` | metadata dasbor publik 1 (`/api/v1/dashboard/1` dan `/charts`): teks *Kriteria Bencana*, verifikasi triwulan, definisi grafik |
| `mentah/ckan.json` | CKAN `datastore_search` 7 seri nasional per jenis 2010–2024 + kejadian per provinsi 2010–2024 |

Tabel DIBI = `pdsi_staging.mv_dibi_dampak_by_kejadian`, ditarik lewat `POST https://dibi.bnpb.go.id/api/v1/chart/data`
dengan konteks dasbor publik 1 (tamu, tanpa token). Akses ini tidak resmi: bila Superset diubah, `tarik` gagal dan mentah
lama tetap dipakai. DIBI sempat membalas HTTP 521 beberapa menit pada 23 Okt; `tarik` mencoba ulang 4 kali.

## Definisi yang harus dibawa ke naskah

- **`cakupan = bencana`** = laporan `is_bencana = true`, yang ditandai kejadian bencana menurut ambang batas Juklak BNPB
  7/2023 tentang Standar Data Kejadian dan Dampak Bencana (hlm. 7 butir 3, ditetapkan 29 Des 2023): ≥ 1 meninggal; ≥ 50
  terdampak/luka/mengungsi; ≥ 5 rumah/fasilitas publik rusak; ≥ 1 ha lahan; permintaan bantuan nasional; atau status
  darurat. Teks dasbor DIBI menyatakan semua laporan disimpan, tetapi hanya yang memenuhi ambang ditandai *kejadian
  bencana*. **Pakai cakupan ini untuk angka kejadian utama.**
- **Pengecualian: `is_bencana` bukan fungsi ambang murni.** Ada laporan `is_bencana = false` yang membawa korban
  meninggal, padahal ≥ 1 meninggal sudah memenuhi ambang (dari `mentah/dibi_prov.json`, dicetak ulang tiap jalan):
  - 2025: 7 meninggal di 3 kelompok provinsi-jenis (Jawa Tengah kebakaran permukiman 4 meninggal dari 97 laporan; Jawa Tengah lainnya 2 meninggal dari 3 laporan; Kalimantan Selatan longsor 1 meninggal dari 5 laporan)
  - 2026: 6 meninggal di 3 kelompok provinsi-jenis (Sumatera Utara longsor 3 meninggal dari 5 laporan; Jawa Tengah longsor 2 meninggal dari 55 laporan; Kalimantan Barat kebakaran hutan dan lahan 1 meninggal dari 7 laporan)

  Untuk korban jiwa sajikan kedua versi, atau pakai `semua_laporan`: meninggal 2025 = 2.030 kejadian bencana / 2.037 semua laporan / 1.735 bencana alam.
- **`cakupan = semua_laporan`** = semua baris, sama dengan grafik publik DIBI (grafiknya tidak menyaring `is_bencana`).
- **Klasifikasi** dan **`kode_jenis_juklak`** = `id_tipe_bencana // 10` DIBI. Juklak 7/2023 hlm. 6 punya 13 kode jenis:
  101–109 alam, 201 epidemi/wabah, 202 kebakaran gedung dan permukiman, 203 gagal teknologi (nonalam), 301 konflik sosial
  (sosial). Kode 999 *lainnya* adalah kode DIBI di luar Juklak. Kerusuhan sosial termasuk bencana sosial, sesuai UU
  24/2007.
- **`kejadian`** = `SUM(jumlah_kejadian)`. Juklak 7/2023 hlm. 7 butir 4b: satu kejadian lintas wilayah dihitung satu
  kejadian secara nasional, sedangkan di tingkat provinsi dan kab/kota dihitung per wilayah terdampak. DIBI menyimpannya
  sebagai pecahan 1/k per kab (teramati di data, bukan aturan Juklak: Merapi 2010 5 × 0,2; Sulteng 2018 4 × 0,2 = 0,8),
  sehingga jumlah nasional = jumlah kejadian dan angka provinsi/kab bisa pecahan (contoh 2025: 9.305,45).
- **`n_baris`** = jumlah rekaman kab-kejadian. Di tingkat kab, Juklak menghitung satu kejadian per kab terdampak, jadi
  untuk memeringkat kab menurut frekuensi pakai `n_baris`; untuk menjumlah ke provinsi/nasional pakai `kejadian`.
- **`menderita`** = terdampak/penderita: masih bisa menempati rumah. **`mengungsi`** = keluar dari rumah. Keduanya
  terpisah menurut definisi Juklak 7/2023 (hlm. 28) dan dijumlah terpisah. "Terdampak" CKAN sama dengan `menderita`
  DIBI (104 dari 124 sel jenis-tahun identik; dengan `menderita + mengungsi` hanya 23), bukan menderita + mengungsi.
- **Meninggal** = nominal terakhir; **menderita, mengungsi, luka** = nominal terbesar selama tanggap darurat (Juklak
  7/2023 hlm. 22). Dijumlah lintas laporan, sehingga satu orang bisa terhitung di lebih dari satu laporan kab/tanggal.
- **`jenis_hidromet`** (pemetaan penyusun dari `id_tipe_bencana`): banjir (1010, 1016 genangan), banjir_bandang (1012),
  banjir_rob (1011), banjir_dan_longsor (1013, tidak dipecah agar tidak terhitung dua kali), tanah_longsor (1020, 1022),
  gelombang_abrasi (1030–1032), cuaca_ekstrem (1040–1043), kekeringan (1050, 1053), karhutla (1060–1063). Karhutla
  dimasukkan karena Renas PB 2025–2029 (Perban 1/2025 hlm. 6) menggolongkannya ancaman hidrometeorologis. Banjir lahar
  (1093) ikut erupsi.
- **Status data**: menurut dasbor DIBI, data tahun berjalan sementara dan final sekitar Februari tahun berikutnya. Tahun
  yang sama dengan tahun tarik (2026) ditandai `sementara`.

### Patahan seri 2024 (kolom `seri`)

Seri 2008–2026 **tidak menyambung** di 2024, karena dua hal berubah bersamaan dengan Juklak 7/2023:

1. `is_bencana = false` baru dipakai sejak data 2024. Sebelum 2024 semua laporan ditandai bencana, jadi angka
   `cakupan = bencana` sebelum 2024 tidak tersaring ambang (`seri = pra2024`).
2. Kategori nonalam, sosial, dan lainnya praktis baru tercatat sejak 2024: 2018–2023 hanya 0–15 kejadian per tahun,
   sedangkan 2025 = 363 kejadian dengan 295 meninggal. Kebakaran permukiman (semua laporan) 83 kejadian di 2024 dan 881
   di 2025.

Akibatnya 2023 → 2024 (5.400 → 3.548) **bukan penurunan 34%**: BNPB sendiri mengaitkan angka 2024 dengan "mekanisme
pencatatan baru" (konferensi pers 7 Jan 2025). Untuk tren antartahun pakai kolom **kejadian alam (101–109)** dan sebut
patahan metodenya; jangan bandingkan 2023 dengan 2024+ di cakupan bencana tanpa catatan.

## Angka kunci (DIBI, resmi, primer)

| Tahun | Kejadian bencana | Kejadian alam (101–109) | Meninggal bencana | Meninggal alam | Meninggal semua laporan | Hilang | Luka/sakit | Mengungsi | Menderita | Rumah rusak |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2015 | 1.694 | 1.694 | 219 | 219 | 219 | 57 | 370 | 184.254 | 1.043.675 | 25.532 |
| 2016 | 2.306 | 2.306 | 482 | 482 | 482 | 96 | 2.675 | 438.925 | 2.723.566 | 47.798 |
| 2017 | 2.866 | 2.866 | 309 | 309 | 309 | 69 | 1.042 | 324.996 | 3.349.373 | 49.731 |
| 2018 | 3.401 | 3.398 | 5.500 | 5.477 | 5.500 | 764 | 21.218 | 892.453 | 9.524.726 | 370.160 |
| 2019 | 3.829 | 3.814 | 517 | 478 | 517 | 112 | 3.515 | 443.866 | 5.697.278 | 73.941 |
| 2020 | 4.649 | 4.649 | 376 | 376 | 376 | 42 | 619 | 922.367 | 5.873.967 | 65.744 |
| 2021 | 5.402 | 5.402 | 728 | 728 | 728 | 87 | 14.914 | 684.160 | 7.575.147 | 158.658 |
| 2022 | 3.544 | 3.544 | 858 | 858 | 858 | 37 | 8.733 | 595.422 | 5.492.456 | 95.403 |
| 2023 | 5.400 | 5.400 | 275 | 275 | 275 | 33 | 5.795 | 150.469 | 8.340.819 | 47.214 |
| 2024 | 3.548 | 3.471,5 | 579 | 540 | 579 | 63 | 11.591 | 531.483 | 7.611.299 | 82.225 |
| 2025 | 5.440,45 | 5.077,45 | 2.030 | 1.735 | 2.037 | 246 | 11.164 | 1.179.213 | 11.809.388 | 289.967 |
| 2026* | 2.299 | 2.204 | 548 | 427 | 554 | 21 | 3.492 | 252.438 | 5.559.265 | 165.564 |

**Patahan seri 2024: kolom "bencana" sebelum 2024 tidak tersaring ambang dan hampir tanpa nonalam/sosial; untuk tren
pakai kolom "alam".** Hilang, luka, mengungsi, menderita, dan rumah rusak = cakupan bencana semua klasifikasi.
\* sampai 23 Okt 2026, sementara. Versi semua laporan: 2024 = 3.636, 2025 = 9.305,45, 2026 = 3.021 kejadian.

Jawa, hidromet 2015–2026 (cakupan bencana, porsi nasional, sembilan jenis): 20.479,98 kejadian = cuaca ekstrem 7.266,67, tanah longsor 5.617,67, banjir 4.930,14, karhutla 1.819,5, kekeringan 462,99, banjir dan longsor 170,18, rob 99,5, gelombang/abrasi 66, banjir bandang 47,33.
Meninggal 1.738: tanah longsor 924, banjir 488, cuaca ekstrem 207, banjir dan longsor 71, karhutla 32, banjir bandang 11, gelombang/abrasi 5.

## Rekonsiliasi kejadian 2024 (ringkas; rinci di `rekonsiliasi.csv`)

| Angka | Sumber | Label | Verifikasi | Penjelasan | Bukti |
| ---: | --- | --- | --- | --- | --- |
| 3.636 | DIBI semua laporan | resmi | primer | yang tampil di grafik publik DIBI | terbukti |
| 3.548 | DIBI kejadian bencana | resmi | primer | 88 kejadian dari laporan is_bencana=false dikeluarkan | terbukti |
| 3.471,5 | DIBI kejadian bencana alam (101–109) | resmi | primer | seri yang sebanding antartahun; 76,5 kejadian nonalam/sosial/lainnya dikeluarkan | terbukti |
| 3.472 | CKAN 2010–2024 | resmi | primer | = DIBI kejadian bencana untuk 9 jenis alam (3.471,5); 76,5 sisanya nonalam/sosial/lainnya yang tak ada di CKAN | terbukti |
| 3.129 | Buletin BNPB 2025, pembanding 11 bulan 2024 | resmi | primer | buletin menghitung "kejadian bencana alam". DIBI bencana alam bulan yang sama 3.263,5; sama persis di 10 dari 11 bulan, beda hanya Januari (205 lawan 340). Bahwa angka 2024 sudah final saat dikutip = dugaan | sebagian |
| 2.107 | konferensi pers BNPB 7 Jan 2025 | resmi | sekunder | diumumkan sebelum data final (tanggalnya terbukti dari jadwal di dasbor DIBI); sebab selisihnya dugaan, BNPB menyebut "mekanisme pencatatan baru". Berita menyebut "Juklak 2/2023", tidak cocok dengan korpus JDIH; standar data = Juklak 7/2023 | sebagian |
| 5.593 | konferensi pers yang sama, dikutip Antara | resmi | sekunder | rincian banjir 2.284 / longsor 933 / cuaca 1.432 jauh di atas DIBI semua laporan kini (1.457 / 219 / 755,5); tidak dapat direproduksi | tidak terbukti |
| 1.476 | Tulisan Hukum BPK DIY mengutip DIBI | resmi | sekunder | 8 jenis alam, tanggal akses tidak tertulis | tidak terbukti |

2025: DIBI semua laporan 9.305,45 lawan kejadian bencana 5.440,45 lawan bencana alam 5.077,45 lawan jumlah 12 Buletin bulanan 2.778 (buletin: data Pusdalops sebelum verifikasi triwulan; mekanismenya terbukti dari dasbor,
besarnya selisih per bulan tidak terurai). Korban: meninggal 2025 = 2.030 kejadian bencana / 2.037 semua laporan / 1.735 bencana alam.
**Angka 9.305 di riset A §4.1 adalah versi semua laporan dan tidak boleh dipakai sebagai "kejadian bencana 2025".**

## Kejadian besar: catatan yang harus dibawa

- **Jabodetabek 2020**: DIBI 433.628 mengungsi didominasi satu rekaman Kota Bekasi 366.274 (84,5%), sedangkan DKI hanya
  36.424; 13 kab yang cocok masing-masing satu baris bertanggal 2020-01-01. Status `tidak terbukti`; angka Kota Bekasi
  perlu dicek ke BPBD Kota Bekasi/BNPB dan jangan dijadikan angka utama. Untuk dibandingkan dengan Renstra (11.569) pakai
  DKI saja.
- **Sulteng 2018**: tersedia BNPB 21 Okt (JPNN), BNPB 26 Okt (Medcom, artikelnya kini mati), USGS (2.077 meninggal, 4.438
  luka, 1.075 hilang), dan DIBI (4.140 meninggal). Luka DIBI 4.438 sama persis dengan USGS.
- **Sulbar 2021**: DIBI 107 = USGS 107; factsheet repo mencatat 105 (Basarnas via Antara).
- **Kerusuhan akhir Agustus 2025**: tidak tercatat *sebagai konflik sosial* di DIBI (status `sebagian`); baris Agustus 2025
  kategori Lainnya dan Kebakaran permukiman belum diperiksa per kab.
- **Sumatra 2025**: tanggal mulai 22 Nov = baris DIBI pertama dengan korban jiwa (Agam, Tapanuli Tengah, Aceh Timur, dst.,
  kab yang sama dengan puncak 25–28 Nov). Baris 15–21 Nov (6 baris, 0 meninggal) tetap di jendela; keterkaitannya tidak
  dibuktikan.

## Keterbatasan dan celah

- DIBI data hidup. Tarik ulang bisa mengubah angka; self-check 1 akan gagal bila tahun ≤ 2025 direvisi, dan self-check 11
  gagal bila angka README basi. Itu disengaja: periksa lalu perbarui `riset/mentah/dibi_tahun.json` dan README dengan sadar.
- Kejadian pra-2008 (Aceh 2004, Nias 2005, Yogyakarta 2006) tidak tersedia di dasbor publik 1, padahal teks dasbor
  menyebut DIBI memuat kejadian sejak 1815 dari kompilasi berbagai sumber. Versinya hanya pustaka/USGS; Nias tanpa
  sumber resmi primer sama sekali.
- COVID-19 dan Plumpang 2023 tidak tercatat di DIBI. Kerusuhan akhir Agustus 2025 tidak tercatat sebagai konflik sosial
  (selain satu baris Manokwari), tetapi kategori lain belum diperiksa. Kebakaran TPA 2023 (Sarimukti, Rawa Kucing,
  Suwung) tidak dicari di DIBI dan tidak punya angka korban di riset A.
- Banyak versi pustaka berverifikasi `sekunder` dengan URL hanya sampai domain ("URL artikel tidak dicatat riset A").
  Sebelum dikutip di naskah, buka sumber primernya atau pakai versi primer di baris yang sama.
- Kerugian rupiah tidak ada di paket ini. Kolom DIBI `estimasi_kerugian_rumah` ditarik ke mentah tetapi tidak diterbitkan
  karena satuannya tidak didokumentasikan. CKAN punya seri nilai kerusakan dan kerugian 2015–2024 dari proposal R3P
  pemda (belum ditarik).
- Luka/sakit DIBI sangat tidak stabil antartahun (2015: 370; 2018: 21.218) dan banyak baris tanpa isian; perlakukan
  sebagai batas bawah.
- Jendela tanggal dan wilayah kejadian besar adalah pilihan penyusun (`turunan_penyusun = ya`); angka DIBI per kejadian
  bergeser bila jendela diubah (contoh Lombok: 569 dengan Bali dan rangkaian 29 Jul–19 Agu; riset A 564).
- Tanggal akses `public/data/luas_resmi.json` = waktu ubah berkas di repo (berkas itu diperbarui pipeline); versinya
  dikunci lewat git blob di `meta.masukan` dan di kolom `url_atau_berkas`.
