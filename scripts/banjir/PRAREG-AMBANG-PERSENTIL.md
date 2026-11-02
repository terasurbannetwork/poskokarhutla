# Pra-registrasi: ambang banjir per kabupaten/kota dari persentil hujan lokal

Dibuat 1 Nov 2026, SEBELUM satu skor pun (POD/FAR/CSI/ETS, di periode mana pun) dihitung untuk aturan ini. Pelaksana:
`scripts/banjir/ambang_persentil.py` (mode `uji`, `latih`, `validasi`, `buka`). Keluaran mentah `data/raw/banjir/ambang_persentil/`,
ringkasan `public/banjir/data/ambang_persentil.json` (`"pakai": false`, tidak dibaca layar atau `status.py`), jejak sidik
`scripts/banjir/ambang_persentil.sidik` (JSONL, di-commit).

## 1. Pertanyaan

`status.py` memakai ambang H3 nasional seragam 40/80/120 mm (50/100/150 x K 0,8) di semua kecamatan. `ambang_wilayah.py`
(pengali k per kab) hanya menggeser angka mm nasional itu dan hasilnya identik dengan aturan sekarang. Hipotesis pemilik:
hujan 80 mm biasa di Bogor tetapi ekstrem di NTT, jadi ambang semestinya RELATIF terhadap iklim lokal.

Apakah ambang H3 Waspada/Siaga/Awas yang diturunkan dari persentil sebaran H3 harian kab itu sendiri (2016-2021), pada
JUMLAH ALARM yang sama dengan aturan sekarang, memberi keterampilan lebih tinggi (ETS) daripada ambang nasional seragam,
di tahun yang belum dilihat?

## 2. Data dan satuan

- **Sampel:** semua kab dari `uji_balik.sel_per_kab()` yang SEMUA selnya punya cache ERA5 2016-2025 di
  `data/raw/banjir/uji_balik/` (cara yang sama dengan PRAREG-KAB2 §2), kunci `..|None` dibuang. Tanpa unduhan baru.
  Sampel ditulis ke `sampel.json` saat `latih`. **Sampel ini asalnya dipilih `uji_balik.pilih` dari kab yang sering
  banjir/longsor di DIBI <= 2021 (plus tetangga yang selnya kebetulan sama): hasil TIDAK otomatis berlaku nasional.**
- **Satuan:** kab-hari. Level kab = level TERTINGGI dari sel-sel kab itu (kecamatan tertinggi per sel, seperti `uji_balik`),
  hari e dengan jendela `GESER = -1` (H3 = hujan e-1..e+1; imax = jam terbesar di jendela itu).
- **Hujan:** ERA5 sebagai prakiraan sempurna (batas atas keterampilan operasional, sama dengan `uji_balik`).
- **Label:** DIBI banjir/bandang per kab-hari (`data/raw/banjir/dibi_tanggal.json`, `uji_balik.peristiwa`), semua kab-hari
  dihitung (tanpa pencocokan hari tenang). Salinan DIBI <= 2025-12-31 dikunci sha256 di sidik.
- **Periode (per hari e):**

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2016-01-01 s.d. 2021-12-30 | persentil, pencocokan jumlah alarm. TANPA label. Batas 12-30 supaya jendela H3 e+1 tidak menyentuh 2022 |
| Validasi | 2022-01-01 s.d. 2023-12-31 | boleh dilihat dan dilaporkan oleh pelaksana |
| Uji (`buka`) | 2024-01-01 s.d. 2025-12-31 | dibuka SEKALI; vonis |
| Kepekaan 2026 (`buka`) | 2026-01-01 s.d. 2026-10-18 | label DIBI ATAU logbook Pusdalops hari mulai (`uji_logbook.label_dari`, `gab_mulai`), kab terpetakan saja; bukan gerbang |

Skor 2016-2021 boleh dilaporkan (label tidak dipakai memilih apa pun), tetapi VONIS hanya dari periode uji.

## 3. Aturan

**Aturan sekarang** = `status.level_banjir` dengan `k = 0,8` (ambang 40/80/120), jalur imax, InaRISK B (sel), ensemble tetap.
Jalur sungai RK tidak ada di mesin `uji_balik` (rk = None) dan tidak ada di sini; ensemble P3 juga tidak (None).

**Aturan baru** = persis `level_banjir` yang sama (kondisi, urutan, imax >= 20/30, B >= 0,33/0,66), HANYA tiga ambang H3
(Waspada w, Siaga s, Awas a) diganti ambang per kab:

- Sebaran: nilai H3 harian SEMUA sel kab itu (sel-hari dipool), hari latih saja (§2).
- Ambang = peringkat terdekat (nearest-rank, indeks `ceil(P/100 x n) - 1` pada nilai terurut) persentil P, dibulatkan 0,1 mm.
- **Lantai Waspada: w >= 20 mm** (ditetapkan di sini, tidak disetel). Siaga dan Awas tanpa lantai.
- Tidak ada pengurutan paksa w <= s <= a pada ambang mm; jumlah kab yang urutannya terbalik dilaporkan.

**Memilih Pw, Ps, Pa tanpa label.** Target = jumlah kab-hari alarm aturan sekarang di seluruh sampel pada hari latih, untuk
tiap level (>= Waspada N1, >= Siaga N2, >= Awas N3). Kisi P = 50,0 .. 99,9 langkah 0,1 (500 nilai), jumlah alarm tidak naik
bila P naik, jadi dicari dengan bisect (lalu tetangga terdekat dibandingkan). Berurutan: Pa dari N3 (hanya a yang berpengaruh),
Ps dari N2 dengan a tetap, Pw dari N1 dengan s dan a tetap. Dipilih P yang selisih jumlah alarmnya ke target paling kecil;
seri -> P lebih tinggi. Bila target di luar jangkauan kisi, dilaporkan terang.

## 4. Ukuran dan kriteria

POD, FAR, CSI, ETS (definisi `uji_balik.skor`) untuk >= Waspada dan >= Siaga, dengan jumlah alarm (a+b) kedua aturan
dilaporkan berdampingan. Selisih dETS = ETS(persentil) - ETS(aturan sekarang), per level.

Bootstrap blok **1.000 ulangan**, biji 1, resampel identik untuk kedua aturan, selang 95% (persentil 2,5 dan 97,5):
skema utama blok **kab x tahun**; kepekaan blok **pulau x minggu** (pulau = `uji_balik.KELOMPOK`). Gerbang memakai skema utama;
skema kepekaan dilaporkan berdampingan.

**LULUS** (dinilai di uji 2024-2025, sekali) bila KEDUANYA:
1. batas bawah CI95 dETS >= Waspada > 0;
2. batas atas CI95 dETS >= Siaga >= 0 (tidak negatif bermakna).

**TIDAK LULUS** bila (1) gagal dan titik dETS >= Waspada <= 0. **TIDAK MEYAKINKAN** selain keduanya. LULUS hanya berarti
ambang per kab boleh diusulkan ke pemilik; `status.py` TIDAK ditimpa, `"pakai"` tetap false sampai pemilik memutuskan.
Hasil validasi 2022-2023 memakai kriteria yang sama sebagai informasi, BUKAN vonis.

Dilaporkan tanpa menjadi gerbang: ukuran yang sama per pulau; tabel ambang mm per kab (Waspada/Siaga/Awas) dan
persentilnya, supaya terlihat beda wilayah basah dan kering; kepekaan 2026.

## 5. Kejujuran dan batas

- **Yang sudah dilihat pelaksana sebelum protokol ini:** hanya jumlah kab (40) dan sel sampel. Belum ada skor apa pun.
  Hasil `uji_balik`, RISET-UJI-BALIK.md, dan RISET-AMBANG-WILAYAH.md (aturan sekarang dipilih di 2016-2021 dengan label)
  diketahui pemilik sesi; aturan sekarang karena itu punya keuntungan: kenopnya sudah disetel pada label 2016-2021 sedangkan
  aturan persentil tidak menyentuh label.
- Pencocokan jumlah alarm memakai SELURUH sampel, jadi tiap kab bisa mendapat jumlah alarm berbeda dari aturan sekarang
  (kab basah lebih sedikit, kab kering lebih banyak); itu inti hipotesis. dETS pada jumlah alarm tidak persis sama di
  periode validasi/uji, karena persentil dipilih di latih. Jumlah alarm kedua aturan dilaporkan.
- Prakiraan sempurna: skor operasional lebih rendah. Label DIBI tanggal laporan, kurang catat kejadian kecil (FAR batas atas).
- Sampel kab sering banjir; 40 kab bukan sampel acak nasional. Daya per pulau kecil.
- InaRISK B per sel statis; ensemble, sungai, dan sm tidak diuji.

## 6. Kode dan sidik

`latih` menulis `sampel.json`, `latih.json` (persentil, ambang mm per kab, jumlah alarm vs target) lalu SIDIK sha256 atas:
berkas ini, sumber fungsi inti `ambang_persentil.py` (konstanta, pemilihan, penilaian, bootstrap; BUKAN `buka`, `uji`, kepekaan
2026), `status.py`, `uji_balik.py`, `umum.py`, `sampel.json`, persentil terpilih + ambang mm, salinan DIBI <= 2025, dan
manifest sha256 cache ERA5 sel sampel. Ditulis ke `ambang_persentil.sidik`. `validasi` menolak bila sidik berubah. `buka`
menolak bila sidik berubah, bila `validasi` belum jalan, bila baris `buka` sudah ada di jejak atau penanda
`buka.mulai` (dibuat atomik O_EXCL SEBELUM menilai) sudah ada: dibuka sekali, proses yang mati di tengah tetap terhitung dibuka.

## 7. Amandemen A1 (1 Nov 2026, SESUDAH `latih`/`validasi` pertama, SEBELUM `buka`)

Alasan: temuan pemeriksa konteks bersih atas kode dan protokol sebelum uji dibuka. Semuanya MEMPERKETAT; tidak ada yang
disetel ke label. `latih.json`/`validasi.json`/sidik lama dibuang dan `uji`, `latih`, `validasi` dijalankan ulang dengan
aturan di bawah (hasil validasi pertama: dETS >= Waspada +0,0018, tidak dipakai menyetel apa pun).

1. **Kriteria LULUS (mengganti §4):** Waspada: batas bawah CI95 dETS > 0 di KEDUA skema (kab x tahun DAN pulau x minggu) DAN titik
   dETS >= 0,002 (efek minimum, kira-kira +20% relatif terhadap ETS aturan sekarang ~0,010). Siaga: titik dETS >= 0 DAN batas
   bawah CI95 > -0,005 di kedua skema. Keduanya harus terpenuhi. TIDAK LULUS bila titik dETS >= Waspada <= 0; selain itu TIDAK MEYAKINKAN.
2. **Lantai ambang:** Waspada >= 20, Siaga >= 40, Awas >= 60 mm (setengah ambang nasional) dan urutan w <= s <= a dijamin
   (s = max(s, w), a = max(a, s)). Berlaku saat memilih persentil. Jumlah kab sampel yang tersentuh dilaporkan.
3. `buka` menolak bila tidak ada baris `validasi` di `.sidik` bersidik sama dengan sidik sekarang.
4. Sidik juga mencakup `hasil_periode`, `muat_latih`, `ev_banjir`, `main_buka`, `main_validasi`, `gerbang_buka`, `vonis`, `tersentuh`
   dan konstanta lantai/efek.
5. `buka` menulis baris `buka_mulai` ke `.sidik` (dilacak git) SEBELUM menilai, dan hasil uji + kepekaan 2026 ditulis ke
   `public/banjir/data/ambang_persentil.json` (bagian `uji_2024_2025`, `sensitif_2026`), bukan hanya `data/raw`. Gerbang menolak
   bila `.sidik` sudah punya `buka_mulai` atau `buka`.
6. Catatan keluaran publik memuat: ERA5 prakiraan sempurna (batas atas), DIBI kurang catat kejadian kecil (FAR mutlak pesimistis),
   hanya 40 kab sampel sering banjir, tidak berlaku nasional.
