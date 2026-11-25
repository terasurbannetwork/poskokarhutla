# Keamanan dan privasi: Docs

Repo ini publik dan Docs tampil di situs publik (Q1, bawaan). Prinsipnya: Docs hanya memuat yang memang boleh
dibaca siapa saja, dan mesin yang memeriksanya.

## 1. Apa yang boleh dan tidak boleh ada di isi

| Boleh | Tidak boleh |
| --- | --- |
| Nama lembaga (BNPB, BPBD, BMKG, dan sebagainya) | Nama orang, jabatan yang menunjuk satu orang, foto orang |
| Nama berkas, jalur rute, nama tabel, nama kolom | Isi `.env`, kunci API, token, secret, kata sandi, ID akun penyedia |
| Rumus, ambang model, status uji balik | Nomor telepon, surel, alamat rumah, nomor identitas |
| Jadwal workflow (cron) | Data baris nyata dari D1 atau R2 (laporan warga, absen, pegawai) |
| Hak akses per peran (nama peran saja) | Nilai batas laju, panjang atau format kode sekali pakai, nama header rahasia (Q2, bawaan) |
| Alamat produksi publik | Alamat internal, IP, atau hostname non-publik |

Contoh yang diperlihatkan harus berupa data buatan yang jelas berlabel contoh, bukan data nyata. Aturan repo
"tanpa data dummy" berlaku untuk data yang tampil sebagai fakta di produk; contoh format di dokumentasi boleh,
dengan label "contoh format".

## 2. Pemeriksaan mesin

`bangun.py --cek-sumber` menolak (lihat ALGORITMA bagian 3): pola surel, nomor telepon Indonesia, rangkaian
panjang bertampang token, awalan kunci umum, baris `NAMA=nilai` huruf besar, nama produk lama, dan kata vonis
terlarang. Pemeriksaan ini jaring pengaman, bukan jaminan; penulis dan pemeriksa tetap bertanggung jawab.
Uji gerbang memasang fixture tiap pola dan memastikan terdeteksi.

## 3. Keamanan halaman

- Semua teks sumber di-escape HTML sebelum penanda inline; HTML mentah ditolak.
- Tautan hanya `https://`, jalur situs, atau jangkar; skema lain ditolak.
- Tautan keluar diberi `rel="noopener noreferrer"`.
- Tanpa skrip inline dan tanpa gaya inline; perilaku di `docs.js`, gaya di `docs.css`. Ini kompatibel dengan CSP ketat; penegakannya butuh blok `/docs/*.html` di `public/_headers` (`script-src 'self'`), karena aturan `/*` masih memuat `'unsafe-inline'` (`public/_headers:14-25`). Blok itu bagian tiket DC-03.
- `docs.js` tidak memakai `innerHTML` dengan data indeks cari; hasil dirakit dengan `textContent` dan `mark`
  yang dibuat lewat DOM.
- Tidak ada formulir, tidak ada kuki baru, tidak ada permintaan ke host luar selain huruf yang sudah dimuat situs.
- `cari.json` hanya memuat teks yang sudah ada di halaman.

## 4. Akses

- Bawaan: `/docs` dan `/docs/<slug>` terbuka tanpa sesi (Q1 belum diputuskan pemilik). Alasan: repo publik, Docs
  tidak berisi rahasia, dan nilai Docs (transparansi metode, K3) hilang bila di balik login.
- Bila pemilik memutuskan bagian teknis tertutup: opsi (a) seluruh `/docs` di balik sesi seperti `/prediksi`, atau
  (b) dua kumpulan halaman. Opsi (b) mengubah generator (dua keluaran) dan tidak dipilih sebelum ada keputusan.
- `docs.centurisk97.id` WAJIB masuk `HOST_TERKUNCI` dan `situsCenturisk` (`src/worker.js:716-721`), agar gerbang halaman lain tetap menutup `/monitor`, `/direktori`, `/admin` di host itu (gerbang berjalan hanya bila `hostTerkunci(host)` benar, `src/worker.js:967`). Docs terbuka lewat pengecualian `/docs` di `halamanTerkunci`, bukan lewat pengeluaran host dari daftar terkunci.

## 5. Privasi pembaca

Docs tidak memasang pelacak baru. Hitungan kunjungan halaman dicatat otomatis oleh mekanisme `catatHTML` situs yang
sudah ada (`src/worker.js:840`; bukan opsional, kecuali DC-03 mengecualikan `/docs`) (tanpa data pribadi), bukan layanan luar. Pilihan sudut dan tema disimpan di `localStorage` pembaca
sendiri dan tidak dikirim ke mana pun.

## 6. Hal yang diakui belum terjamin

- Mesin tidak dapat mengenali nama orang yang ditulis biasa; pemeriksa manusia wajib memindai.
- Mesin tidak dapat memastikan sebuah angka batas laju tidak ikut tertulis dalam kalimat panjang; pemeriksa wajib
  memeriksa bagian Referensi teknis modul keamanan (Masuk, Hak akses).
- Rujukan `berkas:baris` membuka struktur kode. Ini sah karena repo publik; bila repo kelak ditutup, Q1 ditinjau ulang.

## 7. Penanganan temuan

Bila sebuah halaman Docs terbukti memuat rahasia: cabut berkas dari `public/docs` dan sumber, bangun ulang,
terbitkan, lalu putar (rotasi) rahasia yang bocor. Pemutaran rahasia dilakukan pemilik di dasbor penyedia; agent
tidak melakukannya. Riwayat git tetap menyimpan isi lama, jadi rotasi wajib.
