# Layar kinerja, hukum, meja kerja

Halaman ini mencatat layar kinerja, pustaka hukum, katalog dokumen, laporan BNPB, meja kerja, dan Ruang Unit.

## Kinerja BNPB, /kinerja-bnpb dan /admin/kinerja

`/kinerja-bnpb` menampilkan panel IKU: tiga deret IRB (metode lama 2019 sampai 2024, capaian 2021 sampai 2025, lintasan baru dari baseline 147,95), kapasitas daerah, kerugian terhadap PDB, peringatan dini, dan peta kontribusi modul Centurisk97 terhadap indikator Renstra. Angka resmi hanya dari catatan pustaka yang membawa dokumen dan halaman. `/admin/kinerja` adalah dasbor SLA pemantauan (data, proses, lapangan) dari `GET /api/sla`.

## Pustaka Hukum BNPB, /bnpb/hukum

Pencarian peraturan (kata kunci, jenis, tahun, status), halaman dokumen dengan relasi mencabut dan mengubah, dan pertanyaan bebas yang dijawab dengan kutipan. Jawaban model hanya tampil bila setiap klaim memuat kutipan segmen yang lolos verifikasi; bila tidak, hanya segmen teratas yang ditampilkan. Pil "dicabut menurut teks" muncul bila teks pencabut dan status JDIH berbeda.

## Katalog Dokumen, /bnpb/katalog-dokumen

Indeks dokumen repo yang dapat dicari menurut kata kunci, kategori, dan format, tampil sebagai daftar atau kartu. Klik pil format membuka pratinjau (Markdown terformat, PDF lewat penampil peramban). Halaman ini dibuka tanpa login sementara (keputusan pemilik 9 November 2026) dan bertanda noindex; rute berkas hanya menerima jalur yang ada di indeks.

## Laporan BNPB, /laporan-bnpb

Tim mengetik angka, peramban menyusun PPTX dan PDF. Jenis yang ada di kode: harian (Laporan Kejadian Bencana Harian) dan presiden (Paparan Kepala BNPB kepada Presiden) (`src/laporan_bnpb.js:13`). Draf tertahan di peramban per jenis dan tanggal. Semua rute wajib admin, ditambah baca untuk pemirsa pusdalops. Rute `/laporan-bnpb` dan `/laporan-konsesi` hanya dilayani di host Centurisk dan localhost, selain itu menjawab 404 (`src/worker.js:820`). Jenis ketiga "Laporan Berkala" (harian, mingguan, bulanan, tahunan) baru rancangan, tidak ada di kode.

## Meja Kerja, /meja, dan halaman lain di folder yang sama

Halaman berikut berada di `public/bnpb/` tetapi dikelola modul lain; ringkasannya:

| Halaman | Isi |
| --- | --- |
| `/meja` | Meja Kerja petugas BPBD tanpa akun, masuk dengan kode di fragmen `#k=`. Registri `MEJA` memuat 12 meja: kaji cepat, logistik, dana siap pakai (dsp), rencana kontinjensi (renkon), desa tangguh bencana (destana), rehabilitasi dan rekonstruksi (rehab), gudang, pengungsi, pengaduan, klaster, risiko, dan dampak (`src/meja_spek.js:116-338`). Meja pengungsi, pengaduan, klaster, dan risiko adalah formulir juklak; aturan paketnya ada di `data/kajian-bnpb/juklak/` (identitas pelapor pengaduan tidak pernah masuk rekap atau ekspor). Formulir dibangun dari `GET /api/meja/spek` |
| `/relawan`, `/relawan/saya` | pendaftaran dan halaman pribadi relawan (kode di fragmen, tanpa NIK) |
| `/riset`, `/riset/mitra` | ringkasan riset kampus untuk kebijakan dan halaman mitra berkode |
| `/kampus` | koordinator kampus memverifikasi relawan dan jam kerja |
| `/pendataan` | Pendataan Satu Data BNPB, dibuka tanpa login |
| `/daftar-kontak` | registrasi kontak pemangku kepentingan, menunggu persetujuan admin |
| `/bnpb/saham` | data saham dari gateway data lewat proksi Worker, panel Info, Grafik, Transaksi, Dividen |

## Ruang Unit, /bnpb/unit

Belum ada layarnya. Yang ada baru pelari pipeline `scripts/bnpb/unit/jalan.py` (daftar langkah masih kosong) dan pustaka skor `scripts/bnpb/unit/skor.py`. Rancangan lengkap ada di `data/kajian-bnpb/kedeputian/`.
