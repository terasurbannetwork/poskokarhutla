# Rencana 20 jam: semua bencana selengkap karhutla

Disusun 16 Okt 2026 atas perintah pemilik: *"jalan selama 20 jam tanpa berhenti untuk melengkapi semua yang
terkait pantau bencana ini... Lu yang tentukan sendiri habis ini apa setelah ini apa."*

Dasarnya tiga riset yang dijalankan hari itu:
- 438 pesan pemilik di 30 sesi (13 sampai 16 Okt);
- 248 commit dari awal sampai HEAD, dibaca per diff karena 71 di antaranya cuma bernama "gas";
- audit 113 komponen paket fitur per bencana.

Ditambah lima buku pegangan rujukan dan `~/.claude/WEBSITE.md`.

## 1. Aturan dari ucapan yang berulang

Yang diucapkan pemilik dua kali atau lebih jadi aturan. Angka di kurung adalah perkiraan berapa kali diucapkan.

| # | Aturan | Asal |
| --- | --- | --- |
| A1 | **Buang teks penjelas.** Tampilan cukup data dan label; tidak ada subjudul, catatan, "pastikan…", "3 hari terakhir vs sebelumnya". | (25+) *"Hilangkan ini"* |
| A2 | **Sebaris.** Nama, koordinat, label, filter, topik, angka satu baris; yang tak muat jadi kolom sendiri. | (10+) *"Dibuat sebaris"* |
| A3 | **Label = pil berwarna ala Insight**, bukan teks mentah; tiap item punya ikon. | (9+, 3) *"Kasih label"*, *"Kasih icon"* |
| A4 | **Semua halaman tiru kartu Insight**: pil kategori, kalimat temuan berangka merah, grafik, kaki legenda dan "Sumber:", siap dibagikan. | (5) *"kaya insight"* |
| A5 | **Lebar sampai ujung, nol ruang kosong**; kolom membagi lebar menurut isinya. | (8) *"sampai ujung kanan"* |
| A6 | **Pop-up lebar.** | (4) *"Lebarin pop up nya"* |
| A7 | **Kecil dan subtle**: judul paling banyak 3 baris, ikon kecil, lencana provinsi kecil tapi tetap terbaca. | (7) *"lebih subtle"* |
| A8 | **Angka tertulis di grafik**: total di atas batang; nilai kecil tetap ditulis ("1"), bukan kosong. | (6) *"Kasih tulisan angka"* |
| A9 | **Pembanding wilayah lewat checkbox / pil multi-pilih.** | (4) *"Dibuat checkbox"* |
| A10 | **Tabel standar**: kepala gelap teks putih, bisa diurut, ujung atas membulat, satu kotak, paginasi. | (6) *"ikutin dong standar tabel"* |
| A11 | **Tanpa latar abu tua**; latar putih, beda warna antarblok dihindari. | (3) |
| A12 | **Semua di dalam container dan kartu** (admin, halaman masuk), tiru Pangantara. | (3) |
| A13 | **Interaktif**: klik membuka pop-up, kolom bisa ditarik, bukan statis. | (5) |
| A14 | **Tanpa kursor tanda tanya** di hover. | (2) |
| A15 | **Bahasa orang awam, visual**, bukan istilah teknis. | (4) |
| A16 | **Rata tengah** untuk legenda, label foto, angka indikator. | (3) |
| A17 | **Jujur soal peluang**: angka langsung ("86%"), tanpa kalimat basa-basi "ini peluang, bukan kepastian". | (2) |
| A18 | **Data yang tidak ada atau tidak bisa diakses dibuang**, bukan ditampilkan kosong. | (3) |
| A19 | **Bagikan = ikon saja**; tiap kartu dan video bisa dibagikan. | (3) |
| A20 | **Upvote, bukan love.** | |
| A21 | **Mobile**: menu garis tiga, buang pilihan sampingan dan tombol tema. | (2) |
| A22 | **Data hari ini**: berita dan data diperbarui tiap hari. | (2) |
| A23 | **Foto cukup foto**: ikon dan waktu di dalam foto. | (2) |
| A24 | **Disembunyikan, bukan dihapus**, dan dicatat di memori `fitur-disembunyikan`. | ledger 14 Okt |
| A25 | **Sapaan "kamu"; em dash dilarang di teks tampil; ikon SVG garis.** | diputus 16 Okt |

Arah dari riwayat commit:
- **Sejak 13 Okt siang arahnya MENGURANGI dan MENYERAGAMKAN, bukan menambah.** Tab digabung, kartu diringkas, angka masuk ke judul.
- Fitur yang belum matang disembunyikan, tidak dipamerkan.
- Bagikan dan dwibahasa adalah fitur utama.
- Yang paling sering bolak-balik: tombol bagikan (7 kali), pop-up situasi, tab Informasi. Bentuk akhirnya ada di HEAD; jangan dibalik lagi.

## 2. Kondisi awal (audit 16 Okt)

| Bencana | Komponen ada / sebagian / belum (dari 113) | Catatan |
| --- | --- | --- |
| Karhutla | ±95 / 6 / 12 | Rujukan; inline di `public/index.html` 6.271 baris |
| Banjir | ±27 / 30 / 56 | Gaya lama, 14 tab, tanpa Berita/Dampak/Foto/Tentang/pop-up situasi/model |
| Cuaca | bahan: `peringatan.json`, `hujan.py`, `ansambel_hujan.py`, `metar.py` | Belum ada halaman |
| Udara | bahan: `asap.py`, `udara_rekom.py`, ISPA di `dampak.py` | Belum ada halaman |
| Kekeringan | bahan: `tanah.py`, `iklim.py`, `musim.py` | Belum ada halaman |
| Gempa, gunung api | nol kode | Ikon menu "Coming Soon" |

FASE-0 belum dimulai. `npm run uji:agen` hijau 11/11. `npm run uji:warga` merah: `klien.test` 0/11 dan `statistik.test` 18/20. `.claude/launch.json` cuma `lokal` yang hidup.

## 3. Cara kerja selama 20 jam

- **Opus merencanakan dan menjahit, Sonnet mengerjakan, Haiku memeriksa pola** (`AGENTS.md` §1.3).
- Tiap blok kerja dimulai dari kontrak:
  - CAKUPAN: berkas yang disentuh;
  - DI LUAR: berkas yang tidak disentuh;
  - BUKTI SIAP: perintah yang membuktikan selesai.
- Pengerja yang menulis berkas jalan di **worktree** sendiri; sesi induk menggabungkannya.
- Paling banyak 3 sampai 4 agent jalan bersamaan.
- Verifier = agent baru berkonteks bersih (`AGENTS.md` §3.2), memeriksa sinyal nyata:
  - `npm run uji:warga` dan `npm run uji:agen`;
  - self-check Python;
  - preview peramban di lebar 1440 dan 390, dengan konsol bersih.
- **Commit lokal** per blok, path spesifik, pesan bahasa Indonesia. **Push ke main dan deploy menunggu kata pemilik**, karena push = tayang ke publik.
- Karhutla tidak boleh berubah perilaku kecuali yang memang dibetulkan; tangkapan sebelum dan sesudah untuk tiap pemindahan ke `public/inti/`.
- Tiap keputusan baru dicatat di Buku Pegangan Pantau Bencana, lalu buku diterbitkan ulang ke URL yang sama.

## 4. Urutan kerja

Jam di bawah adalah anggaran, bukan janji. Yang tidak selesai di bloknya pindah ke blok berikut dan dicatat terbuka.

| Blok | Jam | Isi | Bukti siap |
| --- | --- | --- | --- |
| B1 · Bersihkan lantai | 0–2 | betulkan `klien.test` dan `statistik.test`; rapikan `launch.json` dan `dev:warga`; sisa pelanggaran copy (prioritas, Posko Karhutla, Anda, em dash, titik api, teks pengembang); agent baru `inti-layar` dan `pipa-umum` di roster | `uji:warga` dan `uji:agen` hijau; grep pelanggaran nol |
| B2 · Registry | 2–5 | `public/bencana.json`, generator `src/bencana.generated.js`, gerbang registry; menu bencana di kepala dari registry (hilangkan "Coming Soon" yang belum ada); rute worker, OG, statistik, jejak dari registry; `robots.txt`, `sitemap.xml`, `llms.txt` | gerbang registry hijau; karhutla identik di preview |
| B3 · Inti bersama | 5–7 | `public/inti/` (format, muat, tema, kartu Insight, tooltip, tabel, pil pemilih) dan `scripts/umum/` (ambil, simpan, grid, wilayah); karhutla dan banjir memakainya | tidak ada duplikasi baru; preview sama |
| B4 · Banjir naik kelas | 7–11 | kartu Insight, kaki/sapa/foto/bagikan, tab URL bersih, kejadian aktif, berita banjir, dampak, pop-up situasi, foto kategori banjir, laporan warga jenis banjir (migrasi tabel rujukan) | paket fitur banjir ≥ 90% terisi; preview 1440/390 |
| B5 · Gempa & tsunami | 11–14 | pipeline BMKG/USGS, cron worker ke D1, halaman `/gempa/` (peta, Insight, Tren, Berita, Dampak, Foto, Tentang), pop-up situasi, bagikan, OG, i18n, dummy | halaman hidup di preview dengan data nyata |
| B6 · Cuaca ekstrem + udara | 14–16 | halaman `/cuaca/` (peringatan BMKG, hujan ensemble, angin, gelombang) dan `/udara/` (CAMS PM2.5, ISPU, jiwa terpapar) | idem |
| B7 · Gunung api + kekeringan | 16–18 | `/gunungapi/` (MAGMA + GDACS cadangan, KRB, radius) dan `/kekeringan/` (HTH, SPI, kelembapan tanah) | idem |
| B8 · Beranda semua bencana | 18–19 | `/semua`: kartu kejadian lintas bencana, peta gabungan, pilihan bencana | idem |
| B9 · Sapuan & laporan | 19–20 | verifier bersih per halaman (INP, selera-angka, security, guard-api), buku pegangan diperbarui dan terbit, laporan apa yang live dan apa yang belum | semua gerbang hijau; daftar utang tertulis |

Model per bencana (GBDT, uji balik) tidak dipaksa masuk 20 jam ini. Yang masuk adalah status resmi lembaga dulu. Kerangka latih (`PELATIHAN-MODEL.md`) baru dikerjakan sesudah tiap halaman berdiri, karena model yang belum diuji jujur justru disembunyikan pemilik (riwayat 13 Okt).

## 5. Yang menunggu pemilik

- Izin push ke main dan deploy.
- Daftar "Keputusan yang menunggu pemilik" di `ARSITEKTUR.md`; selama belum diputus, dipakai usulan di sana.
- Pendaftaran routine pembaru buku pegangan.

## 6. Tambahan dari pemilik selama berjalan

- **Peringatan dini dan pop-up alarm** (16 Okt): `PERINGATAN-DINI.md`. Tahap 1 (pemicu worker, API, pop-up) sesudah halaman gempa; tahap 2 Web Push menunggu kunci VAPID pemilik.
- **Lapisan satelit NASA (Eyes on the Earth / GIBS, tanpa kunci)** (16 Okt), dipangkas atas kata pemilik *"tambahin yang relevan aja"*: hanya tiga ubin Overlay berlabel "NASA EOSDIS GIBS".
  1. Karbon monoksida AIRS 3 harian (±5,5 km): karhutla + udara. Asap karhutla yang terangkat dan lintas batas.
  2. Hujan teramati GPM IMERG: banjir + cuaca, berdampingan dengan prakiraan Open-Meteo.
  3. Kelembapan tanah SMAP: kekeringan.
  Tidak dibawa: uap air, suhu dan muka laut, GRACE, "satelit berikutnya", globe 3D, lapisan kimia atmosfer.
