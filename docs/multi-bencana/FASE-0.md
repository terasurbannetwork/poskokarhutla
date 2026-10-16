# Fase 0: fondasi bersama

Wajib selesai sebelum bencana ketiga (gempa) mulai ditulis. Tiap tahap berdiri sendiri, punya
bukti selesai, dan bisa di-deploy tanpa menunggu tahap berikutnya. Urutan disusun supaya situs
tidak pernah rusak di antara dua tahap.

## Tahap A: registry dan menu (risiko rendah, dampak langsung terlihat)

| # | Kerja | Berkas | Bukti selesai |
| --- | --- | --- | --- |
| A1 | Buat `public/bencana.json` berisi karhutla (`aktif`, `warisan`), banjir (`warisan`; `aktif` atau `uji` menurut keputusan pemilik butir 6 di ARSITEKTUR), dan entri gempa/gunungapi/cuaca berstatus `mati` | `public/bencana.json` | Uji skema registry hijau |
| A2 | `public/inti/kepala.js` merender menu bencana dari registry; hanya bencana `aktif` tampil; di ≤ 640 px menu bencana ada di burger `#burger` (seperti sekarang di karhutla) | `public/inti/kepala.js`, `public/index.html`, `public/banjir/index.html`, `public/tentang.html` (tiga halaman yang punya `details.bencana`) | Menu sama persis di tiga halaman (cek DOM otomatis); 375 px: bencana muncul di burger |
| A3 | Hapus semua entri "Coming Soon" (WEBSITE.md §2) | idem | Tidak ada teks "Coming Soon"/"Segera" untuk bencana di `public/**` |
| A4 | Kartu bencana di `/tentang` dari registry; perbaiki ikon yang bergeser satu posisi | `public/tentang.html` atau splice | Tangkapan layar: ikon cocok dengan bencananya |
| A5 | `tests/agen/gerbang-bencana.test.mjs` butir 1–2 | `tests/agen/` | `npm run uji:agen` hijau |
| A6 | Pengerja `inti-layar` dan `pipa-umum` masuk roster; `milik` agen lama disunting supaya tidak ada berkas berpemilik ganda (ARSITEKTUR §9) | `scripts/agents/roster.json` | `gerbang-ilmu-agent` hijau |
| A7 | `sitemap.xml`, `robots.txt`, `llms.txt` (belum ada sama sekali) dibangkitkan dari registry; `noindex` untuk bencana `uji` disuntik `terapkanOg` | `scripts/umum/bencana.py`, `src/worker.js`, `src/og_meta.js` | Uji rute: berkas ada; halaman `uji` membawa meta robots |
| A8 | `src/bencana.generated.js` dibangkitkan dari `public/bencana.json` + gerbang kesamaan | `scripts/umum/bencana.py js`, `tests/agen/gerbang-bencana.test.mjs` | Gerbang butir 8 hijau |

## Tahap B: pustaka pipeline bersama

| # | Kerja | Berkas | Bukti selesai |
| --- | --- | --- | --- |
| B0 | Uji jangkauan sumber dari runner Actions dan dari Worker: BMKG (UA lengkap), MAGMA, USGS, GDACS, ArcGIS BNPB. Workflow sekali jalan `cek-sumber.yml` (manual), hasil per host ke log | `.github/workflows/cek-sumber.yml`, `scripts/umum/cek_sumber.py` | Tabel 200/403 per host per jalur; bila BMKG diblok dari Actions, jalur BMKG dipindah ke cron Worker sebelum modul gempa dimulai |
| B1 | `scripts/umum/wilayah.py` jadi satu-satunya salinan; `scripts/data/wilayah.py` dan `scripts/banjir/wilayah.py` jadi pembungkus impor satu baris, lalu dihapus setelah semua impor diganti | `scripts/umum/`, `scripts/data/`, `scripts/banjir/` | `grep -r "def Poligon"` hanya satu hasil; semua `uji` hijau |
| B2 | `jaring.py`, `simpan.py`, `waktu.py` dari `scripts/banjir/umum.py` + pola karhutla | `scripts/umum/` | Banjir dan karhutla memakai `simpan_json` yang sama; `dibuat` selalu kunci pertama |
| B3 | `uji.py` (kerangka self-check) | `scripts/umum/uji.py` | Dipakai minimal satu skrip karhutla dan satu banjir |
| B4 | Pindah data lintas bencana ke `public/data/umum/`: `peringatan.json`, `pusat_kec.json`, `iklim.json`; lama ditinggalkan sebagai salinan sementara sampai semua pembaca pindah | `scripts/banjir/peringatan.py`, `posko.py`, `public/informasi.js`, `public/databaru.js`, `sapa.js` | Lapor Warga karhutla tidak lagi membaca `banjir/data/` |
| B5 | `inarisk.py` dan `dibi.py` dari `scripts/banjir/bahaya.py` + `kejadian.py`, keluaran semua jenis bahaya ke `public/data/umum/` | `scripts/umum/` | Banjir membaca dari umum; jumlah baris DIBI sama sebelum/sesudah |
| B6 | `status.py`, `riwayat.py`, `posko.py`, `ujibalik.py`, `prospektif.py` umum; karhutla dan banjir dipindah satu per satu | `scripts/umum/` | Keluaran JSON identik byte demi byte sebelum/sesudah pemindahan (uji pembanding) |
| B7 | `berita.py` umum dengan kueri disuntik; karhutla tetap identik | `scripts/umum/berita.py` | Label uji karhutla: akurasi tidak turun |

## Tahap C: worker dan D1

| # | Kerja | Berkas | Bukti selesai |
| --- | --- | --- | --- |
| C1 | Migrasi `0009_rujukan.sql` (ARSITEKTUR §6.1): satu-satunya bangun ulang `laporan`/`foto`/`stat_hari`, dengan anak disalin ke tabel sementara dulu (BUKAN pola 0006 apa adanya: cascade FK akan mengosongkan `kontak`, `suara`, `foto_suka`, `foto_komentar`) | `migrations/` | `migrasi-idempoten` + `security-reviewer` lolos; uji pada salinan data produksi: jumlah baris SETIAP tabel induk dan anak sama sebelum/sesudah, trigger utuh, `PRAGMA foreign_key_check` kosong; ekspor cadangan diambil sebelum produksi |
| C2 | `HTML_RUTE`, regex tab, `SUMBER_STATUS`, `HAL` dibangun dari registry | `src/worker.js`, `src/statistik.js`, `public/statistik_publik.js` | Semua rute lama masih 200; uji rute hijau |
| C3 | Alih `/karhutla/*` → `/*` dan `/banjir/#tab` → `/banjir/<tab>` | `src/worker.js`, `public/banjir/index.html` | Uji alih |
| C4 | Migrasi `0010_kejadian_langsung.sql` + `src/jadwal.js` (pengatur satu menit dengan aturan jatuh tempo dari `jadwal_tugas`, ARSITEKTUR §5.4); dua cron lama tetap sampai C5 | `migrations/`, `src/jadwal.js`, `wrangler.jsonc` | Uji Miniflare: tugas jatuh tempo jalan, tugas yang terlewat satu tick tetap jalan di tick berikutnya, satu tugas gagal tidak menghentikan yang lain |
| C5 | Pindah dua cron lama ke pengatur; `gerbang-wrangler` diperbarui | `wrangler.jsonc`, `tests/agen/gerbang-wrangler.test.mjs` | FIRMS tetap masuk D1 tiap 3 jam di produksi (cek `/api/status`) |
| C6 | `foto.bahaya` + kategori dari tabel rujukan; galeri per bencana `?bahaya=` | `src/foto.js`, `public/foto.js` | `foto.test.mjs` diperluas dan hijau |

## Tahap D: inti layar (strangler)

Tiap baris dipindah dalam commit terpisah. Untuk tiap pemindahan: tangkapan layar desktop dan
375 px sebelum/sesudah di tab yang memakai fungsi itu, `ukur_muat.mjs` tidak naik > 5%.

| # | Modul | Pemakai pertama | Bukti selesai |
| --- | --- | --- | --- |
| D1 | `inti/format.js` (`esc`, `fmt`, `rp`, `rb`, `jamWIB`, `lalu`, `namaProv`) | Banjir, lalu karhutla | Definisi tingkat atas kembar hilang dari kedua HTML |
| D2 | `inti/muat.js` (`muatJSON`, keadaan muat/kosong/galat/luring) | idem | idem |
| D3 | `inti/tema.js` + token CSS bersama (`inti/dasar.css`) | idem | Satu kunci localStorage tema |
| D4 | `inti/tab.js` (banjir pindah dari hash ke URL bersih) | Banjir | Tab banjir punya URL bersih; tautan hash lama dialihkan |
| D5 | `inti/peta.js`, `inti/lapis.js`, `inti/panel.js`, `inti/rentang.js` | Banjir | — |
| D6 | `inti/insight.js`, `inti/tabel.js` | Banjir | Gaya kartu Insight sesuai memori pemilik |
| D7 | `inti/laci.js`, `inti/tren.js`, `inti/posko.js`, `inti/metode.js`, `inti/sapa.js` | Banjir, lalu karhutla | — |
| D8 | `gerbang-inti.test.mjs` dengan daftar pengecualian yang hanya menyusut | `tests/agen/` | Hijau |

## Tahap E: banjir naik kelas (urutan 1 di README)

Isi `docs/multi-bencana/bencana/banjir.md` dengan daftar periksa PAKET-FITUR, lalu tutup
celahnya. Celah yang sudah diketahui dari pemetaan:

| Kode paket | Celah | Rencana |
| --- | --- | --- |
| C21 | Tidak ada Dashboard pimpinan | `public/banjir/ringkasan.js` 6 bagian |
| C17, A33 | Tidak ada Berita | Kueri banjir/longsor/rob di `berita.py` umum |
| C20, A27 | Tidak ada Dampak | Dampak banjir: penduduk tergenang, sekolah, jalan putus, sawah, kerugian |
| C25 | Foto lapangan belum mengenal banjir | Kategori: genangan, arus, longsoran, rob, evakuasi, lainnya |
| A04, C12 | Tidak ada "kejadian aktif" | Kejadian banjir = kecamatan berstatus ≥ Siaga yang bersebelahan, digabung jadi satu kode `B0001`; laci dengan bagian setara karhutla |
| A32 | Tidak ada citra genangan | Sentinel-1 SAR tidak bisa dibaca stdlib dengan mudah: catat "diadaptasi" dengan Sentinel-2 sebelum/sesudah saat awan memungkinkan, atau "tidak berlaku" dengan alasan |
| A03 | Data hanya harian | Peringatan dini BMKG ke `kejadian_langsung` tiap 15 menit |
| C26 | Tidak ada pop-up situasi | Isi: kecamatan naik status, sungai di atas Q5, rob hari ini, peringatan BMKG |
| C02 | Tab hash | Selesai di D4 |
| C28 | OG hanya `/banjir/` | OG per provinsi dan per kejadian |

Setelah semua baris terisi dan ALUR tahap 12 lolos: `"status": "aktif"` untuk banjir.

## Tahap F: utang dokumen

| # | Kerja |
| --- | --- |
| F1 | Tulis dokumen yang dirujuk komentar kode tetapi tidak ada (`CITRA.md`, `DATABARU.md`, `LAPISAN5.md`, `OPERASI.md`, `PREVENTIF.md`, `RINGKASAN.md`, `KONSESI.md`), atau ubah komentarnya |
| F2 | Perbarui `AGENTS.md` §2 peta modul: tambah baris `inti`, `umum`, dan tiap bencana baru |
