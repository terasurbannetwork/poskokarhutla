# ALGORITMA: Segel dokumen

## 1. Kode

- Abjad Crockford base32: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
- 10 huruf dari `crypto.getRandomValues` (50 bit). Ditampilkan dengan tanda hubung di tengah: `ABCDE-FGHJK`.
- Masukan pengguna dinormalkan: huruf besar, buang spasi dan tanda hubung, ganti O ke 0 dan I atau L ke 1.
- Bentrok kode (peluang sangat kecil) ditangani kunci utama D1: INSERT gagal, kode baru dibuat, paling banyak 3 kali.

## 2. Sidik

| Jenis | Rujukan | Sidik | Cara hitung ulang saat dibaca |
| --- | --- | --- | --- |
| `lk` | `<tanggal>#<ralat>` | `lk_snapshot.hash` | sha256 kolom `isi` baris itu |
| `lkb` | `<bencana>/<tanggal>#<ralat>` | `lkb_snapshot.hash` | sha256 kolom `isi` |
| `pb` | id `pb_dokumen` | `pb_dokumen.sha` | sha256 teks objek R2 beku |
| `lj` (fase 2) | `<berkas>#<versi>` | `lj_beku.sidik` | fungsi kanonik `src/lapor_lanjut_spek.js` |

Sidik berkas (`sidik_berkas`) diisi hanya bila PDF disimpan sekali ke R2 dan tidak dirender ulang. Fase 1 mengosongkannya untuk lk dan lkb; tombol cocokkan berkas tidak tampil bila kosong.

## 3. Status

```
bila ada baris segel_cabut untuk kode            -> Dicabut
bila isi sumber tidak ada atau sha256 != sidik   -> Tidak cocok
bila ada segel lain dengan jenis dan rujukan dasar
     sama dan versi lebih tinggi                  -> Ada versi lebih baru (+ kode terbaru)
selain itu                                        -> Berlaku
```

Rujukan dasar = rujukan tanpa bagian `#<ralat>` atau `#<versi>`. Urutan pemeriksaan menaruh Dicabut di atas Tidak cocok supaya pencabutan karena isi rusak tetap terbaca sebagai pencabutan.

## 4. Batas laju

60 pencarian per 10 menit (Q9) per hash IP harian (pola `laju_*` yang sudah ada). Lewat batas: 429 dengan pesan "Terlalu banyak pemeriksaan, coba lagi beberapa menit lagi."

## 5. Hitung ulang dan beban D1

Satu pembukaan kode = paling banyak 3 baca D1 (segel, cabut, sumber) atau 2 baca D1 + 1 GET R2. Jawaban tidak di-cache (D15). Daftar staf menghitung ulang paling banyak 100 segel terbaru per buka; bila beban terasa, hitung ulang hanya saat staf menekan Periksa.
