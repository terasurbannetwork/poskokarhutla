# RISET: Bot WA pembuat laporan dengan Claude API

## 1. Yang sudah ada di repo dan dipakai ulang

| Bagian | Berkas | Dipakai untuk |
| --- | --- | --- |
| Gerbang WA (Baileys) | `scripts/wa/gateway/index.js` | Menerima pesan dan dokumen, meneruskan ke `POST /api/wa/gateway`, mengirim lewat `/send` dan `/send-file` di 127.0.0.1. Susulan pesan sampai 7 hari saat gerbang mati (`aman.cjs putusanSusulan`), ditandai `lama:true` dan perintahnya tidak dijalankan. Nomor di luar `WA_IZIN` dibuang di gateway sebelum diteruskan, dan perintah PEMILIK dicegat ke `perintah.mjs` lebih dulu. |
| Limiter kirim | `scripts/wa/gateway/limiter.js` | Jeda acak 15 sampai 20 detik, 3 per menit, 60 per jam, 300 per hari, 8 per tujuan per hari, pemanasan 7 hari. Lihat Q1. |
| Kotak masuk WA | `src/wa.js` | Menyimpan bahan dari nomor `WA_IZIN` (D1 + R2), `GET /api/wa/masuk`, `GET /api/wa/berkas`, `POST/GET /api/wa/hasil`. |
| Pengenal jenis bahan | `src/wa_jenis.js` | `JENIS_LAPORAN` (rekap Koordalops 24 jam, laphar PDF, Satgas, BMKG pagi, PVMBG pagi, gelar udara Excel, dan lainnya) dengan tanda `wajib`. Tidak membaca angka. Dipakai untuk daftar bahan wajib (K8). |
| Jalur terjadwal | `scripts/wa/otomatis.mjs` | `ambilBahan`, `siapkanKeluaran`, `jalankanGenerator`, `kunciProses`. Bot baru memanggil fungsi ini, tidak menyalin logikanya. |
| Perintah WA | `scripts/wa/perintah.mjs` | Pola parse murni lalu tangani dengan dunia luar disuntik. Sekarang hanya untuk nomor PEMILIK. |
| Drive | `scripts/wa/drive.cjs`, `scripts/wa/drive-masuk.mjs` | `unggahLaporan()` lewat Drive REST v3 dengan refresh token OAuth; tanpa paket googleapis. |
| Generator | `data/laporan-bnpb/generator/harian_ringkas.py`, `penanganan_otomatis.py`, `penanganan_banjir.py`, `penanganan_gempa.py`, `penanganan_kekeringan.py` | Pembuat slide. Bot tidak menulis slide sendiri. |
| Gerbang deck | `~/.claude/skills/ppt-konsultan/bnpb/scripts/aturan_slide.py` | Diukur 18 Nov 2026 pada Laporan Kejadian Bencana Harian 181126 (Revisi 5): lolos, 0,78 detik. |
| Akun nomor | `migrations/0133_masuk.sql` (`mk_akun.wa`, `status`) | Tidak dipakai sebagai daftar terdaftar: akun umum `/masuk` dibuat otomatis untuk nomor mana pun dengan status `aktif` (`pintu-masuk/KEPUTUSAN-MASUK.md` D5), jadi terlalu longgar untuk K6 (Q8). |
| Arsip laporan | `data/laporan-bnpb/harian/<bulan>/<hari>/Revisi N/`, `data/laporan-bnpb/penanganan-karhutla/<bulan>/<hari>/Revisi N/`, `public/data/laphar_riwayat.json` | Bahan uji balik dan banding 7 hari. |

## 2. Claude API

- Kredit: pengaturan paket Ultra pemilik menyebut kredit API $200 per bulan setelah organisasi API ditautkan (tangkapan layar pemilik, 18 Nov 2026). Perilaku saat kredit habis (berhenti atau ditagih) belum diperiksa; dipastikan pemilik saat BL-13.
- Model dan harga (tabel skill `claude-api`, 3 Nov 2026): Opus 5.5 $4 masuk dan $20 keluar per juta token; Haiku 5.5 $0,10 dan $0,50. Perkiraan satu panggilan urai (5.000 token masuk, 1.000 keluar) dengan Opus 5.5: sekitar $0,04; dengan bagian tetap di-cache lebih murah. $200 per bulan cukup untuk ribuan panggilan.
- Opus 5.5: thinking selalu menyala, kendali lewat `output_config.effort` (bawaan `medium`), `tool_choice` paksa menolak 400, jadi keluaran JSON memakai structured outputs (`output_config.format`).
- Claude membaca PDF dan gambar secara langsung (blok `document` dan `image`), jadi bahan PDF dan foto tabel tidak butuh OCR terpisah. Excel tetap dibaca mesin (openpyxl) lalu dikirim sebagai teks.
- Prompt caching: bagian yang sama di tiap panggilan (instruksi, contoh arsip, aturan tetap) diletakkan paling depan dan diberi `cache_control`.

## 3. Mengapa bukan Workers AI

Model Workers AI sudah dicoba di repo ini untuk membaca stempel foto: LLaVA 0 dari 31 foto berkoordinat terbaca dan mengarang (ilmu `wa-bot`, 4 Nov 2026). Workers AI juga tidak menyediakan pelatihan di dalam platformnya; yang tersedia hanya memasang adapter LoRA hasil latih di luar untuk model tertentu. Pemilik memilih Claude API (K1).

## 4. "Pelatihan" yang dipakai

Tidak ada pelatihan model. Mutu datang dari: (a) skema isian per jenis laporan; (b) 10 sampai 20 contoh pasangan bahan dan isian benar dari arsip, di-cache; (c) validator kutipan (D2) dan kunci angka sistem (D3); (d) aturan tetap dari revisi berulang (K10); (e) uji balik terhadap arsip sebagai ukuran.

## 5. Waktu yang diharapkan

| Tahap | Waktu |
| --- | --- |
| Gerbang meneruskan pesan ke Worker | 1 sampai 3 detik |
| Claude mengurai (Opus 5.5, effort low) | 5 sampai 20 detik |
| Generator membangun PPTX | 10 sampai 30 detik |
| Pratinjau PNG slide berubah | 2 sampai 5 detik |
| PDF | 20 sampai 60 detik |
| Gerbang deck, bahasa, banding 7 hari | 2 sampai 3 detik, jalan bersamaan dengan PDF |
| Kirim lewat limiter | 15 sampai 20 detik per kiriman sesudah yang pertama |

Draf pertama sekitar 45 sampai 90 detik; tiap revisi sekitar 30 sampai 60 detik.
