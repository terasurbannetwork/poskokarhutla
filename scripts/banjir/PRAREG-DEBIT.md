# Prapendaftaran: debit sungai GloFAS sebagai fitur model banjir kabupaten-hari

Status: DISETUJUI pemilik 29 Okt 2026 ("gas semua"), diperbaiki menurut tinjauan validasi-model 29 Okt 2026. Sidik dibekukan
oleh `model_kab_debit.py latih` sebelum model apa pun dinilai. Label DIBI 2026 sudah diunduh dan jumlahnya diketahui pembuat
(75 kabupaten-hari banjir/bandang Jan-Sep 2026 di sampel); fitur, hiperparameter, dan kriteria tidak disetel dari label itu.
Arah "debit" dipilih sesudah melihat kegagalan §10; hanya Uji A dan Uji B yang bersih.
Dibuat 29 Okt 2026 sesudah uji 2024-2025 model kabupaten dibuka dengan vonis TIDAK LULUS (RISET-MODEL-KAB.md §10).

## 1. Pertanyaan

Apakah debit sungai harian GloFAS menambah keterampilan model peluang banjir kabupaten-hari, di atas model yang sama tanpa debit?

Satu hipotesis, satu kontras utama: model dengan debit (M1) lawan model tanpa debit (M0), resep dan sampel sama. Pertanyaan
"GBDT lawan regresi logistik" sudah dijawab di §10 (tidak berbeda) dan tidak diuji ulang di sini.

Alasan: model dan aturan yang diuji di §10 sama-sama hanya melihat hujan, tanah, musim, dan riwayat. Uji balik tidak pernah
memakai sungai ("sungai GloFAS & ansambel tidak diuji", uji_balik.py), padahal aturan harian produksi memakai kelas sungai RK.

## 2. Data

- Sampel: 39 kabupaten dan 104 sel hujan 0,25 derajat yang sama dengan model_kab.py, DIKUNCI dari daftar
  `data/raw/banjir/model_kab/kandidat.json` (`kab`, `sel`) dan disalin ke berkas sampel sendiri. Tidak dipilih ulang walau
  periode latih berubah.
- Label: DIBI banjir dan banjir bandang, kabupaten-hari, satu sumber saja: `data/raw/banjir/dibi_tanggal.json`, dicocokkan
  seperti model_kab.py (`{"banjir","bandang"} & jenis`). Sidik `latih` hanya meng-hash baris <= 2025. Label Uji A dan Uji B
  dibekukan sendiri-sendiri (salinan + sha256) tepat sebelum `sia` dan `buka`.
- Hujan dan tanah: ERA5 lewat `uji_balik.ambil_cuaca`, diperpanjang sampai akhir periode uji.
- Debit: Open-Meteo Flood API (GloFAS v4), `river_discharge` harian 2016-01-01 s.d. akhir periode uji.

Pemilihan titik debit per sel (sekali, sebelum melatih apa pun, tidak melihat label):
1. Pindai kisi 5 x 5 titik berjarak 0,05 derajat di dalam tiap sel (2.600 titik) pada dua jendela 14 hari di periode LATIH,
   1-14 Feb 2023 (musim hujan) dan 1-14 Agu 2023 (kemarau), supaya tidak bias musim. Bobot ~1 per titik per jendela.
2. Ambil titik dengan rata-rata dua median tertinggi per sel (alur utama), buang titik GloFAS kembar.
3. Bila median tertinggi < 5 m3/s, sel ditandai "tanpa sungai berarti". Fitur debitnya tetap dihitung, dan jumlah sel
   bertanda ini dilaporkan.
Alasan: titik tengah sel bisa jatuh di anak sungai kecil. Contoh: sel Bogor (-6,625; 106,875) bermedian 1,83 m3/s.

## 3. Fitur baru (kelompok `sungai`, 3 fitur)

Per sel, lalu kabupaten = maksimum atas sel kabupaten itu (sama dengan fitur hujan):
- `q3`: log(1 + debit maksimum hari e-1..e+1). Jendela sama dengan H3 di model_kab.py (`GESER = -1`), prakiraan sempurna.
- `q_pers`: persentil debit maksimum itu terhadap distribusi debit harian sel itu pada periode LATIH saja.
- `q_naik`: debit maksimum e-1..e+1 dibagi max(median debit e-31..e-2; 0,1 m3/s), dibatasi pada 50.

M0 = fitur model_kab.py tanpa kelompok `anteseden` (dibuang di ablasi §8). M1 = M0 + 3 fitur sungai. Semua besaran yang
bergantung periode latih (`frek_dibi` ekspansif, klimatologi kab-bulan, batas `pers_h3`, batas `q_pers`) dihitung dari latih
BARU 2016-2023. Tidak ada ablasi
lain dan tidak ada fitur tambahan sesudah protokol ini dibekukan.

## 4. Pembagian waktu

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2016-01-01 s.d. 2023-12-31 | pohon, regresi logistik, batas persentil |
| Validasi | 2024-01-01 s.d. 2025-12-31 | setel kedalaman, laju, jumlah pohon, kalibrasi Platt |
| Uji A (beku) | 2026-01-01 s.d. 2026-09-30 | hanya pemeriksaan kesia-siaan, tidak bisa meluluskan |
| (tidak dipakai) | 2026-10-01 s.d. 2026-10-31 | celah antara A dan B |
| Uji B (prospektif) | 2026-11-01 s.d. 2027-04-30 | bersama Uji A menjadi uji final |

Periode 2024-2025 sudah terbuka di §10, jadi turun menjadi validasi. Uji A dan Uji B belum pernah dinilai oleh model
kabupaten mana pun. Data DIBI 2026 untuk 39 kabupaten sampel: 75 kabupaten-hari banjir/bandang Jan-Sep (cek 29 Okt 2026),
terlalu sedikit untuk vonis sendiri.

## 5. Kriteria

Ukuran sama dengan model_kab.py: ETS pada jumlah alarm sama dengan aturan Waspada dan Siaga, dETS berpasangan M1 - M0 (fungsi
baru, memakai `ets` dan bootstrap yang ada), selisih Brier skill M1 - M0. CI95 bootstrap 1.000 ulangan biji 11 dengan DUA skema
blok: kabupaten x musim-tahun (Okt-Mar dan Apr-Sep, tahun ikut, jadi Jan-Mar 2026 dan Jan-Mar 2027 blok berbeda) dan pulau x
minggu (menangkap korelasi antar-kabupaten pada satu sistem cuaca). Batas bawah yang dipakai = yang lebih kecil dari keduanya,
batas atas = yang lebih besar (konservatif untuk TIDAK LULUS).

Kelompok model (GBDT atau regresi logistik) dipilih di validasi menurut logloss M0, lalu M1 memakai kelompok yang sama.
Hiperparameter GBDT disetel terpisah untuk M0 dan M1 dengan kisi dan anggaran yang sama. Satu biji pelatihan; bootstrap hanya
menangkap derau evaluasi, bukan derau pelatihan.

Daya: sebelum dibekukan, `latih` menjalankan simulasi bootstrap pada validasi 2024-2025 dengan jumlah kejadian setara Uji A+B
(perkiraan 150-250) dan mencatat dETS minimum yang terdeteksi (MDE) di berkas hasil. MDE dicatat, tidak mengubah kriteria.
MDE hanya mengukur derau evaluasi pada alarm tetap, jadi daya sebenarnya lebih rendah.

Pemeriksaan kesia-siaan (Uji A, dibuka sekali sesudah 2026-11-15 supaya laporan DIBI September sudah masuk):
- sebelum menilai, bandingkan sebaran q3 validasi dengan Uji A (kuantil 10/50/90) dan catat; nilai GloFAS 2026 bisa dari jalur
  sementara;
- bila dETS(M1 - M0) Waspada titik <= 0, percobaan DIHENTIKAN dengan vonis "tidak terbukti" dan Uji B tidak dibuka;
- selain itu lanjut. Uji A tidak bisa meluluskan apa pun. Aturan ini hanya bisa menolak, jadi tidak menaikkan peluang lulus
  palsu; harganya daya turun karena dETS titik pada ~75 kejadian berisik. CI final tidak dikoreksi untuk seleksi A.

Vonis final (Uji A + Uji B digabung, dibuka sekali sesudah 2027-06-01):
- LULUS bila SEMUA:
  1. batas bawah CI95 dETS(M1 - M0) >= Waspada > 0;
  2. batas bawah CI95 dETS(M1 - M0) >= Siaga > 0;
  3. batas bawah CI95 selisih Brier skill (M1 - M0) > 0.
- TIDAK LULUS bila dETS(M1 - M0) Waspada titik <= 0 atau batas atas CI95-nya < 0.
- TIDAK MEYAKINKAN selain itu (arah positif, tetapi CI menyentuh nol). Aturan resmi tetap.

Dilaporkan tanpa menjadi gerbang: dETS M1 - aturan, AUC M1 dan M0, M1 vs klimatologi.
Lulus berarti kelompok `sungai` boleh dipasang di model berlabel sebagai pelengkap. Status resmi status.py tidak ditimpa.

## 6. Kejujuran dan batas

- GloFAS digerakkan oleh ERA5. M1 melihat hujan dua kali lewat jalur sungai. Itu sah karena labelnya DIBI, bukan GloFAS,
  tetapi keuntungan di uji adalah batas atas: produksi memakai prakiraan GloFAS dan IFS, bukan reanalisis.
- Nilai Open-Meteo bulan-bulan terakhir bisa berasal dari jalur sementara GloFAS, bukan reanalisis terkonsolidasi. Tanggal
  unduhan dan versi model dicatat di manifest, lalu ikut disidik.
- Label DIBI kurang lapor. Alarm palsu yang terukur kemungkinan lebih buruk dari kenyataan.
- Sampel 39 kabupaten dipilih dari kabupaten yang sering banjir (kejadian <= 2021), dan label DIBI <= 2025 sudah dilihat
  pembuat rancangan. Hasil tidak otomatis berlaku untuk kabupaten jarang banjir.
- Pindai titik hanya di dalam sel sampel. Sungai besar yang melintasi kabupaten di luar sel itu tidak tertangkap.

## 7. Biaya dan kode

- Kuota Open-Meteo: pindai 2.600 titik (~2.600 bobot), riwayat 104 titik x 11 tahun (~30.000 bobot), ERA5 2026 untuk 104 sel.
  Kira-kira 4 hari kuota gratis, lanjut dari cache bila putus.
- Kode: berkas baru `scripts/banjir/model_kab_debit.py` yang mengimpor model_kab.py dan uji_balik.py tanpa mengubah isinya.
  Konstanta modul yang ditambal dari luar (LATIH, VALIDASI, UJI, rentang tanggal ERA5) ikut disidik nilainya, bukan hanya isi
  berkas. ERA5 2026 disimpan di cache terpisah karena cache uji_balik berhenti 2026-01-03. Mode
  `pilih` (titik), `ambil`, `latih`, `sia` (Uji A), `buka` (final), `uji` (swauji tanpa jaringan). Keluaran di
  `data/raw/banjir/model_kab_debit/`, bukan public/.
- Sidik: kriteria ini, daftar titik terpilih, manifest cache, dan salinan label <= 2025 dibekukan oleh `latih`. Nilai sidik
  ditulis ke `scripts/banjir/model_kab_debit.sidik` dan di-commit, sebagai jangkar di luar data mentah yang tidak dilacak git.
  `sia` dan `buka` menolak bila sidik berubah, dan masing-masing hanya bisa jalan sekali: penanda dibuka ditulis sebelum
  metrik pertama dihitung. Deret ERA5 dan debit jendela Uji A di-hash saat `sia` dan diperiksa ulang saat `buka`.
