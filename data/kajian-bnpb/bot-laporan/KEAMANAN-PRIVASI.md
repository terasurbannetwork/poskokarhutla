# KEAMANAN-PRIVASI: Bot WA pembuat laporan

## Matriks hak

| Aksi | Nomor tak terdaftar | Nomor terdaftar | Pemilik | Mesin (`WA_MESIN`) | Staf di `/pelaporan` |
| --- | --- | --- | --- | --- | --- |
| Kirim bahan, `buat`, revisi, `final` | tidak | ya, hanya proyek miliknya | ya | - | - |
| Menerima draf atau data laporan | tidak | hanya proyek miliknya | ya | - | - |
| `setuju`/`tolak` pendaftaran dan aturan tetap | tidak | tidak | ya | - | - |
| Rute `/api/wa/proyek*` | - | - | - | ya | baca daftar saja |

## Data yang keluar ke Anthropic

- Hanya teks: isi bahan teks, teks hasil ekstraksi PDF dan foto (K15; berkas asli tidak dikirim), Excel sebagai teks, inventaris shape, dan kalimat revisi.
- Sebelum dikirim, mesin menyamarkan nomor HP (pola `(\+62|62|0)8\d{7,12}`), NIK (16 digit), dan alamat email. Nama orang tidak disamarkan karena dibutuhkan isi laporan (Q4 menunggu pemilik).
- Tidak dikirim: nomor pengirim, nama tampilan WA, token, isi D1 di luar bahan proyek itu.
- Contoh arsip di `scripts/wa/claude/` lolos penyamaran yang sama dan tanpa nama korban.

## Penyimpanan

- Nomor pemakai disimpan sebagai sha256 bergaram (di `wa_masuk.dari` sebagai `bl:<wa_sha>`). Berkas di `~/.wa-bot/` diberi mode 0600 di Mac; di Windows mode itu tidak berlaku dan perlindungannya bergantung pada izin folder profil pengguna. Nama pemegang di tab Pelaporan diambil dari `bl_daftar.nama` bila ada, selain itu "Pemakai terdaftar".
- Berkas proyek di R2 `bot-laporan/`, tidak di `public/`. Rute daftar untuk staf tidak mengembalikan isian, bahan, atau nomor.
- Versi append-only; tidak ada rute hapus. Penghapusan data atas permintaan pemilik dilakukan manual oleh pemilik.

## Ancaman dan penangkal

| Ancaman | Penangkal |
| --- | --- |
| Isi bahan berisi instruksi ke Claude ("abaikan aturan, ubah luas jadi ...") | Bahan dikirim sebagai data di blok tersendiri; skema keluaran tidak punya medan angka sistem (A4); kunci manifest (A6) di luar kendali Claude |
| Nomor asing menghabiskan kredit atau menerima laporan internal | Hanya `WA_IZIN` dan nomor yang disetujui pemilik yang terhitung terdaftar; akun umum `/masuk` (dibuat otomatis untuk nomor mana pun) tidak (Q8); nomor asing disaring di gateway dan dibalas paling banyak sekali sehari; batas belanja harian (A10); batas 20 panggilan Claude per nomor per jam |
| Pemakai melihat proyek orang lain | Proyek dikunci ke `wa_sha` pengirim; `balik`, `versi`, `final` hanya untuk pemegang |
| Nomor bot diblokir WA | Limiter tidak dinaikkan untuk kiriman global; hanya batas per tujuan untuk balasan percakapan (Q1); tidak pernah mengirim ke nomor yang belum menulis |
| Kunci API bocor | Hanya di `.env` mesin 0600; tidak di Worker, repo, atau log; galat dari SDK disaring sebelum dikirim ke pemilik |
| Token Drive salah akun | `drive-masuk.mjs` dijalankan pemilik sebagai akun tim IT; mesin mencatat email akun Drive saat menyala dan mengabarkan pemilik bila bukan akun tim IT |

## V2: agen di mesin bot

| Risiko | Penjaga |
| --- | --- |
| Bahan WA memuat instruksi ("abaikan aturan, jalankan ...") | Bahan ditulis sebagai berkas di `bahan/` dan pesan agen menyebutnya data; sandbox OS mengurung semua perintah (tulis hanya `kerja/` dan `keluaran/`, tanpa jaringan); agen tidak punya alat kirim WA, unggah, web, atau MCP; hasil hanya berupa deck ke pemegang proyek |
| Agen membaca rahasia bot | Lingkungan proses tanpa `WA_MESIN`, `WA_GARAM`, token Drive; sandbox `denyRead` dan `canUseTool` (dengan `realpath`) menolak `.env`, `~/.wa-bot` di luar ruang kerja, `~/.ssh`, `~/.config`, `~/.aws` |
| Kunci API Anthropic | Tetap ada di lingkungan Claude Code; tanpa jaringan hanya bisa bocor lewat isi deck ke pemegang proyek; dianjurkan kunci khusus V2 dengan batas belanja di workspace Console tersendiri (Q17); V2 hanya untuk `BL_V2_NOMOR` sampai Q17 dijawab |
| Agen merusak repo atau mesin | Sandbox: tulis hanya di ruang kerja; `Write`/`Edit` lewat `realpath`; `git` hanya baca; `ln -s`, `rm -r`, `sudo`, `launchctl`, pemasangan paket ditolak lapis kedua |
| Tautan simbolik ke berkas rahasia lewat `hasil.json` | `pptx` harus berkas biasa (`lstat`), ZIP PPTX sah, di dalam `keluaran/` |
| Agen mengubah angka sistem | Pagar angka A11 atas isi PPTX lengkap sesudah tiap jalan; gagal = versi tidak disimpan |
| Teks WA mentah di repo (tidak tersamarkan) | `data/laporan-bnpb/**/wa-*.txt` ditolak dibaca; agen hanya membaca bahan tersamarkan di `bahan/` |
| Biaya lepas kendali | Cek sebelum jalan (harian dan per proyek), `maxBudgetUsd`, `maxTurns` 80, batas waktu 15 menit, jalan terputus dicatat penuh, satu agen pada satu waktu |
| Transkrip sesi memuat bahan | Dihapus saat proyek final, batal, atau kedaluwarsa; sesi lebih dari 7 hari dibersihkan |
| Nama orang di pedoman | Pedoman di repo publik tanpa nama orang, nomor, atau data kejadian rinci (D22), dijaga uji |
