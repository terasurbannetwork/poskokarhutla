# KEAMANAN-PRIVASI: Laporan Bulanan

## 1. Klasifikasi

Laporan ini ditujukan kepada Presiden dan memuat permohonan dukungan yang belum diputuskan. Pemilik memutuskan semua pengguna yang masuk situs boleh membuka laporan (K4). Sampai Q22 dijawab, laporan **tidak untuk publik tanpa masuk**: tidak ada halaman publik, tidak ada berkas di `public/`, tidak ada pratinjau gambar bagikan (OG), tidak ada entri di peta situs, dan tidak masuk `/api/v1` (`src/api_v1.js`) sebelum pemilik memutuskan.

## 2. Matriks hak

| Tindakan | Admin (`adminOK`) | Staf peran apa pun (`stafPeran`) | Pemirsa bertab pusdalops | Publik tanpa masuk |
| --- | --- | --- | --- | --- |
| Lihat daftar bulan dan versi | ya | ya | ya | tidak (Q22) |
| Buka draf dan versi beku, cetak | ya | ya, tanpa kolom `oleh` | ya, tanpa kolom `oleh` | tidak (Q22) |
| Lihat berkas angka dan foto | ya | ya | ya | tidak (Q22) |
| Simpan draf, unggah foto, Bekukan | ya | tidak | tidak | tidak |
| Ubah atau hapus versi beku | tidak (trigger D1) | tidak | tidak | tidak |

Rute GET modul ini dimasukkan ke `IZIN_PEMIRSA_PUSDALOPS` (`src/staf.js`); rute tulis tidak. Tiap buka, simpan, bekukan, cetak, dan unggah foto dicatat di `laporan_berkala_jejak` (siapa, kapan).

## 3. Data pribadi

- Laporan hanya memuat angka agregat per kab/kota, provinsi, dan nasional. Nama korban, nama pelapor, dan nomor telepon tidak pernah masuk berkas angka atau isian. `rakit.py` tidak membaca `src/korban.js` atau tabel korban.
- Nama pejabat yang tampil hanya Kepala BNPB (konstanta, K3) dan nama di kegiatan resmi yang sudah diumumkan siaran pers.
- Foto: wajah warga di lokasi pengungsian (contoh 3.4) adalah data pribadi. Staf wajib memilih foto yang tidak menonjolkan wajah anak; layar menampilkan pengingat ini di pemilih foto. Metadata EXIF dan lokasi GPS dibuang dengan mengode ulang foto ke JPEG lewat `<canvas>` di peramban; server menolak JPEG yang masih memuat segmen APP1 `Exif` dan semua tipe selain JPEG.
- Kolom `oleh` berisi prefiks hash kredensial admin, pola `laporan_bnpb`.

## 4. Masukan dan keluaran

- Isian staf dibersihkan `bersihIsi` (`src/laporan_bnpb.js`): NFC, tanpa karakter kontrol, teks paling panjang 2.000 huruf, larik 200 butir, 80 kunci, kedalaman 6, nama kunci `^[a-z][a-z0-9_]{0,39}$`; isian paling besar 96 KB (sama dengan `MAKS_ISI`, juga CHECK D1). Bentuk isian bulanan (kunci action plan, foto, kegiatan) dirancang di LB-06 supaya muat batas itu.
- Semua teks dari isian, berkas angka, dan judul siaran pers disisipkan lewat `textContent` atau di-escape; tidak ada `innerHTML` dari data.
- Tautan sumber di Lampiran hanya `http:` dan `https:`; selain itu tampil sebagai teks.
- Klien tidak pernah mengirim kunci R2. Server membentuk kunci dari `bulan`, `versi`, `tarik`, atau `id` yang sudah divalidasi pola, selalu di bawah `berkala/<periode>/<kode>/`, sehingga rute tidak bisa membaca objek lain di bucket bersama (foto warga, dalops, Siklus). Versi beku diperiksa sha256 tiap dibaca.
- Unggah foto: JPEG hasil kode ulang saja, diperiksa dari byte awal, bukan dari nama; batas ukuran sama dengan unggah foto yang ada; nama objek = sha256 isi.
- Rute tulis menolak permintaan lintas asal (pola gerbang admin yang ada) dan tidak menerima metode lain.
- Semua jawaban rute `cache-control: private, no-store`; rute hanya dilayani di situs Centurisk97 dan localhost.
- Draf dicetak bertanda air "Draf, belum dibekukan"; jenis bulanan tidak menyimpan draf di localStorage (komputer kantor dipakai bersama).
- Log GitHub Actions repo publik: `rakit.py` hanya mencetak jumlah baris dan status sumber, tidak pernah isi dalops, angka laporan, atau isian.

## 5. Rahasia

Tidak ada rahasia baru. `berkala.yml` memakai `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` yang sudah ada. Panen bnpb.go.id tanpa kunci.

## 6. Hak cipta

Foto media hanya dengan centang izin dan kredit (Q7). Daftar kegiatan hanya menyimpan judul, tanggal, dan tautan, tidak menyalin isi berita.

## 7. Repo publik

Repo ini publik. Contoh PDF Oktober 2026, berkas angka, foto, dan isian tidak pernah di-commit. Fixture uji memakai angka buatan yang jelas buatan (bukan salinan bulan nyata) dan disimpan di `tests/berkala/fixtures/`; aturan "tanpa data dummy" (11 Nov 2026) berlaku untuk layar, bukan fixture uji.
