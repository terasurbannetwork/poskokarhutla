# Sekilas dan peta banjir

Halaman ini memperkenalkan modul banjir Centurisk97 dan cara membuka peta banjir, Insight, serta Tren dan Dampak.

## Sekilas

Modul banjir di Centurisk97 (centurisk97.id/banjir) menjawab empat pertanyaan yang sengaja dipisah dan tidak dilebur menjadi satu angka. Pertama, kecamatan mana yang diperkirakan Normal, Waspada, Siaga, atau Awas untuk banjir dalam empat hari ke depan. Kedua, di pesisir, seberapa tinggi muka laut dibanding kebiasaannya sendiri (rob). Ketiga, di mana radar satelit melihat air sesudah banjir. Keempat, seberapa cepat tanah turun di kota pesisir.

Dua istilah dipakai berulang di panduan ini:

- **Hipotesis** berarti keluaran model yang belum terbukti cukup tepat. Pakai sebagai bahan pertimbangan untuk bersiaga, bukan sebagai kepastian bahwa banjir akan atau tidak akan terjadi.
- **Uji balik** berarti menjalankan aturan model pada masa lalu, lalu mencocokkannya dengan kejadian yang benar-benar tercatat. **Uji prospektif** berarti prakiraan dicatat sebelum kejadian dan dinilai sesudahnya; catatannya hanya boleh ditambah, tidak pernah diubah. Model baru disebut teruji bila lulus uji prospektif.

Panduan banjir terbagi beberapa halaman. Halaman cara menghitung (status banjir, hujan dan sungai, kejadian dan dampak, rob) menjelaskan hal yang sudah tampil di layar. Halaman [Fitur banjir yang masih dikembangkan](/docs/banjir/dikembangkan) menjelaskan hal yang sudah dihitung atau dirancang tetapi belum tampil, supaya Anda tidak mencarinya di layar.

## Cara memakai

Semua halaman di bawah terbuka untuk umum tanpa perlu masuk, kecuali disebut lain. Menu di bagian atas memuat Peta, Insight, Longsor, Berita, Tren, Dampak, Simulasi, Foto, dan Metode. Beberapa halaman (Replay, Rob, Sungai, dan lainnya) tidak ada di menu tetapi bisa dibuka lewat tautan langsung. Beberapa alamat berakhiran ".html"; itu bagian dari alamatnya, ketik persis seperti tertulis.

## Peta banjir

Alamat: centurisk97.id/banjir. Tidak perlu masuk.

1. Buka halaman. Peta menampilkan status tiap kecamatan untuk hari ini dan tiga hari ke depan. Pilih hari dan jenis (banjir atau longsor) di atas peta.
2. Nyalakan atau matikan lapisan lewat panel lapisan, misalnya Status wilayah, Pos tinggi air, Sudah banjir (laporan), Sedang hujan, Hujan harian, dan Hujan 3 hari.
3. Klik kecamatan atau titik untuk membuka kartu rincian.
4. Tabel wilayah di panel menampilkan status per provinsi, yang bisa dibuka sampai tingkat kabupaten atau kota. Kolom "H3" adalah jumlah hujan 3 hari dalam milimeter. Kolom "Terdampak" adalah jumlah kabupaten atau kota yang sudah dilaporkan banjir, jadi ini kejadian yang sudah terjadi, bukan prakiraan. Tanda "–" berarti tidak ada laporan, bukan nol.

Arti warna dan label:

| Label | Arti |
| --- | --- |
| Normal (abu) | Tidak ada tanda bahaya menurut aturan model. |
| Waspada (kuning) | Ada tanda awal, perlu dipantau. |
| Siaga (jingga) | Kondisi cukup mengkhawatirkan, siapkan langkah. |
| Awas (merah) | Tingkat tertinggi menurut aturan model. |
| Pil "perkiraan" atau "hipotesis" | Keluaran model yang belum lulus uji balik. |
| Sudah banjir (laporan) | Kejadian yang sudah dilaporkan: Belum surut, Sudah surut, atau Belum diketahui. Bila tidak ada kabar lanjutan lebih dari 14 hari, "Belum surut" berubah menjadi "Belum diketahui". |

Tips: status kabupaten adalah status kecamatan tertingginya, jadi Siaga di satu kecamatan tidak berarti seluruh kabupaten banjir. Bila memilih periode lebih dari satu hari, angka tidak dijumlah berulang: kejadian dihitung sekali, status diambil yang tertinggi, penduduk terpapar diambil puncaknya.

**Apa yang dilakukan saat status Siaga atau Awas?** Status dari sistem ini adalah penanda untuk bersiaga, bukan perintah. Langkah yang wajar: cocokkan dengan peringatan resmi BMKG dan kabar dari pos pengamat setempat, hubungi petugas lapangan di kecamatan itu, lalu siapkan sumber daya sesuai prosedur lembaga Anda. Keputusan penetapan status darurat tetap di tangan pejabat berwenang.

## Insight

Alamat: centurisk97.id/banjir/insight. Tidak perlu masuk.

Kumpulan kartu ringkas: kabupaten dengan peluang hujan lebat tertinggi untuk besok, lusa, dan tiga hari lagi, kemajuan uji prospektif, dan peringatan resmi BMKG per dasarian (10 harian). Pemilih di kanan judul kartu mengubah provinsi atau rentang waktu.

Perhatikan bahwa peluang yang tampil adalah peluang HUJAN lebat, bukan peluang banjir, dan belum dikalibrasi. Peringatan BMKG tampil sebagai gambar resmi apa adanya, dan dasarian yang belum terbit tampil sebagai peta kosong.

## Tren dan Dampak

Alamat: centurisk97.id/banjir/tren dan centurisk97.id/banjir/dampak. Tidak perlu masuk.

Tren memuat grafik per musim dan per tahun. Dampak memuat penduduk, sekolah, fasilitas kesehatan, dan jalan di kecamatan berstatus Siaga atau Awas. Cara membacanya:

- "Penduduk" adalah seluruh penghuni kecamatan itu, bukan hanya penghuni area yang tergenang.
- "Sekolah" dan "fasilitas kesehatan" hanya yang tercatat di sumber data, jadi bisa kurang dari kenyataan. Cakupan sekolah dan fasilitas kesehatan hanya sembilan provinsi; daftar provinsinya belum terdokumentasi di kode. Di luar itu, jumlahnya tidak diisi (bukan nol).
- "Jalan berisiko terputus" adalah jumlah panjang jalan utama di kecamatan yang berstatus Siaga atau Awas dan punya indeks bahaya banjir tinggi (0,66 atau lebih). Angka ini batas atas: tidak semua jalan itu pasti tergenang.
- Kartu penduduk di zona bahaya pada kabupaten dengan peluang hujan lebat adalah gambaran paparan, bukan perkiraan korban.
