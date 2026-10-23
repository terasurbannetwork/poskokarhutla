# Paket `air-jawa`: dataset Kajian Grand Design Ketahanan Air Pulau Jawa 2026–2030

Bahan untuk Bab 4–6 dan Lampiran A–D Kajian Air Jawa: 119 kab/kota (kode Kemendagri), 6 provinsi, 24 wilayah sungai (WS).
Isi: IRBI banjir/kekeringan/longsor/abrasi/cuaca 2015–2025, kejadian DIBI per kab, penduduk, akses air minum, luas daerah
irigasi per kab dan kewenangan (OCR lampiran Permen PUPR 14/2015), inventaris bendungan, titik subsiden dari literatur, WS dan
BBWS, indeks pemakaian air, ringkasan provinsi dan WS, dan GeoJSON untuk peta.

**Membangun ulang** (dari akar repo):

```
python3 data/kajian-bnpb/bangun/air_jawa_ocr.py    # sekali, ±10 menit: OCR 578 hlm pindaian -> mentah/permen14_ocr/ (butuh pdftoppm + tesseract 'ind')
python3 data/kajian-bnpb/bangun/air-jawa.py tarik   # sekali: BPS (Playwright), Wikidata, teks Permen 04/2015 & PU 1/2025 -> mentah/
python3 data/kajian-bnpb/bangun/air-jawa.py         # bangun luring (±5 detik) + self-check assert; keluaran terakhir "self-check hijau"
```

Langkah bangun hanya memakai Python 3 stdlib dan berkas di repo. Data dibekukan per **23 Oktober 2026**.

## 1. Label keyakinan

| Label | Arti di paket ini |
| --- | --- |
| `resmi` | Instansi pemerintah, dokumen/API dibuka: InaRISK, DIBI, BPS, Permen PUPR, BBWS Pemali Juana |
| `terverifikasi` | Sumber primer non-pemerintah yang dibuka: abstrak jurnal (subsiden), WorldPop (penduduk) |
| `estimasi-model` | Tidak dipakai. Paket ini tidak memuat keluaran mesin platform |
| `asumsi-kebijakan` | Pilihan penyusun: kandidat WS per provinsi, WS bendungan dari nama sungai |
| `sekunder` | Angka riset B dari berita atau ringkasan; sumber primer **belum dibuka**. Bukan angka utama; wajib diverifikasi sebelum masuk naskah |
| `olah(x)` | Hitungan penyusun dari angka berlabel x, mis. persen kehilangan tampungan |

Bila sumber bertentangan, semua versi disimpan berdampingan (`bendungan_angka.csv`, `subsiden_kota.csv`, `irigasi_rekonsiliasi.csv`).

## 2. Masukan dan tanggal tarik

| Masukan | Isi | Tarik | Label |
| --- | --- | --- | --- |
| `data/kajian-bnpb/riset/mentah/irbi.ndjson` | IRBI InaRISK `apiv4/data-irbi-full`, 514 kab × 2015–2025 | 23 Okt 2026 | resmi |
| `data/kajian-bnpb/data/dibi/mentah/dibi_kab_jawa.json` | DIBI Superset `pdsi_staging.mv_dibi_dampak_by_kejadian`, kab Jawa × jenis × tahun 2008–2026 (paket `dibi`) | 23 Okt 2026 15.14 WIB | resmi |
| `scripts/udara/kota.json` | Kode Kemendagri 4 digit (Kepmendagri 300.2.2-2138/2025), titik pusat kab berbobot WorldPop | – | resmi |
| `public/geo/kabupaten/3[1-6].json` | Batas 119 kab/kota | – | resmi |
| `public/data/penduduk.json` | WorldPop R2025A, penduduk 2026 per kecamatan, dijumlah ke kab | – | terverifikasi |
| `public/banjir/data/subsiden_literatur.json` | Kutipan abstrak subsiden per kota (dibaca 21 Okt 2026) | 21 Okt 2026 | terverifikasi |
| `riset/mentah/bn638.pdf` | Permen PUPR 14/PRT/M/2015, Berita Negara 2015 No. 638, 590 hlm (hlm 13–590 pindaian), https://peraturan.go.id/files/bn638-2015.pdf | riset 23 Okt 2026 | resmi |
| `mentah/permen14_ocr/pNNN.txt` | OCR tesseract 5.5.3 (`ind`, psm 6, 300 dpi) setelah garis tabel dihapus; hlm dua-tabel dibelah di garis tengah | 23 Okt 2026 | resmi (lihat §5) |
| `mentah/bps/*.txt` | Teks tabel BPS yang dirender Playwright (URL dan waktu tarik di baris pertama tiap berkas) | 23 Okt 2026 | resmi |
| `mentah/permen04_2015.txt` | Permen PUPR 04/PRT/M/2015 Kriteria dan Penetapan WS (BN 2015 No. 429), https://peraturan.go.id/files/bn429-2015.pdf | 23 Okt 2026 | resmi |
| `mentah/permen_pu1_2025_bbws.txt` | Permen PU 1/2025 Organisasi dan Tata Kerja UPT, https://peraturan.bpk.go.id/Download/377958/2025pmpu1.pdf | 23 Okt 2026 | resmi |
| `mentah/wikidata_bendungan.json` | Koordinat bendungan/waduk Indonesia dari query.wikidata.org (2 kueri SPARQL tersimpan di berkas) | 23 Okt 2026 | koordinat saja, dicek poligon |
| `bangun/air_jawa_rujukan.json` | Angka yang disalin tangan dari dokumen: rekap Permen 14/2015, koreksi OCR, daftar WS, BBWS, IPA, neraca, CAT, inventaris BBWS Pemali Juana 2021, angka bendungan dan subsiden riset B. Tiap butir memuat sumber dan label | 23 Okt 2026 | per butir |

## 3. Berkas keluaran

| Berkas | Isi | Label | Keterbatasan |
| --- | --- | --- | --- |
| `kab_jawa.csv` | Tabel indikator 119 kab (Lampiran A): penduduk WorldPop 2026; IRBI 2025 dan 2024 per bahaya; DIBI 2015–2025; air minum layak; irigasi per kewenangan; bendungan di paket; subsiden; WS kategori C; BBWS pemegang DI pusat; titik pusat | per kolom, lihat §4 | lihat §4–§6 |
| `provinsi.csv` | Ringkasan 6 provinsi (Lampiran B): rerata sederhana dan berbobot penduduk IRBI 2025, kejadian DIBI 2015–2025, air minum layak 2025, leding 2023, irigasi menurut rekap resmi dan versi tercetak, jumlah bendungan, kota subsiden, WS | resmi; rerata = olah | Rerata IRBI bukan indeks resmi provinsi |
| `irbi_kab_2015_2025.csv` | 119 × 11 tahun: banjir, kekeringan, longsor, abrasi, cuaca_ekstrem, total, status | resmi | **Skala 2025 berbeda dari 2015–2024** (dibuktikan paket `irbi`). Jangan bandingkan 2025 dengan seri lama. Sel kosong = tidak bernilai di InaRISK (2025: abrasi 58 kab, longsor 23 kab, banjir Kep. Seribu), bukan nol |
| `dibi_kab_tahun.csv` | Kab × tahun (2008–2026) × kelompok × `is_bencana`: kejadian, meninggal, hilang, luka, mengungsi, menderita+mengungsi, rumah rusak, terendam | resmi | 2026 baru sampai tanggal tarik. `jumlah_kejadian` pecahan: satu kejadian lintas k kab dicatat 1/k per kab (Juklak BNPB 7/2023) |
| `air_minum.csv` | Akses air minum layak 2025: 6 provinsi + Indonesia, dan 35 kab Jateng; sumber air minum leding 2023 per provinsi | resmi | **Per kab hanya Jawa Tengah.** Tabel kab provinsi lain di situs BPS provinsi tidak termuat lewat peramban otomatis. "Layak" ≠ "aman" ≠ "perpipaan"; leding (Susenas) ≠ cakupan perpipaan PU |
| `irigasi_kab.csv` | Luas DI per kab × kewenangan (pusat, provinsi, kab/kota) × jenis (permukaan, air tanah, pompa, rawa, tambak), berikut halaman BN 638 dan metode atribusi | resmi | Baseline 2015, belum ada pemutakhiran. Baris `kode` kosong = luas yang tak bisa diatribusi ke kab (57 ha dari 3.135.123 ha) |
| `irigasi_di_pusat_provinsi.csv` | 94 DI kewenangan pusat dan 457 DI kewenangan provinsi di Jawa: total, BBWS (bila disebut), bagian per kab | resmi | BBWS hanya disebut untuk DI lintas provinsi |
| `irigasi_rekonsiliasi.csv` | Rekap resmi (hlm 13, 29, 63) lawan jumlah OCR per provinsi × kewenangan × jenis | resmi | lihat §5 |
| `bendungan.csv` | 37 bendungan/waduk: kab, WS, BBWS, status, kapasitas desain dan labelnya, versi lain, tampungan terukur, sedimentasi, kehilangan tampungan, koordinat dan hasil cek | campuran per baris | **Bukan inventaris lengkap**: 18 bendungan BBWS Pemali Juana (resmi) dan 19 bendungan riset B (18 sekunder, Kuningan `olah`) |
| `bendungan_angka.csv` | Semua versi angka per bendungan, per besaran, per sumber | per baris | – |
| `bendungan_rekonsiliasi.csv` | Jumlah 18 baris inventaris BBWS PJ lawan baris TOTAL dokumen | resmi | Sedimentasi: dokumen mencetak 96,51, padahal jumlah barisnya 96,545 |
| `subsiden_kota.csv` | 25 baris laju subsiden per kota per sumber (cm/th; min, tengah, maks, besaran asli) | terverifikasi / sekunder per baris | Per kota. **Jangan diturunkan ke kab lain.** Periode, metode, dan besaran (vertikal/LOS, rentang/maks) tidak sebanding antarbaris |
| `ws.csv` | 24 WS Jawa (Permen PUPR 04/2015 Lampiran I): kategori, provinsi, pengelola (Pasal 5), BBWS dan lokasinya (Permen PU 1/2025), bendungan di paket | resmi | IPA per WS **tidak tersedia** |
| `ws_kab.csv` | Tautan kab–WS: kategori C yang menyebut kab (resmi); kandidat WS menurut provinsi (asumsi); BBWS yang memegang DI pusat di kab (resmi) | per baris | Batas WS ada di peta Lampiran V Permen 04/2015, belum tersedia sebagai data vektor. Kandidat per provinsi **bukan** keanggotaan WS |
| `ipa_pulau_2010.csv` | Indeks pemakaian air per pulau 2010: Jawa 54% (kritis sedang), atau 42% tanpa aliran pemeliharaan | resmi (BPS 2020, mengutip Radhika dkk. 2013) | Neraca tahunan menyembunyikan defisit musiman |
| `neraca_jawa.csv` | Air permukaan Jawa 5.567 m³/s (6,3% nasional), CAT 80 / 41.334 juta m³, ketersediaan per kapita 2020–2030 | resmi (BPS 2020) | CAT memakai data KLH 2008 |
| `cat_air_tanah_rusak.csv` | 7 CAT rusak/rusak berat menurut Badan Geologi (Nov 2023) | sekunder | Peta zona konservasi air tanah resmi tidak ditemukan terbuka |
| `peta_kab.geojson` | 119 poligon kab + semua kolom `kab_jawa.csv` (koroplet) | – | Geometri dari `public/geo/kabupaten` |
| `peta_bendungan.geojson` | 37 titik bendungan + kolom `bendungan.csv` | – | Kolom `koordinat_cek` wajib dibaca. Ada 10 titik peraga di pusat kab |
| `peta_subsiden.geojson` | 7 titik kota (titik peraga di pusat kab/kota yang disebut literatur) + semua baris sumbernya | – | Titik bukan lokasi ukur |
| `air-jawa.json` | Cermin semua tabel (`kolom`, `baris`) + `meta` silsilah: sha1 masukan, metadata API, tanggal tarik, IRBI kosong 2025 | – | – |

## 4. Definisi kolom penting

- `dibi1525_kejadian_<kelompok>`: jumlah `jumlah_kejadian` DIBI 2015–2025 dengan `is_bencana = true`. Kelompok: `banjir` (kategori
  Banjir, tanpa jenis Banjir Rob; termasuk bandang, genangan, banjir dan tanah longsor), `rob` (jenis Banjir Rob), `longsor`,
  `kekeringan`, `gelombang_abrasi`, `cuaca_ekstrem`. Baris `is_bencana = false` tetap ada di `dibi_kab_tahun.csv`.
- `dibi1525_*_air`: jumlah lima kelompok air (banjir, rob, longsor, kekeringan, gelombang_abrasi), tanpa cuaca ekstrem.
- Kode kab DIBI memakai kode BPS. Di DKI berbeda dengan kode Kemendagri (Jakarta Selatan BPS 3171 = Kemendagri 3174, dst.). Karena
  itu pencocokan memakai nama (`kunci_nama`), dan selisih kode dicatat di `meta.dibi.kode_bps_beda_kemendagri`.
- `irigasi_*_ha`: pusat = Lampiran I, provinsi = Lampiran II, kab/kota = Lampiran III. DI lintas kab dibagi menurut "Kabupaten X = n Ha"
  di kolom Keterangan; DI utuh memakai judul kab di atasnya. Baris "Bendung", "Dam", "Air Baku", "Mata Air" = 0 ha.
- `irigasi_total_ha_rekap` (provinsi) dijumlah dari kolom per jenis. `irigasi_total_ha_tercetak` diambil dari kolom TOTAL dokumen.
  Keduanya beda 1 ha di Jatim kab/kota (533.035 lawan 533.034). Total Jawa tercetak 3.135.123 ha.
- `subsiden_maks_cm_th_terverifikasi`: maksimum dari baris berlabel terverifikasi yang **menyebut kab itu**. `subsiden_semua_versi`
  memuat semua versi beserta labelnya.
- `kehilangan_tampungan_persen` = 1 − tampungan terukur / kapasitas desain. Hanya dihitung bila keduanya besaran yang sama (total
  lawan total). Kapasitas efektif tidak dibandingkan dengan kapasitas total.
- Koordinat bendungan, urutan prioritas: (1) koordinat dokumen BBWS PJ bila jatuh di kab yang disebut dokumen, (2) Wikidata bila
  jatuh di kab yang disebut, (3) pusat kab sebagai **titik peraga**. Titik yang ditolak ditulis di `koordinat_cek`.

## 5. Irigasi: cara OCR dan rekonsiliasi

1. `air_jawa_ocr.py`: garis tabel dihapus. Kriteria garis: deret piksel gelap bersambung > 3,5% lebar (horizontal) atau > 6% tinggi
   (vertikal). Halaman dua-tabel dibelah di garis ganda tengah. Pengecualian: hlm 13, 29, 63 (rekap) dan 28, 60 (salah deteksi).
2. Lampiran III: subtotal per kab ("a Kab. X  n  ha") dibaca dengan pencocok nama yang toleran kaki huruf terpotong (g/y/j/q),
   dibantu difflib ≥ 0,75 hanya di provinsi yang sudah diketahui. Judul provinsi yang rusak dikenali dari urutan huruf kab yang mulai
   lagi dari "a".
3. Koreksi tangan setelah melihat pindaian: Temanggung 577 DI / 17.711 ha (hlm 275); Gresik air tanah 47 / 733 (hlm 510); Pemalang
   91 / 7.341 (hlm 259); total DI Bodri Trompo 8.861 (hlm 20); Cisomang 2.117 (hlm 45). Aturan otomatis: "M1 Ha" dibaca 41 ha. Aturan
   ini dibuktikan tiga kali oleh total DI (Senjoyo, Gunung Maling, Sedudut).
4. Invarian yang di-assert: jumlah DI kab/kota per provinsi × jenis **persis** sama dengan rekap. Jumlah DI pusat Jawa 94 dan
   provinsi 457 sama dengan rekap. Luas per provinsi × kewenangan × jenis = rekap setelah baris sisa (`kode` kosong). Sisa ≤ 2 ha untuk
   kab/kota dan ≤ 100 ha untuk pusat/provinsi.
5. Sisa yang tersisa (total 57 ha): Jatim provinsi utuh +60 (satu total DI di hlm 47–48 salah baca, tak ditemukan); kab/kota Jabar
   −2, Jateng −1, Jateng air tanah +1, Jatim air tanah +1; pusat Jateng −1; provinsi Jateng −1. Selisih ±1–2 ha bisa salah baca satu
   digit atau ketidakkonsistenan dokumen; tanpa pemeriksaan per halaman tidak bisa dipastikan.
6. Riset B §4.1 menulis "DI Jatiluhur: Bekasi 82.728 ha". Pindaian hlm 16 menulis **52.728** (52.728 + 24.511 + 100.049 + 60.502 =
   237.790). Paket ini memakai 52.728.

## 6. Celah dan rekonsiliasi lain

- **Air minum per kab** hanya Jawa Tengah (BPS Jateng 2025). Provinsi lain hanya tingkat provinsi. Perpipaan versi PU/Perpamsi
  (19,47% lawan 30,15%) tidak dimasukkan: angkanya sekunder dan bertentangan.
- **Penduduk resmi BPS per kab** tidak berhasil ditarik (tabel BPS 2790 kosong saat dirender). Paket memakai WorldPop 2026. BPS
  nasional 2026: 287.198.383 (disimpan di `meta.air_minum.penduduk_nasional_2026`). Jumlah WorldPop untuk Jawa: 160.830.619.
- **Kab → WS**: hanya kategori C yang resmi per kab. Untuk WS lain hanya provinsi yang tercantum. Perlu digitasi peta Lampiran V
  Permen 04/2015 atau poligon SIGI PU, yang tidak bisa diakses (DNS/portal tertutup).
- **IPA per WS** tidak ditemukan (riset B). Yang ada hanya per pulau.
- **Bendungan**: 18 entri riset B berlabel sekunder, Kuningan `olah`. Jatiluhur 3.000 lawan 2.440 juta m³ dan Cirata 2.165 lawan 1.900 bertentangan;
  keduanya disimpan. Dokumen BBWS PJ 2021 punya galat koordinat: Gunungrowo (sama dengan Klego), Simo (110°05′, jatuh di
  Temanggung), Greneng (110°21′, jatuh di laut), Sanggeh (jatuh di Blora). Grawan dicantumkan dokumen di Pati, padahal Kec. Sumber
  dan koordinatnya di Rembang. Kab tetap ditulis seperti dokumen; titik memakai cadangan.
- **Subsiden**: Pekalongan tiga versi (10–19 terverifikasi, 12–30 dan 2,1–11 sekunder); Semarang 19 (Abidin 2013), 10–12 (Aditiya &
  Ito 2023), 0,9–6 (BRIN, sekunder). Cirebon belum ada angka terverifikasi. Belum ada pengukuran sendiri (LiCSBAS belum dijalankan).
- **Air tanah per kab** tidak ada. CAT rusak hanya sekunder.
- IRBI tidak boleh dipakai untuk memeringkat kab karena banyak nilai kembar dan skala 2025 bilangan bulat.
