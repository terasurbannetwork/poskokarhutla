# PRD: Tangga Peringatan

## Tujuan

Staf BNPB dan BPBD melihat, untuk satu kabupaten/kota, apa yang sudah dinyatakan pada tiap skala waktu, dari musim sampai jam, sehingga tahu kapan mulai siaga. Dua ancaman tampak bersamaan: kering (kekeringan, karhutla, asap) dan basah (banjir, longsor).

## Pengguna

Staf pusdalops dan BPBD. Alat bantu staf, bukan peringatan publik.

## Fitur

| ID | Fitur | Kriteria terima |
| --- | --- | --- |
| F1 | `tangga.json` per kode kabupaten, ditulis `scripts/prediksi/tangga.py`, dibaca sekali oleh layar. | Memuat 514 kabupaten; skala musim, bulan, dasarian, 10 hari, sepekan, 3 hari, jam. |
| F2 | Tab "Tangga" di `/prediksi`: pilih provinsi lalu kabupaten, tangga vertikal per skala, dua kolom ancaman (kering, basah). | Tiap anak tangga menampilkan pil tingkat, kalimat, lembaga, tanggal, cakupan. |
| F3 | Anak tangga tanpa data tertulis "belum ada data"; anak tangga yang sumbernya ada tetapi tidak menyebut kabupaten/provinsi itu tertulis "tidak disebut". | Tidak ada kata "aman". |
| F4 | Sinyal "menguat", "searah", dan "belum selaras" per ancaman, dengan aturan terbuka (tautan ke teks aturan di layar). | Aturan tampil di layar; tidak ada persen atau kata "peluang" untuk sinyal. |
| F5 | Daftar kabupaten "menguat" per provinsi, dapat disaring per ancaman. | Daftar dan jumlah cocok dengan `tangga.json`. |
| F6 | Arsip harian `tangga_arsip/YYYY-MM.jsonl`, append-only. | Jalan ulang hari yang sama tidak menimpa. |

## Larangan

Menulis "aman". Mengklaim pernyataan provinsi sebagai kabupaten. Menjadikan warna peta sebagai angka. Skor gabungan BMKG dan kita. Mengarang masukan yang hilang. Memakai Awan Himawari sebagai peringatan. Memakai "Pantau Bencana" di layar atau dokumen. Menyentuh worker, D1, workflow.

## Di luar lingkup

Pemetaan ZOM ke kabupaten (Q1), kecamatan ke kabupaten (Q6), SPI dari PDF (Q5), peringatan ke warga, notifikasi.
