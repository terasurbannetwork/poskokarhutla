# RENCANA-UJI: Desa Waspada

Aturan AGENTS global butir 3: perilaku di luar TypeScript wajib punya uji yang benar-benar menjalankannya. Di sini perilaku itu Python (pipeline) dan berkas JSON; ujinya menjalankan kode asli di data kecil buatan sendiri, bukan mock. Data buatan untuk uji bukan data dummy di produk (standar 11 Nov 2026 berlaku untuk layar dan keluaran).

## 1. Perintah bukti

| Perintah | Membuktikan |
| -------- | ----------- |
| `python3 -I scripts/data/desa_waspada.py --uji` | self-check fungsi murni A sampai D |
| `python3 -I scripts/data/desa_waspada.py laju` | hindcast lokal (butuh `data/raw/firms`, tidak di CI) |
| `python3 -I scripts/data/insiden.py --uji` | tetap hijau bila kelas `Desa` dipindah (DW-01) |
| `node --test tests/desa-waspada/*.test.mjs` | halaman: format angka, keadaan kosong, penetral CSV, pemilih |
| `node --test tests/agen/gerbang-desa-waspada.test.mjs` | gerbang berkas publik dan kata |
| `npm run uji:desa` | menjalankan tiga di atas (dipasang di DW-00, masuk `npm run uji`) |
| `npm run uji:agen` | gerbang paket modul, ilmu agent, token warna, kartu standar tetap hijau |

## 2. Uji hindcast (F-3, kriteria terima 1 sampai 3)

Kriteria dikunci tertulis di berkas ini **sebelum** `desa_waspada.py laju` pertama dijalankan. Bawaan [SEMENTARA, Q2]:

| Ukuran | Lulus bila |
| ------ | ---------- |
| laju kelompok A | ≥ 3 kali laju "semua lainnya", `n_A ≥ 200` desa-minggu, batas bawah Wilson A > laju "semua lainnya" |
| laju kelompok B | ≥ 2 kali laju "semua lainnya", `n_B ≥ 200`, batas bawah Wilson B > laju "semua lainnya" |
| periksa kepekaan | NOAA-20 2023 (`viirs_n20_2023.csv`) dan metode tahun alternatif (Q3, Q4) juga lulus; tidak lulus = vonis akhir `gagal` untuk klaim "lebih mungkin", angka tetap tampil dengan keterangan |

Prosedur:

1. Tulis ambang di atas (bila pemilik mengubah Q2, ubah di sini dulu) dan commit sebelum menjalankan.
2. Jalankan `laju` pada S-NPP 2023 (Juli sampai Oktober), lalu NOAA-20, lalu metode B1 alternatif.
3. Catat per kelompok: `n`, `ya`, `laju`, Wilson 95%; juga persen titik dekat batas desa (D6 ALGORITMA) dan jumlah desa tanpa riwayat.
4. Kegagalan ditulis jujur; hasil jelek tidak disembunyikan, dan ambang tidak diubah sesudah melihat angka.
5. Vonis `belum|lulus_sementara|lulus|gagal` masuk `laju.status` keluaran. Pil hipotesis dilepas hanya pada `lulus`, dan `lulus` hanya ditulis sesudah pemilik menjawab Q2 (ambang di atas sementara, angkanya tebakan perancang); `lulus_sementara` tetap berpil hipotesis.
6. Bandingkan dengan laju pembanding (39% dan 11,6% dari mereka) hanya di catatan hasil uji, bukan di layar.

Peringatan baca: hindcast mengukur persen desa-minggu yang punya titik minggu berikutnya, termasuk desa luas yang hampir selalu punya titik di mana saja (kelompok A condong ke desa besar). Hasil ditulis dengan keterangan itu, dan DW-03 mencatat laju A per kuartil luas desa bila luas tersedia.

## 3. Uji fungsi murni (`desa_waspada.py --uji`)

| Kasus | Harapan |
| ----- | ------- |
| titik VIIRS n di poligon A | `titik7 = 1` untuk A |
| titik MODIS (`sensor M`) | tidak dihitung |
| titik keyakinan 0 (rendah) | tidak dihitung |
| dua baris petak sama hari WIB sama | dihitung 1 |
| petak sama beda hari WIB | dihitung 2 |
| `jam = -168,0` | termasuk; `-168,1` | tidak termasuk |
| `jam = -24` | masuk `titik24`; `-24,1` tidak |
| desa dengan 0 titik 7 hari dan `tahun = 3` | di B |
| desa dengan 0 titik 7 hari dan `tahun = 2` | tidak di B |
| desa dengan 1 titik 7 hari dan `tahun = 5` | di A, bukan di B |
| 301 desa B dalam satu provinsi | 300 tampil, `terpotong_per_prov` terisi |
| kab tak ada di `prediksi.json` | `p1..p3 = null`, bukan 0 |
| `prediksi.json` tertua dari 36 jam | semua `p` null |
| `gambut` provinsi tanpa fitur | `null`; `0` hanya bila dihitung 0 |
| poligon lebih kecil dari kisi | `n = 1`, titik tengah digeser ke dalam |
| titik di laut | `tanpa_desa` bertambah, tidak ada desa baru |
| Wilson `k = 0, n = 0` | `null`; `k = 0, n = 50` | batas bawah 0 |
| desa tanpa baris di `desa_statik.json` | `tahun = null` (kurang dari 3), bukan 0 |
| `laju.status` | `belum` bila `desa_waspada_laju.json` tak ada |
| bentuk nyata `hotspot.json` | fixture memakai `wilayah:["11|Aceh Barat|Arongan Lambalek"]`, `baris:[lat, lon, jam, sensor, frp, keyakinan, wilayah, tgl_wib]` (bukan bentuk karangan) |
| bentuk nyata `riwayat_petak.bin` | fixture dibuat lewat `riwayat_petak.simpan` bukan format ciptaan |
| kab4 | `"11.01.01.2001"` → `"1101"` |
| titik di poligon dua kab | desa pertama menang (sama dengan `insiden.Desa.cari`) |

## 4. Periksa manual (kriteria terima 5)

Pilih **3 desa** di tiga provinsi berbeda (satu Riau atau Jambi, satu Kalimantan, satu Nusa Tenggara atau Papua Selatan) sebelum melihat angka; tiap desa dari daftar A:

- titik 7 hari dibandingkan dengan peta titik (`hotspot.json` yang sama) dan batas desa: ≥ 80% titik benar berada di poligon yang disebut;
- tahun terbakar dibandingkan dengan peta riwayat petak lokal (`riwayat_petak.py` memuat petak ≥ 3 tahun di desa itu);
- porsi gambut dibandingkan dengan peta gambut: selisih ≤ 20 poin persen [SEMENTARA].

Ditulis pemeriksa bersih di `tests/desa-waspada/hasil_manual.md` dengan tanggal dan angka.

## 5. Gerbang berkas publik (`gerbang-desa-waspada.test.mjs`)

Pola `gerbang-insiden-kaya.test.mjs`. Memeriksa `public/data/desa_waspada.json`, dan berkas halaman:

1. Ukuran ≤ 450 KB.
2. Kunci wajib ada (`versi`, `dibuat`, `acuan`, `definisi`, `kolom`, `a`, `b`, `peluang`, `laju`, `batasan`).
3. Tidak ada kunci `sel`, `petak`, `titik`, `nama_orang`, `konsesi`, `pemilik`.
4. `lon` dan `lat` per baris ≤ 3 desimal.
5. Tidak ada nilai 0 pada `gambut` dan `p1..p3` kecuali kolom dihitung (gerbang memeriksa bahwa `null` ada di kasus kosong lewat fixture negatif).
6. `laju.kelompok.*.laju` tidak sama dengan 0,39 atau 0,116 persis (angka pembanding).
7. Teks halaman dan `batasan` tidak memuat kata: pelaku, penyebab, rawan dibakar, aman, bebas api, padam, titik api.
8. Tanpa pemisah "·" di teks halaman dan JSON.
9. Setiap kolom CSV di halaman sesuai DESAIN-TEKNIS §4 (16 kolom, urutan).
10. Fungsi penetral CSV mengawali apostrof pada `=`, `+`, `-`, `@`.
11. Layar `desa-waspada` masuk daftar `LAYAR` di `gerbang-kartu-std` dan `gerbang-tanpa-kesimpulan`.
12. `public/desa-waspada/**` tidak mengandung literal warna di luar `tema.css` (`gerbang-token-warna`).
13. Mode gagal: fixture pelanggar (kunci terlarang, 4 desimal, kata terlarang) membuat gerbang merah.

## 6. Uji layar dan INP

- Tinjau `http://localhost:8800/desa-waspada` (server tinjau menyajikan kode lokal dan berkas data produksi).
- INP: ganti provinsi, ganti kabupaten, urut kolom, klik baris, ekspor CSV, masing-masing < 200 ms dengan `?perf` pada daftar A terbesar.
- Tiga lebar: 375, 768, 1280 px; tanpa gulir horizontal halaman.
- Mode gelap bila tema mendukung; fokus papan ketik.

## 7. Uji ketahanan pipeline

| Kasus | Harapan |
| ----- | ------- |
| `hotspot.json` hilang | langkah keluar dengan `::warning`, berkas lama dibiarkan |
| `prediksi.json` hilang | daftar tetap terbit, `p* = null`, `peluang.status = "tak ada"` |
| `desa_statik.json` hilang | daftar A tetap terbit, daftar B `[]` dengan `batasan` memuat alasan |
| `desa_waspada_laju.json` hilang | `laju.status = "belum"` |
| kab tanpa berkas poligon | titik di kab itu masuk `tanpa_desa`, bukan error |
| jalan dua kali pada masukan sama | keluaran identik byte per byte (tanpa `dibuat` yang sama; `dibuat` boleh beda) |

## 8. Urutan bukti per tiket

1. Fungsi murni (`--uji`) hijau sebelum mesin ditulis ke berkas.
2. Berkas contoh dari data nyata (satu putaran), ukuran dan waktu tercatat.
3. Gerbang hijau pada keluaran asli dan merah pada pelanggar contoh.
4. `validasi-model` membaca hindcast (kebocoran, definisi, selang) sebelum angka tampil.
5. Pemilik meninjau layar di lokal sebelum terbit.
