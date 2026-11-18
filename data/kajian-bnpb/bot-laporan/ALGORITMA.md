# ALGORITMA: Bot WA pembuat laporan

## A1. Nomor terdaftar

`terdaftar(n) = n ∈ WA_IZIN ∨ ∃ bl_daftar(wa_sha = sha(n), status = 'setuju')` (Q8: akun `/masuk` tidak otomatis terhitung). Nomor dinormalkan ke `62...` (`normalWa`) sebelum di-hash. Gateway memegang salinan himpunan `wa_sha` dari `GET /api/wa/terdaftar`, disegarkan tiap 5 menit dan segera sesudah `setuju` (D10), jadi tidak ada baca D1 per pesan. Grup WA tidak terhitung sebagai pemakai bot.

## A2. Pengenalan jenis laporan

1. Jenis disebut di perintah `buat <jenis>`: cocokkan ke daftar jenis yang punya generator (tahap 1: `harian`, `penanganan`).
2. Tidak disebut: kenali jenis tiap bahan memakai `kenali()` dari `src/wa_jenis.js`, lalu hitung kelengkapan `LAPORAN[].butuh` tiap jenis laporan. Satu jenis menang jelas (bahan butuhnya paling lengkap): pakai itu. Seri: tanya.

## A3. Bahan wajib dan pertentangan (K8)

- Kurang: bahan dalam `LAPORAN[].butuh` jenis itu (`scripts/wa/otomatis.mjs`) yang belum ada di proyek. Tanda `wajib` di `JENIS_LAPORAN` (`src/wa_jenis.js`) bersifat global per jenis bahan, bukan per laporan, jadi tidak dipakai di sini.
- Pertentangan: Claude diberi semua bahan teks dan diminta mendaftar pasangan nilai untuk medan yang sama yang berbeda (misal sorti 14 di teks lawan 12 di Excel), tiap nilai dengan kutipan. Pasangan tanpa kutipan dibuang.
- Kurang atau bentrok tidak kosong: satu pesan berisi semua pertanyaan, bernomor. Jawaban pemakai diurai Claude ke keputusan per nomor.

## A4. Urai berkutipan (D2)

Keluaran Claude per medan: `{medan, nilai, kutipan, sumber_bahan_id}`. Validator:
1. `kutipan` harus ditemukan di teks bahan `sumber_bahan_id` setelah normalisasi spasi dan huruf kecil.
2. Untuk medan angka, angka di `nilai` harus muncul di `kutipan` (setelah membuang pemisah ribuan titik dan koma).
3. Medan yang gagal dikosongkan dan dicatat di catatan draf "tidak terbaca dari bahan".
4. Medan angka sistem (A6) tidak ada di skema keluaran Claude sama sekali.

## A5. Operasi ubah (revisi, D1)

Inventaris shape: untuk tiap slide, daftar `{slide, shape, teks}` dari PPTX hasil generator (nama shape stabil, BL-06). Claude mengembalikan daftar operasi:

| Operasi | Isi |
| --- | --- |
| `ganti_teks` | slide, shape, teks_lama, teks_baru |
| `ganti_sel` | slide, shape, baris, kolom, teks_lama, teks_baru |
| `tambah_baris` | slide, shape (tabel atau daftar), setelah_baris, teks |
| `hapus_baris` | slide, shape, baris, teks_lama |
| `catatan` | slide, teks (kotak catatan kecil di kaki slide) |
| `sembunyikan_slide` / `tampilkan_slide` | slide |
| `tanya` | pertanyaan balik bila kalimat revisi ambigu |

Penerapan pada versi n: bangun ulang dari bahan, lalu operasi 1..n berurutan. Tiap operasi memeriksa `teks_lama` sama dengan teks saat itu; tidak sama (bahan berubah) berarti operasi itu dilewati dan pemakai ditanya.

## A6. Kunci angka sistem (D3)

Generator menulis manifest `kunci.json`: daftar `{slide, shape, sel?}` yang memuat angka hotspot, firespot, luas terbakar, luas belum padam. Operasi yang menyentuh entri manifest ditolak sebelum diterapkan. Jawaban bot: asal angka (sumber dan aturan hari D-1) dan tawaran `catatan`.

## A7. Banding 7 hari (K9, Q11)

Untuk tiap angka di manifest dan tiap medan angka bahan, ambil nilai dari versi final 7 hari terakhir jenis yang sama (D1 `bl_versi` status final, atau `laphar_riwayat.json` bila belum ada). Peringatan bila `nilai > 3 × median` atau `nilai < median / 3` (median > 0), atau `nilai = 0` sedangkan 7 nilai sebelumnya semua > 0. Kurang dari 3 nilai pembanding: tidak ada peringatan.

## A8. Pratinjau slide berubah (D8)

Slide berubah = slide yang teks inventarisnya beda dari versi sebelumnya (v1: slide 1 sampai 3). PNG dibuat dari PDF slide itu bila PDF sudah ada; bila belum, dari render cepat PPTX satu halaman. Maksimal 3 gambar per versi.

## A9. Aturan tetap (K10, Q12)

Label pola = `(jenis laporan, judul slide tempat ubahan, jenis operasi, ringkasan ubahan ≤ 8 kata)` dari Claude. Pola sama bila jenis, judul slide, dan jenis operasi sama dan ringkasannya dinilai Claude bermakna sama. Ambang: 3 kejadian dalam 14 hari dari minimal 2 proyek. Aturan yang disetujui disimpan sebagai operasi ubah bawaan dengan `teks_lama` berupa pola (bukan teks tetap) dan diterapkan sebelum operasi pemakai.

## A10. Batas belanja (Q5)

Biaya per panggilan dihitung dari `usage` respons dan harga model. Jumlah harian (WIB) di D1 `bl_biaya`. Lewat batas: panggilan Claude baru ditolak, pemakai dibalas "kuota hari ini habis, bot lanjut besok", pemilik dikabari sekali.
