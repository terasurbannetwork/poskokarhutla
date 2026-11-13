# Paparan Karhutla Provinsi Papua Selatan 291026

Per 29 Oktober, cut-off 29 Okt 2026 24.00 WIB (hari 29 Okt penuh), jendela 22–29 Okt. Satu pembangun, dua pola:

- `python3 buat.py ref/j221026.pptx keluar.pptx`: pola paparan Jambi 241026, 4 slide (provinsi, Kab. Merauke, Jagebob–Tanah Miring,
  banjir dan longsor 30 Okt–2 Nov).
- `python3 buat.py ref/j221026.pptx keluar-3d.pptx --3d`: pola paparan Jambi 251026, 2 slide (provinsi dengan peta 3D miring dan slot
  foto, lalu banjir dan longsor).

Templat: deck pemilik "Paparan Karhutla Jawa Timur - Malang - Arjuno 221026.pptx" (`ref/j221026.pptx`). Pembangun Jambi dan Lampung
memakai versi 231026 yang tidak ada di mesin ini. Posisi bloknya sama, jadi jangkar teks memakai teks 221026, dan tabel kab/kota digambar
ulang dari blok prototipe (221026 masih punya kolom persen). Hasilnya dicocokkan dengan deck Jambi 241026 yang dipaparkan
("Paparan Karhutla Provinsi Jambi 241026.pptx/.pdf"): legenda cluster, judul panel slide 3 tanpa angka, kronologi tanggal + pil, label
alur api di peta kawasan (`alur.json`, posisi piksel tangan seperti Jambi), judul slide 4 "Waspada peralihan musim".

Sumber angka (semua titik, luas, belum padam = data kita). Mesin ini tidak punya `FIRMS_MAP_KEY`, jadi `generator/satelit.py` tidak
dipakai; semua angka dari berkas situs live di `web/` (dibuat situs 30 Okt 11.28–11.29; ditarik ulang 14.45, isinya sama persis).
Rincian per angka ada di docstring `angka.py`.

- Titik provinsi dan kab/kota 22–29 Okt: `harian30.json`, angka tabel dan tren halaman utama situs, sama dengan deck Jambi 241026.
  `peta_karhutla.json` memakai definisi yang sama tetapi selisih 0–53 titik per hari (29 Okt: 744 lawan 742), jadi tidak dipakai untuk titik.
- Titik kecamatan: `hotspot.json` kolom `hitung` (sumber tren kecamatan di situs). Berkas ini hanya memuat sekitar 7 x 24 jam, jadi semua
  angka kecamatan (daftar kecamatan, bar komposisi, grafik koridor, peta titik) berjendela 24–29 Okt. Jumlah kecamatan per kab per hari
  diassert sama dengan `harian30.json`.
- Luas, belum padam, padam: `peta_karhutla.json` (provinsi, kumulatif 1 Jan–29 Okt) dan `peta_karhutla_wil.json` (kab/kota, kecamatan).
  Tiap wilayah dibulatkan sendiri, jadi jumlah belum padam kab (501 ha) bisa beda 1 ha dari provinsi (502 ha); deck Jambi juga begitu.
- Cluster: `kluster_hari/2026-10-29.json`, keadaan akhir 29 Okt (956 aktif: Prioritas 2, Siaga 321, Patroli 549, Rutin 84).
  `kluster_awal.json` adalah keadaan 30 Okt pagi (905 aktif, Prioritas 6) dan tidak sesuai cut-off; ID cluster juga berganti tiap jalan.
  Arsip hanya menyimpan pusat cluster level >= 1, jadi Rutin tidak digambar di peta; kab/kec diturunkan dengan `Wilayah`, label lahan
  dengan logika `penanggung()` `scripts/data/harian.py` (divalidasi sama dengan 158/158 label `kluster_awal`).
- Banjir: `banjir/status.json` (30 Okt–2 Nov; berkas hanya memuat kecamatan berstatus, penyebutnya 80 kecamatan dari `public/geo`) dan
  `banjir/riwayat.json` (DIBI BNPB, Papua Selatan hanya 6 banjir 2008–2025). Kartu "peluang hujan" tidak dipakai: laphar OMC hanya
  menyebut kelas peta "potensi tinggi > 70%", bukan nilai untuk Papua Selatan.
- Slide 3 tetap koridor Jagebob–Tanah Miring (keputusan pemilik 30 Okt): separuh belum padam provinsi 29 Okt ada di empat
  kecamatannya. Alternatif Pulau Kimaam (cluster Prioritas Kontuar, 143 ha belum padam) tidak dipakai.
- Pulau Kimaam di bar komposisi slide 2 = titik di dalam bagian pulau poligon Kab. Merauke (1.770), bukan jumlah lima distriknya
  (Kimaam, Kontuar, Waan, Tabonji, Padua = 2.079), karena Kec. Kimaam juga punya wilayah di daratan seberang Selat Muli.
- Kronologi slide 3 tidak memakai "9 Okt api mulai" dan "12 distrik" laphar: Merauke sudah 23.217 titik pada 1–8 Okt, dan Distrik
  Subur di daftar laphar menurut geometri ada di Boven Digoel. Puncak koridor tahun ini (7 Okt, 1.349 titik) dari `peta_karhutla_wil.json`.
- Catatan kaki slide 1–3 menyebut 24 Okt sebagai hari `celah` di `peta_karhutla.json` (sebagian lintasan satelit hilang di FIRMS).
  Catatan kaki slide banjir menyebut sumbernya sendiri (sistem banjir dari prakiraan Open-Meteo, DIBI, BMKG), bukan FIRMS.
- Verifikasi 30 Okt: subagent konteks bersih menghitung ulang ±390 butir dari berkas mentah; tidak ada angka salah, 14 catatan
  klaim/konteks yang sudah diperbaiki di atas. Sisa yang disengaja: Rutin (84) tidak digambar, foto slot 3D tetap Sebangau 2019
  (tidak ada foto Papua di aset), tiga kecamatan teratas Asmat memakai urutan berkas saat Atsj dan Ayip sama-sama 62,7 mm.
- Fakta lapangan selain luas: Laphar Dit. Koordalops 28 Okt entri 3 (Merauke: mulai 9 Okt, 12 distrik/17 kampung, Tanggap Darurat
  14–28 Okt, OMC Lanud J.A. Dimara hari ke-6 = 27 Okt, hujan 3,2 mm 26–27 Okt, jarak pandang 27 Okt, unsur dan sarpras), rekap WA
  Koordalops 29 Okt, WA Satgas 28–29 Okt, WA BMKG 29 Okt (periode 27–29 Okt). Luas lapangan "±63 ha (pendataan)" tidak dipakai.

Bangun ulang (data web ditarik dari situs live ke `web/`; Playwright lewat `PLAYWRIGHT_MJS` bila paket `playwright` tidak ada di repo):

    for f in harian30 kluster_awal peta_karhutla peta_karhutla_kab peta_karhutla_wil hotspot; do curl -sf -o web/$f.json https://centurisk97.id/data/$f.json; done
    curl -sf -o web/kluster_hari_2026-10-29.json https://centurisk97.id/data/kluster_hari/2026-10-29.json
    for f in status riwayat; do curl -sf -o web/banjir/$f.json https://centurisk97.id/banjir/data/$f.json; done
    python3 angka.py && python3 data.py && python3 peta.py && node ikon.mjs
    node render.mjs peta-papsel.svg peta-papsel.png peta-kawasan.svg peta-kawasan.png
    python3 buat.py ref/j221026.pptx keluar.pptx && python3 buat.py ref/j221026.pptx keluar-3d.pptx --3d

PDF: tanpa LibreOffice, ekspor lewat Microsoft PowerPoint (AppleScript `save ... as save as PDF`). `buat.py` menolak titik tengah,
em dash, sisa teks templat Jatim, label kartu yang melipat, dan angka luas lapangan.
