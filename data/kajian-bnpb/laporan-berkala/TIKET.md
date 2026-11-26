# TIKET: Laporan Berkala

Kerjakan urut. Satu tiket = satu cakupan; yang di luar cakupan tidak disentuh. Tiket yang menyebut Q boleh dikerjakan dengan bawaan sementara bila KEPUTUSAN menulis "tidak menahan"; selain itu tunggu jawaban pemilik.

| Kode | Judul | Pengerja | Pemeriksa | Bergantung | Status |
| --- | --- | --- | --- | --- | --- |
| LB-00 | Daftarkan modul: baris peta modul di AGENTS.md (bagian 2.12 sudah ada), roster wilayah `scripts/berkala/**` dan `tests/berkala/**`, skrip `uji:berkala` di `package.json` dan masuk `npm run uji`, `npm run agents:build` | `mekanik-mesin` | `higiene-repo` | | dikerjakan (25 Nov 2026, pipa-data atas permintaan orkestrator) |
| LB-01 | `hitung.py` validasi kode periode dan rentang (D11, H15, H16), Bab 1, perbandingan tahun lalu dan bulan sebelumnya, Lampiran (ALGORITMA 1, 2, 3); bentuk berkas angka dan uji kontrak | `pipa-data` | `validasi-model` | LB-00, Q19, Q20 | dikerjakan (25 Nov 2026) |
| LB-02 | `hitung.py` Bab 2 sampai 5 dan usulan temuan (ALGORITMA 4 sampai 7, 9) | `pipa-data` | `validasi-model` | LB-01 | dikerjakan (25 Nov 2026; Bab 4.4 hujan dan Bab 7.1 tetap LB-04, T6 dan T7 menunggu masukan LB-04) |
| LB-03 | `rakit.py --potong` dan `--periode bulanan` (baca produksi, lapis Siklus tahun lalu, unggah R2), uji data nyata Oktober 2026 (RENCANA-UJI 5) | `pipa-data` | `validasi-model` | LB-02, Q3 | dikerjakan (25 Nov 2026; jadwal harian `berkala.yml` tetap LB-10, `mekanik-mesin`) |
| LB-04 | Bab 7.1 peluang dan indeks ENSO, Bab 4.4 hujan ke depan (ALGORITMA 6, 8), banding dengan contoh Oktober | `pipa-data` | `validasi-model` | LB-03, Q12, Q14 | dikerjakan (25 Nov 2026; menunggu `validasi-model`) |
| LB-05 | Halaman cetak A4 bulanan dari fixture: CSS token dan komponen, sampul sampai lampiran, tanda air draf; modul `laporan_berkala_hitung.js` (format, ALGORITMA 10, 11) | `layar-peta` | `selera-angka`, `inp-reviewer` | LB-01, Q4, Q5, Q6, Q13, Q17, Q21 | belum |
| LB-06 | Layar isian: jenis ketiga "Laporan Berkala", pemilih periode dan kode (bulanan dulu), kartu per bab, kolom staf dan bentuk isian yang muat batas `bersihIsi`, kelengkapan, pengingat sebelum keluar | `layar-peta` | `selera-angka`, `inp-reviewer` | LB-05, Q15, Q18 | belum |
| LB-07 | Migrasi tabel `laporan_berkala` (kolom `periode`, `kode`, CHECK pola per periode), trigger, dan jejak; `src/laporan_berkala.js` (draf, angka, Bekukan, cetak, jejak), baris rute di `src/worker.js`; uji I1 sampai I9e (termasuk I1b, I2b), I11, I12 | `warga-api` | `migrasi-idempoten`, `guard-api`, `security-reviewer` | LB-03, LB-05, Q1 | belum |
| LB-08 | Foto: kode ulang di peramban, rute unggah dan baca, kredit dan izin media; uji I10 | `warga-api` (rute), `layar-peta` (layar) | `security-reviewer` | LB-07, Q7 | belum |
| LB-09 | `kegiatan.py` panen siaran pers bnpb.go.id; pemilih dan penggolong kegiatan Bab 6, Lampiran tautan | `pipa-data`, `layar-peta` | `security-reviewer` | LB-07, Q8, Q16 | dikerjakan (26 Nov 2026; arsip per bulan `berkala/kegiatan/<YYYY-MM>.json`, calon ikut berkas angka tanpa rute baru, penggolong ALGORITMA 13 bawaan sementara Q8, rekap tahunan dari hitungan siaran pers karena isian tidak ikut objek beku; langkah panen di `berkala.yml` menunggu LB-10; menunggu `security-reviewer`, `inp-reviewer`, `selera-angka`) |
| LB-10 | `berkala.yml` (potongan harian, jendela rakit tiap periode ALUR 1, dispatch dengan `periode` dan `kode`); beda versi di layar (F-8); susun laporan November 2026 bersama pemilik di localhost:8800 | `mekanik-mesin`, `layar-peta` | `higiene-repo`, pemeriksa bersih | LB-03 sampai LB-09, Q11 | belum |
| LB-11 | Harian dan mingguan: varian hitung ALGORITMA 12 (rentang, riwayat 14 hari dan 8 minggu, pembanding, prakiraan dari `prediksi.json` +1 dan `tangga.json` bila ada), halaman cetak ringkas, pilihan Harian dan Mingguan di pemilih periode, kelengkapan per periode; uji H15 sampai H18, H21, L4b, L13 | `pipa-data` (hitung), `layar-peta` (layar) | `validasi-model`, `selera-angka`, `inp-reviewer` | LB-07, LB-10, Q23, Q24, Q25, Q26, Q27 | selesai 26 Nov 2026; sisa: peringatan BMKG harian, foto mingguan, peta ringkas |
| LB-12 | Tahunan: hitung ulang setahun dari DIBI terbaru dan lampiran selisih lawan versi beku bulanan (D13), riwayat 10 tahun dari `dibi_kab_tahun.json`, luas perkiraan berdampingan dengan `luas_resmi.json` dan `luas_satelit.json`, rekap kegiatan 12 bulan, halaman cetak tahunan; uji H19, H20 | `pipa-data` (hitung), `layar-peta` (layar) | `validasi-model`, `selera-angka` | LB-11, paling sedikit satu versi beku bulanan, Q23 | dikerjakan (26 Nov 2026; perbaikan validasi-model: riwayat 10 tahun dan T8 resmi dari dibi_tren.json, resmi tahun lapor tidak diketahui = tanpa T8, lapis Siklus hilang = gagal bukan tertunda, bulan riwayat penuh = beda_sumber; belum ada versi beku bulanan di R2, jadi lampiran selisih tertulis "belum ada versi beku bulanan"; rekap kegiatan 12 bulan dari LB-09 (hitungan siaran pers per bulan); menunggu `validasi-model`, `selera-angka`) |
| LB-13 | Rapor respons BPBD bulanan (K8): `GET /api/lapor/respons?bulan=YYYY-MM` khusus staf BNPB dan kartu Respons di Layar Pimpinan dengan pemilih bulan (`src/lapor_ai.js`, fungsi `lpRespons*` di `src/hak.js`, `public/admin/pimpinan.js`, `tests/warga/profil_ambil.test.mjs`); saat perakit bulanan ada, bagian "Respons BPBD atas laporan warga" membaca rute yang sama dan ikut versi beku. Bukti: bulan tanpa data tertulis belum cukup data, bulan tak sah 400, `npm run uji:warga` | `warga-api` (pimpinan.js: `ruang-bnpb`) | `guard-api`, `selera-angka` | PF-08 | dikerjakan |

Catatan urutan: bulanan dibangun lebih dulu karena punya contoh nyata (Oktober 2026); harian dan mingguan (LB-11) dan tahunan (LB-12) memakai mesin yang sama dan hanya menambah varian. Potongan harian (`rakit.py --potong`, LB-03) dan `berkala.yml` sebaiknya jalan secepatnya supaya status surut dan deret karhutla November 2026 tertangkap utuh; bila LB-10 belum siap, jadwal potongan boleh dipasang lebih dulu sebagai bagian LB-03.

## Rincian

### LB-00 Daftarkan modul

Berkas: `AGENTS.md` (baris peta modul), `scripts/agents/roster.json`, `package.json`, keluaran `npm run agents:build`. Bukti: `npm run uji:agen` hijau; `npm run uji:berkala` jalan (boleh kosong).

### LB-01 Hitung Bab 1

Berkas: `scripts/berkala/hitung.py`, `tests/berkala/fixtures/*`, `tests/berkala/kontrak.test.mjs`. Uji H1 sampai H6, H12, H13. Bukti: `python3 -I scripts/berkala/hitung.py uji`; `node --test tests/berkala/kontrak.test.mjs`.

### LB-03 Rakit dan uji data nyata

Berkas: `scripts/berkala/rakit.py`. Impor `put/get` dari `scripts/siklus/gudang.py`, tidak menyalin. Laporan tiket memuat tabel angka rakit lawan contoh Oktober 2026 (RENCANA-UJI 5) dengan sebab tiap selisih. Bukti: `python3 -I scripts/berkala/rakit.py --periode bulanan --kode 2026-10 --lokal <folder>`.

Hasil data nyata Oktober 2026 (25 Nov 2026, `dibi_kejadian.json` dibuat 23 Nov, `peta_karhutla.json` 9 Nov, MAGMA 10 Nov, dalops 25 Nov):

| Angka | Contoh | Rakit | Sebab selisih |
| --- | --- | --- | --- |
| Kejadian bencana alam | 324 | 324 (resmi DIBI 262) | cocok; 62 laporan di bawah ambang ikut dihitung contoh (Q28) |
| Karhutla | 222 | 222 (resmi 200) | cocok |
| Banjir | 55 | 56 | DIBI berubah sesudah tarikan contoh: riwayat penuh tarikan 10 Nov mencatat Gayo Lues 29 Okt sebagai Cuaca Ekstrem (banjir 55, cuaca 19), tarikan 23 Nov sebagai Banjir (banjir 56, cuaca 18). Bukan beda rumus; inilah alasan versi beku (D3) |
| Provinsi | 27 | 27 | dulu 24: `dibi_kejadian.json` memakai kode provinsi induk sebelum pemekaran Papua 2022 (Papua, Papua Selatan, Papua Tengah, Papua Pegunungan semuanya 94). Contoh menghitung 38 provinsi; rakit mengode ulang dari nama provinsi ke kode Kemendagri |
| Kab/kota | 139 | 139 | cocok |
| Hotspot, puncak | 469.010; 25.539 pada 6 Okt | sama | cocok |
| Luas, belum padam | 854.069 ha; 3.865 ha | sama | cocok |
| Gunung api I/II/III/IV | 42/24/3/0 | 42/24/3/0 | cocok; sumber level `public/banjir/data/gunungapi_status.json`, dihitung mundur ke 1 Nov |
| Gempa laporan / peristiwa | 5 / 4 | 5 / 5 | dua laporan DIBI 16 Okt (Sukabumi, Bogor) tidak punya kejadian BMKG di arsip kita (`inatews_detail_2026-10.json` dan `inatews_katalog.json` tidak memuat gempa di selatan 5° LS pada 15 sampai 17 Okt selain Sumbawa, Timor, dan luar negeri), jadi tiap baris jadi satu peristiwa (ALGORITMA 7.2) |
| Tahun lalu (Okt 2025) | 386 (surat Kepala BNPB 2 Nov) | 529 semua laporan; resmi tidak diketahui | lapis Siklus (riwayat penuh tarikan 10 Nov) memuat laporan di bawah ambang tanpa tanda; 386 kemungkinan angka resmi. Contoh membandingkan 324 (termasuk di bawah ambang) dengan 386, dua definisi berbeda. Belum bisa dipastikan tanpa tarikan resmi Okt 2025 (Q3, Q28) |

### LB-04 Prakiraan dan ENSO

Berkas: `scripts/berkala/hitung.py` (`hujan_depan`, `peluang_bulan`, `enso`, `bab7`; T6 dan T7 dari turunannya), `scripts/berkala/rakit.py` (baca `data/logbook_riwayat.json` dan `data/iklim_outlook.json`, hanya bulanan), fixture dan uji kontrak. Bukti: `npm run uji:berkala`.

Banding dengan contoh Oktober 2026 (25 Nov 2026):

| Angka | Contoh | Rakit, `public/data` repo | Rakit, produksi | Sebab selisih |
| --- | --- | --- | --- | --- |
| Kab berpeluang tinggi banjir November | 33 | 33 | 28 | produksi masih menyajikan `logbook_riwayat.json` 31 Okt (7 tahun penuh 2014-2020); repo 1 Nov memakai 9 tahun |
| Banjir Desember | 36 | 36 | 33 | sama |
| Longsor November | 24 | 24 | 23 | sama |
| Longsor Desember | 32 | 32 | 32 | |
| Indeks Pasifik (RONI) | 1,97 | 1,69 (JAS, berkas repo 19 Okt) | 1,97 (ASO, terbit 9 Nov) | berkas repo belum disegarkan sejak 19 Okt |

Peluang berlabel hipotesis (aturan frekuensi belum diuji balik); wilayah hujan berlabel `uji_balik_lulus` hanya bila fit musimnya lulus uji balik leave-one-out di `iklim_outlook.json`, selain itu hipotesis. Golongan ENSO memakai ambang NOAA CPC plus minus 0,5.

### LB-05 Halaman cetak

Berkas: `public/laporan_berkala.js` (bagian cetak), `public/laporan_berkala_cetak.css`, `public/laporan_berkala_hitung.js`. Uji L1, L7 sampai L11. Bukti: `npm run uji:berkala`; tangkapan layar tiap halaman di `http://localhost:8800/laporan-bnpb?jenis=berkala&periode=bulanan&kode=2026-10`.

### LB-07 Simpan dan Bekukan

Berkas: `migrations/<nomor berikut>_laporan_berkala.sql`, `src/laporan_berkala.js`, satu baris rute di `src/worker.js`. Migrasi produksi diterapkan pemilik. Bukti: `npm run uji:berkala`; `npm run uji:warga`.

### LB-10 Jadwal dan laporan pertama

Berkas: `.github/workflows/berkala.yml`, `public/laporan_berkala.js` (beda versi). Laporan November 2026 disusun bersama pemilik; tiap koreksi pemilik dicatat ke KEPUTUSAN dan, bila bisa diperiksa mesin, dijadikan gerbang (AGENTS.md 3.4).

### LB-11 Harian dan mingguan

Berkas: `scripts/berkala/hitung.py` (varian periode), `public/laporan_berkala.js` (halaman ringkas, pemilih periode), `public/laporan_berkala_hitung.js` (kelengkapan per periode). Prakiraan dibaca apa adanya dari keluaran modul `prediksi`; laporan berkala tidak menyunting `public/prediksi/**` atau `scripts/prediksi/**`. Bukti: `npm run uji:berkala`; data nyata harian 11 Nov 2026 dan mingguan `2026-W45` dicocokkan dengan berkas angka bulanan Oktober untuk hari dan minggu di dalamnya; tangkapan layar di `http://localhost:8800/laporan-bnpb?jenis=berkala&periode=harian&kode=2026-11-11`.

### LB-12 Tahunan

Berkas: `scripts/berkala/hitung.py` (varian tahunan), `scripts/berkala/rakit.py` (jendela Januari), `public/laporan_berkala.js` (halaman tahunan). Bukti: `npm run uji:berkala`; `python3 -I scripts/berkala/rakit.py --periode tahunan --kode 2025 --lokal <folder>` dengan selisih tiap bulan dijelaskan; tangkapan layar di `http://localhost:8800/laporan-bnpb?jenis=berkala&periode=tahunan&kode=2025`.

Hasil (26 Nov 2026). Mesin sama dengan bulanan; yang ditambah varian tahunan:

- `hitung.py`: riwayat 12 bulan, `riwayat_10_tahun` (10 tahun resmi dari `dibi_tren.json` plus tahun lapor resmi dari tarikan tahunan, tujuh jenis tanpa erupsi, H20, H20b), pembanding tahun lalu dan rerata 10 tahun, `bab2.per_bulan` 12 bulan, `bulan_puncak`, `luas_pembanding` (perkiraan, KLHK SiPongi, GWIS berdampingan tanpa jumlah), banjir per bulan dan kab paling sering banjir, perubahan level setahun, musim depan dari Desember, T8 tren 10 tahun, `lampiran.prov_bulan` dan `lampiran.selisih_bulanan` (H19: bulan tanpa versi beku = `belum_ada_beku`, selisih None; bulan dari riwayat penuh atau campuran = `beda_sumber`). Kegiatan 12 bulan `belum_tersedia` (LB-09).
- `rakit.py`: `dibi_kejadian.json` hanya 365 hari, jadi awal tahun disambung dari lapis Siklus (riwayat penuh) dan tiap bulan bertanda asalnya; versi beku bulanan terakhir dibaca dari `berkala/bulanan/<bulan>/beku/v<N>.json`; tahunan tanpa status surut; status gunung api 1 Januari dihitung mundur dengan `riwayat_level.json` ikut. `--jadwal` menjalankan jendela rakit PRD 2 (tahunan 1 sampai 31 Januari); tertunda hanya bila `dibi_kejadian.json` belum sampai 31 Desember; lapis Siklus hilang, galat baca, atau tanggal tarik tidak diketahui = gagal (workflow merah). Catatan: `berkala.yml` belum memanggil `--jadwal` (menghitung jendela sendiri lalu `--periode`), jadi aturan tertunda belum terpakai di workflow.
- `public/laporan_berkala.js`: halaman tahunan memakai halaman cetak bulanan (sampul lengkap, daftar isi) ditambah 1.3 riwayat 10 tahun, 2.3 luas tiga sumber, 3.1 musim banjir, perubahan level, lampiran selisih dan provinsi x bulan; 31 halaman A4 tanpa luapan dengan data nyata 2025.

Data nyata 2025 (`rakit.py --periode tahunan --kode 2025 --lokal <scratch> --sumber https://centurisk97.id`, `dibi_kejadian.json` dibuat 26 Nov 2026 mulai 26 Nov 2025, lapis Siklus dibangun lokal dari riwayat penuh tarikan 10 Nov 2026):

| Angka | Nilai | Catatan |
| --- | --- | --- |
| Kejadian bencana alam, semua laporan | 8.359 di 37 provinsi, 480 kab/kota | resmi DIBI tidak diketahui: riwayat penuh tidak membawa tanda ambang |
| Per jenis | banjir 2.995, cuaca ekstrem 2.434, karhutla 1.517, longsor 1.171, gempa 91, gelombang 74, kekeringan 56, erupsi 21 | |
| 2024 (lapis Siklus) | 3.553, jadi naik 135,3% | |
| Riwayat resmi 10 tahun (`dibi_tren.json`, tujuh jenis) | 2015 1.684 sampai 2024 3.464, rerata 3.643,4 per tahun | sama definisi dengan tahun lapor resmi |
| Tahun lapor 2025 resmi | tidak diketahui (Januari sampai November dari riwayat penuh tanpa tanda ambang), jadi tren tidak dibandingkan dan T8 tidak terbit | semua laporan tujuh jenis 8.338 tampil berdampingan, tidak dibandingkan; `dibi_tren.json` sendiri mencatat 5.069 resmi untuk 2025, tidak dipakai (H20) |
| Hotspot dan luas perkiraan | tidak diketahui | `peta_karhutla.json` mulai 1 Jan 2026 dan potongan harian baru ada sejak Nov 2026 |
| Luas KLHK SiPongi, GWIS satelit | 12.227 ha (lengkap), 98.720 ha (sampai Nov 2025) | berdampingan, tidak dijumlah |
| Gunung api per 1 Jan 2026 | I 42, II 24, III 3 (Merapi, Semeru, Sinabung), IV 0 | 16 perubahan level dari arsip `riwayat_level.json` dan `perubahan_level.json` |

Selisih tiap bulan lawan versi beku bulanan: belum ada versi beku bulanan 2025 (rute Bekukan LB-07 belum dipakai untuk 2025), jadi tiap bulan tertulis "belum ada versi beku", bukan selisih 0. Angka tahunan per bulan: Jan 1.095, Feb 929, Mar 887, Apr 602, Mei 839, Jun 505, Jul 688, Agu 618, Sep 503, Okt 529, Nov 569, Des 594. Januari sampai Oktober dari riwayat penuh, November campuran (sambung 26 Nov 2025), Desember dari `dibi_kejadian.json`. Oktober 529 sama dengan angka tahun lalu laporan bulanan Oktober 2026 (LB-03). Tangkapan layar localhost:8800 belum bisa: produksi belum punya berkas angka tahunan di R2, jadi layar menulis belum tersedia; halaman cetak dari berkas nyata diperiksa lewat Chrome lokal (31 halaman, tanpa luapan).

### LB-09 Kegiatan dari siaran pers

Berkas: `scripts/berkala/kegiatan.py` (baru), `scripts/berkala/hitung.py` (`kegiatan()`), `scripts/berkala/rakit.py` (baca arsip), `public/laporan_berkala.js` (pemilih calon, tabel per pelaksana, rekap tahunan, tautan Lampiran), `tests/berkala/fixtures/bnpb_berita.html`, fixture masukan dan angka, `tests/berkala/isian_layar.test.mjs`, `tests/berkala/cetak_layar.test.mjs`. Bukti: `python3 -I scripts/berkala/kegiatan.py uji`, `python3 -I scripts/berkala/hitung.py uji`, `python3 -I scripts/berkala/rakit.py uji`, `npm run uji:berkala`.

Panen nyata 26 Nov 2026 (`panen --dari 2026-10-01`, sekitar 12 halaman indeks, 37 detik, robots.txt 404): Oktober 2026 108 siaran pers, cakupan 1 sampai 31 Oktober. Usulan pelaksana: Kepala BNPB 12, Pusdatinkom 36, Satgas operasi 19, belum digolongkan 41; laporan situasi 29; jenis: karhutla 31, gempa 6, gelombang 3, cuaca ekstrem 2, banjir 1, longsor 1. Lokasi terbaca dari judul hanya 9 dari 108, sisanya diisi staf. November 1 sampai 25: 117.

Usulan `berkala.yml` (LB-10, `mekanik-mesin`): satu langkah sebelum rakit, `python3 -I scripts/berkala/kegiatan.py panen --wrangler "$WRANGLER"`, `continue-on-error: true` (bnpb.go.id sesekali menjawab 500; rakit tetap jalan dan sumber `kegiatan` tertulis belum ada). Sekali isi mundur: `panen --dari 2026-01-01` (sekitar 60 halaman) supaya tahunan 2026 tidak `sebagian`.

