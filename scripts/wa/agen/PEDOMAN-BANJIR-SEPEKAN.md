# Pedoman: Paparan Situasi Banjir Sepekan

Deck mingguan buatan pemilik (data/laporan-bnpb/mingguan/2026-11-09, 2026-11-16, 2026-11-19 folder banjir-longsor) dibuat bot sejak 19 Nov 2026 untuk periode bebas. Deck dasar dari `banjir_sepekan.py` sudah memakai mesin dan desain yang sama; tugasmu merapikan isinya, bukan membangun ulang.

## Periode dan bahan

- Periode = tanggal laphar Dit. Koordalops awal sampai akhir. Laphar tanggal D dikirim lewat WA pagi D+1, jadi bahan `koordalops-YYYY-MM-DD` berisi laphar sehari sebelumnya. Laphar yang belum terbit sudah ditulis generator di baris Sumber ("laporan 19 Nov belum tersedia").
- Satu-satunya sumber kejadian, KK, jiwa, dan pengungsi adalah WA Koordalops di bahan/. Probabilitas, status Awas dan Siaga, dan lampiran daftar kab/kota berasal dari data GIS sistem banjir: angkanya jangan diubah.
- Kab/kota yang tidak dilaporkan lagi di dalam periode tidak dimasukkan (pemilik 19 Nov). Deck ini banjir saja; tanah longsor tidak dimuat.

## Susunan (pemilik 16 dan 19 Nov 2026)

- Tanpa sampul, daftar isi, dan penutup. Tab: Peta banjir, Probabilitas banjir, Mitigasi. Lampiran: L1 rincian per kab/kota, L2 pengungsian (bila ada pengungsi), lalu daftar kab/kota Awas dan Siaga.
- Kolom KONDISI di slide peta: pil Belum surut atau Surut. Kondisi terakhir di L1 ringkas, kalimat utuh, dari WA laporan terakhir yang menyebut kab/kota itu.

## Yang dirapikan

- Kalimat kondisi WA mentah di L1: ringkas jadi satu atau dua kalimat utuh, singkatan dibuka (Kec. jadi kecamatan bila memang perlu, Gp. jadi gampong), kapital di tengah kalimat dibetulkan. Angka tetap sama dengan WA.
- Jangan menulis tiga-serangkai "A, B dan C" (gerbang anti-AI mesin deck menolaknya): tulis jumlahnya ("tiga kecamatan"), atau daftar tanpa kata sambung.
- Panel Mitigasi: generator hanya menulis bawaan ("Layani N jiwa pengungsi; pantau wilayah yang belum surut"). Ganti dengan langkah konkret per kab/kota yang belum surut dari isi WA (tanggul jebol, jembatan putus, jalan terputus, desa yang masih tergenang), kalimat perintah singkat seperti contoh di kemarin/skrip-buat.py (`M.MITIGASI`).
- Tanggal mulai: laphar pertama dari rangkaian laporan yang tidak putus. Bila WA menyebut tanggal kejadian yang berbeda, pakai yang di WA dan sebut di `catatan`.
- Status surut: "berangsur surut", "sebagian surut", "masih tergenang" = belum surut. Bila generator salah membaca, betulkan pil dan tulis di `catatan`.

## Larangan

- Jangan pernah menulis kata "aman" (misalnya "kondisi aman terkendali" ditulis "kondisi terkendali").
- Peta slide 1 selalu multipeta (pemilik 20 Nov 2026): satu panel per pulau berskala sama, label diatur generator. Jangan mengganti gambar peta atau memindah panel; bila label terlalu rapat, tulis usulnya di `catatan.teknis`.
- Jangan menambah kejadian dari luar bahan, termasuk dari deck pekan lalu.

## Nama berkas

`Paparan Situasi Banjir Sepekan DDMMYY.pptx`, DDMMYY = tanggal akhir periode (contoh 191126).
