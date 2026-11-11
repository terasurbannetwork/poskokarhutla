# KEPUTUSAN-CEK-KABAR: Cek Kabar Luar untuk kejadian yang belum dilaporkan selesai

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Pada 11 Nov 2026 ada 103 kejadian di Pantau Dalops yang belum punya laporan selesai: banjir 24, cuaca ekstrem 23, kekeringan 43, longsor 12, gempa 1 (tangkapan layar pemilik). Pemilik: "kalau kita gaada verif dari luar via portal berita atau yang lain, kita gatau ini beneran masih berlangsung atau belum dilaporkan selesai aja."

Sekarang kejadian seperti itu hanya masuk daftar "Perlu ditanya", lalu hilang sendiri sesudah 14 sampai 30 hari tanpa kabar (`SENYAP_MAKS` dan `buka_maks()` di `scripts/data/dalops_banjir.py`). Hilang bukan berarti selesai.

## Keputusan pemilik (11 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Bangun satu bagian yang memeriksa, untuk tiap kejadian yang belum dilaporkan selesai, apakah ada kabar dari luar laporan BPBD (portal berita "atau yang lain"). Pemilik: "Gas, tulis paketnya" (11 Nov 2026). |
| K2 | Paket dokumen lengkap dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Hasil cek **tidak pernah menutup kejadian**. Status selesai tetap hanya dari laporan resmi (logbook, WA Koordalops). Hasil cek hanya mengurutkan siapa yang ditanya dulu dan isi pertanyaannya. | Berita bisa salah tempat, salah tanggal, atau terlambat. Penutupan adalah wewenang laporan resmi. |
| D2 | Tiga label saja: **Masih berlangsung** (ada bukti luar sesudah laporan resmi terakhir), **Kemungkinan selesai** (ada bukti luar bahwa sudah pulih, atau tidak ada bukti luar dan kondisi alamnya sudah normal), **Belum ada kabar luar**. Label diberi keterangan "Deteksi Centurisk97". | Pola K3 Silang Sumber: hasil turunan diberi label dan tidak tampil sebagai pernyataan resmi. |
| D3 | Tiap label tampil bersama buktinya: judul berita, media, tanggal, tautan, atau angka alamnya. Label tanpa bukti tidak boleh tampil. | Staf harus bisa menilai sendiri dalam satu klik. |
| D4 | Tidak ada rute Worker baru dan tidak ada tabel D1. Hasil cek ditulis sebagai kolom `luar` di tiap baris `dalops/<jenis>.json` (R2 privat, rute `/api/dalops/<jenis>` yang sudah ada). | Data kejadian bersumber logbook internal dan sudah privat. Cakupan terkecil. Tanpa tabel D1, tombol dummy tidak berlaku. |
| D5 | Pengecek jalan di mesin yang sama dengan `dalops_banjir.py` (mesin pemilik dan bot WA) dan membaca berkas publik produksi (`/banjir/data/berita*.json`, `/banjir/data/status.json`, titik panas), bukan salinan di git. | Salinan di git basi: `public/banjir/data/berita.json` di `main` bertanggal 16 Okt 2026, yang tayang 10 Nov 2026. |
| D6 | Label harian dibekukan append-only di `data/raw/dalops/cek_arsip.jsonl` (ikut .gitignore) supaya ketepatannya bisa dinilai prospektif lawan laporan selesai resmi yang datang kemudian. | Tanpa arsip beku, ketepatan tidak bisa diukur jujur. |
| D7 | Pengerja: `pipa-data` untuk pengecek (`scripts/data/dalops_kabar.py`, dipanggil `dalops_banjir.py`); `ruang-bnpb` untuk layar (`public/bnpb/dalops*.js`). Tidak ada agent baru. | Pemilik berkas sudah ada (`ilmu.mjs pemilik`). |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Berapa hari tanpa bukti luar baru sebuah kejadian boleh diberi "Kemungkinan selesai" bila kondisi alamnya normal? Hanya berlaku untuk jenis yang punya sinyal alam. | **[BAWAAN SEMENTARA]** banjir 3, longsor 7, karhutla 3, kekeringan 14 hari. Cuaca ekstrem, gempa, gelombang pasang, dan kebakaran permukiman tidak punya sinyal alam, jadi hanya bisa "Kemungkinan selesai" dari berita pulih. Angka diatur ulang dari arsip beku (CK-07). | tidak menahan |
| Q2 | Kebakaran permukiman belum punya umpan berita sendiri (gelombang pasang sudah: `berita_pesisir.json` dari `lintas.yml`). Boleh menambah kueri Google News kebakaran permukiman (menambah beban panen `scripts/umum/berita.py`)? | **[BAWAAN SEMENTARA]** belum ditambah; kebakaran permukiman hanya dicocokkan ke artikel `/data/berita.json` (karhutla) yang kebetulan menyebutnya. | CK-08 |
| Q3 | Sumber lain di luar berita: akun media sosial BPBD, DIBI, laporan warga di `/warga`? | **[BAWAAN SEMENTARA]** fase 1 hanya berita dan data alam yang sudah ada di repo. | tidak menahan |
| Q4 | Tombol WA ke BPBD untuk "Kemungkinan selesai": teks baru "mohon konfirmasi apakah sudah selesai"? | **[BAWAAN SEMENTARA]** ya, memakai tombol WA yang sudah ada, teksnya diganti sesuai label. | tidak menahan |
| Q5 | Pemirsa baca-saja tab `pusdalops` boleh melihat label ini? | **[BAWAAN SEMENTARA]** ya, sama dengan isi tab lain. Tombol WA `.dl-wa` di tab jenis **belum** disembunyikan untuk baca-saja hari ini; aturannya ditambahkan di CK-06. | tidak menahan |
| Q6 | Sesudah 60 hari arsip beku, bila ketepatan "Kemungkinan selesai" rendah, label itu dicabut atau ambangnya diubah? | Diputuskan pemilik saat rapor CK-07 keluar. | CK-07 |
