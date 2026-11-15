# ALGORITMA: Keterpaduan

## 1. Baris modul ke kejadian (dipakai ulang)

Aturan `scripts/siklus/pasang.py bertahap` tidak diubah: kandidat = kejadian dengan jenis sama, `kab4` termasuk daftar kab kejadian, `|mulai - mulai_kejadian| <= 3 hari`, fase bukan digabung atau dibatalkan, belum punya entri dari sumber yang sama. Nol kandidat: baru (kunci pendiri `jenis|kab4|mulai`). Satu: tambah. Lebih: ambigu.

Pemetaan sumber baru:

| Sumber | Kode | Jenis | Wilayah | Mulai | Kolom kursor |
| --- | --- | --- | --- | --- | --- |
| `tugas_api` | `id` | dari `tugas_bencana.jenis`, bawaan karhutla | prov + nama kab ke `kab4` | `dibuat` (ms ke tanggal WIB) | `dibuat` (indeks `tugas_api_dibuat` sudah ada) |
| `logbook_d1` | `id` | `jenis` logbook, `gempabumi` dipetakan ke `gempa` | prov + nama kab | `mulai` | `dibuat` (indeks baru) |
| `sippa` | `id` | dari `sippa_kit.jenis`: banjir jadi banjir, selain itu (dan kit kosong) karhutla; tugas yang log gelarnya hanya `latihan` dikecualikan (`sippa_tugas` tidak punya kolom jenis) | prov + nama kab | `mulai` | `mulai` (tabel tanpa `dibuat`; indeks baru) |
| `lapangan` | `id` | jenis tugas | lat/lon, diubah ke kab4 oleh Python (titik-dalam-poligon) | `mulai` | `mulai` (indeks baru) |
| `gempa_d1` | `kode` | gempa | pusat ke kab4 terdekat di darat | `mulai` | `mulai` (indeks sudah ada) |
| `lapsus` | `operasi_id:kejadian_id` | ikut logbook | ikut logbook | ikut logbook | `dibuat` (indeks baru) |

Jenis yang tidak ada di `JENIS_SAH` (`src/siklus_kejadian.js:15`) sesudah pemetaan tidak dikirim, supaya `itemIngest` tidak menolak satu batch.

Kursor: komposit `(waktu, id)`, `LIMIT 501` lalu `lanjut` bila lebih dari 500, sama dengan `lanjut()` di `src/siklus_kejadian.js:339-343`, supaya baris dengan milidetik yang sama tidak terlewat. Kab dan mulai tidak berubah sesudah baris dibuat, jadi kursor pada waktu pembuatan cukup.

`gempa_kejadian` yang `utama_id`-nya sudah masuk lewat usgs atau bmkg tidak dikirim ulang.

## 2. Antrean gabungan

- Kirim urut terlama per saluran, satu proses per halaman (bendera masuk ulang).
- Status 0, 408, 429, 5xx: berhenti, coba lagi dengan jeda `60 s x 2^(coba-1)`, plafon 30 menit, jitter plus minus 20 persen.
- 401 atau 403: berhenti, minta masuk ulang; butir tidak dibuang.
- 409 dengan alasan keadaan: butir ditandai "keadaan berubah", tidak dikirim lagi otomatis.
- 4xx lain: butir ditolak, ditahan dengan alasan.
- 413 pada batch: batch dibelah dua.
- Foto: unggah dulu, simpan `media_id`, kosongkan blob, baru kirim butir.
- Umur: 14 hari (K13), absen wajah 36 jam.

## 3. Spek

Tipe: `teks`, `panjang`, `angka`, `bulat`, `tanggal`, `jam`, `pilihan`, `ganda`, `koordinat`, `foto`. Kunci: `nama`, `label`, `tipe`, `wajib`, `min`, `maks`, `pilihan`, `satuan`, `bantu`, `tampil_jika`, `rupiah`. Aturan lintas medan: fungsi `cek(isi) -> galat[]` per formulir. Validator mengembalikan `{ok, galat: [{nama, pesan}]}` yang sama di Worker dan peramban.

Adapter lama ke baru: `pilih` ke `pilihan`, `nilai` ke `pilihan`, `MEDAN` pipa tetap. Spek lama tetap jalan sampai modulnya dipindah.

## 4. Titik pengungsian

- Kode `TP-` + 8 huruf base32 acak (bukan hash, karena nama tempat bisa berubah).
- Titik dekat: Worker membaca kandidat di `kab4` yang sama dalam kotak plus minus 0,002 derajat (sekitar 220 m) lewat indeks `(kab4, lat, lon)`, lalu menghitung haversine; di bawah 200 m ditanyakan.
- Putaran = `pendataan_ke`; satu catatan per (titik, tanggal). Kunci unik baru: `(titik_id, tgl_data)`.
- Basi: putaran terakhir lebih dari 3 hari dan titik belum tutup (K12).

## 5. Pencocokan orang

1. NIP: buang spasi dan titik; cocok bila 18 digit sama persis dengan `orang.nip`. NIP akun yang sesudah dibersihkan bukan 18 digit (`staf.nip` dan `pdt_akun.nip` membolehkan 5-30 karakter) masuk daftar tinjau sebagai "NIP tidak baku", lalu dicoba lewat WA.
2. WA: semua nomor lewat `normalWA`; cocok bila sama persis.
3. Akun yang cocok NIP ke orang A dan WA ke orang B: bentrok, tinjau.
4. Dua akun di tabel yang sama cocok ke satu orang: boleh (contoh: staf lama dan baru), ditandai.
5. Tidak ada orang yang cocok: akun tidak punya baris `orang_akun`. Pegawai baru dibuat di `orang` hanya lewat impor yang sudah ada.
