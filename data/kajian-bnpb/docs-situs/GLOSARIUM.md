# Glosarium

| Istilah | Arti |
| --- | --- |
| Docs | Situs dokumentasi Centurisk97 di `/docs`; menjelaskan cara memakai dan cara kerja metode |
| Topik | Satu berkas sumber `NN-slug.md` dan satu halaman keluaran `/docs/<slug>` |
| Bagian baku | Lima bagian tiap topik: Ringkasan, Panduan pengguna, Metode, Referensi teknis, Batasan |
| Sudut pembaca | Pilihan Pengguna, Pengembang, atau Semua yang menyaring bagian yang tampil |
| Pengguna | Pembaca yang memakai layar dan membaca angka, tanpa perlu membuka kode |
| Pengembang | Pembaca yang merawat atau menyambung kode repo |
| Metode | Rumus, ambang, cara uji, dan status model di dalam sistem, ditulis terbuka (K3) |
| Referensi teknis | Berkas, rute, tabel, skema, jadwal, dan hak akses, dengan rujukan ke kode |
| Rujukan `berkas:baris` | Penunjuk ke berkas kode dan nomor baris; diperiksa mesin bahwa berkas ada dan baris dalam rentang |
| Hipotesis | Status model yang belum lulus uji balik; tampil sebagai pil khusus |
| Uji balik | Pengujian model terhadap kejadian yang sudah diketahui, untuk mengukur ketepatannya |
| Belum terukur | Nilai yang belum bisa dihitung; berbeda dari 0, yang berarti sudah dihitung dan hasilnya nol |
| Belum terdokumentasi di kode | Frasa baku bila penulis tidak menemukan sumber klaim di repo; menggantikan tebakan |
| Indeks cari | `cari.json`, daftar teks polos per bagian yang dicari di peramban |
| Generator | `scripts/docs/bangun.py`, pengubah Markdown menjadi HTML statis dan indeks cari |
| Keluaran segar | Keadaan saat `public/docs/` sama dengan hasil bangun dari sumber; dijaga `--cek` |
| Alias subdomain | Alamat `docs.centurisk97.id` yang menjawab isi yang sama dengan `/docs` (K2) |
| `HTML_RUTE` | Daftar di `src/worker.js` yang memetakan jalur halaman ke berkas aset |
| `PUBLIK_TANPA_SESI` | Daftar jalur di `src/worker.js` yang boleh dibuka tanpa login di host terkunci |
| Host terkunci | Host yang halamannya di balik login secara bawaan (`centurisk97.id` dan alamat workers.dev produksi) |
| Kartu standar | Kartu `.ex.ex-std` dari `public/inti/kartu.css`: pil kategori, nama seksi, isi |
| Token | Variabel desain di `public/inti/tema.css` yang dipakai lewat `var(--...)` |
| Ratchet | Gerbang yang daftar sisanya hanya boleh menyusut |
| Paket dokumen | Sebelas dokumen modul di `data/kajian-bnpb/<modul>/` yang harus ada sebelum kode (AGENTS.md §3.7) |
| Pengerja pemilik | Agent yang memiliki sebuah berkas kode menurut peta modul |
| Pemeriksa konteks bersih | Subagent baru tanpa riwayat penulis yang memeriksa hasil kerja (AGENTS.md §3.2) |
