# Rencana 15 jam: /presiden siap tayang di dashboard Presiden

Disusun 22 Okt 2026 malam dari pemeriksaan kode (`public/presiden.*`,
`scripts/data/presiden.py`, `src/worker.js`, `docs/presiden/KONTRAK.md`) dan
situs live `centurisk97.id/presiden`.

## Temuan (urut dari yang paling memalukan bila tayang)

| # | Temuan | Bukti | Dampak |
| --- | --- | --- | --- |
| 1 | **11 dari 15 widget tayang berstatus "basi"** | `semua.json` live dibuat 18:39 WIB dari data laptop 5 hari lalu; ikut terbit lewat `terbit.yml` sebelum `titik.yml` sempat membangunnya ulang | Layar Presiden menampilkan "Data terlambat" di hampir semua kartu |
| 2 | Sebagian sumber memang lambat, bukan hanya salinan laptop: kejadian, konsesi, sumber daya (12 Okt), penerbangan, peringatan (13 Okt), luas resmi (Juli) | catatan `basi` per widget | Walau CI segar, sebagian kartu tetap basi; perlu cek jadwal pipeline masing-masing |
| 3 | Belum ada kebijakan tampil saat basi | `presiden.js` menampilkan kartu apa adanya | Pimpinan melihat pill "basi"; perlu keputusan: sembunyikan, redupkan, atau tampil dengan tanggal |
| 4 | Tidak ada alarm ke pengelola saat panel basi | `/api/status` tidak memuat sumber `presiden` | Panel bisa basi berhari-hari tanpa ada yang tahu |
| 5 | Tidak ada gerbang uji untuk rute /presiden | `tests/` tidak menyebut presiden kecuali laporan BNPB | Header iframe, CORS feed, redirect `/presiden.html` bisa rusak diam-diam |
| 6 | Feed lambat: 1,1 s sampai 2,4 s untuk 33 KB | `curl` live, `cache-control: no-cache` | Iframe di dashboard terasa berat; perlu cache tepi singkat + ETag |
| 7 | Font dari Google Fonts | `presiden.html` | Jaringan pemerintah sering memblokir domain luar; font jatuh ke cadangan atau tertahan |
| 8 | CSP masih `report-only` | header live | Belum benar-benar ditegakkan |
| 9 | Widget `peringatan` kosong (0 baris) dan `penerbangan` disusun dari judul berita | feed | Lemah untuk audiens Presiden; perlu sumber resmi atau digugurkan |
| 10 | Belum ada mode layar besar (TV dinding 1920 dan 4K), mode cetak/PDF untuk rapat, dan cuplikan tanggal di iframe | layar | Dashboard presiden biasanya di layar besar dan dicetak untuk rapat terbatas |
| 11 | Belum ada dokumen integrasi untuk tim dashboard Presiden | `KONTRAK.md` dokumen internal | Tim penerima butuh: URL, iframe, ukuran, jadwal pembaruan, jaminan versi, kontak |
| 12 | Belum diperiksa oleh pemeriksa konteks bersih sesudah tab Peta | aturan kendali mutu | Angka dan pop-up peta belum diaudit ulang |
| 13 | Nama perusahaan di widget konsesi | keputusan pemilik 22 Okt | Risiko hukum; kalimat "indikasi, bukan penetapan pelaku" wajib di tiap tempat nama muncul, termasuk pop-up peta |

## Rencana per blok

| Jam | Blok | Hasil | Bukti selesai |
| --- | --- | --- | --- |
| 0–1 | Kesegaran live | Tunggu `titik.yml` berikutnya, cek `semua.json` live per widget; daftar sumber yang tetap basi beserta workflow pemiliknya | tabel widget ok/basi dari live |
| 1–3 | Sumber lambat | Perbaiki rantai pipeline yang membuat kejadian, konsesi, sumber daya, penerbangan, peringatan tertinggal; atau perlebar ambang bila jadwal sumbernya memang harian | `--uji` hijau, live ok |
| 3–4 | Kebijakan basi | Terapkan keputusan pemilik (lihat bawah) di `presiden.js`; feed tetap jujur | tangkapan layar |
| 4–5 | Alarm | Masukkan `presiden` ke `/api/status` dan `jaga-kesegaran` | `/api/status` memuat sumber presiden |
| 5–7 | Gerbang | Uji node: header iframe dan CORS, redirect, bentuk `semua.json` sesuai kontrak, ukuran < 150 KB, tanpa kata WALHI, tanpa " · " | `npm run uji:warga` / `uji:agen` hijau |
| 7–8 | Kecepatan | Cache tepi 60 s + ETag untuk `/data/presiden/*`, font lokal | waktu muat < 300 ms |
| 8–10 | Layar besar dan cetak | Mode `?layar=tv` (grid 3 kolom, huruf besar, rotasi otomatis), `@media print` A4 lanskap | tangkapan 1920 dan PDF |
| 10–11 | Dokumen integrasi | `docs/presiden/INTEGRASI.md`: URL, iframe per widget, ukuran, jadwal, versi feed, kontak | dokumen |
| 11–13 | Audit bersih | `selera-angka`, `validasi-model`, `security-reviewer`, `inp-reviewer` paralel; perbaikan oleh pengerja pemilik | laporan pemeriksa tanpa temuan terbuka |
| 13–14 | Uji lapangan | 375 px, tablet, 1920, gelap/terang, iframe di domain lain, jaringan lambat | tangkapan layar |
| 14–15 | Tayang | Commit, tunggu `terbit.yml` hijau, cek aset live dan `/api/status`, tulis ringkasan untuk pemilik | URL live + bukti |

## Keputusan yang dibutuhkan dari pemilik

1. Kartu basi di layar Presiden: sembunyikan, redupkan dengan tanggal data, atau tetap tampil apa adanya.
2. Widget `penerbangan` (dari judul berita) dan `peringatan` (kosong): pertahankan atau gugurkan.
3. CSP: tegakkan sekarang atau tetap `report-only` sampai uji iframe di domain tim Presiden.
