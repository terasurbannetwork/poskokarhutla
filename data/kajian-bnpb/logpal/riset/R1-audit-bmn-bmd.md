# Riset: syarat inventarisasi logistik dan peralatan PB agar lolos BPKP, Inspektorat, BPK

Tanggal riset: 9 Nov 2026. Metode: teks peraturan diunduh dan dibaca langsung (PDF diekstrak, yang berupa gambar di-OCR dengan Vision macOS). Tanda di tiap butir:

- [TERVERIFIKASI] = kutipan/isi dibaca dari teks resmi yang diunduh; pasal tertulis di sana.
- [SEKUNDER] = dari berita, slide, atau halaman non-resmi; jangan dipakai sebagai kriteria hukum.
- [TIDAK KETEMU] = dicari, tidak ditemukan; tidak ditebak.

Berkas unduhan kerja ada di folder kerja lokal (teks hasil ekstrak: `pmk181.txt`, `pmk100.txt`, `pd47.txt`, `pd47-lampiran.txt`, `kmk295.txt`, `perka10.txt`, `perka11.txt`, `lkpp22.txt`, dst). Tidak ada berkas repo yang diubah.

---

## 0. Temuan penting di depan (yang mungkin mengubah desain)

1. **Frekuensi opname persediaan BMN tidak tunggal.** PMK 181/PMK.06/2016 Pasal 18 ayat (1) huruf a: paling sedikit 1 kali setahun. Tetapi kebijakan akuntansi (PMK 100/2025 Lampiran Bab VI huruf E): stock opname minimal setiap akhir semester. Dan BPK memakai ketentuan semester itu sebagai kriteria temuan (LHP LKPP 2022). Untuk lolos: rancang SEMESTERAN, bukan tahunan.
2. **Kebijakan akuntansi pusat sekarang PMK 100/2025** (berlaku 31 Des 2025), bukan PMK 231/PMK.05/2022 (dicabut) dan bukan PMK 224/225/2016 (sudah diganti berlapis). Banyak slide/artikel masih menyebut yang lama.
3. **Metode penilaian persediaan BMN: FIFO** (perpetual), bukan "harga perolehan terakhir". Harga perolehan terakhir dipakai sebelum 2021 (PMK 100/2025 Bab VI huruf D). Untuk BMD (BPBD) Permendagri 47/2021 Pasal 34 mengizinkan FIFO, rata-rata, dan/atau harga perolehan terakhir.
4. **BMD: Kartu Inventaris Barang (KIB A-F) sudah diganti KIBAR** oleh Permendagri 47/2021 (KIBAR peralatan dan mesin = Format II.N.2). Istilah "KIB B" masih dipakai praktik daerah lama, tetapi dasar hukum terkini KIBAR + Daftar BMD + KIR. Isi kolom per-format (II.N.2, II.O.1.2) TIDAK ada di teks Berita Negara yang bisa diunduh (lihat bagian 2.4).
5. **Perka BNPB 10/2011 dan 11/2011 ketemu**; isinya inventarisasi untuk analisis kebutuhan (bukan akuntansi/BMN). Lihat bagian 6.
6. **BNPB sendiri disebut dalam LHP BPK atas LKPP 2022**: persediaan belum ditemukan Rp4,6 miliar (Direktorat Dukungan Sumber Daya Darurat, Direktorat Pengelolaan Logistik dan Peralatan, dll). Ini bukti nyata kelas temuan yang harus dicegah sistem. Lihat bagian 5.

---

## 1. Barang Milik Negara (BMN)

### 1.1 Dasar dan status

| Peraturan | Status (dari JDIH/BPK) | URL |
|---|---|---|
| PP 27/2014 jo. PP 28/2020 | berlaku | https://jdih.kemenkeu.go.id/api/download/fulltext/2014/27TAHUN2014PP.htm |
| PMK 181/PMK.06/2016 Penatausahaan BMN | Berlaku; mencabut PMK 120/PMK.06/2007; halaman JDIH tidak mencantumkan "diubah dengan" maupun "dicabut dengan" [TERVERIFIKASI] | https://jdih.kemenkeu.go.id/dok/181-pmk-06-2016 , https://peraturan.bpk.go.id/Details/121291/pmk-no-181pmk062016 |
| PDF teks lengkap PMK 181 (dipakai) | | https://peraturan.bpk.go.id/Download/112085/PMK%20Nomor%20181%20Tahun%202016.pdf |

Catatan: JDIH PMK 181 memuat daftar "Produk Hukum Terkait" (PMK 45/2026, PMK 109/2024, PMK 124/2024, PMK 17/2024). Yang bisa saya cek (45/2026 bea masuk impor pertahanan; 17/2024 barang kena cukai yang dirampas; 124/2024 organisasi Kemenkeu) tidak mengubah penatausahaan. PMK 109/2024 tidak ketemu. Simpulan: tidak ada PMK pengganti PMK 181 yang saya temukan; tetap cek JDIH saat go-live. [TERVERIFIKASI untuk "tidak tercantum perubahan"; kepastian absolut TIDAK bisa dijamin].

PP 27/2014 (teks asli, dibaca dari JDIH; bagian setelah Pasal 86 terpotong di tool, perubahan PP 28/2020 atas pasal-pasal ini TIDAK diperiksa):
- Pasal 84: pembukuan, daftar barang menurut penggolongan dan kodefikasi.
- Pasal 85 ayat (1): inventarisasi Pengguna Barang paling sedikit 1 kali dalam 5 tahun; ayat (2): persediaan dan KDP setiap tahun; ayat (3): laporan hasil inventarisasi ke Pengelola Barang paling lama 3 bulan setelah selesai.
- Pasal 42: pengamanan administrasi, fisik, hukum. Pasal 43-44: bukti kepemilikan.
- Pasal 6 ayat (2) huruf m, Pasal 7 ayat (2) huruf j: laporan semesteran dan tahunan.

### 1.2 Inventarisasi: kewajiban dan frekuensi (PMK 181) [TERVERIFIKASI dari teks]

| Objek | Kewajiban | Pasal |
|---|---|---|
| Persediaan dan Konstruksi Dalam Pengerjaan | **Opname fisik** paling sedikit sekali dalam 1 tahun | Pasal 18 ayat (1) huruf a |
| BMN selain persediaan dan KDP (peralatan dan mesin, dll) | **Sensus barang** paling sedikit sekali dalam 5 tahun | Pasal 18 ayat (1) huruf b |
| Persediaan untuk diserahkan kepada masyarakat/pemda yang sudah tidak dikuasai dan belum disetujui pemindahtanganannya | **Tidak diinventarisasi** (dikecualikan) | Pasal 18 ayat (2) |
| Rencana pelaksanaan sensus | disampaikan ke Pengelola Barang | Pasal 18 ayat (3) |
| Laporan hasil inventarisasi | ke Pengelola Barang paling lama 3 bulan setelah selesai | Pasal 18 ayat (4) |
| Hasil inventarisasi persediaan/KDP | dilaporkan sesuai periode pelaporan (semester/tahun), bukan 3 bulan | Pasal 18 ayat (6) |
| Daftar Barang di-update dari hasil inventarisasi | wajib | Pasal 18 ayat (5) |
| Penanggung jawab materiil laporan | Pengguna Barang bertanggung jawab penuh | Pasal 18 ayat (7) |
| Pengelola Barang (DJKN) | inventarisasi BMN dalam penguasaannya 5 tahun sekali; monev kesesuaian rencana vs laporan | Pasal 19, Pasal 20 |
| Tata cara | Lampiran III (bagian "Tata Cara Inventarisasi BMN") | Pasal 21 |
| Peralihan: sensus berikutnya paling lama 5 tahun sejak pelaporan | | Pasal 52 huruf b |

Tambahan frekuensi:
- Laporan Barang Kuasa Pengguna (LBKP) **semesteran dan tahunan**, memuat posisi awal, akhir, dan mutasi (Pasal 23). Laporan wajib dilengkapi Catatan atas Laporan BMN (Pasal 22 ayat 2).
- Pemutakhiran dan rekonsiliasi data BMN wajib, dituangkan dalam berita acara (Pasal 38 ayat 2-3); tata cara di PMK tersendiri (tidak dicek di sini).
- UAKPB menyusun dan menyampaikan Laporan Kondisi Barang (LKB) "secara periodik" (Lampiran, bagian tugas UAKPB). Periode pastinya tidak disebut jelas di teks yang saya baca.

Rujukan akuntansi untuk persediaan (di dalam PMK 181): Pasal 39 ayat (1)-(2) (berpedoman pada SAP; Lampiran V). Lampiran II butir j: persediaan dicatat di Buku Barang Kuasa Pengguna-Persediaan per jenis; LBKP Persediaan disusun dari saldo akhir per sub kelompok dan "pada akhir periode pelaporan, catatan persediaan disesuaikan dengan hasil inventarisasi fisik".

### 1.3 Dokumen dan format laporan hasil inventarisasi BMN [TERVERIFIKASI, PMK 181 Lampiran III butir E]

Dokumen pelaksanaan: label sementara dan permanen; Kertas Kerja Inventarisasi (KKI).

**Laporan Hasil Inventarisasi (LHI) BMN** memuat Berita Acara Hasil Inventarisasi (BAHI) dilampiri:
1. Rekapitulasi Hasil Inventarisasi
2. Daftar Barang Hasil Inventarisasi: Barang Baik
3. Daftar Barang ... Rusak Ringan
4. Daftar Barang ... Rusak Berat
5. Daftar Barang ... Berlebih
6. Daftar Barang ... Tidak Diketemukan
7. Daftar Barang ... Dalam Sengketa
8. Catatan Atas Hasil Inventarisasi (jika ada)
9. Surat pernyataan tanggung jawab dari Kepala Satuan Kerja/pejabat yang ditunjuk mengenai kebenaran hasil inventarisasi

Tahap: persiapan (rencana kerja, dokumen sumber, denah lokasi, nomor/nama ruangan dan penanggung jawab ruangan, label sementara, data awal, KKI) -> pendataan (hitung jumlah, teliti kondisi baik/rusak ringan/rusak berat, tempel label registrasi sementara, catat di KKI) -> identifikasi (beri nilai sesuai SAP, kelompokkan dan beri kode, pisahkan baik+rusak ringan vs rusak berat, bandingkan dengan data awal: tidak diketemukan vs berlebih, cek berkas perkara untuk barang sengketa) -> pelaporan (BAHI, surat pernyataan, rekapitulasi, pengesahan penanggung jawab UAKPB, kirim ke UAPPB-W/UAPPB-E1 tembusan KPKNL) -> tindak lanjut (bukukan ke Buku Barang dan DBKP, update KIB/DBR/DBL, label permanen, rekonsiliasi, tindak lanjut barang hilang/tidak diketemukan).

Tim Inventarisasi dibentuk pada tiap tingkat unit (butir D.1). Bila BMN dikuasai pihak lain dibuat Berita Acara Inventarisasi dengan pihak tersebut (butir D.2). Penjelasan atas tiap perbedaan antara Daftar Barang dan hasil inventarisasi wajib (butir D.3).

**Dokumen sumber untuk inventarisasi di UAKPB:** DBKP, Buku Barang, KIB, DBR (Daftar Barang Ruangan), DBL (Daftar Barang Lainnya), LBKP semesteran dan tahunan, dokumen kepemilikan, dokumen pengelolaan dan penatausahaan.

Format formulir rinci (kolom Daftar Barang, KKI, LHI, LKB) ada di **Lampiran VI dan VII** PMK 181 (Pasal 50). Teks PDF PMK 181 yang saya unduh berisi lampiran itu tetapi OCR/ekstraksi tabelnya tidak saya telusuri per kolom. [TIDAK DITELUSURI: daftar kolom persis tiap format; ambil langsung dari Lampiran VI-VII bila diperlukan, halaman 150+ dari PDF].

### 1.4 Daftar Barang, kode barang, NUP, kondisi, label

- Struktur daftar (Pasal 10-13): Daftar Barang Kuasa Pengguna (DBKP), Pengguna Wilayah (DBP-W), Eselon I (DBP-E1), Pengguna (DBP); Buku Barang Kuasa Pengguna terdiri atas Intrakomptabel, Ekstrakomptabel, Barang Bersejarah, **Barang Persediaan**, KDP (Pasal 12 ayat 1). [TERVERIFIKASI]
- Keluaran pembukuan UAKPB (Lampiran II butir k): DBKP-Persediaan, -Tanah, -Gedung dan Bangunan, **-Alat Angkutan Bermotor, -Alat Besar dan Persenjataan, -Peralatan dan Mesin selain itu**, -KDP, -Barang Rusak Berat, -Barang Hilang, -BPYBDS; Kartu Identitas Barang (KIB) hanya untuk: Tanah, Gedung dan Bangunan, Bangunan Air, **Alat Angkutan Bermotor, Alat Besar, Senjata Api**; plus Daftar Barang Ruangan dan Daftar Barang Lainnya. Artinya di BMN, peralatan kecil tidak punya KIB, hanya baris DBKP/DBR. [TERVERIFIKASI]
- Kondisi BMN: tiga kriteria **Baik (B), Rusak Ringan (RR), Rusak Berat (RB)** (Lampiran II butir i). [TERVERIFIKASI]
- Kode barang dan NUP: PMK 181 menyerahkan penggolongan, kodefikasi, NUP, satuan, kode lokasi, kode barang, kode registrasi ke "Peraturan Menteri tersendiri" (Pasal 16 ayat 2; Lampiran II butir g). Peraturan itu: **PMK 29/PMK.06/2010** Penggolongan dan Kodefikasi BMN, lampiran diubah berkali-kali; terakhir yang saya temukan **KMK 241/KM.6/2022 (perubahan kedua belas, 20 Des 2022)**. Struktur: golongan, bidang, kelompok, sub kelompok, sub-sub kelompok. [TERVERIFIKASI untuk nama dan perubahan; isi tabel kode tidak dibaca]
  - https://peraturan.bpk.go.id/Download/225079/PMK%20Nomor%2029%20Tahun%202010.pdf
  - https://jdih.kemenkeu.go.id/download/a4b76934-b70c-4204-96f4-91d8717c2a43/Salinan_KMK_241_Kodefikasi_BMNpdfpdf.pdf
  - [SEKUNDER] Slide DJKN/Kemhan: kelompok persediaan memakai kode 1.01.05.xxx, persediaan untuk dijual/diserahkan = kelompok 05, strategis/berjaga-jaga = kelompok 06 (khusus satker seperti BNPB dan BASARNAS). https://www.kemhan.go.id/itjen/wp-content/uploads/2018/06/3.-Kebijakan-Akuntansi-Persediaan.pdf
  - Kode peralatan (Tabel Masa Manfaat, KMK 295/2019) memakai pola 3 02 01 00 000 (golongan 3 = peralatan dan mesin). [TERVERIFIKASI dari lampiran KMK 295]
- **NUP**: definisi dan rumus tidak ada di PMK 181; hanya dirujuk ("NUP, Satuan Barang, Kode Lokasi, Kode Barang, Kode Registrasi diatur dalam Peraturan Menteri tersendiri", Lampiran II butir g). [TIDAK KETEMU definisi pasalnya di sumber resmi yang bisa dibaca]
- **Label**: label **sementara** saat sensus (ditempel pada barang yang sudah dihitung) dan **label permanen** setelah hasil ditetapkan (Lampiran III butir E.2.a, E.3.b.1.c, E.3.d.3). Format/isi label tidak diatur di teks yang dibaca. [TERVERIFIKASI untuk kewajiban; TIDAK KETEMU spesifikasi label]
- Kapitalisasi: nilai satuan minimum peralatan dan mesin **Rp1.000.000** (PMK 181 Pasal 40 ayat 4 huruf a). Di bawah itu = ekstrakomptabel (tetap dibukukan dan dilaporkan, tidak di neraca); di PMK 100/2025 Bab VII: disajikan di Laporan BMN Ekstrakomptabel dan diungkapkan di CaLK. Saya tidak memeriksa apakah angka itu pernah diubah. [TERVERIFIKASI teks; kemungkinan perubahan TIDAK dicek]

---

## 2. Barang Milik Daerah (BPBD)

### 2.1 Status peraturan

| Peraturan | Catatan | URL |
|---|---|---|
| Permendagri 19/2016 Pedoman Pengelolaan BMD | teks lengkap dibaca; bagian penggolongan/kodefikasi dicabut oleh Permendagri 108/2016 (Pasal 8 menurut ringkasan BPK) | https://peraturan.bpk.go.id/Details/137669/permendagri-no-19-tahu |
| Permendagri 7/2024 (perubahan atas 19/2016) | mengubah antara lain Pasal 471 (tindak lanjut hasil inventarisasi) dan menyisipkan Pasal 471A; tidak mengubah ketentuan frekuensi inventarisasi yang saya baca | https://peraturan.bpk.go.id/Details/300030/permendagri-no-7-tahun-2024 |
| **Permendagri 47/2021** Tata Cara Pembukuan, Inventarisasi, dan Pelaporan BMD (BN 2021/1076; ditetapkan 8 Sep 2021) | **teknis paling rinci; ini yang dipakai auditor daerah** | https://peraturan.go.id/files/bn1076-2021.pdf , https://peraturan.bpk.go.id/Details/196220/permendagri-no- |
| Permendagri 108/2016 Penggolongan dan Kodefikasi BMD | kode barang, kode lokasi, kode register | https://peraturan.bpk.go.id/Details/276593/permendagri-no-108-tahun-2016 |
| Permendagri 4/2018 Reviu LK Pemda berbasis akrual | dasar reviu APIP | https://inspektorat.kaltimprov.go.id/sidin/assets/pedoman/Permendagri%20nomor%204%20tahun%202018%20tentang%20pelaksanaan%20Reviu%20atas%20Laporan%20Keuangan%20Pemerintah%20Daerah%20Berbasisi%20Akrual.pdf |

Cek: apakah Permendagri 47/2021 diubah atau diganti setelah 2021, TIDAK diperiksa.

### 2.2 Frekuensi inventarisasi BMD [TERVERIFIKASI]

Permendagri 47/2021:
- Objek inventarisasi: persediaan, tanah, peralatan dan mesin, gedung dan bangunan, jalan/jaringan/irigasi, aset tetap lainnya, ATB, KDP (Pasal 49 ayat 1).
- **Persediaan dan KDP: paling sedikit sekali dalam 1 tahun**; selain itu: **paling sedikit sekali dalam 5 tahun** (Pasal 50 ayat 1). Persediaan yang akan diserahkan kepada masyarakat dikecualikan dari ayat 1 huruf a (Pasal 50 ayat 2).
- Pengelola Barang: tanah/bangunan dalam penguasaannya 5 tahun sekali (Pasal 51).
- **Stock opname persediaan "setiap semester"**, oleh Pengurus Barang Pengguna/Pembantu, atas barang belum dipakai di gudang dan di unit pemakai; hasil dituangkan dalam **berita acara**; pada akhir periode pelaporan catatan disesuaikan dengan hasil inventarisasi fisik (Pasal 39 ayat 1-4).
- Tahapan: persiapan, pelaksanaan, pelaporan hasil, tindak lanjut (Pasal 52). Tim Inventarisasi ditetapkan gubernur/bupati/wali kota (Pasal 54 ayat 2); tugas tim Pasal 54 ayat 3 huruf a-h (rencana kerja, data Daftar BMD, dokumen sumber, pelaksanaan, identifikasi, teliti dokumen kepemilikan, laporan, rencana tindak lanjut). Rencana kerja memuat objek, jadwal, petugas (Pasal 55). Monev oleh Pengelola Barang atas Pengguna, oleh Pengguna atas Kuasa Pengguna (Pasal 58-59).
- Laporan hasil inventarisasi: Kuasa Pengguna -> Pengguna paling lama **2 bulan**; Pengguna -> Pengelola paling lama **3 bulan** (Pasal 61 ayat 3-4); tanggung jawab penuh dan **surat pernyataan** (Pasal 61 ayat 2, Pasal 62). Untuk persediaan/KDP, laporan sesuai periode pelaporan (Pasal 63 ayat 2).
- Tindak lanjut paling sedikit: pemberian label, reklasifikasi, koreksi, pencatatan, pengalihan status, pengeluaran internal/penarikan, penghapusan (Pasal 64).
- Rekonsiliasi: Pengurus Barang Pengguna dengan Pembantu dan Pengelola paling sedikit **3 bulan sekali**; dengan fungsi akuntansi paling sedikit **6 bulan sekali/semester**; dituangkan dalam berita acara (Pasal 80 ayat 2-4). Objek rekonsiliasi Pasal 79 ayat 2.
- Permendagri 19/2016 Pasal 476 ayat (1): inventarisasi Pengguna Barang paling sedikit 1 kali dalam 5 tahun; ayat (2) persediaan/KDP setiap tahun; ayat (3) laporan ke Pengelola Barang paling lama 3 bulan; Pasal 478: laporan barang Kuasa Pengguna semesteran dan tahunan. [TERVERIFIKASI; ini ketentuan induk, 47/2021 merinci]
- Permendagri 19/2016 juga menugaskan pengurus barang melakukan stock opname persediaan (butir "melakukan stock opname barang persediaan" di tugas pengurus barang pengguna/pembantu). [TERVERIFIKASI keberadaan frasa; nomor pasalnya tidak saya catat]

### 2.3 Pembukuan BMD dan "kartu" [TERVERIFIKASI, Permendagri 47/2021]

- Pembukuan terdiri atas 15 transaksi (Pasal 6 ayat 1): perolehan/penerimaan, penggunaan, penerimaan internal, pengeluaran internal, pemanfaatan, reklasifikasi, koreksi, penambahan masa manfaat, penyusutan, **persediaan**, pemeliharaan, **KIR**, pengamanan, penghapusan, **KIBAR**.
- Dokumen sumber perolehan wajib (Pasal 7 ayat 2, Pasal 8 ayat 3): kontrak/bukti pembelian/kuitansi/SPK/surat pesanan, serah terima pekerjaan pertama, gambar terlaksana (konstruksi), **berita acara serah terima**, laporan realisasi anggaran.
- Penelitian pencatatan pengadaan paling sedikit memuat (Pasal 9 ayat 3): kode sub kegiatan, kode belanja, penggolongan dan kodefikasi BMD, spesifikasi nama barang, tanggal/bulan/tahun perolehan, jumlah, harga satuan, biaya atribusi. Surat pernyataan telah dicatat sebagai BMD dilampirkan ke pengajuan pembayaran (ayat 6-7).
- Hibah: dibukukan bila jumlah dan spesifikasi sesuai berita acara serah terima hibah (Pasal 11).
- **Persediaan** (Pasal 33-39): metode **perpetual**; penilaian FIFO, rata-rata, dan/atau harga perolehan terakhir (Pasal 34); pembukuan terdiri atas **buku penerimaan, buku pengeluaran, buku penyaluran, kartu barang persediaan (per nomor urut spesifikasi persediaan), Daftar BMD persediaan rusak/usang** (Pasal 35); permintaan -> nota permintaan, surat permintaan barang, surat perintah penyaluran barang, berita acara serah terima (Pasal 36-37; Lampiran Format II.I.6-II.I.9); perubahan fisik persediaan rusak ditandai Berita Acara Perubahan Fisik BMD (Format II.I.11).
- **NUSP** (nomor urut spesifikasi persediaan) = gabungan kode barang persediaan + nomor urut spesifikasi nama barang (Lampiran, butir I).
- **KIR** (Kartu Inventaris Ruangan): daftar barang dalam ruangan, rangkap 2 (ditempel di ruangan dan arsip), **diperbarui setiap semester** dan saat ada perpindahan (Pasal 41-42).
- **NIBAR** (Nomor Induk Barang) = kode register barang saat perolehan/penerimaan awal diakui sebagai BMD (Pasal 1 angka 26). **KIBAR** = pembukuan seluruh transaksi pada tiap BMD aset tetap dan aset lainnya (angka 27).
- KIBAR dapat memberi informasi per barang (Lampiran butir N.2): (a) unit pemakai; (b) data barang; (c) penerimaan awal; (d) penggunaan; (e) penerimaan internal Pengguna; (f) pengeluaran internal; (g) pemanfaatan; (h) reklasifikasi; (i) koreksi; (j) penambahan masa manfaat/kapasitas; (k) pengamanan; (l) penghapusan; (m) keterangan. KIBAR terdiri atas 9 jenis, termasuk **KIBAR peralatan dan mesin (Format II.N.2)**.
- Daftar BMD per jenis termasuk **Peralatan dan mesin (Format II.O.1.2 untuk Kuasa Pengguna, II.O.2.2 Pengguna, II.O.3.2 Pengelola, II.O.4.2 provinsi/kab/kota)** dan **Persediaan rusak atau usang (II.O.1.10)**.
- Lembar kerja inventarisasi: peralatan dan mesin = **Format III.A.2**; laporan hasil inventarisasi mengelompokkan: BMD hilang karena kecurian, hilang tidak ditemukan, belum dikapitalisasi (diketahui/tidak diketahui data awalnya), digunakan pegawai, digunakan pihak lain, perubahan fisik, perubahan data, tercatat ganda, dibangun di tanah bukan milik Pemda, belum tercatat (Format III.B.1-III.B.11).
- Kondisi aset tetap BMD: **Baik, Rusak Ringan, Rusak Berat/usang**. Kriteria peralatan dan mesin (Lampiran, butir reklasifikasi): Baik = utuh dan berfungsi baik; Rusak Ringan = utuh tapi kurang berfungsi, perlu perbaikan ringan tanpa ganti komponen pokok; Rusak Berat = tidak utuh dan tidak berfungsi / perlu perbaikan besar atau ganti komponen pokok sehingga tidak ekonomis.

### 2.4 "KIB B" dan kolom wajib [TIDAK KETEMU resmi]

- Teks Berita Negara 47/2021 (107 halaman; lampiran berupa gambar yang saya OCR) hanya memuat *uraian* format, bukan tabel kolom Format II.N.2, II.O.1.2, III.A.2. Tabel formatnya TIDAK ada di PDF yang bisa diunduh. [TIDAK KETEMU kolom resmi KIBAR/Daftar BMD peralatan dan mesin]
- Kode barang/lokasi/register diatur Permendagri 108/2016: ruang lingkup kodefikasi barang, kode lokasi, kode register [SEKUNDER dari ringkasan pencarian BPK; isi tabel tidak dibaca].
- Susunan kolom KIB B era Permendagri 17/2007 (praktik daerah) yang lazim terlihat di dokumen daerah: kode barang, nama/jenis barang, nomor register, merk/tipe, ukuran/CC, bahan, tahun pembelian, nomor pabrik, nomor rangka, nomor mesin, nomor polisi, nomor BPKB, asal-usul, harga, kondisi, keterangan. [SEKUNDER: contoh dokumen KIB daerah, jangan jadi sumber hukum] Contoh: https://opendata.karanganyarkab.go.id/dataset/6dbd99cb-f1db-4735-afa4-6e4be685414a/resource/7be323aa-f56b-49c8-83eb-91c2e10a6e56/download/kartu-inventaris-barang-kib-inspektorat-daerah-kab.-karanganyar.pdf
- Saran: untuk BPBD, tampilkan kolom KIBAR sesuai informasi 13 butir di atas (resmi) dan tambahkan kolom kendaraan (rangka/mesin/polisi/BPKB) karena itu yang diuji auditor.

---

## 3. Persediaan

### 3.1 Standar dan kebijakan (PMK 100/2025, Lampiran Bab VI) [TERVERIFIKASI, dibaca dari PDF resmi]

Kebijakan Akuntansi Pemerintah Pusat saat ini: **PMK 100/2025** (ditandatangani 23 Des 2025, diundangkan 31 Des 2025; berlaku untuk laporan keuangan TA 2025). Mencabut PMK 231/PMK.05/2022 dan perubahannya PMK 57/2023 (status PMK 231: "Tidak Berlaku", dicabut dengan PMK 100/2025). PMK 231 sendiri mencabut PMK 22/PMK.05/2022 dan PMK 85/PMK.05/2022. Dasar substantif tetap PSAP 05 (PP 71/2010 Lampiran I) tetapi teks PSAP 05 sendiri tidak saya peroleh (PDF di JDIH hanya batang tubuh); Bab VI PMK 100/2025 memuat isi kebijakannya.
- https://jdih.kemenkeu.go.id/dok/pmk-100-tahun-2025
- https://jdih.kemenkeu.go.id/api/download/29cc2a09-15f9-4155-9a87-88b9023ce686/2025pmkeuangan100.pdf (halaman Lampiran 67-73)
- https://peraturan.bpk.go.id/Details/238762/pmk-no-231pmk052022 (status dicabut)

Isi Bab VI:
- **Definisi (huruf A):** aset lancar berupa barang/perlengkapan untuk mendukung operasional pemerintah, dan barang untuk dijual dan/atau diserahkan dalam rangka pelayanan kepada masyarakat. Barang untuk tujuan berjaga-jaga atau strategis (cadangan beras, minyak) termasuk persediaan. **Dalam hal barang berasal dari bantuan pemerintah untuk diserahkan kepada masyarakat/pemda, harus dicatat sebagai persediaan.**
- **Jenis (huruf B):** sifat pemakaian (habis pakai, tak habis pakai, bekas pakai) dan bentuk (barang konsumsi, amunisi, bahan pemeliharaan, suku cadang, tujuan strategis/berjaga-jaga, ... , peralatan dan mesin untuk diserahkan kepada masyarakat/pemda, ... , persediaan lainnya untuk dijual/diserahkan).
- **Pengakuan (huruf C):** saat manfaat ekonomi diperoleh dan nilai terukur andal, didukung bukti yang dapat diverifikasi, atau saat diterima/hak kepemilikan atau kepenguasaan berpindah; dokumen sumber: faktur, kuitansi, **BAST**. Metode **perpetual** (catat tiap mutasi masuk dan keluar). Pencatatan per satuan barang yang lazim. **Pada akhir periode pelaporan catatan disesuaikan dengan hasil inventarisasi fisik; inventarisasi fisik atas barang yang belum dipakai, di gudang maupun di unit pengguna.** Persediaan rusak/usang tidak di neraca, diungkapkan di CaLK, **laporan keuangan melampirkan daftar persediaan rusak atau usang**.
- **Pengukuran (huruf D):** biaya perolehan (harga beli + angkut + penanganan + biaya langsung lain, dikurangi potongan/rabat); harga pokok produksi; nilai wajar untuk donasi/rampasan/perolehan lain. Untuk persediaan yang diserahkan kepada masyarakat/pemda: harga pembelian + biaya langsung. **Penilaian FIFO** (saldo dihitung berdasar harga perolehan masing-masing); "mulai tahun 2021, secara prospektif" FIFO menggantikan harga perolehan terakhir. Pemakaian dihitung dari inventarisasi fisik: saldo awal + perolehan - saldo akhir, dikali nilai per unit FIFO. Penyerahan untuk dijual/diserahkan ke masyarakat dicatat sebagai Beban Barang untuk Dijual/Diserahkan kepada Masyarakat/Pemda; bantuan sosial sebagai Beban Bantuan Sosial; strategis/berjaga-jaga sebagai Beban Persediaan untuk Tujuan Strategis/Berjaga-jaga.
- **Penyajian (huruf E): "satker melaksanakan inventarisasi fisik (stock opname) persediaan minimal setiap akhir semester"** dengan pertimbangan efisiensi; akhir tahun disesuaikan dengan hasil opname. Bila opname interim tidak dilakukan, diungkapkan di CaLK.
- **Pengungkapan (huruf F):** kebijakan pengukuran; penjelasan jenis persediaan; **penjelasan selisih antara pencatatan dan hasil inventarisasi fisik**; jenis, jumlah, nilai persediaan rusak/usang.
- **Perlakuan khusus (huruf G) butir 5:** persediaan yang sudah tidak dikuasai dan sudah diusulkan pemindahtanganan tetapi belum disetujui tidak dilaporkan di neraca, diungkapkan di CaLK dan disajikan di **Daftar Barang Persediaan yang Tidak Dikuasai**. Butir 6: persediaan hilang yang sudah ditetapkan TGR tidak di neraca; masuk **Daftar Barang Persediaan Dalam Proses TGR**. Butir 3-4: kebijakan khusus persediaan spesifik dapat ditetapkan Menteri/Pimpinan Lembaga setelah berkoordinasi dengan Menkeu.

Pengaruh: konsisten dengan PMK 181 Pasal 18 ayat (2) (pengecualian opname untuk persediaan yang sudah tidak dikuasai).

[SEKUNDER] Slide DJKN/Kemhan 2018 yang menjabarkan versi lama (PMK 224/PMK.05/2016): dokumen transaksi SAKTI, kode transaksi (M01 saldo awal, M02 pembelian, M03 transfer masuk, M04 hibah masuk, K01 pemakaian, K02 transfer keluar, K07 bansos, K08 strategis/berjaga-jaga, K09 penyerahan kepada masyarakat/pemda). Berguna sebagai peta jenis mutasi, bukan sebagai kriteria hukum terkini. https://www.kemhan.go.id/itjen/wp-content/uploads/2018/06/3.-Kebijakan-Akuntansi-Persediaan.pdf
Slide itu juga menyebut BNPB dan BASARNAS sebagai contoh satker dengan persediaan strategis/berjaga-jaga (kelompok barang 06).

### 3.2 Persediaan "untuk diserahkan kepada masyarakat" vs persediaan operasional

| Aspek | Persediaan operasional/konsumsi | Untuk diserahkan kepada masyarakat/pemda (bantuan logistik) |
|---|---|---|
| Dasar | PMK 100/2025 Bab VI A.1-2 | Bab VI A.4 (barang yang disimpan untuk dijual/diserahkan); "bantuan pemerintah untuk diserahkan harus dicatat sebagai persediaan" |
| Biaya perolehan | harga beli + biaya langsung | harga beli + biaya langsung (Bab VI D) |
| Beban saat keluar | Beban Persediaan | Beban Barang untuk Dijual/Diserahkan kepada Masyarakat/Pemda; bantuan sosial = Beban Bantuan Sosial |
| Dokumen keluar | surat permintaan, BAST | BAST ke penerima + dokumen penetapan (lihat Perban 4/2018, tidak dibahas di sini) |
| Sudah tak dikuasai tapi belum disetujui pemindahtanganan | - | tidak dilaporkan di neraca, diungkapkan CaLK, masuk Daftar Barang Persediaan yang Tidak Dikuasai (Bab VI G.5); tidak wajib opname (PMK 181 Pasal 18 ayat 2) |
| Risiko temuan BPK | selisih fisik vs kartu | "Pemindahtanganan persediaan kepada masyarakat/pemda belum tertib" (LHP LKPP 2022: 8 K/L Rp4,93 triliun, sebagian besar Kemenkes) |
| BMD | | Permendagri 47/2021 Pasal 50 ayat 2: dikecualikan dari opname tahunan |

Kode BMN (slide DJKN, SEKUNDER): persediaan untuk diserahkan kepada masyarakat wajib dikode kelompok 05 supaya bisa dipakai menu "Penyerahan/Dijual kepada Masyarakat/Pemda"; bila tidak, tidak bisa lewat menu itu, dan akan dibandingkan dengan realisasi belanja 526xxx.

### 3.3 Kartu persediaan, stock opname, berita acara (rangkuman kolom wajib)

Dari teks resmi BMD dan BMN:
- **Kartu barang persediaan** (Permendagri 47/2021 Pasal 35 ayat 5; Format II.I.5): rekapitulasi penerimaan dan pengeluaran **per NUSP**. Kolom rinci formatnya TIDAK ada di PDF; isi minimal logis: kode, nama, spesifikasi, satuan, tanggal, dokumen sumber, masuk (qty, harga), keluar (qty, harga FIFO), saldo (qty, nilai).
- **Buku penerimaan, pengeluaran, penyaluran** (Format II.I.3, II.I.4, II.I.10).
- **Berita Acara hasil inventarisasi fisik persediaan** (Pasal 39 ayat 3) dan penyesuaian catatan terhadap hasil opname (Pasal 39 ayat 4).
- **Daftar persediaan rusak/usang** (lampiran laporan keuangan; Bab VI C) + **Berita Acara Perubahan Fisik BMD** (Format II.I.11).
- **Daftar Barang Persediaan yang Tidak Dikuasai** dan **Daftar Barang Persediaan Dalam Proses TGR** (PMK 100/2025 Bab VI G.5-6).
- [SEKUNDER] Berita Acara Opname Fisik: ditandatangani Tim Persediaan, diketahui Pengguna/Kepala Satker (pernyataan umum dari DJKN). Nomor pasal resminya tidak saya temukan.

---

## 4. Masa manfaat dan penyusutan peralatan (BMN)

### 4.1 Dasar [TERVERIFIKASI]

- **PMK 65/PMK.06/2017** Penyusutan BMN Berupa Aset Tetap pada Entitas Pemerintah Pusat: https://jdih.kemenkeu.go.id/download/8d697525-7e96-4570-a26d-a415ac5f7616/65~PMK.06~2017Per.pdf
  - Pasal 4 ayat (1): objek penyusutan termasuk peralatan dan mesin; ayat (3): tidak disusutkan: hilang berdasar dokumen sah yang sudah diusulkan penghapusan, rusak berat/usang yang sudah diusulkan pemindahtanganan/pemusnahan/penghapusan, renovasi tanah, renovasi tanpa tambahan masa manfaat.
  - Pasal 5-6: yang hilang -> Daftar Barang Hilang; rusak berat -> Daftar Barang Rusak Berat; keluar dari neraca, diungkapkan di Catatan atas Laporan Barang dan CaLK. Pasal 7: bila ditemukan kembali, direklasifikasi dan disusutkan lagi.
  - Pasal 12: tanpa nilai residu; Pasal 13-14: masa manfaat per unit mengikuti tabel yang ditetapkan Dirjen Kekayaan Negara; Pasal 15: overhaul/renovasi/restorasi mengubah masa manfaat sesuai tabel akibat perbaikan; Pasal 16: pengguna dapat mengusulkan perubahan; Pasal 18: **metode garis lurus**, dialokasikan merata **setiap semester**; Pasal 21: dihitung dan dicatat **setiap akhir semester**, dalam Rupiah dengan pembulatan; Pasal 19-20: dihitung per aset oleh Kuasa Pengguna Barang.
- **KMK 295/KM.6/2019** Tabel Masa Manfaat (Tabel Masa Manfaat I untuk aset baru; Tabel II untuk penambahan akibat renovasi/restorasi/overhaul), diubah oleh **KMK 266/KM.6/2023** (1 Des 2023; menambah peralatan keimigrasian dan peralatan instalasi keselamatan mulai TA 2023; JDIH: Berlaku). Daftar status KMK 295 sendiri tidak tampil di JDIH. [TERVERIFIKASI]
  - https://www.djkn.kemenkeu.go.id/peraturan/detail/311/Keputusan-Menteri-Keuangan-Nomor-295KMK62019.html (unduh: https://www.djkn.kemenkeu.go.id/peraturan/download/311/Keputusan-Menteri-Keuangan-Nomor-295KMK62019.html)
  - KMK 266/2023: https://jdih.kemenkeu.go.id/dok/266-km-6-2023
  - Catatan: ada hasil mesin pencari yang menyebut KMK 266/2023 "dicabut"; halaman JDIH (evaluasi) menyatakan **Berlaku**. Pakai yang JDIH. Cek ulang saat go-live.

### 4.2 Masa manfaat peralatan (KMK 295/KM.6/2019, Tabel Masa Manfaat I) [TERVERIFIKASI, dibaca dari gambar lampiran]

| Kode | Uraian | Tahun | Semester |
|---|---|---|---|
| 3 01 01 | Alat besar darat | 10 | 20 |
| 3 01 02 | Alat besar apung | 8 | 16 |
| 3 01 03 | Alat bantu | 7 | 14 |
| 3 02 01 | Alat angkutan darat bermotor | **7** | 14 |
| 3 02 02 | Alat angkutan darat tak bermotor | 2 | 4 |
| 3 02 03 | Alat angkutan apung bermotor | 10 | 20 |
| 3 02 04 | Alat angkutan apung tak bermotor | 3 | 6 |
| 3 02 05 | Alat angkutan bermotor udara | 20 | 40 |
| 3 03 01 | Alat bengkel bermesin | 10 | 20 |
| 3 03 02 | Alat bengkel tak bermesin | 5 | 10 |
| 3 03 03 | Alat ukur | 5 | 10 |
| 3 04 01 | Alat pengolahan (pertanian) | 4 | 8 |
| 3 05 01 | Alat kantor | 5 | 10 |
| 3 05 02 | Alat rumah tangga | 5 | 10 |
| 3 06 01 | Alat studio | 5 | 10 |
| 3 06 02 | Alat komunikasi | 5 | 10 |
| 3 06 03 | Peralatan pemancar | 10 | 20 |
| 3 06 04 | Peralatan komunikasi navigasi | 15 | 30 |
| 3 07 01 | Alat kedokteran | 5 | 10 |
| 3 07 02 | Alat kesehatan umum | 5 | 10 |
| 3 08 01 | Unit alat laboratorium | 8 | 16 |
| 3 08 06 | Alat laboratorium lingkungan hidup | 7 | 14 |
| 3 09 01 | Senjata api | 10 | 20 |
| 3 09 02 | Persenjataan non senjata api | 3 | 6 |
| 3 10 01 | Komputer unit | 4 | 8 |
| 3 10 02 | Peralatan komputer | 4 | 8 |
| 3 11 01 | Alat eksplorasi topografi | 5 | 10 |
| 3 11 02 | Alat eksplorasi geofisika | 10 | 20 |
| 3 15 01 | Alat deteksi (keselamatan kerja) | 5 | 10 |
| 3 15 02 | Alat pelindung | 5 | 10 |
| 3 15 03 | **Alat SAR** | **2** | 4 |
| 3 15 04 | Alat kerja penerbangan | 10 | 20 |
| 3 16 01 | Alat peraga pelatihan dan percontohan | 10 | 20 |
| 3 17 01 | Unit peralatan proses/produksi | 8 | 16 |
| 3 18 01 | Rambu-rambu lalu lintas darat | 7 | 14 |
| 3 18 02 | Rambu-rambu lalu lintas udara | 5 | 10 |
| 3 18 03 | Rambu-rambu lalu lintas laut | 15 | 30 |
| 3 19 01 | Peralatan olah raga | 3 | 6 |

Kode lain (bangunan, jalan, dst) ada di lampiran dan tidak disalin. Tidak ada kelompok khusus "alat pemadam kebakaran" atau "tenda/perahu karet" pada baris yang terbaca; perahu karet dan sejenisnya jatuh di alat angkutan apung (3 02 03 bermotor atau 3 02 04 tak bermotor) atau alat SAR (3 15 03) tergantung kodefikasi PMK 29/2010 di tingkat sub-sub kelompok. Penentuan kode adalah pekerjaan kodefikasi, bukan asumsi sistem. [Tidak dicek per sub-sub kelompok]
Tabel II (penambahan masa manfaat akibat overhaul/renovasi) ada di lampiran yang sama (persentase nilai perbaikan vs tambahan tahun); tidak disalin.

### 4.3 BMD (BPBD)

Masa manfaat BMD diatur Perkada/kebijakan akuntansi daerah mengacu PSAP 07 dan Permendagri 64/2013; bukan KMK 295. [TIDAK DITELUSURI nomor pasal Permendagri; ringkasan hanya dari mesin pencari: Perbup daerah menyalin tabel dengan angka berbeda]. Sistem BPBD sebaiknya menyimpan masa manfaat sebagai referensi yang bisa diatur per pemda.

---

## 5. Apa yang lazim diuji auditor

### 5.1 Fakta resmi tentang temuan (LHP BPK atas LKPP 2022, LHP SPI dan Kepatuhan) [TERVERIFIKASI]

Sumber: https://www.bpk.go.id/assets/files/lkpp/2022/lkpp_2022_1687233367.pdf (hlm. 123-132 buku).

Aset tetap (Tabel 45): (1) aset tetap **tidak diketahui keberadaannya** Rp988,75 miliar pada 30 K/L (Lampiran E.5.2); (2) belum didukung dokumen kepemilikan Rp24,80 triliun pada 17 K/L (E.5.3); (3) dikuasai/digunakan pihak lain Rp1,14 triliun pada 15 K/L (E.5.4); (4) KDP tidak bermutasi lama (E.5.5); (5) **aset rusak berat belum direklasifikasi** Rp77,6 miliar pada 23 K/L, contoh BNN 199 unit peralatan dan mesin (E.5.6); (6) penatausahaan tidak tertib 40 K/L (E.5.7); (7) lainnya (E.5.8).

Persediaan: **47 K/L, Rp11,58 triliun "belum memadai"** (Tabel 46):
1. Persediaan **tidak dilakukan stock opname**: 15 K/L, Rp265,1 miliar (saldo di modul persediaan dan neraca tidak ada di Laporan Stock Opname) (E.5.9).
2. **Pencatatan tidak tertib**: 41 K/L, Rp6,32 triliun, antara lain dicatat gelondongan (tidak dirinci) di SAKTI; hasil pengadaan masih tercatat di satker pengadaan padahal sudah didistribusikan; nama barang tidak spesifik ("Persediaan IFP2", qty 1); **perbedaan kuantitas fisik dengan kartu stok** (E.5.10).
3. **Penyimpanan dan pengamanan belum memadai**: 11 K/L, Rp6,44 miliar, **BNPB Rp5,52 miliar**: (a) barang persediaan yang belum ditemukan Rp4,61 miliar pada Direktorat Dukungan Sumber Daya Darurat (Rp1,60 miliar), Pusdatinkom (Rp11,4 juta), Poliklinik Biro Sumber Daya Umum (Rp46,5 juta), **Direktorat Pengelolaan Logistik dan Peralatan (Rp607,5 juta)**, Direktorat FPKP di RSDC Wisma Atlet (Rp2,34 miliar); (b) persediaan tercatat di SAKTI Direktorat FPKP tetapi **tidak tercatat pada penatausahaan persediaan internal BNPB** di RSDC, Rp913,2 juta (E.5.11).
4. **Pemindahtanganan persediaan kepada masyarakat/pemda belum tertib**: 8 K/L, Rp4,93 triliun (E.5.12).
5. Hal signifikan lain (E.5.13).

Kriteria yang BPK kutip (halaman 130-132): PMK 100-ekuivalen saat itu PMK 231/PMK.05/2022 Bab VI (opname minimal setiap akhir semester; catatan disesuaikan hasil opname; lampiran daftar rusak/usang), **PMK 181/PMK.06/2016 Pasal 39 ayat (1) dan Lampiran V**, **PMK 207/PMK.06/2021 Pasal 3 tentang Pengawasan dan Pengendalian BMN** (Pengelola dan Pengguna Barang). Akibat yang ditulis BPK: saldo aset tetap/persediaan tidak menggambarkan kondisi sebenarnya; risiko aset hilang. Sebab: Menteri/Pimpinan Lembaga belum optimal mengendalikan masalah berulang; SAKTI belum mendukung; koordinasi APIP lemah. Catatan: PMK 207/PMK.06/2021 hanya saya baca lewat kutipan LHP, bukan teks penuh. [SEKUNDER untuk PMK 207]

Konteks BNPB lain:
- BNPB WTP 12 kali berturut-turut sejak 2011 (LK 2022); BPK mencatat temuan signifikan/berulang. https://bnpb.go.id/index.php/berita/bnpb-peroleh-opini-wajar-tanpa-pengecualian-12-kali-berturut-turut
- Pemeriksaan LK BNPB 2024 (30 Jan - 21 Mei 2025; 5 provinsi): area risiko: implementasi peraturan baru, PNBP, pengadaan barang/jasa, **penyaluran dan penggunaan bansos/dana siap pakai**; tindak lanjut 81,30% dari 1.198 rekomendasi. https://www.antaranews.com/berita/4695617/bpk-periksa-laporan-keuangan-bnpb-di-lima-provinsi [SEKUNDER: berita]
- Rincian LHP LK BNPB (bukan LHP LKPP) tahun 2021-2024 TIDAK ketemu di web.

Temuan BPBD (semua [SEKUNDER] dari berita, bukan LHP):
- BPBD Mesuji: persediaan belum dicatat/dilaporkan di neraca, tidak diketahui keberadaannya, penatausahaan belum tertib, pengelola gudang non-ASN, opname hanya akhir tahun. https://lampungmonitor.com/bpk-lampung/stok-barang-logistik-milik-bpbd-mesuji-tidak-diketahui-keberadaannya/
- BPBD Karo: persediaan Rp3,06 miliar tidak relevan dan andal; persediaan relokasi tercatat sejak 2020, belum diserahterimakan hingga 2025. https://portibi.id/bpk-temukan-dugaan-penyajian-persediaan-sebesar-rp3-057-708-182-tidak-relevan-dan-andal-di-bpbd-karo/
- [SEKUNDER, DJKN 2016] temuan berulang BPK: pencatatan tidak tertib, tanpa stock opname, saldo persediaan negatif, barang diserahkan ke masyarakat tetapi pemindahtanganan belum selesai (sekitar Rp2,3 triliun), beban persediaan tidak diyakini; opname fisik minimal 2 kali setahun disarankan. https://www.djkn.kemenkeu.go.id/berita/baca/11461/Pentingnya-Penatausahaan-BMN-Berupa-Persediaan.html (artikel merujuk PMK 120/2007 yang sudah dicabut, jadi angka 2 kali setahun tidak bisa jadi kriteria).

### 5.2 Program kerja audit, kertas kerja, sampling, cut-off [TIDAK KETEMU resmi]

- Program pemeriksaan BPK (PMP, juknis pemeriksaan persediaan/aset tetap) dan program audit BPKP (PKR) tidak tersedia publik dalam pencarian ini. [TIDAK KETEMU]
- Bukti pola uji dari sumber yang ketemu:
  - LHP LKPP 2022 memperlihatkan prosedur BPK secara konkret: analisis **Laporan Stock Opname vs perincian modul persediaan SAKTI** per satker; **pemeriksaan fisik persediaan oleh tim BPK** (contoh 6 Maret 2023 di IFP Kemenkes: tidak menemukan barang yang tertulis); pencocokan **kuantitas fisik vs kartu stok**; uji **tripartit** penyusunan LK audited. [TERVERIFIKASI dari LHP]
  - Reviu APIP: Permendagri 4/2018 (reviu LK Pemda); contoh Peraturan Irjen Kemhan 21/2015 (menilai "proses inventarisasi BMN oleh unit", konsistensi data SIMAK-BMN vs KPKNL, transaksi keuangan vs transaksi BMN). https://www.kemhan.go.id/itjen/wp-content/uploads/2017/03/Perirjen-Reviu-LK.pdf [contoh satu K/L, bukan standar BPKP]
  - Praktik audit persediaan umum (ISA 501 gaya): observasi opname, tarik sampel dari kartu ke fisik dan dari fisik ke kartu, uji cut-off, rekonsiliasi bila opname bukan di tanggal neraca. [SEKUNDER, sumber akuntan publik umum; bukan standar BPK]
- Dari sisi aturan, **cut-off** diperkuat oleh: persediaan diakui saat diterima/hak berpindah (Bab VI C); transfer keluar yang belum diterima penerima sampai tanggal pelaporan tetap tercatat di pengirim, transfer dibatalkan dan diproses periode berikutnya [SEKUNDER, slide DJKN versi lama]; BMN rusak berat/hilang yang sudah diusulkan keluar dari neraca (PMK 65/2017 Pasal 5-6).

### 5.3 Daftar 10 hal teratas yang diuji (disusun dari yang terverifikasi)

1. Opname persediaan tiap semester + berita acara (PMK 100/2025 Bab VI E; Permendagri 47/2021 Pasal 39).
2. Saldo SAKTI/modul vs Laporan Stock Opname per satker (LHP LKPP 2022 E.5.9).
3. Kuantitas fisik vs kartu stok, uji dua arah (LHP LKPP 2022 E.5.10).
4. Persediaan tercatat tapi tidak ditemukan, penyimpanan dan pengamanan gudang (LHP LKPP 2022 E.5.11, memuat BNPB).
5. Pencatatan rinci per jenis dan spesifikasi, bukan gelondongan, dicatat di satker yang menguasai (E.5.10).
6. Persediaan rusak/usang dan daftar lampirannya (PMK 100/2025 Bab VI C dan F).
7. Penyerahan ke masyarakat/pemda: BAST, kode kelompok persediaan benar, Daftar Barang Persediaan yang Tidak Dikuasai (E.5.12; Bab VI G.5; PMK 181 Pasal 18 ayat 2).
8. Aset tetap tidak diketahui keberadaan, sensus 5 tahunan, LHI dan BAHI, label (PMK 181 Pasal 18 dan Lampiran III; E.5.2).
9. Dokumen kepemilikan (BPKB/STNK/sertifikat) dan aset dikuasai pihak lain (E.5.3-E.5.4; PP 27/2014 Pasal 43-44).
10. Aset rusak berat belum direklasifikasi, penyusutan semesteran dan masa manfaat sesuai KMK 295/2019 (E.5.6; PMK 65/2017 Pasal 5-6, 18-21).
Catatan: cut-off dan sampling tidak punya pedoman resmi yang ketemu; rujukan hanya praktik umum.

---

## 6. Perka BNPB 10/2011 dan 11/2011 (diminta)

**Perka BNPB 10/2011 Pedoman Inventarisasi Logistik** [TERVERIFIKASI, dibaca penuh]: ditetapkan 30 Nov 2011, diundangkan 29 Sep 2014, BN 2014 No.1421. Dasar: Pasal 18 PP 21/2008. https://peraturan.bpk.go.id/Download/211389/No.%2010%20Tahun%202011.pdf
- Definisi inventarisasi: pendataan, pencatatan, pelaporan **untuk menganalisis kebutuhan** barang/peralatan. Logistik = sandang, pangan, papan atau turunannya, termasuk barang habis pakai (sembako, obat dan alkes habis pakai, pakaian, air, tenda gulung, sleeping bag).
- Tujuan (Bab II A): data jenis, jumlah, kondisi logistik di pemerintah, pemda, dunia usaha, masyarakat; bahan kebijakan; analisis kebutuhan; bahan pengawasan, pengendalian, laporan pertanggungjawaban.
- Prinsip: akurasi, kemutakhiran, berkelanjutan (periodik), komprehensif, akuntabilitas, koordinasi, keterpaduan, efektivitas dan efisiensi.
- Pelaksana: BNPB (koordinasi, siapkan form, analisis, daftar kebutuhan), BPBD Provinsi dan Kab/Kota (sama di tingkatnya), K/L terkait (inventarisasi sesuai format BNPB, laporan berkala). Memakai sistem informasi logistik.
- Frekuensi (Bab III B butir 5): **laporan inventarisasi secara periodik (bulanan, triwulan, semester, tahunan)**. Koordinasi berkala dengan K/L.
- Rekap (Bab III B butir 4): data per K/L: **jenis, jumlah, kondisi, lokasi, sumber perolehan**.
- Analisis kebutuhan (Bab III B butir 7): penduduk dan KK rawan, standar minimal (paket pangan 1% penduduk x 3 hari, paket sandang, logistik lain per keluarga, paket kematian 1%), banding dengan ketersediaan.
- **Laporan hasil inventarisasi minimal memuat (Bab III C):** (1) jenis dan jumlah logistik tersedia **disertai dokumen**; (2) kondisi (masa kadaluwarsa, rusak, hilang, dll); (3) jenis dan jumlah yang perlu disediakan; (4) penyedia/sumber; (5) lokasi penyimpanan.
- Pemantauan dan evaluasi oleh pimpinan unit kerja; evaluasi akhir kegiatan.

**Perka BNPB 11/2011 Pedoman Inventarisasi Peralatan Penanggulangan Bencana** [TERVERIFIKASI, dibaca bagian Bab III-IV]: https://peraturan.bpk.go.id/Download/213778/No.%2011%20Tahun%202011.pdf
- Struktur sama: persiapan (daftar/form sesuai jenis peralatan, alat bantu, SDM, **surat tugas**, koordinasi), pelaksanaan (rakor, pendataan/verifikasi, rekap per **jenis, jumlah, kondisi**, laporan periodik, analisis banding dengan standar minimal peralatan), pelaporan: (1) jenis dan jumlah peralatan tersedia, (2) **kondisi (berfungsi)**, (3) jenis dan jumlah yang perlu disediakan, (4) penyedia/sumber. Tujuan juga mencakup data **sebaran** peralatan (Bab II).
- Tidak ada frekuensi tegas selain "periodik".

Status: **Perban BNPB 4/2018 Pasal 16 hanya mencabut Perka 13/2008.** Perka 10/2011 dan 11/2011 tidak disebut dicabut di Perban 4/2018. Pencabutan oleh peraturan lain TIDAK DICEK. [TERVERIFIKASI untuk Perban 4/2018 Pasal 16; sumber: https://bnpb.go.id/storage/app/media/uploads/24/peraturan-kepala/2018/perban-4-tahun-2018-tentang-sistem-manajemen-logistik-dan-peralatan-bn-828.pdf]

Catatan penting: kedua Perka **bukan** aturan akuntansi/BMN; fokusnya analisis kebutuhan dan ketersediaan lintas K/L. Perka 10/2011 memang menyatakan dasar PP 6/2006 (sudah diganti PP 27/2014) dan PMK 171/PMK.05/2007 (sudah diganti). Artinya kolom "jenis, jumlah, kondisi, lokasi, sumber, kadaluwarsa, dokumen" dari Perka itu wajib ada DI SAMPING kolom BMN/BMD, bukan pengganti.

**Perka BNPB 16/2012 Pedoman Pengelolaan Gudang Logistik dan Peralatan dalam Status Keadaan Darurat Bencana** (BN 2013 No. 1328 menurut OCR; nomor BN tidak dipastikan) [TERVERIFIKASI sebagian, OCR]: pengelola gudang wajib: mengidentifikasi dan **menolak logistik kadaluarsa dan rusak**; **sistem first-in/expired-first-out**; pencatatan, pemilahan, penyusunan; **pengecekan stok secara periodik**; laporan rutin; melindungi dari kerusakan dan kehilangan; serah terima dengan **Berita Acara Serah Terima** (formulir BAST ada di lampiran). https://bpbd.jogjakota.go.id/assets/instansi/bpbd/files/perka-no-16-tahun-2012-tentang-pedoman-pengelolaan-gudang-logist-2112.pdf (juga di Perka dari BPK: Perka BNPB yang berkaitan). Tidak ada frekuensi opname numerik ("periodik" saja).

---

## 7. Yang TIDAK ditemukan atau tidak diverifikasi (jangan diklaim)

1. Kolom tabel resmi Format II.N.2 (KIBAR peralatan dan mesin), II.O.1.2 (Daftar BMD), III.A.2 (lembar kerja), II.I.5 (kartu barang persediaan) Permendagri 47/2021: tidak ada di PDF yang bisa diunduh.
2. Kolom tabel PMK 181 Lampiran VI-VII (Daftar Barang, KKI, LHI, LKB): tidak ditelusuri per kolom.
3. NUP: definisi pasal resmi tidak ketemu; kode barang BMN hanya nama dan perubahan, bukan tabel.
4. Spesifikasi fisik label (isi, ukuran, QR) : tidak ketemu.
5. Teks PSAP 05 (PP 71/2010 Lampiran I) langsung: tidak diperoleh; diganti Bab VI PMK 100/2025 yang memuat kebijakannya.
6. PP 28/2020: perubahan atas Pasal 85 PP 27/2014 tidak diperiksa.
7. PMK 207/PMK.06/2021: hanya dari kutipan LHP.
8. Program kerja audit BPK/BPKP, kertas kerja inventarisasi fisik standar, pedoman sampling resmi: tidak ketemu publik. Rincian LHP LK BNPB tahunan: tidak ketemu.
9. Masa manfaat BMD (Permendagri/perkada) dan angka tabel pemda: tidak diverifikasi.
10. Apakah ada perubahan nilai kapitalisasi (Rp1.000.000) setelah 2016, dan perubahan Permendagri 47/2021 setelah 2021: tidak dicek.
11. Perka 10/2011 dan 11/2011: status pencabutan oleh peraturan selain Perban 4/2018 tidak dicek.

---

## 8. Rujukan URL ringkas

- PMK 181/2016: https://jdih.kemenkeu.go.id/dok/181-pmk-06-2016 ; https://peraturan.bpk.go.id/Details/121291/pmk-no-181pmk062016
- PMK 100/2025 (KAPP): https://jdih.kemenkeu.go.id/dok/pmk-100-tahun-2025 ; PDF https://jdih.kemenkeu.go.id/api/download/29cc2a09-15f9-4155-9a87-88b9023ce686/2025pmkeuangan100.pdf
- PMK 231/2022 (dicabut): https://peraturan.bpk.go.id/Details/238762/pmk-no-231pmk052022
- PMK 65/2017: https://jdih.kemenkeu.go.id/download/8d697525-7e96-4570-a26d-a415ac5f7616/65~PMK.06~2017Per.pdf
- KMK 295/2019: https://www.djkn.kemenkeu.go.id/peraturan/detail/311/Keputusan-Menteri-Keuangan-Nomor-295KMK62019.html ; KMK 266/2023: https://jdih.kemenkeu.go.id/dok/266-km-6-2023
- PMK 29/2010 kodefikasi: https://peraturan.bpk.go.id/Download/225079/PMK%20Nomor%2029%20Tahun%202010.pdf ; KMK 241/KM.6/2022: https://jdih.kemenkeu.go.id/download/a4b76934-b70c-4204-96f4-91d8717c2a43/Salinan_KMK_241_Kodefikasi_BMNpdfpdf.pdf
- PP 27/2014: https://jdih.kemenkeu.go.id/api/download/fulltext/2014/27TAHUN2014PP.htm
- Permendagri 47/2021: https://peraturan.go.id/files/bn1076-2021.pdf ; Permendagri 19/2016: https://peraturan.bpk.go.id/Details/137669/permendagri-no-19-tahu ; Permendagri 7/2024: https://peraturan.bpk.go.id/Details/300030/permendagri-no-7-tahun-2024 ; Permendagri 108/2016: https://peraturan.bpk.go.id/Details/276593/permendagri-no-108-tahun-2016
- Perka BNPB 10/2011: https://peraturan.bpk.go.id/Download/211389/No.%2010%20Tahun%202011.pdf ; 11/2011: https://peraturan.bpk.go.id/Download/213778/No.%2011%20Tahun%202011.pdf ; 16/2012: https://bpbd.jogjakota.go.id/assets/instansi/bpbd/files/perka-no-16-tahun-2012-tentang-pedoman-pengelolaan-gudang-logist-2112.pdf ; Perban 4/2018: https://bnpb.go.id/storage/app/media/uploads/24/peraturan-kepala/2018/perban-4-tahun-2018-tentang-sistem-manajemen-logistik-dan-peralatan-bn-828.pdf
- LHP SPI dan Kepatuhan LKPP 2022: https://www.bpk.go.id/assets/files/lkpp/2022/lkpp_2022_1687233367.pdf
