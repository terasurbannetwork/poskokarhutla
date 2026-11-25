# Ikhtisar arsitektur

Halaman ini memberi gambaran komponen Centurisk97, masalah yang dijawab, dan siapa mencari apa.

Centurisk97 adalah situs pemantauan bencana untuk BNPB dan BPBD. Bagian arsitektur ini menjelaskan kerangka teknis yang menopang semua modul lain: dari mana data datang, bagaimana data sampai ke layar dan ke program pihak lain, siapa yang boleh membuka apa, apa yang berjalan terjadwal, bagaimana mutu dijaga, dan bagaimana seseorang ikut mengembangkan kode. Modul bencana (karhutla, banjir, gempa, dan seterusnya) dijelaskan di modul pengembang lainnya.

## Masalah yang dijawab

- Pengguna dan mitra membutuhkan data bencana yang bisa diambil mesin (JSON, Atom, MCP) tanpa membuka peta.
- Anggaran Cloudflare paket Free sangat sempit (satu jadwal cron untuk seluruh akun, batas CPU per permintaan, batas baca D1 per hari), sehingga pekerjaan berat harus dipindah ke GitHub Actions dan mesin pemilik.
- Banyak sesi pengembang (manusia dan agent AI) bekerja di satu checkout, sehingga aturan kerja harus ditegakkan mesin, bukan ingatan.

## Pengguna halaman ini

| Pengguna | Yang dicari di bagian ini |
| --- | --- |
| Pengembang aplikasi mitra, peneliti, wartawan data | Cara mengambil data terbuka: `/api/v1/data/*`, `/data/*.json`, feed Atom, server MCP |
| Mitra berkunci (BNPB, BPBD, lembaga yang diberi kunci) | Endpoint berkunci, cakupan kunci, batas laju, kode galat |
| Staf BNPB dan BPBD | Gambaran siapa boleh membuka halaman apa, cara membaca status kesegaran data, cara memakai Bot Laporan BNPB di WhatsApp |
| Pimpinan | Gambaran bagaimana data tiba dan seberapa segar, tanpa detail kode |
| Pengembang dan agent AI | Halaman referensi ([berkas, rute, tabel](/docs/pengembang/arsitektur/ref-kode) dan [workflow, keluaran, uji](/docs/pengembang/arsitektur/ref-workflow)) serta [kontribusi](/docs/pengembang/arsitektur/kontribusi) |

## Komponen utama

| Komponen | Tempat | Peran |
| --- | --- | --- |
| Cloudflare Worker `centurisk97` | `src/worker.js`, `wrangler.jsonc` | Perutean API, gerbang halaman HTML, satu cron per menit, header perlindungan |
| Aset statis | `public/` (binding `ASSETS`) | Layar HTML, JS, CSS, dan seluruh JSON data (`public/data`) |
| D1 `poskowarga` | `migrations/`, `src/hak.js` | Data transaksional: laporan warga, akun, log kerja, antrean, proyek bot |
| R2 `poskokarhutla-foto` (binding `MEDIA`) | prefiks per modul | Foto, berkas besar, data peran terbatas, ubin PMTiles |
| Workers AI (binding `AI`) | `wrangler.jsonc:19` | Hitung orang di foto lapangan instansi |
| GitHub Actions | `.github/workflows/` (41 berkas) | Menghitung data, meng-commit JSON ke `public/data`, menerbitkan situs |
| Mesin pemilik (Mac mini) | `scripts/wa/` | Gateway WhatsApp, generator laporan, agen Claude untuk revisi |
| Mesin agent | `scripts/agents/`, `.claude/`, `tests/agen/` | Roster agent, ilmu dan jejak, gerbang uji, server tinjau lokal |

![Komponen utama Centurisk97: sumber luar dihitung GitHub Actions menjadi JSON di public/data, diterbitkan ke Worker, yang melayani mitra dan pengguna, bot WhatsApp, serta D1 dan R2.](gambar/arsitektur-komponen.svg)
