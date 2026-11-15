# DESIGN-SYSTEM: Satu Pintu Masuk

Tidak ada palet atau komponen baru. Halaman memakai kepala situs navy bersama dan token Centurisk97 (`public/bnpb/bnpb.css`, kelas `.bn-*`), sama dengan `/alun-alun` dan `/instansi`.

## Aturan pemilik yang berlaku di sini

- Kepala situs bersama di tiap halaman; tanpa palet lokal.
- Tanpa teks huruf kapital semua.
- Tanpa titik tengah sebagai pemisah; pakai koma, kalimat, atau baris baru.
- Tombol ikon polos tanpa garis luar.
- Deretan pilihan selebar wadah, dibagi rata, berikon.
- Kartu tidak menempel; jarak antarkartu 20 px.
- Tanpa kalimat kesimpulan di kepala kartu; kepala kartu adalah nama seksi.
- Tanpa data contoh.

## Layar

### L1. `/masuk`, langkah nomor

Satu kartu di tengah, lebar paling banyak 420 px.

```
[kepala situs]

  Masuk
  Nomor WhatsApp
  [ 0812 ...                    ]
  [        Kirim kode           ]

  Masuk dengan sandi
```

- Isian `type="tel"`, `inputmode="numeric"`, `autocomplete="tel"`.
- "Masuk dengan sandi" adalah tautan teks ke form lama, bukan tombol kedua.
- Turnstile tak terlihat.

### L2. `/masuk`, langkah kode

```
  Kode dikirim ke WhatsApp 0812 xxxx xx89
  [ _ _ _ _ _ _ ]
  [           Masuk             ]
  Kirim ulang dalam 0.42      Ganti nomor
```

- Satu isian `autocomplete="one-time-code"`, `inputmode="numeric"`, `maxlength="6"`; bukan enam kotak terpisah (tempel dan isi otomatis jalan).
- Enam angka terisi langsung dikirim tanpa menekan tombol.
- Pesan galat satu baris di bawah isian, `role="status"`.

### L3. Pilih ruang

Daftar baris selebar kartu. Tiap baris: ikon ruang, nama ruang, lembaga dan wilayah di baris kedua. Seluruh baris bisa ditekan. Tanpa kartu di dalam kartu.

### L4. Lengkapi (akun umum)

Nama, provinsi (pilihan), kabupaten atau kota (pilihan bergantung provinsi), satu kotak centang persetujuan dengan tautan ke teks lengkap, tombol "Simpan".

### L5. Daftar peran

Deretan pilihan lima butir berikon, selebar wadah: Relawan, BPBD atau pemda, TNI atau Polri, Unit BNPB, Kampus. Di bawahnya form pendek sesuai pilihan. Hasil ditulis dengan pil status: "Aktif" (hijau), "Menunggu pemeriksaan" (kuning).

### L6. Undang rekan

Kartu bernama "Undang rekan" di `/instansi`: isian nomor, nama, tombol "Undang". Di bawahnya dua tabel: undangan (nama, nomor tersamar, status berpil, tombol ikon cabut) dan anggota (nama, nomor tersamar, jalur masuk, terakhir masuk, tombol ikon cabut untuk pemilik nomor akun).

### L7. Papan aktivasi

Kartu standar `.ex.ex-std` bernama "Aktivasi daerah" dengan tabel `.ex-tabel` menempel penuh, kepala tabel navy bertulisan putih di tengah.

| Kolom | Isi |
| --- | --- |
| Kabupaten atau kota | nama, provinsi di baris kedua |
| Akun aktif | angka |
| Terakhir masuk | tanggal relatif |
| Undangan | terkirim dan diterima |
| Status | pil berwarna |
| Aksi | tombol ikon "Undang" |

Pemilih provinsi dan saringan status di kanan judul. Baris bisa diurutkan; pengurutan dan saringan tidak membekukan layar (kontrolnya segera berubah, isi tabel menyusul).

## Warna status

| Status | Warna |
| --- | --- |
| Aktif | hijau |
| Diundang, menunggu | kuning |
| Belum ada akun | abu |
| Aktif, lama tidak masuk | jingga |
| Ditolak, diblokir | merah |

Warna diambil dari token pil yang sudah ada di `bnpb.css`; bila satu belum ada, ditambahkan di sana, bukan di berkas halaman.

## Seluler

Semua layar satu kolom di bawah 480 px, tanpa geser mendatar. Tabel papan aktivasi menjadi daftar kartu baris pada lebar itu. Sasaran sentuh paling kecil 44 px.

## Teks

Bahasa Indonesia lugas. Contoh: "Kode salah atau kedaluwarsa.", "Terlalu banyak percobaan. Coba lagi 15 menit lagi.", "Kode WhatsApp sedang terganggu. Pakai email atau sandi."
