# Ilmu sippa

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/sippa.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca sippa`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus sippa "..."`.
>
> Ilmu awal 25 Okt 2026 (SP-003), diisi dari dokumen, BELUM dari kode: belum ada
> satu pun berkas `public/pipa/**`. Kode yang menang bila beda; tulis kasusnya.
> Dokumen: `data/kajian-bnpb/pipa/` (KEPUTUSAN-SIPPA > PRD > DESIGN-SYSTEM > DESAIN-TEKNIS > RENCANA-UJI > TIKET).

## Peta berkas & tabel

Wilayahmu: `public/pipa/**` dan `tests/sippa/**`. Rencana berkas (DT §2.1):

| Berkas | Isi |
| --- | --- |
| `public/pipa/app.js`, `keadaan.js`, `batas.js`, `ikon.js` | router History API + tema + muat malas; elemen keadaan standar (memuat, kosong, galat, luring, basi, menunggu); teks "Batas pemakaian alat"; sprite SVG |
| `hitung.js` | fungsi murni rumus (`globalThis.SippaHitung`): hidraulika, zona, saranSarana; satu-satunya sumber rumus klien |
| `formulir.js` | daftar medan dan batas form lapangan; dipakai klien DAN diimpor `src/sippa.js` (ADR-03, tidak ada `src/sippa_formulir.js`) |
| `antre.js`, `lapangan.js` | antrean IndexedDB `sippa-antre`; layar form luring (`/pipa/lapangan`, tanpa akun, kode penugasan di header `x-kode`) |
| `layar_*.js` (ringkas, peta, hitung, pemicu, kit, log, ab, studio, 3d, telemetri, laporan, data) | satu modul per layar, `import()` malas; harus cocok dengan `LAYAR_SIPPA` |
| `studio_mesin.js`, `studio_pekerja.js` | salinan mesin Studio pemilik + `gerbangSippa`; Web Worker Monte Carlo |
| `adegan.js`, `laporan_isi.js`, `laporan_pdf.js`, `pipa.css`, `adegan.css` | 3D, `isiLaporan`, jsPDF, gaya |
| `tests/sippa/*.test.mjs`, `cakupan.json`, `fixtures/` | uji tanpa DB; registri cakupan (sudah ada, kosong); kasus acuan bersama JS dan Python |

Di luar wilayahmu: `src/sippa.js`, `migrations/0055-0057` (warga-api); `scripts/data/sippa/**`, `data/sippa/**` (pipa-data); `public/sw-lapangan.js`, `public/vendor/three|qrcode` (layar-peta).

## Aturan & invarian

- `public/pipa/**` adalah aset publik: hanya kode dan teks, TIDAK PERNAH data. Data lewat `GET /api/sippa/*` bersesi.
- Akses hanya staf BNPB; satu-satunya pintu tanpa akun `/pipa/lapangan`.
- Injeksi lance 0-5 m; angka 5 m hanya di `KONST.dalam_maks_m`; 3-5 m berpil "lengan uji".
- Zona: air < 2,5 km, jalan < 5 km; tepat 2,50 atau 5,00 km = jauh.
- Vonis kalkulator hanya NO-GO, HOLD, KONDISIONAL (tidak ada "GO"); vonis pilot DAPAT DIPAKAI / BERSYARAT / BELUM.
- Teks: Bahasa Indonesia, "kamu", tanpa em dash, tanpa titik tengah U+00B7, tanpa "terbukti" untuk SIPPA, angka lewat `fmt` id-ID tanpa `toFixed`, tiap angka bersumber, berwaktu, berpil keyakinan.
- Tanpa CDN (CSP `script-src 'self'`); INP tiap interaksi < 200 ms (form lapangan < 100 ms), kerja berat lewat `nanti()` atau Web Worker.
- Mesin Studio disalin apa adanya; perubahan hanya bertanda komentar `SIPPA:`.

## Ranjau yang pernah meledak

(belum ada: belum ada kode. Ranjau yang diantisipasi: modul `public/inti` jangan disalin ke `public/pipa`; berkas data tidak boleh mendarat di `public/pipa`.)

## Gerbang yang menghakimi

- `npm run uji:sippa` = `node --test --test-concurrency=1 tests/sippa/*.test.mjs` (nol berkas uji = lulus).
- `tests/sippa/cakupan.json`: `diuji`, `dikecualikan` (alasan >= 15 huruf), `antre` (hanya menyusut); gerbang penemunya `gerbang-cakupan.test.mjs` menyusul (RU §7.3).
- Terpasang di `terbit.yml` sesudah `uji:warga`; `npm run uji:agen` (satu pemilik per berkas).
- Pemeriksa wajib: `inp-reviewer`, `selera-angka`, `security-reviewer` (penyisipan HTML), `penulis-gerbang` untuk `tests/sippa/**`.

## Kasus

- 2026-10-25 · Agent dibuat lewat SP-003 sebelum berkas pertama; ilmu awal dari PRD §9.12, DT §2.1-§2.2, RU §7.
- 2026-10-26 · formulir.js tidak boleh impor fmt (skrip klasik berDOM); pesan galat pakai toLocaleString id-ID. hitung.js belum ada saat SP-007, jadi kesamaan batas 5 m dengan KONST dijaga uji bersyarat (skip sampai SP-010). Trigger sippa_log_urut TIDAK membandingkan t_mulai_injeksi dengan t_selesai/t_bongkar_selesai; URUTAN_WAKTU meniru persis.
- 2026-10-26 · Global const dari skrip klasik public/inti (fmt, jamWIB, Kartu, PilihCantik) BUKAN properti globalThis: modul ES harus memakai typeof fmt === function atau nama telanjang, bukan globalThis.fmt (SP-010: PilihCantik sempat tidak terpasang diam-diam). Cek di browser, bukan hanya node --test.
- 2026-10-26 · SP-012: node --test bisa menguji pembangun HTML layar bila fungsi murninya diekspor dan global klasik (fmt, esc, jamWIB) dimuat dari format.js lewat (0,eval) dengan baris use strict dibuang; DOM sungguhan tetap hanya terbukti di peramban. Rute POST staf butuh header x-pb 1; id di jalur API wajib 16 heks (router DT 4.1), jadi jalurApi menolak sebelum fetch. Penjaga tes menolak mengubah asersi lama: salah hitung fixture harus dibetulkan lewat data, bukan regex.
- 2026-10-26 · SP-011: kirim butir WAJIB bertugas_id (milik() ketat); tanpa itu butir tugas A bisa berangkat dengan kode tugas B. Tombol simpan wajib urgentLalu (mati+label seketika), kalau tidak ketuk ganda membuat butir ganda karena tambah() membuat id baru. IndexedDB.open bisa menggantung: batas 3 dtk lalu localStorage. Scope SW /pipa/lapangan tanpa garis miring.
- 2026-10-26 · SP-030: hitung.js tanpa ?v= dan di luar gerbang-versi (lapangan.js tidak mengimpornya; hanya layar_log.js), jadi sha tidak perlu dicatat. Gerbang rule 8 menolak '>' dekat kata lance/kedalaman di berkas selain hitung.js: teks batas.js tanpa tanda itu. Hitung hari regu pakai ceil(x - 1e-9) agar 25,000000000000004 tidak naik. Kembar Python belum punya fungsi SP-030 (SP-019, pipa-data).
- 2026-10-26 · maplibre-gl.css memberi .maplibregl-map{position:relative} yang menang atas .kelas{position:absolute} berspesifisitas sama: kanvas jadi tinggi 0 dan peta kosong tanpa galat; pakai selektor induk. Cangkang halamanSippa belum memuat tema.css/kartu.css/insight.css, jadi layar memberi cadangan token dan memuatnya sendiri di depan pipa.css bila --ok kosong.
- 2026-10-26 · SP-037: jsPDF UMD dimuat di Node lewat new Function('exports','module',src).call(globalThis,exp,{exports:exp}) (require mengembalikan objek kosong), jadi buatPdf diuji dengan PDF sungguhan. Cangkang halamanSippa tidak memuat /inti/kartu.css: PilihCantik tampil ganda dan .ex tak bergaya; layar Laporan memuat kartu.css sendiri dan kartu .sp-lk. Verifikasi peramban: Chrome headless + CDP ke server statis dengan CSP_SIPPA asli, jsPDF jalan tanpa unsafe-eval (BT-05).
- 2026-10-27 · SP-036/044/055/095: berkas layar_ab, air, akses, aset dan templat laporan TIDAK ada di klon bersih (kerja lama tak ikut terapkan), jadi dibangun ulang dari dokumen. Penjaga tes menolak mengubah asersi lama (app.test 12 layar, gerbang-cakupan 12 layar tanpa modul, laporan_isi dan layar_laporan 'belum tersedia'), jadi templat baru ditaruh di laporan_templat.js dan cekForm baru; tiga asersi lama menunggu /allow-test-change. Dummy A/B bertanggal Oktober jatuh ke jendela pilot (pilot_sampai 2026-11-30): hitung.adaPilot mengecualikan baris dummy dari aturan tanggal dan kartu diberi pil dummy, peragaan; baris nyata tetap pilot. Verifikasi DOM: Chrome headless dengan harness di scratchpad (server statis python + fetch tiruan) menangkap galat sintaks dan alur yang uji Node tidak lihat.
- 2026-10-27 · 2026-10-27 · QA visual: cangkang halamanSippa kini memuat tema.css, kartu.css, insight.css berurutan sebelum pipa.css (v=5): tanpa itu PilihCantik tampil ganda, token --brand2 kosong (batang SVG hitam di gelap), dan --ok kosong. Tanggal lewat tanggal.js (tombol id-ID + input date tersembunyi, delegasi di dokumen). Penjaga tes menolak mengubah asersi lama (barisAktif membuang dummy), jadi layar_log memakai barisKoreksi/pilihBaris; barisAktif tersisa hanya untuk uji lama dan layar_laporan.
- 2026-10-27 · 2026-10-27 · adegan 3D: Chrome headless dengan swiftshader hanya 2 fps pada adegan jalur (bayangan PCFSoft menelan 3/4 waktu), jadi sim bergerak lambat (dt dibatasi 0,1 dtk per frame) dan terlihat macet di t=0; itu artefak perender perangkat lunak, bukan galat. Adegan mematikan bayangan sendiri bila rata-rata frame lebih dari 90 ms. Login uji dibatasi laju (429 setelah beberapa kali POST /admin/masuk): pakai ulang satu cookie sesi_admin. Warna simpul tanah/tabung dalam ruang linear: tekstur peta harus terang (#d6d6d6) karena dikalikan warna lapisan. Penampang dengan bola dipotong: setengah bola di belakang bidang potong tertutup blok opak, jadi gambar setengah bola di DEPAN sebagai hantu plus cakram di bidang potong.
- 2026-10-27 · SP-104-113: uji 'perakit' layar_peta menuntut tepat satu .setData(: setData baru lewat tulisData() satu pintu, jangan ubah asersinya. Foto kredit alat tidak ada di public; sumbernya src/uji_pilot_data.js (generate ekspor_web.py), disalin ke katalog_alat.js. layar_kit.css bergaya terpisah dari pipa.css (v tanpa gerbang).
- 2026-10-28 · 2026-10-28 Fase 1 provinsi baru: saringan GSW membuang SEMUA kompleks prov 16 karena gsw null tidak ada di Set (kini lolos); Math.max terbakar_akhir semua null = -Infinity (saringan Riwayat terbakar dimatikan). Sumber BRGM baru lewat larik sumber di pasangLapisan (uji perakit hanya mengizinkan addSource di pasangLapisan/tambahSel); gerbang-sippa menolak ${k.id} mentah di innerHTML, jadi tombolKeputusan menerima objek k.
- 2026-10-28 · Fase 2 lapangan: modul baru yang di-import form lapangan tidak ikut dicache SW (TAMBAHAN hanya ikon/formulir/antre), jadi logika murni fase 2 ditaruh di formulir.js; modul ES basi + ?v= naik berisiko import gagal, sarankan VERSI sw naik bersama. Gerbang lama menolak ubah INSPEKSI_LAPANGAN.tindakan sampai koordinator minta. Uji DOM: Chrome headless + CDP (bukan virtual-time, IndexedDB timeout 3 dtk).
