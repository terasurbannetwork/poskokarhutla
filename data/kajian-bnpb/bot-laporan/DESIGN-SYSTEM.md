# DESIGN-SYSTEM: Bot WA pembuat laporan

Permukaan utamanya chat WA, jadi "komponen" di sini adalah templat pesan. Deck mengikuti generator dan skill `ppt-konsultan` yang sudah ada; paket ini tidak menambah gaya slide.

## Aturan teks pesan

- Bahasa Indonesia kalimat utuh, singkat. Tanpa tanda titik tengah dan tanpa em dash (aturan caption `wa-bot`).
- Baris pertama selalu kode proyek dan versi bila ada: `P-181126-01 v2`.
- Angka disertai asalnya bila itu angka sistem: "luas terbakar 1.284 ha (sistem, hari D-1)".
- Satu pesan per kejadian; jangan memecah satu jawaban jadi beberapa pesan (limiter, Q1).
- Tanpa emoji.

## Templat

| Kode | Kapan | Isi |
| --- | --- | --- |
| T-BUKA | `buat` diterima | kode proyek, jenis, tanggal, jumlah bahan per jenis, angka sistem, "membangun draf v1" |
| T-TANYA | A3 tidak kosong | pertanyaan bernomor, cara menjawab, `buat saja` |
| T-PRATINJAU | gambar slide | keterangan "Pratinjau vN, slide a dan b" |
| T-DRAF | PDF terkirim | kode dan versi, ringkasan perubahan (untuk revisi), peringatan pemeriksaan, "balas revisi atau ketik final" |
| T-TOLAK-KUNCI | operasi menyentuh angka terkunci | nama angka, nilai, asal, tawaran catatan |
| T-FINAL | closing selesai | versi final, tautan folder Drive, riwayat versi dengan jam |
| T-DAFTAR | nomor asing, paling banyak sekali sehari per nomor | cara mendaftar: ketik `daftar <nama> <instansi>` |
| T-TERLEWAT | mesin menyala, nomor itu sempat mengirim pesan saat mati (sekali per nomor) | jam mati sampai menyala, "pesan di jam itu tidak diproses, kirim ulang bila masih perlu" |
| T-ATURAN | usulan aturan tetap ke pemilik | pola, 3 contoh, `setuju` atau `tolak` |
| T-KUOTA | batas belanja | kuota habis, lanjut besok |

## Tampilan di tab Pelaporan (`/pelaporan`, `#p-pelaporan` di `public/index.html`, arsip di `public/arsip_laporan.js`)

Daftar proyek bot memakai kartu standar `.ex.ex-std` (AGENTS 3.5): kepala kartu "Proyek bot laporan", tabel dengan kolom Kode, Jenis, Tanggal, Pemegang (nama dari akun, bukan nomor), Versi, Status, Drive. Status memakai pil bawaan layar itu. Tanpa kalimat kesimpulan di kepala kartu. Baris "Mesin bot" menampilkan detak terakhir. Layar milik `layar-peta`; ditinjau di `http://localhost:8800/pelaporan`.
