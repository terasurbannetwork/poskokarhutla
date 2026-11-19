# PRD: Bot WA pembuat laporan dengan Claude API

## Tujuan

Nomor terdaftar mem-forward pesan atau dokumen ke bot WA, mengetik `buat`, lalu menerima draf laporan dalam sekitar satu menit. Draf direvisi dengan kalimat biasa sampai pemakai mengetik `final`, lalu hasilnya diunggah ke Drive tim IT BNPB. Tidak ada orang yang perlu membuka aplikasi Claude.

## Peran

| Peran | Bisa |
| --- | --- |
| Nomor terdaftar | Mengirim bahan, `buat`, revisi, `final`, `batal`, `versi`, `balik vN`, `pptx`, `status` |
| Pemilik (nomor PEMILIK) | Semua di atas, `setuju <nomor> [nama]` dan `tolak <nomor>` untuk mendaftarkan dan mencabut nomor, menyetujui atau menolak usulan aturan tetap |
| Nomor tidak terdaftar | Hanya menerima balasan "Bot ini hanya bisa dipakai nomor yang terdaftar" (K19) |

## Fitur

| ID | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Penerimaan bahan dari nomor terdaftar (teks, PDF, foto, Excel), dikumpulkan ke proyek terbuka | K6, Q6 |
| F-2 | Perintah `buat <jenis>`: buka proyek, kenali jenis laporan, ambil angka sistem | K2, K4 |
| F-3 | Pemeriksaan kelengkapan dan pertentangan bahan sebelum membangun; bot bertanya | K8, Q13 |
| F-4 | Urai bahan dengan Claude API ke isian berkutipan | D1, D2 |
| F-5 | Bangun deck dengan generator yang ada, pratinjau slide, PDF | D1, D8 |
| F-6 | Pemeriksaan otomatis: gerbang format, gerbang bahasa, banding 7 hari | K9, Q11 |
| F-7 | Revisi dengan kalimat biasa: Claude menulis operasi ubah, deck dibangun ulang | K2, D1, D6 |
| F-8 | Kunci angka sistem; tawaran catatan sebagai gantinya | K4, D3 |
| F-9 | Riwayat versi, `versi`, `balik vN` | D6 |
| F-10 | `final`: kirim PPTX dan PDF, unggah ke Drive tim IT, simpan ke `/pelaporan`, kunci proyek | K7, Q9 |
| F-11 | Pendaftaran nomor (`daftar`, disetujui pemilik); akun `/masuk` tidak otomatis | K6, Q8, D10 |
| F-12 | Usulan aturan tetap dari revisi berulang | K10, Q12 |
| F-13 | Pesan selama mesin mati dibuang untuk bot proyek, pengirimnya diberi tahu sekali; status mesin di tab Pelaporan | K11, Q2 |
| F-14 | Batas belanja harian | Q5 |
| F-15 | Uji balik terhadap arsip sebagai ukuran kemiripan | K5 |

## Larangan

- Claude tidak menulis atau mengubah angka hotspot, firespot, luas terbakar, dan luas belum padam.
- Claude tidak menyunting PPTX langsung dan tidak membuat jenis laporan yang belum punya generator.
- Versi lama tidak pernah ditimpa atau dihapus lewat rute.
- Bot tidak membalas nomor tidak terdaftar selain pesan "nomor belum terdaftar", dan tidak pernah mengirim data laporan kepadanya.
- Bot tidak membuat draf atas inisiatif sendiri (K12).
- Jalur terjadwal `otomatis.mjs` tidak diubah perilakunya (D9).
- Tidak ada kunci API, token Drive, atau nomor HP di berkas yang dilacak git.

## Ukuran keberhasilan

- Uji balik 20 hari arsip: angka sistem sama 100 persen; medan dari bahan sama minimal 95 persen; teks slide sama minimal 90 persen per slide (dihitung di BL-17).
- Draf pertama sampai di WA paling lama 120 detik sesudah `buat` pada 9 dari 10 percobaan.
- Revisi rata-rata per proyek turun dari minggu pertama ke minggu keempat.

## V2: agen Claude Code (K22-K24)

### Tujuan V2

Draf dan revisi lewat WA sepintar saat pemilik membuat laporan langsung di aplikasi Claude: mengikuti laporan kemarin, memahami jawaban singkat dalam percakapan, dan bisa menjalankan revisi tata letak (hapus atau lebarkan panel, pindah urutan, ubah tabel), tanpa membuka aplikasi.

### Fitur V2

| ID | Fitur |
| --- | --- |
| F-V2-1 | `lanjut` dengan `BL_VERSI=2`: mesin membangun deck dasar dengan generator, menyiapkan ruang kerja (bahan, laporan kemarin, deck dasar), lalu agen menyempurnakannya mengikuti pedoman dan laporan kemarin. |
| F-V2-2 | Revisi kalimat biasa dikerjakan agen di sesi yang sama dengan pembuatan draf; perubahan apa pun pada deck boleh, kecuali angka sistem. |
| F-V2-3 | Agen boleh bertanya balik (`tanya`); jawaban berikutnya melanjutkan percakapan yang sama. |
| F-V2-4 | Pagar angka sistem sesudah tiap jalan agen; gagal = draf ditolak. |
| F-V2-5 | Ringkasan perubahan dan catatan agen (termasuk kejadian yang diteruskan dari laporan kemarin) masuk keterangan draf. |
| F-V2-6 | Biaya agen dihitung ke batas harian yang sama dengan V1. |

Yang tidak berubah dari V1: perintah, daftar bahan dan `lanjut` (K17), status satelit (K18), versi, `balik`, `pptx`, `final` ke Drive, nomor terdaftar, limiter.

### Bukan bagian V2

Agen tidak mengirim WA, tidak mengunggah, tidak commit atau push, tidak mengubah kode generator (Q18), dan tidak membuat jenis laporan baru tanpa generator.

### Ukuran berhasil V2

- Revisi tata letak yang tidak bisa dijalankan V1 (contoh 18 Nov: "panel omc dan hujan hapus, jadinya panel armada udara memenuhi slide") selesai dalam satu revisi.
- Jawaban singkat atas pertanyaan agen ("ya", "yang itu") langsung diterapkan.
- Uji banding 3 hari (BV-08): pemilik menilai draf V2 lebih dekat ke laporan finalnya daripada draf V1 pada tiap hari uji.
- Draf V2 sampai paling lama 6 menit sesudah `lanjut` pada 9 dari 10 percobaan; biaya rata-rata per laporan di bawah bawaan Q15.
