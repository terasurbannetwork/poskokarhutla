# Ilmu layar-peta

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/layar-peta.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca layar-peta`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus layar-peta "..."`.

## Peta berkas & tabel

Semua layar publik = vanilla JS tanpa build step di `public/`, dilayani Workers Static Assets (`wrangler.jsonc` baris 5: `assets.directory ./public`, `html_handling: none`). Tabel D1 bukan wilayahmu (itu warga-api).

**`public/index.html` (~720 KB, satu berkas)** memuat inti peta dalam satu `<script>` inline (baris 1532-6041) plus modul terpisah. Urutan muat: `i18n.js` paling awal di `<head>` (sinkron, menambal `toLocaleString`/`Intl` sebelum modul lain), MapLibre 4.7.1 dari cdnjs, lalu di dasar halaman (baris 6018-6040): `lapisan5, dampak, sim_perlakuan, sebaran_model, cerita_karhutla, insight_sebaran, sim_data, preventif, databaru, informasi, titik_live, citra, konsesi, operasi, ringkasan, sapa, foto` (+`foto.css`), lalu yang `defer`: `bagikan, persetujuan, kaki, jejak, pesan`. Tiap modul punya `.js` (+ `.css` bila perlu) sendiri; `bagi.js/.css` = varian bagikan untuk halaman lain.

**Objek inti di index.html:** `S` (state, baris 1574), `muatData()` (1666), `hitung()` (1693), `Peta` (1710; `geoTitik()` 1811, `aturWilayah()` 1840), `Lapis` (1922, lapisan tambahan dipasang saat pertama dinyalakan), `Angin` (2033, kanvas partikel), `Kini`, `Laci` (laci kompleks, 2533), `Tabel`, `Kp`, `Riwayat` (2951), `Tren` (3015), `Insight` (3244; `ex()`, `pil()`, `hl`, `LABEL`), `PilihCantik` (3575), `rapikanTip` (3610), `paginasi` (3564), `Berita` (3697), `Posko`, `Sarana`, `Sim`. Tab diatur `bukaTab()` (1612) + `TAB_SEMBUNYI` (1640).

**JSON yang di-fetch (lewat `muatJSON`, `cache: "no-cache"`):** saat awal `data/meta.json, hotspot{24,72}.json (jatuh ke yang lebih besar), kluster_awal.json (jatuh ke kluster.json), fwi.json, bnpb.json, wilayah.json, geo/provinsi.json, daops.json, inarisk.json, bpbd.json, sejarah.json, harian30.json, posko.json`. Malas: `hotspot.json` (7 hari, `muatTitik`, ~10,7 MB) dan `hotspot72.json` saat rentang diperbesar; `riwayat_grid.json` (`Riwayat.muat`); `geo/kecamatan/<prov>.json`. Per modul: `ringkasan.js` -> berita, dampak, akses, keputusan, fwi_ansambel, luas_satelit, musim_awal, penerbangan, ringkasan, udara_rekom; `dampak.js` -> dampak, metar, penerbangan; `operasi.js` -> operasi, operasi_resmi; `preventif.js` -> preventif; `konsesi.js` -> kompleks_konsesi; `citra.js` -> citra; `lapisan5.js` -> akses, asap, fasilitas, iklim, jalan.geojson, kanal, lapisan_tambahan, penduduk, sekolah; `databaru.js` -> asap, fwi_ansambel, hujan_ansambel, peringatan, pusat_kec, tanah (+`/api/asap`); `sapa.js` -> asap, peringatan; `kaki.js` dan `bagikan.js` -> kontak; `cerita_karhutla.js` dan `insight_sebaran.js` -> model_sebaran, sebaran_cerita/kasus/galat/pendorong, prospektif, musim_awal, tren_karhutla; `titik_live.js` -> `/api/titik`; `foto.js` -> `/api/foto`; `pesan.js` -> `/api/pesan`, `/api/warga/konfig`; `jejak.js` -> `/api/jejak`; `statistik_publik.js` -> `/api/publik`.

**Bagikan/OG/i18n/terbit:** `bagikan.js` (gambar bagikan di kanvas; `TATA` baris ~570 = tata letak per templat); `public/og/template.html` + `scripts/og/buat.py` (Chrome headless, keluaran `public/data/og/*.png` + `meta.json`, cap blok `<!-- og -->`; mode `--stempel` tanpa Chrome); `public/i18n.js` + `public/i18n/en.json` + `scripts/i18n/{GLOSARIUM.md,kumpul.mjs,gabung.mjs,laporan.json,splice_i18n.py}`; `scripts/situs/sisip_tentang.py` (menyisip tautan Tentang; jangkar harus cocok TEPAT sekali); `scripts/terbit/versi.py` (di Actions sebelum deploy: `?v=<sha256 isi>` pada script/link lokal, menambah blok immutable ke `_headers`; hasilnya tidak di-commit). `_headers`: CSP masih Report-Only; `/data/*` cache 300 detik + stale-while-revalidate.

**Halaman statis:** `tentang.html` (dimuat iframe `/tentang.html?tertanam=1` di tab Tentang), `privasi.html`. `public/.assetsignore` mengecualikan `warga/`, `_uji_*`, dan data bernama perusahaan.


## Aturan & invarian

1. **Baca JSON apa adanya.** Layar tidak menghitung ulang angka pipeline; skema JSON = kontrak dengan pipa-data/model-sebaran. Mau ubah skema: lapor pemiliknya.
2. **Satu JS + satu CSS per modul**, tanpa bundler. Teks UI ditulis dalam bahasa Indonesia; terjemahan EN lewat `i18n/en.json` (angka di kunci ditulis `{0}`, `{1}`), istilah baru ke `scripts/i18n/GLOSARIUM.md`. Format angka/tanggal cukup `toLocaleString("id-ID")`: `i18n.js` menambalnya jadi `en-GB` saat mode EN.
3. **Semua isi `public/` ikut terbit.** Jangan menaruh data bernama perusahaan (keputusan pemilik 14 Okt 2026), kunci, atau berkas kerja di sana.
4. **Tampilan kartu (memori `gaya-kartu-insight`, 13 Okt 2026):** semua halaman memakai format kartu Insight: pil kategori (`Insight.LABEL`) + judul satu kalimat dengan angka merah (`Insight.hl`) + kontrol segmen (pemilih provinsi di kanan judul) | grafik | kaki: legenda di tengah + `Sumber: ...`. Pakai `Insight.ex`, `Insight.pil`, `rapikanTip`; jangan menulis markup kartu sendiri. DILARANG: subjudul/baris satuan, paragraf catatan, kotak KPI berkepala navy (angka masuk judul kartu). Angka di ujung batang/kolom tabel = label pil (sering berikon); tiap bar chart menampilkan total di atas batang; garis rata-rata = pil navy "rata-rata". Tooltip: pita judul + kolom label/nilai, perubahan naik ▲ merah / turun ▼ hijau, tidak ada tanggal ISO mentah. Panel Overlay = ubin ikon ala Windy, satu baris per kategori, latar putih. Tabel: tidak ada sel dua baris (info sekunder jadi kolom sendiri, huruf lebih kecil), kolom teks rata kiri, daftar panjang dipaginasi (`paginasi()`), BUKAN tombol "Tampilkan N"; judul artikel di tabel = tautan; `<select>` native diganti `PilihCantik`.
5. **Kata terlarang:** jangan menulis "9 provinsi prioritas" di UI; pakai "provinsi yang sering mengalami karhutla". Jangan singkatan "rb" dalam perbandingan.
6. **Fitur yang disembunyikan pemilik DICATAT, tidak dihapus** (memori `fitur-disembunyikan`). Cara yang dipakai: atribut `hidden`, `display:none`, flag (`SPANDUK = false` di `persetujuan.js`, `if (false && ...)`, `TAB_SEMBUNYI`), `splice` dikomentari di `insight_sebaran.js`, `"sembunyi": true` di `data/tim.json`. Fungsi/handler tetap ada supaya bisa dipulihkan. Permintaan "hilangkan" baru = tambahkan baris ke berkas memori itu (berkas + cara memulihkan). Yang kini tersembunyi antara lain: tab Posko(Ajuan)/Ringkasan/Informasi/Kompleks/Metode, banner privasi, tab Ekspor di dialog bagikan, Unduh CSV Tren, kartu Model sebaran "Coming soon", spanduk data basi `#basi`, bagian Tentang (Layanan, Sumber data, Cara kerja data, Cara mengutip), tombol WhatsApp, tombol "Bagikan video" kartu Musim. Lapisan Angin default NYALA (dipulihkan 14 Okt).
7. **Selera dari git log (13-14 Okt):** halaman Tentang bergaya editorial berfoto, label bagian dihapus, kartu Teras Urban tanpa kalimat peran & tautan situs, tagline hero baru; bahasa konsesi netral ("titik panas berada di dalam areal konsesi", bukan tuduhan pembakar); panel provinsi tenang (ubin datar, kepala ala Insight); jumlah posko dihapus dari kartu wilayah di peta; teks putih di batang gelap grafik.
8. **Footer gambar bagikan:** tiap akun resmi (@teras.urban, Teras Urban di LinkedIn) dan situs ditulis terpisah, bukan lima ikon ke situs (5206c30). Caption bagikan: tanpa emoji dan basa-basi.
9. **Klik jangan membekukan layar:** chrome kontrol (pil aktif, `aria-pressed`) di-set langsung, kerja berat lewat `nanti()` (index.html:1543). Detail ada di agent `inp-reviewer`.
10. Sebelum menyunting: `git status --porcelain <berkas>`; sesi lain bisa menyunting `index.html` bersamaan.


## Ranjau yang pernah meledak

- **Salinan " 2" iCloud/Finder.** Commit `b6f645f` ("gas", 14 Okt) ikut membawa 39 berkas `* 2.*` (mis. `public/bagikan 2.js`, `ringkasan 2.js`, `_headers 2`, `data/hotspot 2.json`). Karena seluruh `public/` diterbitkan, salinan basi ikut tersaji. Dibersihkan di `3b90271` (15 Okt); `.gitignore` kini menolak `* 2` dan `* 2.*`. Jangan menyunting atau memuat berkas bernama begitu; yang benar adalah berkas tanpa " 2".
- **`$q is not defined`**: `rekamVideo` di `cerita_karhutla.js` memakai `$q` di luar IIFE saat tombol "Bagikan video" dipulihkan (memori fitur-disembunyikan). Fungsi yang dipulihkan harus diuji, bukan sekadar `hidden` dilepas.
- **`peta.setStyle` tanpa `{diff: false}`** membuang semua lapisan data tanpa memicu `style.load` (komentar di `Peta.gantiDasar`, baris ~1722). Selalu `diff: false`.
- **Menunggu `load` peta** tertahan ubin lambat; `Peta.init` menunggu `style.load`.
- **Edit `index.html` bersamaan oleh sesi lain** menimpa pekerjaan; berkas 720 KB, jangkar edit harus unik. `sisip_tentang.py` sengaja berhenti bila jangkar tidak tepat sekali.
- **Data BNPB bertipe campur** (number atau teks "22.790,83"): selalu lewat `angkaID()` (baris 1570).
- **`TAB_SEMBUNYI` menyembunyikan tombol, bukan halaman**: `/kompleks` dialihkan ke Insight (`#insightKompleks`); `/metode` masih bisa dibuka lewat URL.
- **Cache JS/CSS**: `versi.py` hanya memberi `immutable` pada berkas yang TIDAK pernah dimuat tanpa `?v`; memuat berkas sama tanpa versi di tempat lain membatalkannya. `pesan.js?v=1014c` ditulis tangan di index.html.
- **Teks "9 provinsi prioritas" masih tersisa** di `index.html` ~3535 (judul kartu kecamatan), ~4825 (batas metode), dan atribut `title="Provinsi prioritas"` (~2227): melanggar aturan 5, belum dibereskan saat ilmu ini ditulis.


## Gerbang yang menghakimi

- Tidak ada build/lint untuk layar. Bukti = browser preview (`.claude/launch.json`) + konsol bersih; periksa tab terkait pada lebar 1440 dan 390.
- `node scripts/i18n/kumpul.mjs` (butuh playwright) menjelajahi semua tab ID dan EN lalu menulis `scripts/i18n/laporan.json` (`hilang`, `en_berisi_id`, `campur`); `--uji` memeriksa pengelompok kata.
- `python3 scripts/terbit/versi.py uji` memeriksa pemberi versi; `python3 scripts/og/buat.py --stempel` mengecek cap meta OG tanpa Chrome.
- `npm run agents:check` memastikan definisi agent sinkron dengan `roster.json`; `npm run uji:agen`.
- Pemeriksa sesudahmu (kamu tidak memverifikasi sendiri): `inp-reviewer` (interaksi), `selera-angka` (angka tampil), `higiene-repo` (berkas nyasar sebelum commit).
- Batas mati AGENTS.md §9: tidak auto-deploy; JANGAN commit.


## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode `public/index.html`, modul `public/*.js`, `scripts/{og,i18n,situs,terbit}`, git log `public`, dan memori pemilik (gaya-kartu-insight, fitur-disembunyikan). Dicatat: penyembunyian lewat flag/hidden, bukan hapus; salinan " 2" terbit karena seluruh `public/` jadi aset; sisa teks "9 provinsi prioritas" di index.html.
- 2026-10-15 · Lapisan raster tanpa fitur: hover lewat peta.on('mousemove') + cari sel; tooltip wil-fill menimpa kecuali dijaga flag tip._pf (pola tip._kl).
- 2026-10-16 · Sapuan teks tampil lewat skrip: terapkan regex yang sama ke kunci public/i18n/en.json (baris per baris, kunci saja) supaya terjemahan tidak putus; lewati baris komentar; koordinat lat/lon dan SVG toFixed sengaja dibiarkan titik.
