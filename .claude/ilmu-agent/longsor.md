# Ilmu longsor

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/longsor.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca longsor`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus longsor "..."`.

## Peta berkas & tabel

STATUS: `scripts/longsor/`, `public/longsor/`, `tests/longsor/` BELUM ADA (dicek `ls`). Modul ini dibangun dari bahan yang sudah ada di repo; jangan unduh ulang yang sudah dipanen.

Bahan yang sudah ada (semua dicek ada):

| Berkas | Isi / kolom | Pemakaian untuk longsor |
| --- | --- | --- |
| `scripts/banjir/bahaya.py` -> `public/banjir/data/bahaya.json` | kunci `kec` = `"kodeprov|kab|kec"` (nama, bukan kode kab) -> `{banjir, bandang, longsor, kering, gelombang}` 0-1; lapisan InaRISK `layer_bahaya_tanah_longsor` (ImageServer gis.bnpb.go.id), nilai = maks 10 titik per kecamatan | kerentanan statis per kecamatan (pengganti sementara lereng/tanah/sesar LHASA) |
| `scripts/banjir/hujan.py` -> `public/banjir/data/hujan.json` | kisi 0,25 derajat darat; kunci `sel, hari, hari_ini, grid`; per sel `h` (10 nilai harian, 3 hari lalu .. +6), `a7` (jumlah 7 hari teramati), `h3`, `sm` (lembap tanah 3-27 cm) | hujan 7 hari dan lembap tanah; JANGAN panggil Open-Meteo lagi |
| `scripts/banjir/ansambel_hujan.py` -> `hujan_ansambel.json` | peluang hujan lebat ECMWF IFS 51 anggota, 349 titik per kotak 1 derajat | peluang ke depan |
| `scripts/banjir/riwayat.py` -> `riwayat.json`, `riwayat_grid_longsor.json` | indeks historis longsor DIBI x bahaya InaRISK, `BOBOT["longsor"]`; skor kec = skor kab x (0,4 + 0,6 x bahaya) | pembanding klimatologi/kekerapan |
| `scripts/banjir/kejadian.py` -> `public/banjir/data/kejadian.json` | DIBI per prov/kab (`kejadian_dibi`, `kab_tak_cocok`); `JENIS`, `DIBI_JENIS`: "Tanah Longsor", "Gerakan Tanah" -> longsor; "Banjir dan Tanah Longsor" dihitung ke banjir DAN longsor | label kejadian (tingkat kabupaten) |
| `scripts/umum/dibi_kejadian.py` -> `public/data/dibi_kejadian.json` | 365 hari, baris `{tanggal, jenis, prov_kode, prov, kab_kode "73.17", kab, kejadian, meninggal, hilang, ...}`; jenis longsor: "Tanah Longsor", "Gerakan Tanah", "Banjir dan Tanah Longsor" | label harian per kabupaten; panen DIBI lewat `superset()` milik kejadian.py |
| `scripts/banjir/uji_balik.py`, `scripts/bnpb/ujibalik_risiko.py` | `{pod, far, csi, pss, ets}` (uji_balik.py ~baris 199); uji balik indeks risiko vs DIBI | cetakan untuk uji balik longsor |
| `scripts/cuaca/gerakan_tanah_pu.py` -> `public/cuaca/data/gerakan_tanah_pu.json` | infrastruktur PUPR di zona potensi gerakan tanah tinggi (prakiraan bulanan Badan Geologi, sigi.pu.go.id, UA jujur, jeda 1,2 dtk); `jenis[{nama,kel,n}]`; pemilik `cuaca-udara`; layar `public/cuaca/rawan.js` | konteks saja: zona prakiraan, BUKAN kejadian |
| `public/geo/kecamatan/<kodeprov>.json`, `public/geo/kabupaten/<kodeprov>.json` | fitur dengan properti hanya `{kab, kec}` / `{kab}` (TANPA kode kab) | batas kec; `scripts/banjir/wilayah.py` (`PROVINSI`, `_di_dalam`, titik-dalam-poligon) |
| `scripts/banjir/umum.py` | `ambil, simpan, baca, grid_darat, per_lokasi` | pakai ulang, jangan tulis ulang HTTP/tulis-berkas |

Rencana keluaran: `public/longsor/data/*.json` (agregat per kecamatan/kab: skor harian, ambang P95 hujan, uji balik). Skrip di `scripts/longsor/`, uji `tests/longsor/`. Raster besar (SoilGrids, DEM) hanya di lab (`.github/workflows/lab.yml`) atau lokal; yang di-commit agregat per kec.

## Aturan & invarian

- Python stdlib saja di pipeline produksi (urllib via `scripts/banjir/umum.py`); tanpa numpy/GDAL di workflow harian.
- Hanya agregat yang di-commit (per kecamatan/kab/sel), bukan raster atau dump DIBI mentah.
- Hujan dari `hujan.json` / `hujan_ansambel.json`; IMERG/CHIRPS hanya bila sudah dipanen repo (cek `ls public/*/data` dulu).
- Rumus gaya LHASA: kerentanan (lereng, tanah/Curve Number, sesar) x hujan 7 hari di atas P95 klimatologi setempat. Angka yang tidak teruji uji balik diberi pil hipotesis, bukan disembunyikan (preseden kekeringan).
- Kode wilayah lintas sistem BERBEDA: DIBI memakai `kab_kode` bertitik ("73.17") dan `id_kab_bps` (Papua kode lama), InaRISK/IRBI memakai kode IRBI, geo repo TANPA kode kab. Cocokkan lewat NAMA kab/kec dalam provinsi (seperti `bahaya.json` kunci `prov|kab|kec`, `kejadian.py` `kab_tak_cocok`, `profil_wilayah.py` pemetaan kode BPS -> IRBI; contoh bentrok: 3171 = Jakarta Selatan di BPS tapi Jakarta Pusat di IRBI). Jangan menggabung dengan kode.
- DIBI hanya sampai kabupaten: label kecamatan tidak ada; satuan uji = kabupaten (skor kab = kecamatan tertinggi), tulis batas ini di keluaran.
- "Banjir dan Tanah Longsor" dihitung di kedua jenis; jangan dihitung ganda saat menyusun label gabungan.
- Tanpa jadwal per menit; workflow hanya usulan ke `mekanik-mesin` (`.github/workflows` bukan wilayahmu).

## Ranjau yang pernah meledak

- Katalog NASA Global Landslide Catalog dan data vsi.esdm.go.id (PVMBG): robots.txt ESDM melarang bot, JANGAN panen vsi.esdm.go.id. Pakai InaRISK, DIBI, dan prakiraan zona via PUPR sigi saja.
- InaRISK raster hanya bernilai di zona bahaya, di luar zona kosong (dicatat 0): satu titik pusat sering meleset, makanya `bahaya.py` mengambil maks 10 titik; kec besar (Papua, Kalimantan) mungkin tetap terlewat.
- Indeks InaRISK dibangun dari data historis: independensi dari DIBI tidak terjamin (kebocoran tak langsung); tulis di uji balik (lihat docstring `scripts/bnpb/ujibalik_risiko.py`).
- Citra optik (MODIS/Sentinel-2) bisa tertutup awan di musim hujan, saat longsor paling sering: jangan jadikan label atau fitur harian tanpa penanganan awan.
- Berkas `* 2.*` (mis. `gerakan_tanah_pu 2.py`, `bangun_pu 2.py`) salinan nyasar sinkronisasi: jangan dipakai.
- Skrip `scripts/banjir/bahaya.py` bilang "scripts/data/bahaya.py" di docstring; jalur sebenarnya `scripts/banjir/`.
- Kuota Open-Meteo: sumber sudah dipakai ~2.930 panggilan/hari oleh hujan.py; jangan menambah panggilan.
- Event longsor langka dan tak seimbang: FAR/PSS tak bermakna bila dasar terlalu kecil (lihat catatan uji_balik.py).

## Gerbang yang menghakimi

- `npm run uji:agen` (`tests/agen/gerbang-ilmu-agent.test.mjs`): ilmu longsor harus terisi (>= 2000 karakter, tanpa penanda kerangka), tiap berkas kode satu pemilik.
- Uji balik jujur: pembagian waktu (latih lalu uji, tanpa bocor), pembanding klimatologi/kekerapan (`riwayat.json`) dan tebakan naif, metrik `pod, far, csi, pss, ets` dari `uji_balik.py` plus AUC; tulis LOLOS atau GAGAL apa adanya.
- Pemeriksa wajib: `validasi-model` (model/uji balik), `selera-angka` (angka di layar), `higiene-repo` sebelum commit besar.
- Self-check: `python3 scripts/longsor/<skrip>.py uji`, uji node `node --test tests/longsor/*.test.mjs`.

## Kasus
