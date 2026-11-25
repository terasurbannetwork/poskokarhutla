# Ikhtisar bencana geologi dan pesisir

Halaman ini memberi ikhtisar lima halaman bencana geologi dan pesisir beserta paket rancangan yang belum menjadi layar.

## Ringkasan

Dokumen ini menjelaskan lima halaman bencana Centurisk97 di luar karhutla dan banjir: Gempa dan Tsunami (`/gempa/`), Letusan Gunung Api (`/gunungapi/`), Tanah Longsor (tab di `/banjir/`), Kekeringan (`/kekeringan/`), dan Gelombang Pasang dan Abrasi (`/pesisir/`). Dokumen juga mencatat tiga paket rancangan yang belum menjadi kode: genangan tsunami, bangunan di lereng terjal, dan panel sensor serta CCTV (EWS).

Masalah yang dijawab: petugas pusat dan daerah membutuhkan satu tempat untuk melihat kejadian terbaru, status resmi lembaga, perkiraan model berlabel jelas, dan angka paparan penduduk, tanpa membuka sumber satu per satu. Aturan pokoknya sama di semua halaman:

- Status resmi lembaga (BMKG, PTWC, PVMBG) tampil apa adanya, berlabel lembaga dan jam terbit, dan tidak pernah diturunkan atau ditafsir ulang oleh kode kita. Deteksi sendiri berlabel "Deteksi Centurisk97".
- Model yang belum lulus uji balik tampil sebagai hipotesis (pil "Hipotesis" atau "belum teruji"). Model yang kalah dari pembanding sederhana tidak diterbitkan.
- Tidak ada ramalan gempa utama atau letusan. Halaman tidak pernah menulis kata yang menyatakan suatu wilayah selamat. Bila BMKG tidak menyebut tsunami, layar menulis "BMKG tidak menyebut tsunami".
- Nilai kosong ditulis "belum terukur", "belum ada data", atau tanda strip, tidak pernah 0.

Pengguna: warga (halaman publik, tanpa masuk), BPBD dan staf BNPB (Pusdalops, Koordalops, tab Operasi, tab Foto), instansi, dan pimpinan (angka ringkas dan laporan harian).

![Alur data dari tiga sumber ke tiga layar bencana: gempa dari BMKG dan USGS lewat cron Worker, gunung api dari MAGMA PVMBG lewat Worker dan pipeline, longsor dari hujan, lereng, tanah, dan sesar lewat pipeline banjir. Nowcast longsor berlabel hipotesis.](gambar/gempa-gunungapi-longsor-alur-data.svg)

Cakupan modul menurut status registri `public/bencana.json`: gempa, gunung api, kekeringan, dan pesisir berstatus `aktif`; longsor berstatus `mati` untuk rute sendiri dan hanya hidup sebagai tab "Longsor" di halaman banjir (`public/bencana.json:1648`, kunci `layar.induk = "banjir"`, `model_status = "hipotesis"`).

## Panduan pengguna

Semua halaman di bawah publik (tanpa masuk) kecuali dinyatakan lain. Tiap halaman bencana memakai kerangka yang sama: kepala dengan menu bencana, peta MapLibre, panel kiri (di HP menjadi lembar bawah), dan tab. Jalur `/<bencana>/<tab>` dilayani Worker dari registri, sehingga tab yang disembunyikan dari menu tetap bisa dibuka lewat URL.

## Paket yang belum menjadi layar

- **Simulasi genangan tsunami (rencana, tab Simulasi gempa).** Belum ada kode; hanya paket dokumen (lihat Metode, bagian Genangan tsunami).
- **Bangunan di lereng terjal (rencana, `/longsor/lereng`).** Baru pembaca DEM dan ekstrak bangunan; belum ada layar.
- **Panel EWS sensor dan CCTV (rencana, `/banjir` dan `/gunungapi`).** Belum ada kode panel; yang ada hanya rute sensor milik sendiri untuk staf.

## Metode

Semua model memakai prinsip yang sama (`PELATIHAN-MODEL` di dokumen paritas): pembagian waktu latih, validasi, dan uji; uji dibuka satu kali; pembanding sederhana wajib; arsip prospektif hanya bertambah.
