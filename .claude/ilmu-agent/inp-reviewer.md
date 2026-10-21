# Ilmu inp-reviewer

> Kelas: pemeriksa · Model: sonnet · Definisi: `.claude/agents/inp-reviewer.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca inp-reviewer`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus inp-reviewer "..."`.

## Peta berkas & tabel

Standar pemilik: `~/.claude/INP.md` (26 Agu 2026). Klik tidak boleh membekukan layar; yang diukur adalah waktu sampai piksel berubah, bukan lama handler. Repo ini vanilla JS, jadi "state" = objek `S`/modul di `public/index.html`, bukan React.

**Rumah perkakas deferral satu-satunya:** `nanti(fn)` di `public/index.html:1543-1544`: dua `requestAnimationFrame` bersarang (jalan sesudah satu frame tercat) dengan `setTimeout(go, 120)` sebagai jaring untuk tab tersembunyi; `fn` dijamin jalan sekali. Komentar di baris 1542 "INP: chrome dicat dulu, isi berat menyusul sesudah satu frame tercat". Modul lain memakainya lewat variabel global (komentar `konsesi.js:7` menyebutnya sebagai ketergantungan). Tidak ada `requestIdleCallback`/`startTransition` di repo.

**Pola yang SUDAH benar (contoh tiru):**
- `bukaTab()` (1612): `aria-current` tombol dan kelas `.on` halaman di-set langsung; `Insight.render()/Tren.render()/Berita.render()/...` ditunda di `nanti`.
- Segmen rentang (`#rentang`, 2386-2391): `aria-pressed` urgent, lalu `nanti(() => { hitung(); peta.getSource("titik").setData(...); Peta.aturWilayah(false); Kini.segarkan(); })`.
- `Tabel` (2628-2635): kotak cari/pilih provinsi/paginasi `this.hal=...; nanti(() => this.render())`. Juga `Kp` (2913-2916), `Tren` (3202-3219), `Berita` (4029), `Insight.ulang` (3547, `nanti` per kartu).
- Overlay `#lapis` change (2429): lapisan baru `nanti(() => Lapis.pasang(...))`; `Lapis` memuat data lapisan tambahan baru saat pertama dinyalakan.
- `dampak.js:476-477`: bagian 1-2 dirender langsung, bagian 3-10 di `nanti`. `foto.js:103`: `moveend` di-debounce 120 ms. `bagikan.js:314`: MutationObserver + rAF. `dampak.js:475`: scroll dibatasi rAF.
- `Angin` (2033): partikel berhenti digambar selama gerak peta (`movestart`/`moveend`), 3500 partikel desktop / 1500 mobil, hormati `prefers-reduced-motion` (jatuh ke `Lapis.pasang("panah")`).

**Titik rawan (cek bila disentuh):**
- `hitung()` (1693): loop sinkron atas SEMUA `S.titik` (bisa puluhan ribu baris dari `hotspot.json` 7 hari) x `S.wilKunci[b[6]]`. `Peta.geoTitik()` (1811): `S.titik.filter(masuk).map(...)` lalu `setData`. Dipanggil dari `muatTitik().then` (2376) dan `titik_live.js` tanpa `nanti`.
- `muatTitik()` (2367) mem-parse JSON ~10,7 MB (`hotspot.json`) / 4,2 MB (`hotspot72.json`) lalu menjalankan `hitung` + `setData` + `aturWilayah` di satu tugas. `sim_data.js:32` memuat `hotspot.json` lagi untuk simulasi (cek cache `rows`).
- `lengkapiKluster()` (1605) di awal `bukaTab` untuk tab selain ringkasan: `.then` mengulang semua fitur kluster + `setData` sinkron.
- Klik peta (1894-1911): beberapa `queryRenderedFeatures` berurutan, area ±6 px; `getClusterLeaves(id, 100, 0)` lalu `fitBounds`. `mousemove` pada peta (1912) menjalankan `queryRenderedFeatures` tiap gerakan tanpa throttle bila lapisan udara/metar aktif. `mousemove` `wil-fill` (1882) memasang `setFeatureState`.
- `ubinLapis()` dipicu `MutationObserver` subtree pada `#lapis` (2427): menulis ulang DOM tiap mutasi.
- `i18n.js`: MutationObserver menerjemahkan tiap simpul teks pada mode EN; render besar (tabel panjang, 9 kartu Insight) menambah biaya per interaksi di EN.
- Timer: `titik_live.js` `setInterval(gabung, 5000)` dan `jejak.js` 30 dtk, `informasi.js` 120 dtk (hanya bila terlihat), `statistik_publik.js` 60 dtk.


## Aturan & invarian

1. **Pisahkan chrome dari isi.** Chrome kontrol (pil aktif/`aria-pressed`/`aria-current`, panah sort, kelas `.on`) di-set URGENT di handler yang sama. Subtree berat (render tabel/kartu, `hitung`, `setData`, `Lapis.pasang`, `aturWilayah`, `fitBounds`) menyusul lewat `nanti()`.
2. **Membungkus SELURUH handler dalam `nanti()` BUKAN obatnya.** Bila `aria-pressed`/spinner juga ikut ditunda, tidak ada piksel yang berubah sampai deferral jalan, jadi INP tetap merah. Temuan yang benar menyebut kontrol mana yang belum urgent dan isi mana yang belum ditunda.
3. Deferral hanya lewat `nanti()` (dua rAF + `setTimeout` 120 ms). `setTimeout(fn, 0)` telanjang tidak menjamin frame tercat dulu (kelas kelima di INP.md: cat tidak pernah datang). Pengecualian lama yang dibiarkan: `Peta.pasang` memakai `setTimeout(..., 0)` untuk memasang lapisan awal (1726).
4. **Tidak ada loop sinkron atas ribuan titik di handler klik.** Agregasi per wilayah dihitung sekali per perubahan rentang (`hitung`), bukan per klik; pakai hasil `S.hit/S.tinggi/S.snpp`.
5. **JSON besar dimuat sekali dan di-cache** (`muatTitik._p`, `lengkapiKluster._p`, `S.riw`, `sudah.*`); jangan memanggil `muatJSON("data/hotspot.json")` baru di handler klik.
6. Kerja yang butuh frame (animasi) pakai `requestAnimationFrame` satu per frame (`Sim._raf`, 5874) dan berhenti saat `document.hidden`/tab tidak aktif.
7. Kontrol berchrome tanpa state (pil nav ber-`href`, `<details>` akordeon, tombol pagination) juga kena aturan; pemindai yang hanya mencari `setX(` meloloskannya. Cari `onclick`, `addEventListener("click"|"change"|"input")`, `.onchange =`.
8. Mode laporan: kutip `berkas:baris`, sebut kontrol (chrome) mana yang urgent dan kerja mana yang berat, usulkan perubahan paling kecil yang memisahkannya.


## Ranjau yang pernah meledak

- **Overlay INP 202 ms padahal handler 1-8 ms** (diukur produksi 31 Agt 2026 di proyek lain; pola sama berlaku): kerja deferred dijadwalkan sebelum frame sempat dicat. Obatnya satu tempat: `nanti()` dengan dua rAF, bukan di tiap pemanggil. Jangan mengganti `nanti` dengan `setTimeout(0)` atau `queueMicrotask`.
- **`muatTitik` / `titik_live.js`**: tarikan 7 hari menggantikan `S.titik` lalu `hitung()` + `setData` + `aturWilayah` sinkron; `titik_live.js` menggabung ulang tiap 5 detik. Tombol "7 hari" memunculkan toast "Memuat titik 7 hari…" supaya ada umpan balik (chrome) sebelum parse.
- **`hotspot.json` 10,7 MB** dimuat ganda (peta dan `sim_data.js:32`); parse JSON besar membekukan main thread beberapa ratus ms di perangkat lemah.
- **Angin**: kanvas partikel menggambar tiap frame (`Angin.loop`, 2064-2075); aman karena berhenti saat peta bergerak, tetapi menambah jumlah partikel atau memanggil `peta.project` per partikel di luar `loop` akan membebani. Mode `prefers-reduced-motion` wajib dipertahankan.
- **Tab Insight**: `Insight.render()` membangun 9 kartu `gambar(id)` sinkron (3541-3545); perubahan kontrol hanya mengganti satu kartu lewat `ulang` + `nanti`. Jangan mengembalikan render seluruh tab per klik.
- **`PilihCantik`/segmen yang memanggil `this.render()` langsung** (tanpa `nanti`) adalah regresi; selama ini semuanya sudah lewat `nanti`. Pengecekan: `grep -n "this.render()" public/index.html` lalu lihat apakah dibungkus `nanti`.


## Gerbang yang menghakimi

- **Repo ini BELUM punya gerbang mekanis INP** (di AGENTS/roster tidak ada `gerbang-inp-transisi`; rujukan polanya ada di proyek `mbg-kdmp`: `components/ui/transisi.ts`, `tests/unit/gerbang-inp-transisi.test.ts`, skill `inp-sweep`). Sampai ada, kamu adalah gerbangnya; usulkan ke orkestrator agar `penulis-gerbang` membuat uji tanpa browser yang menolak handler klik baru yang memanggil `render()/setData()/hitung()` tanpa `nanti`.
- Pemindai bantu (read-only):
  `grep -nE 'addEventListener\("(click|change|input)"|\.on(click|change|input) *=' public/index.html public/*.js | grep -v ' 2\.js'` lalu periksa tiap isinya mengandung `nanti(` atau hanya mengubah chrome;
  `grep -n 'hitung()\|geoTitik()\|setData(' public/index.html public/*.js`;
  `grep -nE 'muatJSON\("data/(hotspot|kluster)' public/*.js public/index.html`.
- Bukti pengukuran: browser preview (Browser pane) + Performance/INP overlay; kamu tidak mengukur, kamu membaca kode. Vonis `bersih`/`temuan` lewat `node scripts/agents/ilmu.mjs catat inp-reviewer <berkas> <vonis> "<ringkas>"`.
- Perbaikan dilakukan pengerja `layar-peta`; kamu hanya melaporkan.


## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode `public/index.html` (nanti, bukaTab, hitung, muatTitik, Angin, handler klik/peta) dan modul `public/*.js`, plus `~/.claude/INP.md`. Dicatat: `nanti()` (2 rAF + setTimeout 120 ms) adalah satu-satunya rumah deferral; belum ada gerbang mekanis INP di repo; titik rawan terbesar `hitung()`/`geoTitik()` atas `hotspot.json` ~10,7 MB.
- 2026-10-18 · Laci/Sim gempa: mikrotugas sesudah klik (Promise cache hangat -> .then/await) berjalan SEBELUM cat; kerja berat di .then Tsunami.muat()/Guncang.muat() tetap membekukan klik kedua. Cek: ukur di node dengan vm (tsunami.js UMD), waktuTiba 210-490ms, swe init 90-450ms. Nanti() wajib di dalam .then, bukan hanya di handler.
- 2026-10-19 · 2026-10-19 · Kekeringan/simulasi: bak neraca 611 sel x 180 hari murah (jalankan 3 ms hangat, hitung() 3 jalan 9 ms node; 53-58 ms longtask di Chromium dingin); biaya klik headless 80-370 ms didominasi render MapLibre (software GL), bukan handler (1-5 ms). Temuan nyata: jadwal() satu rAF bukan nanti, dan A/N dihitung ulang tiap slider perlakuan. Ukur: playwright dari ~/.npm/_npx/*/node_modules/playwright + PerformanceObserver event/longtask; simulasi.js dimuat node lewat new Function('module',src) karena package type=module.
- 2026-10-19 · 2026-10-19 · Gunungapi/Sim: angka pengerja 56-58 ms hanya AbuModel.jalankan; tugas setTimeout hitungAbu sebenarnya ~110 ms hangat (node, new Function atas abu_model.js karena type=module: pakai globalThis.AbuModel) karena endapan() 1100 titik x 2000 partikel ~50 ms dan 24x jejak ~10 ms. JSON turunan gunungapi kecil (paparan_geo 160KB, paparan 114KB, abu 300KB): bukan sumber beku; rute() ~300 simpul x 90 desa murah. Ukur sebelum menuduh JSON.
- 2026-10-19 · Udara/Sim: handler klik sim.js bersih (1-10ms, kerja lewat rAF); yang berat model.js (urutPerlakuan 130-280ms sinkron, chunk 15-25ms bukan 10ms karena anggaran dicek sesudah tiap langkah, gauss separuh waktu JS). Headless swiftshader membuat durasi event 40-680ms palsu (program/GPU 16 dtk); pakai profil CDP + handler processingEnd-processingStart, dan cek uptime (load 40 menggandakan angka node).
- 2026-10-19 · Pendengar delegasi gabungan click+keydown (gempa/kejadian.js) harus cek e.type/e.key SEBELUM cabang data-h; kalau tidak Tab/spasi di tombol paginasi memicu ganti halaman. Cari: grep -n 'addEventListener("keydown", buka' public/gempa
- 2026-10-21 · const nanti top-level di klasik script BUKAN properti window; modul inti/ yang memakai window.nanti diam-diam jatuh ke setTimeout(0). Cek: grep window.nanti public/inti
- 2026-10-21 · Laporan BNPB: petaPng (canvas 1750x732 + toDataURL PNG) dipanggil di tiap pratinjau, bukaLayar, unduh tanpa cache; cache per JSON(kejadian)+besar. Instansi: gantiTab('tugas') memanggil bukaPeta yang remove+buat ulang MapLibre dan semua marker.
