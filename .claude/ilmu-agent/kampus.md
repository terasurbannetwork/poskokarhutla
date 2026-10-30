# Ilmu kampus

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/kampus.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca kampus`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus kampus "..."`.

## Peta berkas & tabel

Modul Kemitraan Kampus (`/kemitraan`) lahir 30 Okt 2026 dari Grand Design Kemitraan
BNPB–Perguruan Tinggi 2027–2029. Dokumen rancangan (urut otoritas, AGENTS.md §2.2):
`data/kajian-bnpb/kampus/` KEPUTUSAN-KAMPUS, PRD, ALUR, ALGORITMA, PROFIL-DAERAH,
DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET (+ GLOSARIUM).
Status 30 Okt: hanya dokumen; belum ada kode. Kerjakan tiket `KM-*` satu per sesi.

| Berkas | Isi |
| --- | --- |
| `public/kemitraan.html`, `public/kemitraan.css`, `public/kemitraan/*.js` | layar 8 tampilan + halaman buku, panduan, daftar, masuk, saya, sertifikat |
| `public/data/kemitraan/` | kode.json (crosswalk), daerah/<kab4>.json (548), prov/<NN>.json, ringkas.json, pertanyaan.json, kamus.json, uji_cocok.json |
| `scripts/kemitraan/*.py` | konst, kode, profil_daerah, masalah, geo, teks, korpus, indeks_bm25, cocok_pakar, cocok_baru, pertanyaan, uji_cocok |
| `tests/kemitraan/`, `tests/bnpb/kemitraan_*` | fungsi murni, paritas Py/JS, gerbang teks, layar |

Bukan milikku (pakai lewat API): `src/kemitraan*.js`, `migrations/0079–0083` (warga-api);
`.github/workflows/kemitraan*.yml` (mekanik-mesin); `/akademisi` dan R2 `akademisi/*`.

Sumber data dibaca: `public/data/wilayah/NN.json` (profil wilayah IRBI, `scripts/umum/profil_wilayah.py`),
`banjir/data/{bahaya,kejadian,riwayat,risiko_kecamatan,risiko_ujibalik}.json`,
`gempa/data/{risiko,riwayat_m5,inarisk_gempa}.json`, `data/riwayat_wilayah/kab.json`,
`data/dibi_kejadian.json`, kekeringan, gunungapi `paparan.json`, `pesisir/data/abrasi.json`,
`data/neraca_air/kab.json`, `data/sekolah.json`, `data/fasilitas.json`, `data/desa_cari.json`,
`public/geo/kabupaten/<prov>.json`, `gerbang_model.json`.

## Aturan & invarian

- Kunci kab = kode IRBI 4 digit. Empat skema kode di repo (IRBI, BPS, Kemendagri bertitik,
  kunci nama "NN|Nama"); 3171 IRBI = Jakarta Pusat tetapi BPS 3171 = Jakarta Selatan.
  Selalu lewat `kode.json`; yang tak pasti → null + `kode_gagal.json`, jangan menebak.
- Tiap blok profil: sumber + tanggal + yakin; data hilang = null, tampil "Tidak ada data
  untuk wilayah ini", bukan nol.
- Data pakar (nama dosen, email, id OpenAlex, korpus) hanya di R2 privat; tidak pernah di
  `public/` atau git. Gerbang memindai `public/data/kemitraan/**`.
- Bobot/ambang hanya di `scripts/kemitraan/konst.py` = `public/kemitraan/konst.js` (uji identik).
- Rupa tiru `/akademisi`: muat `inti/tema.css`, `gaya.css`, `kepala.css`, TAUTKAN
  `akademisi.css`; kelas baru prefiks `.km-`; bukan `bnpb.css`. Helper disalin ke `window.KM`
  dengan komentar asal baris (akademisi.js IIFE, tak bisa diimpor).
- Tanpa LLM (keputusan T-C): solusi = kutipan asli abstrak + tautan, berlabel.
- Tanpa kiriman otomatis: wa.me/mailto/salin yang ditekan manusia.
- Skor pakar dan prioritas otomatis berpil "Belum diuji" sampai `uji_cocok.json` lolos.

## Ranjau yang pernah meledak

- (warisan modul lain) `profil_wilayah.py` butuh `DIR_SUMBER` di luar repo; jangan impor
  fungsi yang memicu pembacaannya. Pindahkan fungsi murni nama wilayah ke
  `scripts/umum/nama_wilayah.py` bila perlu (tiket KM-A03).
- `public/data/inarisk.json` per kompleks karhutla (K0001), bukan per kab: jangan dipakai
  untuk profil kab.
- `sekolah.json` hanya 9 provinsi: tandai cakupan, jangan jadikan nol di provinsi lain.
- Grep repo bisa macet (berkas iCloud belum terunduh): batasi ke folder spesifik.

## Gerbang yang menghakimi

- `python3 -I scripts/kemitraan/<x>.py --cek` tiap skrip.
- `node --test tests/kemitraan/*.test.mjs` (paritas, gerbang teks, cakupan).
- `npm run uji:layar` (`tests/bnpb/kemitraan_layar.test.mjs`, 1440/390).
- Pengulas: `selera-angka`, `inp-reviewer`, `validasi-model` (skor/uji relevansi).

## Kasus
