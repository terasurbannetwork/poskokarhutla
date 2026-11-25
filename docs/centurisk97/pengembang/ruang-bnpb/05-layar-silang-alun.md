# Layar InaRISK, silang sumber, Alun-alun

Halaman ini mencatat layar cermin InaRISK, silang sumber, rapor sumber, dan Alun-alun.

## Cermin InaRISK, /bnpb/inarisk

Layar bertab dengan navigasi hash. Akses menurut kode: perlu masuk di centurisk97.id, `noindex` (lihat Batasan). Tab:

- IRBI: indeks risiko bencana per kab/kota, filter tahun (2015 sampai 2025), provinsi, kab/kota, dan jenis bahaya. Peta koroplet tiga kelas, kartu ringkas (indeks nasional, tertinggi, terendah, jumlah Tinggi), tabel peringkat dengan perubahan, dan dialog detail (jiwa terpapar per bahaya, grafik tren). Tersedia simulasi kapasitas, daftar risiko besok, dan SPAB. Tombol Unduh Ringkasan PDF memakai cetak peramban.
- IKD: daftar Indeks Ketahanan Daerah final per tahun, 20 baris per halaman, dialog analisa dengan radar tujuh prioritas, rekomendasi, dan aksi.
- Web GIS: peta dengan lapisan bahaya, kerentanan, risiko, dan kapasitas dari ArcGIS BNPB; alat gambar titik, lingkaran, poligon; hitung penduduk dan sarana di area gambar; titik Lapor Kegiatan per provinsi dengan filter tanggal dan unduh GeoJSON.
- Unduhan: daftar berkas InaRISK dengan cari, kategori, format, dan urut.
- Tautan, Metodologi, Tentang, Disclaimer: teks. Metodologi memuat rumus dan tabel "uji kami" IRBI lawan DIBI.

Yang tidak ada di cermin dengan sengaja: penduduk laki-laki dan perempuan 51,8 persen dan 48,2 persen, total penduduk dari rumus pengisi, dan kartu komponen V dan C nasional. Angka-angka itu bukan data di InaRISK (lihat Metode).

## Silang sumber, /bnpb/silang

Kajian membandingkan sumber. Empat kartu (`public/bnpb/silang.js`):

1. Dalops lawan DIBI: kejadian yang tercatat satu sumber saja, per tahun dan provinsi.
2. Selisih pasangan: pada kejadian yang cocok, beda korban dan rumah serta jeda pencatatan.
3. InaRISK lawan kejadian: kab berkelas bahaya rendah yang sering kena, dan kelas tinggi yang jarang kena.
4. Beda sumber hari ini: pasangan prakiraan BMKG lawan model Centurisk97 yang peringkatnya berselisih.

Selisih adalah selisih, bukan galat. Layar tidak menyatakan sumber mana yang benar. Pilihan jenis dan normalisasi hanya mengganti satu kartu.

## Rapor sumber, /bnpb/rapor-sumber

Menilai prakiraan terhadap kejadian: tabel a b c d, POD, FAR, CSI, ETS per sumber, bahaya, tenggang, dan daerah. Per 10 November 2026 seluruh 36 sel berstatus belum cukup data karena arsip BMKG sepekan baru 45 hari dan arsip prospektif Centurisk97 baru 10 hari, di bawah syarat 30 hari. Layar tidak menulis "lebih baik dari" tanpa pembanding persistensi atau klimatologi.

## Alun-alun, /alun-alun dan /admin/alun

![Halaman /alun-alun saat belum ada utas: pesan "Belum ada utas di sini" menggantikan daftar.](gambar/layar-alun-alun.webp)

Forum publik untuk warga, relawan, dan petugas, dibuka tamu tanpa login (keputusan pemilik 15 November 2026). Jenis utas: tanya, butuh_bantuan, info_lapangan, pengumuman (pengumuman hanya admin). Langkah menulis:

1. Pilih jenis, bencana, provinsi, dan isi judul (3 sampai 120 huruf) dan teks (sampai 1000 huruf). Kabupaten/kota dan nama tampil opsional.
2. Selesaikan verifikasi Turnstile (tamu) lalu kirim. Batas 5 utas per jam dan 20 per hari per jaringan.
3. Simpan kode pemilik yang tampil sekali. Kode itu dipakai pemilik utas menandai balasan sebagai jawaban.

Ada pengurutan terbaru, terpopuler, dan belum terjawab. Utas butuh bantuan bisa diteruskan moderator menjadi permintaan relawan atau catatan logistik, dan pil status tautan tampil di utas. Pembaca bisa memberi suara, dan melaporkan konten dengan alasan spam, kasar, hoaks, data_pribadi, atau lainnya. `/admin/alun` adalah antrean moderasi untuk moderator.

Catatan penting: fitur Alun-alun Terpadu (kotak masuk instansi, balasan atas nama lembaga, status bantuan, tautan ke kejadian, rekap pimpinan) baru berupa migrasi dan gerbang uji. Kodenya belum ada (lihat Batasan).
