# DESAIN TEKNIS SIPPA: web `/pipa` dan pipeline data

Versi 1, 25 Oktober 2026. Status: usulan, menunggu persetujuan sesi induk.

Dokumen ini adalah spesifikasi pelaksanaan. Otoritasnya, berurutan: `KEPUTUSAN-SIPPA.md` (keputusan pemilik 1–53), `PRD.md` (§6, §7, §9, §10, §12), `AGENTS.md`, `~/.claude/TEST.md`, `~/.claude/INP.md`, `~/.claude/DUMMY.md`. Bila dokumen ini menyimpang dari PRD, penyimpangan itu sengaja, dicatat sebagai ADR di §9 dengan alasan yang bisa diperiksa ke kode, dan PRD perlu diselaraskan (daftar di §9.3). Tiket pelaksanaan ada di `TIKET.md` (SP-xxx); dokumen ini menjawab "bagaimana persisnya", tiket menjawab "siapa dan kapan".

Semua rujukan `berkas:baris` diperiksa terhadap checkout 25 Okt 2026 (commit `ee0ec05c` + perubahan kerja yang belum di-commit). Baris bisa bergeser; nama fungsi yang disebut tetap jadi jangkar.

Daftar isi: (1) arsitektur; (2) struktur berkas; (3) model data; (4) kontrak API; (5) fungsi murni dan rumus; (6) alur; (7) pipeline data; (8) keamanan, performa, observabilitas, deploy, dummy; (9) ADR dan pertanyaan terbuka.

---

## 1. Arsitektur

### 1.1 Gambaran

```
                       LOKAL (laptop pemilik, GDAL)                          GITHUB ACTIONS data.yml (harian 21.20 WIB)
 kendala.json, operasi.json, OSM, GLO-30, GSW,          fwi_ansambel.json, iklim_outlook.json, titik24.json (public/data)
 MCD64A1, CHIRPS, VIIRS mentah (data/raw, gitignore)                     |
        |                                                                 v
        v                                                   scripts/data/sippa/pemicu.py (stdlib)
 data/kajian-bnpb/bangun/pipa_data.py (sudah ada)                         |
        |  CSV per kompleks (data/kajian-bnpb/pipa/data/*.csv)             |
        v                                                                 |
 scripts/data/sippa/{sel22,zona,nasional,aoi}.py (stdlib)                  |
        |                                                                 |
        v                                                                 v
 data/sippa/keluaran/*.json  (di-commit; garis keturunan buku)    /tmp/sippa/pemicu.json (tidak di-commit)
        |  wrangler r2 object put (manual atau workflow_dispatch)        |  wrangler r2 object put (tiap jalan)
        +--------------------------------+-------------------------------+
                                         v
                      R2 bucket poskokarhutla-foto (binding MEDIA)
                      sippa/<nama>.json   sippa-foto/<id16>   sippa-laporan/<id16>.pdf
                                         |
                                         v
 Cloudflare Worker centurisk97 (src/worker.js + src/sippa.js, D1 poskowarga: sippa_* 0055-0057, pantau_jejak, laju_bnpb)
   GET  /pipa, /pipa/<layar>, /pipa/kit/:id  -> cangkang HTML staf (cek sesi di rute; CSP_SIPPA)
   GET  /pipa/lapangan                       -> cangkang form luring (tanpa sesi; CSP_LAPANGAN)
   *    /api/sippa/*                          -> JSON; R2 dialirkan apa adanya; D1 lewat bind
   cron menit 17 (bersihSemua)               -> ringkas + buang telemetri > 30 hari
                                         |
                                         v
 Peramban staf (desktop)            Ponsel operator (luring)              Gateway sensor (2027)
 public/pipa/app.js + layar_*.js    public/pipa/lapangan.js + antre.js    POST /api/sippa/telemetri
 (aset statis tanpa data)           sw-lapangan.js scope /pipa/lapangan   Authorization: Bearer <token>
```

### 1.2 Prinsip yang mengikat semua bagian

1. **Tidak ada data di `public/pipa/**`.** Seluruh `public/` terbit sebagai aset statis yang terbaca tanpa login (wrangler.jsonc:8, `run_worker_first` hanya `/*.html`). Berkas di `public/pipa/` hanya kode dan teks antarmuka. Data turunan tinggal di R2 `sippa/`, data operasi di D1. Pola persis `src/risiko7.js:1-4`.
2. **Tidak ada berkas `.html` di `public/pipa/`.** Cangkang dibangkitkan worker dari string (pola `halaman()` src/admin_halaman.js:46). Alasannya: berkas `.html` di `public/` bisa dibuka langsung lewat nama dan di host publik (`pantau.terasurban.com`) dilayani aset tanpa CSP halaman (worker.js:615-622 hanya menggerbang di host terkunci).
3. **Rute memeriksa haknya sendiri sebelum menyentuh R2 atau D1.** Tamu tidak boleh tahu apakah sebuah berkas atau baris ada (src/risiko7.js:3-4, 15).
4. **Satu sumber rumus.** `public/pipa/hitung.js` (ES module) dipakai layar, Studio, 3D, laporan, dan diimpor worker bila perlu; kembar Python di `scripts/data/sippa/hidraulika.py`, dijaga uji kembar (§5.9).
5. **Tulisan D1 dihemat.** Akun Workers/D1 gratis: 100 rb baris tertulis per hari, dipakai bersama seluruh situs (src/statistik.js:37). Karena itu batas laju hanya di rute tulis dan di kegagalan autentikasi (pola src/inventaris.js:127), dan telemetri disimpan per pesan, bukan per bacaan (ADR-07).

### 1.3 Batas staf saja (keputusan 32)

| Pintu | Siapa | Pemeriksaan |
| --- | --- | --- |
| `/pipa`, `/pipa/<layar>`, `/pipa/kit/:id`, semua `GET /api/sippa/*` selain lapangan | admin (`adminOK`, worker.js:401) atau staf berperan `pusdalops`, `koordalops`, `pimpinan` | `stafOK(env, req, P_SIPPA_BACA)` src/staf.js:54 |
| `POST /api/sippa/*` staf | admin atau staf `pusdalops`, `koordalops` | `stafOK(env, req, P_SIPPA_TULIS)`; sesi staf wajib header `x-pb: 1` (src/staf.js:7, 39) |
| buat kit, status `hilang`/`pensiun`/`ditemukan`, daftar perangkat, status evaluator A/B | admin moderator ke atas | `modOK` src/posko.js:44 (akun gerbang `AKUN_SITUS` bukan moderator) |
| dummy isi/hapus | Super Admin | `superOK` src/posko.js:48 |
| `/pipa/lapangan`, `/api/sippa/lapangan/*` | operator berkode penugasan | `pemegangKode` src/bnpb.js:26, header `x-kode` (26 heks) |
| `POST /api/sippa/telemetri` | gateway/perangkat bertoken | `Authorization: Bearer`, sha256 dicocokkan ke `sippa_perangkat.token_sha` |

Data SIPPA tidak ikut `/api/v1`, `/mcp`, `llms.txt`, atau `sitemap.xml`.

### 1.4 Perubahan gerbang host

Gerbang host terkunci (`centurisk97.id`) di worker.js:730 memanggil `halamanTerkunci` (worker.js:615-622) yang hanya mengenal `adminOK`. Rute `GET /pipa` yang terdaftar di `RUTE` akan dianggap halaman terkunci, sehingga staf bersesi `sesi_staf` dipantulkan ke `/admin/masuk` walau berhak. Perubahan:

1. worker.js:621: regex pengecualian `^\/(api|admin|ews|ubin)(\/|$)` menjadi `^\/(api|admin|ews|ubin|pipa)(\/|$)`. Semua rute `/pipa*` menjaga dirinya sendiri (§4.2).
2. worker.js:611: `PUBLIK_TANPA_SESI` tidak perlu entri `/pipa/lapangan`, karena seluruh `/pipa*` kini dikecualikan dari gerbang host dan `/pipa/lapangan` memang tanpa sesi. Uji posko.test.mjs:640 yang mengunci daftar putih "persis empat halaman" tetap hijau tanpa disentuh. Sebagai ganti, `tests/warga/sippa.test.mjs` membuktikan di host `centurisk97.id`: `/pipa` tanpa sesi 303, `/pipa/lapangan` 200, dan regex worker.js memuat `pipa` (uji teks, pola rumah_rusak.test.mjs:186-191).
3. Pemindai halaman di posko.test.mjs:647 memakai regex yang sama; ditambah `pipa` di regexnya dalam commit yang sama supaya pemindai dan worker tidak bercabang (uji itu hanya memindai tujuh berkas lama, jadi tidak ada asersi yang melemah).
4. Tamu yang membuka `/pipa*` dialihkan 303 ke `/admin/pantau?ke=<jalur>`, bukan `/admin/masuk`. `/admin/masuk` hanya menerima akun admin (src/statistik.js:235-253); layar masuk staf ada di Meja Pantau (src/pantau.js:287, src/statistik.js:257). `public/admin/pantau.js` ditambah satu langkah: sesudah masuk staf sukses, bila `ke` cocok `^/pipa(/|$)` maka `location.href = ke` (jalur sama asal saja, tidak ada URL penuh). Tombol "Masuk sebagai admin" di layar itu meneruskan `ke` yang sama ke `/admin/masuk?ke=`. Lihat ADR-05.
5. Sesi sah tanpa peran SIPPA (staf peran lain, akun pemirsa, akun gerbang): 403 halaman polos "Akunmu tidak punya akses SIPPA", tanpa pengalihan (mencegah pantulan tanpa akhir yang diperbaiki commit `c24a3c2a`, dijaga tests/warga/admin-403-pantul.test.mjs:9-14; uji itu diperluas ke `public/pipa/*.js`).

---

## 2. Struktur berkas

### 2.1 Berkas baru dan berubah

Pemilik dari `node scripts/agents/ilmu.mjs pemilik <berkas>` (diperiksa 25 Okt 2026), kecuali yang bertanda * yang baru dimiliki setelah agent `sippa` lahir.

| Berkas | Baru/ubah | Isi | Pemilik |
| --- | --- | --- | --- |
| `src/sippa.js` | baru | semua rute `/pipa*` dan `/api/sippa/*`, `RUTE_SIPPA`, `RANTAI_DUMMY`, `butirSippa` (Meja Pantau), `bersihkanSippa` (cron) | warga-api |
| `src/worker.js` | ubah | impor `RUTE_SIPPA` + spread di `RUTE` (worker.js:506-557); regex worker.js:621; `bersihkanSippa` di `bersihSemua` (worker.js:807) | warga-api |
| `src/admin_halaman.js` | ubah | `HAL.pipa = ["💧", "SIPPA"]` (baris 18), `HALAMAN_STAF.pipa` (baris 29), `halamanSippa(layar, ctx)`, `halamanSippaLapangan()`, `CSP_SIPPA` | warga-api |
| `src/posko.js` | ubah | `export` pada `CSP_LAPANGAN` (posko.js:666), tanpa mengubah isinya | warga-api |
| `src/pantau.js` | ubah | `JENIS.sippa_alarm`, `JENIS.sippa_mingguan`, detektor di `DETEKTOR` (pantau.js:131), `sippa_` di regex tabel-belum (pantau.js:137) | warga-api |
| `public/admin/pantau.js` | ubah | `JENIS` sama dengan server; pengalihan `ke` ke `/pipa*` sesudah masuk staf | warga-api |
| `migrations/0055_sippa_inti.sql` | baru | §3.2 | warga-api |
| `migrations/0056_sippa_ab_skenario.sql` | baru | §3.3 | warga-api |
| `migrations/0057_sippa_telemetri.sql` | baru | §3.4 | warga-api |
| `tests/warga/sippa_skema.test.mjs` | baru | CHECK/trigger 0055–0057 (Miniflare, D1 lokal) | warga-api |
| `tests/warga/sippa.test.mjs` | baru | rute, hak, gerbang host, dummy | warga-api |
| `tests/warga/sippa_alur.test.mjs` | baru | alur lintas-tabel ujung ke ujung | warga-api |
| `tests/warga/cakupan.json` | ubah | tiap rute dan tabel/trigger baru di `diuji` | warga-api |
| `tests/warga/posko.test.mjs` | ubah | regex pemindai baris 647 ditambah `pipa` | warga-api |
| `tests/warga/admin-403-pantul.test.mjs` | ubah | juga memindai `public/pipa/*.js` | warga-api |
| `tests/warga/migrasi_beku.json` | ubah sesudah deploy | sha256 0055–0057 | warga-api |
| `tests/warga/gerbang.test.mjs` | ubah | `"sippa"` ditambah ke daftar modul `bn` (RENCANA-UJI §0.4) | warga-api |
| `tests/warga/regu_luring.test.mjs` | ubah | kasus scope `/pipa/lapangan` (§6.1.1) | warga-api |
| `.github/workflows/terbit.yml` | ubah | langkah `npm run uji:sippa` sesudah `uji:warga`, sebelum terbit | mekanik-mesin |
| `public/pipa/app.js` | baru | router History API, bilah konteks, tema, muat malas layar | sippa* |
| `public/pipa/keadaan.js` | baru | elemen keadaan standar (memuat, kosong, galat, luring, basi, menunggu) | sippa* |
| `public/pipa/hitung.js` | baru | fungsi murni §5 (ES module) | sippa* |
| `public/pipa/formulir.js` | baru | daftar medan dan batas form lapangan, dipakai klien DAN diimpor `src/sippa.js` | sippa* |
| `public/pipa/antre.js` | baru | antrean IndexedDB `sippa-antre` | sippa* |
| `public/pipa/batas.js` | baru | teks "Batas pemakaian alat" (Lampiran K) | sippa* |
| `public/pipa/ikon.js` | baru | sprite SVG garis | sippa* |
| `public/pipa/laporan_isi.js` | baru | `isiLaporan(jenis, data)` murni | sippa* |
| `public/pipa/laporan_pdf.js` | baru | perender jsPDF | sippa* |
| `public/pipa/studio_mesin.js` | baru | salinan mesin Studio pemilik + `gerbangSippa` (skrip klasik) | sippa* |
| `public/pipa/studio_pekerja.js` | baru | Web Worker Monte Carlo | sippa* |
| `public/pipa/adegan.js` | baru | logika murni 3D + runtime three | sippa* |
| `public/pipa/lapangan.js` | baru | layar form luring | sippa* |
| `public/pipa/layar_ringkas.js`, `layar_peta.js`, `layar_hitung.js`, `layar_pemicu.js`, `layar_kit.js`, `layar_log.js`, `layar_ab.js`, `layar_studio.js`, `layar_3d.js`, `layar_telemetri.js`, `layar_laporan.js`, `layar_data.js` | baru | satu modul per layar, dimuat `import()` | sippa* |
| `public/pipa/pipa.css`, `adegan.css` | baru | gaya | sippa* |
| `public/sw-lapangan.js` | ubah | scope `/pipa/lapangan` (§6.1.1) | layar-peta |
| `public/vendor/three/**` | baru | three 0.169.0 + OrbitControls ditulis ulang impornya, LICENSE, README | layar-peta |
| `public/vendor/qrcode/qrcode.min.js`, `LICENSE` | baru | qrcode-generator 1.4.4 (MIT) | layar-peta |
| `tests/sippa/hitung.test.mjs`, `kembar.test.mjs`, `formulir.test.mjs`, `studio_mesin.test.mjs`, `adegan_logika.test.mjs`, `laporan_isi.test.mjs`, `keadaan.test.mjs`, `antre.test.mjs`, `kontras.test.mjs`, `garis_keturunan.test.mjs`, `gerbang-sippa.test.mjs`, `gerbang-cakupan.test.mjs` | baru | uji tanpa DB (RENCANA-UJI §1.1, §7.3) | sippa* |
| `tests/sippa/cakupan.json` | baru | registri cakupan logika klien dan pipeline (RENCANA-UJI §7.2) | sippa* |
| `tests/sippa/fixtures/acuan.json`, `studio_konstanta.json` | baru | kasus acuan bersama JS–Python (§5.8); konstanta beku mesin Studio | sippa* |
| `scripts/data/sippa/hidraulika.py`, `respons.py`, `zona.py`, `sel22.py`, `nasional.py`, `pemicu.py`, `aoi.py`, `bersama.py`, `kembar_cli.py`, `pilot_cek.py` | baru | pipeline §7; `pilot_cek.py` = pemeriksa kelengkapan data pilot (RENCANA-UJI §6.1) | pipa-data |
| `data/sippa/keluaran/*.json` | baru | keluaran yang di-commit | pipa-data |
| `data/kajian-bnpb/pipa/sumber/Karhutla_Decision_Dashboard.html` | baru | salinan berkas pemilik dari `~/Downloads` (sumber port Studio, SP-040) | pipa-data |
| `.github/workflows/data.yml` | ubah | langkah pemicu + unggah R2 (§7.4) | mekanik-mesin |
| `package.json` | ubah | `"uji:sippa": "node --test --test-concurrency=1 tests/sippa/*.test.mjs"`, dirangkai ke `"uji"` | mekanik-mesin |
| `scripts/agents/roster.json`, `AGENTS.md` §2 | ubah | agent `sippa` (§2.2) dan agent `penulis-kajian` (§2.3), baris modul | mekanik-mesin |
| `.claude/ilmu-agent/sippa.md`, `.claude/ilmu-agent/penulis-kajian.md` | baru | ilmu awal dari kode dan naskah nyata | sippa*, penulis-kajian* |

Tidak dibuat: `src/sippa_formulir.js` (PRD §9.9); worker mengimpor `public/pipa/formulir.js` langsung, pola worker.js:6 yang sudah mengimpor `../public/informasi_jenis.js` (ADR-03). Tidak dibuat: `docs/sippa/**` (tidak ada isinya; YAGNI).

### 2.2 Entri roster `sippa`

Medan mengikuti `_catatan` scripts/agents/roster.json (nama, kelas, model, ringkas, kapan, fokus, larangan, bisa, tidak, milik untuk pengerja). Dikerjakan `mekanik-mesin`, lalu `npm run agents:build`.

```json
{
  "nama": "sippa",
  "kelas": "pengerja",
  "model": "sonnet",
  "ringkas": "Pengerja layar staf SIPPA /pipa: cangkang klien, layar perencanaan dan operasi, form lapangan luring, fungsi hitung murni, Studio, 3D, laporan PDF, dan uji tanpa DB-nya.",
  "kapan": "public/pipa/**, tests/sippa/** disentuh atau rusak, atau rumus hidraulika/zona/pemicu di sisi klien berubah",
  "fokus": [
    "public/pipa/** terbit sebagai aset publik: hanya kode dan teks antarmuka, tidak pernah data; data dari /api/sippa/* dan R2 sippa/",
    "hitung.js = satu sumber rumus; kembar Python scripts/data/sippa/*.py dijaga tests/sippa/kembar.test.mjs terhadap fixtures/acuan.json",
    "Mesin Studio disalin apa adanya dari berkas pemilik; perubahan hanya tiga jenis bertanda komentar SIPPA:, gerbangSippa hanya menambah hambatan",
    "INP: chrome kontrol urgent di handler, kerja berat lewat nanti() atau Web Worker; sakelar peta setLayoutProperty/setFilter",
    "Angka lewat fmt (public/inti/format.js), tanpa toFixed di teks tampil; tiap angka bersumber dan berpil keyakinan; tanpa kata terbukti"
  ],
  "larangan": "Jangan menyentuh src/**, migrations/** (minta ke warga-api) atau scripts/data/** (minta ke pipa-data). Jangan menyalin modul public/inti ke public/pipa. Jangan deploy, commit, push, atau melonggarkan gerbang.",
  "bisa": "membangun dan membetulkan layar /pipa, fungsi hitung murni JS, mesin Studio, adegan 3D, laporan PDF, dan uji tests/sippa",
  "tidak": "worker dan D1; pipeline Python; vendor pustaka (layar-peta); memeriksa kerjanya sendiri",
  "milik": ["public/pipa/**", "tests/sippa/**"]
}
```

Baris baru AGENTS.md §2: `| SIPPA /pipa | public/pipa/**, tests/sippa/** (layar); src/sippa.js, migrations/0055-0057 (warga-api); scripts/data/sippa/** (pipa-data) | R2 sippa/, D1 sippa_*; pemicu harian di data.yml | sippa |`.

### 2.3 Entri roster `penulis-kajian`

Penulisan naskah buku kajian sudah berulang kali jatuh ke `general-purpose` (kajian air, mitigasi, dan kini SIPPA), sehingga AGENTS.md §1.5 memberi otoritas membuat agent tanpa izin per kasus. Glob paling spesifik menang (`spesifik()` di scripts/agents/ilmu.mjs:243), jadi `data/kajian-bnpb/naskah/**` jatuh ke agent ini walau `pipa-data` memegang `data/**`. Dikerjakan `mekanik-mesin` (TIKET SP-085), lalu `npm run agents:build`.

```json
{
  "nama": "penulis-kajian",
  "kelas": "pengerja",
  "model": "sonnet",
  "ringkas": "Pengerja naskah buku kajian BNPB: berkas bukti, naskah bab, bagian depan, lampiran tertulis, dan spek deck dalam dialek NASKAH-SPEK, angka hanya lewat token registri.",
  "kapan": "data/kajian-bnpb/naskah/** ditulis, disunting, atau gagal gerbang naskah.py/slop.py",
  "fokus": [
    "Klaim hanya dari berkas bukti naskah/<kajian>/bukti/bab-NN.md dan sumbernya; angka hanya token {{angka:<kajian>.*}}",
    "Satu berkas satu front matter: 00-depan-*.md (bagian), bab-NN.md (bab), 90-lampiran-<huruf>.md (lampiran); bangun/docx/bangun.py:430 mengurutkan dari front matter",
    "Larangan keputusan 50 SIPPA dan ANTI-SLOP.md; tanpa em dash, titik tengah, kata terbukti tanpa uji yang dikutip"
  ],
  "larangan": "Jangan menyentuh bangun/**, qa/**, data/angka.json, tema.json (minta ke pipa-data). Jangan menilai naskahnya sendiri: penyunting dan pemeriksa selalu agent lain. Jangan commit, push, atau melonggarkan gerbang.",
  "bisa": "menulis berkas bukti, naskah bab, bagian depan, lampiran tertulis, spek deck.json, dan menyunting naskah sampai naskah.py dan slop.py lolos",
  "tidak": "registri angka, pembangun DOCX/PPTX, gerbang QA, data turunan; memeriksa kerjanya sendiri",
  "milik": ["data/kajian-bnpb/naskah/**"]
}
```

---

## 3. Model data

### 3.1 Berkas JSON turunan (R2 `sippa/<nama>.json`)

Aturan bersama semua berkas:

- Objek akar dengan urutan kunci: `dibuat` (string ISO 8601 WIB, `YYYY-MM-DDTHH:MM+07:00`, kunci pertama), `per` (tanggal data `YYYY-MM-DD`), `versi` (`"sippa_<nama>/1"`), `ambang` (objek atau null), `sumber` (larik `{nama, lisensi, tarik}`), `catatan` (string), lalu isi.
- Angka jarak dalam km dibulatkan 0,01; elevasi dalam m 0,1; persen 0,1. Nilai tidak ada = `null`, tidak pernah `0` pengganti.
- JSON polos UTF-8 tanpa `Content-Encoding`, ukuran ≤ 8 MB (`MAKS_BYTE`, src/risiko7.js:8); skrip menolak menulis bila lebih (`assert len(teks) <= 8*1024*1024`).
- `keyakinan` per medan memakai nilai tetap: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan`, `menunggu`, `hipotesis`.

Daftar tetap nama (sama dengan `DATA_SIPPA` di `src/sippa.js`): `kelayakan_kompleks`, `kelayakan_sel`, `zona`, `sel22`, `kit_nasional`, `pemicu`, `aoi_calon`.

#### 3.1.1 `kelayakan_kompleks.json`

Isi: `n` (bilangan bulat), `kolom_keyakinan` (objek medan → label), `kompleks` (larik objek, satu per kompleks, urut `id`).

| Medan | Tipe | Satuan | Asal | Keyakinan |
| --- | --- | --- | --- | --- |
| `id` | string `K####` | | kendala.json | |
| `prov` | string 2 digit | | kendala.json | resmi |
| `kab` | string | | kendala.json | resmi |
| `lat`, `lon` | number (4 desimal) | derajat | operasi.json | estimasi-model |
| `gambut` | boolean | | kendala.json | resmi |
| `air_km_lama` | number/null | km | kendala.json `air_km` | terverifikasi |
| `air_km_semua` | number/null | km | osm_jarak.csv `air_semua_km` | terverifikasi |
| `air_km_kecil` | number/null | km | osm_jarak.csv `air_kecil_km` | terverifikasi |
| `air_jenis` | string/null | | osm_jarak.csv `air_semua_jenis` | terverifikasi |
| `jalan_km_lama` | number/null | km | kendala.json `jalan_km` (null = tanpa rute) | terverifikasi |
| `jalan_km_utama` | number/null | km | osm_jarak.csv `jalan_utama_km` (tersier ke atas) | terverifikasi |
| `jalan_km_semua` | number/null | km | osm_jarak.csv `jalan_kend_km` (termasuk `track`) | terverifikasi |
| `jalan_km_setapak` | number/null | km | osm_jarak.csv `jalan_setapak_km` | terverifikasi |
| `terpotong` | objek boolean `{jalan_semua, jalan_utama, air_semua}` | | kolom `_terpotong` (batas 16 km) | |
| `zona_k` | `"A"`–`"D"` | | `zona(air_km_lama, jalan_km_lama)`: versi `kendala.json` (label layar "Konservatif") | terverifikasi (turunan) |
| `zona_u` | `"A"`–`"D"` | | `zona(air_km_semua, jalan_km_utama)`: versi jalan utama OSM (tersier ke atas) | terverifikasi (turunan) |
| `zona_o` | `"A"`–`"D"` | | `zona(air_km_semua, jalan_km_semua)`: versi semua jalan OSM (label layar "Optimistis") | terverifikasi (turunan) |
| `elev_kompleks_m`, `elev_air_m` | number/null | m | dem_elevasi.csv | terverifikasi (DSM berkanopi) |
| `beda_air_m` | number/null | m (air minus kompleks; negatif = air lebih rendah) | dem_elevasi.csv | terverifikasi |
| `gsw` | `"permanen"`, `"musiman"`, `"tak_terdeteksi"` | | gsw_air_terdekat.csv `gsw_kelas` | terverifikasi |
| `terbakar_n_2km`, `terbakar_n_5km` | integer 0–25 | tahun | area_terbakar.csv (jendela 5x5 dan 11x11 piksel MCD64A1, sekitar 2,3 dan 5 km) | terverifikasi |
| `terbakar_akhir` | integer/null | tahun | `bakar_tahun_terakhir_2km` | terverifikasi |
| `kekerapan_sel22` | integer 0–14 | tahun aktif 2012–2025 | sel22.json sel yang memuat kompleks | terverifikasi |
| `chirps_anom_akhir_pct` | number/null | % | chirps_anomali_tahunan.csv tahun terakhir | terverifikasi |
| `kaw` | `"lain"`, `"konsesi"`, `"konservasi"` | | kompleks_konsesi.json (tanpa nama perusahaan) | terverifikasi |
| `khg` | string/null | | khg_prioritas.json | resmi |
| `jam_tiba` | number/null | jam | min `akses.json[id].dari[].jam`; null bila belum dihitung | estimasi-model |

Contoh satu baris (nilai nyata K0001 dari CSV di `data/kajian-bnpb/pipa/data/`):

```json
{"id":"K0001","prov":"62","kab":"Seruyan","lat":-3.1201,"lon":112.1635,"gambut":true,
 "air_km_lama":1.31,"air_km_semua":1.49,"air_km_kecil":1.49,"air_jenis":"parit",
 "jalan_km_lama":null,"jalan_km_utama":16.0,"jalan_km_semua":15.79,"jalan_km_setapak":16.0,
 "terpotong":{"jalan_semua":false,"jalan_utama":true,"air_semua":false},
 "zona_k":"B","zona_u":"B","zona_o":"B","elev_kompleks_m":25.5,"elev_air_m":13.0,"beda_air_m":-12.5,
 "gsw":"tak_terdeteksi","terbakar_n_2km":1,"terbakar_n_5km":3,"terbakar_akhir":2003,
 "kekerapan_sel22":4,"chirps_anom_akhir_pct":-31.2,"kaw":"lain","khg":null,"jam_tiba":null}
```

(`kekerapan_sel22`, `chirps_anom_akhir_pct`, `kaw`, `khg` pada contoh adalah ilustrasi bentuk; nilai dihitung skrip.)

`ambang`: `{"air_km": 2.5, "jalan_km": 5.0, "aturan": "A bila air < 2,5 dan jalan < 5; B bila air < 2,5 dan jalan >= 5 atau null; C bila air >= 2,5 dan jalan < 5; D sisanya"}` (ADR-01).

#### 3.1.2 `kelayakan_sel.json`

Sel 2,2 km = kisi 0,02 derajat (pola `SEL = 0.02` scripts/data/citra.py:37). Indeks `i = floor((lat + 11.5) / 0.02)`, `j = floor((lon - 94.5) / 0.02)`, id `"s{i}_{j}"`, pusat `lat = -11.5 + (i + 0.5) * 0.02`. Disimpan kolomar karena jumlah sel besar:

```json
{"dibuat":"...","per":"2025-12-31","versi":"sippa_kelayakan_sel/1","ambang":{"air_km":2.5,"jalan_km":5.0},"sumber":[...],"catatan":"...",
 "kolom":["sel","lat","lon","tahun_aktif","deteksi","gambut","zona_k_terdekat","kompleks_terdekat","kompleks_km"],
 "baris":[["s413_880",-3.23,112.11,9,214,true,"B","K0001",4.12]]}
```

`tahun_aktif` 0–14 (tahun 2012–2025 dengan ≥ 1 deteksi VIIRS confidence nominal/high), `deteksi` jumlah deteksi, `gambut` dari peta gambut yang dipakai `kendala.py`, `zona_k_terdekat` zona konservatif kompleks terdekat dalam 5 km (null bila tidak ada). PRD meminta jarak air dan jalan per sel; itu butuh langkah GIS per sel yang belum ada, jadi v1 memakai zona kompleks terdekat dan menandainya di `catatan` (butir teknis BT-03, §9.2).

#### 3.1.3 `zona.json`

```json
{"dibuat":"...","per":"2026-10-23","versi":"sippa_zona/1","ambang":{"air_km":2.5,"jalan_km":5.0},"sumber":[...],"catatan":"...",
 "baris":[{"prov":"62","kab":null,"versi":"k","A":188,"B":418,"C":89,"D":170,"n":865,
           "median_air_km":1.28,"median_jalan_km":6.66,"tanpa_jalan_16km":null},
          {"prov":"62","kab":null,"versi":"u","A":198,"B":429,"C":81,"D":157,"n":865, ...},
          {"prov":"62","kab":null,"versi":"o","A":469,"B":158,"C":167,"D":71,"n":865,
           "median_air_km":1.02,"median_jalan_km":2.27,"tanpa_jalan_16km":44}, ...]}
```

`kab: null` = baris provinsi. `versi`: `"k"` = versi `kendala.json` (air dan jalan `kendala.json`, label layar "Konservatif"); `"u"` = jalan utama OSM tersier ke atas × semua air OSM; `"o"` = semua jalan kendaraan OSM termasuk `track` × semua air OSM (label layar "Optimistis"). Median versi `k` dihitung atas nilai bukan null (`jalan_km_lama` null pada 134 kompleks, jadi `tanpa_jalan_16km` null untuk versi itu). Invarian: `A+B+C+D = n`. Median dihitung dengan `kuantil(..., 0.5)` tipe 7 atas nilai bukan null.

#### 3.1.4 `sel22.json`

`{"...", "kolom":["sel","tahun_aktif","per_tahun"], "baris":[["s413_880",9,[0,3,0,12,...]]], "ringkas":{"ge3":n,"ge5":n,"ge7":n,"ge10":n}}`; `per_tahun` 14 bilangan (2012–2025).

#### 3.1.5 `kit_nasional.json`

`baris`: `{prov, kelompok ("gambut"|"mineral"), luas_puncak_ha, tahun_puncak, kit, musim_banjir_pasangan (boolean)}`; akar memuat `"ha_per_kit": {"nilai": 22700, "keyakinan": "asumsi-kebijakan"}`, `"total": 81`, `"gambut": 56`. Contoh: `{"prov":"62","kelompok":"gambut","luas_puncak_ha":317749,"tahun_puncak":2019,"kit":14,"musim_banjir_pasangan":true}`.

#### 3.1.6 `pemicu.json`

`baris`: `{prov, kab, tingkat ("NORMAL"|"SIAGA"|"PRA-POSISI"|"GELAR"), wilayah_iklim, musim, anom_pct, anom_p10, anom_p90, hari_ps50 (0–7 atau null), titik_panas_zona_ab (integer atau null), alasan (larik string)}`; akar memuat `ansambel_dibuat`, `titik24_acuan`, `basi` (`{ansambel: bool, titik24: bool}`). Contoh: `{"prov":"62","kab":"Pulang Pisau","tingkat":"PRA-POSISI","wilayah_iklim":"kalbar_kalteng","musim":"SON 2026","anom_pct":-29.5,"anom_p10":-45.6,"anom_p90":-13.3,"hari_ps50":4,"titik_panas_zona_ab":0,"alasan":["prakiraan SON 2026 Kalbar-Kalteng -29,5% dari normal","P(FWI >= 14) >= 0,5 pada 4 dari 7 hari"]}`.

#### 3.1.7 `aoi_calon.json`

`baris`: `{id, kab, kec, lat, lon, kekerapan, median_air_km, zona, kaw, catatan}`; `id` = id kompleks atau sel. Dibuat `aoi.py` saat diminta.

### 3.2 Migrasi `0055_sippa_inti.sql`

Nomor: migrasi terakhir di repo dan di `migrasi_beku.json` adalah `0054_kunci_api_konsesi.sql`; tidak ada `0055*`–`0057*` di cabang mana pun (`git log --all -- migrations/0055*` kosong). `0051` memang kosong dan tidak perlu diisi. Berkas nyasar `migrations/0053_kontak 2.sql` ikut terbaca `migrasi()` tests/warga/_bantu.mjs:7 (filter hanya `.sql`); laporkan ke `higiene-repo`, jangan disunting.

Gaya yang diikuti: `CREATE ... IF NOT EXISTS`, CHECK di kolom, trigger `BEFORE ... WHEN ... RAISE(ABORT, ...)` (migrations/0036_pemirsa.sql:21-32), append-only dengan pengecualian baris dummy (migrations/0030_staf.sql:86-94). Waktu = milidetik epoch UTC. Id = 16 heks dari `acak(8)` (worker.js:72) kecuali id butir lapangan (UUID v4 klien).

```sql
-- SIPPA inti (PRD §9.7.2; DESAIN-TEKNIS §3.2). Idempoten. Waktu = ms epoch UTC. Pemilik program BNPB, keputusan pemilik 24 Okt 2026.

CREATE TABLE IF NOT EXISTS sippa_kit (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kode TEXT NOT NULL UNIQUE CHECK (kode GLOB 'SIPPA-[0-9][0-9][0-9]'),
  jenis TEXT NOT NULL CHECK (jenis IN ('gambut', 'mineral', 'banjir', 'pinjam_pilot')),
  status TEXT NOT NULL DEFAULT 'gudang' CHECK (status IN ('gudang', 'depot', 'gelar', 'banjir', 'servis', 'hilang', 'pensiun')),
  lokasi TEXT CHECK (lokasi IS NULL OR length(lokasi) <= 120),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 60),
  pemilik_asal TEXT NOT NULL DEFAULT 'BMN BNPB' CHECK (length(pemilik_asal) BETWEEN 3 AND 80),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (dummy = 1 OR kode < 'SIPPA-900')            -- SIPPA-900..999 khusus dummy, tidak pernah bertabrakan dengan kit nyata
);
CREATE INDEX IF NOT EXISTS idx_sippa_kit_status ON sippa_kit (status);

CREATE TABLE IF NOT EXISTS sippa_komponen (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kit_id TEXT NOT NULL REFERENCES sippa_kit (id),
  kode_bom TEXT NOT NULL CHECK (kode_bom GLOB '[A-Z]*-[0-9]*' AND length(kode_bom) <= 12),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  jumlah REAL NOT NULL CHECK (jumlah > 0 AND jumlah <= 100000),
  satuan TEXT NOT NULL CHECK (satuan IN ('unit', 'm', 'set', 'paket')),
  nomor_seri TEXT CHECK (nomor_seri IS NULL OR length(nomor_seri) <= 60),
  kondisi TEXT NOT NULL DEFAULT 'baik' CHECK (kondisi IN ('baik', 'rusak_ringan', 'rusak_berat', 'hilang')),
  pemilik_asal TEXT CHECK (pemilik_asal IS NULL OR length(pemilik_asal) <= 80),
  alat_id TEXT CHECK (alat_id IS NULL OR length(alat_id) = 16),   -- rujukan lunak ke alat (0031) bila dipinjam instansi
  dicek INTEGER,
  musim_awal INTEGER NOT NULL DEFAULT 1 CHECK (musim_awal IN (0, 1)),  -- 1 = dihitung di penyebut kehilangan musim
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_komp_kit ON sippa_komponen (kit_id);

-- Transisi sah ditegakkan DI SINI (sumber kebenaran), hak per peran di src/sippa.js. Tabel §6.2.
CREATE TABLE IF NOT EXISTS sippa_gerak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 OR length(id) = 36),
  kit_id TEXT NOT NULL REFERENCES sippa_kit (id),
  dari_status TEXT NOT NULL,
  ke_status TEXT NOT NULL,
  ke_lokasi TEXT CHECK (ke_lokasi IS NULL OR length(ke_lokasi) <= 120),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 60),
  alasan TEXT NOT NULL CHECK (alasan IN ('pra_posisi', 'gelar', 'bongkar', 'pindah_banjir', 'kembali', 'servis', 'hilang', 'ditemukan', 'pensiun', 'koreksi')),
  rencana INTEGER NOT NULL DEFAULT 0 CHECK (rencana IN (0, 1)),
  eta_jam REAL CHECK (eta_jam IS NULL OR eta_jam BETWEEN 0 AND 720),
  tiba INTEGER,
  pengangkut TEXT CHECK (pengangkut IS NULL OR pengangkut IN ('yontp', 'bpbd', 'daops', 'manggala_agni', 'lain')),
  permintaan_dari TEXT CHECK (permintaan_dari IS NULL OR length(permintaan_dari) <= 120),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (dari_status || '>' || ke_status IN (
    'gudang>depot','gudang>gelar','gudang>banjir','gudang>servis','gudang>hilang','gudang>pensiun',
    'depot>gudang','depot>gelar','depot>banjir','depot>servis','depot>hilang',
    'gelar>gudang','gelar>depot','gelar>banjir','gelar>servis','gelar>hilang',
    'banjir>gudang','banjir>depot','banjir>gelar','banjir>servis','banjir>hilang',
    'servis>gudang','servis>hilang','servis>pensiun',
    'hilang>gudang','hilang>pensiun')),
  CHECK (rencana = 1 OR tiba IS NOT NULL)   -- gerak langsung selalu tiba saat dicatat; rencana diisi tiba belakangan
);
CREATE INDEX IF NOT EXISTS idx_sippa_gerak_kit ON sippa_gerak (kit_id, waktu);
CREATE INDEX IF NOT EXISTS idx_sippa_gerak_buka ON sippa_gerak (kit_id) WHERE tiba IS NULL;

-- dari_status harus status kit SEKARANG dan tidak boleh ada gerak rencana yang masih terbuka (kendali konkurensi optimistis)
CREATE TRIGGER IF NOT EXISTS sippa_gerak_cek BEFORE INSERT ON sippa_gerak
WHEN NEW.dari_status IS NOT (SELECT status FROM sippa_kit WHERE id = NEW.kit_id)
  OR EXISTS (SELECT 1 FROM sippa_gerak WHERE kit_id = NEW.kit_id AND tiba IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'status kit sudah berubah atau masih ada gerak terencana yang belum tiba');
END;
-- gerak langsung (tiba terisi) menerapkan status dan lokasi ke kit dalam transaksi yang sama
CREATE TRIGGER IF NOT EXISTS sippa_gerak_terapkan AFTER INSERT ON sippa_gerak
WHEN NEW.tiba IS NOT NULL
BEGIN
  UPDATE sippa_kit SET status = NEW.ke_status, diubah = NEW.waktu,
    lokasi = coalesce(NEW.ke_lokasi, lokasi), lat = coalesce(NEW.lat, lat), lon = coalesce(NEW.lon, lon),
    prov = coalesce(NEW.prov, prov), kab = coalesce(NEW.kab, kab)
  WHERE id = NEW.kit_id;
END;
-- satu-satunya UPDATE sah: mengisi tiba dari NULL; kit harus masih di dari_status
CREATE TRIGGER IF NOT EXISTS sippa_gerak_tetap BEFORE UPDATE ON sippa_gerak
WHEN OLD.tiba IS NOT NULL OR NEW.tiba IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.kit_id IS NOT OLD.kit_id OR NEW.dari_status IS NOT OLD.dari_status OR NEW.ke_status IS NOT OLD.ke_status
  OR NEW.alasan IS NOT OLD.alasan OR NEW.rencana IS NOT OLD.rencana OR NEW.waktu IS NOT OLD.waktu OR NEW.oleh IS NOT OLD.oleh OR NEW.dummy IS NOT OLD.dummy
  OR OLD.dari_status IS NOT (SELECT status FROM sippa_kit WHERE id = OLD.kit_id)
BEGIN
  SELECT RAISE(ABORT, 'sippa_gerak hanya bisa ditambah; satu-satunya ubahan sah adalah tiba dari kosong');
END;
CREATE TRIGGER IF NOT EXISTS sippa_gerak_tiba AFTER UPDATE OF tiba ON sippa_gerak
BEGIN
  UPDATE sippa_kit SET status = NEW.ke_status, diubah = NEW.tiba,
    lokasi = coalesce(NEW.ke_lokasi, lokasi), lat = coalesce(NEW.lat, lat), lon = coalesce(NEW.lon, lon),
    prov = coalesce(NEW.prov, prov), kab = coalesce(NEW.kab, kab)
  WHERE id = NEW.kit_id;
END;
CREATE TRIGGER IF NOT EXISTS sippa_gerak_hapus BEFORE DELETE ON sippa_gerak
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_gerak hanya bisa ditambah');
END;

CREATE TABLE IF NOT EXISTS sippa_tugas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kit_id TEXT REFERENCES sippa_kit (id),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  nama_regu TEXT NOT NULL CHECK (length(nama_regu) BETWEEN 2 AND 80),
  unsur TEXT NOT NULL CHECK (unsur IN ('manggala_agni', 'bpbd', 'yontp', 'mpa', 'lain')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR kompleks_id GLOB 'K[0-9]*'),
  lengan_dalam INTEGER NOT NULL DEFAULT 0 CHECK (lengan_dalam IN (0, 1)),
  mulai INTEGER NOT NULL,
  berakhir INTEGER NOT NULL CHECK (berakhir > mulai AND berakhir - mulai <= 2592000000),
  dicabut INTEGER,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_tugas_kit ON sippa_tugas (kit_id);

CREATE TABLE IF NOT EXISTS sippa_log_gelar (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 OR length(id) = 16),  -- UUID v4 klien (kirim ulang idempoten) atau 16 heks entri staf
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR kompleks_id GLOB 'K[0-9]*'),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  jenis TEXT NOT NULL CHECK (jenis IN ('karhutla', 'banjir', 'latihan')),
  kelas_medan TEXT CHECK (kelas_medan IS NULL OR kelas_medan IN ('I', 'II', 'III')),
  panjang_m REAL CHECK (panjang_m IS NULL OR panjang_m BETWEEN 0 AND 5000),
  n_orang INTEGER CHECK (n_orang IS NULL OR n_orang BETWEEN 1 AND 300),
  t_tiba INTEGER, t_mulai_gelar INTEGER, t_air_mengalir INTEGER, t_mulai_injeksi INTEGER, t_selesai INTEGER, t_bongkar_selesai INTEGER,
  jam_pompa REAL CHECK (jam_pompa IS NULL OR jam_pompa BETWEEN 0 AND 720),
  bbm_l REAL CHECK (bbm_l IS NULL OR bbm_l BETWEEN 0 AND 20000),
  air_m3 REAL CHECK (air_m3 IS NULL OR air_m3 BETWEEN 0 AND 1000000),
  banjir_m3 REAL CHECK (banjir_m3 IS NULL OR banjir_m3 BETWEEN 0 AND 10000000),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  foto_id TEXT CHECK (foto_id IS NULL OR length(foto_id) = 16),
  -- medan vonis pilot "dapat dipakai" (keputusan 53, §5.5.2)
  petak_id TEXT CHECK (petak_id IS NULL OR length(petak_id) BETWEEN 3 AND 40),
  air_sampai_lance INTEGER CHECK (air_sampai_lance IS NULL OR air_sampai_lance IN (0, 1)),
  p_ujung_bar REAL CHECK (p_ujung_bar IS NULL OR p_ujung_bar BETWEEN 0 AND 25),
  p_ujung_menit INTEGER CHECK (p_ujung_menit IS NULL OR p_ujung_menit BETWEEN 0 AND 1440),   -- lama terus-menerus pada >= 2 bar
  p_ujung_sumber TEXT CHECK (p_ujung_sumber IS NULL OR p_ujung_sumber IN ('gauge', 'operator')),
  kecelakaan INTEGER CHECK (kecelakaan IS NULL OR kecelakaan IN (0, 1)),
  bocor_henti_menit INTEGER CHECK (bocor_henti_menit IS NULL OR bocor_henti_menit BETWEEN 0 AND 1440),
  konfigurasi TEXT CHECK (konfigurasi IS NULL OR (json_valid(konfigurasi) AND length(konfigurasi) <= 4096)),  -- masukan hidraulika() kit yang dipakai
  koreksi_dari TEXT CHECK (koreksi_dari IS NULL OR length(koreksi_dari) IN (16, 36)),
  jam_klien_meleset INTEGER NOT NULL DEFAULT 0 CHECK (jam_klien_meleset IN (0, 1)),
  waktu_klien INTEGER NOT NULL,
  diterima INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (oleh GLOB 'tugas:*' OR oleh GLOB 'staf:*' OR length(oleh) = 12),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_log_kelas ON sippa_log_gelar (jenis, kelas_medan);
CREATE INDEX IF NOT EXISTS idx_sippa_log_kit ON sippa_log_gelar (kit_id, t_tiba);
CREATE TRIGGER IF NOT EXISTS sippa_log_urut BEFORE INSERT ON sippa_log_gelar
WHEN (NEW.t_tiba IS NOT NULL AND NEW.t_mulai_gelar IS NOT NULL AND NEW.t_mulai_gelar < NEW.t_tiba)
  OR (NEW.t_mulai_gelar IS NOT NULL AND NEW.t_air_mengalir IS NOT NULL AND NEW.t_air_mengalir < NEW.t_mulai_gelar)
  OR (NEW.t_air_mengalir IS NOT NULL AND NEW.t_mulai_injeksi IS NOT NULL AND NEW.t_mulai_injeksi < NEW.t_air_mengalir)
  OR (NEW.t_air_mengalir IS NOT NULL AND NEW.t_selesai IS NOT NULL AND NEW.t_selesai < NEW.t_air_mengalir)
  OR (NEW.t_selesai IS NOT NULL AND NEW.t_bongkar_selesai IS NOT NULL AND NEW.t_bongkar_selesai < NEW.t_selesai)
  OR (NEW.banjir_m3 IS NOT NULL AND NEW.jenis != 'banjir')
BEGIN
  SELECT RAISE(ABORT, 'urutan waktu tahap terbalik atau banjir_m3 pada jenis selain banjir');
END;
CREATE TRIGGER IF NOT EXISTS sippa_log_tetap BEFORE UPDATE ON sippa_log_gelar
BEGIN
  SELECT RAISE(ABORT, 'log gelar tidak disunting; koreksi = baris baru dengan koreksi_dari');
END;
CREATE TRIGGER IF NOT EXISTS sippa_log_hapus BEFORE DELETE ON sippa_log_gelar
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'log gelar hanya bisa ditambah');
END;

CREATE TABLE IF NOT EXISTS sippa_probe (
  id TEXT PRIMARY KEY CHECK (length(id) IN (16, 36)),
  log_id TEXT CHECK (log_id IS NULL OR length(log_id) IN (16, 36)),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  petak_id TEXT CHECK (petak_id IS NULL OR length(petak_id) BETWEEN 3 AND 40),
  titik TEXT NOT NULL CHECK (length(titik) BETWEEN 1 AND 20),
  tahap TEXT NOT NULL CHECK (tahap IN ('sebelum', 'sesudah', '24j', '72j', '7h', '30h', '90h')),   -- 'sesudah' = segera sesudah injeksi (keputusan 53 butir 5)
  kedalaman_cm INTEGER NOT NULL CHECK (kedalaman_cm IN (10, 30, 50, 100, 150, 300, 400, 500)),
  suhu_c REAL NOT NULL CHECK (suhu_c BETWEEN -10 AND 900),
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_probe_petak ON sippa_probe (petak_id, tahap);

CREATE TABLE IF NOT EXISTS sippa_bbm (
  id TEXT PRIMARY KEY CHECK (length(id) IN (16, 36)),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  log_id TEXT CHECK (log_id IS NULL OR length(log_id) IN (16, 36)),
  waktu INTEGER NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('bensin', 'solar')),
  aksi TEXT NOT NULL CHECK (aksi IN ('terima', 'keluar', 'kembali', 'koreksi')),
  liter REAL NOT NULL CHECK (liter > 0 AND liter <= 20000),
  operator TEXT CHECK (operator IS NULL OR length(operator) <= 80),
  tiket TEXT CHECK (tiket IS NULL OR length(tiket) <= 40),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TRIGGER IF NOT EXISTS sippa_bbm_tetap BEFORE UPDATE ON sippa_bbm
BEGIN
  SELECT RAISE(ABORT, 'buku BBM hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_bbm_hapus BEFORE DELETE ON sippa_bbm
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'buku BBM hanya bisa ditambah');
END;

CREATE TABLE IF NOT EXISTS sippa_foto (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/webp')),
  ukuran INTEGER NOT NULL CHECK (ukuran BETWEEN 1 AND 8388608),
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

CREATE TABLE IF NOT EXISTS sippa_jalan_cek (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kompleks_id TEXT NOT NULL CHECK (kompleks_id GLOB 'K[0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  musim TEXT NOT NULL CHECK (musim IN ('kemarau', 'hujan')),
  hasil TEXT NOT NULL CHECK (hasil IN ('lolos', 'gagal')),
  kendaraan TEXT CHECK (kendaraan IS NULL OR kendaraan IN ('pickup_4x4', 'truk', 'motor', 'jalan_kaki', 'perahu')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  foto_id TEXT CHECK (foto_id IS NULL OR length(foto_id) = 16),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_jalan ON sippa_jalan_cek (kompleks_id, waktu);

CREATE TABLE IF NOT EXISTS sippa_aoi_usul (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR kompleks_id GLOB 'K[0-9]*'),
  sel TEXT CHECK (sel IS NULL OR sel GLOB 's[0-9]*_[0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 5 AND 500),
  status TEXT NOT NULL DEFAULT 'usul' CHECK (status IN ('usul', 'survei', 'terpilih', 'ditolak')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (kompleks_id IS NOT NULL OR sel IS NOT NULL)
);
```

Catatan: kolom `prov` ditambahkan di `sippa_log_gelar`, `sippa_jalan_cek`, `sippa_aoi_usul`, `sippa_foto` (tidak ada di PRD) supaya penyaringan staf berwilayah satu klausa `WHERE prov IN (...)` tanpa gabung tabel; diisi server dari tugas atau kompleks, tidak pernah dari klien. `sippa_foto` adalah tabel kecil baru (pengganti kolom bebas `foto_kunci`) supaya kunci R2 selalu dibuat server dan foto bisa diperiksa hak wilayahnya (ADR-09).

### 3.3 Migrasi `0056_sippa_ab_skenario.sql`

```sql
CREATE TABLE IF NOT EXISTS sippa_ab_unggah (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama_berkas TEXT CHECK (nama_berkas IS NULL OR length(nama_berkas) <= 120),
  sha TEXT NOT NULL UNIQUE CHECK (length(sha) = 64),          -- berkas sama = 409 (UNIQUE, bukan cek JS saja)
  n_baris INTEGER NOT NULL CHECK (n_baris BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'ditinjau_evaluator')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TABLE IF NOT EXISTS sippa_petak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  unggah_id TEXT REFERENCES sippa_ab_unggah (id),
  petak_id TEXT NOT NULL CHECK (length(petak_id) BETWEEN 3 AND 40),
  aoi TEXT NOT NULL CHECK (length(aoi) BETWEEN 1 AND 40),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  lengan TEXT NOT NULL CHECK (lengan IN ('konvensional', 'lance', 'lance_surfaktan', 'sekat_rewetting', 'lance_dalam')),
  pasangan_id TEXT CHECK (pasangan_id IS NULL OR length(pasangan_id) <= 40),
  tanggal_perlakuan TEXT NOT NULL CHECK (tanggal_perlakuan GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  luas_m2 REAL NOT NULL CHECK (luas_m2 BETWEEN 1 AND 100000),
  regu_hari REAL CHECK (regu_hari IS NULL OR regu_hari BETWEEN 0 AND 1000),
  air_m3 REAL CHECK (air_m3 IS NULL OR air_m3 BETWEEN 0 AND 100000),
  surfaktan_l REAL NOT NULL DEFAULT 0 CHECK (surfaktan_l >= 0),
  biaya_rp INTEGER CHECK (biaya_rp IS NULL OR biaya_rp >= 0),
  dingin_24j INTEGER CHECK (dingin_24j IS NULL OR dingin_24j IN (0, 1)),
  dingin_72j INTEGER CHECK (dingin_72j IS NULL OR dingin_72j IN (0, 1)),
  nyala_7h INTEGER CHECK (nyala_7h IS NULL OR nyala_7h IN (0, 1)),
  nyala_30h INTEGER CHECK (nyala_30h IS NULL OR nyala_30h IN (0, 1)),
  nyala_90h INTEGER CHECK (nyala_90h IS NULL OR nyala_90h IN (0, 1)),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  sumber TEXT NOT NULL CHECK (sumber IN ('unggah', 'lapangan')),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (aoi, petak_id),
  CHECK (surfaktan_l = 0 OR lengan = 'lance_surfaktan')
);
CREATE INDEX IF NOT EXISTS idx_sippa_petak_lengan ON sippa_petak (aoi, lengan);
CREATE TABLE IF NOT EXISTS sippa_skenario (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 80),
  state TEXT NOT NULL CHECK (json_valid(state) AND json_type(state) = 'object' AND length(state) <= 32768),
  versi_mesin TEXT NOT NULL CHECK (length(versi_mesin) BETWEEN 3 AND 40),
  ringkas TEXT CHECK (ringkas IS NULL OR (json_valid(ringkas) AND length(ringkas) <= 8192)),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dihapus INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TABLE IF NOT EXISTS sippa_laporan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('pilot', 'kejadian', 'mingguan', 'musim', 'skenario')),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  parameter TEXT NOT NULL CHECK (json_valid(parameter) AND length(parameter) <= 8192),
  ada_berkas INTEGER NOT NULL DEFAULT 0 CHECK (ada_berkas IN (0, 1)),   -- kunci R2 = sippa-laporan/<id>.pdf, selalu dari server
  sha TEXT CHECK (sha IS NULL OR length(sha) = 64),
  ukuran INTEGER CHECK (ukuran IS NULL OR ukuran BETWEEN 1 AND 10485760),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (ada_berkas = 0 OR (sha IS NOT NULL AND ukuran IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_sippa_laporan_jenis ON sippa_laporan (jenis, waktu);
```

### 3.4 Migrasi `0057_sippa_telemetri.sql`

Bentuk penyimpanan diubah dari PRD (satu baris per bacaan) menjadi satu baris per pesan, karena kuota tulis D1 (ADR-07).

```sql
CREATE TABLE IF NOT EXISTS sippa_perangkat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kit_id TEXT NOT NULL REFERENCES sippa_kit (id),
  tag TEXT NOT NULL CHECK (tag GLOB '[A-Z]*-[0-9]*' AND length(tag) <= 12),
  tag_datar TEXT CHECK (tag_datar IS NULL OR length(tag_datar) <= 20),   -- kunci bentuk datar paket pemilik (mis. 'T03_50cm_C'), §6.3
  jenis TEXT NOT NULL CHECK (jenis IN ('gateway', 'tekanan', 'debit', 'level', 'suhu_gambut', 'muka_air_tanah', 'co', 'pm25', 'bbm', 'rpm', 'posisi')),
  satuan TEXT NOT NULL CHECK (satuan IN ('-', 'bar', 'm3/jam', 'L/s', 'm', 'C', 'ppm', 'ug/m3', '%', 'rpm', 'derajat')),
  kedalaman_cm INTEGER CHECK (kedalaman_cm IS NULL OR kedalaman_cm IN (10, 30, 50, 100, 150, 300, 400, 500)),
  min_sah REAL, maks_sah REAL CHECK (maks_sah IS NULL OR min_sah IS NULL OR maks_sah > min_sah),
  interval_s INTEGER NOT NULL DEFAULT 60 CHECK (interval_s BETWEEN 10 AND 3600),
  token_sha TEXT UNIQUE CHECK (token_sha IS NULL OR (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*')),
  aktif INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1)),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (kit_id, tag),
  CHECK (jenis != 'gateway' OR token_sha IS NOT NULL)
);
-- satu baris per pesan masuk; bacaan = [[tag, t_ms, nilai, mutu, kedalaman_cm|null], ...]; mutu 0 baik, 1 diragukan, 2 di luar rentang sah
CREATE TABLE IF NOT EXISTS sippa_telemetri (
  id TEXT PRIMARY KEY CHECK (length(id) = 32),          -- 32 heks awal sha256(token_sha || badan): kirim ulang pesan sama = diabaikan
  pengirim_id TEXT NOT NULL REFERENCES sippa_perangkat (id),
  kit_id TEXT NOT NULL,
  diterima INTEGER NOT NULL,
  t_awal INTEGER NOT NULL, t_akhir INTEGER NOT NULL CHECK (t_akhir >= t_awal),
  n INTEGER NOT NULL CHECK (n BETWEEN 1 AND 500),
  n_mutu2 INTEGER NOT NULL DEFAULT 0 CHECK (n_mutu2 BETWEEN 0 AND n),
  bacaan TEXT NOT NULL CHECK (json_valid(bacaan) AND json_type(bacaan) = 'array' AND length(bacaan) <= 65536),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
) ;
CREATE INDEX IF NOT EXISTS idx_sippa_tel_kit ON sippa_telemetri (kit_id, t_akhir);
CREATE INDEX IF NOT EXISTS idx_sippa_tel_pengirim ON sippa_telemetri (pengirim_id, diterima);
CREATE TABLE IF NOT EXISTS sippa_telemetri_harian (
  perangkat_id TEXT NOT NULL,
  hari TEXT NOT NULL CHECK (hari GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),   -- tanggal WIB
  n INTEGER NOT NULL, min REAL, maks REAL, rerata REAL, n_mutu2 INTEGER NOT NULL DEFAULT 0,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (perangkat_id, hari)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS sippa_alarm (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  perangkat_id TEXT NOT NULL,
  kit_id TEXT NOT NULL,
  kode TEXT NOT NULL CHECK (kode IN ('hisap_rendah', 'debit_rendah', 'dry_run', 'tekanan_lebih', 'belum_dingin', 'co_tinggi', 'bbm_rendah', 'diam')),
  nilai REAL, ambang REAL,
  mulai INTEGER NOT NULL,
  ditutup INTEGER,
  ditutup_oleh TEXT CHECK (ditutup_oleh IS NULL OR length(ditutup_oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
-- paling banyak satu alarm terbuka per (perangkat, kode)
CREATE UNIQUE INDEX IF NOT EXISTS uq_sippa_alarm_buka ON sippa_alarm (perangkat_id, kode) WHERE ditutup IS NULL;
```

### 3.5 Idempotensi

| Lapis | Mekanisme |
| --- | --- |
| Migrasi | `IF NOT EXISTS` untuk tabel, indeks, trigger; tidak ada `ALTER`/`DROP` di 0055–0057; dijalankan dua kali di uji skema tanpa galat |
| Butir lapangan | id UUID v4 klien; `INSERT ... ON CONFLICT(id) DO NOTHING`, `meta.changes = 0` = `ganda` |
| Telemetri | id = 32 heks sha256(`token_sha` + badan mentah); `ON CONFLICT(id) DO NOTHING` |
| Unggah A/B | `sippa_ab_unggah.sha UNIQUE`; bentrok = 409 |
| Gerak kit | trigger `sippa_gerak_cek` menolak `dari_status` basi; dua staf serentak = satu menang, satu 409 |
| R2 | kunci dari id server; unggah ulang menimpa objek sama |

`INSERT OR IGNORE` dilarang di modul ini: SQLite menerapkan IGNORE juga pada pelanggaran CHECK dan NOT NULL, sehingga butir yang melanggar aturan akan hilang diam-diam dan dilaporkan sebagai "ganda" (ADR-08). `ON CONFLICT(id) DO NOTHING` hanya menelan bentrok kunci.

---

## 4. Kontrak API

### 4.1 Aturan bersama

- **Tabel rute.** `RUTE_SIPPA` di `src/sippa.js`, disebar ke `RUTE` (worker.js:506) di samping `...RUTE_PIPA` (worker.js:538). Router (worker.js:567-583) hanya mengenali `:id` = 16 heks **di ujung** jalur (worker.js:570-571); jalur bersarang seperti `/api/sippa/kit/:id/gerak` di PRD §9.7.3 tidak bisa dicocokkan. Karena itu aksi ditulis sebelum id, pola src/inventaris.js:595 (`POST /api/instansi/foto-alat/:id`) dan src/staf.js:201. Nama berkas data dan nama layar didaftarkan sebagai kunci tetap satu per satu (`Object.fromEntries`). ADR-04.
- **Pembungkus.** Tiap handler dibungkus `bungkusSippa(f)`: tangkap `no such table: (main\.)?sippa_` (pola `tanpaTabel` src/pipa.js:12, `bungkusStaf` src/staf.js:187) menjadi `503 {"galat": "Migrasi SIPPA belum diterapkan di basis data", "status": "tanpa_migrasi"}`. Galat lain dilempar ke `rute()` yang menjawab 500 dan mencatat `console.error` (worker.js:581-582).
- **Jawaban galat** selalu `gagal(status, pesan)` (worker.js:68) = `{"galat": "<kalimat Indonesia>"}` plus medan tambahan bila disebut. 401 = belum masuk; 403 = masuk tetapi tidak berhak (tidak pernah dialihkan); 404 = tidak ada ATAU di luar wilayah (sama persis, supaya keberadaan tidak bocor); 409 = bentrok keadaan; 413 = badan terlalu besar; 422 tidak dipakai (400 untuk validasi, pola repo).
- **Header jawaban** semua `/api/sippa/*`: `cache-control: private, no-store`, `vary: cookie`, `x-content-type-options: nosniff` (src/risiko7.js:9).
- **POST.** CSRF ditangani `tolakOrigin` (worker.js:562) untuk cookie `sesi_admin`; sesi staf butuh `x-pb: 1` (stafSesi src/staf.js:39 mengembalikan null tanpa header, jadi rute menjawab 401). Badan JSON dibaca `bacaBody(req, maks)` (worker.js:174); multipart dibaca `bacaBytes` (worker.js:156) dengan batas sebelum diurai.
- **Batas laju** memakai `laju(env, kunci, aksi, [[JAM, maks]])` (src/bnpb.js:12), tabel `laju_bnpb`, hanya untuk rute tulis dan kegagalan autentikasi. Rute `GET` staf tidak dibatasi (tiap panggilan `laju` = satu tulisan D1; pola inventaris hanya membatasi tulis, src/inventaris.js:127). Telemetri dibatasi dengan menghitung baris tabelnya sendiri (tanpa tulisan tambahan). ADR-06.
- **Pelaku** (`oleh`): admin = 12 heks dari `adminOK`; staf = `"staf:" + id`; operator = `"tugas:" + id`; perangkat = `"perangkat:" + id`. Semua tulisan staf/admin juga menulis `pantau_jejak` lewat `jejakStmt(env, oleh, obyek, aksi, ke, catatan, kini, dummy)` (src/staf.js:71) dalam `db.batch` yang sama; `obyek` = `"sippa_<tabel>:<id>"` (6–130 huruf, CHECK 0030).
- **Wilayah.** Staf berwilayah (larik kode provinsi tidak kosong) hanya membaca dan menulis baris yang `prov`-nya di wilayahnya; kit yang sedang bergerak (gerak `tiba IS NULL`) terlihat juga oleh provinsi tujuan. Diterapkan di SQL (`prov IN (SELECT value FROM json_each(?))`), dan untuk tulis dengan `dalamWilayahStaf(req, [prov])` (src/staf.js:57). Admin dan staf nasional tanpa saring.
- **Dummy.** Baris `dummy = 1` hanya terlihat bila pemanggil admin atau akun staf dummy: `lihatDummy = !stafNyata(req)` (src/staf.js:62). Operator berkode melihat dummy hanya bila tugasnya dummy.

Lambang hak: **T** tamu; **B** baca = admin atau staf `P_SIPPA_BACA = ["pusdalops","koordalops","pimpinan"]`; **W** tulis = admin atau staf `P_SIPPA_TULIS = ["pusdalops","koordalops"]`; **M** = `modOK`; **SA** = `superOK`; **K** = kode penugasan header `x-kode`; **D** = token perangkat.

### 4.2 Rute halaman

| Metode dan jalur | Hak | Perilaku |
| --- | --- | --- |
| `GET /pipa`, `GET /pipa/<layar>` untuk `<layar>` di `LAYAR_SIPPA = ["peta","hitung","pemicu","kit","log","ab","studio","3d","telemetri","laporan","data"]` | B | 200 cangkang `halamanSippa(layar, ctx)`; tamu 303 `/admin/pantau?ke=<jalur dan query>`; sesi lain 403 halaman polos. Header: `content-type: text/html; charset=utf-8`, `cache-control: private, no-store`, `vary: cookie`, `content-security-policy: CSP_SIPPA`, `x-robots-tag: noindex, nofollow`, `referrer-policy: same-origin` |
| `GET /pipa/kit/:id` | B | sama; `:id` 16 heks dijamin router |
| `GET /pipa/lapangan` | T | 200 `halamanSippaLapangan()`, `cache-control: no-store`, `referrer-policy: no-referrer`, CSP = `CSP_LAPANGAN` (src/posko.js:666, diekspor) |
| `GET /admin/pipa` | B | 303 ke `/pipa` (entri nav staf `HAL.pipa` menuju `/admin/pipa` seperti halaman staf lain, src/admin_halaman.js:36) |
| jalur lain di bawah `/pipa/` | | tidak ada di tabel, jatuh ke aset statis: hanya `public/pipa/*.js|css` yang ada; selain itu 404 aset |

`CSP_SIPPA` = `CSP_ADMIN` (src/admin_halaman.js:170) dengan tiga penggantian: `img-src 'self' data: blob: https://*.openfreemap.org`, `connect-src 'self' https://*.openfreemap.org`, ditambah `worker-src 'self' blob:`. Tidak ada `'unsafe-inline'`, tidak ada CDN; Google Fonts tetap seperti admin.

Cangkang `halamanSippa` memuat, berurutan: `/admin/admin.css`, `/pipa/pipa.css`, `/inti/format.js`, `/inti/tip.js`, `/inti/pilih.js`, `/inti/tabel.js`, `/inti/nanti.js`, `/inti/kartu.js`, lalu `<script type="module" src="/pipa/app.js?v=N">`. Atribut `<body data-staf data-peran data-layar data-tulis="1|0" data-super="1|0">` diisi worker dari sesi (hanya untuk tampilan tombol; server tetap memeriksa tiap rute). Judul `<title>SIPPA, Pantau Bencana</title>` (tanpa titik tengah).

### 4.3 Rute API

Validasi "medan" berarti aturan yang sama dengan CHECK §3, dicek di JS dulu supaya pesan galat menyebut medannya.

| Metode dan jalur | Hak | Masukan dan validasi | Laju (per jam) | Jawaban sukses |
| --- | --- | --- | --- | --- |
| `GET /api/sippa/data/<nama>` (7 kunci tetap §3.1) | B | hak dicek SEBELUM R2; tamu 401 sama untuk nama ada dan tidak ada | tidak | 200 aliran JSON dari R2 `sippa/<nama>.json`; 404 `{status:"belum_ada"}` bila objek tidak ada atau berukuran 0; 500 bila > `MAKS_BYTE` (src/risiko7.js:14-25) |
| `GET /api/sippa/ringkas` | B | | tidak | `{kit:{per_status:{gudang:n,...}, hilang_komponen_pct}, log:{n_karhutla, p50_jam, n_kecil:bool}, alarm_aktif:n, gerak_terakhir:[10 baris], per:ms}` |
| `GET /api/sippa/kit` | B | `status`, `jenis` dari daftar tetap; `prov` 2 digit | tidak | `{kit:[{id,kode,jenis,status,lokasi,lat,lon,prov,kab,pemilik_asal,diubah,komponen_kurang,jam_pompa_musim,banjir_m3_musim,gerak_buka:{ke_status,eta_jam,waktu}|null}], kehilangan:{musim_pct, per_kit:{id:pct}}}` |
| `GET /api/sippa/kit/:id` | B | | tidak | `{kit, komponen:[...], gerak:[...], pemakaian:[log ringkas], bbm:[...], tugas:[tanpa kode_sha]}` |
| `POST /api/sippa/kit` | M | `{kode:"SIPPA-###", jenis, pemilik_asal (3–80), lokasi?, prov?, kab?, catatan?, templat: "gambut"|"mineral"|"banjir"}`; kode unik (409); komponen awal dari `TEMPLAT_BOM[templat]` | 60 | 201 `{kit, komponen:n}` |
| `POST /api/sippa/kit/:id` | W | hanya `lokasi`, `catatan`; status TIDAK bisa diubah di sini (400 bila dikirim) | 600 | 200 `{kit}` |
| `POST /api/sippa/komponen/:id` (id = kit) | W | `{ubah:[{id, kondisi?, nomor_seri?, dicek?:true}], baru:[{kode_bom, nama, jumlah, satuan, nomor_seri?}]}`, total ≤ 100; `kondisi:"hilang"` wajib `catatan` | 600 | 200 `{berubah:n, baru:n}`; jejak per baris |
| `POST /api/sippa/gerak/:id` (id = kit) | W; K untuk kit tugasnya dengan `alasan` ∈ {gelar, bongkar, kembali} | `{alasan, ke_status, rencana?:0|1, ke_lokasi?, lat?, lon?, prov?, kab?, eta_jam?, pengangkut?, permintaan_dari?, catatan?}`; `dari_status` diisi server dari kit; pasangan alasan↔transisi §6.2; `hilang`/`pensiun`/`ditemukan` hanya M | W 600, K 120 | 201 `{gerak, kit}`; 409 bila trigger menolak (status berubah atau rencana terbuka) |
| `POST /api/sippa/tiba/:id` (id = gerak) | W; K bila gerak untuk kit tugasnya | gerak `rencana = 1` dan `tiba` kosong | 120 | 200 `{gerak, kit}`; 409 bila sudah tiba atau status kit berubah |
| `POST /api/sippa/tugas` | W | `{kit_id?, nama_regu (2–80), unsur, prov, kab, kompleks_id?, lengan_dalam?:0|1, berlaku_hari (1–30)}`; `mulai = kini`, `berakhir = kini + hari x 86.400.000`; kode `kodeBaru()` (src/bnpb.js:23) | 60 | 201 `{tugas, kode, tautan: "/pipa/lapangan#k=<kode>"}`; kode tampil sekali |
| `POST /api/sippa/tugas-cabut/:id` | W | | 120 | 200 |
| `GET /api/sippa/lapangan/saya` | K | tugas belum dicabut, `mulai <= kini < berakhir` | tidak (kode salah dihitung `pemegangKode`) | `{tugas:{id,nama_regu,unsur,prov,kab,kompleks_id,lengan_dalam,berakhir}, kit:{kode,status,jenis,komponen_ringkas}|null, petak:[petak_id...], formulir_versi}` |
| `POST /api/sippa/lapangan/kirim` | K | badan ≤ 262.144 byte (413); `{jam_kirim: ms jam perangkat saat kirim, log:[], probe:[], bbm:[], gerak:[]}` ≤ 200 butir total; `jam_klien_meleset` diturunkan server (§6.1.5); tiap id UUID v4 (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`); medan dicek `cekButir(jenis, butir)` dari `public/pipa/formulir.js`; probe 150–500 cm hanya bila `tugas.lengan_dalam = 1` | 120 per tugas | 200 `{diterima:[id], ganda:[id], ditolak:[{id, alasan}], jam_server: ms}` (§6.1) |
| `POST /api/sippa/lapangan/foto` | K | multipart medan `berkas` ≤ 8.388.608 byte; `jenisBerkas` (src/foto.js:60) harus `image/jpeg` atau `image/webp` (PNG tidak dikenali fungsi itu; ADR-09); `bersihMedia` (src/media_bersih.js:89) membuang EXIF; null = 400 | 60 per tugas | 201 `{foto_id}` |
| `GET /api/sippa/foto/:id` | B (wilayah dari `sippa_foto.prov`) | | tidak | badan gambar, `content-type` dari baris, `content-disposition: inline`, `cache-control: private, max-age=3600` |
| `GET /api/sippa/log` | B | `jenis`, `kelas`, `sejak`, `sampai` (ms), `kit`; paling banyak 2.000 baris urut `t_tiba` | tidak | `{log:[...], n, terpotong:bool}`; baris dummy disaring |
| `GET /api/sippa/log.csv` | B | sama; `presisi=penuh` hanya W, bawaan koordinat dibulatkan 0,01 derajat | 60 | `text/csv; charset=utf-8`, `content-disposition: attachment; filename="sippa-log-<YYYYMMDD>.csv"`; sel berawalan `= + - @ \t \r` diberi `'` |
| `GET /api/sippa/probe.csv` | B | `petak`, `tugas`, `sejak`, `sampai` (ms); kolom `id, log_id, tugas_id, petak_id, titik, tahap, kedalaman_cm, suhu_c, waktu, oleh`; baris dummy disaring untuk staf nyata | 60 | `text/csv; charset=utf-8`, `content-disposition: attachment; filename="sippa-probe-<YYYYMMDD>.csv"`; sel berbahaya diberi `'` seperti `log.csv`; dipakai `pilot_cek.py` dan Bab 12.3 buku |
| `POST /api/sippa/log` | W | entri staf dari kertas G3-lite; medan sama dengan butir log lapangan; `id` 16 heks server | 600 | 201 |
| `GET /api/sippa/jalan-cek` | B | `kompleks` opsional | tidak | `{cek:[...]}` |
| `POST /api/sippa/jalan-cek` | W | `{kompleks_id, prov, musim, hasil, kendaraan?, catatan? (≤ 500), foto_id?}`; server memeriksa `dalamWilayahStaf(req, [prov])` (lihat catatan §4.4) | 600 | 201 |
| `POST /api/sippa/aoi` | W | `{kompleks_id? | sel?, prov, alasan (5–500)}` | 120 | 201 |
| `GET /api/sippa/ab` | B | `aoi`, `lengan` | tidak | `{petak:[...], unggah:[...]}`; ringkasan dihitung klien dengan `SippaHitung` |
| `POST /api/sippa/ab/unggah` | W | badan teks CSV ≤ 1.048.576 byte, ≤ 2.000 baris, UTF-8, pemisah `,` atau `;` dari baris kepala; satu baris salah = seluruh berkas ditolak | 20 | 201 `{unggah_id, n}`; 400 `{galat, rincian:[{baris, kolom, alasan}]}` (paling banyak 50 rincian); 409 sha sama |
| `POST /api/sippa/ab-status/:id` | M | `{status:"ditinjau_evaluator"}` | 20 | 200 |
| `GET /api/sippa/ab.csv` | B | | 60 | CSV aman |
| `GET /api/sippa/skenario` | B | | tidak | `{skenario:[{id,nama,versi_mesin,ringkas,oleh,waktu}]}` (tanpa `state`, kecuali `?id=`) |
| `POST /api/sippa/skenario` | W | `{nama (3–80), state (objek JSON ≤ 32.768 byte terserialisasi), versi_mesin, ringkas?}` | 120 | 201 |
| `POST /api/sippa/skenario-hapus/:id` | W pembuatnya, atau M | hapus lunak (`dihapus = kini`) | 120 | 200 |
| `GET /api/sippa/laporan` | B | `jenis` | tidak | `{laporan:[...]}` |
| `POST /api/sippa/laporan` | W | multipart: `meta` (JSON `{jenis, prov?, parameter}` ≤ 8.192 byte) + `berkas` PDF opsional ≤ 10.485.760 byte yang diawali byte `%PDF-` | 30 | 201 `{id}` |
| `GET /api/sippa/laporan-berkas/:id` | B | | tidak | PDF dari R2 `sippa-laporan/<id>.pdf`, `content-type: application/pdf`, `content-disposition: attachment; filename="sippa-<jenis>-<prov>-<YYYYMMDD>.pdf"`, `content-security-policy: sandbox` |
| `POST /api/sippa/telemetri` | D | §6.3 | 120 pesan per pengirim (hitung baris `sippa_telemetri`) | 202 `{diterima, ditandai, ganda}` |
| `GET /api/sippa/telemetri` | B | `perangkat` (16 heks), `sejak` ≥ kini − 30 hari, `harian=1` | tidak | `{seri:[[t_ms, nilai, mutu]], ambang:{min_sah, maks_sah}}` atau `{harian:[...]}` |
| `GET /api/sippa/perangkat` | B | | tidak | `{perangkat:[{id,kit_id,tag,jenis,satuan,aktif,terakhir,nilai_terakhir,mutu_terakhir}]}` (`terakhir` = `max(t_akhir)`; tanpa token) |
| `POST /api/sippa/perangkat` | M | `{kit_id, tag, jenis, satuan, kedalaman_cm?, min_sah?, maks_sah?, interval_s?, beri_token?:bool}`; gateway selalu bertoken | 60 | 201 `{perangkat, token?}`; token 64 heks `acak(32)` tampil sekali |
| `POST /api/sippa/perangkat-cabut/:id` | M | `aktif = 0` | 60 | 200 |
| `GET /api/sippa/alarm` | B | `aktif=1` | tidak | `{alarm:[...]}` |
| `POST /api/sippa/alarm-tutup/:id` | W | alarm terbuka | 600 | 200 |
| `POST /api/sippa/dummy/isi` | SA | `{layar}` dengan `layar` ∈ `LAYAR_SIPPA` ∪ {"ringkas","lapangan"}; `sejak`/`sampai` opsional = periode yang terpampang | 30 | 200 `{dibuat:{tabel:n}}` atau 409 `{galat:"dummy layar ini sudah ada untuk periode itu"}` |
| `POST /api/sippa/dummy/hapus` | SA | | 30 | 200 `{dihapus:{tabel:n}}` |

Aksi laju (kunci = `oleh`): `sippa.tulis` (600), `sippa.kit_buat` (60), `sippa.tugas` (60), `sippa.lapangan` (120, kunci `tugas:<id>`), `sippa.foto` (60), `sippa.ab` (20), `sippa.laporan` (30), `sippa.perangkat` (60), `sippa.dummy` (30); kegagalan: `sippa.kode_gagal` (dari `pemegangKode`, > 300 per jam per hash IP = 429), `sippa.token_gagal` (> 300 per jam per hash IP = 429, pola src/pipa.js:14-21).

### 4.4 Contoh jawaban

`POST /api/sippa/lapangan/kirim`:

```json
{"diterima":["3f1c2a9e-4b6d-4e2a-9f10-6c2b8d7e1a55"],
 "ganda":["0a7e..."],
 "ditolak":[{"id":"9d4b...","alasan":"kedalaman_cm 300 hanya untuk tugas lengan dalam"}],
 "jam_server":1761370800000}
```

`POST /api/sippa/ab/unggah` (400):

```json
{"galat":"berkas ditolak: 2 baris salah, tidak ada yang disimpan",
 "rincian":[{"baris":14,"kolom":"lengan","alasan":"harus konvensional/lance/lance_surfaktan/sekat_rewetting/lance_dalam"},
            {"baris":31,"kolom":"surfaktan_l","alasan":"lebih dari 0 hanya untuk lance_surfaktan"}]}
```

Catatan untuk baris `jalan-cek` di tabel: `prov` dikirim klien dari `kelayakan_kompleks` yang dibacanya, server memeriksa `dalamWilayahStaf(req, [prov])` dan pola `K[0-9]*` pada `kompleks_id`. Server tidak membaca R2 di jalur tulis (hemat CPU), sehingga ketidakcocokan kompleks dan provinsi mungkin; dicatat sebagai risiko kecil karena penulisnya staf bersesi.

---

## 5. Fungsi murni dan rumus

### 5.1 Bentuk modul

- **JS:** `public/pipa/hitung.js` adalah ES module tanpa DOM: `export const KONST`, `export const KELAS_POMPA`, `export function ...`. Dimuat layar dengan `import`, diuji Node dengan `import` langsung (package.json `"type": "module"`), dan diimpor `src/sippa.js` bila rute butuh (pola worker.js:6). Juga menulis `globalThis.SippaHitung = {...}` di baris akhir supaya Web Worker dan konsol bisa memakainya. Tidak ada `toFixed`; pembulatan tampilan urusan `fmt`.
- **Python:** `scripts/data/sippa/hidraulika.py` (hidraulika, gerbang, BBM, CO2, neraca, Joukowsky), `respons.py` (zona, saran sarana, matriks respons, pemicu), `bersama.py` (kuantil, statistik banding, finansial, `vonis_pilot`). Nama fungsi sama dengan JS dalam snake_case (`hf_hw`, `saran_sarana`, `banding_rerata`). Stdlib saja.
- **Kembar:** pola yang sudah ada scripts/data/operasi.py:384-401 (Python memanggil `node` lewat `vm` atas public/operasi.js:15) dibalik arahnya untuk SIPPA: `tests/sippa/kembar.test.mjs` membaca `tests/sippa/fixtures/acuan.json`, menjalankan tiap kasus di JS, lalu memanggil `python3 -I scripts/data/sippa/kembar_cli.py` yang membaca kasus yang sama dari stdin dan mencetak hasil JSON; kedua hasil dibandingkan dengan nilai harapan, toleransi relatif 1% (bilangan) dan sama persis (string, kode gerbang, vonis). Self-check `python3 scripts/data/sippa/hidraulika.py uji` menjalankan kasus yang sama tanpa Node.

### 5.2 Konstanta

```js
export const KONST = {
  rho: 1000, g: 9.81, m_per_bar: 10.197, kw_per_hp: 0.7457,
  hisap_m: 3.5,                        // head hisap + filter (PRD §6.4)
  batas_kerja: 0.88,                   // 88% x PN
  derating: {a: 0.014, t0: 20, min: 0.58, max: 1},
  pn_sdr: {11: 16, 17: 10},
  layflat_id_rasio: 0.96,              // dipakai hanya bila ID datasheet kosong; pil asumsi
  v_peringatan: 3,                     // m/s
  sisa_keras: 1, sisa_syarat: 2,       // bar
  serap_lance_lpm: 40,                 // L/min per lance (K-09, G22)
  daya_rating_rasio: 0.85,
  dalam_maks_m: 5,                     // keputusan 50, SATU-SATUNYA tempat angka 5 m ditulis
  dalam_uji_m: 3,                      // >= 3 m = pil lengan uji
  bsfc: {solar: 0.25, bensin: 0.38},   // kg/kWh; solar PRD §6.4, bensin scripts/data/taktik.py:60
  rho_bbm: {solar: 0.84, bensin: 0.74},// kg/L; bensin taktik.py:185
  co2: {bensin: 2.31, solar: 2.68},    // kg/L
  joukowsky_a: {hdpe: 300, layflat: 150},
  ambang_zona: {air: 2.5, jalan: 5},
  liku_trase: 1.2,                     // L = jarak air x 1,2 untuk tautan Peta ke Hitung (asumsi-kebijakan)
  t_kritis95: [12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,2.228,2.201,2.179,2.160,2.145,2.131,
               2.120,2.110,2.101,2.093,2.086,2.080,2.074,2.069,2.064,2.060,2.056,2.052,2.048,2.045,2.042],
  r_bawaan: 0.08, h_bawaan: 5
};
export const KELAS_POMPA = {
  ve1500: {nama: "Kelas 1.500 L/min @ 10 bar, bensin", titik: [[1500, 10], [2050, 6]], kw: 44, bbm: "bensin", bbm_lpj: 22,
           sumber: "pabrikan, PRD §6.1", keyakinan: "terverifikasi"},
  portabel_besar: {nama: "Kelas Tohatsu VC52AS", titik: [[1000, 8], [1300, 6]], kw: 30, bbm: "bensin", bbm_lpj: null,
           sumber: "scripts/data/taktik.py POMPA", keyakinan: "terverifikasi"},
  tekanan_tinggi: {nama: "Kelas Waterax Mark-3", titik: [[151, 17.2], [265, 10.3], [303, 6.9]], kw: 8, bbm: "bensin", bbm_lpj: null,
           sumber: "scripts/data/taktik.py POMPA", keyakinan: "terverifikasi"}
};
```

### 5.3 Hidraulika

| Fungsi (JS / Python) | Rumus dan aturan |
| --- | --- |
| `idHdpe(od, sdr)` / `id_hdpe` | ID = OD x (1 − 2/SDR), mm |
| `idLayflat(dn, idDatasheet)` / `id_layflat` | `{id: idDatasheet, asumsi: false}` bila diisi (40–260); selain itu `{id: 0.96 x dn, asumsi: true}` |
| `hfHW(L, Q, C, D)` / `hf_hw` | h_f = 10,67 L Q^1,852 / (C^1,852 D^4,871); L m, Q m³/s, D m |
| `fSuhu(T)` / `f_suhu` | clamp(1 − 0,014 (T − 20), 0,58, 1) |
| `batasTekanan(p)` / `batas_tekanan` | HDPE: 0,88 x PN(SDR) x fSuhu(T); layflat: 0,88 x tekanan kerja datasheet (bar) |
| `pRating(kelas, qLpm)` / `p_rating` | interpolasi linear antar `titik` urut debit; q < titik pertama = tekanan titik pertama; q > titik terakhir = `null` (di luar rating). Ponytail: dua sampai tiga titik datasheet, bukan kurva Q-H terukur; diganti kurva FAT sesudah G2 |
| `hidraulika(p)` / `hidraulika` | lihat di bawah |
| `bbmJam(kw, kelas, jenis, nPompa)` / `bbm_jam` | bila `kelas.bbm_lpj` dan jenis bensin: nPompa x bbm_lpj (konsumsi pada rating, konservatif); selain itu kw x bsfc[jenis] / rho_bbm[jenis] |
| `co2(liter, jenis)` / `co2` | liter x faktor; hanya BBM |
| `neracaAir(s)` / `neraca_air` | stok(t+1) = stok(t) + max(0, Q95 − Q_eko) x 86,4 − Q_api x 86,4 − evap; seri `hari` nilai; `habis_hari` = hari pertama stok < 0 atau null; `g1_ok` = Q95 ≥ 1,5 x Q_api |
| `joukowsky(dv, a)` / `joukowsky` | ΔP bar = rho x a x dv / 1e5 |
| `gerbangHidraulika(p, h)` / `gerbang_hidraulika` | tabel §5.3.2 |
| `vonis(gerbang)` / `vonis` | ada `keras` = NO-GO; ada `syarat` = HOLD; selain itu KONDISIONAL. Tidak ada GO |

#### 5.3.1 `hidraulika(p)`

Masukan (`p`), bawaan sama dengan PRD §9.4.3. Debit bawaan 300 L/min (5 L/s) dengan 8 lance, sehingga serapan 320 L/min ≥ debit dan H-SERAP lolos (diputus sesi induk 25 Okt 2026, PENYELARASAN.md butir 6); 600 L/min (10 L/s) dengan 8 lance dipertahankan sebagai kasus ajar NO-GO (H8 §5.8). Jumlah lance per kit dikonfirmasi bench test G2.

```
{bahan:"layflat"|"hdpe", dn_mm:100, od_mm:null, sdr:11, id_datasheet_mm:null, pk_layflat_bar:12,
 L_m:1000, q_lpm:300, C:130, dz_m:2, dz_sumber:"masukan"|"dsm", K:5, sisa_bar:3, eta:0.65, suhu_c:35,
 pompa:"ve1500"|null, n_pompa:1, jenis_bbm:null, n_lance:8, serap_lain_lpm:0, dalam_m:1.5, jam:24,
 hisap:true, perimeter_aktif:false, sumber:null | {q95_ls, qeko_ls, stok_m3, hari, evap_m3_hari}}
```

`dalam_m > 5` dilempar sebagai galat masukan (`RangeError("Injeksi lebih dari 5 m tidak termasuk SIPPA (keputusan 50)")`), bukan gerbang; formulir menolaknya sebelum memanggil. `serap_lain_lpm` (baru, bawaan 0) = debit keluar selain lance (nozzle serang, aliran balik bypass) yang diisi pengguna, supaya konfigurasi 600 L/min yang memakai selang serang bisa dinilai jujur tanpa mengubah bawaan.

Langkah:

```
D   = id_mm / 1000                         (id_mm dari idHdpe atau idLayflat)
Q   = q_lpm / 60000                         m3/s
A   = π D² / 4 ;  v = Q / A
hf  = hfHW(L_m, Q, C, D)
hm  = K v² / (2 g)
tdh = dz_m + hf + hm + sisa_bar x 10,197 + (hisap ? 3,5 : 0)
p_pompa_bar = tdh / 10,197
kw  = rho g Q tdh / eta / 1000 ;  hp = kw / 0,7457 ;  kw_per_pompa = kw / n_pompa   (relay seri: head dibagi rata)
p_tersedia_bar = pompa ? n_pompa x pRating(KELAS_POMPA[pompa], q_lpm) : null
p_ujung_bar    = p_tersedia_bar == null ? sisa_bar : sisa_bar + p_tersedia_bar − p_pompa_bar
v_isi_m3 = A x L_m ;  t_tiba_menit = v_isi_m3 / Q / 60
serap_lpm = n_lance x 40 + serap_lain_lpm
jenis = jenis_bbm ?? KELAS_POMPA[pompa]?.bbm ?? "solar"
bbm_l_jam = bbmJam(kw, KELAS_POMPA[pompa], jenis, n_pompa) ;  bbm_l = bbm_l_jam x jam ;  co2_kg = co2(bbm_l, jenis)
profil = [{x_m, p_bar}] tiap 50 m: p(x) = p_pompa_bar − (hf x x/L + dz_m x x/L + (hisap ? 3,5 : 0)) / 10,197   (garis gradien; dz linear)
neraca = sumber ? neracaAir({...sumber, q_api_ls: q_lpm / 60}) : null
```

Keluaran: `{id_mm, id_asumsi, v_ms, hf_m, hm_m, tdh_m, p_pompa_bar, p_batas_bar, f_suhu, p_tersedia_bar, p_ujung_bar, kw, hp, kw_per_pompa, bbm_l_jam, bbm_l, co2_kg, v_isi_m3, t_tiba_menit, serap_lpm, profil, neraca, gerbang, vonis}`. Satu panggilan < 1 ms (n profil ≤ 101 titik).

#### 5.3.2 Gerbang kalkulator

| Kode | Syarat | Tingkat | Pesan (contoh terisi) |
| --- | --- | --- | --- |
| H-TEKANAN | `p_pompa_bar > p_batas_bar` | keras | "Tekanan 12,5 bar melewati batas kerja 11,1 bar (88% x PN16 x 0,79 pada 35 °C)" |
| H-SISA | `p_ujung_bar < 1` | keras | "Tekanan di manifold kurang dari 1 bar; lance tidak bekerja" |
| H-SISA2 | `1 ≤ p_ujung_bar < 2` | syarat | "Tekanan ujung di bawah 2 bar; lance 15–40 L/min butuh 2–4 bar" |
| H-SERAP | `q_lpm > serap_lpm` | keras | "Debit 600 L/min tidak terserap 8 lance (paling banyak 320 L/min)" |
| H-RATING | pompa dipilih dan `pRating` = null | keras | "Debit 2.400 L/min di luar rating pompa terpilih (paling banyak 2.050 L/min)" (baru, ADR-10) |
| H-DAYA | pompa dipilih dan `kw_per_pompa > kw_rating x 0,85` | keras | "Daya poros 39,6 kW per pompa melewati 85% rating 44 kW" |
| H-KECEPATAN | `v_ms > 3` | syarat | "Kecepatan 3,4 m/s; risiko lonjakan saat katup ditutup" |
| H-PANAS | `bahan == "hdpe" && perimeter_aktif` | keras | "HDPE tidak boleh berada di perimeter api aktif (K-16)" |
| H-AIR | `neraca.habis_hari != null` (keras) atau `!neraca.g1_ok` (syarat) | keras/syarat | "Sumber habis pada hari ke-2" / "Q95 12 L/s kurang dari 1,5 x debit operasi 10 L/s" |
| H-DSM | `dz_sumber == "dsm"` | catatan | "Beda elevasi dari DSM berkanopi (Copernicus GLO-30); ukur ulang dengan DEMNAS atau GNSS" |
| H-UJI | `dalam_m ≥ 3` | catatan | "Kedalaman 3–5 m hanya untuk lengan uji kedua" |

Pesan dibentuk dengan `fmt` (koma desimal) di layar; fungsi murni mengembalikan `{kode, tingkat, nilai, batas}` dan teks dibentuk `pesanGerbang(g)` di `hitung.js` agar Python cukup membandingkan `kode` dan `tingkat`.

### 5.4 Zona, saran sarana, matriks respons, pemicu

**`zona(air, jalan, ambang = KONST.ambang_zona)`** / `zona`:

```
a = air  == null ? Infinity : air
j = jalan == null ? Infinity : jalan
A bila a < 2,5 dan j < 5 ; B bila a < 2,5 dan j >= 5 ; C bila a >= 2,5 dan j < 5 ; D selain itu
```

Pembanding ketat `<` sesuai keputusan pemilik 51 (KEPUTUSAN-SIPPA.md §H: jarak tepat 2,50 atau 5,00 km = jauh), sama dengan pipa_data.py:360-365 yang menghasilkan angka buku untuk tiga versi: versi `kendala.json` A188/B418/C89/D170 (`air_km_lama` x `jalan_km_lama`, label "Konservatif"), jalan utama OSM A198/B429/C81/D157 (`air_km_semua` x `jalan_km_utama`), dan semua jalan OSM A469/B158/C167/D71 (`air_km_semua` x `jalan_km_semua`, label "Optimistis"). Dengan `≤` angkanya menjadi A189/B420/C89/D167, A199/B429/C81/D156, dan A471/B157/C167/D70, karena ada 4 nilai air tepat 2,50 dan 4 nilai jalan tepat 5,00 (dihitung ulang dari `osm_jarak.csv` 25 Okt 2026). ADR-01.

**`zonaTerverifikasi(k, cek)`**: `cek` = baris `sippa_jalan_cek` terbaru untuk kompleks itu dengan `musim = 'hujan'`. `cek?.hasil === "lolos" ? k.zona_o : k.zona_k`.

**`saranSarana(k, versi, apiAktif)`** / `saran_sarana`: `versi` ∈ `k|u|o|v` (`v` = terverifikasi); `air` = `air_km_lama` (k) atau `air_km_semua` (u, o, v); `z` = zona versi itu. Aturan dicek berurutan, berhenti di yang pertama cocok:

| No | Syarat | `kit` | `heli` |
| --- | --- | --- | --- |
| 1 | `k.jam_tiba != null && k.jam_tiba > 6 && apiAktif` | `"sisi_tertahan"` | true |
| 2 | `z == "D"` | `"tidak"` | false |
| 3 | `z == "C"` | `"dari_sumur"` | false |
| 4 | `z == "B"` | `"perahu"` | false |
| 5 | `z == "A" && air <= 0.5` | `"jinjing"` | false |
| 6 | `z == "A"` | `"relay"` | false |

Keluaran `{aturan, kit, heli, sarana (kalimat tetap dari PRD §9.4.2), alasan: ["air 1,4 km", "jalan 3,2 km", "zona A konservatif"], tautan_hitung: {L_m: round(air x 1000 x 1,2), dz_m: k.beda_air_m == null ? null : −k.beda_air_m, dz_sumber: "dsm"}}`. `apiAktif` = ada titik panas `titik24.json` dengan indeks laci = kompleks itu. `jam_tiba` null = aturan 1 dilewati dan alasan memuat "waktu tempuh belum dihitung".

**`matriksRespons(frp, luasHa, z, koef, jamTiba)`** / `matriks_respons` (`koef` = `operasi.json.koef`, `bara_regu.mid`; tidak ada angka 1,2 tertanam, PRD §5.4 menulis 1,2 padahal `operasi.json` saat ini 1,0):

```
tF = frp < 10 ? 1 : frp <= 30 ? 2 : frp <= 100 ? 3 : 4
tL = luas <= 2 ? 1 : luas <= 10 ? 2 : luas <= 50 ? 3 : 4
t  = max(tF, tL)
regu = t == 1 ? 1 : t == 2 ? 2 : t == 3 ? (luas <= 30 ? 3 : 4) : max(5, ceil(luas / (bara_regu.mid x 10)))
hari = ceil(10 x luas / (regu x bara_regu.mid)) / 10
heli = t == 4 ? "ya" : (t >= 2 && jamTiba > 6) ? "tahan_front" : "tidak"
sarana = SARANA_RESPONS[t] (+ " sumur dangkal" bila t == 1 dan z == "C")
```

Semua ambang `asumsi-kebijakan`, pil "belum diuji terhadap log 2026".

**`tingkatPemicu(x)`** / `tingkat_pemicu`, `x = {anom_pct, hari_ps50, titik_ab, basi_ansambel, basi_titik}`:

```
siaga = anom_pct != null && anom_pct <= −20
pra   = siaga && !basi_ansambel && hari_ps50 != null && hari_ps50 >= 3
gelar = pra && !basi_titik && titik_ab != null && titik_ab >= 1
tingkat = gelar ? "GELAR" : pra ? "PRA-POSISI" : siaga ? "SIAGA" : "NORMAL"
```

Masukan dihitung `pemicu.py` (§7.2); fungsi ini kembar agar layar bisa menghitung ulang saat staf menggeser ambang di mode "jelajah" (ambang tidak disimpan).

### 5.5 Statistik dan time-motion

| Fungsi | Rumus |
| --- | --- |
| `kuantil(xs, p)` / `kuantil` | urutkan; h = (n − 1) p; hasil = x[⌊h⌋] + (h − ⌊h⌋)(x[⌊h⌋+1] − x[⌊h⌋]) (tipe 7, sama dengan `numpy.percentile` bawaan); n = 0 → null |
| `nKecil(n)` | n < 5 |
| `durasiLog(l)` | `tiba_air = t_air_mengalir − t_tiba`; `gelar = t_air_mengalir − t_mulai_gelar`; `bongkar = t_bongkar_selesai − t_selesai`; `laju_m_jam = panjang_m / (gelar jam)`; `orang_jam_100m = n_orang x gelar jam / (panjang_m / 100)`; tiap ukuran null bila salah satu ujung null. Log yang punya penerus koreksi (`koreksi_dari` menunjuknya) dikeluarkan dari rekap |
| `bandingRerata(a, b)` | Welch: se = √(s_a²/n_a + s_b²/n_b); df = (s_a²/n_a + s_b²/n_b)² / ((s_a²/n_a)²/(n_a−1) + (s_b²/n_b)²/(n_b−1)); t = `t_kritis95[⌊df⌋ − 1]` bila df < 31, selain itu 1,96; CI = (ā − b̄) ± t se. Varian sampel (n − 1). n_a < 2 atau n_b < 2 → null |
| `bandingProporsi(xa, na, xb, nb)` | Agresti-Caffo: p̃ = (x + 1)/(n + 2); d = p̃a − p̃b; se = √(p̃a(1−p̃a)/(na+2) + p̃b(1−p̃b)/(nb+2)); CI = d ± 1,96 se |
| `vonisG4(lengan, konv)` | §5.5.1 |

#### 5.5.1 Vonis A/B (G4)

Per petak: `ha_dingin30 = (dingin_72j === 1 && nyala_30h === 0) ? luas_m2 / 10000 : 0`; ukuran efikasi `y = ha_dingin30 / regu_hari` (petak dengan `regu_hari` null atau 0 tidak ikut ukuran ini). Biaya per ha dingin = Σ `biaya_rp` / Σ `ha_dingin30` per lengan (versi KD menambah CAPEX teramortisasi `biayaPerHa`).

```
BELUM BISA DIPUTUS bila n_lengan < 8 atau n_konv < 8, atau semua CI (rerata y; proporsi nyala 7/30/90 hari) memotong nol
LULUS bila (selisih_y / rerata_y_konv >= 0,30 dan CI_y.lo > 0)
         atau (untuk salah satu h di {7,30,90}: (p_konv − p_lengan)/p_konv >= 0,30 dan CI(p_konv − p_lengan).lo > 0)
       dan biaya_per_ha_lengan <= 1,2 x biaya_per_ha_konv
TIDAK LULUS selain itu
```

Hasil pilot Okt 2026 (`sippa_ab_unggah` bertanggal ≤ 2026-11-30 atau `aoi` diawali `PILOT`) selalu ditampilkan "pilot, n kecil" dan tidak pernah diberi vonis G4 (keputusan 53: "lebih baik" tidak diputus dari pilot).

#### 5.5.2 Vonis pilot "dapat dipakai" (keputusan 53)

`vonisPilot(d)` / `vonis_pilot`, murni, label `asumsi-kebijakan`. Masukan `d = {log: [baris sippa_log_gelar jenis karhutla/latihan dari tugas pilot, tanpa yang dikoreksi], probe: [baris sippa_probe tugas pilot], komponen_kembali: [baris sippa_komponen kit pilot musim_awal = 1, keadaan sesudah gerak kembali terakhir], kit: {pn_dan_bahan untuk hidraulika}}`. Tiap butir mengembalikan `{no, lulus: true|false|null, nilai, alasan}`; `null` = data belum ada (dihitung gagal untuk vonis, ditampilkan "data belum lengkap").

| No | Uji | Medan yang dipakai |
| --- | --- | --- |
| 1 | jumlah sesi dengan `air_sampai_lance = 1` ≥ 2 DAN jumlah `petak_id` berbeda di antara sesi itu ≥ 2 | `air_sampai_lance`, `petak_id` |
| 2 | min(`t_air_mengalir − t_tiba`) ≤ 4 jam DAN tiap sesi punya lima waktu `t_tiba, t_mulai_gelar, t_air_mengalir, t_selesai, t_bongkar_selesai` tidak null | lima kolom waktu |
| 3 | ada sesi dengan `p_ujung_bar ≥ 2` DAN `p_ujung_menit ≥ 30`; `p_ujung_sumber` ditampilkan (gauge atau operator) | `p_ujung_*` |
| 4 | untuk tiap sesi ber-`konfigurasi`, `hidraulika(konfigurasi).gerbang` tanpa tingkat `keras`; sesi tanpa `konfigurasi` = null | `konfigurasi` |
| 5 | kelengkapan probe ≥ 90%: untuk tiap (petak_id, titik) yang muncul, harapan = tahap {sebelum, sesudah, 24j} x kedalaman {10, 30, 50, 100} cm; kelengkapan = jumlah pasangan (petak, titik, tahap, kedalaman) yang ada / harapan | `sippa_probe` |
| 6 | Σ `kecelakaan` = 0 DAN tidak ada sesi dengan `bocor_henti_menit > 30` | `kecelakaan`, `bocor_henti_menit` |
| 7 | (jumlah komponen berkondisi `baik` atau `rusak_ringan`) / (jumlah komponen `musim_awal = 1`) ≥ 0,95, dihitung per baris komponen | `sippa_komponen.kondisi` |

```
gagal = butir dengan lulus != true
vonis = gagal kosong                       ? "DAPAT DIPAKAI"
      : gagal memuat butir 1 atau butir 6  ? "BELUM DAPAT DIPAKAI"
      :                                      "DAPAT DIPAKAI BERSYARAT"   (perbaikan tertulis sebelum dipakai untuk banjir)
```

Formulir lapangan (`public/pipa/formulir.js`) menambah medan sesi: kode petak, "air sampai ujung lance" (ya/tidak), tekanan ujung (bar) dan lama bertahan ≥ 2 bar (menit) dengan sumber gauge/operator, kecelakaan (ya/tidak), lama henti karena bocor (menit); `konfigurasi` diisi otomatis dari kit tugas (templat BOM) dan bisa diubah staf lewat entri koreksi. Tahap probe `sesudah` ditambahkan. Kasus acuan V1–V3 (§5.8) dan laporan pilot (§6.4) memakai fungsi ini; vonis tampil terpisah dari vonis "lebih baik". Semua angka efikasi berpil `hipotesis` selama `sippa_ab_unggah.status != 'ditinjau_evaluator'`.

### 5.6 Finansial

| Fungsi | Rumus |
| --- | --- |
| `af(r, H)` | (1 − (1 + r)^−H) / r |
| `crf(r, n)` | r / (1 − (1 + r)^−n) |
| `npv({capex, opex, manfaat, r, H})` | (manfaat − opex) x af(r, H) − capex (manfaat dan opex konstan per tahun) |
| `bcr(...)` | manfaat x af / (capex + opex x af) |
| `impas(...)` | opex + capex / af (sama dengan `breakevenAnnual` mesin Studio: 768.489.352 + 9.688.192.331 / 3,99271 = 3.194.959.655, diperiksa) |
| `biayaPerHa({capex, umur, r, opex, regu, ha})` | (capex x crf(r, umur) + opex + regu) / ha; ha = 0 → null |

r bawaan 8%, H bawaan 5 (rentang 1–15). Manfaat bawaan 0 di semua skenario (keputusan 15, T-F).

### 5.7 Mesin Studio (port) dan Monte Carlo

Sumber: `~/Downloads/Karhutla_Decision_Dashboard.html` (119.474 byte) disalin ke `data/kajian-bnpb/pipa/sumber/` (SP-040). Mesinnya satu IIFE di baris 12–298 berkas itu yang menulis `root.KarhutlaEngine` (baris 297-298) dan sudah bisa diekspor `module.exports` (baris 296). Ranjau ekstraksi: komentar pembuka `/*` berada di baris 9 sesudah `<script>`, jadi potongan harus dimulai dari `/*` baris 9, bukan baris 10 (dicoba 25 Okt 2026: mulai baris 10 = SyntaxError).

`public/pipa/studio_mesin.js` = potongan itu apa adanya + tiga jenis perubahan bertanda `// SIPPA:`:

1. Pembungkus: tidak ada `localStorage` di mesin (mesin memang tidak memakainya; penyimpanan ada di bagian UI pemilik yang tidak disalin). Tetap skrip klasik: dimuat `<script>` di layar, `importScripts` di Web Worker, `vm` di Node (pola tests/warga/regu_luring.test.mjs:5).
2. `gerbangSippa(state, hasil)` dijalankan sesudah `assess`, hanya **menambah** butir ke `hasil.hard` dan `hasil.conditional`, lalu `decision` dihitung ulang dengan aturan mesin (ada hard = NO-GO). Butir:
   - H-SERAP dan H-DALAM hanya untuk keadaan yang punya blok `state.sippa = {n_lance, dalam_m, koridor}` (preset S0, S0B, skenario SIPPA pengguna). Preset pemilik S1–S3 adalah jaringan hidran tanpa lance; menerapkan H-SERAP ke sana akan membuat semuanya NO-GO karena debit 2.000 L/min (butir teknis BT-01, §9.2).
   - `jaringan_permanen`: `state.strategy === "backbone" && (state.sippa?.koridor ?? 1) > 2` → hard; S3 selalu membawa catatan "ditutup sampai G5".
   - H-AIR faktor 1,5: `hasil.hyd.availableLPMin < 1,5 x state.flowLPM` → conditional.
3. Perbaikan teks G23 tanpa mengubah angka: hitungan dimensi dari skema (32/100), nama item `ELEC`/`GEN`, harga heli Rp130 juta/jam diganti slot `sippa.heli.biaya_jam` berstatus `menunggu`.

Monte Carlo = `drawRiskMC` mesin tanpa perubahan (baris 284-295): benih FNV-1a 32-bit atas `JSON.stringify(state)`, xorshift32, 800 iterasi, pengali c 0,78–1,28, BBM 0,65–1,40, upah 0,70–1,45, operasi 0,75–1,35; TCO = capex x c + opex' x horizon; P10/P50/P90 = `out[floor((n − 1) p)]` (BUKAN `kuantil` tipe 7; sengaja dibiarkan seperti aslinya). Dijalankan di `studio_pekerja.js`: pesan masuk `{id, state}` (state sudah lewat `gerbangSippa`), keluar `{id, low, mid, high, samples}`; utas utama membuang jawaban yang `id`-nya bukan permintaan terakhir.

Catatan beda yang disengaja: mesin memakai C bawaan HDPE 135 dan tidak memakai 3,5 m hisap, sehingga untuk OD160 2 km mesin memberi 12,21 bar sedangkan `hidraulika()` memberi 12,49 bar (tanpa hisap) atau 12,84 bar (dengan hisap). Keduanya NO-GO. Angka mesin dibekukan (keputusan 34); layar Studio menampilkan angka mesin, layar Hitung angka `hidraulika()`, dan halaman Data menjelaskan bedanya.

### 5.8 Kasus acuan bersama (`tests/sippa/fixtures/acuan.json`)

Bentuk: `[{"id":"H1","fungsi":"hidraulika","masukan":{...},"harap":{...},"toleransi":0.01}]`. Nilai harapan di bawah dihitung 25 Okt 2026 dengan rumus §5.3 (Python, g = 9,81). Lima kasus hidraulika wajib (PRD §9.3) dengan nilai yang sudah dikoreksi:

| Id | Masukan (selain bawaan; `pompa: null`, `n_lance: 0`, `serap_lain_lpm` = q) | Harapan |
| --- | --- | --- |
| H1 | HDPE OD160 SDR11, q 2.000 L/min, L 2.000 m, dz +10, K 5, sisa 2, C 130, suhu 35, `hisap: false` | id 130,909 mm; v 2,4766 m/s; hf 95,452 m; hm 1,563 m; TDH 127,409 m; p_pompa 12,495 bar; p_batas 11,123 bar; gerbang [H-TEKANAN keras]; vonis NO-GO |
| H2 | sama, OD200 | id 163,636 mm; hf 32,191 m; TDH 63,225 m; p_pompa 6,200 bar; tanpa H-TEKANAN; vonis KONDISIONAL |
| H3 | `bahan: "layflat"`, `id_datasheet_mm: 160`, q 2.000, L 2.000, dz +10, K 5, sisa 2, C 130, η 0,65, `hisap: false`, `jenis_bbm: "solar"`, jam 1 | hf 35,915 m; hm 0,700 m; TDH 67,009 m; p_pompa 6,571 bar; kw 33,711; hp 45,207; bbm_l_jam 10,033 |
| H4 | `id_datasheet_mm: 100`, q 600, L 1.000, dz 0, K 0, sisa 0, C 130, `hisap: false` | hf 19,061 m (PRD menulis "sekitar 17 m"; salah 12%, lihat §9.3) |
| H5 | `id_datasheet_mm: 100`, q 600, L 1.000 | v_isi 7,854 m³; t_tiba 13,09 menit |

Kasus tambahan (wajib di berkas yang sama, dicocokkan kedua bahasa):

| Id | Fungsi | Masukan | Harapan |
| --- | --- | --- | --- |
| H6 | `hidraulika` | H1 dengan `hisap: true` | TDH 130,909 m; p_pompa 12,838 bar |
| H7 | `hidraulika` | bawaan kalkulator (layflat DN100, ID asumsi 96 mm, q 300, L 1.000, dz 2, K 5, sisa 3, `hisap: true`, `pompa: "ve1500"`, n_pompa 1, n_lance 8) | id_asumsi true; v 0,691 m/s; hf 6,442 m; TDH 42,654 m; p_pompa 4,183 bar; p_tersedia 10 bar; p_ujung 8,817 bar; serap 320 L/min; t_tiba 24,13 menit; tanpa gerbang keras atau syarat; vonis KONDISIONAL |
| H8 | `hidraulika` | kasus ajar: H7 dengan q 600 (10 L/s) | p_pompa 5,868 bar; p_ujung 7,132 bar; gerbang memuat H-SERAP keras ("Debit 600 L/min tidak terserap 8 lance (paling banyak 320 L/min)"); vonis NO-GO |
| Z1–Z5 | `zona` | (0,4; 2), (1,31; null), (2,49; 5,0), (2,5; 4,99), (3; null) | A, B, B, C, D |
| F1–F4 | `fSuhu` | 15, 35, 50, 60 °C | 1; 0,79; 0,58; 0,58 |
| Q1 | `kuantil` | [2,1; 3,4; 2,8; 4,0; 3,1; 5,2; 2,6], p 0,5 dan 0,9 | 3,1 dan 4,48 |
| W1 | `bandingRerata` | a = [0,42 0,55 0,61 0,48 0,70 0,66 0,52 0,59 0,63 0,57], b = [0,35 0,41 0,38 0,44 0,30 0,47 0,39 0,36] | selisih 0,1855; df 15,33; t 2,131; CI [0,1159; 0,2551] |
| P1 | `bandingProporsi` | 2/10 vs 5/8 | selisih −0,35; CI [−0,7402; 0,0402] |
| N1 | `npv`, `bcr`, `impas`, `crf` | capex 1 M, opex 100 jt, manfaat 300 jt, r 8%, H 5 | af 3,99271; NPV −201.457.993; BCR 0,8560; impas 350.456.455; crf 0,250456 |
| A1 | `neracaAir` | stok 500 m³, Q95 12, Q_eko 2, Q_api 10 L/s, evap 5 m³/hari, 3 hari | [495; 490; 485]; habis_hari null; g1_ok false (H-AIR syarat) |
| T1–T4 | `tingkatPemicu` | (−29,5; 4; 0; f; f), (−29,5; 4; 2; f; f), (−29,5; 4; 2; t; f), (−12; 7; 5; f; f) | PRA-POSISI, GELAR, SIAGA, NORMAL |
| V1 | `vonisPilot` | 3 sesi `air_sampai_lance = 1` di 2 petak; tiba→air terbaik 3,4 jam; lima waktu lengkap; satu sesi 2,6 bar 45 menit; konfigurasi H7 (tanpa gerbang keras); probe 24 dari 24 pasangan; tanpa kecelakaan; 39 dari 40 komponen berfungsi | semua lulus; DAPAT DIPAKAI |
| V2 | `vonisPilot` | V1, tetapi probe 20 dari 24 (83%) | butir 5 gagal; DAPAT DIPAKAI BERSYARAT |
| V3 | `vonisPilot` | V1, tetapi satu sesi `bocor_henti_menit` 45 | butir 6 gagal; BELUM DAPAT DIPAKAI |
| S1 | mesin Studio (`studio_mesin.test.mjs`, JS saja) | `defaultState()` + `compare` | CAPEX 5.230.476.081 / 9.688.192.331 / 19.774.246.500; OPEX 745.246.663 / 768.489.352 / 1.152.257.871; TCO 8.956.709.395 / 13.530.639.093 / 25.535.535.857; tekanan semi 5,3872 bar; impas semi 3.194.959.655; MC 12.057.360.243 / 14.104.858.136 / 16.074.645.968; toleransi 0,5% |
| S2 | mesin Studio | `defaultState()` dengan `pipe:"hdpe", od:160, sdr:11, flowLPM:2000, networkLength:2000, branchLength:0, elevation:10, pressureEnd:2, pipeTemp:35`; lalu `od:200` | 12,209 bar NO-GO; 6,332 bar HOLD / VALIDASI |

Angka S1 dan S2 dijalankan ulang dari berkas pemilik 25 Okt 2026 dan cocok dengan baca-C C1.4.

### 5.9 Uji fungsi murni

`tests/sippa/hitung.test.mjs` (semua kasus §5.8 sisi JS + kasus yang DITOLAK: `dalam_m` 5,1 melempar galat; `sdr` 13 ditolak; `saranSarana` enam aturan masing-masing satu kompleks; `matriksRespons` empat tingkat; `vonisG4` tiga vonis), `tests/sippa/kembar.test.mjs` (JS = Python untuk semua kasus berlabel `kembar: true`), `tests/sippa/studio_mesin.test.mjs` (S1, S2, determinisme MC, dan properti `gerbangSippa`: 200 keadaan acak berbenih `mulberry32`, `keras_sesudah ≥ keras_sebelum`).

---

## 6. Alur

### 6.1 Form lapangan luring dan sinkronisasi

#### 6.1.1 Service worker

`public/sw-lapangan.js` dipakai ulang (pemilik `layar-peta`), bukan disalin. Perubahan tepat:

| Baris | Sekarang | Menjadi |
| --- | --- | --- |
| 10 | `const VERSI = 2` | `const VERSI = 3` (cangkang dan API lama dibuang saat aktif, baris 37) |
| 12 | `JALUR_API` tiga jalur | tambah `"/api/sippa/lapangan/saya"` |
| 13 | `KUNCI_KREDENSIAL` | tambah `"/api/sippa/lapangan/saya": "x-kode"` |
| 14 | `HALAMAN` | tambah `"/pipa/lapangan": "/pipa/lapangan"`, `"/pipa/lapangan/": "/pipa/lapangan"` |
| 29 | `lapangan = scope.endsWith("/lapangan")` | `const jalur = new URL(self.registration.scope).pathname.replace(/\/$/, "")` lalu `halaman = jalur` dan tambahan dari peta `TAMBAHAN = {"/lapangan": TAMBAHAN_LAPANGAN, "/lacak": ["/img/logo.svg"], "/pipa/lapangan": ["/img/logo.svg", "/vendor/qrcode/qrcode.min.js?v=1"]}` |

Perubahan baris 29 wajib: scope `/pipa/lapangan` juga berakhiran `/lapangan`, sehingga kode lama akan memasang cangkang `/lapangan` (form regu Posko) ke cache SIPPA. Uji `tests/warga/regu_luring.test.mjs` ditambah satu kasus: install dengan scope `https://x/pipa/lapangan/` mengambil `/pipa/lapangan`. Pendaftaran di `public/pipa/lapangan.js`: `navigator.serviceWorker.register("/sw-lapangan.js", {scope: "/pipa/lapangan"})`, ditunda 1.500 ms sesudah `load` (pola public/lapangan.js:215). Kiriman (POST) tidak pernah disentuh service worker (sw-lapangan.js:77).

#### 6.1.2 Masuk dan kode

1. Operator membuka `/pipa/lapangan#k=<26 heks>` atau memindai QR berisi tautan itu.
2. `lapangan.js` membaca fragmen, menyimpan `localStorage["sippa.kode"]`, lalu `history.replaceState(null, "", "/pipa/lapangan")` (fragmen hilang dari alamat dan riwayat). Kode tidak pernah masuk query (tidak tercatat di log server).
3. `GET /api/sippa/lapangan/saya` dengan header `x-kode`. 200 = tampil layar Tugas, jawaban disimpan service worker per sha256(kode) (sw-lapangan.js:56). 403 = kode tidak berlaku: hapus kode, tampil "Tautan tidak berlaku; minta tautan baru dari Pusdalops". Luring tanpa simpanan = "Butuh sinyal untuk pertama kali membuka tugas".
4. "Keluar dari tugas" menghapus kode dan butir antrean yang sudah terkirim; butir yang belum terkirim mencegah keluar (konfirmasi dua langkah).

#### 6.1.3 Antrean (`public/pipa/antre.js`)

- IndexedDB `sippa-antre` versi 1, dua store: `butir` (keyPath `id`, isi `{id, jenis: "log"|"probe"|"bbm"|"gerak", data, dibuat, tugas_id, keadaan: "menunggu"|"ditolak", alasan, coba, kirim_berikut}`) dan `foto` (keyPath `id`, isi `{id, blob, mime, butir_id, keadaan}`).
- Cadangan bila `indexedDB.open` gagal: butir teks ke `localStorage["sippa.antre"]` (larik JSON, dibatasi 200 butir); foto tidak diantre dan layar menampilkan "foto tidak bisa disimpan luring di peramban ini".
- Butir diikat ke `tugas_id`; ponsel bersama dua regu tidak saling mengirim butir orang lain (pola pengikatan draf di tests/warga/regu_luring.test.mjs:16-25).

#### 6.1.4 Kirim dan coba ulang

```
pemicu kirim: halaman dibuka, event "online", interval 60 dtk selama halaman tampil (visibilityState == "visible"), tombol "Kirim sekarang"
kunci: satu pengiriman berjalan pada satu waktu (variabel modul `sedangKirim`; navigator.locks bila ada)
1. foto dulu: tiap foto "menunggu" -> POST /api/sippa/lapangan/foto -> foto_id disalin ke butir pemiliknya (log.foto_id / jalan_cek)
   foto gagal 4xx -> foto "ditolak" + butir tetap dikirim tanpa foto; 5xx/jaringan -> berhenti, coba lagi nanti
2. butir "menunggu" yang kirim_berikut <= sekarang, maks 200 per panggilan, urut dibuat
   POST /api/sippa/lapangan/kirim {jam_kirim: Date.now(), log, probe, bbm, gerak}
3. jawaban 200: diterima + ganda -> hapus dari antrean; ditolak -> keadaan "ditolak" + alasan, tombol "Perbaiki"
   401/403 -> berhenti, minta tautan baru (butir tetap disimpan)
   413 -> belah dua lalu ulang
   429/5xx/jaringan -> coba = coba + 1; kirim_berikut = sekarang + min(60 dtk x 2^coba, 30 menit) x (0,8 + 0,4 x acak)
```

Status antrean di layar Tugas: "3 isian menunggu sinyal" dengan `aria-live="polite"`.

#### 6.1.5 Sisi server `POST /api/sippa/lapangan/kirim`

```
1. tugas = pemegangKode(env, req, "sippa", cariTugas)        // 403 sama untuk salah, dicabut, kedaluwarsa (src/bnpb.js:26)
2. laju(env, "tugas:" + tugas.id, "sippa.lapangan", [[JAM, 120]])
3. b = bacaBody(req, 262144)                                // 413 bila lebih
   meleset_kiriman = b.jam_kirim == null || |b.jam_kirim - kini| > 600000   // jam perangkat beda > 10 menit dari jam server saat kirim
4. untuk tiap butir: cekButir(jenis, butir, {lengan_dalam: tugas.lengan_dalam}) dari public/pipa/formulir.js
      salah -> ditolak[] dengan alasan per medan
      jam_klien_meleset = (meleset_kiriman || butir.waktu_klien > kini + 600000) ? 1 : 0   (tetap diterima; disimpan di kolom 0055)
      (waktu_klien jauh di belakang kini BUKAN meleset: butir luring memang bisa mengantre berjam-jam)
      gerak -> hanya kit tugas.kit_id, alasan gelar/bongkar/kembali, dari_status = status kit sekarang
5. pernyataan INSERT ... ON CONFLICT(id) DO NOTHING untuk butir sah (log: oleh = "tugas:<id>", prov = tugas.prov, diterima = kini)
6. db.batch(pernyataan + jejakStmt ringkas satu baris per kiriman)
      sukses -> meta.changes 1 = diterima, 0 = ganda
      galat (trigger urut waktu / status kit berubah) -> jalankan ulang satu per satu untuk memisahkan butir yang ditolak beserta pesan triggernya
7. jawab {diterima, ganda, ditolak, jam_server}
```

Konflik: tidak ada sunting baris di server, jadi tidak ada konflik tulis-tulis pada log, probe, BBM. Satu-satunya keadaan bersama adalah status kit; gerak operator yang datang terlambat sesudah staf memindah kit ditolak trigger `sippa_gerak_cek` dan tampil di layar operator sebagai "Kit sudah dipindah staf ke <status>; isian pindah dibatalkan". Koreksi waktu tahap = butir log baru dengan `koreksi_dari` (rekap memakai yang terbaru).

### 6.2 Lacak kit: mesin keadaan

Status: `gudang`, `depot`, `gelar`, `banjir`, `servis`, `hilang`, `pensiun` (terminal). Transisi sah ditegakkan CHECK `sippa_gerak` (§3.2); siapa boleh, ditegakkan `src/sippa.js`:

| Dari → ke | Alasan yang sah | W (staf tulis) | K (operator kit tugasnya) | M (moderator) |
| --- | --- | --- | --- | --- |
| gudang → depot | pra_posisi | ya (boleh `rencana = 1`) | | ya |
| gudang/depot/banjir → gelar | gelar | ya | ya | ya |
| gelar → depot | bongkar | ya | ya | ya |
| depot/gelar/banjir → gudang | kembali | ya | ya | ya |
| gudang/depot/gelar → banjir | pindah_banjir | ya (boleh `rencana = 1`, wajib `pengangkut`, `permintaan_dari`) | | ya |
| banjir → depot | pra_posisi | ya | | ya |
| gudang/depot/gelar/banjir → servis | servis | ya | | ya |
| servis → gudang | kembali | ya | | ya |
| apa pun kecuali pensiun → hilang | hilang (wajib `catatan`) | | | ya |
| hilang → gudang | ditemukan | | | ya |
| gudang/servis/hilang → pensiun | pensiun | | | ya |
| pasangan sah mana pun | koreksi (wajib `catatan`) | | | ya |

Tabel `ALASAN_TRANSISI` di `src/sippa.js` memetakan alasan → himpunan pasangan, dan diuji sama dengan CHECK (uji membaca teks migrasi, mengurai daftar pasangan, membandingkan dengan gabungan himpunan di JS).

Gerak terencana (`rencana = 1`): kit tetap di status lama sampai `POST /api/sippa/tiba/:id` mengisi `tiba`; selama terbuka, gerak lain untuk kit itu ditolak 409. Kit yang bergerak antar-provinsi terlihat oleh provinsi asal (kit.prov) dan tujuan (gerak.prov) selama gerak terbuka. ETA p50/p90 per pengangkut dihitung klien dari `tiba − waktu` gerak selesai (`kuantil`).

Kehilangan musim (U8): `Σ komponen musim_awal=1 berkondisi hilang / Σ komponen musim_awal=1`, per kit dan total, dibandingkan 5% (U8) dan 20% (K-15). "Musim" = sejak 1 Mei tahun berjalan (karhutla) atau 1 November (banjir), parameter `musim` di `GET /api/sippa/kit`.

### 6.3 Telemetri masuk

```
POST /api/sippa/telemetri
Authorization: Bearer <64 heks>
{"kit":"SIPPA-001","dikirim":"2026-10-28T03:15:00Z","sumber":"gateway",
 "bacaan":[{"tag":"PT-102","waktu":"2026-10-28T03:14:55Z","nilai":4.8,"satuan":"bar"},
           {"tag":"T-103","waktu":"2026-10-28T03:10:00Z","nilai":61.2,"satuan":"C","kedalaman_cm":50}]}
```

Bentuk datar paket pemilik (`{site_id, utc_time, PT102_bar, FT101_m3h, GWT01_m, T03_50cm_C, sensor_quality, source}`) diterjemahkan `dariDatar(o)` di `src/sippa.js` menjadi bentuk di atas: kunci dipecah regex `/^([A-Z]+)(\d+)(?:_(\d+)cm)?_([A-Za-z0-9]+)$/` menjadi awalan, nomor, kedalaman, satuan. Penomoran pemilik (`T03`, `GWT01`) tidak sama dengan tag P&ID SIPPA (`T-103`, `GWT-101`), jadi pemetaannya tidak ditebak: medan `tag_datar` (opsional) disimpan bersama perangkat saat didaftarkan dan dipakai sebagai kunci terjemahan; kunci datar tanpa padanan ditandai `tag_asing` (butir teknis BT-02, §9.2). Hanya satu bentuk yang disimpan.

Langkah server:

```
1. Bearer -> sha256 -> SELECT sippa_perangkat WHERE token_sha = ? AND aktif = 1      (tidak ada / salah -> 401; hitung "sippa.token_gagal" per hash IP, > 300/jam = 429)
2. laju murah: SELECT count(*) FROM sippa_telemetri WHERE pengirim_id = ? AND diterima > kini - JAM  >= 120 -> 429 retry-after
3. badan <= 65.536 byte (413), bacaan 1..500 (400)
4. kit == kode kit pengirim (400 bila beda); tiap tag harus perangkat aktif kit itu (butir tak dikenal -> ditandai "tag_asing", tidak disimpan)
5. waktu: > kini + 5 menit atau < kini - 30 hari -> ditolak per bacaan; satuan harus sama dengan perangkat
6. mutu: 2 bila di luar [min_sah, maks_sah]; 1 bila sensor_quality pemilik < 0,5; selain itu 0   (di luar rentang DISIMPAN, bukan dibuang)
7. id = sha256(token_sha + badan mentah)[:32]; INSERT ... ON CONFLICT(id) DO NOTHING (ganda = pesan sama dikirim ulang)
8. evaluasi alarm untuk tag yang ada di pesan (§6.3.1); buka/tutup alarm = paling banyak beberapa tulisan
9. 202 {diterima, ditandai, ganda}
```

Penyimpanan dan kuota: satu tulisan per pesan. Gateway bawaan mengirim tiap 60 detik (1.440 tulisan per kit per hari, plus alarm). Sampling sensor cepat (PT/FT 0,5–5 detik) diringkas di gateway menjadi min/maks/rerata per menit sebelum dikirim [asumsi, ditinjau sesudah G2]. Batas 120 pesan per jam per pengirim. Pada 81 kit bertelemetri, 117 rb tulisan per hari melewati kuota gratis 100 rb; sebelum lebih dari 30 kit terpasang, harus dipilih: paket D1 berbayar atau interval 5 menit (ADR-07; pertanyaan pemilik T-K, PRD §2.2).

Ringkas dan buang (cron menit 17, di `bersihSemua` worker.js:807, tanpa jadwal cron baru; batas lima jadwal akun Free, worker.js:766-768): `bersihkanSippa(env, kini)`:

```sql
INSERT INTO sippa_telemetri_harian (perangkat_id, hari, n, min, maks, rerata, n_mutu2, dummy)
SELECT p.id, date((json_extract(b.value, '$[1]') / 1000) + 25200, 'unixepoch'), count(*), min(json_extract(b.value,'$[2]')),
       max(json_extract(b.value,'$[2]')), avg(json_extract(b.value,'$[2]')), sum(json_extract(b.value,'$[3]') = 2), t.dummy
FROM sippa_telemetri t, json_each(t.bacaan) b JOIN sippa_perangkat p ON p.kit_id = t.kit_id AND p.tag = json_extract(b.value, '$[0]')
WHERE t.t_akhir < ?1 GROUP BY 1, 2
ON CONFLICT (perangkat_id, hari) DO UPDATE SET n = n + excluded.n, min = min(min, excluded.min), maks = max(maks, excluded.maks),
  rerata = (rerata * n + excluded.rerata * excluded.n) / (n + excluded.n), n_mutu2 = n_mutu2 + excluded.n_mutu2;
DELETE FROM sippa_telemetri WHERE t_akhir < ?1;      -- ?1 = kini - 30 hari; dua pernyataan dalam satu db.batch
```

Ponytail: rerata harian digabung berbobot n; median harian tidak disimpan (tidak dipakai layar).

#### 6.3.1 Alarm

Ambang semua `asumsi-kebijakan` sampai G2, disimpan di `AMBANG_ALARM` di `src/sippa.js`:

| Kode | Syarat (dievaluasi dari pesan yang baru masuk + pesan 15 menit terakhir kit itu) | Tutup otomatis |
| --- | --- | --- |
| `hisap_rendah` | PT-101 < `npsh_bar` kit (bawaan −0,6 bar) | 2 bacaan berturut di atas ambang |
| `debit_rendah` | FT-101 < 20% debit operasi selama RPM > 0 lebih dari 2 menit | debit ≥ 20% |
| `dry_run` | FT-101 = 0 dan RPM-101 > 0 selama 30 detik | debit > 0 atau RPM 0 |
| `tekanan_lebih` | PT-102 > 0,88 x PN x fSuhu (dari jenis selang kit) | di bawah batas |
| `belum_dingin` | T-1xx > 50 °C pada tahap 24 jam atau sesudahnya | ≤ 50 °C |
| `co_tinggi` | rerata 15 menit CO-101 > 35 ppm | ≤ 35 ppm |
| `bbm_rendah` | BBM-101 < 20% | ≥ 20% |
| `diam` | tidak ada bacaan dari perangkat > 3 x `interval_s` (dicek di cron menit 17) | bacaan datang |

Alarm terbuka unik per (perangkat, kode) (indeks unik parsial §3.4). Alarm aktif menjadi butir Meja Pantau `sippa_alarm` (peran `pusdalops`, tautan `/pipa/telemetri`) lewat detektor di `DETEKTOR` (src/pantau.js:131); tidak ada push baru.

### 6.4 Laporan PDF

1. Layar Laporan: staf memilih templat dan rentang; klien mengambil data dari API yang sudah ada (log, kit, A/B, skenario, telemetri ringkas).
2. `isiLaporan(jenis, data, {per, prov})` (murni, `public/pipa/laporan_isi.js`) mengembalikan `{judul, nama_berkas, blok: [{tipe: "judul"|"paragraf"|"tabel"|"angka"|"foto"|"pil", ...}], kaki}`. Aturan isi yang diuji `tests/sippa/laporan_isi.test.mjs`: hanya logo BNPB; tiap blok angka membawa `sumber` dan `waktu`; pil keyakinan; tidak ada kata "terbukti", em dash, atau titik tengah U+00B7 di teks blok; `nama_berkas = "sippa-<jenis>-<prov|nasional>-<YYYYMMDD>.pdf"`; kaki "Dibuat otomatis dari data SIPPA per <waktu WIB>. Bukan dokumen resmi sebelum ditandatangani pejabat berwenang."
3. `laporan_pdf.js` merender blok dengan jsPDF lokal `public/vendor/jspdf/jspdf.umd.min.js` (dipakai juga public/laporan_karhutla_deck.js) dan Roboto lewat `muatRoboto()`/`pasangRoboto()` (public/inti/roboto.js:4, 10). public/laporan_bnpb.js:9 memuat jsPDF dari cdnjs; pola itu TIDAK disalin karena CSP staf `script-src 'self'`. Foto diambil dari `GET /api/sippa/foto/:id`, diperkecil ke lebar 1.200 px di kanvas sebelum ditanam.
4. PDF diunduh ke perangkat staf dan, bila staf mencentang "Arsipkan", dikirim `POST /api/sippa/laporan` (multipart). Server memeriksa byte awal `%PDF-`, ukuran, menyimpan ke R2 `sippa-laporan/<id>.pdf` dengan `httpMetadata.contentType = "application/pdf"`, lalu baris `sippa_laporan`.
5. Pengingat mingguan: butir Meja Pantau `sippa_mingguan` muncul Senin sejak 07.40 WIB bila ada kit berstatus `gelar` atau `banjir` dan tidak ada `sippa_laporan` jenis `mingguan` dalam 7 hari terakhir (ADR-11; tabel `pengingat` 0028 punya CHECK jenis tertutup, migrations/0028_pengingat.sql:21).

### 6.5 Simulasi Three.js (`/pipa/3d`)

- **Pola:** `public/pipa/adegan.js` bagian atas logika murni tanpa DOM/WebGL (diekspor dan diuji), bagian bawah runtime yang dimuat malas, sama dengan public/sim_adegan.js:1-6. Bedanya: sim_adegan memuat three dari CDN lewat import map (public/index.html:6659, sim_adegan.js:360); SIPPA memuat dari vendor lokal `import("/vendor/three/three.module.min.js")` dan `import("/vendor/three/addons/controls/OrbitControls.js")` (impor `"three"` di berkas itu ditulis ulang menjadi `"../../three.module.min.js"`), karena CSP staf menolak CDN dan import map sebaris.
- **Data masuk:** `{hasil: hidraulika(p), p, kompleks: {beda_air_m, elev_kompleks_m, elev_air_m, air_km}|null, adegan: "susunan"|"jalur"|"injeksi", tema: {paper, ink}}`. Profil elevasi trase = tiga titik (air, tengah linear, kompleks), pil "DSM berkanopi, ilustrasi".
- **Logika murni yang diekspor:** `tataKomponen()` → larik `{kode_bom, x, y, z, lebar, tinggi, dalam}` (uji: kotak tidak saling tumpuk); `profilWarna(hasil)` → warna per segmen 50 m dari `hasil.profil` dengan skala yang sama dengan grafik kalkulator dan tanda merah bila `p > p_batas` atau `p < 2`; `frontBasah(t_s, Q_ls, h_m, ne = 0.5)` → r = √(Q t / (π h n_e)) (uji: monoton naik); `cekKedalaman(m)` melempar galat bila > `KONST.dalam_maks_m`.
- **Adegan:** (1) susunan kit dengan klik komponen → kartu info kode BOM §6.1; (2) jalur air: partikel bergerak dengan kecepatan ∝ v, animasi air tiba sesuai `t_tiba_menit` (dipercepat skala waktu tetap 1 menit nyata = 1 detik layar); (3) injeksi: penampang gambut 0–2 m (diperpanjang ke 5 m bila `dalam_m ≥ 3`), label tetap "Ilustrasi, bukan model panas terkalibrasi (model M04 belum dikalibrasi)".
- **Anggaran kinerja:** ≤ 150 rb segitiga, ≤ 80 draw call, partikel ≤ 2.000 desktop dan ≤ 500 ponsel, `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`, bayangan mati di ponsel; render hanya saat ada perubahan atau animasi aktif (loop `requestAnimationFrame` berhenti saat diam); `prefers-reduced-motion` menghentikan partikel; target frame ≤ 16 ms di laptop uji; three dimuat hanya saat layar 3D dibuka (sekitar 170 KB gzip). Pindah layar = `dispose()` geometri, material, tekstur, renderer, dan pelepasan semua pendengar.
- **Tanpa WebGL:** diagram SVG statis dari `tataKomponen()` dan `profilWarna()` dengan pita "Peramban ini tidak mendukung WebGL". Panel teks di samping kanvas selalu memuat angka yang sama (alternatif aksesibel).

---

## 7. Pipeline data

### 7.1 Gaya skrip

Python 3.12 stdlib saja (tidak ada pip di Actions; roster pipa-data). Tiap skrip: `python3 <skrip>.py uji` = self-check `assert` tanpa jaringan dan tanpa menulis keluaran; tanpa argumen = jalan normal (pola scripts/data/operasi.py:343, 406-407). Penulisan atomik lewat `bersama.tulis_json(nama, obj)`: susun dict dengan `dibuat` sebagai kunci pertama, serialisasi `json.dumps(obj, ensure_ascii=False, separators=(",", ":"))`, `assert len(teks.encode()) <= 8 * 1024 * 1024`, tulis ke `<nama>.tmp` lalu `os.replace`. Jalur: keluaran tahunan ke `data/sippa/keluaran/`, keluaran harian ke `$SIPPA_KELUAR` (bawaan `data/sippa/keluaran/`; di Actions `/tmp/sippa`).

### 7.2 Skrip

| Skrip | Masukan | Keluaran | Self-check (`uji`) | Dijalankan |
| --- | --- | --- | --- | --- |
| `bersama.py` | | pustaka: `baca_csv`, `tulis_json`, `zona`, `kuantil`, `banding_rerata`, `banding_proporsi`, `af`, `npv`, `bcr`, `impas`, `crf`, `vonis_pilot` | kasus Z1–Z5, Q1, W1, P1, N1, V1–V3 §5.8 | diimpor, `uji` |
| `hidraulika.py` | | pustaka + `uji` | H1–H8, F1–F4, A1 | diimpor, `uji` |
| `respons.py` | `public/data/operasi.json` (`koef`) | pustaka `saran_sarana`, `matriks_respons`, `tingkat_pemicu` | enam aturan saran, empat tingkat respons, T1–T4 | diimpor |
| `kembar_cli.py` | stdin JSON kasus | stdout JSON hasil | | dipanggil `tests/sippa/kembar.test.mjs` |
| `sel22.py` | `data/raw/firms/viirs*.csv` (gitignore, lokal) kolom `latitude, longitude, acq_date, confidence`; deteksi `confidence` ∈ {n, h} 2012–2025 di kotak Kalteng (lat −3,6..0,8; lon 110,7..115,9) | `sel22.json`, dan tabel sel untuk `zona.py --sel` | indeks sel bolak-balik (pusat sel kembali ke sel sama); `tahun_aktif ≤ 14`; jumlah deteksi = baris tersaring | lokal, tahunan Januari |
| `zona.py` | `data/kajian-bnpb/pipa/data/{osm_jarak,dem_elevasi,gsw_air_terdekat,area_terbakar,chirps_anomali_tahunan}.csv`, `public/data/kendala.json`, `operasi.json`, `akses.json`, `kompleks_konsesi.json`, `khg_prioritas.json`, `sel22.json` | `kelayakan_kompleks.json`, `zona.json`; dengan `--sel`: `kelayakan_sel.json` | (1) versi `kendala.json` = A188/B418/C89/D170, jalan utama OSM = A198/B429/C81/D157, semua jalan OSM = A469/B158/C167/D71 (operator `<`); (2) tiap kompleks tepat satu zona per versi, jumlah = 865; (3) tidak ada nama perusahaan di keluaran (cari kunci `nama`, `perusahaan`, `pt` di objek `kaw`); (4) median air semua 1,02 km dan jalan semua 2,27 km (dibulatkan 0,01; median dihitung tipe 7, catatan: pipa_data.py memakai `v[n//2]`, selisih ≤ 0,01 diterima) | lokal; ulang bila `kendala.json` berubah atau AOI baru |
| `nasional.py` | `public/data/luas_resmi.json` | `kit_nasional.json` | total 81, gambut 56 dari data saat ini; tiap kit ≥ 0; provinsi gambut/sabana dengan puncak ≥ 10.000 ha mendapat ≥ 1 | lokal; saat `luas_resmi.json` berubah |
| `pemicu.py` | `public/data/iklim_outlook.json`, `fwi_ansambel.json`, `titik24.json`, R2 atau berkas lokal `kelayakan_kompleks.json` | `pemicu.json` | T1–T4; tingkat tidak naik melewati SIAGA bila ansambel basi; kabupaten tanpa sel ansambel = `hari_ps50: null` | Actions harian (data.yml) |
| `aoi.py` | `kelayakan_kompleks.json`, `sel22.json`, ekspor `sippa_aoi_usul` (CSV dari layar Laporan) | `aoi_calon.json` | saringan KD §3.2 menghasilkan ≥ 1 calon pada data uji | lokal, saat diminta |
| `pilot_cek.py` | ekspor `GET /api/sippa/log.csv` dan `GET /api/sippa/probe.csv` (diunduh staf), atau fixture | laporan teks ke stdout; keluar bukan 0 bila syarat RENCANA-UJI §6.1 gagal | fixture bergaya isian pilot, termasuk kasus V1–V3 §5.8 | lokal, sesudah tiap sesi pilot |

Rincian `zona.py`:

- Kompleks = kunci `kendala.json.kompleks` ber-`prov` 62 (865, `assert`), koordinat dari `operasi.json` (pola pipa_data.py:12-23).
- `zona_k = zona(air_km_lama, jalan_km_lama)`, `zona_u = zona(air_km_semua, jalan_km_utama)`, `zona_o = zona(air_km_semua, jalan_km_semua)`; fungsi `zona` dari `bersama.py` yang identik dengan pipa_data.py:361-365.
- `kaw`: `konservasi` bila kompleks bertanda kawasan konservasi, `konsesi` bila ada di `kompleks_konsesi.json.kompleks`, selain itu `lain`; nama dan jenis izin dibuang di sini.
- `jam_tiba = min(d["jam"] for d in akses[id]["dari"])` bila ada, selain itu `null`.
- `khg`: id KHG bila `khg_prioritas.json` memuat pemetaan kompleks ke KHG; bila tidak, `null` dan `catatan` menyebutnya.
- `zona.json`: satu baris provinsi + satu baris per kabupaten untuk tiap versi; `tanpa_jalan_16km` = jumlah `jalan_kend_terpotong = 1`.

Rincian `pemicu.py`:

- Unit = kabupaten yang memuat ≥ 1 kompleks `zona_k` A atau B (v1; kriteria sel ≥ 7 dari 14 tahun menunggu `kab` di `kelayakan_sel`, BT-03).
- Wilayah iklim kabupaten = kunci `iklim_outlook.wilayah` yang `kotak`-nya memuat titik tengah kompleks kabupaten itu (rerata lat/lon); tidak ada = `nasional`. Tidak ada tabel provinsi tulisan tangan.
- `anom_pct` = nilai paling negatif di antara dua entri `prakiraan` pertama dengan `musim` berbeda dan `bulan_tengah ≥ bulan berjalan` (musim berjalan dan berikutnya), hanya bila `wilayah[w].tampil`; `anom_p10`, `anom_p90` dari entri yang sama.
- `hari_ps50` = maksimum, atas sel `fwi_ansambel.grid` yang memuat kompleks A/B kabupaten itu (`|lat − sel.lat| ≤ 0,25` dan `|lon − sel.lon| ≤ 0,25`), dari jumlah hari `ps[d] ≥ 0,5`, d = 0..6. Tanpa sel = `null`.
- Basi: `fwi_ansambel.dibuat` lebih tua dari 36 jam terhadap waktu jalan → `basi_ansambel = true`; `titik24.acuan` lebih tua dari 36 jam → `basi_titik = true`.
- `titik_ab` = jumlah titik `titik24.titik` (`[lat, lon, indeks_laci]`) yang laci-nya kompleks A/B kabupaten itu dengan `terbakar_n_2km ≥ 3`.
- `tingkat = respons.tingkat_pemicu(...)`; `alasan` kalimat dengan angka koma desimal.

### 7.3 Jadwal dan penyegaran

| Berkas | Penyegaran | Cara |
| --- | --- | --- |
| `pemicu.json` | harian | data.yml (cron `20 14 * * *` = 21.20 WIB, data.yml:8), sesudah `kendala.py` (data.yml:318-326) dan sesudah ansambel (data.yml:177-181) |
| `kelayakan_kompleks.json`, `zona.json` | saat `kendala.json` berubah bermakna atau AOI baru; paling lambat tahunan | lokal oleh pipa-data: `python3 scripts/data/sippa/zona.py uji && python3 scripts/data/sippa/zona.py`, commit, lalu unggah R2 (manual atau `workflow_dispatch` dengan masukan `sippa_tahunan=1`) |
| `sel22.json`, `kelayakan_sel.json` | Januari, sesudah VIIRS tahun penuh | lokal (butuh `data/raw/firms` yang tidak ada di Actions) |
| `kit_nasional.json` | saat `luas_resmi.json` berubah | lokal |
| `aoi_calon.json` | saat diminta | lokal |

Layar menandai basi: `pemicu.json` > 36 jam (PRA-POSISI/GELAR tidak ditampilkan), berkas tahunan > 400 hari.

### 7.4 Langkah `data.yml` (dikerjakan mekanik-mesin)

Disisipkan sesudah langkah "Prioritas KHG dan kendala lapangan" (data.yml:318-326):

```yaml
      # SIPPA: pemicu pra-posisi harian (DESAIN-TEKNIS §7). Hanya ke R2 sippa/ (dibaca Worker untuk staf), BUKAN public/data.
      - name: Pemicu SIPPA (boleh gagal)
        id: sippa_pemicu
        continue-on-error: true
        timeout-minutes: 5
        env:
          SIPPA_KELUAR: /tmp/sippa
        run: |
          mkdir -p /tmp/sippa
          python3 scripts/data/sippa/pemicu.py uji || { echo "::error title=Pemicu SIPPA swauji merah::pemicu.py uji gagal"; exit 1; }
          python3 scripts/data/sippa/pemicu.py
      - name: Unggah SIPPA ke R2 (boleh gagal)
        if: steps.sippa_pemicu.outcome == 'success'
        continue-on-error: true
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          set -e
          npx --yes wrangler@4.42.0 r2 object put poskokarhutla-foto/sippa/pemicu.json --file /tmp/sippa/pemicu.json --content-type application/json --remote
          if [ "${{ github.event.inputs.sippa_tahunan }}" = "1" ]; then
            for f in kelayakan_kompleks kelayakan_sel zona sel22 kit_nasional aoi_calon; do
              [ -f data/sippa/keluaran/$f.json ] && npx --yes wrangler@4.42.0 r2 object put poskokarhutla-foto/sippa/$f.json --file data/sippa/keluaran/$f.json --content-type application/json --remote
            done
          fi
```

Pola persis unggah risiko (data.yml:137-151): langkah boleh gagal, unggah hanya bila skrip sukses, JSON polos `--content-type application/json`. `pemicu.py` membaca `kelayakan_kompleks.json` dari `data/sippa/keluaran/` (di-commit), jadi tidak perlu mengunduh dari R2. `workflow_dispatch` (data.yml:9) ditambah masukan `sippa_tahunan` (string, bawaan "0").

---

## 8. Keamanan, privasi, performa, observabilitas, deploy, dummy

### 8.1 Model ancaman dan kendali (tinjauan keamanan tahap desain)

| Permukaan | Ancaman | Kendali (wajib diuji di `tests/warga/sippa.test.mjs`) |
| --- | --- | --- |
| Cangkang `/pipa*` | tamu membaca struktur layar | cangkang tanpa data; sesi dicek di rute; 303/403 |
| `GET /api/sippa/data/<nama>` | enumerasi berkas R2 | hak dicek sebelum R2; tamu 401 identik untuk nama ada dan tidak ada; nama hanya dari daftar tetap (tidak ada jalur dari masukan, jadi tidak ada traversal) |
| IDOR baris lintas provinsi | staf berwilayah 61 membaca kit/log/foto 62 | saring `prov` di SQL untuk SEMUA GET dan cek `dalamWilayahStaf` di tulis; di luar wilayah = 404 identik dengan tidak ada |
| Eskalasi peran | `pimpinan` menulis; staf `verifikator` membaca | `P_SIPPA_BACA`/`P_SIPPA_TULIS` di satu tempat; `HALAMAN_STAF.pipa` dijaga sama dengan `P_SIPPA_BACA` oleh tests/warga/staf_halaman.test.mjs; akun gerbang `AKUN_SITUS` tidak boleh aksi M (`modOK`) |
| CSRF | situs lain memicu POST dengan cookie staf/admin | `tolakOrigin` (worker.js:562) untuk cookie admin; `x-pb: 1` untuk sesi staf (src/staf.js:39); rute K dan D tidak memakai cookie |
| Kode penugasan | tebak kode, kode bocor | 26 heks acak (`acak(13)`, 104 bit); hanya sha256 disimpan; tebakan salah dihitung per hash IP, > 300 per jam = 429 (`pemegangKode`); kedaluwarsa ≤ 30 hari (CHECK); cabut kapan saja; kode di fragmen URL, tidak di query; kode hanya bisa menulis log, probe, BBM, foto, gerak terbatas kit tugasnya, dan membaca tugasnya sendiri |
| Token perangkat | token dicuri dari gateway | 256 bit, hanya sha256 disimpan; cabut per perangkat; token hanya bisa menulis telemetri kit itu; tidak bisa membaca apa pun |
| Injeksi SQL | | semua nilai lewat `bind`; nama kolom/tabel hanya dari konstanta; filter daftar (`status`, `jenis`) divalidasi terhadap daftar tetap sebelum masuk SQL |
| XSS tersimpan | catatan, nama regu, nama skenario, isi CSV | layar menyisipkan data hanya lewat `textContent` atau `esc()` (public/inti/format.js:6); gerbang `gerbang-sippa.test.mjs` menolak `innerHTML =` atau `insertAdjacentHTML` dengan template berisi `${` di `public/pipa/**` kecuali argumen dibungkus `esc(`; CSP tanpa `'unsafe-inline'` sebagai lapis kedua |
| Unggah foto | berkas polyglot, EXIF lokasi | jenis dari byte awal (`jenisBerkas`), hanya JPEG/WebP; `bersihMedia` membuang EXIF; kunci R2 dari server `sippa-foto/<id16>`; disajikan dengan `content-type` dari baris DB dan `nosniff` |
| Unggah PDF | HTML disamarkan PDF | byte awal `%PDF-`; disajikan `application/pdf`, `content-disposition: attachment`, `content-security-policy: sandbox`, `nosniff` |
| Unggah CSV A/B | injeksi rumus saat dibuka evaluator di spreadsheet | CSV diurai sebagai teks; keluaran CSV memberi awalan `'` pada sel berawalan `= + - @`, tab, CR |
| Penolakan diam | butir rusak dilaporkan "ganda" | larangan `INSERT OR IGNORE` (ADR-08) |
| Privasi | data pribadi operator | tidak ada NIK, nomor WA, atau nama orang; hanya nama regu dan unsur; koordinat penuh hanya untuk staf; CSV bawaan membulatkan 0,01 derajat; nama perusahaan konsesi tidak pernah ada di R2 maupun layar (dibuang di `zona.py`) |
| Log | rahasia di log | tidak pernah `console.log` badan permintaan, kode, atau token; log hanya jumlah (`{sippa_kirim: {diterima, ganda, ditolak}}`) |

Pengulas wajib sesuai AGENTS.md §6: `guard-api` dan `security-reviewer` untuk `src/sippa.js` dan perubahan worker; `migrasi-idempoten` untuk 0055–0057.

### 8.2 Performa dan INP

| Butir | Anggaran | Cara |
| --- | --- | --- |
| INP layar perencanaan | ≤ 200 ms di laptop uji (U10) | chrome kontrol (`aria-pressed`, `aria-selected`, `aria-expanded`, pil aktif) diubah langsung di handler; gambar ulang grafik, filter peta, tabel, Monte Carlo lewat `nanti()` (public/inti/nanti.js:3) atau Web Worker (INP.md, "pisahkan chrome dari isi") |
| INP form lapangan | ≤ 100 ms di ponsel kelas menengah | tidak ada render berat di handler stopwatch; tulis IndexedDB sesudah cat (`nanti`); halaman bertoken = wilayah paling ketat (INP.md "Halaman tanpa login") |
| JS awal `/pipa` (Ringkas) | ≤ 60 KB gzip di luar `public/inti` | layar dimuat `import()`; MapLibre (`public/vendor/maplibre`, v4.7.1) hanya di Peta/Kit; three hanya di 3D; jsPDF hanya di Laporan |
| Warna zona (keputusan 52) | web memakai palet PRD (A `--ok`, B `--info`, C `--warn`, D `--bad`) DAN huruf A–D DAN pola isi (A penuh, B cincin, C setengah, D silang) sebagai wajib; buku/deck biru-emas di luar cakupan web | gerbang `gerbang-sippa.test.mjs`: tiap lapisan zona di `layar_peta.js` memasang simbol huruf dan pola, tidak hanya warna |
| Peta | sakelar satuan dan versi zona tanpa membuat ulang sumber | satu sumber GeoJSON per satuan dibuat sekali; sakelar = `setLayoutProperty(visibility)`/`setFilter`; ganti tema `setStyle(..., {diff: false})` lalu pasang ulang lapisan di `style.load` |
| Tabel | ≤ 50 baris per halaman | `paginasi()` public/inti/tabel.js:4 |
| Studio | geser slider tanpa beku | `assess` di utas utama (< 5 ms); MC 800 sampel di `studio_pekerja.js`; tanpa Worker = `nanti()` + pita "lambat di peramban ini" |
| `hidraulika()` | < 1 ms | murni, profil ≤ 101 titik |
| Rute worker | CPU < 10 ms per permintaan GET | satu sampai tiga `SELECT` berindeks; R2 dialirkan tanpa diurai (src/risiko7.js:25); daftar log paling banyak 2.000 baris |
| Tulisan D1 | SIPPA ≤ 5 rb per hari di luar telemetri | batas laju hanya di tulis; jejak satu baris per aksi; telemetri satu baris per pesan |

Gerbang INP (`tests/sippa/gerbang-sippa.test.mjs` butir 6): daftar fungsi berat (`gambarGrafik`, `gambarPeta`, `isiTabel`, `jalankanMC`, `gambarAdegan`) dan pemindaian PER HANDLER `addEventListener("click"|"input"|"change", ...)` di `public/pipa/layar_*.js`: tiap pemanggilan fungsi berat di dalam handler harus berada di dalam `nanti(` atau `postMessage(`. Per handler, bukan per berkas (INP.md, ranjau "gerbang yang mendaftar per berkas").

Ukur sebelum klaim: angka INP diambil dengan rekaman Performance Chrome lewat `preview_start` sebelum dan sesudah tiap perbaikan; perbaikan yang tidak menggeser angka di luar derau dikembalikan.

### 8.3 Observabilitas

- Workers observability sudah aktif (wrangler.jsonc:20); galat rute dicatat `console.error("rute", jalur, e)` oleh `rute()` (worker.js:581-582).
- `src/sippa.js` mencatat satu baris JSON per kejadian penting: `console.log("sippa", JSON.stringify({aksi, n, ms}))` untuk kiriman lapangan, telemetri, dan cron; tidak pernah isi badan.
- Jejak audit: tiap tulisan staf/admin/operator menulis `pantau_jejak` (append-only, migrations/0030_staf.sql:86-94), terbaca di Meja Pantau.
- Kesegaran data: layar menampilkan pil `per` dan basi (§7.3). `GET /api/sippa/ringkas` memuat `pemicu_dibuat` (dari kepala objek R2, `MEDIA.head`) sehingga Ringkas menunjukkan bila pipeline harian berhenti.
- Butir Meja Pantau: `sippa_alarm` (telemetri) dan `sippa_mingguan` (laporan mingguan belum dibuat).

### 8.4 Deploy dan rollback

Subagent tidak pernah deploy, commit, atau push (AGENTS.md §9). Jalur terbit repo adalah `.github/workflows/terbit.yml` (komentar kepala workflow: tampilan terbit lewat sini, bukan `wrangler deploy` dari laptop), urutan sesi induk sama dengan PRD §10.6:

1. Migrasi lebih dulu: `npx --yes wrangler@4.42.0 d1 migrations apply poskowarga --remote` (hanya 0055–0057 baru). Kode yang tiba sebelum migrasi tetap aman karena `bungkusSippa` menjawab 503 sopan.
2. Push ke cabang `staging`: terbit.yml menjalankan `uji:agen`, `uji:warga`, `uji:sippa`, lalu `wrangler versions upload --preview-alias staging` (pratinjau, tidak dipromosikan). Staging memakai D1/R2 produksi, jadi semua tulisan uji asap di sana memakai baris dummy lalu `POST /api/sippa/dummy/hapus`.
3. Uji asap di URL pratinjau, lalu merge ke `main`: terbit.yml menguji ulang dan menjalankan `wrangler deploy`.
4. **Peringatan:** `main` juga di-deploy ulang otomatis oleh `titik.yml` (cron `40 */3 * * *`, titik.yml:259), `banjir.yml` (`20 0 * * *` = 07.20 WIB, banjir.yml:160), dan `data.yml` (`20 14 * * *` = 21.20 WIB, data.yml:502). Artinya kode SIPPA yang masuk `main` tayang dalam hitungan menit lewat terbit.yml, dan paling lambat pada jadwal deploy berikutnya (paling lambat 21.20 WIB hari itu) walau terbit.yml gagal. Merge ke `main` hanya setelah `npm run uji` dan `npm run uji:sippa` hijau di commit yang sama.
5. Uji asap produksi (PRD §10.6 langkah 6) ditambah: `/pipa` di `centurisk97.id` tanpa sesi = 303 ke `/admin/pantau?ke=%2Fpipa`.
6. Rollback: `npx --yes wrangler@4.42.0 rollback` untuk worker, LALU revert commit di `main` (tanpa revert, deploy terjadwal berikutnya menayangkan ulang kode rusak). Migrasi tidak dibalik: tabel `sippa_*` tidak dibaca modul lain. Berkas R2 `sippa/` bisa ditimpa ulang dari `data/sippa/keluaran/` yang di-commit.
7. Sesudah deploy: sha256 0055–0057 dicatat ke `tests/warga/migrasi_beku.json` (dijaga tests/warga/migrasi_beku.test.mjs).

### 8.5 Data dummy

Mengikuti `~/.claude/DUMMY.md` dan PRD §9.14, dengan ketentuan tepat:

- Tombol 🧪 (isi layar yang terbuka) dan 🧹 (hapus semua dummy SIPPA) hanya untuk Super Admin (`data-super="1"` di cangkang; server `superOK`). Sesudah isi atau hapus: `location.reload()` penuh.
- `RANTAI_DUMMY` di `src/sippa.js` adalah tabel keputusan `{layar: [pengisi...]}` hulu ke hilir (bukan rantai `if`). Pengisi: `isiKit`, `isiKomponen`, `isiTugas`, `isiGerak`, `isiLog`, `isiProbe`, `isiBbm`, `isiJalanCek`, `isiAoi`, `isiAb`, `isiSkenario`, `isiPerangkat`, `isiTelemetri`, `isiAlarm`, `isiLaporan`. Pengisi hulu yang sudah punya baris dummy hidup tidak mengisi ulang (gerbang "sudah ada" menghitung baris hidup per periode, DUMMY.md syarat 2).
- Kode kit dummy `SIPPA-901`–`SIPPA-907`, satu per status `gudang, depot, gelar, banjir, servis, hilang, pensiun` (tiap ember status terisi, DUMMY.md syarat 4); CHECK §3.2 mencegah kode itu dipakai kit nyata.
- Periode: pengisi Log dan A/B memakai `sejak`/`sampai` yang terpampang di layar (dikirim klien), bukan hari ini (DUMMY.md syarat 1).
- Angka dari rantai: jam pompa log = `t_selesai − t_air_mengalir`; BBM = `bbmJam` dari kelas pompa kit; biaya petak = regu-hari x Rp3 juta [asumsi dummy]; sehingga layar tidak saling berselisih (syarat 3).
- A/B: lengan tidak pernah sama rata (KELAS B): `lance` n = 10 lebih baik ≥ 40% dengan CI di atas nol (LULUS), `lance_surfaktan` n = 6 (BELUM BISA DIPUTUS), `sekat_rewetting` n = 8 setara konvensional (TIDAK LULUS), konvensional n = 10.
- Satu log dummy `jam_klien_meleset = 1`; satu komponen `hilang`; satu gerak `rencana = 1` belum tiba; satu gerak antar-provinsi; alarm satu aktif satu ditutup.
- Hapus: `DELETE ... WHERE dummy = 1` dari hilir ke hulu (telemetri, alarm, laporan, petak, unggah, skenario, probe, bbm, log, gerak, tugas, komponen, foto, jalan_cek, aoi, perangkat, kit, jejak dummy). Trigger append-only mengizinkan hapus baris dummy (§3.2). Objek R2 dummy (`sippa-foto/`, `sippa-laporan/`) dihapus berdasarkan id baris dummy sebelum barisnya dihapus.
- Uji: tiap layar → isi → panggil endpoint penyuapnya → tiap kolom angka bukan nol; jalankan satu pengisi hilir tanpa hulunya → harus melapor 0 baris dan tidak tercatat (KELAS C); hapus → nol baris dummy, baris nyata utuh.

---

## 9. Keputusan teknis (ADR) dan pertanyaan terbuka

Format ringkas: Konteks, Keputusan, Opsi yang ditimbang, Konsekuensi. Status semua: **Diusulkan**, 25 Okt 2026; pemutus: sesi induk (dan pemilik untuk yang bertanda †, lewat pertanyaan PRD §2.2).

### ADR-01 Pembanding zona ketat `<` (DITERIMA, keputusan pemilik 51)

- **Konteks:** PRD §5.1 menulis `≤`, §9.12.2 menguji "2,5 dan 5,0 km masuk A"; angka buku A188/B418/C89/D170 dan A469/B158/C167/D71 berasal dari pipa_data.py:361-365 yang memakai `<`. Data memuat 4 nilai air tepat 2,50 dan 4 nilai jalan tepat 5,00.
- **Opsi:** (a) `<`: angka buku tetap, kode = data; (b) `≤`: sesuai teks PRD, angka buku berubah menjadi A189/B420/C89/D167 dan A471/B157/C167/D70.
- **Keputusan:** (a), ditetapkan pemilik sebagai keputusan 51 (KEPUTUSAN-SIPPA.md §H, 25 Okt 2026): jarak tepat 2,50 atau 5,00 km masuk kelas jauh.
- **Konsekuensi:** PRD §5.1 dan §9.12.2 dikoreksi; uji batas menjadi "2,5 km = bukan dekat air".

### ADR-02 Data turunan di R2, bukan `public/data`

- **Konteks:** keputusan 32 (staf saja); `public/` terbaca publik.
- **Opsi:** (a) R2 `sippa/` + rute bersesi (pola risiko7); (b) `public/data/sippa/` (murah, tetapi terbuka); (c) D1 (kuota tulis, ukuran baris).
- **Keputusan:** (a). **Konsekuensi:** tiap baca lewat worker (CPU kecil, aliran); unggah butuh token Cloudflare di Actions (sudah ada).

### ADR-03 Formulir dan rumus sebagai ES module yang diimpor worker

- **Konteks:** PRD meminta salinan `src/sippa_formulir.js` + skrip sinkron + uji kesamaan.
- **Opsi:** (a) salinan + uji; (b) worker mengimpor `public/pipa/formulir.js` langsung (worker.js:6 sudah melakukan ini untuk `informasi_jenis.js`).
- **Keputusan:** (b): satu berkas, tidak ada yang bisa bercabang. **Konsekuensi:** `formulir.js` tidak boleh menyentuh DOM atau global peramban; diuji di Node.

### ADR-04 Jalur aksi sebelum id

- **Konteks:** router worker.js:570-571 hanya mengenali 16 heks di ujung jalur.
- **Opsi:** (a) ubah router (berisiko untuk 40+ modul); (b) jalur `/api/sippa/gerak/:id` gaya src/inventaris.js:595.
- **Keputusan:** (b). **Konsekuensi:** tabel rute §4.3 berbeda dari PRD §9.7.3 pada tujuh jalur; `cakupan.json` memakai jalur baru.

### ADR-05 Pengalihan tamu ke `/admin/pantau?ke=`

- **Konteks:** `/admin/masuk` hanya akun admin; staf masuk di Meja Pantau.
- **Keputusan:** 303 ke `/admin/pantau?ke=<jalur>`; pantau.js meneruskan `ke` yang cocok `^/pipa(/|$)`. **Konsekuensi:** satu perubahan kecil di `public/admin/pantau.js`; tidak ada pengalihan terbuka karena hanya jalur `/pipa` yang diterima.

### ADR-06 Batas laju hanya pada tulis dan kegagalan autentikasi

- **Konteks:** PRD memberi 600/jam pada GET; tiap `laju()` = satu tulisan D1 (src/bnpb.js:17); kuota gratis 100 rb/hari bersama seluruh situs.
- **Keputusan:** GET staf tanpa laju (sesi sudah diautentikasi; pola src/inventaris.js); tulis dan tebakan kode/token dibatasi; telemetri dihitung dari tabelnya sendiri. **Konsekuensi:** staf nakal bisa membaca banyak; diterima karena staf terdaftar dan teraudit, dan CPU per GET kecil.

### ADR-07 Telemetri satu baris per pesan † (pertanyaan pemilik T-J)

- **Konteks:** PRD: satu baris per bacaan, 7.200 pesan/jam per perangkat. 20 sensor x 1/menit = 28.800 tulisan/hari per kit; tiga kit sudah melewati kuota D1 gratis.
- **Opsi:** (a) per bacaan (PRD); (b) per pesan dengan larik JSON, ringkas harian di cron; (c) R2 sebagai arsip mentah.
- **Keputusan:** (b): 1.440 tulisan per kit per hari pada interval 60 detik. **Konsekuensi:** kueri seri memakai `json_each` (baca, bukan tulis); dedupe per pesan, bukan per bacaan; di atas sekitar 30 kit bertelemetri perlu paket berbayar atau interval 5 menit.

### ADR-08 `ON CONFLICT(id) DO NOTHING`, bukan `INSERT OR IGNORE`

- **Konteks:** PRD §9.7.3 menulis `INSERT OR IGNORE`. Di SQLite, IGNORE juga menelan pelanggaran CHECK dan NOT NULL.
- **Keputusan:** upsert `ON CONFLICT(id) DO NOTHING`; pelanggaran CHECK menjadi galat yang dilaporkan sebagai `ditolak`. **Konsekuensi:** uji skema membuktikan butir melanggar CHECK tidak hilang diam-diam.

### ADR-09 Foto lewat tabel `sippa_foto`, JPEG dan WebP saja

- **Konteks:** PRD menerima PNG dan menyimpan `foto_kunci` bebas; `jenisBerkas` (src/foto.js:60-66) tidak mengenali PNG dan `bersihMedia` tidak membersihkannya.
- **Keputusan:** hanya JPEG/WebP; kunci R2 dari id server; tabel kecil memberi `prov` untuk cek wilayah dan `mime` untuk penyajian. **Konsekuensi:** kamera ponsel (JPEG) tidak terdampak; tangkapan layar PNG ditolak dengan pesan jelas.

### ADR-10 Tekanan ujung dari rating pompa dan gerbang H-RATING

- **Konteks:** PRD mengisi tekanan sisa sebagai masukan dan memeriksa H-SISA terhadapnya, sehingga H-SISA hanya menyala bila pengguna sendiri mengetik < 1 bar.
- **Keputusan:** bila pompa dipilih, `p_ujung = sisa + p_tersedia(q) − p_perlu`, dengan `p_tersedia` interpolasi titik datasheet; debit di luar rating = H-RATING keras. Tanpa pompa (`null`), perilaku PRD. **Konsekuensi:** kasus acuan PRD dijalankan dengan `pompa: null` agar angkanya tetap.

### ADR-11 Pengingat mingguan sebagai butir Meja Pantau

- **Konteks:** tabel `pengingat` punya CHECK jenis tertutup (migrations/0028_pengingat.sql:21); menambah jenis butuh bangun ulang tabel (pola 0054).
- **Keputusan:** butir terhitung `sippa_mingguan` di Meja Pantau (tanpa tabel, src/pantau.js:26-49). **Konsekuensi:** tidak ada email ringkas pengingat untuk SIPPA; staf melihatnya di antrean kerja.

### ADR-12 Cangkang tanpa berkas `.html`

- **Konteks:** berkas `.html` di `public/` dilayani tanpa CSP di host publik.
- **Keputusan:** `halamanSippa` dan `halamanSippaLapangan` sebagai string worker. **Konsekuensi:** perubahan markup cangkang lewat worker (pemilik warga-api); isi layar tetap di `public/pipa/` (sippa).

### ADR-13 Header kode `x-kode` dan `pemegangKode` apa adanya

- **Konteks:** PRD versi 1 menulis header kode khusus SIPPA (`x-kode-` + `sippa`); src/bnpb.js:26-35 sudah menyediakan pemeriksa kode dengan hitung tebakan, tetapi membaca header `x-kode`.
- **Keputusan:** pakai `x-kode` dan `pemegangKode(env, req, "sippa", cari)`. **Konsekuensi:** tidak ada kode baru untuk autentikasi; service worker memetakan jalur SIPPA ke `x-kode`.

### 9.2 Pertanyaan terbuka

Pertanyaan untuk pemilik hanya didaftar di PRD §2.2, dengan kode yang sama di semua dokumen. Yang berasal dari dokumen ini: **T-J** (telemetri satu baris per pesan, ADR-07) dan **T-K** (paket D1 berbayar sebelum telemetri > 30 kit); harga heli adalah **T-A**. Butir di bawah adalah butir teknis yang diputus sesi induk dengan bawaan tertulis (kode BT, tidak sama dengan gerbang buku T-1 sampai T-12):

| Id | Butir teknis | Bawaan yang berlaku |
| --- | --- | --- |
| BT-01 | H-SERAP/H-DALAM Studio hanya untuk keadaan ber-blok `sippa` (bukan preset S1–S3) | ya (§5.7) |
| BT-02 | Pemetaan penomoran sensor pemilik (`T03`, `GWT01`) ke tag P&ID SIPPA | `tag_datar` per perangkat diisi saat pendaftaran (§6.3) |
| BT-03 | Jarak air/jalan per sel 2,2 km dan `kab` per sel (butuh langkah GIS di `pipa_data.py`) | v1 memakai zona kompleks terdekat; kriteria pemicu sel ditunda (§3.1.2, §7.2) |
| BT-04 | Pemetaan kompleks ke KHG (`khg`) di `khg_prioritas.json` | null bila tidak ada (§7.2) |
| BT-05 | Uji tangan CSP jsPDF lokal di halaman `script-src 'self'` (jsPDF tidak boleh butuh `unsafe-eval`) | diuji di TIKET SP-037; bila gagal, render PDF di halaman terpisah ber-CSP sama dengan `laporan_karhutla_deck` |

Butir yang sudah diputus 25 Okt 2026 dan tidak lagi terbuka: debit bawaan kalkulator 300 L/min dengan 8 lance (dulu T-03; §5.3.1); ambang zona `<` (keputusan 51, ADR-01); vonis pilot (keputusan 53, §5.5.2).

### 9.3 Koreksi yang diminta pada PRD

Semua butir di bawah sudah diterapkan ke PRD.md pada penyelarasan 25 Okt 2026 (rincian di `PENYELARASAN.md`); daftar dipertahankan sebagai jejak.

1. §5.1, §9.12.2: `≤` menjadi `<` (keputusan 51, ADR-01).
1a. §9.4.6, §9.7.2, §9.9, §9.10: medan dan fungsi vonis pilot keputusan 53 (§5.5.2 dokumen ini), tahap probe `sesudah`.
2. §9.3 kasus (4) dan §6.2: head gesek DN100 10 L/s 1 km C 130 = 19,06 m, bukan "sekitar 17 m"; contoh §6.2 lengkap = TDH 55,6 m, 5,45 bar, 8,4 kW (bukan sekitar 50 m, 5 bar, 7,5 kW).
3. §9.3 kasus (1)/(2): angka 12,4 dan 6,3 bar berlaku tanpa 3,5 m hisap (12,49 dan 6,20 bar dengan C 130); dengan hisap 12,84 dan 6,54 bar.
4. §9.7.3: tujuh jalur bersarang diganti jalur aksi-sebelum-id (ADR-04); `INSERT OR IGNORE` diganti (ADR-08); header `x-kode` (ADR-13); laju GET dihapus (ADR-06); telemetri 120 pesan/jam (ADR-07).
5. §9.1.2: tamu ke `/admin/pantau?ke=` (ADR-05); `PUBLIK_TANPA_SESI` tidak berubah (§1.4).
6. §9.7.2: kolom `foto_kunci` diganti `foto_id` + tabel `sippa_foto` (ADR-09); kolom `prov` tambahan; `sippa_perangkat.jenis` + `gateway`, `token_sha` boleh null untuk sensor; `sippa_telemetri` bentuk per pesan.
7. §9.9: `src/sippa_formulir.js` dihapus (ADR-03); PNG tidak diterima (ADR-09).
8. §5.4: `bara_regu` tengah dibaca dari `operasi.json` (saat ini 1,0), bukan 1,2.
9. §9.10: pengingat mingguan = butir Meja Pantau (ADR-11).
10. §9.12.1: `milik` agent `sippa` tanpa `docs/sippa/**`.
