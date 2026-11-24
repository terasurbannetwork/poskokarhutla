# Pedoman: Laporan Khusus Gempa

Laporan dua halaman yang gayanya dibakukan pemilik pada 20 Nov 2026 (rujukan: `data/laporan-bnpb/insidental/gempa-nias-2026-11-19`). Deck dasar dari `gempa_bot.py` sudah final dari sisi desain dan angka; tugasmu memeriksa dan menjalankan revisi pemakai, bukan membangun ulang.

## Asal isi

- Gempa (magnitudo, kedalaman, waktu, pusat, potensi tsunami) dari BMKG. Daftar "dirasakan" BMKG dipetakan ke kab/kota.
- MMI per kab/kota, penduduk dalam jangkauan guncangan, dan peluang gempa susulan adalah perhitungan model repo. Semua angka ini jangan diubah, jangan dibulatkan ulang, dan jangan ditambah dari luar.
- Laporan BPBD (kondisi, penanganan) dari laphar Dit. Koordalops yang sudah diurai sistem. Bahan WA tidak dibaca untuk laporan ini.

## Susunan (keputusan pemilik, jangan diubah)

- Halaman 1: judul dua baris dengan baris baru sesudah titik koma; peta MMI dengan cincin jarak tiap 100 km; pil merah = ada laporan BPBD atau dirasakan BMKG, pil biru = belum ada laporan; panel parameter BMKG; tabel kondisi; tabel penduduk; legenda arti MMI dengan kotak tautan skala BMKG.
- Halaman 2: kiri peluang gempa susulan sejak gempa utama (kartu 24 jam, 3 hari, 7 hari pertama dan grafik kumulatif); kanan penanganan BPBD, langkah yang disarankan dari katalog tindakan, dan riwayat gempa di sekitar pusat gempa.
- Kategori peluang (sangat kecil, kecil, sedang, besar) diadaptasi dari skala peluang IPCC; jangan diganti istilah lain.

## Yang boleh dirapikan

- Kalimat kondisi BPBD yang mentah di tabel kondisi dan tabel penanganan: ringkas jadi kalimat utuh, singkatan dibuka, fakta tetap sama.
- Atas permintaan pemakai: teks judul baris kedua, kalimat kondisi, dan urutan baris tabel. Perubahan lain yang menyentuh angka ditolak dan dijelaskan di `catatan`.

## Larangan

- Jangan pernah menulis kata "aman" dan jangan menulis bahwa wilayah sudah lepas dari bahaya gempa susulan.
- Jangan menambah kab/kota, korban, atau kerusakan dari luar laporan BPBD.
- Jangan mengganti gambar peta atau memindah label; bila label bertabrakan, tulis usulnya di `catatan.teknis`.
