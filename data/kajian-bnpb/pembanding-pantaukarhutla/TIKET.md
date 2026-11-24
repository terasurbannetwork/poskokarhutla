# Daftar rekomendasi dari pembanding pantaukarhutla.com (PKH-*)

Disusun 24 Nov 2026 dari `RISET.md` di folder ini. Status semua tiket: **usulan**, belum dikerjakan dan belum disetujui pemilik.

**Aturan main:**
- Tiket bertanda **[paket]** adalah fitur besar. Paket dokumennya harus disusun dulu (KEPUTUSAN sampai GLOSARIUM, AGENTS §3.7) di folder modul pemiliknya, baru boleh ada kode.
- Tiket kecil langsung dikerjakan pengerja pemilik berkasnya, lalu diperiksa pemeriksa dari §6 AGENTS.
- Kode dari repo mereka (MIT) boleh dipakai ulang asal pemberitahuan lisensinya ikut. Angka, ambang, dan metode yang diambil ditulis sumbernya.

## A. Uji dan kejujuran model (kerjakan dulu, murah, menaikkan kepercayaan)

| ID | Rekomendasi | Pengerja → pemeriksa | Berkas | Bukti siap |
| --- | --- | --- | --- | --- |
| PKH-01 | Catat tiap prakiraan PM2,5 kota. Sesudah harinya lewat, nilai terhadap stasiun ISPU dalam 25 km: kategori tepat, meleset ≤ 1 kategori, dibanding persistensi "angka hari ini". Skor tampil sesudah ≥ 20 pasangan. | cuaca-udara → validasi-model | `scripts/udara/prakiraan.py`, arsip baru `public/udara/data/` | self-check jalan; arsip append-only terisi 2 hari |
| PKH-02 | Uji balik garis asap per insiden (`lintasan.py`) terhadap angin ERA5: galat ujung 24 jam, arah tepat, dibanding angin dianggap tetap. Angkanya baru boleh tampil sesudah uji ini. | cuaca-udara → validasi-model | `scripts/udara/lintasan.py`, skrip uji baru | median galat km dan pembanding tercatat |
| PKH-03 | Uji balik model asap (`atribusi.py`, `asal.py`) terhadap AOD MODIS ≥ 1, dibanding AOD kemarin dan model tanpa angin (AUC). | cuaca-udara → validasi-model | `scripts/udara/atribusi.py`, `asal.py` | AUC tercatat, kalah dari pembanding ditulis jujur |
| PKH-04 | Himawari diperketat: hanya reliability 5, belum ada VIIRS dalam 5 km selama 72 jam, terlihat dua kali dalam 1 jam, tidak dekat sumber statis atau daftar alarm palsu. Disertai uji presisi terhadap VIIRS. | pipa-data → validasi-model | `scripts/data/himawari.py`, daftar alarm palsu | presisi 3 km per reliability tercatat |
| PKH-05 | Laju muncul lagi per kelas risiko ("sel Ekstrem terbakar besok X%") untuk peluang karhutla kita. | pipa-data → validasi-model | `scripts/data/peluang_karhutla.py` | tabel laju per kelas dari hindcast |

## B. Insiden lebih kaya (inti Posko)

| ID | Rekomendasi | Pengerja → pemeriksa | Berkas | Bukti siap |
| --- | --- | --- | --- | --- |
| PKH-06 **[paket]** | Perkembangan api per insiden: waktu tiba per sel, garis depan pukul 14.00 WIB, laju p90, lompatan > 2 km, perkiraan titik awal, `resolved:false` bila kemajuan di bawah 1 sel. | pipa-data (pipeline), layar-peta (pop-up) → validasi-model, inp-reviewer | `scripts/data/insiden.py`, keluaran `public/data/progresi/` | uji pada 10 insiden 2019/2023, MAE waktu tiba |
| PKH-07 **[paket]** | Bangunan dalam 500 m dari petak api per insiden, pakai mesin Open Buildings yang sudah ada. Angka per insiden publik, rincian sel di balik sesi. | pipa-umum + pipa-data → security-reviewer, selera-angka | `scripts/umum/paparan_bangunan.py`, `insiden.py` | angka 3 insiden dicek manual pada citra |
| PKH-08 | Nama insiden memakai desa (titik terbanyak) + kabupaten, ditambah kota terdekat. Kita sekarang memakai kab, kec. | pipa-data → selera-angka | `scripts/data/insiden.py` | ketepatan desa vs poligon ≥ 90% |
| PKH-09 | "Bukan yang pertama": persen petak insiden yang pernah terbakar 2012–2025, per tahun. | pipa-data, layar-peta → selera-angka | `scripts/data/riwayat_sel.py`, pop-up insiden | angka cocok dengan riwayat sel |
| PKH-10 | Tingkat bukti insiden "kuat": ≥ 2 lintasan, ≥ 2 piksel per lintasan, ada deteksi malam, atau ada piksel jenuh. Angka utama dihitung hanya dari insiden kuat. | pipa-data → validasi-model | `scripts/data/insiden.py` | bagian insiden tunggal tercatat |
| PKH-11 | Laju muncul lagi "tak terlihat ≠ padam" per gambut dan non-gambut ditampilkan di pop-up insiden yang tak terlihat. | pipa-data → selera-angka | `scripts/data/lab_padam.py` | angka dari data 2026 |

## C. Layar peta

| ID | Rekomendasi | Pengerja → pemeriksa | Berkas | Bukti siap |
| --- | --- | --- | --- | --- |
| PKH-12 **[paket]** | Api dan asap 3D (partikel WebGL2) di peta utama, berlabel "ilustrasi". Port dari `fire3d.ts` (MIT). Anggaran ponsel ≤ 300 sumber, berhenti saat tab tersembunyi, menghormati `prefers-reduced-motion`. | layar-peta → inp-reviewer | `public/index.html`, berkas JS baru | `?perf` sehat, INP < 200 ms, tinjau `localhost:8800/` |
| PKH-13 | Cahaya matahari mengikuti slider waktu: warna langit, kecerahan citra, hillshade, diredam kabut PM2,5. Port dari `sun.ts` dan `lighting.ts`. | layar-peta → inp-reviewer | `public/index.html` | tanpa repaint tile saat diam |
| PKH-14 | Partikel angin canvas 2D (1.800 partikel, berhenti saat peta digeser). Port dari `windParticles.ts`. | layar-peta → inp-reviewer | `public/index.html` | rAF median < 16 ms desktop |
| PKH-15 | Aturan performa peta jadi gerbang: lapisan tanah satu blok, tanpa `setPaintProperty` berkala, DPR maksimal 2, HUD `?perf`. | penulis-gerbang → inp-reviewer | `tests/agen/` gerbang baru | gerbang merah pada pelanggaran contoh |
| PKH-16 | Lingkaran skala galat pada garis asap (median uji, bukan galat jalur itu sendiri). Bergantung pada PKH-02. | layar-peta → selera-angka | pop-up insiden | teks galat dari berkas uji |

## D. Warga dan peringatan

| ID | Rekomendasi | Pengerja → pemeriksa | Berkas | Bukti siap |
| --- | --- | --- | --- | --- |
| PKH-17 | Feed Atom nasional dan per provinsi: kebakaran baru, meluas, risiko ekstrem, udara tidak sehat. ID tetap, tanpa state. | pipa-data → security-reviewer | skrip baru, `public/data/feeds/` | validator Atom lulus |
| PKH-18 **[paket]** | Desa waspada: desa dengan titik panas 7 hari, dan desa yang belum terbakar minggu ini tapi terbakar ≥ 3 tahun sejak 2012. Tiap daftar diberi laju hindcast. | pipa-data → validasi-model | skrip baru, batas desa yang sudah ada | hindcast 2023 per daftar |
| PKH-19 | Cek lokasi: "api terdekat N km ke arah X, di jalur angin menuju sini" (lintasan mundur 24 jam, kebakaran ≤ 25 km dari lintasan). | layar-peta, cuaca-udara → inp-reviewer | layar cek lokasi yang ada | 3 titik uji manual |
| PKH-20 | Saran sekolah dan warga per kategori ISPU prakiraan, mengikuti SE Mendikdasmen 20/2026 dan Kemenkes. | cuaca-udara, layar-peta → selera-angka | layar udara | teks lewat `bahasa-indonesia-plain` |

## E. Data dan sumber

| ID | Rekomendasi | Pengerja → pemeriksa | Berkas | Bukti siap |
| --- | --- | --- | --- | --- |
| PKH-21 | ISPU langsung dari KLH (`apimobile/v1/getStations`) dengan QC: buang `c_pm25` null, buang PM2,5 > 1,5·PM10 + 5, waktu per provinsi. | cuaca-udara → security-reviewer | `scripts/udara/kualitas.py` | jumlah stasiun lolos QC tercatat |
| PKH-22 | Stasiun DOE Malaysia dan NEA Singapura, diarsip sendiri karena DOE hanya menyimpan 24 jam. | cuaca-udara | `scripts/udara/` | arsip 2 hari |
| PKH-23 | Asap lintas negara: kota penerima di Singapura, Malaysia, Brunei, dan sumber api negara tetangga di model. Bergantung pada PKH-03. | cuaca-udara → validasi-model | `scripts/udara/asal.py` | atribusi hanya tampil bila model menjelaskan ≥ 20% kelebihan PM2,5 |
| PKH-24 | Angka "setara SiPongi" dan "kepercayaan tinggi saja" ditampilkan di samping hitungan kita, plus angka resmi SiPongi 24 jam. | pipa-data, layar-peta → selera-angka | `scripts/data/titik_unik.py` | selisih vs SiPongi ≤ 5% |
| PKH-25 | FWI GFWED GEOS-5 sebagai warm start dan prakiraan +8 hari, dibanding FWI hitungan sendiri. | pipa-data → validasi-model | `scripts/data/fwi.py` | AUC per lead dibanding sekarang |
| PKH-26 | Daftar suar gas dari VIIRS Nightfire dan mask statis bergulir 365 hari (163 sel industri 2026 yang terlewat). | pipa-data → validasi-model | `scripts/data/titik_palsu.py` | sel industri baru tercatat |
| PKH-27 | Arsip FIRMS GeoParquet (source.coop) sebagai sumber arsip ganti unduhan tahunan. | pipa-data | `scripts/data/lab_luas.py` | jumlah cocok dengan arsip lama |

## F. Laporan dan konten

| ID | Rekomendasi | Pengerja → pemeriksa | Berkas | Bukti siap |
| --- | --- | --- | --- | --- |
| PKH-28 | Perbandingan Asia Tenggara S-NPP 2012–2025, total dan per 1.000 km², Papua Nugini tidak ikut peringkat. | pipa-data, layar-peta → selera-angka | skrip baru | 14 tahun cocok dengan arsip |
| PKH-29 | Grafik petak 375 m unik per tahun per wilayah (S-NPP saja), untuk deck dan paparan. | pipa-data | `scripts/data/titik_tahun.py` | angka Papua 2015 dan 2026 cocok |
| PKH-30 | Prospek musim: P(hujan < 4 mm/hari) 30/60 hari dari ansambel musiman, dengan uji aturan per provinsi. | pipa-data → validasi-model | `scripts/data/iklim.py` | uji 2012–2025 per titik |
| PKH-31 **[paket]** | Video vertikal otomatis untuk media sosial (angka besar, peta citra, sumber di kaki) dari data yang sama. | layar-peta / mekanik-mesin | skrip baru | 1 video contoh ditinjau pemilik |
| PKH-32 | Istilah dirapikan: "titik api" jadi "titik panas" di berkas yang masih memakainya; NOAA-20/21 disebut satelit NOAA; FRP = daya (MW). | pemilik berkas masing-masing → selera-angka | sekitar 99 berkas, dicek dulu | grep bersih atau tercatat |

## Urutan usulan

1. **A** (PKH-01 sampai 05): murah, membuat angka kita bisa dipertanggungjawabkan.
2. PKH-08, 09, 10, 17, 24, 32: kecil, terlihat langsung.
3. Paket PKH-06 dan PKH-07: nilai terbesar untuk Posko.
4. Paket PKH-12 sampai 15: layar.
5. Sisanya menyusul.

## Keputusan pemilik (24 Nov 2026)

- K1: Semua tiket jalan ("semua gas"), kecuali kelompok F yang dirinci dulu (lihat bawah) sebelum dikerjakan.
- K2: Bangunan dekat api (PKH-07) boleh tampil publik per insiden.
- K3: Asap lintas negara (PKH-23) boleh tampil publik, termasuk provinsi asal untuk kota di negara tetangga.
- K4: PKH-31 video vertikal **dibatalkan** ("gausah").
- K5: Animasi api 3D (PKH-12) disetujui.

## Rincian kelompok F (disetujui pemilik 24 Nov 2026: "Gas")

### PKH-28 Indonesia vs Asia Tenggara
- **Isi:** satu kartu di tab Insight, dengan tiga pilihan di kanan judul: "7 hari", "Per tahun", "Per 1.000 km²". Tabel berisi 11 negara ASEAN; Papua Nugini ikut tampil dengan teks abu, tapi tidak masuk peringkat.
- **Angka:**
  - Hanya VIIRS S-NPP, kepercayaan sedang dan tinggi, tipe 0 (api vegetasi).
  - Arsip negara FIRMS 2012–2025; 7 hari dari berkas NRT Asia Tenggara, disaring dengan mask statis kita.
  - Luas daratan dari Bank Dunia `AG.LND.TOTL.K2`.
- **Kalimat penjelas tetap:** negara daratan terbakar Feb–Apr (sisa panen, singkat), Indonesia Agu–Okt (gambut, berasap). Per km² mereka biasanya lebih tinggi.
- **Keluaran:** `public/data/asean_titik.json` (statis tahunan + 7 hari).
- **Pengerja:** `pipa-data`, kartu oleh `layar-peta`.
- **Bukti:** jumlah sel terbakar Indonesia per tahun sama dengan arsip riwayat sel.

### PKH-29 Petak 375 m unik per tahun per wilayah
- **Isi:** grafik batang 2012–tahun berjalan, untuk nasional, per provinsi, dan per gugus pulau (Sumatera, Kalimantan, Papua enam provinsi). Batang tahun berjalan diberi warna sorot dan label "s.d. <tanggal>".
- **Dua angka pendamping:**
  - Bagian wilayah itu dari total Indonesia (%) per tahun.
  - Titik panas per bulan tahun berjalan (semua satelit).
- **Angka:** sel unik VIIRS S-NPP per tahun, filter sama dengan riwayat sel. Petak = sel dengan deteksi, **bukan** luas terbakar; ditulis di kepala tabel (`title`), bukan kaki.
- **Pemakaian:** keluar sebagai `public/data/petak_tahun.json` dan sebagai blok data untuk deck lewat `ppt-konsultan` (registri angka bertoken).
- **Pengerja:** `pipa-data` (`scripts/data/titik_tahun.py`).
- **Bukti:** angka Papua 2015 dan 2026 cocok dengan hitungan pembanding (51 rb dan 66 rb sampai 16 Okt).

### PKH-30 Prospek musim
- **Isi:** kartu "Prospek musim" berisi ONI, Niño3.4 mingguan, IOD, dan tabel delapan provinsi rawan dengan peluang hujan < 4 mm/hari untuk 30 dan 60 hari ke depan.
- **Angka:**
  - Bagian dari 50/51 anggota ansambel musiman ECMWF (Open-Meteo seasonal) yang rata-ratanya < 4 mm/hari.
  - Satu titik per provinsi: sabuk kebakaran, bukan ibu kota.
- **Uji sebelum tampil:** aturan < 4 mm/hari diuji 2012–2025 per titik terhadap titik panas S-NPP ±1°. Provinsi tempat aturan lemah (mereka menemukan Kalbar, Riau, Merauke) diberi tanda "aturan lemah di sini".
- **Tambahan:** sumber IOD pindah ke `reg.bom.gov.au` (www kena 403).
- **Keluaran:** `public/data/prospek_musim.json`.
- **Pengerja:** `pipa-data` (`scripts/data/iklim.py`) → `validasi-model`.
- **Bukti:** tabel uji per titik.

### PKH-32 Merapikan istilah
- **Aturan:** "titik api" → "titik panas" di teks layar dan dokumen publik. Nama variabel dan kunci JSON tidak diubah, supaya data lama tidak putus.
- **Penulisan lain:** NOAA-20 dan NOAA-21 disebut "satelit NOAA", bukan NASA. FRP disebut "daya api (MW)", bukan energi. "Padam" untuk insiden yang tak terdeteksi diganti "tak terlihat > 3 hari", kecuali bila ada laporan padam resmi.
- **Cara:**
  - Grep dulu, lalu dikelompokkan per pemilik berkas.
  - Teks laporan dan deck yang memang mengutip istilah resmi ("titik api" BNPB) tidak diubah.
  - Daftar perubahan diperiksa `selera-angka`.
- **Gerbang:** kata "titik api" di teks layar `public/**` tidak boleh bertambah (ratchet seperti gerbang token warna).

## Pertanyaan tersisa untuk pemilik

- Q4: Rincian kelompok F di atas sudah sesuai, atau ada yang diubah?
- Q5: PKH-32: apakah istilah resmi "titik api" di laporan BNPB memang dibiarkan?
