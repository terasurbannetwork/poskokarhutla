# Batasan dan perbedaan dokumen

Halaman ini mencatat perbedaan antara dokumen paket dan kode (kode menang) serta batasan modul.

## Perbedaan kode dan dokumen paket (kode menang)

| Hal | Dokumen paket | Kode saat ini |
| --- | --- | --- |
| Mode Tanya (BM25 atas `edukasi.json`), kabar balik BMKG dan gugus, ringkasan harian, penugasan dan tenggat merah, penilaian foto (dHash, buram), sinyal awal di peta utama, pembanding lawan prediksi, draf LogPal, tindakan massal, ekspor Excel, CSV, PDF, linimasa, mode layar besar, urutan Perhatian | Tertulis di ALGORITMA A10 sampai A28 dan tiket LA-30 sampai LA-52 | Tidak ditemukan di `src/`, `public/lapor/`, atau migrasi; berstatus rencana |
| Kabar selamat, tautan keluarga, laporan orang dicari | A30, F-51 sampai F-53 | Ada: `src/lapor_selamat.js`, rute digabung di `src/lapor_ai.js:1357`. Profil publik orang hilang: halaman Orang hilang publik, di belakang bendera mati |
| Rute `POST /api/lapor/luring`, tabel `lapor_luring`, `lapor_foto_luring` | A13, DL6 | Tidak ada; luring memutar ulang alur Lapor darurat ke `/api/lapor/pesan` dan hanya membawa jenis, lokasi, dan korban |
| Foto luring dan ringkasan teks luring | DL3 | Belum ikut di versi kode (komentar `public/lapor/luring.js:1`) |
| Jadwal cron peringatan | Tiap menit | Sekali per jam pada menit 29 (`src/worker.js:1032`) |
| Service worker `public/lapor/sw.js` tanpa cache | D2 paket PWA | `public/sw-lapor.js` dengan simpanan cangkang halaman, cakupan `/lapor/` |
| Titik evakuasi memakai register `titik_pengungsian` bila ada | D10 | Hanya OpenStreetMap |
| Minta verifikasi lewat tautan bertoken `/lapor/v/<token>` (F-18 sampai F-20) | PRD | Tidak ada; verifikasi dilakukan lewat aksi Periksa di meja oleh akun BPBD wilayah |
| Aturan satu desa 24 jam (LK-01), halaman web `/lapor/hari-ini`, tombol Usulkan ke Buku Besar, tombol Tarik | paket lapor-kejadian | `lapor_gugus.js` belum memuat `JENDELA_DESA_JAM`; hanya rute `GET /api/lapor/hari-ini` (saklar) dan tabel `lk_tarik`, `lk_usulan` yang ada; belum ada halaman, rute usulan, atau rute tarik |
| Formulir web data lanjutan dan rincian berkas di meja (F-15), `public/lapor/data/**` | paket lapor-lanjutan | Tidak ada di `public/lapor`; yang ada API `/api/lapor/data/*` dan percakapan WhatsApp tahap 2 |
| Pembangkitan spek dari `scripts/lapor/spek.py` | A0 | Spek ditulis tangan di `src/lapor_spek.js` (subset awal) |
| Nama layanan di manifest, judul halaman meja, templat bot dan teks notifikasi | Nama produk Centurisk97 | Beberapa teks di kode masih memakai nama lama; perlu diseragamkan |

## Batasan

- Semua ambang gugus, jendela kejadian laporan, jendela 24 jam halaman hari ini, ambang penanda objek data lanjutan (500 m, 72 jam, 10 m), batas anggota tim 20, dan batas 5.000 langganan peringatan tidak punya sumber resmi; semuanya HIPOTESIS dan perlu disetel dari data uji.
- Uji balik: tidak ada uji balik terhadap kejadian nyata untuk gugus, pencocokan kejadian, maupun peringatan dini. Status: belum diuji. Notifikasi memakai tingkat dari modul prakiraan yang vonis ujinya diwarisi per jenis.
- Tingkat peringatan dini per kab/kota, bukan per kecamatan; kecamatan hanya menentukan siapa yang diberi tahu dan teks arahan.
- Titik berkumpul berasal dari OpenStreetMap, jarak garis lurus, belum tentu titik evakuasi yang ditetapkan BPBD.
- Batas desa dari berkas yang disederhanakan bukan batas resmi; lokasi selalu dikonfirmasi pelapor.
- Mutu terjemahan model untuk bahasa daerah belum diukur; pesan darurat dan peringatan tidak diandalkan terjemahan model.
- Push iPhone tidak dapat diuji penuh di `http://localhost:8800`; uji terbatas di produksi memakai bendera `PW_UJI` dan langganan bertanda uji.
- Nomor yang belum berizin yang menulis ke bot WhatsApp dibiarkan tanpa balasan.
- Foto bukti petugas tidak tampil publik kecuali ditandai per foto oleh staf.
- Kosong bukan nol: isian yang tidak diketahui tampil "belum didata"; nilai 0 hanya bila pelapor menjawab "tidak ada" (nihil) atau, pada data lanjutan, ada objek yang semuanya sudah selesai. Jumlah "mengungsi" tanpa tanggal bernilai kosong. Sel agregat di bawah 3 pelapor tampil "<3", bukan 0, dan selisih dengan data resmi tampil "belum tersedia".
- Angka dari laporan warga tidak dijumlahkan dengan DIBI, logbook, atau angka resmi lain dan tidak ditampilkan sebagai setara.
- Penyimpanan data pribadi tahap 2 dihapus 5 tahun sesudah kejadian selesai (keputusan pemilik 20 November 2026); mekanisme penghapusan otomatis belum terdokumentasi di kode.
