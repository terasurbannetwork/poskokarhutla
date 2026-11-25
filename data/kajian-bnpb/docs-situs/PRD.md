# PRD: Docs Centurisk97

## Tujuan

Satu tempat di situs yang menjelaskan cara memakai Centurisk97 dan cara kerja metode di dalamnya, untuk dua
pembaca (K1). Pengguna memahami layar, angka, dan batasnya. Pengembang menemukan berkas, rute, tabel, dan
rumus yang melandasinya. Metode dibuka, tidak disembunyikan (K3).

## Pembaca

| Pembaca | Kebutuhan | Bagian yang dipakai |
| --- | --- | --- |
| Staf BNPB dan BPBD | Memahami arti angka dan pil di layar, kapan angka belum bisa dipercaya | Ringkasan, Panduan pengguna, Metode, Batasan |
| Instansi mitra dan peneliti | Menilai metode, melihat status uji balik | Metode, Batasan, Referensi teknis |
| Pengembang repo | Menemukan berkas, rute, skema, jadwal workflow | Referensi teknis, Metode |
| Pemilik repo | Memeriksa bahwa klaim di Docs sama dengan kode | semua, dibantu pemeriksaan mesin |

## Fitur

| Kode | Fitur | Keterangan |
| --- | --- | --- |
| F-1 | Beranda `/docs` | Daftar 14 topik berupa kartu, kotak cari, pilihan sudut pembaca |
| F-2 | Halaman topik `/docs/<slug>` | Lima bagian baku, tiap bagian satu kartu standar |
| F-3 | Bilah samping | Daftar semua topik, topik aktif ditandai, ikut menggulir di layar lebar, jadi laci di HP |
| F-4 | Daftar isi halaman | Di kanan pada layar lebar; menyorot bagian yang sedang dibaca |
| F-5 | Sudut pembaca | Pengguna, Pengembang, atau Semua; menyembunyikan bagian yang tidak relevan; pilihan diingat per peramban |
| F-6 | Pencarian | Dari indeks JSON statis di peramban; hasil menunjuk ke bagian dan topik |
| F-7 | Pil status model | Kata HIPOTESIS, lulus, gagal, belum diuji di bagian Metode tampil sebagai pil berwarna status |
| F-8 | Rujukan kode | Tulisan `berkas:baris` tampil sebagai teks monospasi yang bisa disalin; tautan ke GitHub bila pemilik memutuskan alamat repo publik (belum diputuskan, bawaan sementara: tanpa tautan, tiket DC-02) |
| F-9 | Tabel | Kepala navy tua, rata kiri, bisa digulir datar di HP |
| F-10 | Mode gelap | Mengikuti tombol tema situs dan `prefers-color-scheme` |
| F-11 | Cetak | Halaman topik tercetak rapi A4 tanpa bilah samping (CSS cetak) |
| F-12 | Tanggal bangun | Tertera di kaki halaman, tanpa riwayat versi (Q8) |
| F-13 | Alias subdomain | `docs.centurisk97.id` menjawab sama dengan `/docs` (K2, tiket DC-06) |

## Kerangka isi (kontrak dengan penulis)

Tiap berkas `docs/centurisk97/NN-slug.md` memuat tepat satu judul tingkat 1 dan lima bagian tingkat 2 dengan nama
dan urutan ini: Ringkasan, Panduan pengguna, Metode, Referensi teknis, Batasan. Generator menolak berkas yang
menyimpang. Aturan tulis lain ada di `ALGORITMA.md` bagian 3 dan `RENCANA-UJI.md`.

## Larangan

- Tidak menulis nama produk lama; produk bernama Centurisk97.
- Tidak menulis kata terlarang di AGENTS.md (vonis tentang keadaan lapangan atau sebab kejadian); gerbang mesin
  menolaknya.
- Tidak ada titik tengah sebagai pemisah.
- Tidak ada rahasia, data pribadi, atau nama orang. Nama lembaga boleh.
- Angka, ambang, rumus, jadwal, rute, dan hak akses wajib bersumber dari kode atau dokumen repo; bila tidak
  ditemukan, ditulis "belum terdokumentasi di kode".
- Model tanpa uji balik lulus ditulis sebagai hipotesis.
- Kosong tidak ditulis sebagai nol; bagian Metode menjelaskan beda "belum terukur" dan 0 untuk modul yang
  membedakannya.
- Pertanyaan pemilik yang belum dijawab ditulis "belum diputuskan (bawaan sementara: ...)".

## Ukuran keberhasilan

- 14 topik terbit, tiap topik lulus pemeriksaan kerangka dan rujukan oleh mesin.
- Pembaca baru menemukan topik lewat pencarian dengan satu atau dua kata kunci.
- Tidak ada rujukan `berkas:baris` yang rusak pada saat terbit.
- Perubahan kode yang memindahkan baris rujukan membuat uji gagal sebelum deploy (rujukan diperbarui di commit
  yang sama).

## Di luar lingkup

Penyuntingan di peramban, komentar pembaca, versi Inggris (menunggu Q4), dokumentasi API otomatis dari skema,
buku kajian PDF (tetap di `data/kajian-bnpb/`).
