# TIKET: Kabar Alun-alun (KA-*)

Kerjakan urut. Tiap tiket hanya cakupannya. Bukti siap = perintah di RENCANA-UJI yang disebut. Pertanyaan terbuka tidak dijawab dengan karangan.

| Tiket | Cakupan | Pengerja | Bukti siap | Menunggu |
| --- | --- | --- | --- | --- |
| KA-00 | Daftarkan pemilik berkas: `tests/alun-kabar/**` ke `penulis-gerbang` dan `scripts/data/alun_kabar.py`, `public/data/alun/**` dan `public/lapor/alun_kabar.js` ke `pipa-data` dan `layar-peta` di `scripts/agents/roster.json`, `npm run agents:build`; bagian "baca dulu, baru bangun" di AGENTS.md §2 untuk `data/kajian-bnpb/kabar-alun/`; catat `layar-peta` memegang bagian Alun-alun di `public/lapor/**` | mekanik-mesin | `npm run uji:agen` (termasuk `gerbang-paket-modul` dan `gerbang-ilmu-agent`) | |
| KA-01 | `alun_kabar.py`: baca `data.json`, kunci kejadian, peta jenis, daftar izin kolom, angka `null`, `--cek` P3, P4, P8, P10, P11, P13, P14 | pipa-data | `--cek` | KA-00 |
| KA-02 | Pasang `kab_kode` dan titik lewat `Geo.pusat`; kejadian tanpa kecocokan persis berlabel; uji integrasi 25 Nov 2026 | pipa-data | `--cek` P1, P2; uji integrasi nyata | KA-01 |
| KA-03 | Berita: panggil `cocok()` dan `BERKAS` dari `dalops_kabar.py`, 5 terbaru, `n_berita`, `catatan` | pipa-data | `--cek` P5, P6, P7, P12 | KA-02 |
| KA-04 | `lap_terakhir`, `cutoff_terakhir`, `selesai_lama` (7 hari, Q6 bawaan), pembaca hari ke belakang dengan glob, baris pemanggil di `jalan.py` hari itu (Q3 bawaan), `public/data/alun/` di `.gitignore` dan `data/alun/` di `public/.assetsignore` | pipa-data, mekanik-mesin | `--cek` P9, P14, P15, P16; N10 | KA-03; Q2, Q3 |
| KA-05 | Langkah pertama: periksa nilai nyata `waktu` dan `dampak` dari `GET /api/lapor/alun` di produksi dan tulis temuannya di ALGORITMA 4 (sampai itu `waktu` tanpa awalan tanggal ISO tidak menempel). Lalu `public/lapor/alun_kabar.js` (`gabung`, `teksKartu`, murni tanpa DOM) dan N1 sampai N5, N9, N12 | layar-peta | `node --test tests/alun-kabar/*.test.mjs` | KA-04 |
| KA-06 | Layar Alun-alun: muat `kabar.json`, titik di peta, kartu kejadian `.ex.ex-std` empat pita memakai `teksKartu`, saringan status termasuk Selesai, kesegaran per kejadian; teks lewat `bahasa-indonesia-plain`; panduan `modern-web-guidance` dirujuk dulu | layar-peta | N6, N7, N8, N11; tangkapan layar desktop dan HP; `inp-reviewer`, `selera-angka`; tinjau `http://localhost:8800/lapor/` | KA-05 |
| KA-07 | Pita Media sosial "Belum tersambung" dan teks penjelasan; tidak ada unggahan atau angka | layar-peta | N9, P13 | KA-06 |
| KA-08 | Sambung medsos sesuai jalur yang dipilih (jumlah per kejadian dan tautan pencarian saja) | pipa-data | uji P11 tetap hijau; telaah Biro Hukum untuk jalur pihak ketiga | Q1 |
| KA-09 | Terbitkan kabar resmi: hapus baris `data/alun/` dari `public/.assetsignore` dan `public/data/alun/` dari `.gitignore`, perbarui N10 dan KEAMANAN-PRIVASI | mekanik-mesin | `npm run uji:agen`; pemilik meninjau | selesai 26 Nov 2026 (K5) |
| KA-10 | Portal resmi (BMKG, PVMBG, BPBD) sebagai sumber berita tambahan | pipa-data | artikel cocok dari sumber baru, tanpa mengubah `cocok()` | Q5 |
| KA-11 | Peringatan dini dan status gunung api ikut tampil | pipa-data, layar-peta | belum dirinci | Q7 |

## Catatan

- KA-01 sampai KA-04 bisa satu commit bila semua `--cek` hijau.
- Perubahan nama tab (Q4) tidak jadi tiket; bila dijawab, jadi tiket baru.
- Sesudah KA-06 tayang di localhost, pemilik meninjau sebelum Q2 dijawab.
