# KEPUTUSAN-LIFELINE: Status layanan dasar per kab/kota terdampak

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Sesudah kejadian, pertanyaan pimpinan hampir selalu "listrik dan jalan sudah pulih belum?". Sistem belum punya jawaban satu tempat. Isyaratnya tersebar: Lapor Warga punya kategori listrik, sinyal, BBM, akses (`public/informasi_jenis.js`) dan ringkasan per kab (`public/informasi.js:349`); logbook punya kode kendala listrik, sinyal, akses, air (`src/logbook.js:16`); meja dampak menghitung unit vital rusak (`src/meja_spek.js:69`); IODA memberi padam internet per provinsi; lampu malam satelit belum layak terbit (`scripts/umum/lampu_malam.py:13`). Tidak ada status per layanan per kab, dan tidak ada bukti yang menempel pada status.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026: Status Lifeline per kab/kota disetujui ("ini yang dua atas oke", benchmark FEMA Community Lifelines dan DHS CLSS: tiap warna wajib bukti). |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satuan status = (kejadian `KJ-`, kab4, layanan). Layanan tidak punya status di luar kejadian. | Satu nomor kejadian (paket Keterpaduan); pertanyaan pimpinan selalu tentang kejadian tertentu. |
| D2 | Empat warna: hijau berfungsi, kuning terganggu, merah lumpuh, abu tidak diketahui. Bawaan abu. | Bentuk FEMA; abu jujur saat belum ada bukti. |
| D3 | Dua lapis: usulan mesin (dari isyarat yang ada) dan status resmi yang ditetapkan staf. Layar menampilkan status resmi; usulan tampil sebagai saran dengan buktinya. | Mesin tidak pernah menetapkan sendiri (CLSS: status tanpa bukti tidak sah, status mesin tanpa manusia juga tidak). |
| D4 | Status resmi selain abu wajib menempel paling sedikit satu bukti (isyarat sistem atau catatan staf 20-300 karakter). Hijau juga butuh bukti. | Aturan CLSS. |
| D5 | Riwayat status append-only. | Linimasa pulih bisa dibaca ulang dan dipakai kaji ulang pasca-kejadian (F6). |
| D6 | Padam internet IODA dan menara hanya tampil sebagai konteks provinsi, tidak pernah menjadi usulan per kab. | Datanya per provinsi; label padam bukan bukti seluler mati (`internet_padam.json` catatan). |
| D7 | Lampu malam satelit masuk sebagai isyarat listrik hanya sesudah uji balik `lampu_malam.py` lulus dengan VNP46A2 asli. | Status skrip sendiri: BELUM LAYAK TERBIT. |
| D9 | Isyarat yang tidak bertaut ke kejadian (Lapor Warga, logbook, meja) dipakai untuk semua kejadian aktif yang menyentuh kab-nya, berlabel "isyarat kab". | Isyarat itu memang per wilayah; status resmi tetap per kejadian. |
| D8 | Tidak ada tabel kejadian baru; tabel status membawa `kejadian_id` FK (aturan D2 Keterpaduan). | Gerbang keterpaduan. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Layanan apa saja? | **[BAWAAN SEMENTARA]** delapan: listrik, sinyal, air bersih, jalan dan akses, BBM, faskes, pangan, pengungsian. | tidak menahan |
| Q2 | Siapa yang menetapkan status resmi? | **[BAWAAN SEMENTARA]** Pusdalops dan Koordalops pusat untuk semua kab; akun BPBD untuk kab wilayahnya. Pimpinan hanya membaca. | LF-05 |
| Q3 | Ambang usulan dari Lapor Warga? | **[BAWAAN SEMENTARA, HIPOTESIS]** tiga pelapor berbeda dalam 24 jam di satu kab = usulan kuning; bila lebih dari separuh laporan kab itu "padam/tidak ada/habis/putus" = usulan merah. Dikalibrasi sesudah ada data. | tidak menahan |
| Q4 | Tampil di mana? | **[BAWAAN SEMENTARA]** halaman kejadian `/siklus/kejadian/<KJ>` (kisi kab x layanan) dan ringkasan di `/bnpb/dalops`; tidak publik. | LF-07 |
| Q5 | Masuk Laporan Berkala ke Presiden? | **[BAWAAN SEMENTARA]** ya, satu tabel per kejadian aktif; menunggu paket Laporan Berkala menerima bab baru. | LF-09 |
| Q6 | Perpanjang token Earthdata (habis sekitar 11 Des 2026) dan bangun jalur VNP46A2 untuk listrik? | **[BAWAAN SEMENTARA]** ya, sebagai tiket tersendiri; status listrik tetap jalan tanpa satelit sampai lulus. | LF-10 |
| Q7 | Berapa lama status tanpa pembaruan dianggap basi? | **[BAWAAN SEMENTARA]** 24 jam: tampil dengan tanda "lewat 24 jam", warna tidak diubah otomatis. | tidak menahan |
