# RISET: 3W dan pintu tawaran bantuan

## 1. Benchmark

| Sistem | Yang ditiru | Pelajaran |
| --- | --- | --- |
| OCHA 3W/4W | Di hari-hari awal hanya organisasi pelaksana, klaster, dan lokasi; detail kegiatan menyusul. Klaster membuat 3W rinci, OCHA menyatukan antar-klaster. Dashboard global menyederhanakan ke tujuh kolom baku. | Mulai kecil dan baku; standar kolom memungkinkan otomasi. |
| AHA Centre, Palu 2018 | Pemerintah menunjuk AHA Centre sebagai pintu masuk tawaran dan pusat koordinasi bantuan; NGO internasional wajib lewat mitra lokal untuk distribusi akhir. | Aturan disampaikan sepotong-sepotong membuat kacau: aturan harus tertulis di sistem sejak awal. |

Sumber: panduan 3W OCHA (humanitarian.atlassian.net, panduan global 3W 2020), The New Humanitarian 16 Okt 2018, Direct Relief Okt 2018, Australian Red Cross 2019.

## 2. Keadaan repo (15 Nov 2026)

| Hal | Ada | Berkas |
| --- | --- | --- |
| Daftar delapan klaster | Hanya peta kata kunci, rujukan Keputusan Kepala BNPB 173/2014, tanpa kementerian koordinator | `public/fungsi_direktori.js:84-93` |
| Meja klaster | Dokumen klaster logistik saja (SK, rencana kerja, laporan) | `src/meja_spek.js:301-315` |
| Register organisasi | `institusi` (kampus, organisasi relawan), `kontak_pemangku` (orang, lembaga teks bebas), `kontak_pt` (perusahaan konsesi), `instansi_akun` (pemda, TNI, Polri saja) | `migrations/0023_relawan.sql:11`, `0053:4`, `0018:91`, `0029:7` |
| Rencana direktori lembaga mitra | Belum dibangun; memuat kategori mitra internasional dan dunia usaha | `docs/bnpb/lembaga/PRD.md:3,40,42` |
| Kebutuhan berbarang | Meja logistik (barang dari `BARANG`, jumlah, satuan, posko, status diminta sampai diterima) | `src/meja_spek.js:12,139-155` |
| Kebutuhan lain | `logpal_permintaan` (items JSON, kab, tanpa kejadian), logbook `KEBUTUHAN` (kode tanpa jumlah), meja pengungsi `keb_*` | `migrations/0112:118`, `src/logbook.js:17`, `src/meja_spek.js:41` |
| Jalur isian tanpa akun | Tautan bertoken (uji pilot), kode per petugas meja, daftar mandiri disetujui admin | `src/uji_pilot.js:1-6`, `migrations/0119:19` |
| Satu Pintu Masuk | Akun umum nomor WA + kode sekali pakai; belum memberi peran organisasi | `src/masuk.js:1-6` |
| Inventaris input | 3W dan tawaran bantuan: tidak ada jalur | `data/kajian-bnpb/keterpaduan/INVENTARIS-INPUT.md` |
| Aturan bantuan internasional | Perban 6/2018 Ps 17(2): 23 K/L | `data/kajian-bnpb/data/lembaga/README.md:139` |
