# Pra-registrasi: hujan hulu DAS dan hujan CHIRPS pada model peluang banjir kabupaten-hari

Dibuat 1 Nov 2026, Tahap 1 dan 2 peta jalan `docs/banjir/PETA-JALAN-MODEL-BANJIR.md`. Ditulis SEBELUM fitur hulu atau
CHIRPS dihitung untuk satu kabupaten-hari pun, lalu ditinjau validasi-model (konteks bersih) sebelum dibekukan; 11 temuannya
sudah masuk. Pola dan ukuran mengikuti `PRAREG-DEBIT.md`, tetapi M0 di sini dilatih dengan label gabungan sehingga BUKAN M0
DEBIT: hasil kedua percobaan tidak dibandingkan antarmodel.

Sumber hujan kedua semula IMERG; token Earthdata lokal kosong, jadi diganti CHIRPS v2.0 harian (terbuka, tanpa login).
IMERG boleh menyusul sebagai protokol terpisah dengan kontras baru (menambah m di §5) bila token tersedia.

## 1. Pertanyaan

Satu M0, dua hipotesis, dua kontras utama:

- **H2 (CHIRPS lokal):** apakah hujan CHIRPS (satelit + penakar, 0,25 derajat) di sel kabupaten menambah keterampilan di atas
  hujan ERA5? Kontras **M2 - M0**.
- **H1 (hulu):** apakah hujan di DAS HULU kabupaten menambah keterampilan di atas hujan lokal dari sumber yang sama?
  Kontras **M3 - M2** (keduanya memakai CHIRPS, jadi selisihnya hanya informasi hulu).

## 2. Data

- **Sampel:** 39 kabupaten dan 104 sel 0,25 derajat yang sama dengan `model_kab.py` dan `PRAREG-DEBIT.md`, DIKUNCI dari
  `data/raw/banjir/model_kab/kandidat.json` (`kab`, `sel`), disalin ke berkas sampel sendiri.
- **Label evaluasi:** DIBI banjir dan banjir bandang kabupaten-hari, `data/raw/banjir/dibi_tanggal.json` (hanya dibaca),
  dicocokkan seperti model_kab.py. Label Uji A dan B dibekukan sendiri-sendiri (salinan + sha256) tepat sebelum `sia` dan `buka`.
- **Label latih:** DIBI ATAU logbook Pusdalops hari-mulai (`lb_mulai`), dibaca lewat `scripts/banjir/label_bersatu.py`
  (berkas itu ikut disidik). Logbook hanya dihitung pada hari yang tercakup berkas arsip logbook
  (`data/raw/banjir/label_bersatu/logbook_hari_tercakup.json`: 2016-2020 penuh, 2021 tidak ada, 2022 dan 2023 sebagian);
  di hari lain label latih = DIBI saja. Baris logbook bertanda `tanggal_curiga` (jeda catat > 180 hari) tidak dipakai. M0, M2, M3 dilatih dengan label yang SAMA. Validasi, Uji A, Uji B
  hanya DIBI. `frek_dibi` dihitung dari DIBI saja (sama dengan evaluasi); logbook hanya masuk `y` latih. Groundsource, GFM,
  MODIS tidak dipakai di sini.
- **ERA5 dan tanah:** cache `uji_balik` lewat impor `model_kab.py` / `uji_balik.py` tanpa mengubahnya. ERA5 2026 diambil dari
  cache `model_kab_debit` hanya bila hash manifestnya sama dengan sidik DEBIT; bila tidak, unduh sekali ke `model_kab_hulu` dan
  catat tanggal unduh di manifest. M0 identik di semua kontras.
- **CHIRPS:** v2.0 harian final `global_daily/cogs/p25` (0,25 derajat, mm/hari), https://data.chc.ucsb.edu/products/CHIRPS/v2.0/,
  dibaca lewat HTTP Range (pembaca COG `scripts/data/citra.py`). Kisi p25 berpusat di x,125 dan x,375 derajat, sama dengan sel
  ERA5 sampel, jadi satu sel CHIRPS = satu sel sampel. Hari CHIRPS = hari UTC 00-24 dan TIDAK digeser; ERA5 di cache
  `uji_balik` memakai hari Asia/Jakarta (WIB), jadi ada selisih 7 jam yang diterima dan dicatat. Hari CHIRPS d dipetakan ke
  hari cache d (tanggal kalender sama). Hanya produk final; tidak ada produk awal (prelim) dan tidak ada versi lain.
  Hari yang hilang tidak diisi: baris kabupaten-hari itu dikeluarkan dari SEMUA model sekaligus.
- **Sel nodata CHIRPS** (laut, nilai -9999): dikeluarkan. Fitur kabupaten = maksimum atas sel valid; bobot hulu dinormalkan
  ulang atas sel valid. Bila semua sel kabupaten nodata pada suatu hari, baris dikeluarkan dari SEMUA model; bila semua sel
  hulu nodata, `hu*` dihitung hilang dan baris juga dikeluarkan dari semua model. Kabupaten yang semua selnya nodata permanen
  dikeluarkan dari semua kontras dan tidak diganti; daftar dan jumlah sel nodata per kabupaten disidik.
- **Uji asap sebelum `latih`:** `ambil` membaca satu hari di 3 sel pesisir dan 3 sel darat dari URL p25 final dan menulis
  hasilnya (nilai, nodata atau tidak) ke manifest.
- **DAS hulu:** HydroBASINS v1c level 9, berkas `hybas_as_lev09_v1c.zip` dan `hybas_au_lev09_v1c.zip` dimuat bersama (ID unik
  lintas benua, rantai lintas berkas diikuti).
  - Basin lokal kabupaten = basin yang irisannya dengan salah satu sel sampel kabupaten >= 10% luas basin ATAU >= 10% luas sel.
  - Basin hulu = semua basin yang rantai `NEXT_DOWN`-nya mencapai salah satu basin lokal, dikurangi basin lokal. Penelusuran
    hanya mengikuti `NEXT_DOWN`; basin dengan `ENDO > 0` ikut hanya bila `NEXT_DOWN`-nya menuju basin lokal. Basin hulu satu
    kabupaten boleh tumpang tindih dengan kabupaten lain, dan sel hulu boleh mencakup sel lokal (fitur `hu*` dan `c*` tidak
    saling bebas; itu sah untuk H1).
  - Jarak = jumlah langkah `NEXT_DOWN` ke basin lokal terdekat. Basin dimasukkan per tingkat jarak (1, 2, 3, ...); satu
    tingkat masuk SEMUA bila jumlah `SUB_AREA` kumulatif <= 20.000 km2, selain itu berhenti (tingkat itu dan sesudahnya tidak
    masuk). Tanpa pemecahan seri di dalam tingkat. Bila tingkat 1 sudah > 20.000 km2, hulu kosong. `basin` mencetak jumlah
    kabupaten tanpa hulu sebelum `latih`.
  - Sel hulu = sel CHIRPS 0,25 derajat yang beririsan dengan basin hulu; bobot = luas irisan (km2) basin hulu dengan sel itu.
  - Daftar basin hulu dan sel hulu per kabupaten, serta jumlah kabupaten tanpa hulu, dicatat dan disidik. Bila kurang dari 20
    dari 39 kabupaten punya hulu, laporkan "daya hulu rendah" tanpa mengubah kriteria.

## 3. Fitur

**Kelompok `chirps` (M2, M3), per sel lalu kabupaten = maksimum atas sel kabupaten (sama dengan fitur hujan M0):**
- `c1`: hujan hari e.
- `c3`: hujan e-1..e+1 (jendela H3 `status.py`, `GESER = -1`, prakiraan sempurna).
- `c_pers`: peringkat persentil `c3` terhadap sebaran `c3` sel itu pada periode LATIH saja, seri nol memakai `bisect_left`
  seperti `pers_h3` di `model_kab.py`.

**Kelompok `hulu` (M3 saja), rerata berbobot luas irisan atas sel hulu:**
- `hu1`: hujan hulu hari CHIRPS (UTC) e-2. Hari UTC e-2 berakhir pukul 07.00 WIB hari e-1, jadi seluruhnya sebelum hari
  sasaran WIB e.
- `hu3`: jumlah hujan hulu hari CHIRPS (UTC) e-4..e-2.
- `hulu_ada`: 0/1; kabupaten tanpa hulu mendapat `hu1 = hu3 = 0`.

Tidak ada fitur anteseden (sejalan dengan M0 yang membuang kelompok `anteseden`). Jendela dan batas 20.000 km2 tidak disetel.

**Model:**
- M0 = fitur `model_kab.py` tanpa kelompok `anteseden`.
- M2 = M0 + `chirps`.
- M3 = M2 + `hulu`.

Bila regresi logistik terpilih: dipakai seperti di `model_kab.py` apa adanya (regularisasi dan pemecah tidak disetel);
`log1p` untuk fitur hujan baru (`c1`, `c3`, `hu1`, `hu3`), `c_pers` dan `hulu_ada` tidak, lalu semua distandardisasi dengan
rerata dan simpangan baku latih.
Semua besaran bergantung periode latih (`frek_dibi` ekspansif, klimatologi kab-bulan, batas persentil) dari latih 2016-2023.
Tidak ada fitur tambahan atau ablasi lain sesudah protokol dibekukan.

## 4. Pembagian waktu

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2016-01-01 s.d. 2023-12-31 | pohon, regresi logistik, batas persentil |
| Validasi | 2024-01-01 s.d. 2025-12-31 | pilih kelompok model dan hiperparameter, kalibrasi Platt |
| Uji A (beku) | 2026-01-01 s.d. 2026-09-30 | hanya pemeriksaan kesia-siaan, tidak bisa meluluskan |
| (tidak dipakai) | 2026-10-01 s.d. 2026-10-31 | celah |
| Uji B (prospektif) | 2026-11-01 s.d. 2027-04-30 | bersama Uji A menjadi uji final |

- 2016-2025 sudah dilihat rancangan lain (model_kab, ambang_wilayah, uji balik aturan), jadi validasi bukan uji.
- CHIRPS final harian terbit sekitar 4 bulan sesudah bulan pengamatan (1 Nov 2026 data terakhir 2026-06-30).
  `sia` boleh jalan hanya bila manifest CHIRPS final lengkap untuk setiap hari 2015-12-01 s.d. 2026-09-30, paling cepat
  2027-02-15. Bila belum lengkap sampai 2027-04-15, `sia` ditunda sampai lengkap; tidak ada pengganti.
  `buka` sama: lengkap sampai 2027-04-30, paling cepat 2027-09-15.
- Bila CHIRPS v2.0 final berhenti terbit atau diganti versi sebelum manifest 2026-09-30 lengkap, kontras H1 dan H2
  dinyatakan "tidak dapat dinilai"; tidak ada versi pengganti dalam protokol ini.
- Sidik HULU dibekukan SEBELUM `sia` DEBIT dibuka (2026-11-15). Tidak ada perubahan M0, fitur, atau kriteria sesudah itu.
  Bila `latih` tidak selesai sebelum 2026-11-15, hal itu ditulis di §6 sebagai pelemahan yang diakui.

## 5. Kriteria

Ukuran sama dengan `PRAREG-DEBIT.md`: ETS pada jumlah alarm sama dengan aturan Waspada dan Siaga, dETS berpasangan, selisih
Brier skill. Bootstrap **5.000** ulangan biji 11, dua skema blok (kabupaten x musim-tahun dan pulau x minggu), blok identik
untuk M0, M2, M3; batas bawah = yang lebih kecil dari dua skema, batas atas = yang lebih besar.

Keluarga uji Uji A/B = 3 kontras: DEBIT M1 - M0, HULU M2 - M0, HULU M3 - M2. Bonferroni m = 3 pada alfa dua-sisi 5%
(satu-sisi 2,5%, seperti DEBIT): tiap kontras HULU memakai selang **98,33%** (persentil 0,83 dan 99,17); DEBIT tetap 95% dan
sudah beku. Total galat jenis I satu-sisi = 2,5 + 0,83 + 0,83 = 4,2%, di bawah 5%. Percobaan lain
yang memakai Uji A/B ini wajib menambah m dan menuliskannya di protokolnya sendiri sebelum sidik.

Pemilihan: kelompok model (GBDT atau regresi logistik) dan hiperparameter dipilih menurut logloss validasi SESUDAH rekalibrasi
Platt lintas tahun (Platt dipasang di 2024 dinilai di 2025, dan sebaliknya, lalu dirata-rata), karena laju label latih lebih
tinggi dari laju evaluasi. Kelompok dipilih menurut M0, lalu M2 dan M3 memakai kelompok yang sama. Hiperparameter GBDT disetel
terpisah per model dengan kisi dan anggaran yang sama (`HIPER`, `POHON_MAKS` model_kab.py). Tiap model dilatih dengan 5 biji
(1 sampai 5), peluang dirata-rata; biji tidak disetel. Platt final dipasang di seluruh validasi.

Daya: `latih` mencatat dETS minimum terdeteksi (MDE) dari simulasi bootstrap di validasi dengan jumlah kejadian setara Uji A+B.
MDE dicatat, tidak mengubah kriteria.

Pemeriksaan kesia-siaan (Uji A, `sia`, sekali): per kontras, bila dETS Waspada titik <= 0, kontras itu DIHENTIKAN dengan vonis
"tidak terbukti". Hanya bisa menolak. Penghentian satu kontras tidak menghentikan kontras lain: M2 tetap dilatih dan dinilai
sebagai pembanding M3 - M2 walau M2 - M0 dihentikan; bila M3 - M2 dihentikan, M3 tetap dilaporkan.

Vonis final per kontras (Uji A + Uji B, `buka`, sekali):
- LULUS bila SEMUA: batas bawah dETS >= Waspada > 0; batas bawah dETS >= Siaga > 0; batas bawah selisih Brier skill > 0.
- TIDAK LULUS bila dETS Waspada titik <= 0 atau batas atasnya < 0.
- TIDAK MEYAKINKAN selain itu.

Vonis hanya ditentukan model berlabel gabungan. Bila kontrol DIBI-saja (di bawah) memberi dETS titik bertanda berlawanan atau
batas atasnya < 0 sedangkan model gabungan LULUS, vonis ditulis "LULUS, PEKA LABEL" dan hanya boleh dipasang sesudah pemilik
memutuskan. Kontrol tidak pernah dipakai menyelamatkan vonis TIDAK LULUS. Bila MDE (Daya) > 0,02 dETS Waspada, vonis selain
TIDAK LULUS diberi keterangan "(daya rendah)"; kriteria tidak berubah.

Dilaporkan tanpa menjadi gerbang: M0/M2/M3 yang dilatih dengan DIBI saja (kontrol efek label logbook), dETS model - aturan,
AUC, model vs klimatologi, hasil per pulau.
Lulus berarti kelompok itu boleh dipasang sebagai pelengkap berlabel. Status resmi `status.py` tidak ditimpa.

## 6. Kejujuran dan batas

- Prakiraan sempurna: `c3` memakai hari e dan e+1. CHIRPS final dikoreksi dengan data penakar bulanan, yaitu informasi sesudah
  waktu ramal untuk seluruh bulan itu. Keuntungan M2 dan M3 di uji adalah batas atas; produksi harus memakai produk cepat
  (CHIRPS prelim atau IMERG Early) dan diuji ulang secara prospektif. `hulu` hanya memakai hujan sebelum hari sasaran WIB,
  tetapi tetap dari produk final.
- `c3` (hari UTC) dan `h3` ERA5 (hari WIB) bergeser 7 jam; kontras M2 - M0 membandingkan jendela yang tidak persis sama.
- H1 menguji hujan hulu TERTUNDA (hari UTC e-4..e-2) di atas hujan lokal e-1..e+1; vonis tidak menyangkut hujan hulu pada
  hari e atau e+1, jadi TIDAK LULUS tidak berarti "hulu tidak berguna".
- CHIRPS 0,25 derajat menghaluskan hujan deras singkat sama seperti ERA5; H2 menguji koreksi penakar, bukan resolusi.
- Basin hulu dari HydroBASINS mengabaikan kanal, waduk, dan pengalihan air.
- Label DIBI kurang lapor; FAR terukur kemungkinan lebih buruk dari kenyataan.
- Label logbook berpotensi mengajari model "kabupaten yang rajin melapor" (menguntungkan semua model sama rata, tetapi
  menggembungkan keterampilan mutlak), dan tanggal logbook kasar menggeser label beberapa hari terhadap jendela fitur. Efeknya
  pada kontras tidak diukur selain lewat kontrol DIBI saja di §5.
- Sampel 39 kabupaten dipilih dari yang sering banjir (kejadian <= 2021). Hasil tidak otomatis berlaku nasional.

## 7. Kode dan sidik

- Berkas baru `scripts/banjir/model_kab_hulu.py` yang MENGIMPOR `model_kab.py` dan `uji_balik.py` tanpa mengubahnya. Mode:
  `basin` (tentukan basin dan sel hulu, sekali), `ambil` (CHIRPS, lanjut dari cache), `latih`, `sia`, `buka`, `uji` (swauji
  tanpa jaringan). Keluaran di `data/raw/banjir/model_kab_hulu/`, bukan public/.
- `latih` membekukan: sha256 berkas ini, sampel, basin dan sel hulu, daftar sel nodata, manifest cache ERA5 dan CHIRPS,
  salinan tabel label latih (kab, hari, y) beserta sha256-nya, dan sha256 `model_kab.py`, `uji_balik.py`, `status.py`,
  `label_bersatu.py`, `scripts/data/logbook_bersih.py`, `data/pusdalops/logbook_kejadian.csv`, serta baris <= 2025
  `data/raw/banjir/dibi_tanggal.json`. Bila cache ERA5 2026 DEBIT belum beku saat `latih`, ERA5 2026 diunduh ke
  `model_kab_hulu`; hasil HULU tidak pernah dibandingkan angka demi angka dengan DEBIT. Sidik ditulis ke `scripts/banjir/model_kab_hulu.sidik`
  dan di-commit. `sia` dan `buka` menolak bila sidik berubah, dan masing-masing hanya bisa jalan sekali (penanda ditulis
  sebelum menilai).
