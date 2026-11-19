# TIKET: Lapor Bencana BNPB

Ambil tiket berurutan; kerjakan hanya cakupannya. Tiap tiket ditutup dengan bukti di `RENCANA-UJI.md`.

| Tiket | Isi | Pengerja | Pemeriksa | Tergantung |
| --- | --- | --- | --- | --- |
| LA-00 | Agent `lapor-ai` di roster, ilmu awal, baris AGENTS 2.30 sudah ada | sesi induk | `penulis-gerbang` | paket diperiksa |
| LA-01 | `scripts/lapor/spek.py` dan `src/lapor_spek.generated.js` dari Lampiran I dan III; pertanyaan templat tiap isian | `lapor-ai` | `selera-angka` | LA-00 |
| LA-02 | `src/lapor_mesin.js` murni: identitas (A7), perintah, validasi kutipan, gabung, isian berikutnya (A2), balasan templat, transisi tiket (A8), perintah `ulang`, `hapus data`, `update LA-...`, penguraian tanggal, pencocokan nama desa ke `desa_cari.json`; uji bagian 1 | `warga-api` | pemeriksa bersih | LA-01 |
| LA-03 | `src/lapor_model.js`; `scripts/wa/claude.mjs` mengimpor `src/samarkan.js` dan salinannya dihapus (uji bot laporan tetap hijau); uji emas rekaman (bagian 2) | `warga-api` | `security-reviewer` | LA-02 |
| LA-04 | Migrasi 0155, `src/lapor_ai.js` rute pesan, sesi, izin, kirim (batch), batas laju; uji rute | `warga-api` | `migrasi-idempoten`, `guard-api` | LA-02 |
| LA-05 | Pisah `periksaFotoLokasi` dari `src/foto.js`; rute foto lapor (web, tautan, WA) dengan lencana D16; R2 `lapor/` | `warga-api` | `security-reviewer` | LA-04 |
| LA-06 | Gateway: arah nomor izin lapor, teruskan teks, lokasi, foto WA; perintah PEMILIK `lapor izin`/`lapor cabut`; kirim kabar status | `wa-bot` | pemeriksa bersih | LA-04 |
| LA-07 | Halaman `/lapor` chat web mobile dan layar lebar, panel isian, lokasi, foto, ringkasan, kirim | `layar-peta` | `inp-reviewer`, `selera-angka` | LA-04, LA-05 |
| LA-08 | Halaman `/lapor/foto` kamera bertoken | `layar-peta` | `security-reviewer` | LA-05 |
| LA-09 | Halaman laporan `/lapor/l/<nomor>` dan tampilan cetak; `scripts/wa/lapor_pdf.mjs` antrean PDF dan kirim ke WA | `layar-peta`, `wa-bot` | `selera-angka` | LA-04, LA-06 |
| LA-10 | `/lapor/meja`: tab Peta, Daftar, Foto, rincian, ubah status, konfirmasi BPBD; rute monitoring | `layar-peta`, `warga-api` | `inp-reviewer`, `guard-api` | LA-04, LA-05 |
| LA-11 | Uji emas dengan model nyata; uji lapangan F0 dibuka untuk pengguna uji pertama (pemilik mengetik `lapor izin`) | sesi induk | `validasi-model` | LA-01..LA-10 |
| LA-12 | (F1) sumber `lapor_ai` di `pasang.py`; dorong laporan `bpbd` ke meja `dampak` | `siklus`, `warga-api` | pemeriksa bersih | Q3, Q5 |
| LA-13 | (F1) minta verifikasi dua arah | `warga-api`, `layar-peta` | `security-reviewer` | Q5, Q8 |

Prasyarat dari pemilik sebelum LA-11: terapkan migrasi 0155 ke produksi, pasang secret `ANTHROPIC_API_KEY` di Worker (Q2), kirim `lapor izin <nomor uji>` dari WA.

## Sudah dibangun di server lokal (19 Nov 2026, belum Worker dan D1)

Mesin percakapan (`src/lapor_mesin.js`), spek isian berdefinisi juklak (`src/lapor_spek.js`), wilayah dari GPS dan pencarian (`src/lapor_wilayah.js`), model Claude (`src/lapor_model.js`), server lokal di tinjau 8800 (`scripts/lapor/lokal.mjs`), PDF dan Word gaya Koordalops (`scripts/lapor/dokumen.py`), layar `/lapor` (beranda, laporan, bantuan, chat berkartu, info daerah, prediksi, nomor penting, privasi), halaman lacak (`/lapor/lacak.html`), maskot (`public/lapor/maskot.js`).

## Antrean dari masukan pemilik 19 Nov 2026 (belum dikerjakan)

| Tiket | Isi |
| --- | --- |
| LA-14 | Baca Kajian Penentuan Kejadian Bencana dan Lampirannya (K25), samakan spek isian, kelas mayor dan minor, dan bentuk laporan jadi dengannya |
| LA-15 | Layar monitoring petugas `/lapor/meja`: daftar, peta, foto, balas, status tiket, hubungi pelapor (rute lokal sudah ada) |
| LA-16 | Lampiran dokumen dan foto kapan saja di chat; menu titik tiga (cari percakapan, lihat lampiran, unduh transkrip) |
| LA-17 | Alun-alun warga (K30), menunggu Q14 |
| LA-18 | Pencarian nama jalan (K29), menunggu Q15 |
| LA-19 | Mode Tanya bebas dengan jawaban bersumber (pola ChatHPT), Riwayat, Jelajah, Tentang |
| LA-20 | Pintu WA: sambungkan gateway ke mesin yang sama (LA-06), teks bernomor, foto dan lokasi WA |
| LA-21 | Damkar per daerah: belum ada datanya di repo; sementara 113 |

---

## Lanjutan 19 Nov 2026: tiket LA-22 sampai LA-55

Ambil berurutan menurut kolom Tergantung; kerjakan hanya cakupannya; tutup dengan bukti di `RENCANA-UJI.md` bagian yang disebut. Tiap tiket layar menutup laporannya dengan tautan `http://localhost:8800/...`. LA-13 (verifikasi) dan LA-19 (Mode Tanya) di tabel lama diganti oleh tiket di bawah (LA-13 menjadi LA-22 dan LA-23; LA-19 menjadi LA-30 dan LA-31); LA-12 tetap untuk sumber `lapor_ai` dan digabung dengan LA-25. Meja dan `public/lapor/meja.js` sedang disunting sesi lain: sebelum menyentuhnya, baca keadaan berkas pada hari itu dan ikuti pola `public/bnpb/dalops*.js`. Migrasi diterapkan ke produksi oleh pemilik; tiket yang menyentuh produksi menyebut prasyarat.

| Tiket | Fitur | Isi | Pengerja | Pemeriksa | Tergantung | Q yang harus dijawab dulu |
| --- | --- | --- | --- | --- | --- | --- |
| LA-22 | 1 Verifikasi | Migrasi 0156 bagian verifikasi (`lapor_kontak_bpbd`, `lapor_tautan`, `lapor_verif`, `lapor_verif_jawab`); rute minta, jawab, kontak; perintah WA `lapor kontak`; uji bagian 6 | `warga-api` | `migrasi-idempoten`, `guard-api`, `security-reviewer` | LA-04, LA-10 | Q8, Q16 (F0 cukup bawaan) |
| LA-23 | 1 Verifikasi | Halaman `/lapor/v/<token>`, tombol Minta verifikasi di rincian meja, hasil di rincian dan PDF, pesan L-VERIF-* | `layar-peta`, `wa-bot` | `inp-reviewer`, `selera-angka` | LA-22 | Q17 |
| LA-24 | 3 Gugus | `src/lapor_gugus.js` murni, tabel gugus di 0156, hitung sesudah kirim, rute `meja/gugus`; uji bagian 7 | `warga-api` | pemeriksa bersih, `validasi-model` | LA-04 | Q18 (bawaan boleh untuk uji) |
| LA-25 | 3 Gugus | Kartu gugus di meja (peta dan Daftar); sumber `lapor_ai` di `pasang.py` dan uji; menempel saja | `layar-peta`, `siklus` | pemeriksa bersih | LA-24, LA-12 | Q19 (Buku Besar F1) |
| LA-26 | 5 Susulan | Jalur susulan di mesin (A12), `lapor_susulan`, PDF versi baru, penanda; uji bagian 9 | `warga-api` | pemeriksa bersih | LA-04, LA-09 | Q26 |
| LA-27 | 5 Susulan | Tombol Tambah kabar di web, pesan L-SUSULAN-*, ringkasan perubahan | `layar-peta`, `wa-bot` | `selera-angka` | LA-26 | |
| LA-28 | 6 Foto saja | Sesi dari foto tanpa teks, foto ditahan sampai identitas, pesan L-FOTO-SAJA; uji bagian 10 (foto) | `warga-api`, `wa-bot` | `security-reviewer` | LA-05, LA-06 | |
| LA-29 | 6 Suara | `scripts/wa/lapor_suara.mjs`, `lapor_suara`, konfirmasi transkrip, hapus audio; pasang biner transkripsi (pemilik); uji mutu 20 rekaman | `wa-bot`, `warga-api` | `security-reviewer`, `validasi-model` | LA-06, LA-02 | Q25 |
| LA-30 | 4 Mode Tanya | `src/lapor_tanya.js` murni, uji bagian 8, `lapor_tanya_log`, rute `tanya`; periksa `edukasi.json` | `warga-api` | `selera-angka`, pemeriksa bersih | LA-04 | Q23, Q24 |
| LA-31 | 4 Mode Tanya | Tab Tanya di web, menu tanya di WA, pengalihan ke Info daerah dan Prediksi | `layar-peta`, `wa-bot` | `inp-reviewer`, `selera-angka` | LA-30 | Q23 (tinjauan Direktorat Kesiapsiagaan sebelum publik) |
| LA-32 | 2 Kabar balik | Persetujuan dikabari, `lapor_langganan`, `berhenti kabar`, hapus data; pesan L-SETUJU-KABAR | `warga-api`, `wa-bot` | `security-reviewer` | LA-04 | Q20 |
| LA-33 | 2 Kabar balik | Kabar gugus: pratinjau dan persetujuan staf, antrean kabar, `lapor_kabar*`; uji bagian 11 | `warga-api`, `layar-peta` | `security-reviewer`, `guard-api` | LA-24, LA-32 | Q22, Q5 |
| LA-34 | 2 Kabar balik | `src/lapor_kabar.js`, `lapor_peringatan.mjs`, feed BMKG, pencocokan poligon, batas kirim | `wa-bot`, `warga-api` | `security-reviewer`, `validasi-model` | LA-32 | Q21, Q27, Q7 |
| LA-35 | 7 Luring | `public/sw-lapor.js`, saluran `lapor` antre.js, Laporan cepat, pita; uji bagian 12 (klien) | `layar-peta` | `inp-reviewer`, `security-reviewer` | LA-07 | Q28 |
| LA-36 | 7 Luring | Rute `luring`, `lapor_luring`, `lapor_foto_luring`, A13; uji bagian 12 (server) | `warga-api` | `guard-api`, `migrasi-idempoten` | LA-35, LA-26 | Q28 |
| LA-37 | 8 Penilaian foto | Migrasi 0157 bagian foto, `lapor_foto_nilai.mjs`, dHash, buram, lama, mirip; lencana di galeri meja; uji bagian 13 | `wa-bot`, `warga-api`, `layar-peta` | `security-reviewer`, `validasi-model` | LA-05, LA-10 | Q29 (ambang) |
| LA-38 | 8 Penilaian foto | Relevansi AI dan pencarian balik; hanya dibangun bila pemilik menjawab ya; tertahan | `warga-api` | `security-reviewer` | LA-37 | Q4 dan Q29 harus ya |
| LA-39 | 9 Ringkasan harian | `lapor_ringkasan`, A15, timer 06.05, tab Ringkasan, salinan ke PEMILIK; uji bagian 14 | `warga-api`, `wa-bot`, `layar-peta` | `selera-angka`, pemeriksa bersih | LA-10 | Q30 |
| LA-40 | 10 Penugasan | `lapor_tugas*`, `src/lapor_tugas.js`, rute tugas, pengingat, tab Tugas; uji bagian 15 | `warga-api`, `wa-bot` | `guard-api`, `migrasi-idempoten` | LA-10, LA-22 | Q31 |
| LA-41 | 10 Penugasan | Kolom Tenggat merah, filter Lewat tenggat, tugas ke BPBD lewat tautan (F1) | `layar-peta` | `inp-reviewer` | LA-40 | Q16, Q31 |
| LA-42 | 11 Sinyal awal | Rute `meja/sinyal`, `sinyal_peta.js`, lapisan staf di peta utama; uji bagian 16 | `layar-peta`, `warga-api` | `inp-reviewer`, `guard-api` | LA-24 | |
| LA-43 | 11 Pembanding | Rute `meja/pembanding`, `public/prediksi/lapor_pembanding.js` di tab Rapor; A19 | `prediksi`, `warga-api` | `validasi-model`, `selera-angka` | LA-42 | Q32 |
| LA-44 | 12 LogPal | `lapor_logpal_draf`, `src/logpal_lapor.js`, `public/logpal/lapor_draf.js`, pemetaan A20; uji bagian 17 | `warga-api` | `guard-api`, `migrasi-idempoten`, `security-reviewer` | LA-22 | Q33 (dan jangan menjawab LogPal Q2, Q4, Q13) |
| LA-45 | Meja M7 | Penanda dilihat (baris riwayat), `dilihat_pada` dan `ditindak_pada`, kolom waktu tanggap dan panel median | `layar-peta`, `warga-api` | `selera-angka` | LA-10 | Q37, Q39 |
| LA-46 | Meja M1, M4 | Kelompok titik, panel kab terbanyak dan terbang ke kab | `layar-peta` | `inp-reviewer` | LA-10 | |
| LA-47 | Meja M2, M3 | Lapisan konteks (BMKG, titik panas, prediksi besok, batas), tanda prediksi, linimasa | `layar-peta` | `inp-reviewer`, `validasi-model` | LA-46 | Q35 |
| LA-48 | Meja M5 | Penanda perhatian, urutan Perhatian, chip | `layar-peta` | `selera-angka` | LA-45 | Q34 |
| LA-49 | Meja M6 | Rute `massal`, `lapor_ganda`, bilah aksi, hasil per laporan; teruskan (F1) | `warga-api`, `layar-peta` | `guard-api`, `inp-reviewer` | LA-40, LA-48 | Q38 (teruskan) |
| LA-50 | Meja M7 | Merah lewat tenggat di Daftar, Peta, dan layar besar | `layar-peta` | `inp-reviewer` | LA-41, LA-45 | |
| LA-51 | Meja M9 | Mode layar besar, jajak 30 detik, penanda basi, sesi berakhir | `layar-peta` | `inp-reviewer`, `selera-angka` | LA-46, LA-48, LA-50 | |
| LA-52 | Meja M10 | Ekspor Excel, CSV, PDF dari data tersaring (pakai `public/bnpb/dalops_hitung.js` dan `/vendor/jspdf`) | `layar-peta` | `selera-angka`, `ruang-bnpb` | LA-48 | Q36 |
| LA-53 | Tutup | Uji emas gabungan semua jalur baru dengan model nyata; uji lapangan F0 tambahan; metrik bagian 19 | sesi induk | `validasi-model` | LA-22..LA-52 | |
| LA-54 | Tutup | Layar: semua halaman baru masuk daftar gerbang kartu, token warna, tanpa kesimpulan, kartu tidak menempel; tinjau 360, 1440, 1920 px | `layar-peta` | `selera-angka`, `inp-reviewer` | tiket layar | |
| LA-55 | Tutup | Agent `lapor-ai`: ilmu dan Kasus untuk fitur lanjutan; `ilmu.mjs kasus` | sesi induk | `penulis-gerbang` | LA-53 | |

### Urutan kerja yang disarankan (tanpa menunggu Q)

1. Tidak butuh jawaban pemilik: LA-26, LA-27 (susulan), LA-28 (foto saja), LA-24, LA-25 tanpa Buku Besar (gugus), LA-35, LA-36 (luring), LA-45, LA-46, LA-47, LA-48, LA-52 (Meja, dengan bawaan), LA-42, LA-39.
2. Menunggu satu jawaban kecil: LA-30 dan LA-31 (Q23), LA-32 sampai LA-34 (Q20, Q21, Q22, Q27), LA-29 (Q25 dan pemasangan biner), LA-37 (Q29 ambang), LA-40, LA-41 (Q31), LA-43 (Q32).
3. Menunggu keputusan besar: LA-22 dan LA-23 penuh pada F1 (Q8, Q16), LA-38 (Q4), LA-44 (Q33 dan LogPal Q2), LA-49 teruskan (Q5, Q38).

### Pelaksanaan K55 (19 Nov 2026)

| Tiket | Isi | Pengerja | Status |
| --- | --- | --- | --- |
| LA-24a | `src/lapor_gugus.js` murni + uji, gugus di jawaban meja lokal (D71) | sesi induk | selesai lokal; rute Worker menyusul di LA-24 |
| LA-25a | Chip gugus, saring Bergugus, kartu gugus rincian (D71) | sesi induk | selesai lokal; Buku Besar tetap LA-25 (F1) |
| LA-49a | Kartu Teruskan ke BPBD di rincian, kirim WA oleh staf, tandai diteruskan (D72) | sesi induk | selesai lokal; otomatis tetap LA-49 (F1) |
| LA-56 | Batas waktu respons per status: warna lewat batas dan hitungan di Antrean kerja | `layar-peta` | menunggu Q40 |
