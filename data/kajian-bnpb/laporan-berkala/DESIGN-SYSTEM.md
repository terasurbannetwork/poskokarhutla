# DESIGN-SYSTEM: Laporan Bulanan

Dua permukaan dengan aturan berbeda: **layar isian** di `/laporan_bnpb` (aturan layar situs) dan **halaman cetak A4** (aturan dokumen, acuan contoh Oktober 2026).

## 1. Layar isian (`/laporan_bnpb`, jenis "Laporan Bulanan")

- Pemilih jenis yang sudah ada mendapat pilihan ketiga "Laporan Bulanan" (deretan pilihan rata ujung ke ujung, berikon, seperti dua jenis yang ada). Pemilih tanggal berganti pemilih bulan (`<input type="month">`, bulan berjalan dan sesudahnya dinonaktifkan).
- Tata letak dua kolom yang sudah dipakai jenis lain: isian kiri, pratinjau kanan. Kolom berakhir rata (aturan "tanpa ruang kosong"); di layar sempit pratinjau turun ke bawah.
- Tiap bab satu kartu `.ex.ex-std` yang bisa dilipat (`<details>`), kepala kartu = nama bab berikon ("Gambaran umum", "Karhutla", "Banjir dan longsor", "Cuaca ekstrem dan kekeringan", "Geologi", "Program kerja", "Prediksi dan dukungan"). Tanpa kalimat kesimpulan di kepala atau isi kartu (AGENTS.md 3.5, 11 Nov 2026). Jarak antarkartu 20px.
- Di dalam kartu: deretan angka hasil mesin (baca saja, nada abu), lalu kolom staf. Kolom staf kosong ditandai pil kuning "belum diisi".
- Pita status di atas: "Draf, angka tarik 9 Nov 2026 03.10 WIB" atau "Beku v2, dibekukan 12 Nov 2026 oleh ...". Pita "Angka baru tersedia" bernada biru dengan tombol "Pakai angka baru".
- Tombol: Simpan draf, Bekukan, Cetak PDF, Buat versi baru (hanya di versi beku). Ikon polos tanpa garis luar.
- Tanpa huruf kapital selain singkatan; tanpa titik tengah sebagai pemisah; angka format Indonesia.
- Klik tidak membekukan layar: perubahan isian langsung tampil di kolom isian, pratinjau A4 digambar ulang tertunda (pola pratinjau tertunda yang sudah ada di `laporan_bnpb.js`).

## 2. Halaman cetak A4

Acuan bentuk: contoh Oktober 2026. Ukuran A4 tegak, margin 18 mm kiri kanan, Roboto.

### Token

| Token | Nilai | Pakai |
| --- | --- | --- |
| `--lb-navy` | #0f2236 | judul, kepala tabel, kartu angka "jumlah" |
| `--lb-oranye` | #d95f0e | karhutla, kering, nomor gambar dan tabel, "akan dilakukan" |
| `--lb-biru` | #3a87c8 | banjir, basah, kab sudah surut |
| `--lb-coklat` | #8a5a2b | longsor, geologi |
| `--lb-emas` | #a8843a | cuaca ekstrem |
| `--lb-merah` | #c8102e | korban jiwa, rumah rusak berat, belum surut, Level IV |
| `--lb-abu` | #f2f4f7 | latar kartu angka dan kotak catatan |
| `--lb-garis` | #e3e9f2 | garis tabel |

Nilai heksa diambil dari contoh dan dikunci di satu berkas CSS; warna jenis bencana memakai warna yang sudah dipakai situs bila ada (`public/bencana.json`), contoh hanya dipakai bila situs belum punya.

### Komponen

| Komponen | Bentuk |
| --- | --- |
| Kepala halaman | kiri: "Laporan Bencana <Bulan Tahun>" tebal, di bawahnya "Badan Nasional Penanggulangan Bencana"; kanan: logo KRIS dan BNPB; garis tipis di bawah |
| Kaki halaman | alamat Graha BNPB dan nomor halaman |
| Pembuka bab | kotak abu muda dengan bilah kiri berwarna jenis, "Bab n" kecil di atas judul bab (tanpa kapital, Q5) |
| Kartu angka | bilah atas 3px berwarna, angka besar berwarna, keterangan dua baris |
| Tabel | kepala navy, tulisan putih, **semua kepala kolom rata tengah** (aturan pemilik 30 Okt 2026), kolom label rata kiri, angka rata kanan; baris jumlah navy; sel panas (Tabel 1 dan 7) bernada abu berjenjang |
| Gambar | nomor "Gambar n." oranye tebal lalu judul; grafik SVG; baris "Sumber:" miring abu di bawahnya |
| Action plan | tiga kolom: "Sudah dilakukan" (kepala abu biru), "Sedang berjalan" (kepala biru tua), "Akan dilakukan" (kepala oranye, bingkai oranye) |
| Dokumentasi | kisi foto 3 atau 4 kolom, rasio 4:3, keterangan dan kredit di bawah foto |
| Peta | SVG provinsi atau kab/kota dari `/geo/*`, label di pil dengan garis penunjuk, panah utara dan skala 100 km |
| Kotak catatan | latar abu, teks kecil; dipakai untuk catatan metode singkat di bab |
| Temuan utama | nomor bulat berwarna, judul tebal, kalimat berangka |
| Arahan yang dimohon | pita oranye penuh, teks putih |

### Aturan teks dokumen

- Paragraf rata kiri kanan (justify).
- Angka penting ditebalkan.
- Istilah asing dimiringkan (*hotspot*, *action plan*, *water bombing*).
- Ringkasan Eksekutif, temuan utama, dan arahan boleh (Q6). Kalimat lugas, tanpa frasa puitis.
- Baris sumber di bawah tabel dan gambar wajib, berisi sumber dan tanggal tarik.

### Pertanyaan tampilan

Aturan ekspor PDF pemilik (30 Okt 2026) meminta tampilan kit PDF pangantara (pita navy di atas, "Hal n dari m"). Contoh Oktober memakai tampilan lain. **[BAWAAN SEMENTARA]** ikut contoh Oktober karena itu dokumen yang sudah disampaikan ke Presiden; hanya aturan kepala tabel rata tengah yang diambil dari aturan ekspor. Dicatat sebagai Q17 di KEPUTUSAN.
