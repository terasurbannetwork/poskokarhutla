# Pra-registrasi: debit Google Runoff Reanalysis (GRRR) pada model peluang banjir kabupaten-hari

Dibuat 1 Nov 2026, ditulis SEBELUM fitur GRRR disilangkan dengan label mana pun. Satu-satunya hitungan yang sudah dijalankan
pada data GRRR untuk sampel ini: cakupan `fitur` (jumlah kabupaten dengan outlet memenuhi syarat dan porsi kab-hari yang punya
nilai fitur), tanpa membaca label (§6). Berkas ini harus ditinjau validasi-model (konteks bersih) sebelum `latih` dijalankan.
Kerangka (sampel, label latih, model M0/M3, Platt lintas tahun, bootstrap blok berpasangan, gerbang `sia`/`buka`, jejak
`.sidik`, aturan `latih --ulang`) DIWARISI dari `PRAREG-HULU.md` (+ amandemen A1) lewat pola `PRAREG-TANAH.md`; yang ditulis di
sini hanya yang berbeda. Bila berkas ini diam tentang sesuatu, aturan PRAREG-HULU yang berlaku.

## 0. Mengapa pembagian waktu HULU TIDAK bisa diwarisi

GRRR `distributed_model_2026_11` adalah berkas beku: reanalisis 1980-12-31..**2025-12-30**, reforecast 2016-01-01..2025-12-31
(RISET-GRRR §1). Uji A HULU (2026-01..09) dan Uji B (2026-11..2027-04) berada SESUDAH data terakhir, dan tidak ada umpan
GRRR operasional di bucket publik. Versi berikutnya (bila terbit) adalah model hidrologi lain (Q2 baru/lama median 1,07, P5-P95
0,53-2,07), jadi tidak boleh menyambung deret ini. Akibatnya percobaan ini hanya bisa dinilai pada periode <= 2025, yang
seluruhnya sudah pernah dilihat rancangan lain. Pembagian di §4 memakai pembagian ASLI `model_kab.py` (latih 2016-2021,
validasi 2022-2023, uji 2024-2025), dan uji itu diperlakukan sebagai **uji pakai-ulang** dengan koreksi multiplisitas (§5).

Status HULU/TANAH per 1 Nov 2026: Uji A/B HULU BELUM dibuka (tidak ada `sia.mulai`/`buka.mulai`/`sia.json`/`buka.json` di
`data/raw/banjir/model_kab_hulu/`; `sia` paling cepat 2027-02-15); TANAH belum `latih`. Uji `model_kab.py` 2024-2025 SUDAH
dibuka 29 Okt 2026 (`data/raw/banjir/model_kab/uji.json`, CI95).

## 1. Pertanyaan

- **HG (debit GRRR):** apakah debit reanalisis GRRR, dinyatakan sebagai rasio terhadap Q2 outlet, menambah daya pisah peluang
  banjir kabupaten-hari?
  - **G1: M3G - M3** (di atas resep model terbaik HULU di validasi HULU, M3 = M0 + CHIRPS + hulu).
  - **G2: M0G - M0** (di atas model ERA5 saja).

## 2. Data

- **Sampel, label latih, CHIRPS, basin hulu, ERA5:** sama dengan PRAREG-HULU §2, dibaca dari berkas HULU tanpa mengubahnya
  (`data/raw/banjir/model_kab_hulu/sampel.json`, `basin.json`, cache `chirps/`; cache ERA5 `uji_balik`).
- **Label latih:** dibangun ulang dengan fungsi HULU dan WAJIB sama dengan `label_latih.json` HULU (`sha256`, `n`,
  `sha256_label_bersatu_csv`, `sha256_hari_tercakup`); bila beda, `latih` menolak. Yang dipakai hanya baris tahun latih
  2016-2021 (label tambahan logbook 2022-2023 HULU tidak masuk baris mana pun di sini).
- **Pagar label uji:** `latih` hanya membaca DIBI <= 2023-12-31: salinan `dibi_le2023.json` dibuat dari
  `data/raw/banjir/dibi_tanggal.json`, dicek sama dengan `dibi_le2025.json` HULU yang dipotong ke <= 2023, dan hanya salinan
  itu yang dilihat kode latih. Label 2024-2025 dibekukan (salinan + sha256) baru di `sia` (2024) dan `buka` (2025).
- **GRRR:** `distributed_model_2026_11`, `data/raw/banjir/grrr/reanalisis/ck*.npz` (float32) dan `reforecast/ck*.npz` (float16,
  [gauge, issue, lead]), dipanen `grrr.py`; outlet ke kabupaten lewat kolom `prov`/`kab` `public/banjir/data/grrr_ambang.json`
  (titik outlet di dalam poligon kabupaten). Dibaca dengan pembaca `.npy` stdlib (tanpa numpy).
- **Waktu GRRR:** atribut `time` reanalisis = `days since 1980-12-31 00:00:00`, tanpa zona; dianggap hari UTC. Apakah label
  hari d menandai awal atau akhir periode 24 jam TIDAK terdokumentasi. Hari GRRR d dipetakan ke tanggal kalender d (tidak
  digeser), sama dengan CHIRPS di HULU. Reforecast: `issue_time` = `days since 2016-01-01`, `lead_time` 11 nilai bersatuan hari;
  indeks lead l = l hari sesudah issue.
- **Q2 per outlet:** Gumbel-momen (`sungai.gumbel`) atas maksimum tahunan reanalisis **tahun 1981-2021 saja** (tahun dengan
  >= 300 hari bernilai; 1980 hanya satu hari dan gugur). Kurang dari 10 tahun, atau Q2 <= 0 (pencilan ekstrem), -> tidak ada Q2 -> outlet tidak memenuhi syarat.
  Q2 resmi parquet Google TIDAK dipakai (memakai seluruh deret).
- **Outlet memenuhi syarat:** outlet di dalam poligon kabupaten Indonesia dengan Q2(<=2021) >= **P25 nasional** Q2(<=2021) atas
  semua outlet GRRR yang jatuh di poligon kabupaten Indonesia (persentil ke-25, `bisect` pada daftar terurut, indeks
  floor(0,25 (n-1))). Nilai P25 dihitung sekali oleh `fitur` dan dibekukan.
  Kejujuran pilihan P25: dipilih SEBELUM cakupan `fitur` dihitung, tetapi SESUDAH penulis melihat jumlah outlet GRRR mentah
  (tanpa saring Q2) per kabupaten sampel dan median Q2 resmi nasional (47 m3/s, RISET-GRRR §2). P50 sempat dipertimbangkan dan
  ditolak di kepala karena tampak membuang banyak kota kecil; P50 TIDAK pernah dihitung. Persentil yang benar-benar dihitung:
  **satu** (P25). Tidak ada label yang dilihat.
- **Kabupaten tanpa outlet memenuhi syarat** dikeluarkan dari KEEMPAT model (M0, M3, M0G, M3G), tidak diisi; daftar dan jumlahnya
  disidik dan dilaporkan, terpisah dari `kab_dibuang` HULU (CHIRPS).
- **Hari hilang:** outlet dengan NaN pada salah satu hari jendela gugur untuk baris itu; bila tidak ada outlet tersisa, baris
  keluar dari keempat model. Hari sesudah 2025-12-30 tidak punya nilai (akhir data).

## 3. Fitur

Kelompok `grrr` (M0G, M3G), per kabupaten-hari e (hari sasaran WIB), dibekukan sekarang:

- `g_rasio`: maks atas outlet memenuhi syarat dari maks_{d in e-2..e} Q(d) / Q2. Hari GRRR UTC e-2..e mencakup kira-kira
  07.00 WIB e-2 sampai 07.00 WIB e+1 (atau satu hari lebih awal bila label = akhir periode), jadi memuat hari sasaran itu sendiri:
  **prakiraan sempurna (reanalisis)**, setara dengan `h3`/`c3` (e-1..e+1) di M0/M3.
- `g_porsi`: porsi outlet memenuhi syarat (yang jendelanya lengkap) dengan maks_{d in e-2..e} Q(d) >= Q2.

Regresi logistik: `log1p(g_rasio)`, `g_porsi` apa adanya, lalu standardisasi latih (seperti HULU). Tidak ada fitur lain, tidak ada
lag lain, tidak ada ambang Q5/Q20, tidak ada ablasi sesudah dibekukan.

**Model** (empat, semua dilatih di percobaan ini pada baris yang SAMA): M0 = resep M0 HULU, M3 = resep M3 HULU,
M0G = M0 + `grrr`, M3G = M3 + `grrr`. Angka M0/M3 di sini bukan pengganti kandidat HULU.

**Informasi konvensi hari (tanpa label, dihitung 1 Nov sesudah ulasan):** median antar 27 kabupaten korelasi
log(`g_rasio` hari e) dengan log1p(hujan ERA5 WIB maks sel kabupaten) 2016-2021, menurut lag hujan: e-3 0,521; e-2 0,520;
e-1 0,490; e 0,418; e+1 0,329. Puncak di hujan e-3..e-2 cocok dengan tunda alir hujan ke debit dan dengan jendela maks e-2..e;
angka ini TIDAK memutuskan apakah label hari GRRR menandai awal atau akhir periode, dan jendela fitur tidak diubah karenanya.

**Uji sekunder (deskriptif, tidak menentukan vonis):** fitur hindcast berlabel **"hindcast"** dari reforecast pada lead
L in {1, 3, 5, 7, 10}: issue i = e - L, nilai hari d in [max(e-2, i), e] diambil dari lead d - i; rasio terhadap Q2 yang sama.
M0G dan M3G yang dilatih dengan reanalisis dipakai apa adanya dengan kolom `grrr` diganti hindcast. Dinilai pada baris uji
yang punya hindcast di kelima lead (dilaporkan n-nya), berdampingan dengan fitur reanalisis pada baris yang sama: AUC
univariat `g_rasio`, dETS/dBSS (bootstrap 2.000 ulangan, tanpa gerbang).

## 4. Pembagian waktu

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2016-01-01 s.d. 2021-12-31 | pohon, regresi logistik, batas persentil, frek/klimatologi, Q2 GRRR (<= 2021) |
| Validasi | 2022-01-01 s.d. 2023-12-31 | pilih kelompok dan hiperparameter, Platt lintas tahun (2022 <-> 2023) |
| Uji A (`sia`) | 2024-01-01 s.d. 2024-12-31 | hanya pemeriksaan kesia-siaan, tidak bisa meluluskan |
| Uji B | 2025-01-01 s.d. 2025-12-30 | bersama Uji A menjadi uji final (`buka`) |

- Tidak ada uji prospektif: GRRR tidak punya umpan operasional.
- `sia` dan `buka` boleh jalan sejak 2026-11-02 dan hanya sesudah baris jejaknya di-commit (gerbang HULU); tidak ada syarat
  kelengkapan data baru (semua data sudah ada), kecuali CHIRPS (aturan HULU; 2025-05 diterima hilang dan jatuh di Uji B).

## 5. Kriteria

Ukuran sama dengan HULU: dETS berpasangan pada jumlah alarm sama dengan aturan `status.py` (>= Waspada, >= Siaga) dan dBSS
terhadap klimatologi kab-bulan terkalibrasi. Bootstrap blok dua skema (kabupaten x musim-tahun, pulau x minggu), blok identik
untuk keempat model, batas bawah = terkecil dari dua skema, batas atas = terbesar. **10.000 ulangan**, biji 11.

**Multiplisitas (uji pakai-ulang).** Periode 2024-2025 dengan label DIBI kabupaten-hari sudah dipakai SEBELUM rancangan ini
oleh: (1) uji `model_kab.py` (dibuka 29 Okt 2026, satu vonis, CI95), (2) validasi DEBIT M1-M0, (3-4) validasi HULU M2-M0 dan
M3-M2. Semua tatapan itu mendahului rancangan ini sehingga bisa memengaruhinya (jalur bercabang), maka dihitung dalam keluarga
bersama G1 dan G2: **m = 6**. Bonferroni pada alfa satu-sisi 2,5%: 2,5/6 = 0,417%, dibulatkan ke bawah -> **satu-sisi 0,4% per
kontras, selang 99,2% tengah (persentil 0,4 dan 99,6)**, sama dengan TANAH. Tatapan sesudah sidik GRRR (mis. validasi TANAH
2024-2025) tidak menambah m. Keluarga Uji A/B HULU (2026-2027) TIDAK disentuh: GRRR tidak memakai Uji A/B itu. Uji logbook
(`uji_logbook.py`, label logbook, aturan) dan DAMPAK (vonis peluang 2026) tidak dihitung: label/periode vonis lain.

Selang 99,2% adalah **penalti ad hoc, bukan jaminan galat keluarga (FWE) 2,5%**: empat tatapan lama tidak berjalan pada 0,4%
(uji model_kab memakai CI95, validasi DEBIT/HULU dibaca tanpa koreksi), dan rancangan ini menempuh jalur bercabang sesudah
melihatnya. **p/selang tidak setara alfa nominal; vonis = bukti awal.** Angka 99,2% tetap dipakai sebagai ambang tertulis.

Pemilihan (sama dengan HULU): kelompok GBDT atau regresi logistik menurut logloss validasi M0 sesudah Platt lintas tahun; M3,
M0G, M3G memakai kelompok yang sama; hiperparameter GBDT disetel per model dengan kisi HULU (biji 1); model akhir 5 biji, Platt
per biji di seluruh validasi. Daya: MDE dETS tiap kontras dari bootstrap validasi untuk 200 kejadian (`mde_h`), z = 2,652.

Kesia-siaan (`sia`, Uji A 2024, sekali): dETS Waspada titik <= 0 -> kontras DIHENTIKAN, "tidak terbukti". Bila keduanya
dihentikan, `buka` ditolak.

Vonis final (Uji A + B, `buka`, sekali), selang 99,2%:
- LULUS bila SEMUA: batas bawah dETS Waspada > 0; batas bawah dETS Siaga > 0; batas bawah dBSS > 0; DAN **titik dETS Waspada
  pada 2025 saja > 0** (veto 2025: 2025 satu-satunya tahun uji yang bersih dari hidrologi latih Google, §6 ancaman (a)). Gagal veto ->
  TIDAK MEYAKINKAN. Veto tidak pernah menaikkan vonis.
- TIDAK LULUS bila dETS Waspada titik <= 0 atau batas atasnya < 0.
- TIDAK MEYAKINKAN selain itu.
- Kontrol DIBI-saja dan "LULUS, PEKA LABEL": fungsi HULU yang sama.
- "(daya rendah)" memakai ambang RELATIF, bukan 0,02 HULU: mde_80 dETS Waspada > 0,25 x ETS Waspada aturan `status.py` di
  validasi 2022-2023 (dibekukan di kandidat), dan vonis bukan TIDAK LULUS. Alasan: 0,02 absolut tidak bermakna pada sampel
  27 kabupaten dengan laju dasar lain.
- Teks setiap vonis berakhiran **"; bukti-konsep prakiraan sempurna (uji pakai-ulang); bukan bukti operasional"**. Di
  sebelahnya dilaporkan dETS Waspada dan dBSS titik hindcast lead 3 dan 5 (deskriptif, §3). Lulus berarti layak diuji
  prospektif pada sumber debit operasional, BUKAN boleh dipasang. Status resmi `status.py` tidak ditimpa.

Dilaporkan tanpa menjadi gerbang: AUC, logloss, Brier keempat model dan klimatologi; ETS tiap model dan aturan; dETS per pulau;
**dETS dan dBSS per tahun (2024 dan 2025 terpisah)**; jumlah baris dan kabupaten yang dikeluarkan aturan GRRR; uji sekunder
hindcast (§3).

## 6. Kejujuran dan batas

- **Yang sudah dilihat penulis sebelum menulis ini.** (a) Angka validasi HULU 2024-2025 (dikutip di PRAREG-TANAH §6: AUC M0
  0,8068, M3 0,8226; kontras M3-M2 dan M2-M0 kecil). (b) Pesan commit DEBIT: debit GloFAS tidak menambah di validasi 2024-2025.
  (c) Bahwa uji `model_kab` 2024-2025 sudah dibuka (isi vonisnya tidak dibaca untuk rancangan ini). (d) RISET-GRRR §2-3 (Q2,
  banding ambang 14 titik). (e) Cakupan `fitur` (§7): jumlah outlet dan kab-hari bernilai, TANPA label. Tidak ada GRRR yang
  disilangkan dengan label. Bukti awal (b) mengarah ke "debit model tidak menambah"; harapan penulis kecil.
- **Ancaman validitas:**
  (a) Model Google v2 (preprint EGUsphere egusphere-2026-2283, Cohen dkk., "Google Global Flood Forecasting Model Version 2")
  menurut pengulas preprint memakai rekaman debit sampai sekitar 2024; periode latih resmi tidak diketahui. Jadi uji 2024-2025
  TIDAK murni di luar waktu bagi model hidrologinya (2024 paling tercemar, 2025 paling bersih; karena itu hasil per tahun
  dilaporkan). Label kita (DIBI, logbook) tidak dipakai Google, jadi kebocoran label tidak langsung.
  (b) Lokasi outlet berlabel UNOFFICIAL; outlet di dalam poligon kabupaten tidak berarti sungai utamanya melintasi kawasan
  terdampak.
  (c) Banjir kota kecil dan drainase perkotaan tidak tertangkap sub-DAS; kota tanpa outlet memenuhi syarat dikeluarkan, jadi
  hasil tidak berlaku untuk mereka.
  (d) Versi operasional Flood Hub belum tentu sama dengan GRRR `2026_11` (pengulas preprint: pipeline terbuka berbeda dari
  operasional). Lulus uji di sini BUKAN siap operasional.
  (e) Reanalisis dipaksa cuaca teramati (prakiraan sempurna), jadi keuntungan apa pun batas atas; hindcast lebih dekat ke
  operasional tetapi hanya deskriptif.
  (f) Uji pakai-ulang: 2024-2025 sudah dilihat (§5). Validasi 2022-2023 adalah periode ablasi model_kab yang memilih fitur M0,
  jadi pemilihan condong ke M0 (bias melawan GRRR). Pembanding G1 (M3) dipilih sebagai "terbaik" di validasi HULU 2024-2025,
  tahun yang SAMA dengan uji G1, jadi pembanding condong ke M3 (konservatif terhadap GRRR).
  (g) Q2 dari reanalisis 1981-2021 dipakai juga untuk tahun latih 2016-2021: ambang memakai data tahun latih itu sendiri
  (tanpa label), sama seperti batas persentil `pers_h3` HULU.
- **Hanya 27 kabupaten.** Kontras hanya sebanding di dalam 27 kabupaten yang punya outlet; angka M0/M3 di sini TIDAK boleh
  dibandingkan dengan angka HULU (39 kabupaten), juga per pulau (Bali-Nusa Tenggara tinggal Kota Denpasar).
- **g_rasio condong naik terhadap jumlah outlet:** maks atas banyak outlet (sub-DAS bersarang, satu sungai terhitung beberapa
  kali) lebih sering melewati Q2 di kabupaten besar beroutlet banyak (Luwu Utara 46, Kota Semarang 1). Sebagian ditangkap
  `frek_dibi` (laju kejadian kabupaten), tetapi sisa efek ukuran tidak dipisahkan.
- Batas HULU tetap berlaku: label DIBI kurang lapor, logbook menggembungkan keterampilan mutlak, sampel 39 kabupaten dipilih dari
  yang sering banjir (kejadian <= 2021).

## 6a. Tafsir pelaksanaan (ditetapkan sebelum `latih`)

1. Kerangka HULU dipakai dengan menunjuk ulang variabel modulnya di proses ini saja (`pasang()`, hanya dari `__main__`):
   folder keluaran, jejak `.sidik`, selang, kontras, transformasi LR, sidik, kelengkapan, `MK.LATIH/VALIDASI/UJI` = 2016-2021 /
   2022-2023 / 2024-2025, tanggal `sia`/`buka`. `model_kab_hulu.py` tidak diubah.
2. Fitur dihitung sekali oleh `fitur` ke `data/raw/banjir/model_kab_grrr/fitur.json.gz` (memuat Q2, P25, daftar outlet per
   kabupaten, deret fitur reanalisis dan hindcast, manifest sha256 berkas npz yang dibaca). `fitur` menolak menimpa bila
   `kandidat.json` sudah ada.
3. Veto 2025 memakai titik dETS Waspada 2025 dari laporan per tahun (`per_tahun_deskriptif`, baris 2025 saja, alarm sebanyak
   aturan pada 2025, peringkat top-n dan pemecah seri dihitung dalam 2025 saja); bila 2025 tanpa kejadian, veto berlaku (tidak lulus syarat).
4. Swa-uji `uji` wajib memuat assert pembeda: mengubah Q hari e-3 atau e+1 tidak mengubah fitur; e-2, e-1, e mengubahnya;
   nilai ekstrem 2022 tidak mengubah Q2; nilai 2021 mengubahnya; Q2 <= 0 dengan >= 10 tahun -> tanpa Q2; label 2024 tidak lolos
   pagar latih; veto 2025 menurunkan LULUS dan tidak menyentuh TIDAK LULUS; ambang daya relatif. `fitur` menolak deret
   reanalisis yang panjangnya bukan sampai 2025-12-30.

## 7. Kode dan sidik

- `scripts/banjir/model_kab_grrr.py` MENGIMPOR `model_kab_hulu.py` (dan lewat itu `model_kab.py`, `uji_balik.py`), `grrr.py`,
  `sungai.py` tanpa mengubahnya. Mode: `fitur` (tanpa label), `uji`, `latih [--ulang "<alasan>"]`, `sia`, `buka`. Keluaran di
  `data/raw/banjir/model_kab_grrr/`.
- `latih` membekukan (sidik 16 hex): kriteria, isi kandidat (empat model, kontrol, MDE, klimatologi, outlet per kabupaten),
  konstanta, sha256 berkas ini, `model_kab_hulu.py`, `model_kab.py`, `uji_balik.py`, `status.py`, `label_bersatu.py`,
  `umum.py`, `model_kab_debit.py`, `grrr.py`, `sungai.py`, `scripts/sebaran/gbdt.py`, `PRAREG-HULU.md`, `PRAREG-GRRR.md`
  (TANAH tidak diimpor, jadi tidak disidik),
  sampel dan basin HULU, `label_latih.json` HULU dan salinannya, `dibi_le2023.json`, `fitur.json.gz`, `grrr_ambang.json`,
  manifest ERA5 dan CHIRPS s/d 2026-01-03.
- Jejak `scripts/banjir/model_kab_grrr.sidik` (JSONL hanya-tambah, di-commit). `sia`/`buka` menolak bila sidik berubah, bila
  baris `latih` terakhir di HEAD tidak cocok, dan masing-masing hanya sekali (penanda `.mulai`).

## 8. Amandemen

Aturan `latih --ulang` sama dengan PRAREG-TANAH §8 (galat teknis saja, alasan tertulis di jejak, dicatat di sini sebelum `sia`,
dilaporkan di `buka`). Belum ada amandemen.
