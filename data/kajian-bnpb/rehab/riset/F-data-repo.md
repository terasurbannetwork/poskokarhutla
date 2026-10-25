# Riset F: Data Repo untuk Grand Design Rehabilitasi dan Rekonstruksi

Tanggal: 25 Oktober 2026
Lingkup: angka yang dapat dihitung dari paket data repo (`data/kajian-bnpb/data/`) dan berkas platform, untuk rumah, jembatan, dan fasilitas umum. Semua hitungan dijalankan sesi ini dengan Python stdlib atas CSV paket; skrip reproduksi resmi belum ada dan menjadi tugas paket (`bangun/rehab_angka.py`, lihat KERANGKA §10).

## 1. Berkas yang dipakai

| Berkas | Isi yang relevan | Label asal |
|---|---|---|
| `dibi/rekap_nasional_tahunan.csv` | kejadian, korban, rumah RB/RS/RR, `jembatan_rusak`, `fasum_rusak`, `pendidikan_rusak`, `fasyankes_rusak` per tahun, kategori, klasifikasi, cakupan, seri | resmi (DIBI) |
| `dibi/rekap_provinsi_tahunan.csv` | kolom yang sama per provinsi per tahun | resmi |
| `dibi/kejadian_besar.csv` | 29 kejadian besar (Sulteng 2018, Lombok 2018, Cianjur 2022, Sumatra 2025, Padang 2009, Aceh 2004 dari BRR, dan lain-lain) | campuran, per baris |
| `dibi/rekonsiliasi.csv` | versi angka berbeda per kejadian | campuran |
| `skenario-hidromet/dibi_kab.csv` | kejadian, korban, rumah RB/RS/RR per kab per jenis (tanpa jembatan) | resmi |
| `skenario-geologi/gempa_kab.csv`, `tsunami_kab.csv`, `gunungapi_krb_kab.csv` | paparan dan analog geologi per kab | campuran |
| `turunan/profil_kerugian.csv` | profil kerugian batas bawah rumah rusak x stimulan 2015–2025 | asumsi-kebijakan |
| `irbi/irbi_kab_2025.csv`, `irbi_kab_2015_2025.csv` | IRBI per kab per bahaya | resmi |
| `program-terbukti/organisasi_bnpb.csv` | OTK BNPB berlaku | resmi |
| `riset/mentah/dibi_baris.json` | baris DIBI per kab (2010, 2018, 2020–2022) tanpa kolom jembatan | resmi |
| `pipa/data/osm_jarak.csv` (paket SIPPA) | jarak titik ke air dan jalan dari OSM untuk 865 titik kompleks api | estimasi-model; dipakai hanya sebagai contoh metode jarak akses |

## 2. Angka hitungan sesi ini

Filter: klasifikasi `alam`, cakupan `bencana` (semua seri; patahan seri 2024 berlaku untuk tren, tidak untuk jumlah).

| Besaran | Nilai | Catatan |
|---|---|---|
| Jembatan rusak, 2018–2025, nasional | 3.833 | Kolom `jembatan_rusak` bernilai 0 di semua tahun 2008–2017, jadi seri jembatan efektif mulai 2018 |
| Jembatan rusak per tahun 2018–2025 | 275; 433; 487; 505; 342; 258; 445; 1.088 | 2025 tertinggi, sekitar 28% dari total delapan tahun |
| Jembatan rusak 2026 (sampai tanggal tarik paket) | 114 | Tahun berjalan, tidak dibandingkan |
| Porsi banjir pada jembatan rusak 2018–2025 | 3.490 dari 3.833 (sekitar 91%) | Longsor 250, gempa 90, erupsi 52, cuaca ekstrem 37, gelombang 28 |
| Provinsi dengan jembatan rusak terbanyak 2018–2025 | Aceh 633; Sumatera Barat 521; Sulawesi Selatan 280; Jawa Barat 236; Jawa Tengah 215; Jawa Timur 204; Sumatera Utara 194; Kalimantan Barat 192 | |
| Jembatan rusak 2025 per provinsi | Aceh 480; Sumatera Barat 182; Sumatera Utara 82; Jawa Tengah 54; Jawa Timur 39 | Rangkaian Sumatra November 2025 mendominasi |
| Rumah rusak berat 2015–2025 | 301.311 | RS 256.321; RR 743.198 |
| Rumah rusak berat 2018–2025 per provinsi teratas | NTB 77.311; Aceh 55.522; Sulawesi Tengah 35.570; Jawa Barat 25.045; NTT 11.194 | |
| Rumah rusak berat 2025, Aceh | 53.905 | Dari 70.391 nasional |
| Fasilitas umum rusak 2015–2025 | 21.703 | Kategori DIBI, tidak memisah SPAM |
| Pendidikan rusak 2015–2025 | 11.617 | |
| Rumah rusak berat menurut jenis 2015–2025 | gempa 182.522; banjir 105.016; cuaca ekstrem 25.469; longsor 13.580; erupsi 3.648 | |

## 3. Kejadian besar yang menjadi lantai skenario rehab-rekon (dari `kejadian_besar.csv`)

| Kejadian | Rumah RB | Rumah rusak total | Mengungsi | Label |
|---|---|---|---|---|
| Padang 2009 (gempa) | 119.005 | 271.540 | 6.554 | resmi (DIBI) |
| Lombok 2018 (gempa) | 75.160 | 217.855 | 406.202 | resmi (DIBI) |
| Sulteng 2018 (gempa, tsunami, likuefaksi) | 34.166 | 110.214 | 212.719 | resmi (DIBI) |
| Cianjur 2022 (gempa) | 13.730 | 57.337 | 115.382 | resmi (DIBI); R3P: 114.315 rumah rusak (KERANGKA kajian §8 E5) |
| Sumatra November 2025 (banjir dan longsor) | 62.956 | 228.006 | 970.876 | resmi (DIBI, 15 Nov-31 Des 2025) |
| Merapi 2010 (erupsi) | 2.465 | 2.919 | 447.982 | resmi (DIBI) |
| Seroja 2021 (banjir, longsor) | 5.882 | 54.268 | 58.192 | resmi (DIBI) |
| Aceh 2004 (tsunami) | rumah dibangun BRR 140.304 | - | - | resmi (BRR, T14; riset E) |

## 4. Celah data

1. DIBI tidak punya kolom kerusakan SPAM, pipa, sumur, atau waktu pulih layanan air. Kerusakan sistem air hanya ada di dokumen kejadian (PU, R3P, buletin) dan media (riset D §4).
2. Kolom `jembatan_rusak` kosong sebelum 2018 dan tidak memisah jembatan nasional, provinsi, kab/kota, dan desa, maupun jembatan kendaraan dan jembatan gantung.
3. Jembatan rusak per kab tidak ada di paket; `dibi_baris.json` tidak memuat kolom jembatan. Perlu turunan baru: tarik ulang DIBI per kab dengan kolom `jembatan_rusak` 2018–2025 (Pusdatinkom atau dasbor publik).
4. Angka jembatan Sumatra 2025 berbeda versi: DIBI 2025 Aceh+Sumut+Sumbar 744 (hitungan sesi ini dari rekap provinsi 2025, semua kejadian tahun itu); 498 (BNPB 10 Desember 2025, via media, riset B [36]); 14 jembatan nasional putus di Aceh per 1 Desember 2025 (PU, riset B [29]). Ketiganya masuk tabel rekonsiliasi, tidak dipilih satu.
5. Rumah rusak Sumatra berbeda: DIBI 228.006; BNPB sekitar 147.000 (Des 2025); Kementerian PKP 189.308 (Jan 2026) (riset E [27]). Rekonsiliasi wajib.
6. Data CAT, sumur bor Badan Geologi 2021–2025, dan sumber air huntap tidak ada di repo (riset C, Celah).
