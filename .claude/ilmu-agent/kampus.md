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
| `public/data/kemitraan/` | kode.json (crosswalk), daerah/<kab4>.json (514), prov/<NN>.json, ringkas.json, pertanyaan.json, kamus.json, uji_cocok.json |
| `scripts/kemitraan/*.py` | konst, kode, profil_daerah, masalah, geo, teks, korpus, indeks_bm25, cocok_pakar, cocok_baru, pertanyaan, uji_cocok |
| `tests/kemitraan/`, `tests/bnpb/kemitraan_*` | fungsi murni, paritas Py/JS, gerbang teks, layar |

Bukan milikku (pakai lewat API): `src/kemitraan*.js`, `migrations/0080–0084` (warga-api);
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
- 2026-10-30 · indeks.json 548 baris = 514 kab/kota (kode 4 digit) + 34 provinsi; neraca_air/kab.json berkode IRBI dan kekeringan-*.json bernomor urut sumber, keduanya BUKAN BPS, jadi kode.json bps null. Worktree agent dibuat dari origin/main, bukan main lokal: dokumen yang belum ada di origin dibaca dari checkout utama.
- 2026-10-30 · KM-B01: sumber tak bertanggal (sekolah, fasilitas, bahaya, wilayah/NN) diberi tanggal snapshot repo (maks tanggal DIBI/desa_cari/GDACS) + tanggal_arti=snapshot-repo; email BPBD tidak ditulis karena D5 melarang email di public/data/kemitraan; DIBI punya baris kembar (3171 22 meninggal 2x) yang dijumlahkan apa adanya; ray casting ada di profil_daerah.py (B02 boleh memindah ke geo.py).
- 2026-10-30 · KM-A10: layar /kemitraan memuat <script src> sungguhan, jadi tests/warga/kemitraan_gerbang.test.mjs:111 (doesNotMatch /<script|style=|onclick=/) merah beserta 6 uji sesudahnya sampai regex-nya hanya melarang skrip TANPA src (milik warga-api). Peran hakKm AG/PL tidak punya tampilan di halaman utama (KM.HAK), BP hanya daerah+masalah, KK tanpa dasbor. Harness _dunia.mjs menyajikan statis tanpa content-type, jadi /inti/kepala.js (modul) ditolak Chrome di uji layar; difilter KEPALA_MIME. Uji layar peran lain: Page.addScriptToEvaluateOnNewDocument menimpa fetch /api/kemitraan/saya. objek dari vm.runInNewContext beda prototipe: bandingkan lewat JSON, bukan deepStrictEqual.
- 2026-10-30 · KM-B02: blok bahaya+model di profil_daerah.py, geometri murni di geo.py (Peta grid 1 derajat, D-P, siluet). Ambang datar tren (TREN_DATAR_REL 0,05) ditaruh di konst.py=konst.js, bukan lokal. gambut.geojson hanya 8 prov bersel: luar itu null, dalam prov tapi tanpa sel = 0. Geometri gambut bisa MultiPolygon (ambil cincin luar pertama). blok(isi,tanggal,yakin,sumber,arti): jangan *tuple ke posisi yakin (pakai blokt). Fixture B02 pendek di tests/kemitraan/fixtures/profil_mini; harapan/*.json dibangkitkan ulang dengan --akar fixture --kab X. package.json uji:kemitraan belum menjalankan geo.py --cek (milik mekanik-mesin).
- 2026-10-30 · KM-B02 revisi: kejadian.json 2024 berisi nol buatan (DIBI tak lengkap): dikecualikan dari tren dan total_2015_2025 lewat TAHUN_TAK_LENGKAP; median pesisir hanya transek nyata (>=2); yakin blok = terlemah sub-blok; null di luar cakupan dijelaskan di _null_arti tingkat atas; tiap angka B02 wajib punya _satuan (dicek di --cek).
- 2026-10-30 · KM-B02 putaran 3: 2024 hanya dikecualikan untuk jenis DIBI ('semua' CKAN lengkap); tren DIBI mengisi 0 untuk tahun yang ada di sumber (ki[4]) tanpa baris kab; level_kini kekeringan = lv_wilayah (>=30% penduduk), dikunci invarian atas 514 kab; pembulatan pakai bulat() setengah-ke-atas, bukan round() (half-even). Mengisi nol memindahkan ~1800 vonis tren dari null ke datar: label 'datar' pada deret nol berarti tak ada kejadian tercatat.
- 2026-10-30 · KM-B02 putaran 4: tren 'jarang' bila tahun berkejadian (>0) < MASALAH.TREN_MIN_TAHUN_ADA (3, konst.py=konst.js); deret hampir nol tidak boleh berlabel datar. Vonis tren sesudah aturan: jarang 1495, datar 849, naik 740, turun 118, null 0 (dari 3202).
- 2026-11-01 · 2026-11-01 · Permintaan 'silang logbook Pusdalops ke masalah otomatis + pakar + paper' DITAHAN: masalah.py (KM-B03), korpus.py (C06), BM25 (C07) belum ada (hanya profil_daerah blok umum), korpus pakar privat R2 tak ada di repo, ALGORITMA §3.3 tabel aturan masalah tertutup (logbook sumber baru perlu amandemen pemilik). Saran: B03 dulu dengan aturan logbook sebagai tambahan §3.3 setelah pemilik setuju.
- 2026-11-02 · KM-B03 masalah.py: persentil nasional butuh 514 kab, jadi profil_daerah.bangun() selalu membangun semua lalu menyaring --kab (fixture 3 kab berpersentil atas 3). Vonis model gagal bukan masalah (keputusan 2 Nov, butir 25), hanya bukti pada masalah pertama pasangan. D=0 bila DIBI memuat bahaya itu di kab mana pun; JENIS_DIBI_BAHAYA di profil_daerah.py, 'Banjir dan Tanah Longsor' dan 'Gempa Bumi dan Tsunami' dihitung ganda. Celah: A5 mendominasi (1169 dari 2917) karena renkon tercatat hanya 22 kab; kelas hanya P1 554/P2 651 pasangan.
- 2026-11-02 · 2026-11-02 · KM-B04 ringkas/prov: kejadian di ringkas = total 'semua' (CKAN, 2024 lengkap), bukan jumlah DIBI tanpa 2024 (batas bawah); top3 bahaya = masalah_skor urut skor menurun, seri nama menaik, skor null tak ikut, tanpa skor = null (1 kab); kapasitas n/5 = masalah._kap (null bila ada butir tak diketahui); nama prov dari public/data/meta.json 'provinsi'; ringkas 73 KB, 38 prov. Worktree tanpa node_modules: tests/warga/kemitraan_gerbang.test.mjs gagal ERR_MODULE_NOT_FOUND miniflare (bukan kode, ada juga di main).
