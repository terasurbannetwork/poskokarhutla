# Ilmu cuaca-udara

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/cuaca-udara.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca cuaca-udara`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus cuaca-udara "..."`.

## Peta berkas & tabel

Wilayahmu: `scripts/cuaca/**`, `scripts/udara/**`, `public/cuaca/**`, `public/udara/**` (belum ada kode per 16 Okt 2026). Bahan yang sudah ada, milik `pipa-data` (baca, jangan sunting; usul perubahan ke pemiliknya):
- `scripts/data/posko.py`/peringatan BMKG -> `public/data/peringatan.json`: `nowcast` (CAP BMKG, `https://www.bmkg.go.id/alerts/nowcast/id`, field `event`, `severity`, `urgency`, area) dan `gelombang` (`maritim.bmkg.go.id/.../warnings.json`). Lisensi: cantumkan BMKG.
- `scripts/data/asap.py` -> `public/data/asap.json`: CAMS (Copernicus) via Open-Meteo Air Quality, grid 1 derajat, 4 hari, kolom `pm25_maks`, `pm25_rata`, `pm10_maks`, `co_rata`, `co_maks`, `aod_maks`.
- `scripts/data/cuaca_jam.py`, `scripts/data/ansambel.py`, `scripts/banjir/hujan.py` + `ansambel_hujan.py` (milik `banjir`): hujan Open-Meteo dan ensemble.
- `public/data/metar.json` (visibilitas, `wx`, `asap` dari METAR bandara), `public/data/iklim.json` (ENSO/IOD NOAA CPC + BoM), `public/data/penduduk.json` untuk jiwa terpapar.
- ISPU KLHK belum ada di repo; periksa dulu aksesnya, bila tak bisa diakses dibuang (A18).

## Aturan & invarian

- Halaman meniru karhutla persis (pemilik: "Gw mau sama persis semua"): kepala dari `public/inti/kepala.js` (menu bencana dari registry), peta MapLibre 4.7.1 dengan lapisan `public/inti/peta/lapis.js`, legenda dock bawah `public/inti/peta/legenda.js`, kartu Insight `public/inti/kartu.js` (`Kartu.ex/pil/hl/seg`), tooltip `public/inti/tip.js`, tabel `public/inti/tabel.js`, format angka `public/inti/format.js`. Contoh hidup paling dekat: `public/banjir/` (peta.js, insight.js, tren.js, mulai.js) dan `public/gempa/`. Jangan menyalin mesin kartu dari `public/index.html` (gerbang `tanpa-salin`).
- Aturan tampilan A1-A25 di `docs/multi-bencana/RENCANA-20-JAM.md` §1: tanpa teks penjelas/subjudul, sebaris, label = pil berwarna + ikon SVG garis, kartu ala Insight dengan kalimat temuan berangka merah + grafik + "Sumber:", angka tertulis di grafik, tabel standar (kepala gelap, urut, paginasi), pop-up lebar, bahasa awam, data kosong dibuang, bagikan = ikon, sapaan "kamu", em dash dilarang di teks tampil, format Indonesia (koma desimal, titik ribuan).
- Status registry di `public/bencana.json` (milik inti-layar): `mati` = tanpa rute, `uji` = rute hidup + menu "Segera", `aktif` = dibuka publik. Yang mengubah status adalah sesi induk sesudah verifikasi; pengerja cukup menyiapkan halaman.
- Pipeline Python 3.12 stdlib saja, UA peramban penuh, simpan atomik (`scripts/umum/simpan`), keluaran CI ke `public/data/`, berkas statis yang di-commit ke `public/<bencana>/data/`. Tidak ada workflow baru: token tanpa scope `workflow`; langkah baru dirantai di akhir skrip yang sudah dipanggil workflow (pola `scripts/banjir/posko.py` `__main__`).
- Status resmi lembaga tampil apa adanya berlabel lembaga dan jam terbit; deteksi sendiri berlabel "Deteksi Pantau Bencana". Tanpa pernyataan resmi tidak pernah ditulis "aman".

## Ranjau yang pernah meledak

- Sumber data lembaga belum diuji ke respons live untuk modul cuaca dan udara. Pelajaran gempa (16 Okt): dokumen SUMBER-DATA pernah salah soal isi endpoint BMKG; selalu curl dulu dan cek isi nyatanya sebelum menulis pengurai.
- Push yang menyentuh `.github/workflows/**` ditolak (token tanpa scope workflow); berkas baru tanpa pemilik di roster menggagalkan `uji:agen`.
- Berkas `* 2.*` adalah salinan nyasar sinkronisasi: jangan disunting atau dipakai.

## Gerbang yang menghakimi

- `python3 scripts/<modul>/<skrip>.py uji` (self-check `__main__`) untuk tiap skrip pipa.
- `npm run uji:agen` sesudah `git add` (gerbang pemilik membaca berkas terlacak saja), `npm run bencana:cek` bila registry tersentuh.
- Layar dibuktikan di browser preview (`.claude/launch.json` konfigurasi `lokal`, port 8788) pada lebar 1440 dan 390, konsol bersih; pemeriksa: `selera-angka`, `inp-reviewer`, `security-reviewer` bila menyisipkan teks dari lembaga.
- Kamu tidak memverifikasi kerjamu sendiri (AGENTS.md §3.2); tidak commit, tidak push, tidak menyunting `.github/workflows`.

## Kasus
