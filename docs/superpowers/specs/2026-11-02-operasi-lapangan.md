# Operasi Lapangan: renlap malam, laporan pagi, nilai efektivitas

Tanggal: 2 November 2026. Status: DISETUJUI pemilik 2 Nov 2026 ("Mulai OP-1"): K1 halaman sendiri `/bnpb/operasi-lapangan`
berjudul "Operasi", usulan K2–K7 di bagian 10 berlaku.
Dasar: bahan WA grup satgas 1–2 Nov 2026 (laporan 6 provinsi + Kaltim + IKN, MVT plan/departure, temuan patroli per titik,
METAR, grafik jarak pandang BMKG Kalbar, foto bergeotag), histori `wa_masuk` produksi 29–30 Okt 2026 (33 pesan, termasuk
Lapsit Posko OMC Koopsudnas hari ke-10 dan rekap Satgas 29 Okt).

## 1. Tujuan

Satu tab **Operasi** yang menangkap semua operasi darat dan udara di lapangan, dalam satu siklus harian:

1. **Malam (H-1):** sistem menyusun **renlap usulan** per base ops: target patroli, target water bombing (WB), catatan jarak pandang dan sumber air.
2. **Pagi–siang (H):** rencana terbang, keberangkatan, dan temuan pilot yang masuk lewat WA ditangkap otomatis.
3. **Malam (H):** sistem **menilai** efektivitas per base, per pesawat, dan per provinsi, lalu nilai itu memperbaiki renlap berikutnya.

## 2. Batas wewenang

- Operasi udara ada di bawah komando TNI AU (Koopsudnas, Lanud setempat) dan operator yang dikontrak BNPB. **BNPB tidak memerintah.**
  Renlap dari sistem adalah **usulan lokasi** ("tempat-tempat yang perlu dilihat"), bukan perintah terbang.
- Bahasa renlap: "Usulan target", bukan "Perintah". Keputusan terbang tetap pada PIC dan komando.
- Angka hotspot, firespot, luas terbakar, dan luas belum padam di layar **hanya dari sistem sendiri** (aturan pemilik 26 dan 29 Okt,
  gerbang `gerbang-luas-karhutla`). Luas dari pilot atau laporan provinsi disimpan sebagai **klaim** berlabel sumber, tidak pernah dijumlah ke angka sistem.
- Pergerakan armada adalah informasi operasional: **khusus staf**, tidak tayang di halaman publik, tidak masuk gambar bagikan.
- Nama kru (PIC, SIC, FE, HLO) **tidak disimpan**. Yang disimpan registrasi pesawat dan operator.

## 3. Kategori data

| # | Kelompok | Isi | Contoh bahan | Sumber | Sudah ada di sistem |
|---|----------|-----|--------------|--------|---------------------|
| D1 | Base ops | Bandara/lanud, provinsi, koordinat, VOR rujukan | Lanud Supadio (PNK), Syamsudin Noor (BDJ) | Laporan, MVT | **Belum** |
| D2 | Armada | Registrasi, tipe, peran (patroli/WB/OMC), operator, pemilik (BNPB sewa, TNI AU, TNI AD), base, status harian | VN-8416 Mi-17-1V PT BMT, KTG, serviceable | Laporan provinsi, gelar armada | Sebagian: `armada[]` di laporan-karhutla (per provinsi per hari) |
| D3 | Rencana terbang | Misi, rute, target berkoordinat (DMS + radial/jarak dari VOR), ETD, EET, IL/FSC | "MVT PLAN ... Target Area Pasak ... R 095 D 13 Nm" | Pesan operator | **Belum** |
| D4 | Pergerakan | Mesin hidup, ATD, ETA, kembali, jam terbang, BBM | "MVT DEPARTURE ... ATD KTG 01:28 Z" | Pesan operator | **Belum** |
| D5 | Temuan patroli | Titik, koordinat, status (FS berasap, berasap tipis, HS clear, target clear), luas klaim, jam | "DITEMUKAN FS 1 BY PK-RTQ ... FS BERASAP ±0.2 HA" | Pesan pilot | **Belum** |
| D6 | Hasil WB | Sortie, kali WB, liter, luas terbakar/water drop/padam (klaim), FS | "Blackhawk ZK-HKU sortie 1, 44X WB" | Laporan provinsi | Ada: `sortie[]` laporan-karhutla |
| D7 | OMC | Pesawat, sortie, bahan semai kg, area, jam | "A-2104 1 sortie 800 kg NaCl" | Laporan, Lapsit Posko OMC | Ada: `/admin/omc` + `omc_hasil.json` |
| D8 | Operasi darat | Lokasi desa/kec, personel per unsur, alat, luas klaim, status padam | "Desa Saka Kajang, 4,96 ha, BPBD 6 // TNI 4" | Laporan provinsi | Sebagian: tugas api + `/lacak` (penugasan), lk_fs |
| D9 | Kekuatan personel | Potensi vs dikerahkan per unsur | Kalteng 16.387 (potensi), Sumsel 540 (turun hari itu) | Laporan provinsi | Ada di laporan-karhutla; definisi belum seragam |
| D10 | Kondisi udara | ISPU PM2,5 per stasiun, METAR, jarak pandang per jam | Palangka Raya 300, WAOO 9999 | KLH/DLH, BMKG | Ada: modul udara, `public/data/metar.json` |
| D11 | Cuaca | Hujan, angin, awan potensial OMC | "Hujan ringan Muaro Jambi" | BMKG | Ada: modul cuaca |
| D12 | Hambatan & upaya | Air, akses, gambut, angin, jarak pandang, alat rusak | "Sumber air jauh", "bucket bermasalah" | Laporan provinsi | Ada: `HAMBATAN` laporan-karhutla |
| D13 | Dampak sosial | Sekolah, penerbangan sipil, penegakan hukum | "SE 9/2026 PJJ kondisional", "21 penindakan" | Laporan provinsi | Sebagian |
| D14 | Dokumentasi | Foto bergeotag (waktu, koordinat, arah, registrasi di stempel) | Foto PK-RTQ 09.37 Martapura Barat | Foto WA | Generator `foto.py` (deck saja) |
| D15 | Angka api | HS, FS, luas, belum padam | — | **Sistem sendiri** | Ada |
| D16 | Umur api | Hari sejak titik pertama kali terbakar, ditulis `H2`, `H4`, `H22` di laporan | "H22 ± 8 Ha Air Hitam Besar", "H4 ± 3 Ha Pasak" | Laporan Kalbar (patroli + WB) | **Belum**; bisa dihitung ulang dari hotspot sistem |
| D17 | Bukti WB | Tiga foto bergeotag per sortie: *Before WB*, *Water Source*, *Water Drop* | VH-L6T: sumber 0°7'20"S 109°35'10"E, jatuh 0°5'57"S 109°35'32"E | Pesan operator + foto | **Belum** |
| D18 | Sektor patroli | Pembagian sektor per base dan rujukan VOR | Sumsel: Sektor 1–6 dari VOR PLB; rute 16 titik, 470 Nm, EET 4.20 | Rencana patroli Subsatgas Udara Sumsel | **Belum** |
| D19 | Bucket dan volume | Liter per kali WB per tipe heli | UH-60L dan Mi-17-IV: 4.000 liter per WB (laporan Kalbar) | Laporan provinsi | **Belum**; dipakai M5 |

## 4. Base ops saat ini (dari bahan 27 Okt–2 Nov)

Histori di `wa_masuk` hanya 29–30 Okt (33 pesan). Bot belum ada di grup satgas, jadi pesan pilot belum pernah tertangkap (bagian 10, K5).

| Base | Kode | Provinsi layanan | Armada tercatat | Peran |
|------|------|------------------|-----------------|-------|
| Lanud Supadio, Pontianak | PNK/WIOO | Kalbar utara | PK-FPA (Bell 206 B3, Falcon, patroli), VH-L6T (UH-60L, Elang, WB), VN-8424 (Mi-172, Gunung Selatan, tidak siap: menunggu kontrak ke-3), H-3217 (NAS-332 Super Puma, TNI AU), HA-5231 dan HA-5228 (Bell 412 EPI, TNI AD), N61AA (29 Okt) | Patroli, WB |
| Bandara Rahadi Oesman, Ketapang | KTG | Kalbar selatan | VN-8416 (Mi-17-IV, BMT, WB), PK-ALE (Bell 206 L4, Alkonost, patroli) | WB, patroli |
| Tjilik Riwut, Palangka Raya | PKY | Kalteng | PK-FPU, PK-KIA, ZK-HKU, UR-CSM, N-814AR, A-1328 | Patroli, WB, OMC |
| H. Asan, Sampit | SMQ | Kalteng (Kotim) | UR-CSN | WB |
| Kuala Pembuang, Seruyan | KLP | Kalteng (TNTP) | PK-DAP, HA-5172, RA-31021, HA-5235 | WB |
| Syamsudin Noor / Lanud SAM | BDJ/WAOO | Kalsel, OMC Kalteng | PK-RTQ, PK-SNK, PK-SNL, A-2904, A-2105, A-2107, A-2119, A-1328, RA-22834, N261BE, HA-5234, VH-HGM | Patroli, WB, OMC |
| SMB II / Lanud SMH Palembang | PLM | Sumsel | PK-RTY, PK-IKC, PK-SNP, A-2117, A-2104, A-1319, RA-22747, RA-22477, RA-22279, UR-VBC, UR-CBH | Patroli, WB, OMC |
| Sultan Thaha, Jambi | DJB | Jambi | PK-WSA, PK-ALA, RA-22840, N-274TH, VN-8414 | Patroli, WB, OMC |
| Lanud Roesmin Nurjadin, Pekanbaru | PKU/RSN | Riau | PK-WSD, RA-22729, N5193Y, RDPL-34194, N4875A | Patroli, WB |

Di luar daftar (rekap 29 Okt, base belum disebut): 1 WB di IKN (reposisi dari Kalsel), 1 patroli + 1 WB di Jawa Timur,
1 + 1 di Lampung (reposisi dari Sumsel), 1 patroli Papua Selatan, 1 WB Papua Barat Daya.
Koordinat base dan VOR diisi dari data bandara (AIP/OurAirports), bukan ditebak; diperiksa pemilik sebelum dipakai.
Rujukan VOR yang terlihat: PNK (Kalbar), KTG (Ketapang), BDM (Kalsel, laporan PK-RTQ), PLB (Sumsel; dari pasangan Kayu Agung R178 D12 dan
Air Sugihan R070 D48, PLB berada di sekitar SMB II). Sumsel sudah membagi wilayah patroli ke Sektor 1–6 dari PLB; renlap untuk base itu
memakai sektor yang sama, bukan sektor buatan sendiri.
VOR tidak selalu di bandara: dari pasangan koordinat + R/D di pesan 2 Nov (Kubu R180 D22, Pasak R095 D13), VOR PNK berada sekitar
-0,08 / 109,37 (kota Pontianak), sekitar 8 km utara Supadio. Tiap VOR dicek silang begini terhadap minimal tiga pesan sebelum dipakai renlap.
Terverifikasi OurAirports navaids (2 Nov): PNK -0,07915 / 109,375; PKY -2,2435 / 113,95; BDM -3,4368 / 114,731; PLB -2,87859 / 104,653;
JMB -1,63604 / 103,645; PKU 0,42559 / 101,441. Hitung ulang PNK ke Pasak: radial benar 095,7°, 13,2 Nm, cocok dengan pesan (R095 D13).
VOR KTG tidak ada di OurAirports; dicari dari AIP atau dihitung balik dari pesan VN-8416 (Air Hitam Besar R145 D74).

## 5. Evaluasi awal (1–2 Nov), dasar metrik

1. **Target patroli banyak yang basi.** Pagi 2 Nov: H-3217 3 berasap dari 6 berstatus, PK-RTQ 2 FS dari 4, PK-FPA 0 dari 2.
   Foto Sungai Asam dan Penggalaman hanya bekas bakar. Target diambil dari hotspot lama, jadi metrik M1 dan renlap dari lintasan terakhir.
2. **Titik menahun.** Pasak, Sungai Ambawang, Kubu Raya sudah jadi target WB sejak 28 Okt (VN-8424) dan masih berasap 2 Nov (VH-L6T). Jadi metrik M4 (padam bertahan).
3. **Armada menganggur di provinsi sepi.** Riau 4 WB serviceable tanpa terbang, Sumsel UR-CBH serviceable tanpa terbang;
   Kalteng TNTP sisa 422,79 ha / 60 FS dengan laju padam 8,7 ha/hari; Kaltim 14 FS tanpa operasi udara. Jadi metrik M6 (utilisasi) dan panel ketimpangan.
4. **Efisiensi WB timpang.** Jambi UH-60 165 kali WB untuk 1,5 ha (perlu dicek); Sumsel 48 kali untuk 17 ha. Jadi M5 (liter per ha), dengan penanda pencilan.
5. **Jarak pandang mengunci operasi udara Kalteng** (ISPU Palangka Raya 300, Buntok/Muara Teweh 3 km). Renlap wajib memuat prakiraan jarak pandang per target.
6. **Mutu laporan rendah.** Kalteng HS 13+265+5 ≠ 235; FS darat 6 vs 3 di dua bagian; Kalsel 15,1+19,5 vs 5,6+29; Kaltim kumulatif 10.734 ha vs indikatif 2.715 ha;
   hambatan OMC Kalsel masih "Bulan Oktober" pada laporan November. Jadi metrik M8 (mutu laporan) dan cek MERAH/KUNING laporan-karhutla dipakai ulang.

7. **Heli WB menganggur menunggu arahan.** Kalbar 1 Nov: H-3217, HA-5231, HA-5228 serviceable seharian dengan status
   "standby arahan menunggu hasil patroli", sementara patroli PK-ALE dan PK-FPA menemukan 10 titik (Ketapang dan Kubu Raya).
   Jeda antara temuan patroli dan penugasan WB adalah celah yang paling langsung ditutup renlap (metrik M7).
8. **Api tua tidak padam.** Air Hitam Besar, Kendawangan sudah H22 (±8 ha), di-WB 33 kali pada 1 Nov dan diulang 2 Nov.
   Pasak, Sungai Ambawang H4 dan masih berasap 2 Nov. Renlap memberi bobot umur api (D16) dan menandai titik yang butuh operasi darat, bukan WB saja.
9. **Sumber air dekat.** Foto bukti 2 Nov: jarak sumber air ke titik jatuh sekitar 2,6 km (Pasak) dan 4,6 km (Air Hitam Besar).
   Jarak ini menentukan berapa kali WB per jam, jadi dicatat per sortie (M10).

## 6. Siklus dan aturan renlap

### 6.1 Masukan (semua sudah ada di repo atau dibuat di sini)
- Hotspot FIRMS lintasan terakhir dan 72 jam (`/api/titik`, kluster harian).
- FS terbuka: temuan "berasap" 48 jam terakhir (D5) dan FS sisa laporan provinsi (lk_fs).
- Titik **clear** 48 jam terakhir: dikeluarkan dari target kecuali muncul hotspot baru di radius 1 km sesudahnya.
- Prakiraan jarak pandang/PM2,5 per target (modul udara `prakiraan.py`), METAR base.
- Base dan armada serviceable (D1, D2).
- Sumber air terdekat untuk WB (OSM sungai/danau/embung, sama dengan yang dipakai simulasi).
- Lapisan gambut, kawasan konservasi, permukiman, jalan tol (sudah ada).

### 6.2 Skor target (murni, diuji, tanpa ML)
`skor = hotspot_baru (lintasan terakhir) + menahun (hari berturut terdeteksi) + gambut + dekat permukiman/jalan/kawasan + belum ditangani`
dikurangi `clear terkonfirmasi`. Bobot di satu berkas JSON berlabel **hipotesis**, ditala ulang dari M1 setelah 14 hari data.
`ponytail:` skor aturan tangan, ganti kalibrasi bila M1 dua minggu tidak naik.

### 6.3 Keluaran per base
- Maksimal 8 target patroli berurut tetangga terdekat dari base, dalam radius jelajah (bawaan 120 Nm, diatur per tipe).
- Maksimal 3 target WB (FS terkonfirmasi berasap) dengan jarak ke sumber air.
- Tiap target ditulis dalam **format yang sudah mereka pakai**: nama desa/kec/kab, `S 00° 06' 04"  E 109° 35' 34"`, `R 095 D 13 Nm Fr VOR PNK`.
  Radial magnetik = baringan benar dikurangi deklinasi timur (Indonesia sekitar 0–1°, sementara tetap 0,5° per base, berlabel perkiraan), dicatat di kaki renlap.
- Catatan per target: prakiraan jarak pandang pagi, hotspot terakhir (jam, satelit), status 48 jam terakhir.
- Disusun 20.00 WIB, diperbarui 05.30 WIB setelah lintasan malam (VIIRS/NOAA-20). Versi pagi menggantikan versi malam, keduanya disimpan.

### 6.4 Pengiriman
Draf renlap tampil di tab Operasi untuk diperiksa staf berperan. Kirim WA ke grup atau base **hanya setelah keputusan K2**;
sebelum itu cukup teks siap salin dan PDF.

## 7. Metrik efektivitas (dihitung malam, per base, per pesawat, per provinsi)

| Kode | Metrik | Rumus | Sumber |
|------|--------|-------|--------|
| M1 | Ketepatan target | target berstatus berasap/FS ÷ target dikunjungi berstatus | D5 |
| M2 | Kepatuhan renlap | target renlap yang dikunjungi (≤ 1 km) ÷ target renlap | D3, D5, renlap |
| M3 | Temuan baru | FS ditemukan di luar renlap | D5 |
| M4 | Padam bertahan | FS dinyatakan padam/clear tanpa hotspot sistem ≤ 1 km dalam 48 jam berikut ÷ FS dinyatakan padam | D5, D6, hotspot sistem |
| M5 | Efisiensi WB | liter ÷ ha padam (klaim), kali WB ÷ FS; pencilan > 3x median ditandai "periksa" | D6 |
| M6 | Utilisasi armada | pesawat-hari terbang ÷ pesawat-hari serviceable | D2, D4, D6 |
| M7 | Waktu respons | jam temuan berasap sampai WB pertama ≤ 1 km | D5, D3/D4 |
| M8 | Mutu laporan | cek MERAH/KUNING laporan-karhutla + selisih isi teks (jumlah ≠ rincian) | laporan provinsi |
| M9 | Hambatan cuaca | sortie batal karena jarak pandang ÷ sortie rencana | D3, D4, D10 |
| M10 | Jarak sumber air | km dari foto *Water Source* ke foto *Water Drop* per sortie, dan kali WB per jam terbang | D17, D6 |
| M11 | Heli siaga tanpa tugas | heli serviceable berstatus standby pada hari yang sama dengan FS berasap ≤ jelajahnya | D2, D5 |

Semua metrik menampilkan n (jumlah kejadian). n < 5 ditulis "data kurang", bukan persen.

## 8. Rancangan data dan rute

Migrasi baru **0103_operasi_lapangan.sql** (idempoten, diperiksa `migrasi-idempoten`, diterapkan pemilik di produksi):

- `op_base(id, kode, nama, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif)`
- `op_armada(registrasi PK, tipe, peran, operator, pemilik, base_id, jelajah_nm, dummy, diubah)` dan `op_armada_status(tanggal, registrasi, status, alasan)`
- `op_renlap(id, tanggal, versi, base_id, dibuat, isi_json, status draf|diperiksa|dikirim)` dan `op_target(id, renlap_id, urut, jenis patroli|wb, lat, lon, skor, alasan_json)`
- `op_gerak(id, tanggal, registrasi, jenis rencana|berangkat|kembali|batal, jam_utc, misi, rute, wa_id)`
- `op_temuan(id, tanggal, jam, registrasi, lat, lon, status fs|berasap|berasap_tipis|clear, luas_klaim_ha, lokasi, kab_kode, target_id, wa_id, dummy)`
- Hasil WB, sortie, dan OMC **tidak diduplikasi**: dibaca dari laporan-karhutla (`sortie[]`, `armada[]`) dan tabel OMC 0033.

Rute Worker (`src/operasi_lapangan.js`, pemilik `warga-api`, diulas `guard-api` + `security-reviewer`):
- `GET /api/operasi/peta?tanggal=` staf: base, armada + status, renlap, gerak, temuan, ringkas nilai. Cache tepi pendek; satu kueri per tabel (kuota baca D1 Free).
- `GET /api/operasi/renlap?tanggal=&base=` staf; `POST /api/operasi/renlap` token mesin (pipeline).
- `POST /api/operasi/wa` gateway bot (`x-wa-kunci`): pesan gerak/temuan hasil urai.
- `GET /api/operasi/nilai?dari=&sampai=` staf.
- `POST /api/operasi/dummy` Super Admin (dua ikon, isi dari bahan 1–2 Nov), sesuai DUMMY.md.

Pengurai bot (`scripts/wa/operasi_wa.mjs`, pemilik `wa-bot`), tanpa LLM, gagal = disimpan mentah + tandai "tak terurai":
- Kenali: `MVT PLAN`, `MVT DEPARTURE`, `DEPARTURE MOVEMENT`, `Persiapan ... Sortie`, `rencana penerbangan`, `pelaksanaan penerbangan`,
  `Rencana Patroli Udara` (rute + `From PLB` + `Sektor n`), `DITEMUKAN FS`, baris titik bernomor + `Target Clear|berasap|HS CLEAR|FS BERASAP`,
  dan trio bukti `Before WB` / `Water Source` / `Water Drop` (koordinat diambil dari stempel foto yang menyertainya bila teksnya tanpa koordinat).
- **Tanda panggil bukan registrasi.** Pesan bisa memakai callsign: `BYSON234` = HA-5234 (Penerbad, Skadron 31), `Cougar17` = H-3217.
  Tabel alias callsign ke registrasi dipelihara di seed; pesan dengan callsign tak dikenal disimpan dan ditandai, tidak ditebak.
- **Status berubah di tengah hari.** Contoh 2 Nov: UR-CSN pulang ke base karena pompa bahan bakar bermasalah setelah 17 kali WB
  ("Back To Base Due To Problem Fuel Pump"). Pesan seperti ini menulis `op_gerak` jenis `kembali` beserta alasan, dan `op_armada_status` hari itu jadi `tidak_siap`.
- **Rujukan rantai patroli ke WB.** `REF : Hasil Patroli PK-FPU` (N814AR) dan `Rem : ... Hasil Patroli Helikopter PK-FPA` (VH-L6T)
  disimpan sebagai tautan temuan ke sortie WB, bahan langsung metrik M7 (waktu respons). Pindah target di tengah sortie
  ("HS padam dan bergeser ke HS Alalak Padang", VH-HGM) dicatat sebagai dua temuan dalam satu sortie.
- **Sumber target yang mereka pakai.** Patroli PK-FPU menulis "Data Source by Sipongi & Fine Fuel Moisture Code".
  Renlap kita memakai sumber yang sama (hotspot + FFMC dari FWI sistem), jadi target usulan bisa dibandingkan langsung dengan target mereka.
- Umur api `H<n>` di laporan provinsi disimpan sebagai klaim umur, dibandingkan dengan umur dari hotspot sistem.
- Pesan "pelaksanaan" yang memuat ulang semua titik rencana beserta statusnya **menggantikan** temuan per titik yang sama (kunci: registrasi, tanggal, koordinat), tidak dihitung dua kali.
- Koordinat DMS dan desimal, `S/N`, `E`; salah ketik seperti `00°42'25'45"` ditolak dan ditandai, tidak ditebak.
- Registrasi dari pola `PK-XXX`, `VH-XXX`, `VN-NNNN`, `RA-NNNNN`, `HA-NNNN`, `H-NNNN`, `A-NNNN`, `N...`; jam `Z` dan `LT` dinormalkan ke UTC.
- Uji: `tests/operasi/urai_wa.test.mjs` memakai pesan 1–2 Nov **tanpa nama kru** sebagai fikstur.

Pipeline renlap (`scripts/operasi/renlap.py`, Python stdlib, pemilik baru, lihat bagian 9) dan nilai (`scripts/operasi/nilai.py`), dijalankan di Mac mini lewat `otomatis.mjs` atau GitHub Actions (keputusan K3).

## 9. Layar: tab Operasi

- **Peta penuh** sebagai inti: base (ikon pangkalan), cincin jelajah, armada per base (warna status), target renlap (garis rute bernomor),
  temuan (segitiga merah berasap, lingkaran hijau clear), target WB (kotak biru), hotspot sistem lintasan terakhir, lapisan ISPU/jarak pandang/METAR,
  tugas api darat dan posisi regu `/lacak`.
- **Pemilih waktu** satu baris penuh: Renlap malam, Pagi, Siang, Nilai. Pemilih tanggal.
- **Panel base** (klik base): armada dan status hari ini, renlap lawan realisasi (target dikunjungi atau tidak), temuan, jam terbang.
- **Kartu nilai** M1–M9 per provinsi, format kartu Insight, n selalu tampil.
- **Darat**: daftar operasi darat per provinsi dari laporan + tugas api, personel dikerahkan vs potensi.
- Aturan layar: kepala situs navy bersama, INP (chrome dulu, peta berat sesudah rAF), tombol dummy dua ikon Super Admin, angka gaya Indonesia, tanpa "·".

Pengerja: layar oleh agent baru **`operasi`** (otoritas membuat agent, AGENTS.md §1.5: berkas tanpa pemilik dan kelas kerja berulang),
wilayah `public/bnpb/operasi_lapangan*`, `scripts/operasi/**`, `tests/operasi/**`. Worker dan migrasi tetap `warga-api`, pengurai `wa-bot`.

## 10. Keputusan pemilik yang dibutuhkan

| Kode | Pertanyaan | Usulan |
|------|------------|--------|
| K1 | Letak tab. `/bnpb/operasi` sudah dipakai Operasi Pusdalops (6 tab). | Tab ke-7 "Lapangan" di halaman itu, atau halaman sendiri `/bnpb/operasi-lapangan` berjudul "Operasi". Usulan: halaman sendiri, peta butuh layar penuh. |
| K2 | Renlap dikirim ke siapa dan atas nama siapa? | Tahap awal hanya tampil + salin teks; kirim ke grup setelah disetujui Koopsudnas/Satgas. |
| K3 | Pipeline renlap jalan di mana? | Mac mini (sudah ada bot dan jadwal 06.00–23.00), cadangan GitHub Actions. |
| K4 | Siapa boleh melihat? | Staf BNPB berperan + akun instansi TNI AU per wilayah (baca saja). |
| K5 | Nomor bot dimasukkan ke grup WA satgas/operator? | Wajib, tanpa ini D3–D5 tidak tertangkap. Perlu izin admin grup. |
| K6 | Retensi `wa_masuk` hanya 2 hari terlihat. | Simpan bahan operasi minimal 1 musim (sampai 31 Mar 2027) untuk histori dan penalaan skor. |
| K7 | Bobot skor target dan radius jelajah per tipe pesawat. | Mulai dari bagian 6.2 berlabel hipotesis, tala dari M1 tiap 14 hari. |

## 11. Tiket

| Kode | Isi | Bukti siap |
|------|-----|------------|
| OP-1 | Migrasi 0100 + seed base/armada dari bagian 4 + `GET /api/operasi/peta` + dummy | `npm run uji:warga` hijau, uji integrasi D1 baru di `tests/e2e/cakupan.json` |
| OP-2 | Pengurai WA gerak + temuan, simpan ke D1, tampil di peta | `node --test tests/operasi/urai_wa.test.mjs` hijau pada 20 pesan 1–2 Nov |
| OP-3 | Layar tab Operasi: peta, pemilih waktu, panel base | Playwright tangkapan layar desktop + seluler, `inp-reviewer` lolos |
| OP-4 | Renlap 20.00 + 05.30 WIB, format DMS + R/D VOR, teks salin + PDF | Self-check Python: radial/jarak cocok dengan pesan nyata (PNK→Pasak R 095 D 13 Nm ±2°, ±1 Nm) |
| OP-5 | Nilai M1–M9 malam + kartu | Uji murni rumus + angka 2 Nov dihitung ulang tangan |
| OP-6 | Integrasi darat (tugas api, `/lacak`, laporan provinsi) | Uji tampil di panel darat |
| OP-7 | Kirim renlap lewat WA (setelah K2) | Dikirim hanya setelah persetujuan pemilik |
| OP-8 | Jarak pandang per jam per lokasi. Kondisi 2 Nov: `metar.json` hanya 14 bandara (Kalbar cuma WIOO), data terakhir 1 Nov 23.00 WIB, sedangkan grafik BMKG Kalbar memuat 9 lokasi per jam. Langkah: (1) cari METAR/SPECI BMKG penerbangan untuk semua bandara 6 provinsi prioritas + Kaltim (WIOK, WIOS, WIOP, WIOD, WAGG, WAOS, WAGF, WIPA, dst.) dan tarik per jam; (2) bila tak ada sumber mesin, tangkap grafik "Jarak Pandang Kalimantan Barat" BMKG dari WA (tabel per lokasi per jam) lewat bot; (3) perbaiki kebasian pipeline METAR yang ada. Pemilik `cuaca-udara` (pipeline) dan `wa-bot` (tangkapan WA) | Tiap base punya jarak pandang ≤ 1 jam umurnya pada jam operasi 07–17 WIB; uji pengurai pada grafik 1 dan 2 Nov |

Urutan: OP-1 → OP-2 → OP-3 bisa jalan sejak hari pertama dan sudah berguna (peta base + temuan pagi).
OP-4 dan OP-5 butuh data OP-2 beberapa hari.
