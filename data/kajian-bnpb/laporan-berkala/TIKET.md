# TIKET: Laporan Berkala

Kerjakan urut. Satu tiket = satu cakupan; yang di luar cakupan tidak disentuh. Tiket yang menyebut Q boleh dikerjakan dengan bawaan sementara bila KEPUTUSAN menulis "tidak menahan"; selain itu tunggu jawaban pemilik.

| Kode | Judul | Pengerja | Pemeriksa | Bergantung | Status |
| --- | --- | --- | --- | --- | --- |
| LB-00 | Daftarkan modul: baris peta modul di AGENTS.md (bagian 2.12 sudah ada), roster wilayah `scripts/berkala/**` dan `tests/berkala/**`, skrip `uji:berkala` di `package.json` dan masuk `npm run uji`, `npm run agents:build` | `mekanik-mesin` | `higiene-repo` | | belum |
| LB-01 | `hitung.py` validasi kode periode dan rentang (D11, H15, H16), Bab 1, perbandingan tahun lalu dan bulan sebelumnya, Lampiran (ALGORITMA 1, 2, 3); bentuk berkas angka dan uji kontrak | `pipa-data` | `validasi-model` | LB-00, Q19, Q20 | belum |
| LB-02 | `hitung.py` Bab 2 sampai 5 dan usulan temuan (ALGORITMA 4 sampai 7, 9) | `pipa-data` | `validasi-model` | LB-01 | belum |
| LB-03 | `rakit.py --potong` dan `--periode bulanan` (baca produksi, lapis Siklus tahun lalu, unggah R2), uji data nyata Oktober 2026 (RENCANA-UJI 5) | `pipa-data` | `validasi-model` | LB-02, Q3 | belum |
| LB-04 | Bab 7.1 peluang dan indeks ENSO, Bab 4.4 hujan ke depan (ALGORITMA 6, 8), banding dengan contoh Oktober | `pipa-data` | `validasi-model` | LB-03, Q12, Q14 | belum |
| LB-05 | Halaman cetak A4 bulanan dari fixture: CSS token dan komponen, sampul sampai lampiran, tanda air draf; modul `laporan_berkala_hitung.js` (format, ALGORITMA 10, 11) | `layar-peta` | `selera-angka`, `inp-reviewer` | LB-01, Q4, Q5, Q6, Q13, Q17, Q21 | belum |
| LB-06 | Layar isian: jenis ketiga "Laporan Berkala", pemilih periode dan kode (bulanan dulu), kartu per bab, kolom staf dan bentuk isian yang muat batas `bersihIsi`, kelengkapan, pengingat sebelum keluar | `layar-peta` | `selera-angka`, `inp-reviewer` | LB-05, Q15, Q18 | belum |
| LB-07 | Migrasi tabel `laporan_berkala` (kolom `periode`, `kode`, CHECK pola per periode), trigger, dan jejak; `src/laporan_berkala.js` (draf, angka, Bekukan, cetak, jejak), baris rute di `src/worker.js`; uji I1 sampai I9e (termasuk I1b, I2b), I11, I12 | `warga-api` | `migrasi-idempoten`, `guard-api`, `security-reviewer` | LB-03, LB-05, Q1 | belum |
| LB-08 | Foto: kode ulang di peramban, rute unggah dan baca, kredit dan izin media; uji I10 | `warga-api` (rute), `layar-peta` (layar) | `security-reviewer` | LB-07, Q7 | belum |
| LB-09 | `kegiatan.py` panen siaran pers bnpb.go.id; pemilih dan penggolong kegiatan Bab 6, Lampiran tautan | `pipa-data`, `layar-peta` | `security-reviewer` | LB-07, Q8, Q16 | belum |
| LB-10 | `berkala.yml` (potongan harian, jendela rakit tiap periode ALUR 1, dispatch dengan `periode` dan `kode`); beda versi di layar (F-8); susun laporan November 2026 bersama pemilik di localhost:8800 | `mekanik-mesin`, `layar-peta` | `higiene-repo`, pemeriksa bersih | LB-03 sampai LB-09, Q11 | belum |
| LB-11 | Harian dan mingguan: varian hitung ALGORITMA 12 (rentang, riwayat 14 hari dan 8 minggu, pembanding, prakiraan dari `prediksi.json` +1 dan `tangga.json` bila ada), halaman cetak ringkas, pilihan Harian dan Mingguan di pemilih periode, kelengkapan per periode; uji H15 sampai H18, H21, L4b, L13 | `pipa-data` (hitung), `layar-peta` (layar) | `validasi-model`, `selera-angka`, `inp-reviewer` | LB-07, LB-10, Q23, Q24, Q25, Q26, Q27 | belum |
| LB-12 | Tahunan: hitung ulang setahun dari DIBI terbaru dan lampiran selisih lawan versi beku bulanan (D13), riwayat 10 tahun dari `dibi_kab_tahun.json`, luas perkiraan berdampingan dengan `luas_resmi.json` dan `luas_satelit.json`, rekap kegiatan 12 bulan, halaman cetak tahunan; uji H19, H20 | `pipa-data` (hitung), `layar-peta` (layar) | `validasi-model`, `selera-angka` | LB-11, paling sedikit satu versi beku bulanan, Q23 | belum |

Catatan urutan: bulanan dibangun lebih dulu karena punya contoh nyata (Oktober 2026); harian dan mingguan (LB-11) dan tahunan (LB-12) memakai mesin yang sama dan hanya menambah varian. Potongan harian (`rakit.py --potong`, LB-03) dan `berkala.yml` sebaiknya jalan secepatnya supaya status surut dan deret karhutla November 2026 tertangkap utuh; bila LB-10 belum siap, jadwal potongan boleh dipasang lebih dulu sebagai bagian LB-03.

## Rincian

### LB-00 Daftarkan modul

Berkas: `AGENTS.md` (baris peta modul), `scripts/agents/roster.json`, `package.json`, keluaran `npm run agents:build`. Bukti: `npm run uji:agen` hijau; `npm run uji:berkala` jalan (boleh kosong).

### LB-01 Hitung Bab 1

Berkas: `scripts/berkala/hitung.py`, `tests/berkala/fixtures/*`, `tests/berkala/kontrak.test.mjs`. Uji H1 sampai H6, H12, H13. Bukti: `python3 -I scripts/berkala/hitung.py uji`; `node --test tests/berkala/kontrak.test.mjs`.

### LB-03 Rakit dan uji data nyata

Berkas: `scripts/berkala/rakit.py`. Impor `put/get` dari `scripts/siklus/gudang.py`, tidak menyalin. Laporan tiket memuat tabel angka rakit lawan contoh Oktober 2026 (RENCANA-UJI 5) dengan sebab tiap selisih. Bukti: `python3 -I scripts/berkala/rakit.py --periode bulanan --kode 2026-10 --lokal <folder>`.

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
