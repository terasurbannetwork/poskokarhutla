# TIKET: Orang hilang publik

Ambil tiket berurutan; kerjakan hanya cakupannya. Tiap tiket ditutup dengan bukti di `RENCANA-UJI.md`. Subagent tidak commit atau push; sesi induk yang melakukannya (AGENTS 9). Pemeriksa tidak pernah pengerja yang sama (AGENTS 3.2). Pemilik berkas dicek 27 Nov 2026 lewat `node scripts/agents/ilmu.mjs pemilik <berkas>`. Semua kode publik dibangun di belakang bendera `OH_PUBLIK` dan `OH_FOTO` yang bawaan mati; nomor migrasi diambil saat tiket dikerjakan (terakhir terpakai 0187).

Arti kolom Q: **Q menahan TAYANG atau penyalaan bendera** (OH-12, OH-13, OH-15), bukan pembangunan kode. Tiket kode tetap Siap di belakang bendera mati, kecuali yang benar-benar butuh jawaban untuk kodenya (hanya bagian model sungguhan OH-14).

Status: **Siap** = bisa dikerjakan tanpa jawaban pemilik (bawaan sudah cukup dan tidak menayangkan apa pun). **Tertahan** = butuh jawaban atau tindakan pemilik.

| Tiket | Isi singkat | Status | Q yang menahan |
| --- | --- | --- | --- |
| OH-00 | Pasang paket: bagian di AGENTS, catatan di lapor-ai | Siap | |
| OH-01 | Ukur celah data dan daftar kejadian untuk warga | **Selesai** (27 Nov 2026, belum di-commit) | |
| OH-02 | Fungsi murni dan uji murni | **Selesai** (27 Nov 2026, belum di-commit) | |
| OH-03 | Migrasi `oh_*`, hak tabel, pembaca kejadian | **Selesai** (27 Nov 2026, belum di-commit) | |
| OH-04 | Mesin obrolan: penyaring bencana dan persetujuan | **Selesai** (27 Nov 2026, belum di-commit; teks persetujuan masih draf Q18) | |
| OH-05 | Foto publik turunan | **Selesai (bagian Worker, 27 Nov 2026, belum di-commit; layar menunggu layar-peta)** | |
| OH-06 | Profil anak dan wali | **Selesai (bagian Worker, 27 Nov 2026, belum di-commit; layar menunggu layar-peta)** | |
| OH-07 | Meja tinjau | **Selesai (bagian Worker, 27 Nov 2026, belum di-commit; layar menunggu layar-peta)** | |
| OH-08 | Cabut, perpanjang, turun otomatis, cron | **Selesai** (27 Nov 2026, belum di-commit; jalur `cabut` tanpa sesi lewat `oh_info` menunggu OH-11) | |
| OH-09 | Rute publik dan tab publik (bendera mati) | **Selesai (bagian Worker, 27 Nov 2026, belum di-commit; halaman `/lapor/hilang` dan `/lapor/h/<token>` menunggu layar-peta; entri `PUBLIK_TANPA_SESI` menunggu keputusan pemilik di daftar beku `pintu_masuk.json`)** | |
| OH-10 | Jalur menemukan orang (tanpa tayang) | **Selesai (bagian Worker dan mesin, 27 Nov 2026, belum di-commit; tombol jalur dan `public/lapor/meja_cari.js` menunggu layar-peta; saran cocok sudah di meja OH-07)** | |
| OH-11 | Informasi, laporkan, tombol "Saya orang ini", protokol penyalahgunaan | **Selesai (bagian Worker, 27 Nov 2026, belum di-commit; layar dan panduan `docs` menunggu; nomor layanan belum dipasang, teks rujukan hanya 112 dan kepolisian)** | tidak menahan kode; Q15 menahan tayang |
| OH-12 | Menyalakan `OH_PUBLIK` dan tinjau pemilik | **Tertahan** | Semua Q tayang: Q1 sampai Q8, Q13 (K105), Q15 sampai Q18, Q20 sampai Q25; plus tinjauan pengacara |
| OH-13 | Daftar publik "Ditemukan, mencari keluarga" | **Tertahan** | Q9 |
| OH-14 | Lab pembanding foto | Siap untuk bagian tiruan, **tertahan** untuk model sungguhan | Q11, Q12 |
| OH-15 | DPIA, tinjauan hukum, menyalakan `OH_FOTO` | **Tertahan** | Q13, Q14 |
| OH-16 | Gerbang `gerbang-orang-hilang` | Siap | |
| OH-17 | Dokumentasi `/docs` | Siap | |
| OH-18 | Metrik petugas | Siap | |
| OH-19 | Uji perangkat nyata dan penutupan | **Tertahan** (pemilik) | OH-12 |

Format tiap tiket: Tujuan, Berkas, Di luar, Dependensi, Pengerja, Pemeriksa, Langkah, Bukti, Pemilik.

## OH-00 Pasang paket

- **Tujuan**: agent dan gerbang tahu paket ini ada.
- **Berkas**: `AGENTS.md` (bagian "Orang hilang publik: baca dulu, baru bangun" memakai pola 2.34 dengan urutan otoritas folder ini), `scripts/agents/roster.json` bila perlu entri berkas baru ke pemilik, `data/kajian-bnpb/lapor-ai/KEPUTUSAN-LAPOR-AI.md` (catatan: K91 dan D129 untuk orang dicari diubah K111 dan paket ini; rujuk K112 sampai K116), `.claude/ilmu-agent/*.md` pemilik terkait via `ilmu.mjs kasus`.
- **Di luar**: kode produk.
- **Dependensi**: paket ini diperiksa pemeriksa bersih.
- **Pengerja**: sesi induk. **Pemeriksa**: `penulis-gerbang`.
- **Langkah**: tambah bagian AGENTS; jalankan `npm run agents:build` bila roster berubah; periksa `tests/agen/gerbang-paket-modul.test.mjs` hijau.
- **Bukti**: `npm run uji:agen` hijau.
- **Pemilik**: tidak.

## OH-01 Ukur celah data dan kejadian untuk warga

- **Tujuan**: mengisi RISET 1.1 dengan hasil ukur: bagaimana umur, kelamin, lokasi tersimpan di `sesi.cari` dan di `lapor_cari`; bentuk daftar kejadian untuk warga dari Buku Besar.
- **Berkas**: baca `src/lapor_mesin.js`, `src/lapor_selamat.js`, `src/kejadian_tautan.js`, `src/siklus_kejadian.js`, migrasi Siklus; tulis hasil di `RISET.md`.
- **Di luar**: mengubah kode.
- **Dependensi**: OH-00.
- **Pengerja**: `warga-api`. **Pemeriksa**: pemeriksa bersih.
- **Langkah**: daftar kolom yang ada vs butuh; contoh kueri daftar kejadian per kab dan jendela; ukur jumlah kejadian per kab di D1 lokal uji (bukan produksi).
- **Bukti**: bagian RISET terisi dan ditautkan ke berkas dan baris.
- **Pemilik**: tidak.

## OH-02 Fungsi murni dan uji murni

- **Tujuan**: semua keputusan bisnis sebagai fungsi murni teruji (ALGORITMA 1 sampai 6).
- **Berkas**: `src/orang_hilang_murni.js`, `tests/lapor/hilang_murni.test.mjs`.
- **Di luar**: D1, rute, jaringan.
- **Dependensi**: OH-01.
- **Pengerja**: `warga-api`. **Pemeriksa**: `selera-angka`, `validasi-model` (konstanta HIPOTESIS dan keadilan saran).
- **Langkah**: tulis fungsi; konstanta tunggal berlabel HIPOTESIS; uji RENCANA-UJI bagian 1.
- **Bukti**: `node --test tests/lapor/hilang_murni.test.mjs` hijau.
- **Pemilik**: tidak.

## OH-03 Migrasi, hak tabel, pembaca kejadian

- **Tujuan**: tabel samping dan hak per pelaku; rute baca sempit daftar kejadian untuk penyaring (K116, D25).
- **Berkas**: `migrations/<nomor>_orang_hilang.sql`, `src/hak.js` (matriks dan fungsi `oh*`), `src/orang_hilang.js` (hanya rute kejadian), `src/kejadian_tautan.js` dan `src/siklus_kejadian.js` (`gerbangIngest`; pemilik `warga-api`, didaftarkan sumber `orang_hilang` yang tidak membuat kejadian), uji rute bagian 2 (termasuk 2.12, 2.12b, 2.17).
- **Di luar**: mengubah migrasi lama; tabel kejadian kedua; pencocok baru.
- **Dependensi**: OH-02.
- **Pengerja**: `warga-api`. **Pemeriksa**: `migrasi-idempoten`, `guard-api`, `security-reviewer`.
- **Langkah**: CREATE IF NOT EXISTS tanpa trigger dan tanpa data contoh; hak `lp_publik` tanpa tabel pribadi; daftar kejadian hanya jenis, kab, tanggal.
- **Bukti**: uji 2.12, 2.12b, 2.15, 2.16, 2.17 dan gerbang hak hijau; migrasi diterapkan ke D1 produksi oleh pemilik.
- **Pemilik**: menerapkan migrasi.

## OH-04 Mesin obrolan: penyaring bencana dan persetujuan

- **Tujuan**: langkah `cari_kejadian` dan `cari_setuju` di alur lapor orang hilang (ALUR 2).
- **Berkas**: `src/lapor_mesin.js`, `src/lapor_tampil.js`, `scripts/lapor/lokal.mjs`, uji bagian 3.
- **Di luar**: jalur B (OH-10), tombol jalur di UI (OH-09).
- **Dependensi**: OH-03.
- **Pengerja**: `warga-api`. **Pemeriksa**: `security-reviewer`, `selera-angka`, `inp-reviewer` (bila kartu layar berubah).
- **Langkah**: sisipkan langkah; versi persetujuan `SETUJU_VERSI`; teks memakai draf KEAMANAN 6 (final menunggu Q18, tidak menahan kode); uji tombol sama besar disiapkan bagian 5.
- **Bukti**: `hilang_mesin.test.mjs` hijau; uji lama `luring_putar` dan `rute` tidak mundur.
- **Pemilik**: tidak.

## OH-05 Foto publik turunan

- **Tujuan**: pelapor memilih sampai 3 foto untuk publik; turunan tanpa EXIF di R2 `orang-hilang/publik/`.
- **Berkas**: `src/orang_hilang_foto_publik.js`, bagian di `public/lapor/lapor.js` (pilih foto di kartu persetujuan), kanvas pengecil.
- **Di luar**: pemotongan oleh petugas (OH-07), foto anak (tidak tampil).
- **Dependensi**: OH-04.
- **Pengerja**: `layar-peta` (HP), `warga-api` (rute). **Pemeriksa**: `security-reviewer`, `inp-reviewer`.
- **Langkah**: kanvas 800 px; rute `saya/foto` menolak lebih dari 300 KB, tipe dari byte awal, EXIF dan XMP, laju per sha nomor; nama berkas acak; dilayani hanya lewat profil `tayang` dengan header D29 (bukan `public, max-age`).
- **Bukti**: uji 2.11 dan 2.11b hijau; uji peramban menunjukkan berkas turunan bebas EXIF.
- **Pemilik**: tidak.

## OH-06 Profil anak dan wali

- **Tujuan**: jalur anak (ALGORITMA 5), pertanyaan wali, penandaan "anak sampai petugas memutuskan".
- **Berkas**: `src/orang_hilang_murni.js`, `src/lapor_mesin.js`, panel meja (OH-07).
- **Di luar**: foto anak publik (tidak ada).
- **Dependensi**: OH-04.
- **Pengerja**: `warga-api`. **Pemeriksa**: `security-reviewer`.
- **Langkah**: kolom `kelas`, `setuju_wali`, `wali_oleh`; `layak` anak butuh catatan wali; Q24 (lokasi terakhir tak diketahui) ditangani di langkah kejadian.
- **Bukti**: uji 1.3, 1.6 dan rute anak tanpa foto.
- **Pemilik**: tidak (Q5 bawaan cukup untuk bangun; tayang tertahan di OH-12).

## OH-07 Meja tinjau

- **Tujuan**: antrean tinjau, pratinjau persis publik, aksi Tayang, Minta perbaikan, Tolak, Ganti foto, Ubah kejadian, Verifikasi wali; saran cocok; penanda prioritas kejadian aktif; tampil juga di BNPB bila BPBD tak aktif (Q7).
- **Berkas**: `src/orang_hilang.js` (rute meja), `src/lapor_meja_hak.js` (aksi `tayang`), `public/lapor/meja_cari.js`, `meja.css`, uji.
- **Di luar**: rute publik.
- **Dependensi**: OH-03, OH-05, OH-06.
- **Pengerja**: `warga-api` (rute), `layar-peta` (layar). **Pemeriksa**: `guard-api`, `security-reviewer`, `selera-angka`, `inp-reviewer`.
- **Langkah**: kartu tinjau dengan panel privat bertanda "Hanya petugas"; setiap aksi tulis menulis `oh_riwayat` (alasan baku plus teks pendek tersaring, D31; pembacaan tidak dicatat, Q26); **daftar periksa wajib sebelum Tayang untuk dewasa**: petugas menelepon `nomor_dicari` bila ada dan menandai hasilnya (D34).
- **Bukti**: uji 2.4, 2.5, 2.13; tinjau di `http://localhost:8800/lapor/meja.html`.
- **Wajib dari tinjauan keamanan OH-03**: rute tayang memeriksa `layak(oh) && persetujuanSah(oh)` (dan bendera `OH_PUBLIK`) SEBELUM `ohPindah(..., "tayang")`; `ohPindah` sendiri hanya menjaga pasangan status. Rute publik OH-05 wajib mengembalikan keluaran `profilPublik` (untuk anak: `{...baris, nama: baris.inisial}`), bukan baris D1 mentah, dan memanggil `ohDaftarPublik`/`ohByToken` dengan `sejak = kini - masa tayang`.
- **Pemilik**: meninjau tampilan.

## OH-08 Cabut, perpanjang, turun otomatis, cron

- **Tujuan**: K114 dan K115 ditegakkan.
- **Berkas**: `src/lapor_selamat.js` (`cariStatus`), `src/orang_hilang.js`, `src/lapor_ai.js` (cron menit 17), uji.
- **Di luar**: menayangkan.
- **Dependensi**: OH-07.
- **Pengerja**: `warga-api`. **Pemeriksa**: `security-reviewer`, `migrasi-idempoten` (bila ada kolom).
- **Langkah**: rute `saya/*` wajib sesi terbukti atau gateway WA (D28) dengan jalur cabut lewat petugas; satu fungsi `turunkan` dipakai tiga pemanggil; langkah cron anonim `oh_temu` (`ditutup_waktu`) dan hapus `oh_temu_foto`; sapuan menangkap `no such table`.
- **Bukti**: uji 2.6, 2.7, 2.8, 2.14, 2.14b, 2.14c, 2.20, 2.21, 2.22.
- **Pemilik**: tidak.

## OH-09 Rute publik dan tab publik (bendera mati)

- **Tujuan**: halaman tab "Orang hilang", kartu profil, tombol jalur di `/lapor`, rute `GET /api/lapor/hilang*` yang menjawab 404 saat bendera mati.
- **Berkas**: `src/orang_hilang.js` (rute publik, `LIMIT 20` kursor, D30), `src/gerbang_halaman.js` (halaman `/lapor/h/<token>` berkunci jalur tetap, tidak masuk statistik hit), `src/peta_situs.js` (hanya `/lapor/hilang`), `public/lapor/hilang.js|css|html`, `public/lapor/index.html` (kartu jalur), `scripts/lapor/lokal.mjs`.
- **Di luar**: menyalakan bendera; gambar OG berfoto.
- **Dependensi**: OH-07, OH-08.
- **Pengerja**: `layar-peta`, `warga-api`. **Pemeriksa**: `selera-angka`, `inp-reviewer`, `security-reviewer`.
- **Langkah**: komponen `DESIGN-SYSTEM.md`; teks lewat skill `bahasa-indonesia-plain`; kode klien ke skill `modern-web-guidance` dahulu; tombol Setuju dan Tidak setuju sama bobot.
- **Bukti**: uji 2.1 sampai 2.3b, uji peramban bagian 5; tinjau di `http://localhost:8800/lapor/` dengan bendera hidup hanya di server lokal.
- **Pemilik**: meninjau.

## OH-10 Jalur menemukan orang (tanpa tayang)

- **Tujuan**: ALUR 3 (K110), data masuk `oh_temu`, saran cocok untuk petugas (ALGORITMA 6).
- **Berkas**: `src/lapor_mesin.js` (`temu_*`), `src/orang_hilang.js`, `public/lapor/meja_cari.js`, uji.
- **Di luar**: tayang publik (OH-13).
- **Dependensi**: OH-07.
- **Pengerja**: `warga-api`, `layar-peta`. **Pemeriksa**: `security-reviewer`, `validasi-model` (kejujuran saran).
- **Langkah**: kondisi tidak sadar menampilkan 112 dulu; foto hanya bila orang itu atau wali setuju; penemu tidak melihat profil hilang (Q10).
- **Bukti**: uji mesin 3, uji 1.9.
- **Pemilik**: tidak.

## OH-11 Informasi, laporkan, protokol penyalahgunaan

- **Tujuan**: tombol "Saya punya informasi" dan "Laporkan profil ini", antrean `oh_info`, panduan petugas untuk orang yang tidak ingin ditemukan (D19, Q15).
- **Berkas**: `src/orang_hilang.js`, `public/lapor/hilang.js`, `public/lapor/meja_cari.js`, `docs/centurisk97/panduan/lapor/`.
- **Di luar**: menampilkan nomor layanan rujukan sebelum pemilik memeriksanya.
- **Dependensi**: OH-09.
- **Pengerja**: `warga-api`, `layar-peta`. **Pemeriksa**: `security-reviewer`, `guard-api`.
- **Langkah**: sesi `/masuk` wajib untuk informasi dan laporkan; ambang turun otomatis 3 pelapor berbeda 24 jam (HIPOTESIS); penanda "mungkin tidak ingin ditemukan" dipasang pihak ketiga atau petugas (D19); tombol "Saya orang ini" tanpa sesi (D35); nomor pemberi hanya petugas.
- **Bukti**: uji 2.9, 2.10, 2.18, 2.19, 2.23.
- **Pemilik**: memeriksa nomor dan lembaga rujukan (Q15) sebelum dipasang (menahan tayang, bukan kode); tiket tetap bisa selesai tanpa itu dengan teks umum "hubungi 112 dan kepolisian".

## OH-12 Menyalakan `OH_PUBLIK` (tertahan)

- **Tujuan**: tayang publik pertama.
- **Berkas**: `wrangler*.jsonc` (`OH_PUBLIK = "1"`), checklist di folder ini.
- **Di luar**: foto penanya.
- **Dependensi**: OH-09, OH-11, OH-16; jawaban semua Q tayang (Q1 sampai Q8, Q13 untuk K105, Q15 sampai Q18, Q20 sampai Q25); **tinjauan pengacara wajib**: (a) teks persetujuan dan dasar hukum (Q18), (b) transfer foto ke Claude API yang **sudah berjalan lewat K105** (D33, Q13); migrasi di produksi.
- **Pengerja**: `mekanik-mesin` (hanya konfigurasi, tanpa deploy dari agent), sesi induk. **Pemeriksa**: `security-reviewer`.
- **Langkah**: pemilik menjawab Q; pemilik meninjau di lokal; pemilik menerapkan migrasi dan menyalakan bendera; uji manual bagian 7.
- **Urutan migrasi dan bendera (wajib)**: pemilik menerapkan 0188 dan 0190 ke D1 produksi LEBIH DULU, baru menyalakan `OH_TULIS = "1"` (bawaan "0" di kedua wrangler; tanpa itu kiriman cari orang tidak menulis `oh_publik`), baru `OH_PUBLIK`.
- **Bukti**: lembar manual bertanda pemilik; respons publik diperiksa dengan data uji sintetis.
- **Pemilik**: ya, penuh.

## OH-13 Daftar publik "Ditemukan, mencari keluarga" (tertahan)

- **Tujuan**: Q9 bila pemilik mengiyakan.
- **Dependensi**: OH-12 dan jawaban Q9; tinjauan hukum.
- **Pengerja**: `warga-api`, `layar-peta`. **Pemeriksa**: `security-reviewer`, `selera-angka`.
- **Langkah**: hanya dewasa sadar yang setuju dan dicatat petugas; bidang foto, panggilan, kecamatan penemuan, nomor tiket.
- **Bukti**: uji rute untuk anak, tidak sadar, tanpa setuju tidak pernah tampil.
- **Pemilik**: ya.

## OH-14 Lab pembanding foto

- **Tujuan**: menyusun `src/orang_hilang_foto.js` dengan model tiruan (siap) dan menjalankan lab mutu dengan model sungguhan (tertahan, Q11 dan Q12 dan izin memakai kunci API serta set foto sintetis atau relawan).
- **Berkas**: `src/orang_hilang_foto.js`, `tests/lapor/hilang_foto.test.mjs`, `scripts/lapor/hilang_lab.mjs` (di luar produksi), hasil di RISET.
- **Di luar**: menyalakan `OH_FOTO`; foto nyata laporan.
- **Dependensi**: OH-09; kriteria RENCANA-UJI 4 dikunci.
- **Pengerja**: `warga-api`. **Pemeriksa**: `validasi-model`, `security-reviewer`.
- **Langkah**: bagian tiruan dahulu (uji 4.1 sampai 4.5 dan 4.5b penghenti anak); lab mutu 4.6 dan 4.7 hanya sesudah pemilik menyetujui set dan kriteria.
- **Bukti**: uji 4.1 sampai 4.5 hijau; laporan lab di RISET berlabel hipotesis.
- **Pemilik**: ya untuk lab sungguhan.

## OH-15 DPIA, tinjauan hukum, menyalakan `OH_FOTO` (tertahan)

- **Tujuan**: syarat KEAMANAN 5 dipenuhi; kartu jalur C tampil.
- **Dependensi**: OH-12, OH-14; Q13, Q14.
- **Pengerja**: sesi induk, pemilik (hukum dan kontrak). **Pemeriksa**: `security-reviewer`.
- **Langkah**: DPIA tertulis di folder ini; konfirmasi retensi penyedia tertulis; teks layar untuk pemberitahuan ke penanya; nyalakan bendera.
- **Bukti**: dokumen DPIA ada; uji 4.x hijau pada konfigurasi akhir.
- **Pemilik**: ya, penuh.

## OH-16 Gerbang

- **Tujuan**: RENCANA-UJI bagian 6.
- **Berkas**: `tests/agen/gerbang-orang-hilang.test.mjs`.
- **Di luar**: melemahkan gerbang lain.
- **Dependensi**: OH-09.
- **Pengerja**: `penulis-gerbang`. **Pemeriksa**: pemeriksa bersih.
- **Bukti**: `npm run uji:agen` hijau.
- **Pemilik**: tidak.

## OH-17 Dokumentasi

- **Tujuan**: Panduan pengguna dan petugas, halaman Pengembang di `/docs`.
- **Berkas**: `docs/centurisk97/panduan/lapor/09-orang-hilang.md`, `docs/centurisk97/pengembang/lapor/12-orang-hilang.md`, `docs/centurisk97/peta.json` (daftarkan dua halaman baru).
- **Di luar**: nama berkas atau kode di Panduan; angka tanpa rujukan kode.
- **Dependensi**: OH-09.
- **Pengerja**: `docs-situs`. **Pemeriksa**: `selera-angka`.
- **Bukti**: `python3 -I scripts/docs/bangun.py --cek` hijau.
- **Pemilik**: tidak.

## OH-18 Metrik petugas

- **Tujuan**: antrean tinjau, umur antrean, tayang aktif, turun per alasan, dihitung dari tabel; "belum terukur" bila kosong.
- **Berkas**: `src/orang_hilang.js`, `public/lapor/meja_cari.js`.
- **Dependensi**: OH-07.
- **Pengerja**: `warga-api`. **Pemeriksa**: `selera-angka`.
- **Bukti**: uji rute metrik; tidak ada angka "tingkat keberhasilan".
- **Pemilik**: tidak.

## OH-19 Uji perangkat nyata dan penutupan

- **Tujuan**: lembar manual (RENCANA-UJI 7) ditutup pemilik; paragraf privasi masuk kebijakan privasi `/lapor`.
- **Dependensi**: OH-12.
- **Pengerja**: sesi induk, pemilik. **Pemeriksa**: tidak ada.
- **Bukti**: lembar hasil bertanda pemilik.
- **Pemilik**: ya.

## Urutan dan siapa yang menunggu

1. Tanpa jawaban pemilik dikerjakan berurutan: OH-00 sampai OH-11, OH-16, OH-17, OH-18, dan bagian tiruan OH-14. Semua di belakang bendera mati; **tidak ada yang tayang publik**.
2. OH-12 menunggu jawaban semua Q tayang (Q1 sampai Q8, Q13 untuk K105, Q15 sampai Q18, Q20 sampai Q25), tinjauan pengacara, dan migrasi produksi; pemilik menyalakan.
3. OH-13 menunggu Q9. OH-15 menunggu Q13 dan Q14 serta DPIA. Fitur foto tidak menyala sebelum itu; kartu jalur C disembunyikan.
4. Perubahan perilaku halaman `/lapor` menaikkan versi aset (`?v=`) dan `VERSI` service worker.
5. Tiket layar ditutup dengan tautan tinjau lokal (AGENTS 3.8).
