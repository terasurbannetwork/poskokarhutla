# Turunan logbook Pusdalops: tujuh produk

Tanggal: 1 November 2026. Status: disetujui pemilik ("gas" untuk ketujuhnya).

Sumber: `data/raw/logbook/arsip/*/baris.jsonl` dan `kejadian.jsonl` (2011–2026, tidak di git, salinan di R2
`internal/pusdalops-logbook/logbook_arsip.tar.gz`). Kunci wilayah `prov|nama` sama dengan
`public/data/logbook_riwayat.json`. Tahun dasar = `tahun_penuh` di berkas itu (tiap bulan >= 25 hari).
Angka korban dan rumah rusak tidak dipakai. Nama orang (petugas piket, penginput, korban) tidak pernah keluar.

## Publik (agregat, tanpa teks bebas) — `scripts/data/logbook_turunan.py`, pengerja `pipa-data`

| No | Berkas | Isi |
| -- | ------ | --- |
| 1 | `public/data/bnpb/logbook_kebutuhan.json` | kategori kebutuhan bantuan dan peralatan dikerahkan, per jenis, per kab x bulan (tahun dasar), dan nasional |
| 3 | `public/data/bnpb/logbook_jam.json` | sebaran jam kejadian (waktu setempat, 24 kotak) per jenis, nasional dan per provinsi |
| 4 | `public/data/bnpb/logbook_terlibat.json` | kategori pihak terlibat (BPBD, TNI, Polri, Basarnas, PMI, Tagana, relawan/ormas, dunia usaha, K/L) per jenis x kab |
| 5 | `public/data/bnpb/desa_langganan/<prov>.json` | desa/kelurahan x jenis: tahun_ada per bulan (tahun dasar), jumlah kejadian |

## Internal (R2 `internal/pusdalops-logbook/turunan/`, layar staf lewat rute ber-`stafOK`) — `scripts/data/logbook_internal.py`, pengerja `pipa-data`

| No | Berkas | Isi |
| -- | ------ | --- |
| 2 | `rapor_bpbd.json` | per kab dan prov: n kejadian, median jeda kejadian -> laporan pertama, median lama pertama -> terakhir, % kejadian dilaporkan sekali, kelengkapan isian |
| 6 | `rekomendasi.json` | topik rekomendasi berulang per kab (kategori kata kunci), tahun muncul; tanpa teks asli |
| 7 | `latih/` | pasangan teks sel -> medan terurai untuk melatih/menguji pengurai laporan WA ke format logbook baku (pengerja `wa-bot`) |

Rute staf (pengerja `warga-api`): `GET /api/logbook/turunan/:nama` membaca R2 di atas, `stafOK(pusdalops|koordalops|pimpinan)`.
Layar (pengerja `ruang-bnpb`): kebutuhan masuk halaman Siaga; jam, terlibat, desa langganan, rapor, rekomendasi di `/bnpb/logbook`.

## Tambahan 1 Nov 2026 (pemilik: "gas"): lima turunan baru

Semua memakai tahun dasar yang sama, kunci wilayah `prov|nama`, tanpa angka korban/rumah rusak, tanpa nama orang.

| Huruf | Berkas | Skrip | Isi |
| ----- | ------ | ----- | --- |
| A | internal `serupa_<kodeprov2>.json` (satu per provinsi) | `logbook_internal.py` | per kab x jenis, kejadian lampau (semua tahun, `dasar` menandai tahun dasar), terbaru dulu, maks 40: id, mulai, hari_dilaporkan, hari_selesai, kategori kebutuhan/bantuan/alat/pihak, kronologi ≤240, upaya ≤240, kondisi_terakhir ≤160 (disamarkan: nama setelah Bapak/Ibu/Sdr, nomor telepon). Staf saja. |
| B | internal `penanganan.json` | `logbook_internal.py` | per kab/prov/nasional x jenis (tahun dasar, n ≥ 5): n, n_selesai, median, p75 hari ke entri `kondisi` pertama yang menyebut padam/surut/selesai/tertangani/teratasi/tuntas tanpa penyangkal, tak_selesai_pct. |
| C | publik `bnpb/logbook_susulan.json` | `logbook_turunan.py` | pasangan banjir>longsor, cuaca>banjir, cuaca>longsor, banjir>banjir, gempabumi>longsor; jendela 0-3 hari (jenis sama 1-3) di kab yang sama; laju, pembanding (hari acak, kab dan bulan-dalam-tahun sama), lift, ci95 Poisson. Deskriptif, bukan ramalan. Karhutla tidak dipasangkan. |
| D | publik `bnpb/logbook_omc.json` | `logbook_turunan.py` | kejadian dan operasi OMC (2025-2026): provinsi, mulai/selesai, tujuan (kata kunci), dan untuk karhutla titik panas FIRMS provinsi 7 hari sebelum/selama/7 hari sesudah (cache `data/raw/logbook/titik_kab_2025/2026.json` dari `uji_logbook_karhutla.titik_tahun`). Perbandingan, bukan bukti pengaruh. |
| E | publik `bnpb/logbook_kebutuhan.json` | `logbook_turunan.py` | kunci baru `n_tahun_dasar`, `catatan_prov_bulan`, dan `jenis.<j>.prov_bulan[kode_prov2][kunci][12]` (rata-rata kejadian per bulan per tahun dasar). Kunci lama tidak berubah. |

Batas yang diketahui: `hari_selesai` hanya terisi bila petugas menulisnya di kolom kondisi; banjir ~33% kejadian, karhutla ~33%, longsor/cuaca/kebakaran permukiman di bawah 10%, jadi rapor lama penanganan bermakna untuk banjir dan karhutla saja. Pencatatan OMC di logbook berhenti sekitar 30 Jun 2026.

### Revisi 1 Nov 2026 setelah ulasan

- Susulan: blok utama kini hari 1-3 (pembanding juga 1-3 hari) untuk semua pasangan; `hari0` = jenis kedua pada hari yang sama (jenis beda saja, sebagian satu laporan gabungan). `ci95` = bootstrap blok kab-tahun (500 ulangan, benih tetap, pembanding dianggap tetap; `ci_metode` di tingkat atas). Sel kab butuh n >= 10 dan k >= 5; jangan mengurutkan kab menurut lift (perbandingan berganda).
- OMC: `terpotong` (berakhir dalam 7 hari terakhir pencatatan, `henti_catat` dideteksi dari data) mengosongkan `titik_panas`; `titik_panas.pembanding_tahun_lain` = rata-rata per hari jendela kalender yang sama di tahun lain.
- Penanganan: `median_dilaporkan`, `p75_dilaporkan`, `n_tak_selesai`, `layak_median` (n_selesai >= 30 dan tak_selesai_pct <= 90).
- serupa: penyamaran diperluas (honorifik, a.n./bernama, nama sebelum umur, umur, RT/RW, dusun bila ada nama/umur); `main` memeriksa seluruh keluaran dengan `cek_bocor` dan gagal bila ada sisa.
