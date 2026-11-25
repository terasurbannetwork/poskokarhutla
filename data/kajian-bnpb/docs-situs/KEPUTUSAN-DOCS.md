# Keputusan: Docs Centurisk97 di `/docs`

Dokumen ini menang atas semua dokumen lain di folder ini. Pertanyaan yang belum dijawab pemilik
ditulis dengan bawaan sementara bertanda **[bawaan]**, tidak dikarang.

## Keputusan pemilik

- **K1 (24 Nov 2026):** "docs ini termasuk metode2 yang ada di dalamnya ya". Docs dibuat untuk dua pembaca:
  pengguna (staf BNPB dan BPBD, instansi, warga yang membaca layar) dan pengembang (orang yang merawat atau
  menyambung kode Centurisk97).
- **K2 (24 Nov 2026):** Bentuk awal adalah halaman `/docs` di situs `centurisk97.id`. Alamat `docs.centurisk97.id`
  menyusul sebagai alias ke `/docs` tanpa menulis ulang isi (satu sumber isi, dua alamat).
- **K3 (24 Nov 2026):** Docs memuat metode yang ada di dalam sistem: rumus, ambang, cara uji balik, dan status
  hipotesis tiap model. Metode tidak diringkas menjadi slogan; pembaca bisa menelusuri ke berkas kode.
- **K4 (24 Nov 2026):** Penulisan isi dikerjakan paralel oleh banyak agent. Akibatnya isi dipecah menjadi 14
  berkas Markdown bernomor di `docs/centurisk97/` dengan kerangka bagian yang sama, supaya tiap agent bekerja
  tanpa saling menimpa dan generator bisa memeriksa kerangkanya.
- **K5 (24 Nov 2026):** Pemilik menolak tampilan pertama: "JELEK BGT TAMPILANNYA TERLALU PENUH", lalu "buat tampilannya kayak docs app
  pada umumnya, strukturnya jelas, tombol2nya jelas, pembagiannya jelas". Tampilan Docs mengikuti pola situs docs pada umumnya
  (kolom bacaan lega, bilah samping berkelompok, daftar isi kanan, tab, pencarian menonjol, terang bawaan), tanpa kartu pembungkus
  per bagian. Rancangannya di DESIGN-SYSTEM.md revisi 2 (DS-1 sampai DS-14).
- **K6 (24 Nov 2026):** "penjelasan pengguna dan pengembang jgn disatuin", "yg sekarang terlalu teknis sampe ada xxx.py dll", "yang untuk pengguna tuh harapannya pengguna tau itu metode perhitungan bencana/prediksi kyk gimana". Docs dipecah dua bagian: Panduan (pengguna, bahasa awam, metode dijelaskan tanpa nama berkas atau kode; sumber `docs/centurisk97/panduan/`) dan Pengembang (referensi teknis). Pemilih sudut Pengguna/Pengembang/Semua dihapus, diganti dua tab bagian.
- **K7 (24 Nov 2026):** "ini tuh terlalu padat untuk 1 halaman, coba kamu restructurize dan pecah2 lagi, sesuaikan juga desain2 dan halamannya". Satu modul tidak lagi satu halaman: modul menjadi kelompok berisi beberapa halaman pendek (satu metode satu halaman), dengan halaman depan modul; daftar "Di halaman ini" pendek.
- **K8 (24 Nov 2026):** "ini gausah ada 2 nav ini, satuin aja coba gayanya, gausah ada selector bencana juga, fokusin halamannya emg buat docs". Halaman Docs memakai SATU bilah atas khusus Docs (logo dan nama Docs Centurisk97, cari, tab Panduan dan Pengembang, tombol tema, tautan kembali ke situs), tanpa kepala situs navy bersama dan tanpa pemilih bencana. Ini mengecualikan Docs dari aturan kepala situs bersama.

## Rancangan yang mengikuti keputusan

| Kode | Rancangan | Dasar |
| --- | --- | --- |
| D1 | Sumber isi satu: Markdown di `docs/centurisk97/NN-slug.md`. Halaman HTML adalah keluaran, tidak disunting tangan | K2, K4 |
| D2 | Generator Python 3.12 stdlib `scripts/docs/bangun.py` mengubah Markdown menjadi `public/docs/**` dan indeks cari JSON | pipeline repo tanpa pip |
| D3 | Tiap berkas wajib lima bagian berurutan: Ringkasan, Panduan pengguna, Metode, Referensi teknis, Batasan | K1, K3 |
| D4 | Pembaca memilih sudut "Pengguna", "Pengembang", atau "Semua"; Ringkasan, Metode, dan Batasan tampil di semuanya | K1 |
| D5 | Rujukan `berkas:baris` di bagian teknis diperiksa mesin: berkas harus ada dan baris tidak melewati panjang berkas | tidak mengarang |
| D6 | Model yang belum lulus uji balik ditulis sebagai HIPOTESIS dan diberi pil khusus oleh generator | aturan repo |
| D7 | Pencarian memakai indeks JSON statis yang dicari di peramban, tanpa Worker dan tanpa D1 | Q3 [bawaan] |
| D8 | Halaman keluaran di-commit ke `public/docs/`, supaya tinjau lokal `http://localhost:8800/docs` jalan tanpa langkah bangun; gerbang uji memastikan keluaran tidak basi terhadap sumber | pola KATALOG agent |
| D9 | Pemilik berkas kode: agent baru `docs-situs` untuk `scripts/docs/**`, `public/docs/**`, `tests/docs/**`, `docs/centurisk97/**` | AGENTS.md §1.5 |
| D10 | Tampilan memakai token `public/inti/tema.css` dan kepala situs navy bersama; tanpa palet sendiri. Revisi 2: halaman topik polos tanpa kartu `.ex.ex-std` (kartu hanya di beranda), terang bawaan; lihat DESIGN-SYSTEM.md | K5, AGENTS.md §3.9 |

## Yang tidak dibuat

- Tidak ada penyunting isi di peramban dan tidak ada tulis lewat API; isi berubah lewat commit.
- Tidak ada pembuat dokumen otomatis dari kode (docstring); isi ditulis dan diperiksa manusia atau agent.
- Tidak ada salinan docs di dalam folder modul lain; paket kajian `data/kajian-bnpb/<modul>/` tetap sumber
  keputusan, Docs hanya merangkum dan menautkannya.
- Tidak ada rahasia, nomor pribadi, atau nama orang di Docs (repo ini publik).

## Pertanyaan terbuka

| Kode | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q1 | Apakah bagian Referensi teknis dibuka untuk umum atau di balik sesi? | **[bawaan]** publik, karena repo publik dan Docs tidak memuat rahasia. Dibuka di `PUBLIK_TANPA_SESI` sebagai awalan `/docs`. Belum diputuskan pemilik |
| Q2 | Apakah angka pengaman penyalahgunaan (batas laju, panjang kode sekali pakai) ikut ditulis? | **[bawaan]** tidak ditulis nilainya; tertulis ada pembatasnya dan rujukan berkasnya |
| Q3 | Apakah Docs memakai pencarian di peramban atau layanan pencarian? | **[bawaan]** indeks JSON statis di peramban |
| Q4 | Apakah Docs juga tersedia dalam bahasa Inggris? | **[bawaan]** Indonesia dulu; versi Inggris menunggu pemilik (tiket DC-10) |
| Q5 | Kapan `docs.centurisk97.id` dibuka? | **[bawaan]** sesudah `/docs` stabil dan pemilik menyediakan DNS dan rute; tiket DC-06 |
| Q6 | Siapa menyetujui kebenaran isi tiap berkas Docs? | **[bawaan]** pengerja pemilik modul memeriksa berkas yang menyangkut modulnya (DC-07), pemilik repo menyetujui terbit |
| Q7 | Apakah Docs ditautkan di kepala situs dan kaki halaman? | **[bawaan]** tautan "Docs" hanya di kaki Docs sendiri (`public/kaki.js` tidak cocok, DESAIN-TEKNIS T2); tautan dari halaman lain dan kepala situs menunggu pemilik menjawab |
| Q8 | Apakah riwayat versi Docs ditampilkan ke pembaca? | **[bawaan]** tidak; riwayat cukup di git, halaman hanya memuat tanggal bangun |
| Q9 | Apakah kepala tabel Docs rata kiri? | **[bawaan]** rata kiri, karena isi tabel berupa teks; belum diputuskan pemilik |
| Q10 | Apakah teks isi Docs rata kiri-kanan (justify) seperti kebiasaan dokumen pemilik? | **[bawaan]** rata kiri, karena kolom isi 760 px memuat kode dan kata panjang yang membuat celah lebar; belum diputuskan pemilik |
| Q11 | Apakah halaman topik memuat tombol "Apakah halaman ini membantu?" dan ke mana jawaban dikirim? | **[bawaan]** tidak dibuat sampai tujuan jawaban diputuskan pemilik |
