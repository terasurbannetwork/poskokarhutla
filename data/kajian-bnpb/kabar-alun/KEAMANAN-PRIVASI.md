# KEAMANAN-PRIVASI: Kabar Alun-alun

## Fakta awal

Repo ini publik. `data.json` laporan harian hari itu dan deck `Laporan Kejadian Bencana Harian*.pptx` (237 berkas) SUDAH dilacak di git (RISET 2). Jadi kata "internal" atau "hanya di Mac pemilik" tidak berlaku untuk sumber ini; yang menahan hanyalah penerbitan ke situs. Paket ini tidak menambah paparan baru sebelum Q2 dijawab.

## Data dan tempatnya

| Data | Sifat | Tempat |
| --- | --- | --- |
| `data.json` laporan harian (memuat teks bebas Koordalops) | sudah di git publik | folder laporan harian; hanya kolom daftar izin yang dipindah ke `kabar.json` |
| `public/data/alun/kabar.json` | turunan, angka resmi | tidak di-commit dan tidak terbit sebelum Q2 dijawab; hanya di localhost |
| Berita | publik | dibaca dari berkas berita situs sendiri |
| Laporan warga | publik terkurasi | `GET /api/lapor/alun` yang sudah ada; tidak diubah |
| Media sosial | belum ada | belum tersambung (D9) |

## Daftar izin kolom

`kabar.json` hanya memuat: `id, jenis, kab, prov, kab_kode, titik, titik_ket, status, baru, mulai, lap_terakhir, cutoff_terakhir, selesai_lama, angka{kk, mengungsi, rumah_dampak}, berita[{judul, media, tgl, url}], n_berita, catatan, medsos{status}`. Tidak pernah: `teks.*`, `tangani`, `perhatian`, `label`, `kondisi_pil`, `angka` lain, nama orang, nomor telepon, `ringkas` berita (D4, D8).

## Aturan

- Gerbang Q2: sebelum pemilik menjawab, `public/data/alun/kabar.json` TIDAK di-commit (`.gitignore`) dan tidak terbit (`public/.assetsignore`); terlihat hanya di localhost. Tidak ada "staf masuk boleh melihat", karena berkas statis tidak punya pintu masuk.
- Pelindungan data pribadi (UU 27/2022): bila medsos tersambung, hanya jumlah unggahan per kejadian dan tautan pencarian platform; tanpa nama akun, isi unggahan, atau foto warga (D10). `medsos_tiktok.json` tidak dipakai.
- Berita hanya judul, nama media, tanggal, tautan (hak cipta). Tanpa gambar dan cuplikan panjang.
- Laporan warga tidak diubah: hanya yang ditindaklanjuti atau selesai, titik pusat desa, tanpa nama, nomor WA, atau koordinat pelapor (`lapor-ai` K30).
- Tautan hanya skema `http:` atau `https:`, `rel="noopener noreferrer"`. Judul dan media lewat `textContent`.
- Titik resmi hanya setingkat kab/kota (D6).
- Tidak ada rute atau tabel baru, jadi tidak ada permukaan tulis baru.

## Risiko

| Risiko | Penahan |
| --- | --- |
| Angka resmi dan warga tampak setara atau dijumlah | pita terpisah, label sumber, uji tanpa penjumlahan |
| Berita salah kab menempel pada kejadian | hanya lewat `cocok()`; tanpa kab tidak menempel |
| Titik salah dari nama kab yang mirip | kecocokan persis nama dan provinsi, selain itu tanpa titik |
| Teks bebas laporan harian bocor lewat berkas turunan | daftar izin kolom diuji; berkas tidak di-commit dan tidak terbit sebelum Q2 |
| Angka warga 0 dibaca sebagai terukur nol | 0 dari warga tidak ditampilkan (ALGORITMA 4) |
| Kartu dibaca sebagai kejadian sudah selesai atau aman | status hanya dari laporan resmi, kesegaran per kejadian, kata "aman" diuji |
