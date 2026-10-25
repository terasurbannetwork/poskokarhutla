# Paket `air-jawa`: dataset Kajian Grand Design Ketahanan Air Pulau Jawa 2026–2030

Bahan untuk Bab 4–6 dan Lampiran A–D Kajian Air Jawa: 119 kab/kota (kode Kemendagri), 6 provinsi, 24 wilayah sungai (WS).
Isi: IRBI banjir/kekeringan/longsor/abrasi/cuaca 2015–2025, kejadian DIBI per kab, penduduk, akses air minum, luas daerah
irigasi per kab dan kewenangan (OCR lampiran Permen PUPR 14/2015), inventaris bendungan, titik subsiden dari literatur, WS dan
BBWS, indeks pemakaian air, ringkasan provinsi dan WS, dan GeoJSON untuk peta.

**Membangun ulang** (dari akar repo):

```
python3 data/kajian-bnpb/bangun/air_jawa_ocr.py    # sekali, ±10 menit: OCR 578 hlm pindaian -> mentah/permen14_ocr/ (butuh bn638.pdf, pdftoppm, tesseract 'ind')
python3 data/kajian-bnpb/bangun/air-jawa.py tarik   # sekali: BPS (Playwright), Wikidata, teks Permen 04/2015 & PU 1/2025 -> mentah/
python3 data/kajian-bnpb/bangun/air-jawa.py         # bangun luring (±5 detik) + self-check assert; keluaran terakhir "self-check hijau"
```

Langkah bangun hanya memakai Python 3 stdlib dan berkas di repo. Data dibekukan per **23 Oktober 2026**.

Ketergantungan mesin di langkah tarik/OCR (langkah bangun tidak terkena):

- `bangun/air_jawa_bps.mjs` mengimpor Playwright yang tidak ada di `package.json` repo ini. Atur `PLAYWRIGHT_MJS=/path/node_modules/playwright/index.mjs`
  dan `CHROMIUM_PATH=/path/chrome-headless-shell` (string kosong = Chromium bawaan Playwright). Tanpa variabel itu dipakai path mesin
  penyusun (`/Users/alfatehanseptianta/...`), yang tidak ada di mesin lain.
- `riset/mentah/bn638.pdf` (16 MB) di-`.gitignore`. Unduh ulang dari https://peraturan.go.id/files/bn638-2015.pdf; langkah bangun
  mencocokkan sha1-nya dengan `permen14_rekap._sha1_pdf` (`2d7bd2d1e9b37cbea8263adae715102fb8c21f91`) bila berkasnya ada.

## 1. Label keyakinan

| Label | Arti di paket ini |
| --- | --- |
| `resmi` | Instansi pemerintah, dokumen/API dibuka: InaRISK, DIBI, BPS, Permen PUPR, BBWS Pemali Juana |
| `terverifikasi` | Sumber primer non-pemerintah yang dibuka: abstrak jurnal (subsiden) |
| `estimasi-model` | Keluaran model yang **belum diuji balik oleh paket ini**: keluaran mesin platform (tidak ada di paket ini), model eksternal (WorldPop R2025A untuk penduduk; model hujan-limpasan berbasis TRMM Radhika dkk. yang dikutip BPS 2020 untuk ketersediaan air dan IPA), dan proyeksi (air per kapita 2020–2030). Galat tidak dilaporkan sumbernya |
| `asumsi-kebijakan` | Pilihan penyusun: kandidat WS per provinsi, WS bendungan dari nama sungai |
| `sekunder` | Angka riset B dari berita atau ringkasan; sumber primer **belum dibuka**. Bukan angka utama; wajib diverifikasi sebelum masuk naskah |
| `olah(x)` | Hitungan penyusun dari angka berlabel x, mis. persen kehilangan tampungan, jumlah 2015–2025, luas irigasi per kab hasil atribusi OCR |

Label per kolom untuk tabel lebar (`kab_jawa.csv`, `provinsi.csv`, `peta_kab.geojson`) ada di §4 dan di `meta.label_kolom`
(`air-jawa.json`); `peta_kab.geojson` membawanya sebagai anggota `label_kolom` di tingkat FeatureCollection. Tabel lain punya kolom
label per baris.

Bila sumber bertentangan, semua versi disimpan berdampingan (`bendungan_angka.csv`, `subsiden_kota.csv`, `irigasi_rekonsiliasi.csv`,
dua versi penduduk di `kab_jawa.csv`).

## 2. Masukan dan tanggal tarik

sha1 semua masukan langkah bangun ada di `meta.sha1_masukan` (OCR: satu hash atas gabungan `p*.txt` terurut).

| Masukan | Isi | Tarik | Label |
| --- | --- | --- | --- |
| `data/kajian-bnpb/riset/mentah/irbi.ndjson` | IRBI InaRISK `apiv4/data-irbi-full`, 514 kab × 2015–2025 | 23 Okt 2026 | resmi |
| `data/kajian-bnpb/data/dibi/mentah/dibi_kab_jawa.json` | DIBI Superset `pdsi_staging.mv_dibi_dampak_by_kejadian`, kab Jawa × jenis × tahun 2008–2026 (paket `dibi`) | 23 Okt 2026 15.23 WIB (`meta.dibi.ditarik`) | resmi |
| `data/kajian-bnpb/data/nonalam-sosial/krb_covid19_kab.csv` | Penduduk per kab menurut KRB InaRISK 2022–2026 (paket `nonalam-sosial`), dipakai sebagai versi penduduk pembanding | 23 Okt 2026 | resmi |
| `scripts/udara/kota.json` | Kode Kemendagri 4 digit (Kepmendagri 300.2.2-2138/2025), titik pusat kab berbobot WorldPop | – | resmi (kode); titik = olah(estimasi-model) |
| `public/geo/kabupaten/3[1-6].json` | Batas 119 kab/kota | – | resmi |
| `public/data/penduduk.json` | WorldPop R2025A, penduduk 2026 *constrained UN-adjusted* per kecamatan, dijumlah ke kab | – | estimasi-model |
| `public/banjir/data/subsiden_literatur.json` | Kutipan abstrak subsiden per kota (dibaca 21 Okt 2026) | 21 Okt 2026 | terverifikasi |
| `riset/mentah/bn638.pdf` | Permen PUPR 14/PRT/M/2015, Berita Negara 2015 No. 638, 590 hlm (hlm 13–590 pindaian), https://peraturan.go.id/files/bn638-2015.pdf; sha1 2d7bd2d1… (di-`.gitignore`) | riset 23 Okt 2026 | resmi |
| `mentah/permen14_ocr/pNNN.txt` | OCR tesseract 5.5.3 (`ind`, psm 6, 300 dpi, pdftoppm 26.10.0) setelah garis tabel dihapus; hlm dua-tabel dibelah di garis tengah. Baris `#mesin` di tiap berkas mencatat versi alat (dicap susulan 23 Okt 2026, hari OCR dijalankan; OCR berikutnya menulisnya otomatis) | 23 Okt 2026 | resmi (lihat §5) |
| `mentah/bps/*.txt` | Teks tabel BPS yang dirender Playwright (URL dan waktu tarik di baris pertama tiap berkas) | 23 Okt 2026 | resmi |
| `mentah/permen04_2015.txt` | Permen PUPR 04/PRT/M/2015 Kriteria dan Penetapan WS (BN 2015 No. 429), https://peraturan.go.id/files/bn429-2015.pdf | 23 Okt 2026 | resmi |
| `mentah/permen_pu1_2025_bbws.txt` | Permen PU 1/2025 Organisasi dan Tata Kerja UPT, https://peraturan.bpk.go.id/Download/377958/2025pmpu1.pdf | 23 Okt 2026 | resmi |
| `mentah/wikidata_bendungan.json` | Koordinat bendungan/waduk Indonesia dari query.wikidata.org (2 kueri SPARQL tersimpan di berkas) | 23 Okt 2026 | koordinat saja, dicek poligon |
| `bangun/air_jawa_rujukan.json` | Angka yang disalin tangan dari dokumen: rekap Permen 14/2015, koreksi OCR, selisih dokumen, daftar WS, BBWS, IPA, neraca, CAT, inventaris BBWS Pemali Juana 2021, angka bendungan dan subsiden riset B. Tiap butir memuat sumber dan label | 23 Okt 2026 | per butir |

Tabel BPS penduduk 2026 (`mentah/bps/penduduk_nasional_2026.txt`) berjudul "(Ribu Jiwa)", padahal nilainya dalam jiwa
(Indonesia 287.198.383). Satuan yang benar dicatat di `meta.air_minum.penduduk_nasional_2026.satuan`.

## 3. Berkas keluaran

| Berkas | Isi | Label | Keterbatasan |
| --- | --- | --- | --- |
| `kab_jawa.csv` | Tabel indikator 119 kab (Lampiran A): penduduk WorldPop 2026 dan KRB InaRISK; IRBI 2025 dan 2024 per bahaya; DIBI 2015–2025; air minum layak; irigasi per kewenangan, total, dan permukaan saja; bendungan di paket; subsiden; WS kategori C; BBWS pemegang DI pusat; titik pusat | per kolom, §4 | lihat §4–§6 |
| `provinsi.csv` | Ringkasan 6 provinsi (Lampiran B): rerata sederhana dan berbobot penduduk IRBI 2025, kejadian DIBI 2015–2025 (dijumlah dari data mentah, baru dibulatkan), air minum layak 2025, leding 2023, irigasi menurut rekap resmi (per kewenangan, total, permukaan, tambak) dan versi tercetak, jumlah bendungan, kota subsiden, WS | per kolom, §4 | Rerata IRBI bukan indeks resmi provinsi. Bobot penduduk = WorldPop (estimasi-model) |
| `irbi_kab_2015_2025.csv` | 119 × 11 tahun: banjir, kekeringan, longsor, abrasi, cuaca_ekstrem, total, status | resmi | **Skala 2025 berbeda dari 2015–2024** (dibuktikan paket `irbi`). Jangan bandingkan 2025 dengan seri lama. Sel kosong = tidak bernilai di InaRISK (2025: abrasi 58 kab, longsor 23 kab, banjir Kep. Seribu), bukan nol |
| `dibi_kab_tahun.csv` | Kab × tahun (2008–2026) × kelompok × `is_bencana`: kejadian, meninggal, hilang, luka, mengungsi, menderita+mengungsi, rumah rusak, terendam | resmi | 2026 baru sampai tanggal tarik. `jumlah_kejadian` pecahan: satu kejadian lintas k kab dicatat 1/k per kab (Juklak BNPB 7/2023) |
| `air_minum.csv` | Akses air minum layak 2025: 6 provinsi + Indonesia, dan 35 kab Jateng; sumber air minum leding 2023 per provinsi | resmi | **Per kab hanya Jawa Tengah.** Tabel kab provinsi lain di situs BPS provinsi tidak termuat lewat peramban otomatis. "Layak" ≠ "aman" ≠ "perpipaan"; leding (Susenas) ≠ cakupan perpipaan PU. **Tabel leding 2023 tidak sejajar**: halaman BPS yang dirender memuat 11 judul kolom (kategori 2020), tetapi tiap baris hanya 8 nilai, lalu 100,00 (Jumlah) dan `...` dua kali. "Kolom 1 = leding" ditetapkan dari pembanding independen, bukan dari judul: Kompas 13 Feb 2024 (mengutip BPS, *Indikator Perumahan dan Kesehatan Lingkungan 2023*; https://lestari.kompas.com/read/2024/02/13/100000486/mayoritas-penduduk-indonesia-andalkan-air-isi-ulang-untuk-minum, diakses 23 Okt 2026) menulis Indonesia leding 8,92%, sumur bor/pompa 17,07%, sumur terlindung 15,26% = kolom 1, 2, 4. Ketiganya di-assert. Kolom lain tidak ditafsirkan |
| `irigasi_kab.csv` | Luas DI per kab × kewenangan (pusat, provinsi, kab/kota) × jenis (permukaan, air tanah, pompa, rawa, tambak), berikut halaman BN 638, metode atribusi, dan (untuk subtotal Lampiran III) hasil cek silang dengan baris DI di bawahnya | per baris: angka tercetak `resmi`; baris sisa dan bagian tanpa nama kab `olah(resmi)` | Baseline 2015, belum ada pemutakhiran. Baris `kode` kosong = luas yang tak bisa diatribusi ke kab: **neto −3 ha, bruto 7 ha** dari 3.135.123 ha (rincian §5) |
| `irigasi_di_pusat_provinsi.csv` | 94 DI kewenangan pusat dan 457 DI kewenangan provinsi di Jawa: total, BBWS (bila disebut), bagian per kab | resmi | BBWS hanya disebut untuk DI lintas provinsi |
| `irigasi_rekonsiliasi.csv` | Rekap resmi (hlm 13, 29, 63) lawan jumlah OCR per provinsi × kewenangan × jenis | resmi (rekap); kolom OCR dan sisa = olah(resmi) | lihat §5 |
| `bendungan.csv` | 37 bendungan/waduk: kab, WS, BBWS, status, kapasitas desain dan labelnya, angka kapasitas lain (dengan nama besaran dan tahun ukur), tampungan terukur, sedimentasi, kehilangan tampungan, koordinat dan hasil cek | campuran per baris | **Bukan inventaris lengkap**: 18 bendungan BBWS Pemali Juana (resmi) dan 19 bendungan riset B (18 sekunder, Kuningan `olah(sekunder)`). `versi_kapasitas_lain` menulis nama besaran (mis. `700 kapasitas_efektif`, `178.16 kapasitas ukur 2019`): kapasitas efektif dan tampungan terukur **bukan** versi lain dari kapasitas total desain |
| `bendungan_angka.csv` | Semua versi angka per bendungan, per besaran, per sumber | per baris | Luas DI Jatiluhur bersumber BN 638 hlm 16, bukan riset B |
| `bendungan_rekonsiliasi.csv` | Jumlah 18 baris inventaris BBWS PJ lawan baris TOTAL dokumen | resmi | Sedimentasi: dokumen mencetak 96,51, padahal jumlah barisnya 96,545 |
| `subsiden_kota.csv` | 27 baris laju subsiden per kota per sumber (cm/th; min, tengah, maks, besaran asli) | terverifikasi / sekunder per baris | Per kota. **Jangan diturunkan ke kab lain.** Periode, metode, dan besaran (vertikal/LOS, rentang/maks) tidak sebanding antarbaris |
| `ws.csv` | 24 WS Jawa (Permen PUPR 04/2015 Lampiran I): kategori, provinsi, pengelola (Pasal 5), BBWS dan lokasinya (Permen PU 1/2025), bendungan di paket, catatan | resmi; `bendungan_dalam_inventaris` = asumsi-kebijakan (kolom `label_bendungan_dalam_inventaris`) | IPA per WS **tidak tersedia**. WS kategori B dapat memuat aset pusat: Pemali-Comal (pengelola Gubernur menurut Pasal 5) memuat Cacaban dan Penjalin dari inventaris BBWS Pemali-Juana |
| `ws_kab.csv` | Tautan kab–WS: kategori C yang menyebut kab (resmi); kandidat WS menurut provinsi (asumsi); BBWS yang memegang DI pusat di kab (resmi, tautan BBWS–DI) | per baris | Batas WS ada di peta Lampiran V Permen 04/2015, belum tersedia sebagai data vektor. Kandidat per provinsi **bukan** keanggotaan WS. Kep. Seribu hanya ditautkan ke WS C Kepulauan Seribu (seluruh kab), bukan kandidat Ciliwung-Cisadane. Tautan BBWS–DI bukan keanggotaan WS (Klaten tercatat di dua BBWS) |
| `ipa_pulau_2010.csv` | Indeks pemakaian air per pulau 2010: Jawa 54% (kritis sedang), atau 42% tanpa aliran pemeliharaan | estimasi-model (model hujan-limpasan TRMM, Radhika dkk. 2013, dikutip BPS 2020; kolom `catatan_label`) | Neraca tahunan menyembunyikan defisit musiman. Galat model tidak dilaporkan |
| `neraca_jawa.csv` | Air permukaan Jawa 5.567 m³/s (6,3% nasional), CAT 80 / 41.334 juta m³, ketersediaan per kapita 2020–2030 | per baris: ketersediaan = estimasi-model (TRMM, dikutip BPS 2020); porsi 6,3% = olah(estimasi-model) (hitungan riset B); CAT dan luas = resmi; per kapita 2020/2025/2030 = estimasi-model (**proyeksi** terbit 2017, rantai BPS 2020 ← PT SMI Insight Q2 2017 ← BPS & Ditjen SDA, sumber tersier) | CAT memakai data KLH 2008. "Per kapita 2020" juga proyeksi, bukan realisasi |
| `cat_air_tanah_rusak.csv` | 7 CAT rusak/rusak berat menurut Badan Geologi (Nov 2023) | sekunder | Peta zona konservasi air tanah resmi tidak ditemukan terbuka |
| `peta_kab.geojson` | 119 poligon kab + semua kolom `kab_jawa.csv` (koroplet) + `label_kolom` | per kolom, §4 | Geometri dari `public/geo/kabupaten` |
| `peta_bendungan.geojson` | 37 titik bendungan + kolom `bendungan.csv` | per baris | Kolom `koordinat_cek` wajib dibaca. Ada 9 titik peraga di pusat kab |
| `peta_subsiden.geojson` | 7 titik kota (titik peraga di pusat kab/kota yang disebut literatur) + semua baris sumbernya | per baris | Titik bukan lokasi ukur |
| `air-jawa.json` | Cermin semua tabel (`kolom`, `baris`) + `meta` silsilah: sha1 semua masukan, label per kolom, metadata API, tanggal tarik, IRBI kosong 2025 | – | – |

## 4. Definisi kolom penting dan label per kolom

Label per kolom `kab_jawa.csv` (kolom yang sama di `peta_kab.geojson`) dan `provinsi.csv`:

| Kolom | Label |
| --- | --- |
| `kode`, `nama`, `nama_kepmendagri`, `prov_kode`, `prov_nama`, `n_kab` | resmi (Kepmendagri) |
| `penduduk_worldpop_2026` | estimasi-model (WorldPop R2025A, model dasimetrik eksternal; Kep. Seribu dan Kota Yogyakarta undercount, §6) |
| `penduduk_krb_inarisk` | resmi (InaRISK KRB 2022–2026; tahun basis penduduk tidak tertulis di API) |
| `catatan_penduduk` | olah(resmi, estimasi-model): terisi bila WorldPop < 50% penduduk KRB |
| `irbi2025_*`, `irbi2024_*` (kab) | resmi |
| `irbi2025_*_rerata`, `irbi2025_n_kab_tinggi` (provinsi) | olah(resmi) |
| `irbi2025_*_berbobot_penduduk` (provinsi) | olah(resmi, estimasi-model) |
| `dibi1525_*` | olah(resmi): jumlah 2015–2025 dari DIBI |
| `air_minum_*` | resmi (`tingkat_data_air_minum` = keterangan) |
| `irigasi_pusat_ha`, `irigasi_provinsi_ha`, `irigasi_kabkota_ha`, `irigasi_total_ha`, `n_di_kabkota` (kab) | olah(resmi): jumlah atribusi OCR BN 638 |
| `irigasi_permukaan_ha` (kab), `irigasi_permukaan_ha_rekap`, `irigasi_tambak_ha_rekap` (provinsi) | olah(resmi): satu jenis saja |
| `irigasi_*_ha_rekap`, `irigasi_ha_tak_teratribusi_kab` (provinsi) | olah(resmi): jumlah kolom rekap / sisa |
| `irigasi_total_ha_tercetak` (provinsi) | resmi (kolom TOTAL dokumen) |
| `n_bendungan_dalam_paket`, `bendungan_nama` | olah(resmi, sekunder): hitungan paket, bukan inventaris lengkap |
| `subsiden_maks_cm_th_terverifikasi` | terverifikasi |
| `subsiden_semua_versi` | label tiap versi tertulis di sel |
| `n_kota_subsiden_literatur` (provinsi) | olah(terverifikasi, sekunder) |
| `ws_kategori_c_disebut` | resmi |
| `bbws_pemegang_di_pusat` | resmi (tautan BBWS–DI, bukan keanggotaan WS) |
| `n_ws_kandidat_provinsi` | asumsi-kebijakan |
| `n_ws` (provinsi) | olah(resmi) |
| `lon_pusat`, `lat_pusat` | olah(estimasi-model): titik peraga berbobot WorldPop |

Definisi:

- `dibi1525_kejadian_<kelompok>`: jumlah `jumlah_kejadian` DIBI 2015–2025 dengan `is_bencana = true`. Kelompok: `banjir` (kategori
  Banjir, tanpa jenis Banjir Rob; termasuk bandang, genangan, banjir dan tanah longsor), `rob` (jenis Banjir Rob), `longsor`,
  `kekeringan`, `gelombang_abrasi`, `cuaca_ekstrem`. Baris `is_bencana = false` tetap ada di `dibi_kab_tahun.csv`.
- `dibi1525_*_air`: jumlah lima kelompok air (banjir, rob, longsor, kekeringan, gelombang_abrasi), tanpa cuaca ekstrem.
- Kode kab DIBI memakai kode BPS. Di DKI berbeda dengan kode Kemendagri (Jakarta Selatan BPS 3171 = Kemendagri 3174, dst.). Karena
  itu pencocokan memakai nama (`kunci_nama`), dan selisih kode dicatat di `meta.dibi.kode_bps_beda_kemendagri`.
- `irigasi_*_ha`: pusat = Lampiran I, provinsi = Lampiran II, kab/kota = Lampiran III. DI lintas kab dibagi menurut "Kabupaten X = n Ha"
  di kolom Keterangan; DI utuh memakai judul kab di atasnya. Baris "Bendung", "Dam", "Air Baku", "Mata Air" = 0 ha.
- **Luas irigasi mencakup lima jenis**: permukaan, air tanah, pompa, rawa, dan tambak. Total Jawa 3.135.123 ha (tercetak) terdiri
  atas permukaan 3.001.332, air tanah 74.432, tambak 50.301, pompa 7.503, rawa 1.556 ha (rekap; jumlahnya 3.135.124 karena selisih
  1 ha Jatim di dokumen). Irigasi tambak 50.301 ha = pusat Jatim 3.322; provinsi Banten 1.635, Jabar 6.864, Jatim 6.959; kab/kota
  Banten 12.644, Jabar 9.057, Jateng 6.295, Jatim 3.525. Peringkat kab menurut `irigasi_total_ha` ikut memuat tambak (Subang,
  Karawang); untuk sawah irigasi permukaan pakai `irigasi_permukaan_ha` (kab) dan `irigasi_permukaan_ha_rekap` (provinsi).
- `irigasi_total_ha_rekap` (provinsi) dijumlah dari kolom per jenis. `irigasi_total_ha_tercetak` diambil dari kolom TOTAL dokumen.
  Keduanya beda 1 ha di Jatim kab/kota (533.035 lawan 533.034).
- `subsiden_maks_cm_th_terverifikasi`: maksimum dari baris berlabel terverifikasi yang **menyebut kab itu**. `subsiden_semua_versi`
  memuat semua versi beserta labelnya.
- `kehilangan_tampungan_persen` = 1 − tampungan terukur / kapasitas desain. Hanya dihitung bila keduanya besaran yang sama (total
  lawan total). Kapasitas efektif tidak dibandingkan dengan kapasitas total; di `versi_kapasitas_lain` keduanya ditulis dengan nama
  besarannya.
- Koordinat bendungan, urutan prioritas: (1) koordinat dokumen BBWS PJ bila jatuh di kab yang disebut dokumen, (2) Wikidata bila
  jatuh di kab yang disebut, (3) pusat kab sebagai **titik peraga**. Titik yang ditolak ditulis di `koordinat_cek`.

## 5. Irigasi: cara OCR dan rekonsiliasi

1. `air_jawa_ocr.py`: garis tabel dihapus. Kriteria garis: deret piksel gelap bersambung > 3,5% lebar (horizontal) atau > 6% tinggi
   (vertikal). Halaman dua-tabel dibelah di garis ganda tengah. Pengecualian: hlm 13, 29, 63 (rekap) dan 28, 60 (salah deteksi).
2. Lampiran III: subtotal per kab ("a Kab. X  n  ha") dibaca dengan pencocok nama yang toleran kaki huruf terpotong (g/y/j/q),
   dibantu difflib ≥ 0,75 hanya di provinsi yang sudah diketahui. Judul provinsi yang rusak dikenali dari urutan huruf kab yang mulai
   lagi dari "a".
3. Koreksi tangan setelah melihat pindaian (`permen14_koreksi`): Temanggung 577 DI / 17.711 ha (hlm 275); Gresik air tanah 47 / 733
   (hlm 510; baris DI di bawahnya berjumlah tepat 733); Pemalang 91 / 7.341 (hlm 259); total DI Bodri Trompo 8.861 (hlm 20); Cisomang
   2.117 (hlm 45); **Rawa Sekaran (Kab. Lamongan) 1.779 (hlm 47; OCR membaca 1.719)**. Rawa Sekaran ditemukan pemeriksa yang
   mencocokkan 80 DI hlm 47–48 dengan pindaian (jumlahnya lalu 118.262 = angka judul seksi XIV), lalu dicek ulang penyusun pada crop
   200 dpi. Akibatnya `irigasi_provinsi_ha` Lamongan naik 60 ha (11.941 → 12.001) dan sisa provinsi Jatim menjadi 0. Aturan otomatis:
   "M1 Ha" dibaca 41 ha, dibuktikan tiga kali oleh total DI (Senjoyo, Gunung Maling, Sedudut).
4. Ketidakkonsistenan di dalam dokumen (bukan salah baca OCR; dicek ke pindaian, `permen14_selisih_dokumen`): judul seksi XII Jateng
   (pusat, hlm 20) mencetak 110.500, padahal 17 baris DI-nya berjumlah 110.501; DI Majegan (hlm 34) 32 ha, bagian Boyolali 8 +
   Sukoharjo 25 = 33; DI Brongkol (hlm 36) 16, bagian 9 + 6 = 15; DI Sembuh (hlm 36) 33, bagian 28 + 6 = 34. Paket memakai angka
   induk; selisihnya jadi baris sisa.
5. Invarian yang di-assert (semuanya bisa gagal; tidak ada yang membandingkan angka dengan dirinya sendiri):
   - jumlah DI kab/kota per provinsi × jenis **persis** sama dengan rekap (rekap hlm 13/29/63 dibaca tangan, independen dari OCR
     lampiran); jumlah DI pusat Jawa 94 dan provinsi 457 sama dengan rekap;
   - luas tak teratribusi per provinsi × kewenangan × jenis ≤ **2 ha** untuk semua kewenangan;
   - tiap selisih induk–bagian DI lintas kab dan tiap selisih judul seksi–jumlah DI harus tercantum di `permen14_selisih_dokumen`
     dengan angka yang sama; selisih baru (salah baca OCR yang belum ditangani) menggagalkan bangun;
   - total Jawa tercetak 3.135.123 = jumlah rekap − 1 (selisih Jatim kab/kota di dokumen); jumlah per jenis = total;
   - subtotal Lampiran III dicocokkan dengan jumlah baris DI di bawahnya (jumlah DI sama dan luas ≤ 1 ha). Baru **96 dari 175**
     subtotal cocok penuh: OCR tingkat baris DI lebih lemah daripada OCR subtotal (baris hilang atau satu digit salah baca, mis.
     Sleman +10.029, Ngawi +1.000). Subtotal tetap dipakai karena lolos cek rekap; hasil cek per subtotal ada di kolom
     `cek_baris_di_lampiran3` (`irigasi_kab.csv`), dan 96 dijadikan lantai regresi pengurai. Memaksa semua 175 cocok butuh
     pemeriksaan baris per halaman.
6. Sisa tak teratribusi per rekap (neto −3 ha, bruto 7 ha): pusat Jateng −1 dan provinsi Jateng −1 (keduanya selisih dokumen, butir 4);
   kab/kota Jabar −2, Jateng −1, Jateng air tanah +1, Jatim air tanah +1 (belum dicek per halaman: bisa salah baca satu digit di
   subtotal atau ketidakkonsistenan dokumen). Provinsi DIY berisi +1 (Brongkol) dan −1 (Sembuh) yang saling menghapus; bila dihitung
   per baris, bruto 9 ha.
7. Riset B §4.1 menulis "DI Jatiluhur: Bekasi 82.728 ha". Pindaian hlm 16 menulis **52.728** (52.728 + 24.511 + 100.049 + 60.502 =
   237.790). Paket ini memakai 52.728.

## 6. Celah dan rekonsiliasi lain

- **Air minum per kab** hanya Jawa Tengah (BPS Jateng 2025). Provinsi lain hanya tingkat provinsi. Perpipaan versi PU/Perpamsi
  (19,47% lawan 30,15%) tidak dimasukkan: angkanya sekunder dan bertentangan.
- **Penduduk resmi BPS per kab** tidak berhasil ditarik (tabel BPS 2790 kosong saat dirender). Paket memakai WorldPop 2026
  (estimasi-model) dan menyimpan penduduk KRB InaRISK (resmi) berdampingan. WorldPop **undercount** di Kep. Seribu (3101): 5.689 jiwa,
  19% dari KRB 29.418, karena pulau kecil jatuh di luar poligon kecamatan (`public/data/penduduk.json`: 145.719 jiwa nasional di luar
  poligon). Kota Yogyakarta (3471): 174.017, 42% dari KRB 415.382, sebab belum diperiksa. Keduanya ditandai di `catatan_penduduk`.
  Rerata IRBI berbobot penduduk di `provinsi.csv` memakai bobot WorldPop ini. BPS nasional 2026: 287.198.383 jiwa (disimpan di
  `meta.air_minum.penduduk_nasional_2026`). Jumlah WorldPop untuk Jawa: 160.830.619; KRB: 152.402.534.
- **Kab → WS**: hanya kategori C yang resmi per kab. Untuk WS lain hanya provinsi yang tercantum. Perlu digitasi peta Lampiran V
  Permen 04/2015 atau poligon SIGI PU, yang tidak bisa diakses (DNS/portal tertutup). Tautan BBWS–DI (14 kab) bukan keanggotaan WS.
- **IPA per WS** tidak ditemukan (riset B). Yang ada hanya per pulau, dan itu keluaran model.
- **Bendungan**: 18 entri riset B berlabel sekunder, Kuningan `olah(sekunder)` (turunan dari Cipanas yang sekunder). Jatiluhur 3.000
  lawan 2.440 juta m³ dan Cirata 2.165 lawan 1.900 bertentangan; keduanya disimpan. Dokumen BBWS PJ 2021 punya galat koordinat:
  Gunungrowo (sama dengan Klego), Simo (110°05′, jatuh di Temanggung), Greneng (110°21′, jatuh di laut), Sanggeh (jatuh di Blora).
  **Grawan** dicantumkan dokumen di bawah Kab. Pati, padahal Kec. Sumber dan koordinat dokumen sama-sama di Rembang: paket memakai
  Rembang (3317) dan koordinat dokumen, dengan catatan di `koordinat_cek` (`kab_dikoreksi` di rujukan). Rembang kini 4 bendungan,
  Pati 2.
- **Subsiden**: Pekalongan (3375) punya **tujuh baris**: empat terverifikasi (Sidiq dkk. 5–16; Handoko dkk. > 5; Sidiq dkk. 2021
  ≤ 7; Widodo dkk. 2024 10–19) dan tiga sekunder (Bappenas 12–30; BRIN 2,1–11; pernyataan pers ITB 2022 "20 cm/thn" untuk Semarang,
  Pekalongan, dan Demak). Semarang (3374) enam baris: Abidin 6–19, Sidiq 2021 ≤ 8, Mous ≥ 10, Aditiya & Ito 2023 10–12
  (terverifikasi); BRIN 0,9–6 dan ITB 2022 20 (sekunder).
  Virtriana dkk. (2026) dipecah: Kab. Bandung 22,3 dan Bandung Barat 22,0 cm/th, pasangan mengikuti urutan penulisan sumber.
  Cirebon belum ada angka terverifikasi. Belum ada pengukuran sendiri (LiCSBAS belum dijalankan).
- **Air tanah per kab** tidak ada. CAT rusak hanya sekunder.
- IRBI tidak boleh dipakai untuk memeringkat kab karena banyak nilai kembar dan skala 2025 bilangan bulat. Silang IRBI dengan paket
  `irbi` hanya membuktikan pemrosesan konsisten: kedua paket membaca `irbi.ndjson` yang sama, jadi bukan uji independen atas sumbernya.
