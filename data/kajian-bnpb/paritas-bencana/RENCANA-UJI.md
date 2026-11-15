# RENCANA-UJI: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md`. Standar pemilik `~/.claude/TEST.md`: perilaku di luar TypeScript (trigger, CHECK, UNIQUE, rute Worker, R2, fungsi SQL, alur lintas tabel, workflow) wajib punya uji yang benar-benar menjalankannya, bukan mock. Tiket (`TIKET.md`) selesai bila semua kriteria terimanya hijau, gerbang yang disebut sudah diperbarui di commit yang sama, dan untuk tiket layar pemilik sudah meninjau di `http://localhost:8800/<jalur>` (K9). Tinjau lokal: tulisan lewat server itu mengenai produksi, jadi uji tulis berjalan otomatis di D1 lokal (Miniflare), dan pemilik masuk sendiri lewat `/admin/masuk`; Claude tidak mengetik sandi produksi.

## 1. Perintah bukti baku

| Perintah | Dipakai untuk | Catatan |
| -------- | ------------- | ------- |
| `node --test tests/warga/<berkas>.test.mjs` | rute Worker, hak, migrasi, versi, R2 | Miniflare dengan D1 sungguhan lewat `tests/warga/_bnpb.mjs` (`siapkan`, `berantai`, `MOD2`, `GERBANG`); pola `tests/warga/operasi_isian.test.mjs`; `import "../../src/worker.js"` dulu |
| `node --test tests/warga/pb_skema.test.mjs` | migrasi 0130, 0131, D13 (`peringatan_x`) | `node:sqlite` lewat `migrasi()` dan `pecah()` di `tests/warga/_bantu.mjs`; jalan dua kali, CHECK menolak nilai di luar daftar |
| `python3 -I scripts/umum/<nama>.py uji` | skrip Python bersama | `-I` agar tidak memuat modul dari direktori kerja; keluar bukan nol bila gagal |
| `node --test tests/agen/<gerbang>.test.mjs` atau `npm run uji:agen` | gerbang | seluruh `tests/agen/*.test.mjs` |
| `npm run uji:warga` | semua uji Worker | `--test-concurrency=1` |
| `npm run uji:banjir`, `uji:prediksi`, `uji:udara`, `uji:siklus`, `uji:sippa`, `uji:wa` | uji per modul | sesuai modul yang disentuh tiket |
| `npm run uji:layar` | uji layar `tests/bnpb/*.test.mjs` | tidak ikut `npm run uji`; tiket layar menjalankannya sendiri |
| `node --test tests/layar/<berkas>.test.mjs` | uji layar `public/inti/**` | berkas baru paket ini; pola `tests/layar/operasi_base.test.mjs` |
| `npm run uji` | seluruh rangkaian | dijalankan sebelum push (hook pre-push, `npm run dorong`) |
| `node scripts/agents/paritas.mjs` | hitungan ADA, SEBAGIAN, BELUM | PB-01; keluaran `public/data/paritas.json` |

Pemeriksa bersih (AGENTS.md 3.2) memeriksa sinyal nyata: perintah di atas hijau pada commit yang diperiksa, bukan klaim "sudah beres".

## 2. Kriteria terima per fitur

Fitur PRD bagian 4. Satu fitur dapat dikerjakan beberapa tiket; fitur selesai bila semua tiketnya selesai.

| Fitur | Kriteria terima | Tiket | Bukti |
| ----- | --------------- | ----- | ----- |
| F-1 | Tugas longsor dan pesisir dapat dibuat dan dibaca; tugas dengan id jenis tak dikenal tidak diam-diam menjadi karhutla; `infoKluster` tetap `null` selain karhutla; teks karhutla identik dengan golden; tanpa tabel `tugas_bencana_x` karhutla dan tujuh jenis lama tetap jalan | PB-03, PB-05, PB-07, PB-18 | `pb_skema`, `pb_karhutla_tetap`, `operasi_lapangan` |
| F-2 | Titik sarana tersimpan per bencana dan wilayah; jenis di luar `SARANA` atau tidak berlaku untuk bencana itu ditolak 400 dengan daftar sah; tanpa kolom nama orang | PB-05, PB-10, PB-17 | `pb_titik`, `gerbang-paritas` |
| F-3 | Versi renlap berurut tanpa ganda walau dua permintaan bersamaan; `terbit` tidak dapat ditimpa; callback HMAC salah, waktu basi, atau status acak ditolak; lima format berkas terbaca bagi peran berhak; keluaran karhutla byte-identik sebelum dan sesudah ekstraksi; keluaran banjir identik dengan fixture lama | PB-12 sampai PB-15, PB-18 | `pb_renlap`, `renlap.py uji`, `operasi_lapangan` |
| F-4 | Staf berperan menulis untuk wilayahnya; akun instansi menulis hanya untuk `prov` dan kab hasil `kunci_wilayah`; akun gerbang 403; `oleh` bukan nama | PB-10, PB-11 | `pb_hak` |
| F-5 | Persen kepatuhan dihitung dari `pb_renlap_hasil`; alasan dari daftar tetap; tanpa dimensi per pengisi | PB-16, PB-18 | `pb_hasil` |
| F-6 | Daftar periksa regu ada untuk pesisir dan longsor dan memuat hanya butir bersumber; adaptor tugas menulis `tugas_longsor.json` dan `tugas_pesisir.json` berkontrak sama dengan `tugas_<id>.json` | PB-08, PB-09 | `pb_penugasan`, `tugas.py uji` |
| F-7 | Fasilitas sasaran (tempat evakuasi, faskes, sekolah, gudang, helipad, sumber air) tampil sebagai lapisan peta dan masuk target renlap | PB-10, PB-13, PB-17 | `pb_titik`, `renlap.py uji` |
| F-8 | Sitrep dirakit dari angka sistem; kalimat kebijakan hanya dari staf; beku tidak dapat ditimpa; versi baru = `versi + 1` | PB-22, PB-24 | `pb_dokumen` |
| F-9 | Renops mengikuti kerangka Perka 24/2010; butir [perlu cek] tampil "belum diisi", tidak diisi mesin | PB-22, PB-24 | `pb_dokumen` |
| F-10 | `laporan_kejadian.py` punya modul longsor, pesisir, gunung api, gempa lengkap; kolom tanpa data `null`, bukan 0 | PB-23 | `laporan_kejadian.py uji` |
| F-11 | Deck harian dan Penanganan per bencana lolos `aturan_slide.py` dan masuk folder `Revisi 3`; pemicu bot menyebut tiap bencana | PB-58, PB-59 | `aturan_slide.py`, `npm run uji:wa` |
| F-12 | Kejadian berawalan B, C, D, E, P, U, V masuk Buku Besar Kejadian; tidak ada tabel buku kejadian baru | PB-25 | `npm run uji:siklus` |
| F-13 | Tiap `ringkas/<id>.json` memuat blok `laporan_berkala` bernama stabil (atau ditunda dan tercatat bila nama kunci belum ada) | PB-19 | `pb_ringkas.py uji` |
| F-14 | Penilai jenis baru membaca berkas data sampai baris `peringatan` dan keluaran CAP 1.2 sah (waktu `+00:00`); data basi tidak memicu; level turun tidak memicu; dua putaran data sama menulis satu baris; kenaikan menulis baris kedua | PB-21, PB-26, PB-34a, PB-36a, PB-38a, PB-40, PB-46a | `ews.test.mjs`, `peringatan.test.mjs` |
| F-15 | Tiap bencana dan tingkat 1 sampai 3 menghasilkan tindakan tidak kosong (tsunami tanpa tingkat 1 dikecualikan); butir dicatat dengan pelaksana dan batas; warga tidak menulis | PB-27 | `pb_tindakan` |
| F-16 | Jenis udara, gunung api, pesisir muncul di saringan dan kartu Dalops; tanpa rute dan tabel baru | PB-36b, PB-38b, PB-46b | `dalops.test.mjs` |
| F-17 | Ambang baru hanya setelah naskah penerbit dibaca; selain itu ambang kode dipakai dan label "perlu cek" tampil | PB-60 | `tangga.test.mjs` |
| F-18 | Layar pimpinan lolos gerbang dasbor, kartu, kesimpulan; saringan jenis jamak tidak membangun ulang layar | PB-30, PB-31 | `gerbang-dasbor`, `pb_pimpinan` |
| F-19 | Muatan ringkas per jenis paling besar 100 KB, nilai tak diketahui `null`, antarsumber tidak dijumlah | PB-19, PB-30 | `pb_ringkas.py uji`, `gerbang-paritas` |
| F-20 | `sisa_hari`, `akan_berakhir` (7 hari), `tanpa_tanggal_selesai`; SK provinsi mengalahkan kabupaten; kueri SEARCH | PB-28, PB-29 | `pb_papan_sk` |
| F-21 | Rupiah hanya bila koefisien bersumber; tanpa sumber `null` dan kartu menulis "koefisien tidak tersedia" | PB-55 | `ekonomi.py uji` |
| F-22 | Hanya butir [repo] dan [korpus] dengan `dasar` | PB-56 | `pencegahan.py uji` |
| F-23 | Wilayah dengan dua komponen kosong tidak diberi skor; label hipotesis | PB-57 | `prioritas.py uji` |
| F-24 | AUC di atas klimatologi dan POD tidak di bawah persistensi pada periode uji, atau pil hipotesis tetap; keputusan tidak memakai skor hipotesis | PB-49, PB-50 | uji balik, `validasi-model` |
| F-25 | Kartu prospektif memuat vonis, n, tanggal; n di bawah 30 = "belum teruji" tanpa angka performa | PB-51 | `npm run uji:prediksi` |
| F-26 | Sepuluh kasus teratas per jenis; kolom tanpa arsip "tidak ada arsip" | PB-52 | `npm run uji:siklus` |
| F-27 | Tren hanya dengan 60 bulan atau lebih; tooltip interaktif | PB-53 | `pb_tren` |
| F-28 | Halaman metode dan cerita per bencana | PB-54a, PB-54b | `pb_cerita` |
| F-29 | Tiap data Dipakai punya skrip ber-`uji` dan langkah workflow | PB-61 | `<nama>.py uji` |
| F-30 | Skrip ber-`uji` di `scripts/umum` ikut CI; status segar, basi, mati sesuai ALGORITMA 7.1 | PB-62, PB-63 | `gerbang-uji-skrip` |
| F-31 | Layar dan peringatan dua bahasa | PB-64 | `pb_i18n` |
| F-32 | Tanpa gulir horizontal di 375 px; halaman kredit ada | PB-65 | ukur peramban |
| F-33 | Sisa temuan rusak audit nol | PB-66 | `npm run uji:agen` |

## 3. Kriteria terima per tiket

### 3.1 Fase F1

| Tiket | Kriteria terima | Perintah bukti |
| ----- | --------------- | -------------- |
| PB-01 | Hitungan per bencana mengikuti ALGORITMA 8.2: TIDAK BERLAKU tidak masuk jumlah; baris G02, G03, G10 di gempa, cuaca, udara masih TIDAK BERLAKU ditolak; status ADA tanpa berkas bukti yang ada diturunkan ke SEBAGIAN dan dilaporkan; ADA karhutla atau banjir turun dari acuan membuat skrip gagal; hitungan di dokumen audit sama dengan keluaran skrip; `paritas.json` kecil dan tanpa data operasi | `node --test tests/agen/paritas-hitung.test.mjs`, `node scripts/agents/paritas.mjs` |
| PB-02 | Panel kiri `DasborA` dapat ditarik 200 sampai 320 px dengan pegangan, lebar tersimpan di `localStorage` dalam try dan catch, layar tetap benar tanpa penyimpanan; di bawah 900 px pegangan tidak muncul; seluruh layar model A ikut tanpa menyunting masing-masing; tarik tidak membekukan layar (INP) | `node --test tests/layar/dasbor_tarik.test.mjs tests/agen/gerbang-dasbor.test.mjs`; tinjau `http://localhost:8800/bnpb/sitrep` |
| PB-03 | Golden dibuat dari kode SEBELUM refaktor dan di-commit lebih awal; menguji keluaran rute `RUTE_OPS` (kolom `awal` periode yang berasal dari `awalPeriode`, kluster yang berasal dari `infoKluster`, penyusun riwayat) lewat Worker nyata Miniflare, karena `awalPeriode` dan `infoKluster` tidak diekspor dan src tidak disentuh, dengan fixture dari `operasi_lapangan.test.mjs`; hijau tanpa menyunting `operasi_lapangan.test.mjs` dan `operasi_udara.test.mjs` | `node --test tests/warga/pb_karhutla_tetap.test.mjs tests/warga/operasi_lapangan.test.mjs tests/warga/operasi_udara.test.mjs` |
| PB-04 | `bencana.py periksa` menolak `sarana` bukan anggota `SARANA`, `dokumen` bukan anggota daftar jenis dokumen, `bobot` tanpa kunci di `bobot_renlap.json`, `ews.kunci` tanpa aturan di `src/ews.js`; `src/bencana.generated.js` basi ditolak gerbang; kunci tak ada berarti `false`; `JENIS_LOGBOOK_KE_BENCANA` memetakan `gelombang_pasang` dan `abrasi` ke `pesisir` | `python3 -I scripts/umum/bencana.py uji`, `node --test tests/agen/gerbang-bencana.test.mjs` |
| PB-05 | Migrasi jalan dua kali tanpa galat; CHECK menolak jenis, bencana, status di luar daftar, `lat` dan `lon` di luar bbox, `kab` bukan 0 atau 4 karakter, `tanggal` bukan `YYYY-MM-DD`; `tugas_bencana_x` menolak `karhutla`; `UNIQUE (bencana, prov, kab, tanggal, versi)` menolak ganda; `pb_renlap_hasil` mengikuti FK; `pb_log` menolak JSON tidak sah dan lebih dari 8192; tabel masuk `tests/warga/cakupan.json`; hash masuk `migrasi_beku.json` sesudah pemilik menerapkan | `node --test tests/warga/pb_skema.test.mjs tests/warga/migrasi_beku.test.mjs` |
| PB-06 | Gerbang merah bila: kolom bernama `nama_kru`, `pelapor`, `korban`, `no_hp`, `wa`, `nik`, `email` di skema `pb_*`; kode paket menulis ke `public/` di luar `public/data/{ringkas,ekonomi,pencegahan,prioritas}/`; kunci JSON `nama_kru`, `pelapor`, `no_hp`, `nik`, `plafon`, `harga_kontrak`, `tarif` di daftar putih; ringkas di atas 100 KB atau berkas lain di atas 1 MB; `renlap-pb.yml` tanpa `contents: read` atau berisi `git commit`, `git push`, atau `${{ inputs.* }}` di dalam `run:`; gerbang dites dengan masukan pelanggar yang sengaja dibuat di fixture | `node --test tests/agen/gerbang-paritas.test.mjs` |
| PB-07 | `bencanaId` tidak lagi menjatuhkan longsor atau pesisir ke karhutla; `tugasBencanaPer` benar dengan dan tanpa `tugas_bencana_x` (tangkap `no such table`); jumlah `.prepare(` di `src/instansi.js` turun satu dan `d1-sisa.json` menyusut di commit yang sama | `node --test tests/warga/pb_karhutla_tetap.test.mjs tests/warga/pb_skema.test.mjs tests/warga/instansi_bencana_layar.test.mjs tests/agen/gerbang-d1.test.mjs` |
| PB-08 | Tiap jenis tugas punya daftar periksa tidak kosong; butir [ingatan] tidak ada; daftar lama tidak berubah | `node --test tests/warga/pb_penugasan.test.mjs` |
| PB-09 | Adaptor menulis berkas sah; `umurMaksJam` 72; berkas lama tidak ditimpa bila panen gagal; ukuran dalam plafon `gerbang-anggaran-cf` | `python3 -I scripts/umum/tugas.py uji`, `node --test tests/agen/gerbang-anggaran-cf.test.mjs` |
| PB-10 | `bencana` yang tidak `kemampuan.operasi` = 404; peran dicek tiap permintaan (cabut lalu tulis = 403); akun gerbang dan tamu ditolak; `lat` dan `lon` di luar bbox 400; `id` klien milik wilayah lain ditolak (IDOR); hapus lunak tanpa alasan 5 sampai 300 karakter ditolak; batas laju 60 per 10 menit (ke-61 = 429); tulis tanpa tabel = 503 pesan migrasi, baca tanpa tabel daftar kosong `tersedia: false`; XSS `<script>` dan `]]>` di `nama`, `catatan` tersimpan bersih | `node --test tests/warga/pb_titik.test.mjs` |
| PB-11 | Matriks KEAMANAN bagian 2 jalan per peran: pusdalops dan moderator 200, akun instansi wilayahnya 200 dan wilayah lain 403 dan baris tak berubah, polda polres kodam kodim 403, `udara` dan `tmc` hanya karhutla dan udara, pemirsa hanya GET; peran dicabut dicek tiap permintaan; `kab` akun cocok lewat `kunci_wilayah` ke kode BPS, bukan nama bebas | `node --test tests/warga/pb_hak.test.mjs` |
| PB-12 | Dua `POST /api/pb/renlap` bersamaan memberi versi berbeda; `diminta` kedua untuk (bencana, prov, kab, tanggal) kurang dari 30 menit = 409; 7 hari ke belakang sah, di depan hari ini 400; enam permintaan per jam, ketujuh 429; callback: HMAC salah, `waktu` lewat 300 detik, status selain `draf` atau `gagal`, id tak dikenal (HMAC tetap dihitung, jawaban sama), transisi mundur (`terbit` ke `draf`) semuanya ditolak; `put` R2 kedua pada kunci sama gagal; `prov` atau `kab` berisi `../` 400; berkas hanya untuk peran berhak, pemirsa dan tamu ditolak, header `private, no-store`, `nosniff`, `content-security-policy: sandbox`; tanpa `GITHUB_TOKEN` = 503 dan baris tidak dibuat | `node --test tests/warga/pb_renlap.test.mjs` |
| PB-13 | `uji` memeriksa tiap `SKOR[bencana]`, bobot berlabel HIPOTESIS, keluaran karhutla byte-identik sebelum dan sesudah ekstraksi, KML dan GPX lolos pembersih `xml()`, `]]>` di nama tidak merusak | `python3 -I scripts/umum/renlap.py uji`, `python3 -I scripts/operasi/renlap.py uji` |
| PB-14 | Workflow memvalidasi ulang masukan dengan regex di langkah pertama, masukan lewat `env:`, `timeout-minutes: 15`, `concurrency` per `renlap_id`, tanpa `git push`; baris `diminta` lebih dari 30 menit dibaca "gagal, ulangi" tanpa cron | `node --test tests/agen/gerbang-paritas.test.mjs tests/warga/pb_renlap.test.mjs` |
| PB-15 | Keluaran banjir lewat mesin satu identik dengan fixture dari `renlap_banjir.py` sebelum dihapus; berkas lama dihapus di commit yang sama; hitungan ADA banjir tidak turun | `python3 -I scripts/umum/renlap.py uji`, `npm run uji:banjir`, `node scripts/agents/paritas.mjs` |
| PB-16 | `butir` paling banyak 100; `alasan` dan `hasil` dari daftar; upsert per (`renlap_id`, `target_no`); riwayat `pb_log` sebelum dan sesudah; `GET /api/pb/kepatuhan` memberi `{renlap, target, didatangi, persen, per_alasan}`; rentang paling lama 31 hari, tanpa `oleh` di keluaran | `node --test tests/warga/pb_hasil.test.mjs` |
| PB-17 | Lima keadaan layar (memuat, kosong, galat, luring, basi) tanpa angka contoh; tombol hanya untuk peran berhak dan server tetap menolak; kartu kepala nama seksi tanpa kesimpulan; tanpa gaya inline selain variabel warna | `node --test tests/layar/pb_titik.test.mjs tests/agen/gerbang-kartu-std.test.mjs tests/agen/gerbang-tanpa-kesimpulan.test.mjs tests/agen/gerbang-tinjau-lokal.test.mjs` |
| PB-18 | Kartu kluster api tidak dirender (bukan disembunyikan CSS) untuk jenis lain; tab tampil menurut registri tanpa `if (id === ...)`; versi lama dapat dibuka dan tidak dapat ditimpa; keadaan kosong menulis "belum ada operasi untuk jenis ini" | `node --test tests/layar/pb_renlap.test.mjs`; tinjau `http://localhost:8800/operasi` |
| PB-19 | Tiap berkas: `versi`, `bencana`, `dibuat`, `sumber[]`, `tingkat`, `angka`, `prospektif`, `basi`; tak diketahui `null`; tanpa kata "aman"; tanpa koordinat regu; paling besar 100 KB; delapan bencana ditambah karhutla ada; karhutla hanya dari sistem | `python3 -I scripts/umum/pb_ringkas.py uji`, `node --test tests/agen/gerbang-paritas.test.mjs` |
| PB-20 | Seperti PB-05 untuk `pb_dokumen`, `pb_tindakan`, `logbook_sk_selesai`; `kib` hanya 16 digit angka; `UNIQUE (jenis, bencana, prov, kab, periode, versi)` | `node --test tests/warga/pb_skema.test.mjs tests/warga/migrasi_beku.test.mjs` |
| PB-21 | Migrasi `peringatan_x` dijalankan dua kali tanpa galat (uji migrasi idempoten); tabel `peringatan` lama tidak berubah dan barisnya utuh; jenis baru masuk ke `peringatan_x`, jenis lima lama dan nilai di luar daftar ditolak CHECK tabel itu; UNION ALL `peringatan` dan `peringatan_x` mengembalikan kedua sumber berurut `dibuat DESC` dengan `LIMIT`; `EXPLAIN QUERY PLAN` tiap cabang `SEARCH ... USING INDEX` (`peringatan_aktif` dan `peringatan_x_aktif`), tanpa `SCAN`; tanpa tabel `peringatan_x` jenis lama tetap melayani; pemeriksa `migrasi-idempoten` menyatakan lolos | `node --test tests/warga/peringatan.test.mjs tests/warga/pb_skema.test.mjs tests/warga/migrasi_beku.test.mjs` |
| PB-22 | Rakit dengan nomor `0812...` atau `+62...` atau NIK 16 digit di mana pun di JSON = 422; `kalimat_staf` dibersihkan dan batas 1500; `bekukan` oleh pimpinan boleh (Q32), merakit hanya pusdalops dan koordalops; R2 `put` kedua gagal; dua bekukan bersamaan memberi satu versi beku; `fmt` di luar `json` dan `pdf` 400; pemirsa tidak membuka berkas (Q31); `kib` wajib untuk `laporan_kib` | `node --test tests/warga/pb_dokumen.test.mjs` |
| PB-23 | Modul baru memakai `ukur`, `satu`, kronologi per KIB yang sama; modul tanpa arsip harian menulis keterbatasannya di `BATASAN_MODUL`, bukan mengarang | `python3 -I scripts/umum/laporan_kejadian.py uji` |
| PB-24 | Angka bertoken memuat umur data; angka karhutla dari sistem; keadaan kosong "belum ada data" per angka; cetak A4 lewat `@media print`; layar lolos gerbang dasbor | `node --test tests/layar/pb_dokumen.test.mjs tests/agen/gerbang-dasbor.test.mjs`; tinjau `http://localhost:8800/bnpb/sitrep` |
| PB-25 | Awalan baru dipetakan; tidak ada tabel atau layar buku kejadian baru | `npm run uji:siklus` |
| PB-26 | CAP sah (waktu `+00:00`, kategori `Geo`, `Env`, `Health`, `Met`), `senderName` tidak memakai nama BMKG, PVMBG, atau KLHK untuk hitungan sendiri | `node --test tests/warga/ews.test.mjs tests/warga/peringatan.test.mjs` |
| PB-27 | Iterasi `BENCANA` semua tingkat tidak kosong; `tindakanUntuk` dan `tugasUntuk` memilih tingkat tertinggi yang paling dekat; butir telat saat lewat batas dan "menunggu data" saat sumber basi; warga tidak dapat menulis (403); handler centang tidak membekukan layar | `node --test tests/warga/pb_tindakan.test.mjs tests/layar/pb_tindakan.test.mjs` |
| PB-28 | `sisa_hari` benar pada batas hari; `akan_berakhir` pada 7 hari; `tmt_selesai` kosong = `tanpa_tanggal_selesai`; SK provinsi mengalahkan kabupaten; `LIMIT 500`; kueri SEARCH lewat `logbook_sk_selesai` | `node --test tests/warga/pb_papan_sk.test.mjs`, `python3 -I scripts/umum/status_darurat.py uji` |
| PB-29 | Papan dilebur ke `siaga.html` dengan catatan hasil tinjau tumpang tindih; penulisan SK tetap lewat `src/logbook.js`; tombol perpanjang hanya peran berhak | `node --test tests/layar/pb_papan_sk.test.mjs tests/agen/gerbang-dasbor.test.mjs` |
| PB-30 | Kunci cache memuat hak dan wilayah (pengguna A tidak menerima isi pengguna B); tulis di isolate yang sama membuang cache; peran tanpa hak operasi tidak menerima angka internal; `null` bila tabel belum ada | `node --test tests/warga/pb_ringkas.test.mjs` |
| PB-31 | Saringan jenis jamak, tersimpan di hash, tanpa panggilan jaringan per klik; satu `fetch` paralel per jenis; layar masuk `LAYAR` dan `MODEL_A`, `gerbang-kartu-std`, `gerbang-tanpa-kesimpulan`, `gerbang-tinjau-lokal`; tanpa mode TV (Q15) dan tanpa garis target (Q16) | `node --test tests/agen/gerbang-dasbor.test.mjs tests/layar/pb_pimpinan.test.mjs`; tinjau `http://localhost:8800/bnpb/pimpinan` |
| PB-32 | Pengukuran memakai `wrangler d1 insights`, bukan perkiraan; hasil tertulis di `docs/OUTSTANDING.md`; tidak ada angka kuota yang diklaim terukur tanpa pengukuran | angka tertulis, `node --test tests/agen/gerbang-d1-pindai.test.mjs` |

### 3.2 Fase F2 (templat dan per bencana)

Templat "a" (operasi dan renlap): registri bencana menyalakan `operasi` dan `renlap`; satu renlap dapat diminta, diterbitkan, dan dibaca dari layar jenis itu; sarana jenis bencana itu dapat diisi, jenis bencana lain ditolak; target renlap bukan angka contoh dan bobot berlabel HIPOTESIS; tugas bencana itu memakai daftar periksanya; tinjau di layar bencana. Templat "b" (peringatan dan dokumen): penilai EWS dari berkas data bersumber dengan uji data basi, level turun, dua putaran; tangga tindakan memberi tindakan tidak kosong tiap tingkat; dokumen sitrep, renops, laporan KIB dapat dirakit dan dibekukan; ringkas lolos `uji`; sumber hipotesis tidak masuk email, push, CAP.

| Tiket | Kriteria khusus bencana | Perintah bukti |
| ----- | ----------------------- | -------------- |
| PB-33 | tab longsor tetap di `/banjir` dengan entri registri sendiri (Q1); target dari lereng kritis dan jalur; sarana alat berat dan regu SAR | `python3 -I scripts/umum/renlap.py uji`, `node --test tests/longsor/longsor.test.mjs tests/warga/pb_renlap.test.mjs` |
| PB-34a | penilai longsor dari status kecamatan `l`; `sumber_jenis = "hipotesis"` tampil di layar dan tidak membentuk baris kirim (email, push, CAP) sampai PB-49 lolos; tangga longsor tidak kosong tiap tingkat | `node --test tests/warga/ews.test.mjs` |
| PB-34b | `sinyal_longsor` muncul sebagai saran, bukan SK; ringkas longsor berpil hipotesis; dokumen sitrep, renops, laporan KIB dapat dirakit | `node --test tests/warga/pb_dokumen.test.mjs`, `python3 -I scripts/umum/pb_ringkas.py uji` |
| PB-35 | rob tetap di banjir, `gelombang_pasang` dan `abrasi` ke `pesisir` (Q25); sarana perahu | `node --test tests/pesisir/layar.test.mjs tests/warga/pb_renlap.test.mjs` |
| PB-36a | gelombang BMKG diteruskan dengan label BMKG tanpa hitungan sendiri; ambang gelombang [perlu cek] tidak dipakai; abrasi hanya kartu, bukan peringatan; kamus `pesisir` tiap tingkat tidak kosong | `node --test tests/warga/ews.test.mjs` |
| PB-36b | jenis pesisir (gelombang, abrasi, rob) muncul di saringan dan kartu Dalops; tanpa rute dan tabel baru | `node --test tests/warga/dalops.test.mjs` |
| PB-36c | `abrasi.py` benar-benar terjadwal (berkas data lebih muda dari 400 hari); ringkas pesisir lolos `uji` | `python3 -I scripts/pesisir/abrasi.py uji`, `node --test tests/pesisir/layar.test.mjs` |
| PB-37 | sarana `masker` dan `ruang_udara_bersih` hanya berlaku di udara; target sekolah dan kecamatan rentan dari `dampak_udara.py` | `python3 -I scripts/umum/renlap.py uji`, `node --test tests/udara/layar.test.mjs` |
| PB-38a | PM2,5 batas ISPU 15,5 55,4 150,4 250,4 dari `BATAS`; pemetaan tingkat BAWAAN SEMENTARA Q37; ISPU KLHK tidak dipakai (Q24), sumber ditandai; basi 6 jam (ALGORITMA 7.2) | `node --test tests/warga/ews.test.mjs` |
| PB-38b | jenis udara muncul di saringan dan kartu Dalops; tanpa rute dan tabel baru selain jenis | `node --test tests/warga/dalops.test.mjs` |
| PB-38c | ringkas udara lolos `uji`; dokumen sitrep, renops, laporan KIB dapat dirakit | `python3 -I scripts/umum/pb_ringkas.py uji`, `node --test tests/udara/*.test.mjs` |
| PB-39 | target desa tanpa air dan rute tangki; sumber air dari `sumber_air.py` dan `pb_titik` jenis `sumber_air` | `python3 -I scripts/umum/renlap.py uji`, `node --test tests/kekeringan/sim_tanggap.test.mjs` |
| PB-40 | `sumber_jenis = "hipotesis"` tidak membentuk baris kirim (email, push, CAP); tampil di layar dan Dalops dengan pil | `node --test tests/warga/ews.test.mjs` |
| PB-41 | sarana terpal, atap darurat, alat berat; target rumah rusak dan ruas jalan tertutup | `python3 -I scripts/umum/renlap.py uji`, `node --test tests/cuaca/sim_dampak.test.mjs` |
| PB-42 | tingkat dari CAP `severity` (Moderate = 2, Severe dan Extreme = 3); POD hujan 50 mm belum lolos berarti pil hipotesis pada skor | `node --test tests/warga/ews.test.mjs tests/warga/pb_tindakan.test.mjs` |
| PB-43 | operasi SAR, evakuasi, tenda, air; aset udara hanya isian manual (Q4) tanpa panen otomatis | `python3 -I scripts/umum/renlap.py uji`, `node --test tests/gempa/*.test.mjs` |
| PB-44 | tsunami tanpa tingkat 1; gempa tidak pernah diberi saran Siaga; batas basi gempa 2 jam | `node --test tests/warga/ews.test.mjs tests/gempa/*.test.mjs` |
| PB-45 | target desa dalam KRB; `pop_grid.py` terjadwal dan berkasnya ada (39 gunung) | `python3 -I scripts/umum/renlap.py uji`, `node --test tests/gunungapi/sim_tanggap.test.mjs` |
| PB-46a | hanya kenaikan level yang membuat baris (BAWAAN SEMENTARA Q37); Normal tidak memicu; kunci `gunungapi:<id>:<tingkat>`; kamus `gunungapi` tidak kosong tiap tingkat | `node --test tests/warga/ews.test.mjs` |
| PB-46b | Dalops memuat jenis gunung api (`AMBANG` dan saringan) | `node --test tests/warga/dalops.test.mjs` |
| PB-46c | ringkas gunung api lolos `uji`, basi 48 jam; dokumen dapat dirakit; `pop_grid.py` 39 gunung ada | `python3 -I scripts/umum/pb_ringkas.py uji`, `node --test tests/gunungapi/sim_tanggap.test.mjs` |
| PB-47 | hitungan ADA banjir tidak turun; seluruh kemampuan tersedia lewat jalur generik yang sama | `npm run uji:banjir`, `node scripts/agents/paritas.mjs` |
| PB-48 | tiap bencana: BELUM = 0 untuk komponen yang tidak tertahan Q; karhutla dan banjir tidak turun; daftar tertahan Q tertulis | `node scripts/agents/paritas.mjs`, `node --test tests/agen/paritas-hitung.test.mjs` |

### 3.3 Fase F3

| Tiket | Kriteria terima | Perintah bukti |
| ----- | --------------- | -------------- |
| PB-49 | pembagian waktu kronologis, ambang dipilih di periode latih dan dilaporkan di periode uji; `lolos` ditulis bersama `auc` dan `klimatologi`; bila tidak lolos pil hipotesis tetap dan PB-55, PB-57 tidak memakai skornya | `node --test tests/longsor/longsor.test.mjs`, uji balik longsor |
| PB-50 | POD dan FAR hujan 50 mm ke atas dilaporkan lawan persistensi dan klimatologi; lolos hanya bila POD tidak di bawah persistensi | uji balik cuaca, `validasi-model` |
| PB-51 | kode `GNA` dan `KEK` hanya bila ada prakiraan +1..+3 bersumber, selain itu kartu "belum ada prakiraan harian"; kekeringan skala dasarian ditulis jelas | `npm run uji:prediksi` |
| PB-52 | kandidat dari ambang aktivasi Pusdalops logbook (Q23) pada 10 tahun terakhir ditambah tanda staf, kasus pembentuk ambang dikecualikan dari penilaian ambang itu | `npm run uji:siklus` |
| PB-53 | kurang dari 60 bulan menulis "belum cukup tahun"; perubahan cakupan DIBI ditandai, tidak ditafsirkan; tooltip | `node --test tests/layar/pb_tren.test.mjs` |
| PB-54a | komponen `cerita.js` tanpa kalimat kesimpulan di kepala kartu | `node --test tests/layar/pb_cerita.test.mjs` |
| PB-54b | tujuh halaman metode (cuaca, udara, gunung api, kekeringan, gempa, banjir bagian longsor, pesisir baru) memakai komponen `cerita.js` tanpa kalimat kesimpulan di kepala kartu; satu sesi per pemilik berkas | `node --test tests/layar/pb_cerita.test.mjs` |
| PB-55 | koefisien tanpa sumber ditolak; rupiah tidak dijumlah lintas sumber; `kebutuhan(41, sp) == {"mengungsi": 41, "air_l": 615, "hunian_m2": 144, "jamban": 3, "kkal": 86100}` tetap | `python3 -I scripts/umum/ekonomi.py uji`, `python3 -I scripts/prediksi/terbit.py uji` |
| PB-56 | butir tanpa `dasar` tidak dibuat | `python3 -I scripts/umum/pencegahan.py uji` |
| PB-57 | komponen kosong membagi ulang bobot; dua komponen kosong tidak diberi skor, layar "belum cukup data"; peringkat bukan dasar anggaran | `python3 -I scripts/umum/prioritas.py uji` |
| PB-58 | PPTX lolos `aturan_slide.py`; keluaran di `Revisi 3/<nama deck>.pptx` dan `.pdf` tanpa `(rev3)`; angka karhutla hanya dari sistem | `aturan_slide.py`, generator `uji` |
| PB-59 | pemicu per bencana jalan bila bahan lengkap; gagal tidak menahan laporan lain | `npm run uji:wa` |
| PB-60 | tidak dikerjakan sebelum Q9; setelah itu ambang menyebut rujukan naskah | `node --test tests/prediksi/tangga.test.mjs` |
| PB-61 | skrip gagal tidak menghapus berkas lama dan keluar 0 (gagal lunak); tiga gagal berturut-turut berstatus mati; langkah punya `timeout-minutes`; baris `DATA-PUBLIK.md` berubah hanya bila skrip, uji, jadwal ada | `python3 -I scripts/umum/<nama>.py uji` |
| PB-62 | gerbang merah bila skrip `scripts/umum/*.py` berfungsi `uji` tetapi tidak ikut CI; daftar dari direktori, bukan tulis tangan | `node --test tests/agen/gerbang-uji-skrip.test.mjs` |
| PB-63 | umur sampai 1x batas segar, sampai 3x basi, lebih dari itu mati; mati menyembunyikan angka dan menulis "data tidak tersedia sejak <tanggal>" | `python3 -I scripts/umum/pb_ringkas.py uji` |
| PB-64 | semua kunci i18n paket ada di dua bahasa | `node --test tests/layar/pb_i18n.test.mjs` |
| PB-65 | tanpa gulir horizontal; grid turun 2x3 dan 2x4; tinggi sentuh 44 px; `public/tentang.html` memuat kredit dan lisensi per data; laporan ukur di `docs/OUTSTANDING.md`; tiap halaman gagal ukur satu tiket anak PB-65.n | ukur emulasi 375 px |
| PB-66 | grep ulang dijalankan dulu dan hasilnya ditulis; semua temuan RISET bagian 4 yang masih ada nol (butir yang sudah beres per 15 Nov tidak dikerjakan) | `npm run uji:agen` |
| PB-67 | tabel target PRD bagian 3 dibandingkan dengan keluaran skrip; selisih dan baris tertahan Q ditulis | `node scripts/agents/paritas.mjs` |

## 4. Gerbang yang diperbarui

Gerbang tidak dilemahkan untuk meloloskan tiket (AGENTS.md bagian 9); yang ditambah hanya entri.

| Gerbang atau registri | Berkas | Yang ditambah | Tiket |
| --------------------- | ------ | ------------- | ----- |
| Gerbang dasbor | `tests/agen/gerbang-dasbor.test.mjs` | `LAYAR`: `public/bnpb/pimpinan.html`, `public/bnpb/sitrep.html` bila belum, `public/bnpb/siaga.html`; `MODEL_A`: `public/bnpb/pimpinan.js` (`db-nav-isi`, `db-l1` atau `DasborA?.pasang`) | PB-24, PB-29, PB-31 |
| Gerbang kartu standar | `tests/agen/gerbang-kartu-std.test.mjs` dan `fixtures/kartu_std.json` | `LAYAR` skrip dan html layar baru (`lama: []`) | PB-17, PB-18, PB-24, PB-29, PB-31 |
| Gerbang tanpa kesimpulan | `tests/agen/gerbang-tanpa-kesimpulan.test.mjs` | layar baru | sama |
| Gerbang tinjau lokal | `tests/agen/gerbang-tinjau-lokal.test.mjs` | jalur `/bnpb/pimpinan`, `/bnpb/siaga` | PB-29, PB-31 |
| Gerbang D1 | `tests/agen/gerbang-d1.test.mjs`, `fixtures/d1-sisa.json` | plafon `src/instansi.js` menyusut satu; `src/pb_*.js` tanpa `env.DB`, `.prepare(`, `DB.batch` | PB-07, PB-10 |
| Gerbang pindai D1 | `tests/agen/gerbang-d1-pindai.test.mjs`, `fixtures/d1-pindai.json` | tiap kueri `pb*` SEARCH; tanpa SCAN baru; tidak menaikkan plafon | PB-10, PB-12, PB-16, PB-22, PB-27, PB-28, PB-30 |
| Gerbang bencana | `tests/agen/gerbang-bencana.test.mjs` | kunci `kemampuan` dan jenisnya; `src/bencana.generated.js` segar | PB-04 |
| Gerbang anggaran CF | `tests/agen/gerbang-anggaran-cf.test.mjs` | tidak diubah; paket menambah paling banyak 60 berkas | PB-09, PB-19 |
| Gerbang paritas (baru) | `tests/agen/gerbang-paritas.test.mjs` | privasi, `public/` daftar putih, ukuran, workflow | PB-06, PB-14 |
| Gerbang uji skrip (baru) | `tests/agen/gerbang-uji-skrip.test.mjs` | skrip ber-`uji` ikut CI | PB-62 |
| Gerbang paket modul | `tests/agen/gerbang-paket-modul.test.mjs` | tidak ada folder baru di `public/` atau `scripts/` tanpa paket | semua |
| Gerbang ilmu agent | `tests/agen/gerbang-ilmu-agent.test.mjs` | tiap berkas kode baru tepat satu pemilik; ilmu agent diperbarui lewat `ilmu.mjs kasus`; plafon 40 KB | semua, PB-66 |
| Registri cakupan Worker | `tests/warga/cakupan.json` | tiap rute `/api/pb/*` dan tiap tabel `pb_*`, `tugas_bencana_x` masuk `diuji` dengan potongan nama uji yang ada; jalur tanpa garis bawah | PB-05, PB-10, PB-12, PB-16, PB-20, PB-22, PB-27, PB-28, PB-30 |
| Migrasi beku | `tests/warga/migrasi_beku.json` dan `migrasi_beku.test.mjs` | hash 0130, 0131, D13 sesudah pemilik menerapkan; migrasi yang sudah jalan tidak disunting | PB-05, PB-20, PB-21 |

Gerbang INP: `gerbang-inp-transisi` yang disebut standar pemilik (`~/.claude/INP.md`) tidak ditemukan sebagai berkas di `tests/agen`; pemeriksaan INP dilakukan agent `inp-reviewer` di tiap tiket layar sebagai pemeriksa wajib (AGENTS.md bagian 6) ditambah uji handler yang disebut di kriteria PB-02, PB-27, PB-31.

## 5. Regresi karhutla dan banjir (D4)

Generik tidak boleh memundurkan modul matang. Syarat berlaku di tiap tiket PB-07 sampai PB-47:

| Pemeriksaan | Cara | Ambang |
| ----------- | ---- | ------ |
| Teks dan perilaku karhutla | `pb_karhutla_tetap.test.mjs` (golden dari kode sebelum refaktor) | identik |
| Uji karhutla yang ada | `operasi_lapangan.test.mjs`, `operasi_udara.test.mjs`, `operasi_isian.test.mjs`, `operasi_monitor.test.mjs`, `operasi_semai.test.mjs` tanpa disunting | hijau |
| Keluaran renlap karhutla | `python3 -I scripts/operasi/renlap.py uji` byte-identik sebelum dan sesudah ekstraksi | identik |
| Keluaran renlap banjir | `python3 -I scripts/umum/renlap.py uji` dibanding fixture dari `renlap_banjir.py` | identik |
| Uji banjir | `npm run uji:banjir` | hijau |
| Hitungan ADA | `node scripts/agents/paritas.mjs` dibanding hitungan acuan beku | ADA karhutla dan banjir tidak turun (PRD 3 dan 8) |
| Tanpa tabel baru | uji dengan migrasi 0130 belum diterapkan: karhutla dan tujuh jenis lama tetap jalan, jenis longsor dan pesisir menjawab 503 pesan migrasi | `pb_skema.test.mjs` |
| Peringatan lama | sesudah D13 tabel `peringatan` lama tidak disentuh, barisnya utuh dan jenis lama tetap mengirim | `ews.test.mjs`, `peringatan.test.mjs` |

## 6. Uji privasi

| Pemeriksaan | Cara | Tiket |
| ----------- | ---- | ----- |
| Tanpa kolom orang di `pb_*` | gerbang memindai skema (`nama_kru`, `pelapor`, `korban`, `no_hp`, `wa`, `nik`, `email`) | PB-06 |
| Tanpa nomor telepon atau NIK di dokumen rakitan | uji rakit: `0812...`, `+62...`, NIK 16 digit = 422 | PB-22 |
| `oleh` bukan nama | `staf:<id>`, `admin:<hash12>`, `instansi:<id>`; diisi Worker dari sesi, nilai dari badan permintaan diabaikan | PB-10, PB-11 |
| Kepatuhan tanpa dimensi pengisi | keluaran `kepatuhan` tidak memuat `oleh` | PB-16 |
| Tanpa data operasi di `public/` | gerbang daftar putih `public/data/{ringkas,ekonomi,pencegahan,prioritas}/`, workflow `contents: read` | PB-06, PB-14 |
| Cache | respons rute baca `private, no-store` dan `vary: cookie`; cache isolate berkunci hak dan wilayah | PB-12, PB-30 |
| Pemirsa dan tamu | tamu 401, pemirsa 403 pada `/berkas`; pemirsa GET hanya jalur di `IZIN_PEMIRSA_PUSDALOPS` | PB-11, PB-12, PB-22 |
| Akun gerbang tidak menulis | 403 di tiap rute tulis (`modOK`, bukan `adminOK`) | PB-10, PB-11 |
| Foto | tidak ada rute foto di `src/pb_*.js` | PB-06 |
| Teks bebas | `<script>`, `]]>`, `../` di `nama`, `catatan`, `alasan`, `kalimat_staf`, `prov`, `kab` | PB-10, PB-12, PB-22 |
| Secret | tidak ada secret baru; tidak ada nilai secret di berkas terlacak; `higiene-repo` memeriksa sebelum commit besar | semua |

## 7. EXPLAIN QUERY PLAN

Tiap fungsi baru di `src/hak.js` yang membaca tabel baru diuji lewat `gerbang-d1-pindai` (menangkap `SCAN` otomatis) dan satu uji `EXPLAIN QUERY PLAN` di berkas ujinya yang menuntut `SEARCH ... USING INDEX` atau PK.

| Kueri | Indeks yang diharapkan | Tiket |
| ----- | ---------------------- | ----- |
| `pb_titik` per wilayah dan bencana (dihapus NULL) | `pb_titik_wilayah` | PB-10 |
| `pb_titik` per bencana, golongan, jenis | `pb_titik_bencana` | PB-10 |
| `pb_renlap` per tanggal dan bencana | `pb_renlap_tanggal` | PB-12 |
| `pb_renlap` per wilayah dan tanggal | `pb_renlap_wilayah` | PB-12 |
| versi berikut `max(versi)` per (bencana, prov, kab, tanggal) | indeks UNIQUE | PB-12 |
| `pb_renlap_hasil` per `renlap_id` | PK | PB-16 |
| laju tulis `count(*)` per `oleh` dan `waktu` | `pb_log_oleh` | PB-10 |
| riwayat per `tabel`, `kunci` | `pb_log_kunci` | PB-10 |
| `tugas_bencana_x` per `tugas_id` dalam `json_each` | PK | PB-07 |
| daftar jenis tugas longsor dan pesisir | `tugas_bencana_x_jenis` | PB-07 |
| `pb_dokumen` per periode, jenis, bencana | `pb_dokumen_periode` | PB-22 |
| `pb_dokumen` per `kib` dan jenis | `pb_dokumen_kib` | PB-22 |
| `pb_tindakan` per `peringatan` | PK | PB-27 |
| papan SK `UNION ALL` dua kueri `tmt_selesai` | `logbook_sk_selesai`; join `logbook_kejadian` lewat PK | PB-28 |
| ringkas: tugas buka, renlap hari ini, SK berlaku | indeks di atas, `LIMIT 500` | PB-30 |

Larangan: tidak ada kueri terjadwal baru, tidak ada jadwal Worker baru, tidak ada pembacaan `pb_log` tanpa `oleh` atau `tabel, kunci`, rentang tanggal paling lama 31 hari.

## 8. Tinjau lokal per tiket layar

Server tinjau `http://localhost:8800`; bila tidak menjawab, jalankan `npm run tinjau` di latar dan sebut itu di laporan.

| Tiket | Tautan | Yang ditinjau pemilik |
| ----- | ------ | --------------------- |
| PB-02 | `http://localhost:8800/bnpb/sitrep` | pegangan tarik panel kiri di layar model A |
| PB-17, PB-18 | `http://localhost:8800/operasi` | pemilih jenis, sarana, renlap, kepatuhan; kartu kluster api hanya karhutla |
| PB-24 | `http://localhost:8800/bnpb/sitrep` | pembuat dokumen, versi beku, cetak A4 |
| PB-27 | tab peringatan di `http://localhost:8800/banjir` dan layar bencana yang menyala | checklist tangga tindakan |
| PB-29 | `http://localhost:8800/bnpb/siaga` | papan status darurat |
| PB-31 | `http://localhost:8800/bnpb/pimpinan` | dashboard pimpinan, saringan jenis jamak |
| PB-33 | `http://localhost:8800/banjir` | tab longsor |
| PB-35 | `http://localhost:8800/pesisir` | operasi dan renlap pesisir |
| PB-37, PB-38a, PB-38b | `http://localhost:8800/udara` | operasi masker, peringatan PM2,5 |
| PB-39, PB-40 | `http://localhost:8800/kekeringan` | operasi air, peringatan hipotesis |
| PB-41, PB-42 | `http://localhost:8800/cuaca` | operasi terpal, peringatan |
| PB-43, PB-44 | `http://localhost:8800/gempa` | operasi SAR, peringatan |
| PB-45, PB-46a, PB-46b | `http://localhost:8800/gunungapi` | barak, level, Dalops |
| PB-47 | `http://localhost:8800/banjir` | banjir lewat jalur generik |
| PB-53, PB-54a, PB-54b | halaman bencana terkait | tren, metode, cerita |
| PB-65 | semua jalur di atas di emulasi 375 px | tanpa gulir horizontal |

Setiap tiket layar juga diperiksa: kepala kartu nama seksi, tanpa kalimat kesimpulan, tanpa kaki sumber, tanpa kapital dipaksa, tanpa titik tengah, tanpa data dummy, kartu tidak menempel (20 px), kolom berdampingan sama tinggi, grafik interaktif dengan tooltip, paragraf rata kiri-kanan.

## 9. Pertanyaan untuk KEPUTUSAN

> Catatan orkestrator 15 Nov 2026: pertanyaan di bagian ini sudah dipindah ke KEPUTUSAN-PARITAS.md (Q1 sampai Q37) dan dinomori ulang di sana. Bila isi atau bawaan berbeda, KEPUTUSAN yang berlaku. Untuk rute layar baru berlaku Q13 (papan status darurat dilebur ke `siaga.html`, pembuat dokumen di `/bnpb/sitrep`, dashboard pimpinan `/bnpb/pimpinan`); panel kiri berlaku D12.
