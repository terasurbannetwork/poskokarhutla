# D. Inventaris platform Pantau Bencana untuk dua kajian Kepala BNPB

Disusun 23 Okt 2026 dengan membaca repo saja. Tidak ada simulasi baru yang dijalankan. Angka dikutip dari berkas apa adanya, lengkap dengan path dan kunci JSON-nya.
Rujukan vonis metode: `docs/audit-metode/2026-10-21/RINGKASAN-EKSEKUTIF.md` (audit 21 Okt: 329 metode, 14 layak, 150 layak dengan catatan, 165 tidak layak).

## 0. Temuan inti (baca ini dulu)

1. **Hampir semua "simulasi" berjalan di peramban dan interaktif, tanpa hasil yang disimpan.** Skenario megathrust, Merapi, genangan, siklon, asap, dan neraca air dihitung di JS saat halaman dibuka. Repo **tidak menyimpan** satu pun keluaran skenario terburuk per kab/kota. Pengecualiannya tiga: `scripts/gunungapi/cek_merapi2010.mjs` (hasilnya hanya dikutip dalam teks metode), replay banjir Jabodetabek Maret 2025 (`public/banjir/data/replay/maret2025.json`), dan neraca FAO-56 / padi yang dihitung di pipeline.
2. **Skenario terburuk bisa dihasilkan tanpa model baru.** Mesinnya murni (tanpa DOM) dan bisa dipanggil dari node, mengikuti pola `cek_merapi2010.mjs`: `public/gempa/kerusakan.js`, `guncangan.js`, `tsunami.js`, `public/gunungapi/sim_lahar.js` + `sim_tanggap.js`, `public/banjir/sim_genangan.js` + `sim_longsor.js`, `public/cuaca/sim_dampak.js`, `public/udara/sim/model.js`, dan `public/kekeringan/simulasi.js`. Itu kerja menjalankan, bukan kerja merancang.
3. **IRBI BNPB lengkap ada di mesin lokal, tetapi tidak dilacak git.** `data/raw/inarisk/irbi.ndjson` (5.654 baris = 514 kab/kota × 2015–2025) memuat semua kolom bahaya. Kolomnya `banjir, longsor, kekeringan, cuaca_ekstrem, abrasi, gempabumi, tsunami, karlahut, gunungapi, total, status`. Yang dipublikasikan baru dua kolom (cuaca dan abrasi, di `cuaca_risiko_bnpb.json`) ditambah kekeringan (di `kekeringan_resmi.json`).
4. **Rupiah kerugian hanya ada untuk karhutla, dan audit memvonisnya tidak layak.** Korban jiwa model hanya ada untuk gempa (kerusakan.js), dengan galat LOO sekitar 5,3 kali; audit juga memvonisnya tidak layak untuk gempa nyata. Kerugian imateriil tidak ada sama sekali.
5. **Kajian air Jawa punya celah besar.** Subsiden belum diukur sama sekali (yang ada hanya kutipan literatur 6 kota). Air tanah tidak ada. Debit sungai GloFAS bertitik **0 di Jawa** (192 titik semuanya di luar Jawa). Abrasi baru 5 situs Pantura.

---

## 1. Tabel per bencana

Keterangan kolom validasi: **L** = lolos uji tercatat, **G** = gagal, **–** = belum diuji, **A:x** = vonis audit 21 Okt.

### 1.1 Karhutla

| Butir | Isi |
|---|---|
| Data & simulasi | Titik FIRMS (`public/data/hotspot*.json`, `sejarah.json`, `kumulatif.json`); FWI dan ansambel (`fwi.json`, `fwi_ansambel.json`); kompleks (`kluster.json`); model sebaran GBDT (`model_sebaran.json`, `scripts/sebaran/**`); simulasi fisika FBP di layar (`public/sim_*.js`, tab `sim`); dampak (`public/data/dampak.json`, `scripts/data/dampak.py`); bahaya InaRISK karhutla per kompleks (`public/data/inarisk.json`, 5.460 kompleks) |
| Cakupan | Nasional; kompleks/provinsi/kabupaten; luas resmi per provinsi |
| Keluaran & contoh | `dampak.json`: `musim.ha` = [884.971; 1.649.852; 3.110.562] ha; `kerugian.total` = Rp [47,3; 203,7; 442,4] T; `emisi.mt_co2e` = [124,2; 706,1; 2.678,2]; `dekat.prov.62.jiwa` (1/5/10 km) = [292.558; 1.329.733; 1.881.413]; `lahan.kompleks_ha` 1.029.982 |
| Validasi | A: tidak layak untuk emisi, kerugian Rp, ISPA, dan paparan radius (RINGKASAN §2.9: luas tidak terkalibrasi, Kalteng 310 kali angka BNPB). Model sebaran: uji 2024–26 sudah dibuka (`.claude/ilmu-agent/validasi-model.md`). Skor prioritas v1 dan v2 **G** (commit ec2490cc: +8,0 poin, syarat 10). Kalibrasi wilayah model bertingkat **G** (`docs/riset/HIERARKI-WILAYAH.md` §"Hasil kalibrasi wilayah (23 Okt 2026): GAGAL"). Yang aman dibawa: jumlah titik, tabel tiga sumber luas, kurva musim (RINGKASAN §3) |

### 1.2 Banjir

| Butir | Isi |
|---|---|
| Data & simulasi | Hujan grid 0,25° (`public/banjir/data/hujan.json`, 2.931 sel, 211 di Jawa; kolom `h, p, imax, cape, sm, a7`); ansambel ECMWF IFS 51 anggota (`hujan_ansambel.json`, `peluang.json`); status kecamatan (`status.json`, `scripts/banjir/status.py`); bahaya InaRISK per kecamatan (`bahaya.json`: `kec[*].banjir/bandang/longsor/kering/gelombang`, 7.274 kec); simulasi genangan DEM (`public/banjir/sim_genangan.js`: SCS-CN + inersia lokal Bates 2010; `sim_lahan.js` WorldCover; `sim_tanggap.js` evakuasi + Rp perlakuan); replay (`replay.html`, `scripts/banjir/replay.mjs`) |
| Cakupan | Status: nasional per kecamatan. Genangan: kisi lokal ±24 km yang dipilih pengguna. Replay: hanya Jabodetabek 2–5 Mar 2025 |
| Keluaran & contoh | `peluang.json.wilayah.<kode>.hari[].p` = P(hujan ≥ 50 mm), `p3` = P(3 hari ≥ 100 mm), `p10/p50/p90` (288 wilayah: nasional, provinsi, kab). `dampak.json.terpapar.penduduk` 9.823 (13 Okt). Replay `maret2025.json.ringkasan`: `luas_puncak_km2` 76,6; `gedung_puncak` 114.895; `hmaks_cm` 512 |
| Validasi | `validasi.json` (latih 2016–21, uji 2022–25, 42 kab): Siaga POD 0,132, FAR 0,939, ETS 0,031 → lemah. A: layak dengan catatan **hanya** untuk lampiran teknis (Jawa, Sumatra, Sulawesi; hari ke-0; per kab). Peluang ansambel: keandalan **belum diukur** (`peluang.json.uji_balik.keandalan peluang`). Replay: tidak ada perbandingan kuantitatif dengan kedalaman yang dilaporkan (berkas tidak memuat kedalaman laporan; model memberi Pondok Gede Permai 3 cm dan Jatiasih 165 cm). Status: – |

### 1.3 Longsor (bagian modul banjir)

| Butir | Isi |
|---|---|
| Data & simulasi | Status longsor di `status.json`; `riwayat_grid_longsor.json`; `public/banjir/sim_longsor.js` (lereng tak-hingga SINMAP, FS per sel DEM + hujan); bahaya InaRISK `bahaya.json.kec[*].longsor`; ambang ILEWS Jawa 30 mm/1 hari, 64 mm/3 hari (`param_banjir.json.ambang.longsor_ilews_jawa`) |
| Cakupan | Nasional per kecamatan (status); simulasi FS lokal per kisi |
| Keluaran | Peluang longsor per sel di simulasi; status per kecamatan. Tidak ada jiwa, bangunan, atau Rp |
| Validasi | `validasi.json.longsor`: Waspada POD 0,543, FAR 0,976; Siaga POD 0,151, FAR 0,954. Bali-NT: 0 dari 75 kejadian tertangkap (RINGKASAN §2.18). Status: lemah |

### 1.4 Rob

| Butir | Isi |
|---|---|
| Data | `public/banjir/data/rob.json`: 66 titik (51 di Jawa), muka laut SMOC Open-Meteo Marine, `p95/p99/amax`, gelombang; `bmkg.rob` (teks peringatan BMKG terbitan 1 Okt 2026); `kejadian` 257 rob DIBI (contoh: Medan 12 Agu 2018, terdampak 112.585, rumah terendam 26.340); `kab_tahun` 119 kab. `pasang_astro.json` (indeks gaya pasang 0–1). `subsiden_literatur.json` |
| Keluaran | Level per titik per hari. Tidak ada luas genangan rob dan tidak ada jiwa terpapar rob (`data/terkunci/bangunan` menulis rob `tersedia:false`, hanya titik) |
| Validasi | `rob.json.validasi`: 26 kejadian, 16 kab; p80 POD 0,885, FAR 0,993. A: tidak layak, karena bertentangan dengan peringatan rob BMKG (0 dari 44 titik mencapai p95 saat BMKG menerbitkan 19–20 peringatan per hari). Yang boleh dibawa: baris peringatan rob BMKG aktif |

### 1.5 Gempa bumi

| Butir | Isi |
|---|---|
| Data & simulasi | Katalog USGS (`riwayat_m5.json`, `riwayat_grid.json`, `riwayat_prov.json`); laju Poisson (`laju.json`); peluang (`peluang.json`); susulan (`model_susulan.json`); model guncangan GMPE+GMICE (`model_guncangan.json`, `public/gempa/guncangan.js` dan `scripts/gempa/guncangan.py`); kerusakan dan korban HAZUS + kalibrasi (`public/gempa/kerusakan.js`, `kalibrasi_kerusakan.json`); Vs30 (`vs30.bin`), sesar GEM (`sesar.geojson`), batas lempeng PB2002; bahaya InaRISK per kecamatan (`inarisk_gempa.json.nilai`, 7.254 kec, 0–1); factsheet gempa besar (`factsheet_gempa.json`) |
| Skenario di layar (`public/gempa/sim.js:24-26`) | Megathrust selatan Jawa **M8,5**; Mentawai **M8,8**; selatan Bali–Sumba **M8,3** (kedalaman 25 km, jejak dari PuSGeN 2017); semua sesar aktif GEM; titik bebas; gempa nyata terkuat 7 hari |
| Metrik (di peramban, tidak disimpan) | MMI per kecamatan; jiwa per kelas MMI; rumah rusak berat/sedang/ringan dan korban jiwa `[rendah, tengah, tinggi]` (`GempaKerusakan.taksir` → `{rb, rs, rr, jiwa, rumah}`); sekolah terpapar; tsunami (lihat 1.6) |
| Paparan statis | `banjir/data/dampak_gempa.json`: penduduk per kelas bahaya InaRISK gempa. Nasional `tinggi` 39.347.196 jiwa; Jabar 11.681.684; DIY 2.263.714; Jatim 1.234.471 |
| Validasi | `model_guncangan.json.kinerja_uji.status` = **"belum_diuji"** (belum ada arsip Dirasakan BMKG). Kalibrasi korban: `kalib` 3,0586 dari `n` 8 gempa kerak, `faktor_loo` 5,341; Yogya 2006 model 555 lawan 5.700; korban pengamatan "ditulis dari ingatan" (catatan berkas). A: tidak layak untuk gempa nyata (RINGKASAN §2.12: salah tebak jenis sumber di kedalaman 15–50 km). Indeks risiko gempa buatan sendiri (`gempa/data/risiko.json`): A tidak layak, harus dibuang (§2.13). Laju M6+: layak dengan catatan. Peluang M7+ dangkal 12 bulan: **G** di uji balik (harapan 15,8, nyata 8; `.claude/ilmu-agent/gempa.md` 19 Okt) |

### 1.6 Tsunami (bagian modul gempa)

| Butir | Isi |
|---|---|
| Data & simulasi | `public/gempa/tsunami.js` (waktu tiba c = √(gh), tinggi indikatif empiris, stepper air dangkal linear), batimetri ETOPO 2022 3′ (`batimetri.bin`) |
| Keluaran | `Tsunami.waktuTiba(...)` → `{menit, pantai, perKab, rupture}`; tinggi indikatif per pantai. **Tidak ada genangan darat, luas terdampak, atau jiwa** |
| Validasi | Hanya invarian fisik (`scripts/gempa/uji_js_tsunami.py`). Tidak ada uji dengan run-up historis. A: tidak layak di laci gempa nyata (§2.11). Bahaya tsunami InaRISK dibuang (`bahaya_meta.json.dibuang`: hanya 39 dari 7.274 titik bernilai). IRBI kolom `tsunami` ada untuk 273 kab |

### 1.7 Gunung api

| Butir | Isi |
|---|---|
| Data & simulasi | Status MAGMA/PVMBG (`banjir/data/gunungapi_status.json`); KRB PVMBG 2018 (`gunungapi/data/paparan_geo.json`); paparan per gunung (`paparan.json`: 30 gunung, `cincin` 3/5/10/15 km dan `zona.III/II/I.penduduk/sekolah/faskes/desa`, jalur evakuasi OSM); simulasi erupsi (`public/gunungapi/simulasi.html`: LAHARZ lahar, awan panas H/L, abu `abu_model.js`, evakuasi `sim_tanggap.js` dengan Rp biaya); peluang abu (`abu_peluang.json`) |
| Skenario | "Setara Merapi 2010" (V 10 juta m³, H/L 0,15): awan panas model 17,6 km; sekitar **90.000 jiwa** di area sapuan tanpa evakuasi (dicatat di `public/gunungapi/sim.js:355`, dihitung lewat `scripts/gunungapi/cek_merapi2010.mjs` pada 22 Okt) lawan 367 meninggal nyata. Skenario bawaan (V 1 juta m³) sekitar 1.000 jiwa |
| Contoh angka | `paparan.json` merapi: `cincin` 15 km 570.744 jiwa; KRB III 34.582, II 85.093, I 35.334. Semeru KRB III 9.304. Agung 15 km 338.747. Kelud 15 km 340.812 |
| Validasi | Status PVMBG: A layak. Model abu: n = 4, 25% benar (A tidak layak). Paparan KRB: hitungan overlay, tanpa uji. Merapi 2010 dipakai sebagai pembanding realisme, bukan uji lolos/gagal. `gunungapi/data/risiko.json` (indeks buatan sendiri, bobot 50/30/20): tanpa uji |

### 1.8 Cuaca ekstrem

| Butir | Isi |
|---|---|
| Data & simulasi | `banjir/data/cuaca_*.json` (prakiraan, peluang, gelombang, siklon, kec, verifikasi, risiko_bnpb); `public/cuaca/simulasi.html` (siklon lebih dekat, intensitas naik; `sim_dampak.js`: kerapuhan atap/pohon bentuk HAZUS, gelombang badai Holland, limpasan SCS-CN; Rp perlakuan dari `param_banjir.json`) |
| Keluaran | `cuaca_dampak.json.terpapar.<hari>.penduduk` (contoh 17 Okt: 1.698.278). IRBI cuaca_ekstrem per kab (`cuaca_risiko_bnpb.json.indeks_cuaca.baris`, 508 kab, seri 2015–2025). Sarana InaRISK per kelas: nasional penduduk kelas tinggi 25.786.566 (`sarana_cuaca.nasional.penduduk[3]`) |
| Validasi | Status kecamatan: tidak pernah diuji balik (A tidak layak, §2.19). Nowcast dan peringatan BMKG: A layak. Simulasi: parameter atap/pohon ditandai ASUMSI |

### 1.9 Kekeringan

| Butir | Isi |
|---|---|
| Data & simulasi | SPI/status sel 0,5° (611 sel; `public/data/kekeringan_grid.json`, `kekeringan_wilayah.json` prov/kab, `kekeringan_hth.json`); neraca FAO-56 (`kekeringan_neraca.json`, Penman-Monteith, TAW 65–125 mm, 180 hari); cekaman padi (`kekeringan_padi.json.kab[*].gagal/turun25/turun_p90/selisih`); SEAS5 51 anggota (`banjir/data/kering_peluang.json`, SPI-3 bulan +1..+3); hindcast (`kekeringan/data/hindcast.json`); embung OSM (`embung.json`, 3.550 objek); tutupan (`tutupan.json`); IRBI kekeringan (`kekeringan_resmi.json.irbi`); simulasi `public/kekeringan/simulasi.html` (bak FAO-56 per sel, irigasi bisa diatur) |
| Contoh | `kekeringan_wilayah.json.prov.32`: `jiwa` [51.002.450; 51.002.450; 1.250.553], `spi3` −2,16. `dampak_kekeringan.json.terpapar.jiwa_siaga` 147.857.658 |
| Validasi | `kekeringan_ujibalik.json.kejadian.vonis.layak` = **false** (POD 0,10; FAR 0,99). Prospek ENSO: BSS −0,019 (tidak lebih baik dari klimatologi). SEAS5: "belum teruji balik". A: tidak layak (§2.14: bertentangan dengan PDKM BMKG; Jatim BMKG 36 Awas, platform 0; data tanah hanya 12 dari 611 sel). Padi: "BUKAN data puso", irigasi tidak dimodelkan |

### 1.10 Kualitas udara / asap

| Butir | Isi |
|---|---|
| Data & simulasi | CAMS via Open-Meteo (`public/udara/data/prakiraan.json`, `peluang.json`); kerentanan (`rentan.json`); atribusi dan asal asap (`atribusi.json`, `asal.json`); PLTU (`pltu.json`); simulasi dispersi Lagrangian di peramban (`public/udara/sim/model.js`, `sim.js`); OMC (`omc_*.json`) |
| Keluaran | `public/data/udara_dampak.json.terpapar.<hari>.penduduk` (15 Okt: 120.043.681, ambang PM2,5 55,4). Simulasi: kontribusi per sumber ke kota |
| Validasi | METAR 27 bandara: 44% hari berasap tertangkap, 16% tandanya keliru (A: boleh sebagai batasan). "89,5 juta jiwa menghirup udara tidak sehat": A tidak layak (§2.15) |

### 1.11 Abrasi / pesisir

| Butir | Isi |
|---|---|
| Data | `public/pesisir/data/abrasi.json`: Landsat MNDWI + Otsu, transek 1 km, 1988–2025, 167 transek di **5 situs**. Laju median (m/th): Sayung (Demak) −16,9 (12 transek abrasi nyata); Bekasi −3,3; Subang −2,4; Pekalongan −2,0; Indramayu +0,1. IRBI `abrasi` 326 kab (`cuaca_risiko_bnpb.json.indeks_gelombang`); bahaya InaRISK gelombang/abrasi per kecamatan (`bahaya.json.kec[*].gelombang`) |
| Validasi | Belum dikoreksi pasang surut (`abrasi.json.catatan[0]`). Tanpa uji lapangan. Tidak ada jiwa, bangunan, atau Rp |

### 1.12 Subsiden (dan air tanah)

| Butir | Isi |
|---|---|
| Data | `public/banjir/data/subsiden_literatur.json` (label "hipotesis: kutipan literatur"): Jakarta (Abidin 2011: 1–15 cm/th), Semarang (sampai ±19 cm/th), Pekalongan (maks 16 cm/th), Surabaya (LOS −40..+30 mm/th), Medan; Cirebon belum terverifikasi. `scripts/banjir/subsiden.py` siap (LiCSBAS → per kecamatan, dengan gerbang pola), tetapi **belum pernah dijalankan** (`scripts/banjir/RISET-SUBSIDEN.md`: diblokir izin menjalankan kode LiCSBAS) |
| Air tanah | **Tidak ada.** Yang ada hanya GWETROOT NASA POWER (kelembapan zona akar) di `scripts/kekeringan/ambang2.py` dan `neraca.py` |

### 1.13 Lintas bencana

- Indeks risiko kecamatan harian: `public/banjir/data/risiko_kecamatan.json` (`scripts/bnpb/risiko.py`; 7.262 kec; risiko = 100 × bahaya × keterpaparan × (1 − 0,3 × kapasitas); `ringkas.per_kelas`: Sangat tinggi 204, Tinggi 1.875). Label wajib: "indeks komposit, belum diuji balik". Uji balik komponen statis (`risiko_ujibalik.json.vonis.lulus` = **false**): banjir/longsor tidak lebih baik dari peringkat penduduk; gempa lebih baik dari penduduk, tetapi tidak lebih baik dari riwayat.
- Paparan bangunan Open Buildings v3: `data/terkunci/bangunan/terpapar.json` (terkunci, bukan publik). `cakupan_provinsi` = **["62"] saja** (Kalteng; 1.017.481 bangunan). `lengkap_nasional`: false. Ubin mentah ada di `data/raw/bangunan/` (±21 ubin L6).
- Replay banjir memakai jejak gedung (1.168.967 gedung di kisi Jabodetabek, `maret2025.json.gedung`).

---

## 2. Data indeks risiko resmi

| Sumber | Berkas | Tahun | Tingkat | Kolom |
|---|---|---|---|---|
| IRBI BNPB lengkap (InaRISK `apiv4/data-irbi-full`) | `data/raw/inarisk/irbi.ndjson` (**tidak dilacak git**, diambil 18 Okt) | 2015–2025 | 514 kab/kota (`pcode` 4 digit Kemendagri) | `banjir, longsor, kekeringan, cuaca_ekstrem, abrasi, gempabumi, tsunami, karlahut, gunungapi, total, fix_values, status` (2025: Sedang 345, Tinggi 169), `pembanding` |
| IRBI cuaca + abrasi | `public/banjir/data/cuaca_risiko_bnpb.json` (`indeks_cuaca`, `indeks_gelombang`) | seri 2015–2025 | 508 / 308 kab | `kode, nama, prov, seri_2015_2025, status_irbi_total_2025` |
| IRBI kekeringan | `public/data/kekeringan_resmi.json` kunci `irbi` (`scripts/kekeringan/resmi.py`) | 2015–2025 | kab | skor per tahun, `irbi_ambang_tinggi` |
| Bahaya InaRISK raster 100 m | `bahaya.json` (banjir, bandang, longsor, kering, gelombang); `inarisk_gempa.json`; `public/data/inarisk.json` (karhutla per kompleks) | statis | kecamatan (pusat + kisi 3×3, nilai maks) | indeks 0–1 |
| Infra-risk InaRISK (cuaca) | `cuaca_risiko_bnpb.json.sarana_cuaca` | – | nasional + 295 kab | penduduk, sekolah, faskes, bandara, pelabuhan per kelas aman/rendah/sedang/tinggi |
| DIBI BNPB | `public/banjir/data/kejadian.json` | `kejadian_dibi` 11.374 baris **2023-10-14 s.d. 2026-10-12** (hanya hidrometeorologi: banjir 5.104, cuaca 4.030, longsor 1.699, kering 288, gelombang 111, rob 27); `kab` hitungan per jenis 2008–2026; `nasional` 2010–2024; `prov` 2024–2025 dengan meninggal | kab | `tanggal, jenis, prov, kab, meninggal, terdampak, mengungsi` |
| Seri gempa | `factsheet_gempa.json` (korban gempa besar dari USGS/BNPB, dicocokkan 19 Okt) | | per kejadian | |
| Seri gunung api | `banjir/data/dampak_gunungapi.json` (BNPB tahunan) | | | |

Catatan pakai IRBI (RINGKASAN §3, A layak): skala 2025 tidak sebanding dengan 2015–2024. `status` adalah kelas total semua bahaya, bukan kelas per bahaya. IRBI jangan dipakai untuk memeringkat, karena banyak kab bernilai sama. Untuk Jawa (119 kab), status 2025: 118 Sedang dan 1 Tinggi, jadi status total hampir tidak membedakan; pakai skor per bahaya. Lisensi InaRISK tidak tertulis: cukup tulis "Sumber: InaRISK BNPB".

---

## 3. Data Jawa untuk kajian air

| Komponen | Ada? | Berkas | Resolusi / cakupan Jawa | Catatan |
|---|---|---|---|---|
| Hujan harian + prakiraan 10 hari | Ya | `banjir/data/hujan.json` | 0,25°, 211 sel di Jawa | Open-Meteo; jendela bergulir, bukan arsip |
| Ansambel hujan | Ya | `hujan_ansambel.json`, `peluang.json` | titik 1°, agregat kab | ECMWF IFS 51 anggota |
| SPI / HTH | Ya | `public/data/kekeringan_grid.json`, `kekeringan_hth.json`, `kekeringan_wilayah.json` | 0,5°, agregat kab | HTH maks 93 hari (A: salah dibanding BMKG Bantul 141 hari) |
| SPI musiman | Ya | `kering_peluang.json` | provinsi/kab | SEAS5, belum diuji balik |
| Neraca FAO-56 | Ya | `kekeringan_neraca.json`, simulasi `kekeringan/simulasi.html` | 0,5° | ET0 PM; tanah IFS 0 sel |
| Cekaman padi | Ya | `kekeringan_padi.json` | kab | bobot penduduk, bukan luas sawah; tanpa irigasi |
| Kelembapan tanah | Lemah | `hujan.json.grid[].sm` (lapis 3–27 cm), `public/data/tanah.json` | – | audit: data tanah hanya 12 dari 611 sel |
| Sungai | **Tidak di Jawa** | `sungai.json` (GloFAS) | 0 dari 192 titik di Jawa | ambang median > 30 m³/s; replay Jabodetabek punya parameter Ciliwung/Kali Bekasi |
| Rob | Ya | `rob.json` | 51 titik Jawa + DIBI rob | model bertentangan dengan BMKG; pakai baris BMKG |
| Abrasi | Sebagian | `pesisir/data/abrasi.json` | 5 situs Pantura (Demak, Pekalongan, Indramayu, Subang, Bekasi) | tanpa koreksi pasang |
| Subsiden | **Tidak diukur** | `subsiden_literatur.json` | kutipan Jakarta, Semarang, Pekalongan, Surabaya | `subsiden.py` belum dijalankan |
| Air tanah | **Tidak ada** | – | – | – |
| Embung / waduk | Kasar | `kekeringan/data/embung.json` | jumlah objek OSM per kab | bukan volume |
| Batas wilayah | Ya | `public/geo/provinsi.json`, `public/geo/kabupaten/{31..36}.json` (properti `kab`), `public/geo/kecamatan/*.json` | kab/kec | |
| Penduduk | Ya | `public/data/penduduk.json` (WorldPop R2025A 2026: `grid` 0,25°, `kec` 7.117 kec, total 286.820.254) | kec | grid halus 1 km per gunung di `gunungapi/data/pop/` |
| Bahaya InaRISK banjir/kering/longsor/gelombang | Ya | `bahaya.json` | kec | statis |
| IRBI banjir/kekeringan/abrasi per kab Jawa | Ya | `irbi.ndjson` | 119 kab | perlu diterbitkan dari raw |
| Kejadian DIBI Jawa | Ya | `kejadian.json.kejadian_dibi` | 5.071 baris (2023-10 s.d. 2026-10) | |

---

## 4. Celah dan cara paling jujur mengisinya

| Metrik diminta | Status | Usul pengisian dari data yang ada (asumsi disebut) |
|---|---|---|
| **Jiwa terpapar skenario terburuk per kab** | Ada mesinnya, belum dijalankan | Jalankan mesin peramban di node (pola `cek_merapi2010.mjs`): gempa 3 megathrust (M8,5 / 8,8 / 8,3) → jiwa per MMI per kab; Merapi setara 2010 (dan gunung lain dengan KRB) → jiwa KRB/sapuan; banjir: penduduk kecamatan dengan bahaya InaRISK banjir ≥ 0,67 (`bahaya.json` × `penduduk.json`); longsor dan abrasi idem. Label: "terpapar = penduduk di zona bahaya tanpa evakuasi", bukan korban |
| **Korban jiwa** | Hanya gempa (galat LOO ±5,3×), audit tidak layak | Jangan pakai angka titik. Pakai **rasio historis** korban/terpapar dari DIBI dan factsheet gempa (contoh Merapi 2010: 367 meninggal / ±90.000 tersapu ≈ 0,4% dengan evakuasi), dan sajikan sebagai rentang orde besaran: korban = terpapar × [rendah, tinggi] laju fatalitas kejadian analog. Untuk gempa, tampilkan `kerusakan.js` sebagai pita `[rendah, tengah, tinggi]` dengan catatan "meleset ±5 kali". Rujukan pembanding yang lebih kuat: PAGER USGS (usulan audit) |
| **Luas terdampak** | Sebagian | Banjir: luas sel kecamatan berbahaya InaRISK (ha). Gunung api: luas KRB (`paparan_geo.json`). Gempa: luas isoseismal MMI ≥ VI dari `guncangan.js`. Abrasi: ha hilang per transek × panjang pantai situs. Tsunami: **tidak ada genangan**; cukup panjang pantai dan kab dengan waktu tiba < 30 menit dari `tsunami.js` |
| **Bangunan terdampak** | Open Buildings hanya Kalteng | Opsi jujur: (a) ambil ubin Open Buildings untuk Jawa dan zona skenario (skrip `scripts/umum/bangunan.py` + `paparan_bangunan.py` sudah ada); (b) sementara itu, rumah = jiwa / 3,9 (`kerusakan.js JIWA_PER_RUMAH`), dengan label "perkiraan dari penduduk" |
| **Kerugian rupiah (materiil)** | Tidak ada, kecuali karhutla (tidak layak) | Rumah rusak × stimulan BNPB (`param_banjir.json.param.stimulan_rumah_rb/rs/rr` = Rp 60/30/15 juta; skema lama 50/25/10) = **batas bawah biaya rehab rumah**, bukan kerugian ekonomi penuh. Sandingkan dengan pembanding DaLA yang ada di berkas yang sama: banjir Jabodetabek 2007 Rp 5,2–8,8 T per kejadian; rob Semarang Rp 0,55–2,8 T. Untuk kerugian penuh perlu PDRB/aset per kab: **belum ada di repo** |
| **Kerugian imateriil** | Tidak ada | Tiga pilihan, semuanya ditandai "pilihan kebijakan": (1) nilai statistik nyawa `nilai_nyawa_statistik` Rp 13,9 M (rentang 6–15,7 M) × korban; (2) hari-pengungsi × `biaya_pengungsi_hari` Rp 35.000 × `hari_mengungsi` 7 (3–30); (3) sekolah dan faskes terpapar (data ada untuk 9 provinsi saja; `dampak.json.cakupan.prov_sekolah`). Lebih jujur bila disajikan sebagai indikator non-rupiah (jiwa mengungsi, sekolah terganggu, hari layanan hilang) |
| **Sebaran risiko pulau/prov/kab** | Data ada, belum diolah | Terbitkan IRBI 2025 per bahaya dari `irbi.ndjson` (9 kolom × 514 kab), lalu agregasi ke provinsi dan pulau dengan bobot penduduk. Ini satu-satunya indeks risiko yang divonis layak oleh audit |
| **Korban gempa per kab** | Tidak ada | Bersumber dari skenario di atas (pita lebar). Riwayat korban per kab: DIBI kab di repo hanya hidromet, tidak ada gempa; perlu tarik DIBI gempa |
| **Skenario banjir terburuk** | Peluang ECMWF hanya ±15 hari ke depan | "Terburuk" yang jujur: hujan p90 ansambel atau hujan periode ulang dari arsip ERA5 yang sudah dipakai uji balik, lalu dimasukkan ke simulasi genangan untuk DAS terpilih (kisi 24 km, bukan seluruh Jawa). Replay Mar 2025 menjadi contoh kasus nyata, dengan catatan: tidak ada uji kedalaman |
| **Skenario kekeringan terburuk** | Ada analog | Tahun analog 2015 (`kekeringan_ujibalik.json.aturan.temuan.puncak.2015` = 77,9% sel SPI-3 ≤ −1 pada Okt) dimasukkan ke neraca FAO-56 dan cekaman padi per kab. Status: gunakan PDKM BMKG, bukan status platform |
| **Subsiden Jawa** | Tidak diukur | Kutip `subsiden_literatur.json` sebagai literatur, per kota. Mengukur sendiri berarti menjalankan LiCSBAS (butuh keputusan izin pemilik, RISET-SUBSIDEN.md). Jangan menurunkan angka per kab dari kutipan kota |
| **Air tanah** | Tidak ada | Tulis sebagai celah data; rujuk data CAT Badan Geologi (di luar repo) |
| **Debit sungai Jawa** | 0 titik | Tulis sebagai celah; untuk Ciliwung–Bekasi pakai parameter replay. Perluasan GloFAS ke Jawa mungkin dengan ambang debit lebih rendah (kuota Open-Meteo ±760 panggilan per titik) |

---

## 5. Peta web dan render PNG

**Halaman yang bisa dipakai atau ditambah**
- `public/gunungapi/simulasi.html`, `public/kekeringan/simulasi.html`, `public/cuaca/simulasi.html`: halaman simulasi mandiri. Gempa, banjir, karhutla, dan udara memakai tab `sim` atau `simulasi` di `index.html` modulnya (`public/bencana.json`). Replay banjir: `public/banjir/replay.html`.
- `public/bnpb/risiko.html` + `risiko.js`: peta risiko kecamatan berbentuk SVG gambar sendiri (tanpa CDN, karena CSP), dimuat per provinsi. **Calon terbaik** untuk peta kajian per kab/kec: tinggal mengganti sumber datanya dengan JSON kajian.
- `public/peta_kab.js`: overlay kabupaten di MapLibre (karhutla), dengan pola memuat `geo/kabupaten/<prov>.json` saat dibutuhkan.
- `public/semua/index.html`: halaman lintas bencana.

**Render ke PNG untuk dokumen (pola yang sudah dipakai)**
- `data/laporan-bnpb/harian-2026-10-23/peta.mjs` dan `data/laporan-bnpb/satelit-2026-10-2{1,2,3}/peta.mjs`: GeoJSON (`public/geo/provinsi.json`) diubah menjadi SVG ekuirektangular di node, lalu di-screenshot Playwright Chromium headless (`deviceScaleFactor` 1,5, `omitBackground`). Playwright diimpor dari path absolut `/Users/alfatehanseptianta/Developer/worth-it/node_modules/playwright` dengan `chrome-headless-shell` di cache ms-playwright, jadi **tidak ada di package.json repo ini**. Pola ini cukup disalin untuk peta per kab Jawa (`geo/kabupaten/3x.json`).
- `tests/bnpb/_peramban.mjs`: Chrome headless lewat CDP tanpa dependensi. Bisa dipakai untuk memotret halaman simulasi yang sudah jalan (misalnya `risiko.html`) bila ingin persis seperti tampilan web.
- `scripts/gunungapi/cek_merapi2010.mjs`: pola menjalankan mesin simulasi peramban di node (butuh `sharp` dan jaringan untuk ubin terrarium). Ini pola untuk menghasilkan angka skenario tanpa membuka layar.

---

## 6. Ringkas: yang boleh dikutip apa adanya di kajian

- IRBI BNPB per bahaya per kab (2025; sebut skalanya), bahaya InaRISK per kecamatan, dan paparan penduduk per kelas bahaya (`dampak_gempa.json`).
- Status PVMBG, KRB, dan penduduk KRB/cincin per gunung (`paparan.json`).
- DIBI 2023–2026 (hidromet, per kab) dan seri tahunan BNPB 2010–2024.
- Laju gempa M6+ (`laju.json`), dengan selangnya.
- Abrasi 5 situs, dengan label "belum dikoreksi pasang".
- Hasil skenario model (gempa, Merapi, genangan) hanya sebagai "simulasi skenario Pantau Bencana, belum divalidasi", disertai pita dan galat yang tercatat.
