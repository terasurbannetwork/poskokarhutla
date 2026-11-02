# Pra-registrasi: uji PROSPEKTIF ambang Siaga per kabupaten/kota dari persentil hujan lokal

Dibuat 2 Nov 2026, SEBELUM satu catatan bayangan pun. Pelaksana: `scripts/banjir/siaga_persentil.py` (mode `segel`, `catat`, `nilai`, `uji`).
Log append-only `public/banjir/data/siaga_persentil_log.json`, skor `public/banjir/data/siaga_persentil_skor.json`, sidik
`scripts/banjir/siaga_persentil.sidik` (JSONL, di-commit). Tidak ada keluaran yang dibaca layar atau `status.py`.

## 1. Pertanyaan dan asal

Uji retrospektif `PRAREG-AMBANG-PERSENTIL.md` (ambang H3 Waspada/Siaga/Awas dari persentil hujan lokal 2016-2021, diuji 2024-2025 dengan hujan
ERA5) berhenti di vonis TIDAK MEYAKINKAN karena jalur Waspada tidak cukup membaik. Jalur Siaga membaik jelas: dETS +0,0104 (CI95 kab x tahun
[0,0037; 0,0171], pulau x minggu [0,0054; 0,0165]), POD 0,19 ke 0,25 pada alarm setara. Kriteria lama tidak diubah sesudah melihat hasil.
Pemilik meminta jalur Siaga SAJA diuji ulang pada data yang belum pernah dilihat: prakiraan nyata ke depan.

Pertanyaan: apakah Siaga banjir dengan ambang H3 per kab (Ps 96,6 lokal, sudah dibekukan) memberi keterampilan (ETS) lebih tinggi daripada
Siaga ambang nasional 80 mm, pada prakiraan Open-Meteo forecast (best match) yang benar-benar terbit, tanpa membanjiri alarm?

## 2. Aturan

- **Aturan sekarang** = `status.level_banjir` produksi (K 0,8: 40/80/120 mm; jalur imax, InaRISK B, sungai RK, ensemble P3 sebagaimana `status.py`).
- **Aturan Siaga-persentil** = persis aturan yang sama, HANYA ambang H3 Siaga kab diganti `s_kab` = ambang Siaga (Ps 96,6) per kab dari
  `ambang_persentil` (sidik `0f07e6957aadd989...`), disalin ke tabel beku `AMBANG_MENTAH` di `siaga_persentil.py` dan dijepit ke
  [40, 120] mm (Waspada 40 <= Siaga <= Awas 120 nasional). Waspada, Awas, imax, B, RK, P3 tidak berubah. TIDAK ada parameter baru yang disetel.
- Level kab = kecamatan tertinggi di kab (satuan yang sama dengan DIBI dan `prospektif.py`). "Ramalan ya" = level >= Siaga (2).
- Masukan = berkas produksi harian yang sama (`hujan.json`, prakiraan Open-Meteo forecast (best match) nyata; ensemble P3 dari `hujan_ansambel.json` memang ECMWF IFS ENS, `bahaya.json`, `sungai.json`), bukan ERA5.
  `catat` menghitung ulang level 'sekarang' dan menolak mencatat bila tidak persis sama dengan `status.json` hari itu.

## 3. Sampel (batas)

40 kab/kota yang punya ambang di `ambang_persentil` (dipilih sebelumnya dari kab yang sering banjir/longsor di DIBI <= 2021). Hanya itu. **Hasil
TIDAK otomatis berlaku nasional**; 40 kab bukan sampel acak. Ambang Siaga beku: min 49,5; median 79,45; maks 120,2 (satu kab, Aceh Selatan,
dijepit ke 120) mm; tidak ada yang di bawah 40. Mayoritas kab lebih rendah dari 80, jadi aturan baru cenderung menambah alarm: itu sebabnya ada batas alarm di §5.

## 4. Catatan (`catat`)

Harian, sesudah `status.py`. Untuk tiap kab sampel dan tanggal terbit hari ini, waktu-tunda 0..3, ditulis level kab menurut aturan sekarang DAN
aturan Siaga-persentil. Semua 40 kab selalu ditulis. Idempoten per tanggal terbit, tidak pernah menimpa, menolak bila arsip lebih pendek/berubah
dibanding git HEAD (kode 3), menolak bila `hujan.json` basi (hari_ini bukan hari ini WIB) atau `status.json` bukan hari ini, dan menolak bila
sidik berubah atau ambang `status.py` bukan 40/80/120 (kode 4), dan menolak bila `JANGKAR_COMMIT` kosong padahal hari ini > 2026-11-04 (kode 4). Kode 3 khusus log menyusut/berubah (menghentikan run);
kode 4 diberi anotasi `::error::` di workflow tanpa menghentikan run, dan hari yang hilang tertangkap aturan kelengkapan 15%.
Level 'sekarang' hitungan sendiri yang beda dari `status.json` = tidak dicatat, kode 1 (peringatan). Tiap entri mencatat sumber/model hujan dari
`meta.json` bila tersedia. Jendela catatan: 2026-11-02 s.d. 2027-04-30 (tanggal terbit).

## 5. Penilaian (`nilai`) dan kriteria (ditulis sebelum data)

- **Label:** DIBI banjir/bandang >= 1 kejadian per kab-hari ATAU logbook Pusdalops (jenis banjir, banjir_bandang, banjir_longsor) pada hari
  mulai (`mulai`, atau `terlihat[0]` bila kosong; 29 dari 543 kejadian banjir logbook tidak punya `mulai`, 421 dari seluruh jenis); logbook
  dicocokkan lewat nama provinsi + nama kab (tanpa "Kab."). Sama dengan label latih HULU. Kepekaan (bukan gerbang): DIBI saja, logbook saja,
  dan dETS per bulan sasaran.
- **Kematangan label (murni umur, satu batas untuk DIBI dan logbook):** DIBI terisi berbulan-bulan (2026: Jan 165, Feb-Mei 99-111, Jun 26, Jul 15, Agu 8
  baris, sedangkan 2025 Jun-Okt 104-144), jadi kematangan tidak diukur dari jumlah baris (aturan semacam itu bisa tak pernah terpenuhi pada bulan
  basah yang DIBI-nya mendatar). Bulan sasaran M matang bila tanggal penilaian >= hari terakhir bulan M + 183 hari (lag DIBI nyata ~5 bulan, plus
  cadangan; konstanta `matang_hari` di blok beku). Tanpa median, tanpa data, tidak bisa disetel. Hanya sasaran di bulan matang yang dinilai; sisanya
  tidak dihitung dan tidak diisi nol. Laporan saja (bukan gerbang): `nilai` mencetak baris DIBI 40 kab sampel per bulan jendela dibanding rata-rata
  bulan kalender yang sama 2023-2025 untuk kab yang sama, supaya pemilik bisa melihat bila DIBI masih bolong.
- **Ukuran:** >= Siaga, waktu-tunda primer 1 hari. Alarm (a+b), POD, FAR, CSI, ETS kedua aturan; dETS = ETS(persentil) - ETS(sekarang).
  Waktu-tunda 0, 2, 3 dilaporkan deskriptif, tidak menghakimi.
- **Bootstrap 1.000 ulangan, resampel identik untuk kedua aturan:** utama blok kab x minggu-ISO (benih 1); kepekaan blok-bergerak 7 hari atas hari
  terbit (benih 7); selang 95% persentil 2,5 dan 97,5.
- **BELUM CUKUP** bila hari terbit dinilai < 90, kejadian (a+c) < 60, ATAU jendela belum selesai: semua bulan sasaran Nov 2026-Mei 2027 matang (Mei ikut
  karena sasaran terbit 30 Apr jatuh 1 Mei), jadi vonis paling cepat 2027-11-30, yaitu Desember 2027. Sebelum itu `nilai` hanya melaporkan
  `perkiraan_sementara` (informasi). BELUM CUKUP sebelum itu BUKAN kegagalan: itu jadwal.
- **TIDAK LULUS** bila titik dETS <= 0.
- **LULUS** bila titik dETS >= 0,005 DAN batas bawah CI95 > 0 di KEDUA skema, DAN alarm Siaga-persentil <= 1,25 x alarm aturan sekarang
  (tidak boleh menang dengan membanjiri alarm), DAN paling banyak 15% hari kalender jendela (sampai min(2027-04-30, tanggal penilaian)) tidak
  tercatat. Rasio alarm dilaporkan di setiap vonis.
- **TIDAK MEYAKINKAN** selain itu.
- **Vonis dikunci sekali.** Dikunci hanya bila jendela selesai (definisi di atas) dan `JANGKAR_COMMIT` terisi. `vonis_akhir` menyimpan hash masukan
  (jumlah baris dan sha256 `dibi_tanggal.json` dan logbook yang dipakai, jumlah hari terbit, sidik); skornya di-commit; sebelum itu `vonis_berjalan` hanya informasi dan boleh berganti. Alasan: memeriksa tiap hari lalu
  menguncinya begitu kriteria minimum tercapai membuang daya uji dan mengundang berhenti-saat-menang. Sekali terkunci, tidak diganti data berikutnya.
- LULUS hanya membuka keputusan pemilik + `validasi-model` untuk memasang Siaga per kab di `status.py` bagi 40 kab ini. Tidak otomatis.

## 6. Kejujuran dan batas

- Ambang Siaga per kab sudah pernah dilihat skornya di 2024-2025 (retrospektif); data ke depan tidak. Itulah gunanya uji ini.
- Prakiraan Open-Meteo forecast (best match) lebih basah/kering dari ERA5 menggeser jumlah alarm kedua aturan; keduanya dihitung dari prakiraan yang sama.
- DIBI terlambat terbit dan kurang catat kejadian kecil: FAR mutlak pesimistis, dan hari terbaru belum matang (lihat kematangan di §5).
- **Daya uji (jujur).** Satu musim hujan; selang kepercayaan dETS diperkirakan sekitar +-0,0095. Efek retrospektif 0,0104 dipilih sesudah melihat
  hasil (jalur Siaga dari uji yang vonisnya TIDAK MEYAKINKAN) dan diukur dengan ERA5 prakiraan sempurna, jadi cenderung terlalu optimis
  (winner's curse); prakiraan nyata biasanya menurunkan keterampilan kedua aturan. Perkiraan pemeriksa: bahkan bila efek nyata ada, peluang
  vonis LULUS kira-kira 25-50%. TIDAK MEYAKINKAN BUKAN berarti aturan gagal; artinya satu musim belum cukup untuk menyimpulkan. Vonis paling cepat Desember 2027.
- Kab dengan nama logbook yang tak cocok pola nama tidak mendapat label logbook (hanya DIBI); kepekaan DIBI-saja dilaporkan.
- Entri yang tercatat sebelum commit protokol tidak ada (log baru). Kriteria dan tabel di bawah, kode inti, dan protokol ini disidik; mengubahnya
  sesudah catatan pertama = uji baru dengan tanggal registrasi baru.

## 7. Sidik dan jangkar

`segel` menulis sidik sha256 atas: berkas ini, sumber fungsi inti `siaga_persentil.py` (aturan, hitung hari, catat, label, penilaian, bootstrap,
vonis, penguncian), blok kriteria beku, tabel ambang beku, `JENIS_LB`, `HARI`, konstanta `status.py` yang dipakai, dan sha256 sumber fungsi
`status.py` yang dipakai aturan (`ambang`, `jendela`, `puncak`, `kelas_sungai`, `km`, `level_banjir`): mengubah `status.py` di tengah musim membuat `catat` berhenti. Menolak bila sidik sudah ada atau log sudah berisi. `catat` dan `nilai` menolak
bila sidik berubah (kode 4). Jangkar: commit yang memuat berkas ini, kode, dan sidik dicatat di `JANGKAR_COMMIT` (di luar sidik) pada commit SESUDAHNYA;
sejak terisi, sidik di commit jangkar harus sama dengan lokal, commit jangkar harus leluhur HEAD (`git merge-base --is-ancestor`), dan tanggal commit jangkar
tidak boleh lebih baru daripada tanggal terbit entri log pertama (bila log ada). Gagal salah satunya, atau jangkar tak terverifikasi (clone dangkal),
= kode 4 (menolak), bukan melewati.

## 8. Kriteria beku

Dibaca mesin: `uji` memastikan blok ini sama dengan `KRITERIA`.

<!-- BEKU:mulai -->
```json
{
 "tanggal_registrasi": "2026-11-02",
 "jendela_mulai": "2026-11-02",
 "jendela_akhir": "2027-04-30",
 "tunda_primer": 1,
 "ambang_status": 2,
 "n_hari_min": 90,
 "kejadian_min": 60,
 "matang_hari": 183,
 "jangkar_batas": "2026-11-04",
 "tak_tercatat_maks": 0.15,
 "boot_b": 1000,
 "benih_minggu": 1,
 "benih_hari": 7,
 "blok_hari": 7,
 "selang_persen": 95,
 "dets_min": 0.005,
 "rasio_alarm_maks": 1.25,
 "jepit_mm": [
  40.0,
  120.0
 ]
}
```
<!-- BEKU:akhir -->
