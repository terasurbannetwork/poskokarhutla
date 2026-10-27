# RANCANGAN: Model genangan Jakarta (lalu Jawa, lalu Indonesia)

Status: rancangan, 27 Okt 2026, menunggu persetujuan pemilik. Belum ada kode model yang dibangun.
Pengerja: `banjir` (pipeline + mesin), `layar` banjir untuk sidebar. Pemeriksa: `validasi-model` (wajib), `selera-angka`, `inp-reviewer`.
Replay tidak menjadi fokus (keputusan pemilik 27 Okt). Mesin genangan yang sudah ada dipakai ulang.

## 1. Pertanyaan yang dijawab

Per kecamatan (lalu kelurahan bila data cukup), Jakarta dulu:
1. Seberapa sering banjir per tahun, dan kapan saja (riwayat teramati 2017-2025).
2. Hujan pemicunya: berapa mm dalam berapa jam.
3. Kapasitas drainase efektif (mm/jam): hujan yang masih bisa dibuang tanpa genangan.
4. Bila hujan X mm selama Y jam: di mana tergenang, berapa dalam, berapa lama surut.
5. Peringkat risiko antar-kecamatan: siapa paling rendah dan menjadi tujuan aliran.
6. Neraca air per kesatuan hidrologis (sub-DAS dan kecamatan): masuk berapa, keluar berapa, sisa berapa.

## 2. Yang sudah ada dan dipakai ulang

- `public/banjir/sim_genangan.js`: mesin murni (Priority-Flood, D8, SCS-CN, inersia lokal Bates 2010, neraca massa), bisa
  jalan di Node lewat `vm` (sudah dipakai `tests/banjir/sim_genangan.test.mjs`). Dipakai headless untuk kalibrasi.
- Pos tinggi air SIHKA, DSDA DKI, SIPANTAU (live, 180 hari), pasang BMKG (prediksi), status dan arsip harian banjir.
- `public/banjir/data/subsiden_literatur.json`: laju penurunan tanah per wilayah (untuk mengoreksi DEM ke tahun kejadian).

## 3. Data (hasil uji akses 27 Okt 2026)

| Kebutuhan | Sumber | Akses | Catatan |
| --- | --- | --- | --- |
| Genangan teramati (titik, kedalaman cm, waktu) | PetaBencana.id `data.petabencana.id/reports/archive` | bebas | 2017-2025; maks 217 hari per kueri; ~20% laporan tanpa kedalaman; bias pelapor |
| Luas genangan satelit 20 m | Copernicus GFM lewat STAC EODC `stac.eodc.eu` | bebas | 2015-; lewat ~18.15 WIB tiap 6-12 hari, sering bukan puncak; kota padat ter-mask |
| Radar mentah | Sentinel-1 (Earth Search, Copernicus Data Space) | bebas / akun CDSE | cadangan bila GFM kosong |
| Kejadian per kab/kota | DIBI BNPB | bebas | tanggal + dampak, tanpa kedalaman |
| Hujan per jam | ERA5-Land (Open-Meteo archive, 1940-), ECMWF IFS (2017-), IMERG 30 menit (Earthdata, token ADA) | bebas / token ada | ERA5 meremehkan puncak konvektif kota 2-5x: wajib koreksi bias |
| Medan | Copernicus GLO-30 (DSM, bebas), DEMNAS 8 m (akun BIG), FABDEM (bare-earth, CC BY-NC-SA), DeltaDTM (pesisir, CC BY) | campuran | DSM mengandung gedung: perlu DEM bare-earth atau filter |
| Aliran hulu (kiriman) | GloFAS reanalisis lewat Open-Meteo Flood API (1984-) di titik masuk Ciliwung, Pesanggrahan, Angke, Sunter, Cisadane; SIHKA/DSDA live | bebas | arsip tinggi air pintu air lama tidak publik |
| Batas laut | prediksi pasang BMKG (3 bulan) + harmonik untuk tahun lampau | bebas | lihat §6 |
| Saluran | OSM `waterway=drain|canal` (mirror Overpass) | bebas | topologi ada, kapasitas TIDAK ada |
| Gedung, kedap air | Overture / Open Buildings (VIDA) | bebas | kepadatan atap untuk CN |

Pasangan lengkap (hujan per jam + genangan teramati): **2017 Jan-Feb, 2018 Jan-Feb, 2020 1 Jan, 2025 Mar**, dan 2021 Feb
bila terverifikasi. 2007-2016 hanya luas kasar.

Yang tidak publik (minta resmi, surat disiapkan): kapasitas rumah pompa dan log operasi (Dinas SDA DKI), hujan per jam
pos DSDA/BMKG historis, arsip tinggi air pintu air, data RW tergenang BPBD dengan kedalaman dan lama surut.

## 4. Unit hidrologis dan neraca air

Unit dasar: sel 30 m (DEM) untuk aliran permukaan. Unit laporan: kecamatan (44 di DKI) dan sub-DAS (HydroBASINS lev 12,
sudah dipakai `bukti_das.py`), dijumlah ke kota dan provinsi.

Neraca per unit u per langkah waktu (m3):

    ΔS_u = P_u + Qhulu_u + Qlat_in_u + Qluap_u  −  D_u − Pompa_u − I_u − E_u − Qlat_out_u − Qlaut_u

- P: hujan (mm/jam x luas), setelah koreksi bias (§5.2).
- Qhulu: debit kiriman dari sungai yang masuk batas model (GloFAS, dikalibrasi ke pos live).
- Qlat: limpasan dari/ke unit tetangga (dari mesin genangan).
- Qluap: luapan sungai ke dataran bila tinggi air sungai > tanggul (v2; v1 sungai sebagai saluran tanpa luapan, lihat §8).
- D: drainase efektif = min(air tersedia, Kd_u x luas) per jam. **Kd_u (mm/jam) dikalibrasi per kecamatan.**
- Pompa: kapasitas rumah pompa di unit (bila data resmi ada; sebelum itu terserap di Kd_u).
- I: infiltrasi (SCS-CN dari tutupan dan kepadatan gedung).
- E: penguapan (diabaikan untuk kejadian < 4 hari; dicatat).
- Qlaut: keluaran ke laut, DITAHAN bila muka laut > ambang mulut saluran (pasang menghambat drainase).

ΔS terbagi menjadi tampungan cekungan (genangan) dan tampungan saluran. Kedalaman genangan per sel dari mesin.
Lama surut = jam sampai kedalaman sel < 10 cm setelah puncak.

## 5. Metode

### 5.1 Mesin
`sim_genangan.js` dijalankan headless di Node pada kotak Jakarta (kisi 30 m, ~1.700 x 1.300 sel). Tambahan v1:
batas hulu (debit masuk di sel sungai), batas laut (muka laut sebagai sel tetap), Kd per kecamatan (bukan satu angka),
koreksi subsidensi DEM ke tahun kejadian.

### 5.2 Hujan
Hujan per jam = IMERG 30 menit (prioritas) atau ERA5-Land, dikoreksi bias puncak dengan faktor per kejadian yang
dipelajari dari pos hujan (SIHKA/DSDA live untuk 2025-2026; pos BMKG bila data resmi masuk). Faktor tunggal per musim
dicatat, bukan disetel per kejadian uji.

### 5.3 Kalibrasi kapasitas drainase Kd per kecamatan
Kejadian kalibrasi: 2017, 2018, 2020. Untuk tiap kecamatan, cari Kd yang memaksimalkan kecocokan dengan laporan
PetaBencana (sel basah ≥ 10 cm dalam 300 m dari laporan bertanda tergenang pada jam ± 3) dan dengan GFM (sel kering
pada lewat satelit di area GFM kering yang tidak ter-mask), dengan penalti bila Kd menyimpang jauh dari median kota.
Hasil: Kd per kecamatan dengan rentang ketidakpastian (bootstrap atas laporan).

### 5.4 Keluaran turunan
- Kurva hujan-kedalaman per kecamatan: jalankan badai rancangan (durasi 1, 3, 6, 12, 24 jam; jumlah 25 sampai 400 mm;
  pasang tinggi dan rendah) -> tabel kedalaman puncak, luas tergenang, lama surut per kecamatan.
- Hujan pemicu per kecamatan: hujan terkecil di tabel yang memberi genangan ≥ 10 cm pada ≥ 5% luas.
- Frekuensi: dari riwayat teramati (PetaBencana 2017-2025 + DIBI + GFM), BUKAN dari model.
- Peringkat risiko: kedalaman puncak dan lama surut pada badai acuan (mis. 150 mm/6 jam), ditambah penduduk terpapar.

## 6. Batasan yang dinyatakan di layar

Model, bukan ukuran di depan pintu. Saluran tersumbat tidak terlihat. Kedalaman per sel 30 m. Pasang tahun lampau dari
harmonik, bukan ukuran. Tanggul dan luapan sungai belum dimodelkan di v1. Riwayat 2007-2016 hanya luas kasar.

## 7. Uji (didaftarkan sebelum hasil pertama, dikunci ke git seperti prospektif banjir)

Kejadian uji yang tidak dipakai kalibrasi: **2025 Mar** (dan 2021 Feb bila data terverifikasi).
Pembanding: (a) InaRISK bahaya banjir saja, (b) mesin dengan satu Kd seragam kota.
Lolos bila SEMUA:
1. POD laporan PetaBencana ≥ 0,6 dan batas bawah selang 95% (bootstrap) > POD pembanding (a) dan (b).
2. Rasio sel basah model di area GFM kering (tidak ter-mask) ≤ 0,4.
3. Galat absolut median kedalaman terhadap laporan ber-kedalaman ≤ 40 cm.
4. Spearman peringkat kecamatan model vs frekuensi teramati 2017-2025 ≥ 0,5.
Gagal = keluaran tetap tampil berlabel "Eksperimental, tidak lolos uji" (pola karhutla), tidak menjadi angka utama.

## 8. Tahap

| Tahap | Isi | Data akun? |
| --- | --- | --- |
| J1 | Panen: PetaBencana 2017-2025 Jakarta, GFM luas per lewat, ERA5-Land/IMERG per jam per kejadian, GLO-30, OSM saluran, Overture gedung, GloFAS hulu | IMERG (token ada) |
| J2 | Mesin headless + batas hulu/laut + Kd per kecamatan + koreksi subsidensi | tidak |
| J3 | Pendaftaran kriteria (§7) di-commit, lalu kalibrasi 2017/2018/2020 | tidak |
| J4 | Uji 2025 (+2021), vonis | tidak |
| J5 | Sidebar `/banjir`: per kecamatan frekuensi, kedalaman, hujan pemicu, lama surut, Kd, peringkat, kurva "hujan X selama Y jam", neraca air | tidak |
| J6 | DEMNAS 8 m / data resmi DSDA bila masuk; luapan sungai (v2) | DEMNAS, surat |
| J7 | Jawa: Semarang, Surabaya, Bandung, Pekalongan (rob), lalu seluruh Jawa | sama |
| J8 | Indonesia: kota besar dengan PetaBencana/GFM | sama |

Keputusan pemilik yang dibutuhkan: (1) setujui kriteria §7; (2) FABDEM (CC BY-NC-SA) boleh dipakai di situs publik
nonkomersial atau tunggu DEMNAS; (3) kirim surat ke Dinas SDA DKI dan BMKG.
