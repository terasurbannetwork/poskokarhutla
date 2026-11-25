# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute API dan hak, tabel D1, dan penyimpanan R2.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `public/bnpb/bnpb.css` | gaya bersama kelas `bn-*`; halaman tanpa skrip atau gaya inline (CSP) |
| `public/bnpb/dalops.{html,js,css}`, `dalops_hitung.js` | layar dan fungsi murni Pantau Dalops |
| `public/bnpb/dalops_karhutla.js`, `dalops_gunungapi.js`, `dalops_laporan_masuk.js`, `dalops_tren.js`, `dalops_ekspor.js`, `dalops_lifeline.js`, `dalops_lapor.js`, `dampak_radius.js`, `rekon_tiga.js` | tab dan kartu Dalops |
| `public/bnpb/logbook.js`, `dokumen*.js`, `bahan*.js`, `operasi*.js`, `perencanaan*.js`, `siaga.js` | layar staf Pusdalops |
| `public/bnpb/data_bencana*.js`, `dibi_tren.*` | Data Bencana Indonesia dan tren DIBI |
| `public/bnpb/inarisk*.{html,js,css}` | cermin InaRISK (hitung, detail, ikd, gis, unduh, simulasi, spab) |
| `public/bnpb/silang.*`, `rapor-sumber.*` | kajian silang sumber dan rapor |
| `public/bnpb/alun-alun.*`, `public/admin/alun.*` | forum dan moderasi |
| `public/bnpb/pimpinan.js`, `public/inti/dasbor_pimpinan.js`, `public/admin/pimpinan.js` | dashboard pimpinan |
| `public/bnpb/index.html`, `pintu.js`, `sitrep.*`, `risiko.*`, `kebutuhan.*`, `kebakaran.*`, `kinerja.*`, `hukum.*`, `katalog-dokumen*` | halaman pintu, sitrep, risiko, kebutuhan, kebakaran, kinerja, hukum, katalog |
| `src/bnpb.js` | rute halaman, `halamanBnpbPublik` dengan CSP, `laju` (batas laju), `kodeBaru`, `pemegangKode` |
| `src/dalops.js`, `dalops_laporan.js`, `dalops_tindak.js` | rute Dalops, Laporan Masuk, log tindak lanjut |
| `src/inarisk.js`, `src/alun.js`, `src/logbook.js`, `src/sitrep.js`, `src/pb_ringkas.js`, `src/laporan_bnpb.js`, `src/hukum.js`, `src/katalog_dokumen.js` | rute modul masing-masing |
| `scripts/data/dalops_banjir.py`, `dalops_kabar.py` | bahan Dalops dan cek kabar luar |
| `scripts/bnpb/katalog_dokumen.py`, `templat_dokumen.py`, `drone.py` | pembangun indeks katalog (keluaran `data/bnpb/katalog_dokumen.js`), pembuat templat dokumen, dan pengirim misi drone |
| `scripts/bnpb/*.py` | pipeline risiko, prioritas, kebutuhan, perencanaan, siaga, kebakaran, iku, hukum, inarisk, risiko_hvc, terpapar, kerentanan, ikd, rs_kapasitas, puso, rekonsiliasi |
| `scripts/bnpb/silang/` | rapor sumber dan beda sumber |
| `scripts/bnpb/unit/` | pelari dan skor Ruang Unit (belum terhubung) |

Tidak ada di repo (rancangan): `public/bnpb/unit/`, `scripts/berkala/`, `src/laporan_berkala.js`, `public/laporan_berkala*`, `src/alun_instansi.js`, `src/alun_konst.js`, `scripts/siklus/alun_rekap.py`.

## Rute API dan hak

| Metode dan jalur | Hak | Catatan |
| --- | --- | --- |
| GET `/bnpb/dalops` | halaman, perlu masuk | `halamanBnpbPublik` pribadi, boleh dibingkai |
| GET `/api/dalops/<jenis>`, jenis banjir, longsor, karhutla, gempa, cuaca, kekeringan, gelombang, permukiman, gunungapi, udara | `modAtauStaf(PERAN_DALOPS)`, termasuk pemirsa | kunci R2 `dalops/<jenis>.json`, 404 bila belum diunggah, `cache-control: private, no-store` (`src/dalops.js:24`) |
| GET `/api/dalops/laporan`, POST `/api/dalops/laporan/dummy` | sama; dummy hanya Super Admin | kunci R2 `dalops/laporan.json` dan `laporan_dummy.json` |
| GET `/api/dalops/tindak`, GET `/api/dalops/tindak/riwayat?kunci=` | baca: moderator atau staf pusdalops, koordalops, pimpinan | 503 bila migrasi 0128 belum diterapkan |
| POST `/api/dalops/tindak` | tulis: moderator atau staf pusdalops dan koordalops, di wilayahnya, header `x-pb: 1` untuk sesi staf | 201, batas 120 per 10 menit |
| GET `/api/inarisk/unduhan`, `/unduhan/ringkas`, POST `/api/inarisk/dampak`, GET `/api/inarisk/kegiatan/:id/:pcode`, GET `/api/inarisk/ubin/:layanan` | `src/inarisk.js` tidak memeriksa sesi, hanya daftar izin dan batas laju per jaringan: 60 per menit untuk unduhan, dampak, dan kegiatan, 600 per menit untuk ubin | `src/inarisk.js:143` |
| GET `/api/alun`, `/api/alun/:id` | tamu | cache tepi 10 detik, urut dan saring |
| POST `/api/alun`, `/api/alun/balas/:id`, `/upvote/:id`, `/lapor/:id` | tamu (Turnstile untuk tulis dan lapor), pengumuman dan balasan petugas hanya moderator | `src/alun.js:352` |
| POST `/api/alun/terjawab/:id` | moderator atau pemilik utas (header `x-kode`) | |
| GET `/api/alun/admin`, POST `/api/alun/admin/:id` | moderator | tampilkan, sembunyikan, hapus, sematkan, lepas sematan, status, teruskan relawan atau logistik |
| GET `/api/pb/ringkas`, `/api/pb/papan-sk` | admin, staf bersesi, atau pemirsa pusdalops | `src/pb_ringkas.js:101` |
| GET `/api/laporan-bnpb`, POST `/api/laporan-bnpb`, `/baca`, `/urai` | admin, GET juga pemirsa | isi JSON maksimal 98304 byte |
| GET `/api/hukum/cari`, `/api/hukum/dok`, POST `/api/hukum/tanya` | publik berlaju | cari 120 per jam, tanya 8 per jam dan 30 per hari, ditambah plafon global 300 tanya per hari untuk membatasi biaya model (`src/hukum.js:9, 102`) |
| GET `/admin/gakkum` | admin (halaman admin) | Berkas Gakkum: daftar konsesi dengan titik api per provinsi dan cetak A4 per konsesi (`src/bnpb.js:82`, `public/admin/gakkum.js`) |
| GET `/api/bnpb/katalog-dokumen`, `/berkas` | publik | |
| GET `/api/logbook/hari`, `/buka`, `/turunan/:nama`, `/sk/aktif`, POST `/api/logbook/kejadian`, `/:id/entri`, `/:id/tutup`, `/:id/sk` | moderator atau staf pusdalops, koordalops, pimpinan, dibatasi wilayah | `src/logbook.js:495` |
| `/api/pusdalops/pemulihan`, `/lapsus`, `/rollcall`, `/berantai` | staf | `src/pemulihan.js`, `lapsus.js`, `rollcall.js`, `berantai.js` |
| POST `/api/wa/form`, GET `/api/wa/form/terakhir` | staf | `src/wa_form.js` |
| GET `/api/saham/*` | staf | `src/saham.js` |

## Tabel D1 dan migrasi

| Tabel | Migrasi |
| --- | --- |
| `laju_bnpb` (batas laju, dibersihkan cron menit 17, umur lebih dari 2 hari) | 0022 |
| `laporan_bnpb` | 0023 |
| `alun_utas`, `alun_balas`, `alun_suara`; `alun_tautan` | 0024; 0028 |
| `alun_penulis` (label lembaga PM-15 pada utas dan balasan; ditulis `INSERT OR IGNORE`, dibaca lewat `src/hak.js:893-901`) | 0133 (indeks 0144) |
| `alun_wilayah`, `alun_lembaga`, `alun_riwayat`, `alun_tanda` (belum dipakai kode) | 0150 |
| `meja_petugas`, `meja_catatan`, `meja_jejak`, `meja_stok`, `meja_ringkas*` | 0026, dibangun ulang 0110 dan 0118; `meja_pelapor` 0118; `meja_kelengkapan` 0119 |
| `hukum_dok`, `hukum_segmen`, `hukum_relasi` | 0052 |
| `logbook_kejadian`, `logbook_entri`; `logbook_kib`, `logbook_entri_juklak`, `logbook_sk`; `logbook_narasi` | 0088; 0094; 0117 |
| `dl_tindak`, `dl_tindak_log` | 0128 |

Migrasi produksi diterapkan manual oleh pemilik; rute menjawab 503 sampai tabelnya ada.

## Penyimpanan R2

`dalops/<jenis>.json` dan `dalops/laporan.json` (privat); `sitrep/YYYY-MM-DD.json.gz` (arsip masukan sitrep); rancangan: `unit/`, `berkala/<periode>/<kode>/angka/`, `siklus/saji/alun/`. Arsip lokal tidak di git: `data/raw/dalops/cek_arsip.jsonl`, `data/raw/dalops/berita_arsip/`.
