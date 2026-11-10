# TIKET-DATA-BMKG

Pengembangan dari audit BMKG, disetujui pemilik 10 Nov 2026. Ambil satu tiket, kerjakan hanya cakupannya.
Aturan bersama: status resmi tampil apa adanya berlabel BMKG, gambar BMKG utuh dengan logo dan sumber, warna peta tidak dijadikan angka,
hasil turunan lolos uji balik sebelum tampil sebagai peringatan, data Dalops tidak masuk repo.

| Kode | Tiket | Pemilik | Status |
| --- | --- | --- | --- |
| DB-01 | Arsip BMKG tiap 3 jam: gempa, tsunami, ikhtisar, sepekan, factsheet karhutla | mekanik-mesin | menunggu push dan run pertama |
| DB-02 | OMC resmi, banding harian dengan Dalops di luar repo | cuaca-udara | berjalan |
| DB-03 | Petir per kabupaten, arsip dengan cakupan jujur | cuaca-udara | berjalan |
| DB-04 | Cuaca 137 bandara dan 658 pelabuhan masuk `/cuaca` | cuaca-udara | berjalan |
| DB-05 | Awan badai per kabupaten tiap jam dari Himawari-9 terbuka: suhu dan tinggi puncak awan | cuaca-udara | berjalan: uji kelayakan |
| DB-06 | Peta asap dari Himawari, label analisis Centurisk97, terpisah dari poligon BMKG | cuaca-udara | setelah DB-05 |
| DB-07 | Abu vulkanik dari Himawari, pelengkap VAAC | gunungapi-kering | setelah DB-05 |
| DB-08 | Pusat karhutla: FWI H+7, factsheet, asap, hotspot, PM2,5, petir | layar-peta | setelah DB-01 tayang |
| DB-09 | Rapor prakiraan: BMKG sepekan dan 10 hari, prediksi kita, lawan kejadian nyata | ruang-bnpb | dirujuk ke SS-02 sampai SS-05 di `data/kajian-bnpb/silang-sumber/TIKET.md` (layar `/bnpb/rapor-sumber`); angka tampil butuh arsip minimal 30 hari |
| DB-10 | Evaluasi OMC: operasi resmi lawan hujan, hotspot, PM2,5 | model-sebaran, validasi-model | setelah DB-02, ikuti pra-registrasi OMC |
| DB-11 | Uji ambang kekeringan lawan peringatan resmi per kecamatan | gunungapi-kering, validasi-model | butuh arsip beberapa dasarian |
| DB-12 | Riwayat gempa dan tsunami masuk kajian daerah, stasiun guncangan untuk pembanding model | gempa, validasi-model | setelah DB-01 tayang |
| DB-13 | Laporan Penanganan: asap, FWI 7 hari, perhatian khusus, hujan stasiun, status OMC | skill ppt-konsultan | setelah DB-01 tayang, lewat mesin laporan |
| DB-14 | Laporan Kejadian Harian: peringatan aktif, prakiraan 3 hari, sarana terdampak | skill ppt-konsultan | setelah DB-04 tayang |
| DB-15 | Slide "Jalur bantuan besok" | skill ppt-konsultan | setelah LG-14 |
| DB-16 | Surat BMKG: radar, token TCWC, akses resmi data yang belum terdokumentasi | skill surat-bnpb | menunggu daftar final |
