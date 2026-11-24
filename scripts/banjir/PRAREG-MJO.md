# Prapendaftaran: fase MJO (amplitudo >= 1) memodulasi kejadian banjir kabupaten-hari di atas klimatologi kab x bulan

Status: DIBEKUKAN 24 Nov 2026 (tiket H21), SEBELUM data uji (2023-01-01 s.d. 2026-03-27) dibuka atau dinilai. Satu-satunya angka MJO yang dilihat
pembuat: nilai terakhir deret hidup (22 Nov 2026, fase 4, amplitudo 1,135) dan jeda terbit (2 hari). Tidak ada label banjir, tidak ada hasil.
Pelaksana kode: `cuaca-udara` (mjo.py), kode uji menyusul oleh pemilik modul banjir; kode itu mengimpor, tidak mengubah, `umum.py` dan `ets`/bootstrap yang ada.
Aturan main induk: `docs/banjir/PETA-JALAN-MODEL-BANJIR.md` §2 (arsip hanya menolak, prospektif memutus, protokol beku dulu).

## 1. Pertanyaan

Satu hipotesis per wilayah: apakah fase MJO aktif (amplitudo RMM >= 1) mengubah peluang kejadian banjir pada kabupaten-hari di atas klimatologi
kabupaten x bulan sendirian? Lima wilayah, lima hipotesis terpisah, tidak digabung menjadi satu klaim nasional:
Sumatra (kode provinsi 11-21), Jawa-Bali-Nusra (31-36, 51-53), Kalimantan (61-65), Sulawesi (71-76), Maluku-Papua (81, 82, 91-96).
Wilayah ditentukan dari dua digit pertama kunci `pp|Nama` di tabel label.

## 2. Data

- MJO: indeks RMM harian BoM (`rmm.74toRealtime.txt`, URL hidup dan catatan URL lama beku: header `scripts/cuaca/mjo.py`). Deret retrospektif 2008-2026 diunduh SEKALI
  oleh langkah `latih`, sha256 berkasnya dicatat di `PRAREG-MJO.sidik` (baris `jenis: "data_mjo"`). Nilai hilang (fase 999 atau >= 1E30) dibuang, hari itu dianggap "tanpa MJO".
- Fase aktif: `amplitudo >= 1` dan fase 1-8. Amplitudo < 1 = kelas `lemah` (rujukan). Sembilan kelas per hari: lemah, F1..F8.
- Label: `data/raw/banjir/label_bersatu_v2/kab_hari.csv.gz`, hanya kab-hari dengan grup RESMI (kolom `dibi` atau `lb` > 0), sehingga `hanya_gs = 0` (gs, berita, pb tanpa RESMI tidak pernah
  menjadi positif) dan `non_alami = 0` (kejadian non-alami, mis. tanggul jebol, bendungan, tidak dihitung). Hari tanpa cakupan (`cakupan_hari.csv.gz`, `tak_teramati`) dikeluarkan dari pembilang dan penyebut.
  CATATAN TERBUKA: tabel v2 tidak punya kolom bernama `hanya_gs` atau `non_alami`; pengikatan ke kolom nyata (atau ke saringan jenis DIBI banjir/bandang) ditulis di Amandemen A1
  OLEH pembuat kode uji SEBELUM `latih`, tanpa melihat label hari uji. Tanpa A1 berkas ini belum boleh dijalankan.
- Sampel kabupaten: yang punya >= 20 kab-hari positif pada 2008-2019 dan cakupan label (pola `model_kab.py`: dipilih dari kejadian sampai tahun latih terakhir saja). Daftar dibekukan sidik
  sebelum validasi. Groundsource tidak dipakai untuk memilih sampel.

## 3. Pembagian waktu

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2008-01-01 s.d. 2019-12-31 | klimatologi kab x bulan, koefisien fase |
| Validasi | 2020-01-01 s.d. 2022-12-31 | memilih penalti ridge (satu-satunya hiperparameter) |
| Uji arsip (beku) | 2023-01-01 s.d. 2026-03-27 | hanya MENOLAK; dibuka sekali oleh `uji` |
| Prospektif | 2026-11-24 dan sesudahnya (arsip `mjo_arsip.json`) | vonis, bagian 6 |

Tahun 2023-2026 sudah pernah terlihat rancangan lain (PETA-JALAN §2.2), jadi hasil arsip tidak pernah boleh disebut LULUS. Label 2026 hanya dibuka oleh uji beku ini (PETA-JALAN §2.5).

## 4. Aturan jeda (kebocoran jeda rilis, pola ONI di `scripts/kekeringan/bayangan.py`)

Nilai MJO tanggal X baru terbit sekitar X+2 (diukur 24 Nov 2026: data terakhir 22 Nov). Prakiraan untuk kab-hari D dibuat dengan pengetahuan sampai D-1, jadi MJO terbaru yang
boleh dipakai adalah tanggal **D-3** (`LAG_TERBIT = 2`; D-1 dikurangi jeda 2). Aturan ini beku dan berlaku di latih, validasi, uji arsip, dan prospektif:

- Arsip (retrospektif): fitur hari D = kelas MJO pada tanggal D-3, dari deret retrospektif. Memakai tanggal D-3 (bukan D) menutup kebocoran jeda, tetapi nilai retrospektif sudah final
  sedangkan nilai waktu nyata kadang direvisi: ini batas atas, dicatat.
- Prospektif: fitur D = nilai tanggal terbaru dari `tersedia(arsip, D)` di `mjo.py`, yaitu potret terbaru dengan kunci tanggal-ambil <= D-1. Bila tanggal itu lebih tua dari D-3,
  hari itu memakai nilai yang tersedia apa adanya dan jedanya dicatat; hari tanpa potret <= D-1 tidak dinilai.
- Arsip `public/data/mjo_arsip.json` append-only per tanggal ambil, entri tidak pernah ditimpa; ia hanya berlaku maju dari 24 Nov 2026, dan TIDAK dipakai menguji periode 2023-2026-03.

## 5. Model dan kriteria arsip

Semua dihitung per wilayah.

- M0 (klimatologi): laju kejadian kab x bulan dari latih, dihaluskan ((n_pos + 0,5) / (n_hari + 1)), dipakai sebagai skor hari itu.
- M1: regresi logistik dengan offset logit(M0), ditambah indikator fase F1..F8 (rujukan `lemah`), koefisien ridge. Penalti dipilih di validasi dari kisi {0,1; 1; 10; 100} menurut logloss;
  tidak ada hiperparameter, fitur, atau interaksi lain (tanpa ENSO/IOD; ketiadaannya adalah batas yang diakui, bagian 7).
- Pembanding: (a) M0; (b) salinan aturan berlaku sebagaimana dijalankan `uji_balik.py` (keluaran >= Siaga per kab-hari, tidak diubah, tidak dilatih ulang); (c) persistensi tidak dipakai
  di arsip (MJO bukan sinyal lokal).
- Laju alarm SAMA: q = frekuensi alarm aturan berlaku (b) di wilayah itu pada periode uji; M0 dan M1 membunyikan alarm pada q teratas skor per hari-kab (galat seri dipecah menurut kunci kab, tetap).
- Ukuran utama: dETS(M1 - M0) per wilayah pada q itu; sekunder (tanpa gerbang): dETS M1 - aturan berlaku, selisih Brier skill, koefisien fase beserta selangnya.
- Bootstrap DUA skema, 1.000 ulangan, biji 11: (1) blok per kabupaten; (2) blok 30 hari per wilayah (semua kabupaten sewilayah berbagi hari MJO yang sama, jadi blok per kabupaten saja
  meremehkan ketidakpastian). Batas bawah = yang lebih kecil, batas atas = yang lebih besar (konservatif).
- Vonis arsip, hanya menolak: wilayah DITOLAK bila dETS(M1 - M0) titik <= 0 atau batas atas CI95 < 0. Selain itu "LOLOS SARING" (bukan LULUS), koefisien dibekukan sidik, dan wilayah itu lanjut
  ke bagian 6. Wilayah dengan < 100 kejadian di uji arsip: "belum cukup", tidak lanjut.

## 6. Vonis prospektif (kriteria PRAREG-PROSPEKTIF.md, tidak diubah)

Hanya wilayah LOLOS SARING, dengan koefisien yang dibekukan di bagian 5, dinilai prospektif dengan `mjo_arsip.json` sebagai satu-satunya sumber fitur (aturan D-1, bagian 4):
kab-hari, label DIBI/logbook sama (tertunda: hanya hari <= tanggal DIBI terakhir dikurangi 14 hari), pembanding klimatologi (M0) dan aturan berlaku. Belum cukup data bila < 60 hari
atau < 100 kejadian di wilayah itu. LULUS bila batas bawah selang 95% (bootstrap blok-bergerak 7 hari, 1.000 ulangan, biji 7) selisih ETS model terhadap KEDUA pembanding > 0;
vonis dikunci sekali dan tidak diganti. Lima wilayah berarti lima hipotesis: jumlah wilayah yang LULUS dilaporkan berdampingan dengan jumlah yang diuji (satu LULUS dari lima = lemah).
Hanya vonis prospektif yang boleh disebut LULUS; sampai itu, fase MJO tidak masuk `status.py`, kartu, atau tampilan apa pun sebagai faktor terbukti.

## 7. Kejujuran dan batas

- Fase MJO lambat berubah (siklus 30-60 hari): sedikit episode independen per wilayah, walau kab-harinya ratusan ribu. Itu sebab bootstrap blok 30 hari.
- ENSO, IOD, dan musim yang berinteraksi dengan MJO tidak dikendalikan selain lewat klimatologi kab x bulan.
- Nilai retrospektif BoM beralih metode pada 2014 (ENSO dibuang sebelum 2014, hanya rata-rata 120 hari sesudahnya) dan memakai angin ACCESS sejak 2024; pergeseran itu mungkin menggeser
  distribusi fase. Dicatat, tidak dikoreksi.
- Label DIBI/logbook kurang lapor dan terisi susulan; logbook berhenti 2023, jadi periode uji yang jatuh sesudahnya bertumpu pada DIBI saja.
- "Aturan berlaku" di arsip adalah salinan hitung `uji_balik.py` dengan hujan ERA5, bukan prakiraan yang benar-benar terbit.

## 8. Kode dan sidik

- `scripts/cuaca/mjo.py` (pengambil, arsip, `tersedia()`, mode `uji`), fixture `scripts/cuaca/fixture/mjo_rmm.txt` (potongan nyata sumber: 2 baris kepala + 130 hari terakhir per 24 Nov 2026).
- Kode uji arsip: berkas baru `scripts/banjir/uji_mjo.py` (modus `latih`, `uji`), ditulis SETELAH sidik berkas ini, memakai penanda buka O_EXCL sekali jalan seperti `model_kab_debit.py`.
- Sidik: sha256 berkas ini ditulis ke `scripts/banjir/PRAREG-MJO.sidik` (JSON per baris, pola `*.sidik` lain) dan di-commit sebelum `latih`. Sidik berkas data MJO retrospektif,
  daftar sampel kab, dan label latih ditambahkan sebagai baris baru oleh `latih`; baris yang ada tidak diubah. Mengubah berkas ini sesudah sidik = protokol baru dengan tanggal baru.

## 9. Amandemen

(belum ada. A1 wajib: pengikatan `hanya_gs` dan `non_alami` ke kolom/saringan nyata, sebelum `latih`.)
