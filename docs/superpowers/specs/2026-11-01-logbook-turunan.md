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
