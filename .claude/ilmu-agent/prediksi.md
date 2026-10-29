# Ilmu prediksi

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/prediksi.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca prediksi`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus prediksi "..."`.

## Peta berkas & tabel

Alur: `catat.py` (bekukan) -> `nilai.py` (nilai) -> `kalibrasi.py` -> `terbit.py` (gabung) -> layar. Python stdlib; tiap skrip punya `uji` (tanpa jaringan) di `__main__`.

| Berkas | Isi |
| --- | --- |
| `scripts/prediksi/dasar.py` | Pustaka bersama: jalur, `kab()` (514 kab/kota dibaca dari `scripts/udara/kota.json`, milik cuaca-udara, JANGAN dibuat ulang), `kunci()` pencocok nama, arsip append-only, unduh Open-Meteo lewat `umum.ambil` (milik banjir). `KODE = HJN API BNJ LSR ASP ROB`, `TENGGANG = 3` |
| `scripts/prediksi/catat.py` | Membekukan prakiraan hari ini per kode untuk H+1..H+3 ke `public/prediksi/data/arsip/YYYY-MM.jsonl`. HJN dari Open-Meteo (100 lokasi per panggilan) + peluang dari ansambel ECMWF (`public/banjir/data/hujan_ansambel.json`); API dari `titik_hari` + `fwi_ansambel.json`; BNJ/LSR dari `banjir/data/status.json` + `prakiraan72.json`; ASP dari CAMS `udara/data/prakiraan.json`; ROB dari `banjir/data/rob.json`. Masukan hilang = kode dilewati dan dicatat di log |
| `scripts/prediksi/nilai.py` | Menilai prakiraan matang lawan pengamatan (`amatan/<KODE>.json`): HJN sementara = analisis model, final (>= H+6) = ERA5 Archive; API = FIRMS sedang/tinggi, matang H+1; BNJ/LSR = DIBI (hanya sasaran <= DIBI `sampai` - 14 hari). ASP dan ROB berstatus "menunggu". Keluaran `skor.json`, `pasangan.json`, `ujibalik.json` (perintah `ujibalik [n]`) |
| `scripts/prediksi/kalibrasi.py` | Regresi isotonik (PAV) per (kode, ambang, tenggang) dan rasio bias provinsi untuk jumlah hujan, keluaran `kalibrasi.json` |
| `scripts/prediksi/terbit.py` | Gabung arsip terakhir + kalibrasi + skor + `aturan.json` + dampak (penduduk, bahaya, sekolah, fasilitas, DIBI) menjadi `public/prediksi/data/prediksi.json` |
| `scripts/prediksi/aturan.json` | Aturan "jika ini maka ini" (banjir, longsor, karhutla, asap, melaut nonaktif), tiap syarat menyebut sumber ambangnya; konstanta Sphere 2018 |
| `public/prediksi/index.html`, `prediksi.js`, `prediksi.css` | Layar: tab Besok (kartu per kab), Rapor (skor vs baseline), Konfirmasi (POST `/api/prediksi/konfirmasi`, route milik warga-api, uji `tests/warga/prediksi_konfirmasi.test.mjs`). Memakai `$`, `fmt`, `esc` dari `../inti/format.js` |
| `public/prediksi/data/*.json` | `prediksi.json`, `skor.json`, `pasangan.json`, `kalibrasi.json`, `ujibalik.json`, `lalu.json`, `arsip/`, `amatan/` |

Belum ada workflow `/prediksi` dan belum ada `tests/prediksi/`: jadwal harian yang memanggil keempat skrip adalah usulan ke mekanik-mesin, uji tertarget ke penulis-gerbang.

## Aturan & invarian

- Arsip `arsip/*.jsonl` APPEND-ONLY: baris tidak pernah diubah atau dihapus; satu baris per (tanggal terbit, kode); jalan ulang di hari yang sama tidak menimpa (prakiraan pertama yang dinilai). Arsip lokal lebih pendek/berbeda dari git HEAD = keluar kode 3; baris bukan JSON = berhenti, tidak ditimpa.
- Prospektif jujur: prakiraan dibeku SEBELUM kejadian. n < 30 pasangan = "belum teruji"; "mengalahkan baseline" hanya bila Brier model lebih kecil dari persistensi DAN klimatologi pada pasangan yang ketiganya ada.
- Kalibrasi fail-closed: dicoba hanya bila fit >= 30 pasangan, >= 14 tanggal, uji (14 tanggal terakhir) >= 30 pasangan; "dipakai" hanya bila Brier uji turun, selain itu layar tetap memakai peluang mentah. HJN sementara tidak dipakai untuk kalibrasi. Kriteria terkunci model lain (PRAREG-PROSPEKTIF, KRITERIA_SHA256) tidak disentuh.
- Peluang hujan m=0 (tanpa ansambel) adalah skor kasar `DET` dari jumlah deterministik dan diberi pil "skor kasar"; jangan disebut peluang terkalibrasi.
- Kunci nama lintas berkas dicocokkan lewat `kota.kunci()`, bukan kode: kode DIBI beda dari Kepmendagri (169 dari 461 beda).
- Angka di layar: peluang dibulatkan ke 5% (`<5%`, `>95%`), format id-ID, tiap kartu menyebut sumber dan tanggal terbit; dampak dan kebutuhan Sphere berlabel perkiraan. Tanpa titik tengah "·" sebagai pemisah teks baru (aturan pemilik), angka kunci dulu.
- Aturan dampak: syarat tanpa data (gambut, gelombang) ditandai catatan/`aktif: false`, bukan dikarang.

## Ranjau yang pernah meledak

- Kode DIBI berbeda dari kode Kepmendagri; mencocokkan lewat kode menghasilkan salah kab diam-diam.
- DIBI terisi susulan: menilai BNJ/LSR tanpa margin 14 hari menghitung "tidak ada kejadian" palsu; label ditunda ("menunggu label").
- HJN "sementara" dinilai terhadap analisis model Open-Meteo, bukan observasi; jangan dicampur dengan "final" ERA5 di satu skor.
- ASP tidak boleh dinilai dengan CAMS sendiri (sirkular) dan ROB belum punya seri harian; keduanya "menunggu" sampai ada sumber.
- `dasar.py` mengimpor `kota`, `umum`, `wilayah` dari `scripts/udara` dan `scripts/banjir` lewat `sys.path`; perubahan nama fungsi di sana mematahkan /prediksi tanpa kabar. Genangan Jakarta sidik membekukan `umum.py` sampai Apr 2027.
- Kuota Open-Meteo: 6 panggilan HJN per hari, `KuotaHabis` harus ditangani, bukan diulang.

## Gerbang yang menghakimi

- Tiap skrip `python3 scripts/prediksi/<catat|nilai|kalibrasi|terbit>.py uji` (self-check tanpa jaringan).
- `node --test tests/warga/prediksi_konfirmasi.test.mjs` untuk route konfirmasi (worker utuh di workerd + D1 lokal).
- `npm run uji:agen`: tiap berkas satu pemilik (glob prediksi di roster).
- Pemeriksa: `selera-angka` untuk kartu/angka layar, `inp-reviewer` untuk klik tab/konfirmasi, `validasi-model` untuk perubahan skor, kalibrasi, baseline.

## Kasus
