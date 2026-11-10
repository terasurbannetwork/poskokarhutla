# TIKET: Silang Sumber (SS-*)

Status per 10 Nov 2026. Ambil satu tiket, kerjakan hanya cakupannya. Pengulas dipilih dari kolom "bisa" katalog agent, tidak pernah pengerja yang sama (AGENTS.md 3.2). Tidak ada tiket yang menyentuh `public/prediksi/**` atau `scripts/prediksi/**`.

| ID | Tiket | Cakupan | Pengerja | Pengulas | Status |
| --- | --- | --- | --- | --- | --- |
| SS-01 | Paket dokumen `data/kajian-bnpb/silang-sumber/` | folder ini | agent | - | selesai |
| SS-02 | F1: pembaca arsip prakiraan dan kejadian, pasangan beku, `dilewati`, `dibuang` | `scripts/bnpb/silang/rapor_sumber.py` (bagian baca) | ruang-bnpb | validasi-model | belum dimulai |
| SS-03 | F1: tabel a b c d, POD FAR CSI ETS, gerbang n, selang Wilson, pembanding, arsip skor | `rapor_sumber.py` (hitung), `public/data/bnpb/rapor_sumber*` | ruang-bnpb | validasi-model | setelah SS-02; angka tampil butuh arsip 30 hari |
| SS-04 | F1: layar `/bnpb/rapor-sumber` | `public/bnpb/rapor-sumber.*` | ruang-bnpb | selera-angka, inp-reviewer | setelah SS-03 |
| SS-05 | F1: uji dan gerbang | `tests/bnpb/silang_rapor.test.mjs`, `tests/agen/gerbang-silang.test.mjs` | penulis-gerbang | validasi-model | bersama SS-03 |
| SS-06 | F1: ubah baris DB-09 di `docs/TIKET-DATA-BMKG.md` menjadi rujukan SS-02 sampai SS-05 | satu baris | ruang-bnpb | higiene-repo | setelah SS-05 |
| SS-07 | Langkah jadwal harian F1, F3, F5, F6 di workflow | `.github/workflows/**` | mekanik-mesin | - | usulan, setelah masing-masing skrip lulus uji |
| SS-10 | F2: kamus 60 zona ke kabupaten/kota, `sebagian`, `belum_dipetakan` | `scripts/gempa/tsunami_zona.py` (kamus), `zona_tsunami_kamus.json` | gempa | validasi-model | belum dimulai |
| SS-11 | F2: tingkat tertinggi per kabupaten dan eksposur (penduduk, sekolah, faskes, evakuasi) dari berkas yang ada | `tsunami_zona.py` (kabupaten), `tsunami_zona.json` | gempa | selera-angka | setelah SS-10 |
| SS-12 | F2: urai pengukuran muka air dari teks `judul`, garis waktu buletin | `tsunami_zona.py` (ukur, waktu) | gempa | validasi-model | setelah SS-10 |
| SS-13 | F2: tab Tsunami zona di `/gempa` | `public/gempa/tsunami_zona.js`, bagian `index.html` | gempa | selera-angka, inp-reviewer | setelah SS-11 |
| SS-14 | F2: pemutar ulang 5 kejadian arsip, label latihan | `tsunami_zona.js` (pemutar) | gempa | inp-reviewer | setelah SS-12 |
| SS-15 | F2: uji | `tests/gempa/silang_tsunami.test.mjs` | penulis-gerbang | gempa | bersama SS-10 |
| SS-20 | F3: berkas peta peringkat dan `beda_sumber.py`, keluaran, arsip | `scripts/bnpb/silang/beda_sumber*`, `public/data/bnpb/beda_sumber*` | ruang-bnpb | validasi-model | belum dimulai |
| SS-21 | F3: kartu "Beda sumber hari ini" di `/bnpb/silang` | `public/bnpb/silang.js`, `.css` | ruang-bnpb | selera-angka | setelah SS-20 |
| SS-22 | F3: uji | `tests/bnpb/silang_beda.test.mjs` | penulis-gerbang | validasi-model | bersama SS-20 |
| SS-30 | F4: jendela kirim bantuan. Dirujuk, tidak dikerjakan di paket ini | `data/kajian-bnpb/logpal/TIKET.md` baris LG-14 | warga-api (LG-14) | - | mengikuti LG-14: menunggu data bandara dan maritim tayang |
| SS-40 | F5: pilih dan siapkan sumber baseline riwayat | `scripts/gempa/beruntun.py` (baseline) | gempa | validasi-model | selesai 10 Nov 2026: Q1 dijawab (USGS M 4,5+); `beruntun_baseline.json` dibuat dari katalog USGS lokal |
| SS-41 | F5: Mc, laju, sasaran gunung api, mode relatif | `beruntun.py`, `beruntun_sasaran.json` | gempa | validasi-model | selesai 10 Nov 2026: sasaran 69 gunung api, laju historis M 4,5+, 5 sasaran laju nol |
| SS-42 | F5: statistik kejutan terkoreksi, keluaran, arsip | `beruntun.py`, `public/gempa/data/beruntun*` | gempa | validasi-model | selesai 10 Nov 2026: Poisson terkoreksi, keluaran dan arsip append-only per (tanggal, mode) |
| SS-43 | F5: kartu Beruntun di `/gempa` | `public/gempa/` | gempa | selera-angka, inp-reviewer | selesai kode 10 Nov 2026: kartu Beruntun di tab Insight; menunggu pemeriksaan browser dan selera-angka |
| SS-44 | F5: silang MAGMA dan uji | `beruntun.py` (magma), `tests/gempa/silang_beruntun.test.mjs` | gempa, penulis-gerbang | gunungapi-kering | selesai kode 10 Nov 2026: kolom MAGMA terpisah (level dan kegempaan 7 hari); uji `tests/gempa/silang_beruntun.test.mjs`; menunggu gunungapi-kering |
| SS-50 | F6: `kalender_ancaman.py` dan `kalender_ancaman.json` | `scripts/umum/kalender_ancaman.py`, `public/data/kalender_ancaman.json` | pipa-umum | validasi-model | belum dimulai |
| SS-51 | F6: kartu kalender 12 bulan di profil daerah | `public/kemitraan/**`, `scripts/umum/profil_wilayah.py` (baca saja) | kampus | selera-angka | setelah SS-50 |
| SS-52 | F6: pemakaian di laporan | skrip laporan terkait (ditunjuk saat tiket dibuka) | pemilik skrip itu | selera-angka | setelah SS-50 |
| SS-53 | F6: uji | `tests/bnpb/silang_kalender.test.mjs` | penulis-gerbang | pipa-umum | bersama SS-50 |

Jumlah: 26 tiket (1 selesai, 1 dirujuk ke LG-14, 1 menunggu pemilik).
