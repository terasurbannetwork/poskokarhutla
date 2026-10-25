# Model risiko api 7 hari per sel ~5,5 km: rancangan dan syarat lolos

23 Okt 2026, didaftarkan dan di-commit SEBELUM dibangun. Pemicu: peta prediksi mingguan Kalsel 5x5 km (Dr Adilan
Mahdiyasa, ITB; postingan 22 Okt 2026) dan permintaan pemilik membuat model prediktif serupa untuk keputusan lapangan.

## Pembanding luar yang sudah kita uji

- Metode PFVI Mahdiyasa dkk. (paket peatfr, *Ecological Informatics* 2025; repo `bagaswibowo/peatfr`) sudah diuji di
  repo ini 15 Okt (`scripts/sebaran/RISET-PFVI.md`): PFVI sendiri tidak lebih baik dari FWI (AUC 0,767 vs 0,783), FWI +
  PFVI menambah +0,02 AUC. PFVI masuk sebagai kandidat fitur, bukan model.
- Makalah peta mingguan mereka (*Natural Hazards Research* 2026, "A Calibrated Spatio-Temporal Machine Learning Model for
  Tropical Peatland Fire Risk") belum bisa dibaca (akses ditolak); angka kinerjanya tidak dikutip di sini.

## Yang diramal

- **Satuan:** sel kisi 0,05 derajat (~5,5 km; kisi yang sama dengan `riwayat_sel`).
- **Target:** sel punya >= 1 titik VIIRS keyakinan sedang/tinggi, api vegetasi, dalam 7 hari WIB sesudah hari terbit.
- **Tahan pensiun S-NPP (1 Nov 2026):** target dan fitur harus bisa dihitung TANPA S-NPP. Pengerja menetapkan sensor
  (NOAA-20 sejak 2018, dan/atau S-NPP sebelumnya dengan faktor penyetara yang diukur di masa tumpang tindih) dan
  menuliskan pilihannya sebelum melatih.

## Fitur (hanya yang diketahui pada hari terbit; tanpa melihat masa depan)

Api: titik 7 dan 30 hari di sel, jendela 3x3 dan ~55 km; hari sejak api terakhir. Riwayat: frekuensi sel di minggu
kalender yang sama dan kekerapan tahunan, dihitung dari tahun SEBELUM tahun target saja. Lahan: gambut, kawasan,
konsesi, jarak kanal/jalan/desa (lapisan yang sudah dipakai model sebaran). Iklim: ONI, DMI (bulan sebelumnya).
Cuaca: hujan 7/30/60 hari, hari tanpa hujan, DC/FWI dari ERA5 harian per sel 0,25-0,5 derajat; hujan 7 hari ke depan
hanya dari prakiraan yang benar-benar tersedia saat itu (tidak memakai ERA5 masa depan sebagai prakiraan). PFVI
kandidat. Wilayah: efek provinsi dan kabupaten bertingkat (cara `HIERARKI-WILAYAH.md`), dihitung dari tahun latih saja.

## Pembanding (harus dikalahkan)

1. **Persistensi:** sel yang ada api 7 hari terakhir.
2. **Klimatologi:** frekuensi sel di minggu kalender yang sama, tahun-tahun sebelumnya.
3. **Gabungan sederhana:** regresi logistik persistensi + klimatologi.

## Uji

- Tinggalkan-satu-tahun, 2015-2025 (semua fitur riwayat dan efek wilayah dihitung ulang tanpa tahun uji).
- Dinilai per sel-minggu musim Juli-November, juga sepanjang tahun.
- Ukuran: AUC, Brier skill terhadap pembanding terbaik, kurva kalibrasi (kemiringan), recall pada 10% luas teratas per
  provinsi-minggu. Selang 95% bootstrap blok provinsi x tahun.
- Rincian: per provinsi, per fase ENSO (El Niño, netral, La Niña), per lahan (gambut/mineral).

## Syarat lolos (dibekukan)

1. Brier skill terhadap pembanding terbaik > 0 dengan batas bawah selang > 0, dan AUC lebih tinggi dengan batas bawah
   selisih > 0.
2. Tidak kalah dari pembanding terbaik (Brier skill) di provinsi prioritas mana pun yang punya >= 200 sel-minggu berapi.
3. Kemiringan kalibrasi 0,8-1,2 pada tahun uji gabungan.
4. Tidak kalah di fase ENSO mana pun (El Niño dan bukan El Niño dinilai terpisah).

Lolos: lapisan peta "Peluang api 7 hari" dengan keterangan keandalan, PLUS catatan prospektif mingguan (ramalan dibekukan
hari terbit, dinilai 7 hari kemudian). Gagal: tidak tampil; hasil ditulis di dokumen ini.
