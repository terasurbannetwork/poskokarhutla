# Ilmu inti-layar

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/inti-layar.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca inti-layar`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus inti-layar "..."`.

## Peta berkas & tabel

Wilayah: `public/inti/**` dan `public/bencana.json`. Per 16 Okt 2026 KEDUANYA BELUM ADA: lahir di FASE-0 tahap A (registry) dan tahap D (modul inti). Pendaftaran agent mendahului berkas supaya tidak ada berkas yatim tanpa pemilik.

Rencana ada di `docs/multi-bencana/` (bacaan wajib sebelum menulis apa pun):
- `ARSITEKTUR.md` §3 registry, §7.1 daftar modul `public/inti/` (`format, tema, kepala, tab, peta, lapis, panel, rentang, laci, insight, tabel, tren, posko, metode, sapa, muat`), §7.2 halaman bencana `public/<id>/index.html` (kerangka DOM saja, ≤ 400 baris, `<script type="module">`), §7.3 gerbang duplikasi.
- `PETA.md` §2: `public/inti/peta/{dasar,wilayah,kartu,gelembung,lapis,legenda,waktu,kisi,angin,laci,klik,foto,sim}.js`, dipecah dari `public/index.html` karhutla dengan pola strangler; §3 tabel perbedaan per bencana.
- `MODUL-PLUG-AND-PLAY.md`: kelas modul A (colok), B (satu langkah), C (mesin bersama, isi per bencana), D (karhutla saja, tidak dipindah); §2 medan registry tambahan (`bagikan, og, kata, lapisan, berita, prioritas, posko`).
- `FASE-0.md`: A1-A8 (registry, `kepala.js`, sitemap, `bencana.generated.js`), D1-D7 (urutan pemindahan: `format` > `muat` > `tema` > `tab` > `peta/lapis/panel/rentang` > `insight/tabel` > `laci/tren/posko/metode/sapa`).

Batas dengan pemilik lain (glob paling spesifik menang):
- `src/bencana.generated.js` milik `warga-api` (`src/**`); dibangkitkan `scripts/umum/bencana.py js` (`pipa-umum`). Registry-nya milikmu.
- `public/index.html`, `public/banjir/index.html`, `public/*.js` (`informasi.js`, `bagikan.js`, `sapa.js`, `lapisan5.js`...) tetap milik `layar-peta`/`banjir`; kamu memasok modul inti, mereka mengganti definisi kembarnya. Serah-terima lewat orkestrator.
- `public/<id>/` bencana baru milik pengerja bencana itu.

## Aturan & invarian

- Vanilla ES module, tanpa build step. Satu tanggung jawab per berkas.
- `public/bencana.json` sumber tunggal; hanya bencana berstatus `aktif` tampil di menu, `uji` mendapat `noindex`, `mati` tidak dirender.
- Karhutla dan banjir harus tampil identik sesudah tiap pemindahan (tangkapan layar sebelum/sesudah, uji balik). Nol definisi tingkat atas kembar baru.
- Peta: `style.load` bukan `load`; `setStyle(..., {diff:false})`; `fitBounds` dengan padding terukur + maxZoom; `setData`/`updateImage` bukan buang-pasang; warna tema dipanggang saat `addLayer`.
- Klik tidak membekukan layar: chrome kontrol urgent, kerja berat lewat `nanti()` (cek `inp-reviewer`).
- Kartu Insight bergaya label pil, tanpa subjudul/kotak KPI; fitur yang disembunyikan pemilik dicatat, bukan dihapus.
- Peta menjawab sebaran nasional, bukan saringan cakupan kursi.
- Teks lewat `i18n.js`; kata baru masuk `scripts/i18n/GLOSARIUM.md`.

## Ranjau yang pernah meledak

- `public/banjir/index.html` menyalin ~60% inti peta karhutla dengan tangan dan sudah menyimpang (padding tetap 430, tanpa kartu hover, tanpa muat malas lapisan). Itulah alasan inti ada.
- Impor JSON langsung dari `src/worker.js` merusak uji Node dan `wrangler@3`; makanya `bencana.generated.js`.

## Gerbang yang menghakimi

Rencana (belum ada): `tests/agen/gerbang-inti.test.mjs` (nama ekspor inti tidak didefinisikan ulang di `public/<id>/`), `gerbang-inti-peta.test.mjs`, `gerbang-bencana.test.mjs` (kesamaan registry dengan generated). Milik `penulis-gerbang`; ajukan lewat orkestrator. Sekarang: `npm run uji:agen`, `inp-reviewer`, `selera-angka`.

## Kasus
- 2026-10-16 · kepala.js: /tentang lokal wrangler jatuh ke index (pakai /tentang.html untuk uji); rata() buang .html. Menu index lama menandai Banjir 'Coming Soon' padahal registry aktif: kini tautan. Nama registry 'Gempa Bumi & Tsunami' beda dari menu lama 'Gempa & Tsunami'.
- 2026-10-16 · L1 mesin kartu: Insight._leg/_bukaMulti ditulis langsung kode lain (this._leg=, Insight._leg=), jadi penghubung pakai getter/setter ke Kartu. CSS jangan digeser tanpa cek: #tip{max-width:300px} ditimpa #tip{max-width:320px} di bawahnya, keduanya harus pindah berurutan. Bukti identik: Playwright di server statis (maplibre dari cache, gaya peta palsu, Date dibekukan) bandingkan innerText, digest computed style+rect, PNG, 68 tooltip; jumlah galat konsol berfluktuasi di baseline sendiri, bandingkan set pesan. Tip.polaSatu menggantikan regex 'titik panas' di rapikanTip agar inti bebas kata karhutla.
- 2026-10-16 · 2026-10-16 · /semua: adaptor inti/adapter.js digerakkan registry, hanya status bukan mati dimuat (gempa mati = tidak tampil sampai uji/aktif). Port 8788 dkk sering dipakai sesi lain: wrangler gagal bind lalu curl menjawab 404 dari tree orang lain; cek lsof -iTCP:PORT, pakai port bebas. Kunci i18n untuk simpul di samping angka merah ditulis tanpa spasi tepi; angka jadi {0}, dan M 5 ikut jadi token.
- 2026-10-16 · 2026-10-16 · L2 CSS/Bagikan/Sapa lintas bencana: tombol bagikan buatan modul (.bg-ex/.bagi-ex/.ex-bagi) harus DIBUANG, bukan dibiarkan: handler klik fase-capture Bagikan menelan SEMUA .bg-ex dan tombolEx menambah satu lagi bila tombol lama bukan anak langsung header. Adaptor Bagikan.tema[id] wajib memuat siap/tanggal/acuan/data/teksWil; engine melewati S.meta/S.jalur bila Bagikan.T ada (tanpa itu buka() berhenti di guard S.meta). Cara tahu: Playwright, klik #bgBuka lalu cek #bgImg.src dan #bgTeks, serta hitung .bg-ex per article.ex (harus 1).
- 2026-10-16 · 2026-10-16 · Bukti identik karhutla/banjir: ambil baseline git archive HEAD public ke direktori sementara, sajikan dua pohon, bandingkan PNG byte. Karhutla 390 tidak pernah byte-identik (rentang y156-269 beda juga baseline lawan baseline) jadi jalankan baseline dua kali dulu. Sisipkan glyphs di gaya peta palsu supaya galat text-field tidak menutupi galat nyata. i18n pop-up Sapa: nama data dibungkus translate=no dan kalimat dipecah jadi simpul statis ber-{0}; kunci tunggal seperti 'di' menerjemahkan semua simpul 'di' sedunia, jadi jangan dibuat.
- 2026-10-18 · 2026-10-18 · laporan.js generik: kartu Insight hanya bergaya bila dibungkus #insight (insight.css berkunci id), jadi Laporan.pasang membuat <div id=insight> di dalam #laporan. Uji tanpa DOM lewat vm: sediakan URLSearchParams di konteks, jangan deepEqual array lintas-realm (bandingkan join()). Playwright ada di /Users/alfatehanseptianta/Developer/worth-it/node_modules/playwright-core; browser unduhan baru tak ada, pakai executablePath ke ~/Library/Caches/ms-playwright/chromium_headless_shell-1228; fullPage tak menangkap main yang position:fixed.
- 2026-10-19 · 2026-10-19 · peluang.js: kartu baru belum tampil sampai index.html halaman memuat ../inti/peluang.js (bukan wilayah inti); modul pemakai wajib guard typeof Peluang. Kontrak peluang/1 membawa p=null (gempa m4) dan strip datar: ambang tanpa data dibuang dari segmen, pil puncak dilewati bila semua batang sama. Persen tidak pernah '100%' (>99%), nilai kecil '<1%'; uji vm di tests/agen/peluang-inti.test.mjs.
- 2026-10-19 · 2026-10-19 · /semua analisis.js: iklim_outlook.json tak memuat hujan aktual per tahun, jadi sebar RONI x DMI berwarna hujan mustahil; dipakai batang anomali per wilayah (fit skill_loo<=0 jadi 'tidak teruji'). Medan 'n kejadian' outlook12 hanya ada di gempa (laju.n_m6); bulan banjir/longsor/karhutla tak punya n, tooltip pakai E, dasar, tahun pembanding. tip.js butuh <div id=tip> + pasangTip() (semua tak punya). Playwright: /Users/priyankaalfatehan28/.local/lib/node_modules/playwright-core, browser chromium_headless_shell-1243. sed -i BSD gagal diam-diam pada pola panjang; pakai Edit.
- 2026-10-19 · 2026-10-19 B0 tab registry: gempa sim di tab_sembunyi (16 Okt) kalah oleh TABS halaman yang menampilkannya (18 Okt), jadi sim keluar dari tab_sembunyi. Cuaca punya simulasi.html terpisah (tanpa p-simulasi, tautan ikon header): 'simulasi' di tab registry membuat /cuaca/simulasi menyajikan index.html lalu mulai.js melempar ke /cuaca/peta; butuh pemetaan rute ke /cuaca/simulasi.html di src/bencana.js (warga-api). Leksikon berita sebenarnya scripts/<id>/berita.py (gempa, gunungapi, kekeringan); workflow gempa = gempa.yml. Cara tahu: node --test tests/agen/gerbang-tab-registry.test.mjs.
- 2026-10-19 · 2026-10-19 B2 konteks.js: penangan change #lapis banjir dan kekeringan melempar TypeError pada data-l asing (id.forEach/map.forEach pada undefined), jadi ubin konteks memakai kunci kt_* dan pendengar fase tangkap + stopPropagation di #lapis. Sekolah.json 7 MB diurai di worker (konteks-kerja.js) dan masuk peta sebagai blob; CSP Report-Only tak melapor blob. Legenda dititipkan lewat MutationObserver childList #legenda (tanpa menyentuh renderLegenda halaman). Gunungapi tak punya penangan #lapisBtn: Overlay mobile mati sejak awal. Playwright: ubin tertutup dialog Sapa saat muat, tutup dulu; long task di swiftshader sama dengan baseline jumpTo, ukur JS lewat bungkus addSource/addLayer.
- 2026-10-19 · 2026-10-19 /semua kejadian.js: tabel kejadian aktif lintas bencana (K dari kluster_awal.json 5,8 MB dibatasi level 3 dan titik24.laci; B/V/C/U/D dari banjir/data/kejadian_<id>_awal.json; G dari /api/gempa/kejadian); berkas basi >3 hari dilewati, jadi data lokal karhutla (12 Okt) baru tampil bila Date digeser di Playwright. Tautan b.rute sans trailing slash + /k/<kode>. sed -i BSD tanpa suffix menelan skrip: pakai python/Edit. tentang.html: hero lb-st 'Segera' keempat bencana diganti 'Aktif' + daftar tujuh bencana; kotak angka hidup dan Landasan hukum tetap hidden.
