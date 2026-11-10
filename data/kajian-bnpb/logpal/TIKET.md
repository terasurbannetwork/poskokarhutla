# TIKET-LOGPAL

Ambil satu tiket, kerjakan hanya cakupannya.

| Kode | Tiket | Status |
| --- | --- | --- |
| LG-01 | Migrasi 0112, rute, uji integrasi | selesai |
| LG-02 | Layar `/logpal` dari produk jadi, data statis, vendor d3 | selesai |
| LG-03 | Skrip impor lokal | selesai |
| LG-04 | Dummy dua ikon | selesai |
| LG-05 | Perbaikan tinjauan: rumus CSV, kecepatan klik, angka jujur | selesai |
| LG-12 | Tab Pengantaran di `/instansi/logpal`, migrasi 0113, impor potongan | selesai |
| LG-13 | Pemilik menjalankan migrasi 0113 dan impor ulang dengan `--statis` berisi matriks.json, kecamatan.csv, terdampak.csv | menunggu pemilik |
| LG-06 | Pemilik menjalankan migrasi 0112 dan impor data asli di produksi | menunggu pemilik |
| LG-07 | Jawab pertanyaan terbuka Q1 sampai Q7 di KEPUTUSAN-LOGPAL | menunggu pemilik |
| LG-08 | Peran staf logistik (bila Q2 menjawab perlu) | tergantung Q2 |
| LG-09 | Teks resmi Juklak 1/2024 untuk tab Standar | tergantung Q4 |
| LG-10 | Pelacakan pengiriman, FEFO, KPI (riset R2 bagian 6) | belum dimulai, perlu persetujuan |
| LG-11 | Impor berkas SIMAN atau SAKTI | belum dimulai, perlu persetujuan |
| LG-14 | Cuaca jalur bantuan di tab Pengantaran: untuk tiap rencana kirim tampilkan cuaca bandara BMKG 12 jam, prakiraan pelabuhan dan perairan BMKG, peringatan gelombang aktif, dan siklon, dari titik terdekat rute. Status resmi BMKG apa adanya, tanpa vonis layak atau tidak. Tanpa data = tertulis tidak ada data | disetujui pemilik 10 Nov 2026, menunggu data bandara dan maritim tayang |
| LG-15 | Status layak berangkat per moda (udara, laut) | tergantung Q10 |
| LG-16 | Kartu persediaan per barang dan gudang (Perka 4/2010 Bab II A butir 2, hal. 9, 16): saldo berjalan dari `logpal_mutasi`, penanda "koreksi tanpa jejak", cetak dan CSV | menunggu pemilik (Q6, Q11, Q15, Q17) |
| LG-17 | BAST dan SPPB bernomor (Perka 25/2014 Lampiran Bab IV, hal. 11-12): tabel nomor dokumen, cetak, penandatangan menurut tingkat | menunggu pemilik (Q14) |
| LG-18 | Laporan pertanggungjawaban logistik baku (Perka 20/2011 hal. 13; Perka 21/2011 untuk peralatan) dari mutasi dan permintaan | menunggu pemilik (Q12) |
| LG-19 | Laporan Persediaan semester dan inventarisasi akhir tahun dari `logpal_opname`, memuat rusak dan usang (Perka 4/2010 hal. 9, 16) | menunggu pemilik (Q11) |
| LG-20 | Jadwal pemeliharaan alat: tabel interval per jenis alat dari Perka 7/2013 (hal. 70-91), tanggal rawat terakhir, tanda jatuh tempo | menunggu pemilik (Q16) |
| LG-21 | Kartu kesenjangan stok terhadap standar minimal (Perka 23/2014 Pasal 10-14, hal. 7-8), memperluas LG-09 | menunggu pemilik (Q4, Q13) |
| LG-22 | Penanda pangan mendekati kedaluwarsa, dua bulan sebelumnya (Perka 26/2014 hal. 9), dari kolom `kedaluwarsa` yang sudah ada | belum dimulai, perlu persetujuan |
| LG-23 | Dummy dua ikon, registri cakupan, dan uji integrasi D1 sungguhan untuk LG-16 sampai LG-22 | mengikuti tiket yang dikerjakan |

### Catatan LG-16 sampai LG-23

- Semua tiket: rute baru di `src/logpal_audit.js` (bukan `src/logpal.js`, plafon `d1-sisa.json` hanya boleh turun), akses D1 hanya lewat `src/hak.js`, wajib sesi sah (D7), hak sesuai D2 dan T3. Data gudang asli tidak masuk repo (D4).
- Berkas layar: `public/logpal/`. Migrasi: tabel `logpal_dokumen` (nomor BAST/SPPB) dan `logpal_interval` (LG-20) saja (T8), nomor migrasi diambil saat mengerjakan.
- Pengerja `warga-api`, pemeriksa `guard-api`, `security-reviewer`, `migrasi-idempoten`, `selera-angka`, `inp-reviewer`. Bukti: `npm run uji:warga` dan `npm run uji:agen` hijau, ditambah uji yang menjalankan trigger dan hak di D1 sungguhan.
- Kartu tanpa data tertulis penyebabnya. Angka berformat Indonesia dengan satuan dan sumber pasal; yang bersandar pada asumsi (1% dan 4% Perka 23/2014) berlabel asumsi.
