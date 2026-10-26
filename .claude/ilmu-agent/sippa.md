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
