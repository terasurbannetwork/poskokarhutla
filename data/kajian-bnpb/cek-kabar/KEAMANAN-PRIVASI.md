# KEAMANAN-PRIVASI: Cek Kabar Luar

## Data dan tempatnya

| Data | Sifat | Tempat |
| --- | --- | --- |
| Kejadian Dalops (dari logbook, ada nama petugas di sumber) | internal | R2 `dalops/<jenis>.json`, rute staf saja. Tidak pernah ke `public/` (repo publik) |
| Kolom `luar` | turunan internal | ikut berkas di atas |
| Berita | publik | dibaca dari situs sendiri |
| Arsip berita dan arsip label | turunan | `data/raw/dalops/` di mesin pipeline, ikut .gitignore |

## Aturan

- Kolom `luar` tidak memuat nama orang dari logbook. Bukti hanya judul, media, tanggal, dan tautan berita yang memang publik.
- Tidak ada data yang dikirim ke pihak luar. Pengecek hanya **mengunduh** berkas publik situs sendiri.
- Judul dan nama media di layar ditulis lewat `textContent`. Tautan hanya bila skemanya `http:` atau `https:`; selain itu tampil sebagai teks.
- Tautan bukti dibuka dengan `rel="noopener noreferrer"`.
- Teks WA tidak memuat isi berita, hanya permintaan konfirmasi (Q4), supaya tidak meneruskan kabar yang belum terverifikasi ke grup BPBD.
- Pemirsa baca-saja: tombol WA disembunyikan oleh blok `html[data-baca-saja]` di `public/bnpb/menu_pusdalops.css` yang sudah ada.

## Risiko

| Risiko | Penahan |
| --- | --- |
| Berita salah tempat membuat label "Masih berlangsung" palsu | hanya artikel bertanda `kab` yang sama (ALGORITMA 1); bukti tampil, staf menilai |
| Label "Kemungkinan selesai" dibaca sebagai selesai | kata "kemungkinan" wajib, pil "Deteksi Centurisk97", kejadian tidak pernah ditutup otomatis (D1) |
| Situs sendiri tidak terjangkau saat pipeline jalan | label jadi "Belum ada kabar luar" dengan catatan, jalan tidak gagal |
