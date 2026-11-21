# DESIGN-SYSTEM: Pasang dan Peringatan

Aturan umum: token dari `public/inti/tema.css` dan gaya `public/lapor/lapor.css` (AGENTS.md 3.9, tidak ada literal warna baru di luar `tema.css`); kartu laporan tanpa kesimpulan di kepala (AGENTS.md 3.5); kartu tidak menempel, jarak 20px; tanpa huruf kapital semua; tanpa titik tengah sebagai pemisah. Tidak ada berkas CSS baru bila `lapor.css` cukup.

## Komponen

| Komponen | Isi | Keadaan |
| --- | --- | --- |
| Kartu Pasang `.pw-pasang` | ikon aplikasi, "Pasang Pantau Bencana di HP Anda", satu kalimat manfaat, tombol Pasang (Android) atau Lihat caranya (iPhone), tombol tutup | tersedia, sudah terpasang (disembunyikan), ditutup (30 hari) |
| Panduan iPhone `.pw-ios` | tiga langkah bergambar ikon Bagikan, Tambah ke Layar Utama, Tambah; satu kalimat bila bukan Safari | langkah aktif disorot, tanpa animasi bila gerak dikurangi |
| Kartu Peringatan `.pw-kelola` | status (menyala, mati, tidak didukung, ditolak), daftar kecamatan (baris dengan ikon hapus), pil jenis (ikon per jenis), pilihan ambang tiga segmen sebaris, tombol Nyalakan atau Matikan | semua keadaan ditulis dengan kalimat, bukan warna saja |
| Kartu Arahan `.pw-arah` | kepala: nama seksi "Arahan untuk Kecamatan X"; tiga baris hari dengan pil tingkat; baris imbauan; tiga baris titik berkumpul (nama, jenis, jarak, label sumber, tombol Arah); nomor penting; kalimat pendamping jarak | memuat, kosong, galat |
| Notifikasi | judul, isi, ikon aplikasi 192, lencana kecil monokrom, tombol aksi Lihat arahan | di luar kendali tata letak; teks sesuai ALGORITMA bagian 4 |
| Pesan SIGAP | satu gelembung bergilir tambahan: "Nyalakan peringatan untuk kecamatan Anda" dengan tombol menuju kartu | mengikuti aturan jeda dan gerak dikurangi (K76) |

## Pola

1. Pil tingkat memakai warna status yang sudah ada di `lapor.css` untuk Waspada, Siaga, Awas, dan selalu disertai kata tingkat. Tingkat Normal ditampilkan abu tanpa kata "aman".
2. Pil jenis berikon: banjir, longsor, asap, angin, dengan ikon yang sama dengan kartu Info dan Prediksi (K76-K82).
3. Pilihan ambang: tiga segmen sebaris selebar kartu, dibagi rata (aturan deretan pilihan).
4. Tombol utama satu per kartu; sisanya tombol teks.
5. Target sentuh minimal 44 x 44 px; kontras teks sesuai WCAG 2.2 AA; fokus terlihat.
6. Layar sempit 360 px dan lebar 1280 px diperiksa; kartu tidak meninggalkan ruang kosong besar di sisinya.
7. Dalam bahasa pilihan semua kalimat kartu diterjemahkan lewat kamus yang ada (`public/lapor/tr/`), kunci baru dicatat di PW-05 dan PW-08.

## Wireframe kartu Arahan

```
Arahan untuk Kecamatan X, Kab Y
[Besok: Banjir Waspada] [Lusa: Banjir Normal] [Hari ke-3: tanpa data]
Imbauan: <kalimat dari aturan dampak, bila ada>
Titik berkumpul terdekat
  Balai Desa Z        Kantor atau balai   1,2 km   perkiraan dari OpenStreetMap   [Arah]
  SDN 1 Z             Sekolah             1,8 km   perkiraan dari OpenStreetMap   [Arah]
  Masjid Al ...       Rumah ibadah        2,1 km   perkiraan dari OpenStreetMap   [Arah]
Jarak garis lurus, bukan rute. Tempat ini belum tentu ditetapkan sebagai titik evakuasi.
Darurat: 112   Call center BNPB 117   BPBD kab/kota: <nomor>
```

## Ikon aplikasi

PNG 192 dan 512 (maksimal), dan 512 maskable dengan zona isi 80 persen, dari lambang BNPB resmi. Berkas yang ada hanya `public/lapor/lambang-bnpb.png` 160 x 160; versi resolusi lebih tinggi harus dari pemilik (Q-ikon di TIKET PW-03). Lencana notifikasi monokrom 96 x 96.
