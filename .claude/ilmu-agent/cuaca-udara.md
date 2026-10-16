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
- 2026-10-16 · 16 Okt: halaman /cuaca/ dibangun di atas public/inti plus CSS banjir (gaya, peta, tabel, insight) yang ditautkan langsung. Keluaran pipeline HARUS di public/banjir/data (cuaca_meta.json, cuaca_prakiraan.json): banjir.yml menjalankan 'checkout FETCH_HEAD -- . :!public/banjir/data' dan hanya meng-commit folder itu, jadi berkas di public/cuaca/data atau public/data ditimpa/tak terbit. Cara tahu: baca langkah Terbitkan di banjir.yml. Rantai cuaca.py ada di akhir posko.py (main), tanpa menyunting workflow.
- 2026-10-16 · Gambar hujan/angin di MapLibre pakai sumber type=canvas (play(); pause() untuk segarkan), bukan image url data: (CSP report-only connect-src mencatat pelanggaran di konsol). Peringatan nowcast hanya hidup beberapa jam: saring selesai > sekarang di klien; ?sekarang=ISO menguji dengan data lama. Status registry 'uji' memerlukan gerbang-bencana.test.mjs (hanya mengizinkan banjir uji) diperbarui oleh penulis-gerbang; sumber_status dengan ambang jam membuat uji:warga merah bila fixture tak menyetubnya, jadi dipakai null.
- 2026-10-16 · Halaman /udara/ (16 Okt): gerbang bencana.py cek menuntut untuk status non-mati folder public<data> ada, data unik, workflow ada; jadi udara data=/udara/data/ (meta.json penunjuk) dan workflow=data.yml, keluaran nyata di public/data/udara_kualitas*.json karena CI hanya git add public/data. kepala.js membuang bencana tanpa IKON (udara belum) sehingga judul menu jatuh ke Karhutla: halaman memulihkan markup statis lewat MutationObserver sampai IKON.udara ditambah di inti. CSS uppercase mengubah satuan jadi MG/M3: bungkus dengan text-transform:none. CAMS global berlebihan di kota (Jakarta rata 24 jam 162 ug/m3, 120 jt jiwa tidak sehat): angka selalu berlabel perkiraan model. Status uji membuat 2 tes tests/agen/gerbang-bencana.test.mjs merah (mengharap udara mati). Preview: playwright dari ~/.npm/_npx dan wrangler dev --local :8788.
- 2026-10-16 · Zoom awal cuaca/udara sama dengan banjir (3,32 di 1440, terkunci minZoom 3 di 390): BB_ID Indonesia dibatasi lebar. kiriPad harus salinan banjir (pakai #dok). Segmen: set aria-pressed langsung lalu nanti(), jangan renderHari() ulang.
- 2026-10-16 · OpenAQ: v3 API 401 tanpa kunci, v1/v2 410; arsip S3 openaq-data-archive publik tapi hanya per locationid (tak ada daftar stasiun Indonesia tanpa API), jadi koreksi bias tak bisa dibangun tanpa kunci/daftar id. Angka jiwa udara selalu dibulatkan (jiwa/kr di app.js) + pil PIL_MODEL; udara_kualitas.json punya status_validasi. dampak.js karhutla punya kalimat jiwa udara sendiri (bukan dari berkas ini).
