# Ilmu gunungapi-kering

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/gunungapi-kering.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca gunungapi-kering`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus gunungapi-kering "..."`.

## Peta berkas & tabel

Wilayahmu: `scripts/gunungapi/**`, `scripts/kekeringan/**`, `public/gunungapi/**`, `public/kekeringan/**` (belum ada kode per 16 Okt 2026). Bahan yang sudah ada, milik `pipa-data` (baca, jangan sunting):
- `scripts/data/tanah.py` -> `public/data/tanah.json`: kelembapan tanah kisi 0,5 derajat, `sm0`/`sm1` (0-7 cm, 7-28 cm) dari ECMWF IFS 0,25 via Open-Meteo, persentil `pct0`/`pct1` terhadap ERA5-Land 2015-2025 dasarian yang sama.
- `scripts/data/iklim.py` -> `public/data/iklim.json`: ONI/RONI, status ENSO NOAA CPC, IOD; `scripts/data/musim.py` -> `musim.json` (pola dasarian).
- `scripts/data/fwi.py` -> `fwi.json` (Drought Code, kode kekeringan FWI), `public/data/penduduk.json`.
- Gunung api: belum ada pipa. Sumber yang direncanakan: MAGMA Indonesia PVMBG (status Level I-IV per gunung, VONA), GDACS sebagai cadangan, KRB (kawasan rawan bencana) PVMBG bila lisensinya jelas. Periksa akses live dulu; yang tak bisa diakses dibuang.
- Hari tanpa hujan (HTH) dan SPI BMKG: periksa akses; bila tidak ada, hitung SPI dari hujan Open-Meteo/ERA5 dengan label "Deteksi Pantau Bencana".

## Aturan & invarian

- Halaman meniru karhutla persis (pemilik: "Gw mau sama persis semua"): kepala dari `public/inti/kepala.js` (menu bencana dari registry), peta MapLibre 4.7.1 dengan lapisan `public/inti/peta/lapis.js`, legenda dock bawah `public/inti/peta/legenda.js`, kartu Insight `public/inti/kartu.js` (`Kartu.ex/pil/hl/seg`), tooltip `public/inti/tip.js`, tabel `public/inti/tabel.js`, format angka `public/inti/format.js`. Contoh hidup paling dekat: `public/banjir/` (peta.js, insight.js, tren.js, mulai.js) dan `public/gempa/`. Jangan menyalin mesin kartu dari `public/index.html` (gerbang `tanpa-salin`).
- Aturan tampilan A1-A25 di `docs/multi-bencana/RENCANA-20-JAM.md` §1: tanpa teks penjelas/subjudul, sebaris, label = pil berwarna + ikon SVG garis, kartu ala Insight dengan kalimat temuan berangka merah + grafik + "Sumber:", angka tertulis di grafik, tabel standar (kepala gelap, urut, paginasi), pop-up lebar, bahasa awam, data kosong dibuang, bagikan = ikon, sapaan "kamu", em dash dilarang di teks tampil, format Indonesia (koma desimal, titik ribuan).
- Status registry di `public/bencana.json` (milik inti-layar): `mati` = tanpa rute, `uji` = rute hidup + menu "Segera", `aktif` = dibuka publik. Yang mengubah status adalah sesi induk sesudah verifikasi; pengerja cukup menyiapkan halaman.
- Pipeline Python 3.12 stdlib saja, UA peramban penuh, simpan atomik (`scripts/umum/simpan`), keluaran CI ke `public/data/`, berkas statis yang di-commit ke `public/<bencana>/data/`. Tidak ada workflow baru: token tanpa scope `workflow`; langkah baru dirantai di akhir skrip yang sudah dipanggil workflow (pola `scripts/banjir/posko.py` `__main__`).
- Status resmi lembaga tampil apa adanya berlabel lembaga dan jam terbit; deteksi sendiri berlabel "Deteksi Pantau Bencana". Tanpa pernyataan resmi tidak pernah ditulis "aman".

## Ranjau yang pernah meledak

- Sumber data lembaga belum diuji ke respons live untuk modul gunung api dan kekeringan. Pelajaran gempa (16 Okt): dokumen SUMBER-DATA pernah salah soal isi endpoint BMKG; selalu curl dulu dan cek isi nyatanya sebelum menulis pengurai.
- Push yang menyentuh `.github/workflows/**` ditolak (token tanpa scope workflow); berkas baru tanpa pemilik di roster menggagalkan `uji:agen`.
- Berkas `* 2.*` adalah salinan nyasar sinkronisasi: jangan disunting atau dipakai.

## Gerbang yang menghakimi

- `python3 scripts/<modul>/<skrip>.py uji` (self-check `__main__`) untuk tiap skrip pipa.
- `npm run uji:agen` sesudah `git add` (gerbang pemilik membaca berkas terlacak saja), `npm run bencana:cek` bila registry tersentuh.
- Layar dibuktikan di browser preview (`.claude/launch.json` konfigurasi `lokal`, port 8788) pada lebar 1440 dan 390, konsol bersih; pemeriksa: `selera-angka`, `inp-reviewer`, `security-reviewer` bila menyisipkan teks dari lembaga.
- Kamu tidak memverifikasi kerjamu sendiri (AGENTS.md §3.2); tidak commit, tidak push, tidak menyunting `.github/workflows`.

## Kasus
- 2026-10-16 · MAGMA (16 Okt 2026) tanpa API, tapi HTML publik bisa dibaca: /v1/gunung-api/tingkat-aktivitas (69 gunung per level + tautan laporan bertanda tangan), laporan harian (koordinat, radius dari kalimat 'radius N km', judul periode ada di <title> bukan di slim-mainpanel; ketinggian bisa negatif untuk Hobal), informasi-letusan (halaman 1 hanya ±8 jam bila Ibu/Semeru ramai). GVP 403, KRB tanpa lisensi: dibuang. Server MAGMA lambat (2-25 dtk/permintaan): lari pertama 13 menit, berikutnya hanya level>=II. Skrip dengan heredoc python di Bash sempat ditolak pagar worktree: tulis ke berkas dulu. Jangan taruh skrip bantu bernama html.py di folder yang jadi cwd python.
