# Alur: dari berkas Markdown sampai pembaca

## 1. Alur penulis (agent atau manusia)

1. Penulis membuka `docs/centurisk97/NN-slug.md` yang ditugaskan. Satu penulis per berkas, tanpa menyunting
   berkas lain (K4).
2. Penulis mengisi lima bagian berurutan. Tiap angka, rumus, ambang, jadwal, rute, tabel, dan hak akses diambil dari
   kode atau dokumen repo. Di Referensi teknis, tiap klaim diberi rujukan `berkas:baris` atau `berkas`.
3. Bila tidak ketemu di repo, penulis menulis "belum terdokumentasi di kode" dan tidak menebak.
4. Penulis menjalankan `python3 -I scripts/docs/bangun.py --cek-sumber` (hanya memeriksa sumber, tidak menulis).
   Galat tercetak per berkas dan baris.
5. Pengerja pemilik modul yang disentuh memeriksa kebenaran isi (tiket DC-07). Pemeriksa bukan penulis (AGENTS.md
   §3.2).

## 2. Alur bangun

```
docs/centurisk97/*.md
        |  bangun.py: baca, periksa kerangka dan rujukan, render
        v
public/docs/index.html            beranda dan daftar topik
public/docs/<slug>.html           satu halaman per berkas sumber
public/docs/cari.json             indeks cari (judul, bagian, teks ringkas)
public/docs/docs.css, docs.js     gaya dan perilaku (ditulis tangan, bukan keluaran)
public/docs/_bangun.json          sidik sumber (hash), tanggal bangun, jumlah halaman
```

Generator berjalan tanpa jaringan. Keluaran ditulis hanya bila isinya berubah (sama seperti pola `bangun` lain
di repo), supaya commit tidak berisik.

## 3. Alur gerbang

| Titik | Yang berjalan | Akibat bila gagal |
| --- | --- | --- |
| Lokal, sebelum commit | `python3 -I scripts/docs/bangun.py --cek` | Berkas keluaran basi atau sumber salah; jalankan tanpa `--cek` lalu commit keduanya |
| Pre-push | `npm run uji:docs` (rancangan, belum terpasang; DC-08 mengubah `.githooks/pre-push`) | Push ditolak |
| `terbit.yml` | Uji node dan `bangun.py --cek` sebelum `wrangler deploy` | Tidak deploy |

## 4. Alur pembaca

1. Pembaca membuka `centurisk97.id/docs` (kelak `docs.centurisk97.id`). Worker menjawab dari aset `public/docs/index.html`.
2. Pembaca memilih sudut (Pengguna, Pengembang, Semua). Pilihan disimpan di `localStorage` (dibungkus try/catch; bila
   gagal, jalan tanpa simpanan).
3. Pembaca mengetik di kotak cari. `docs.js` memuat `cari.json` sekali, lalu memberi peringkat di peramban.
4. Pembaca membuka topik, membaca bagian, menyalin rujukan `berkas:baris`.
5. Alamat bagian (`#metode`) bisa dibagikan; bagian yang disembunyikan oleh sudut aktif dibuka otomatis bila alamat
   menunjuk ke sana.

## 5. Alur perubahan kode yang menggeser rujukan

1. Pengembang mengubah berkas kode. Baris yang dirujuk Docs bergeser.
2. `bangun.py --cek` memeriksa dua hal: berkas masih ada dan nomor baris tidak melewati panjang berkas. Pergeseran
   yang masih di dalam rentang tidak terdeteksi oleh mesin (batas yang diakui di Batasan).
3. Bila berkas hilang atau baris melewati panjang berkas, uji gagal dan penulis memperbarui rujukan.
4. Untuk pergeseran halus, pemeriksa konteks bersih menelusuri sampel rujukan tiap kali satu modul berubah besar
   (tiket DC-11).

## 6. Alur terbit dan alias

- `/docs` terbit lewat `terbit.yml` bersama tampilan lain.
- `docs.centurisk97.id` (DC-06): permintaan ke host itu dijawab Worker dengan isi `/docs` pada jalur yang sama
  tanpa alihan, atau alihan 301 ke `/docs` [bawaan: tanpa alihan, URL kanonik tetap `/docs`]. Isi tidak ditulis ulang.

## 7. Alur kegagalan

- Sumber salah kerangka: generator berhenti, tidak menulis apa pun, mencetak daftar galat.
- `cari.json` gagal dimuat di peramban: kotak cari menampilkan "pencarian tidak tersedia", daftar topik tetap bisa dipakai.
- JavaScript mati: semua bagian tampil (sudut "Semua"), bilah samping dan isi tetap terbaca.
