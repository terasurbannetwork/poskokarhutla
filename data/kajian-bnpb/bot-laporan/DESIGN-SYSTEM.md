# DESIGN-SYSTEM: Bot WA pembuat laporan

Permukaan utamanya chat WA, jadi "komponen" di sini adalah templat pesan. Deck mengikuti generator dan skill `ppt-konsultan` yang sudah ada; paket ini tidak menambah gaya slide.

## Aturan teks pesan (pemilik 18 Nov 2026: balasan lama "padet banget"; enak dibaca di HP)

Teks akhir tiap jenis pesan, persis seperti yang dilihat pemakai, ada di `CONTOH-PESAN.md`. Kode: `scripts/wa/proyek.mjs` (`susun`, `MENU`), `perintah.mjs`, `daftar.cjs`, `arah.cjs` (`teksTerlewat`), `claude.mjs` (`PESAN`).

- **Format WhatsApp saja.** `*tebal*` untuk baris pertama dan label bagian (`*Catatan:*`, `*Membuat laporan*`); `_miring_` untuk baris kode proyek; perintah ditulis tebal (`*final*`, `*buat saja*`). Tanpa judul Markdown (`#`), tanpa pagar kode.
- **Baris 1 = apa yang terjadi**, tebal, paling banyak sekitar 5 kata: `*Draf v2 siap*`, `*Laporan selesai*`, `*Bahan belum lengkap*`.
- **Baris 2 = kode proyek miring** bila pesan menyangkut proyek: `_P-181126-01, versi 2_` atau `_P-181126-01_` sebelum ada versi. Kode dan versi dipisah koma, tidak pernah dengan titik tengah.
- **Baris pendek, satu gagasan per baris**, baris kosong di antara bagian, paling banyak sekitar 12 baris per pesan (pesan bantuan boleh lebih karena rujukan). Daftar memakai `1.` atau `- `. Angka memakai titik ribuan: 1.284 ha.
- **Bahasa Indonesia sopan dan lugas.** Tanpa gw/lu, "Anda" jarang atau tidak sama sekali, tanpa "silakan" berulang. Tanpa titik tengah, tanpa em dash dan en dash, tanpa emoji.
- **Galat = apa yang terjadi DAN langkah berikutnya**, keduanya dalam satu atau dua baris pendek: "Draf v1 tetap berlaku. Pemilik sudah dikabari, kirim revisinya lagi nanti."
- **Keterangan gambar pratinjau dan PDF tetap pendek** (WA hanya menampilkan sedikit baris): PDF dan PPTX cukup judul, kode, nama laporan. Ringkasan draf v1 menempel di gambar pratinjau; ringkasan revisi menempel di PDF (dua kiriman per draf, Q1).
- Angka sistem disertai asalnya: "dari sistem (hari D-1)".
- Satu pesan per kejadian; jangan memecah satu jawaban jadi beberapa pesan (limiter, Q1).
- Kabar galat ke pemilik memakai judul tetap `*Galat bot laporan*`, kode proyek, apa yang gagal, lalu rincian teknis dipotong.

## Menu bernomor (pemilik 18 Nov 2026)

Tiap pesan draf (v1 dan revisi) diakhiri:

```
*Balas angka:*
1 Final
2 Minta PPTX
3 Lihat versi
4 Batal

Atau tulis perubahan dengan kalimat biasa.
```

- Angka `1` sampai `4` saja (boleh berspasi atau bertitik, mis. `2.`) dari pemegang proyek berstatus `draf` dipetakan ke `final`, `pptx`, `versi`, `batal` di `parsePerintah` dan `klasifikasi`. Angka itu perintah: tidak pernah revisi, tidak pernah ke Claude, tidak diteruskan ke Worker (`arah.cjs` `KATA_PROYEK`).
- Di luar draf, angka dijawab petunjuk singkat: ketik `*buat*` dulu.
- `4` bertanya sekali: "Ketik *ya* untuk membatalkan P-...". `ya` dalam 5 menit membatalkan proyek yang ditanyakan (`~/.wa-bot/proyek/konfirmasi.json`). Lewat 5 menit, atau pemegang mengirim pesan lain dulu, tanya itu hangus dan `ya` kembali kalimat biasa. Mengetik `batal` langsung tetap membatalkan tanpa tanya (perilaku lama).
- Pesan lain apa pun dari pengirim itu menghapus tanya batal: pesan yang sampai ke mesin proyek (termasuk `bantuan` dan pesan diteruskan), dan perintah pemilik yang ditangani `perintah.mjs` (`kirim ulang`, `status <tanggal>`; gateway memanggil `proyek.hapusKonfirmasi`).
- Pesan berlabel Diteruskan tidak pernah jadi angka menu atau `ya`: selalu bahan (`arah.cjs`, `klasifikasi`, `tangani`).
- Pemegang beberapa draf: angka berlaku untuk proyek yang menunya terakhir dikirim ke pengirim itu (`~/.wa-bot/proyek/menu.json`). Tanpa catatan itu mesin tidak menebak: balasannya daftar kode draf dan contoh perintah berkode (`final P-181126-02`; juga `pptx`, `versi`, `batal` berkode).

## Templat

| Kode | Kapan | Isi |
| --- | --- | --- |
| T-BUKA + T-DRAF v1 | draf v1 jadi (keterangan gambar pratinjau slide 1) | `*Draf v1 siap*`, kode, nama laporan, bahan per jenis, kalimat angka sistem (penanganan), `*Catatan:*`, `*Pemeriksaan:*`, menu bernomor |
| T-TANYA | A3 tidak kosong | `*Bahan belum lengkap*`, kode, pertanyaan bernomor, "Kirim jawabannya lalu ketik *buat*, atau ketik *buat saja* untuk lanjut dengan bahan yang ada." |
| T-PRATINJAU | gambar slide revisi | `*Pratinjau slide N*`, kode, satu baris |
| T-PDF | PDF draf v1 | `*PDF draf vN*`, kode, nama laporan |
| T-DRAF revisi | PDF revisi terkirim | `*Draf vN siap*`, kode, nama laporan, `*Perubahan:*`, `*Tidak diubah:*`, `*Dilewati:*`, `*Catatan:*`, `*Pemeriksaan:*`, menu bernomor |
| T-TOLAK-KUNCI | operasi menyentuh angka terkunci | `*Revisi tidak diterapkan*`, kode, "Draf tetap vN.", nama angka, nilai, asal, tawaran catatan dengan contoh |
| T-VERSI | `versi` atau `3` | `*Riwayat versi*`, kode, daftar `- vN tanggal jam, instruksi`, cara `*balik v1*` |
| T-BATAL-TANYA | `4` | `*Batalkan proyek ini?*`, kode, "Ketik *ya* untuk membatalkan P-..., tanpa unggah.", berlaku 5 menit |
| T-FINAL | closing selesai | `*Laporan selesai*`, kode, versi final, tautan folder Drive di baris sendiri, `*Riwayat versi:*`, proyek ditutup |
| T-STATUS | `status` | `*Proyek terbuka*`, per proyek: kode, nama laporan, `Status: ...`, langkah berikutnya |
| T-BANTUAN | `bantuan` | `*Cara pakai bot laporan*`, bagian `*Membuat laporan*`, `*Saat draf*`, `*Lainnya*` (perintah tebal + 2 sampai 5 kata), satu baris contoh; `*Khusus pemilik*` hanya untuk pemilik |
| T-DAFTAR | nomor asing, paling banyak sekali sehari per nomor | `*Nomor belum terdaftar*`, cara mendaftar `*daftar nama, instansi*`, contoh |
| T-TERLEWAT | mesin menyala, nomor itu sempat mengirim pesan saat mati (sekali per nomor) | `*Pesan belum diproses*`, jam mati sampai menyala, "Kirim ulang bila masih perlu." |
| T-ATURAN | usulan aturan tetap ke pemilik | pola, 3 contoh, `setuju` atau `tolak` (belum dibangun) |
| T-KUOTA | batas belanja | `*Kuota hari ini habis*`, kode, lanjut besok |

## Tampilan di tab Pelaporan (`/pelaporan`, `#p-pelaporan` di `public/index.html`, arsip di `public/arsip_laporan.js`)

Daftar proyek bot memakai kartu standar `.ex.ex-std` (AGENTS 3.5): kepala kartu "Proyek bot laporan", tabel dengan kolom Kode, Jenis, Tanggal, Pemegang (nama dari akun, bukan nomor), Versi, Status, Drive. Status memakai pil bawaan layar itu. Tanpa kalimat kesimpulan di kepala kartu. Baris "Mesin bot" menampilkan detak terakhir. Layar milik `layar-peta`; ditinjau di `http://localhost:8800/pelaporan`.
