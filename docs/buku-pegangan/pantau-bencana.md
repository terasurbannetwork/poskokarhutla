Pemantauan bencana Indonesia · karhutla, banjir, dan yang menyusul

# Buku Pegangan Pantau Bencana

Semua selera, keputusan pemilik, gerbang, dan armada yang berlaku di situs Pantau Bencana (repo `poskokarhutla`), di satu tempat. Yang baru diputus masuk ke Riwayat, lalu ke bagian aturannya.

Disegarkan 16 Okt 2026\
commit fa93e79

[Riwayat perubahan](#riwayat-perubahan) [Keputusan pemilik](#keputusan-pemilik) [Stack & peta repo](#stack--peta-repo) [Selera tampilan](#selera-tampilan) [Angka & copy](#angka--copy) [Fitur yang disembunyikan](#fitur-yang-disembunyikan) [Model & data](#model--data) [Gerbang penjaga](#gerbang-penjaga) [Armada agent](#armada-agent) [Rencana multi-bencana](#rencana-multi-bencana) [Cara halaman ini diperbarui](#cara-halaman-ini-diperbarui)

Terbaru di atas

## Riwayat perubahan

Vonis dan perubahan selera per tanggal. Kutipan miring adalah kata-kata pemilik saat menegur atau memutus.

1. 16 Okt 2026
   - **Tiga keputusan copy diputus**: sapaan "kamu", em dash dilarang di teks tampil, ikon tetap SVG garis. Sisa yang harus diganti: "Anda" di `informasi.js:377` dan `privasi.html`, em dash di `informasi.js:239`.
   - **Rencana multi-bencana dilengkapi**: peta (`PETA.md`), pelatihan model (`PELATIHAN-MODEL.md`), copywriting (`COPYWRITING.md`), dan katalog modul plug-and-play (`MODUL-PLUG-AND-PLAY.md`) masuk `docs/multi-bencana/`. *"Rencana arsitektur copywriting total fitur nya gimana modul nya yang udah ada jadi plug and play. Copy coding petanya. Petanya juga tiru modelnya."*
   - **Lima buku pegangan rujukan dipasang di repo ini** (`docs/buku-pegangan/rujukan/`) dan diterbitkan sebagai artifact: Utama, MBG Bangka, Gemah Ripah, Betutu Sambe, Worth It. Buku ini lahir meniru bentuknya: *"Iya lu tiru ya dari situ."*
2. 15 Okt 2026
   - **Semua bencana meniru karhutla, rinci dan exhaustive**: *"Gw mau yang bencana lain tiru best practice dan secara rinci semua fitur dan bagian yang dari Karhutla."* Rencana lengkap di `docs/multi-bencana/` (registry `public/bencana.json`, rute `/<id>/`, `public/inti/`, 113 komponen paket fitur, alur 12 tahap).
   - **Foto lapangan**: 100 foto dummy karhutla, unik semua, tersebar di provinsi yang sering mengalami karhutla. Label waktu ("1 hari lalu") dan ikon kategori duduk DI DALAM foto; *"Gausah ada nomor ini de."* Label pakai tulisan putih di atas latar sorot; tombol tutup pop-up merah berikon putih di kanan atas; Upvote, bukan ikon hati; koordinat GPS tampil di pop-up.
   - **Nama provinsi di peta**: rounded rectangle, dikecilkan lalu sedikit dibesarkan lagi karena tidak terbaca. *"Bro coba agak besarin dikit dong yang nama provinsinya soalnya ga keliatan sumpah."*
   - Admin masuk pakai email dan kata sandi; halaman admin didesain ulang mengikuti selera-pinka.
   - Tiga kartu Insight dari factsheet Bakom; kartu Penanganan kemudian disembunyikan.
   - Pop-up situasi: kartu jarak Daops dihapus; baris waktu data di kepala dihapus.
   - Mobile ≤ 640 px: tab pindah ke menu garis tiga, pilihan bencana dan tombol tema disembunyikan.
3. 14 Okt 2026
   - **Daftar "yang disembunyikan" wajib dicatat**, karena pemilik bisa meminta daftarnya dan memulihkan sebagian. Lihat [Fitur yang disembunyikan](#fitur-yang-disembunyikan).
   - Halaman Tentang bergaya editorial berfoto; label bagian dihapus; kartu Teras Urban tanpa kalimat peran dan tautan situs.
   - **Bahasa konsesi netral**: "titik panas berada di dalam areal konsesi", tidak pernah menuduh siapa yang membakar. Data bernama perusahaan tidak boleh ada di `public/`.
   - Lapisan Angin sempat dimatikan bawaannya, lalu dikembalikan NYALA.
   - Caption bagikan tanpa emoji dan basa-basi; akun resmi di kaki gambar bagikan ditulis terpisah.
4. 13 Okt 2026
   - **Semua halaman memakai format kartu Insight** (memori `gaya-kartu-insight`). *"jelek banget"* untuk catatan teks polos, `<select>` bawaan, dan singkatan "rb" dalam perbandingan.
   - **"9 provinsi prioritas" dilarang** di teks layar; tulis "provinsi yang sering mengalami karhutla".
   - Model sebaran final (GBDT tulisan tangan, 40 variabel) diuji sekali pada 2024–2026 dan 123 kejadian lampau.
5. 12 Okt 2026
   - Repo lahir: situs statis Cloudflare, tab Insight, mode peta, kalender bahaya, pembaruan data harian 21.20 WIB.

## Keputusan pemilik

### Diputus

| Keputusan | Tanggal | Bunyinya |
| --- | --- | --- |
| Sapaan pembaca "kamu" | 16 Okt 2026 | Semua teks yang menyapa memakai "kamu"; "Anda" yang tersisa diganti |
| Em dash dilarang di teks tampil | 16 Okt 2026 | Pemisah pakai ":" atau "·"; en dash tetap untuk rentang dan angka kosong |
| Ikon SVG garis | 16 Okt 2026 | Seragam dengan karhutla, bukan emoji dalam lingkaran |
| Semua bencana meniru karhutla | 15 Okt 2026 | Tiap bencana baru dinilai dengan paket 113 komponen karhutla; satu bencana selesai = 100% baris terisi (dibuat, diadaptasi, atau "tidak berlaku" beralasan) |
| Satu situs, satu registry | 15 Okt 2026 | `public/bencana.json` sumber tunggal daftar bencana; karhutla tetap di `/` |
| Kartu Insight di semua halaman | 13 Okt 2026 | Pil kategori + satu kalimat temuan berangka merah + kontrol segmen, grafik, kaki legenda + "Sumber:" |
| Disembunyikan, bukan dihapus | 14 Okt 2026 | Tiap "hilangkan" dicatat berikut berkas dan cara memulihkannya |
| Konsesi netral | 14 Okt 2026 | Tidak ada tuduhan pembakar; tidak ada nama perusahaan di berkas publik |
| Foto: label di dalam foto | 15 Okt 2026 | Ikon kategori dan waktu relatif di dalam foto; tanpa nomor urut |
| Upvote, bukan love | 15 Okt 2026 | Dukungan foto warga = tombol Upvote |
| Bahasa bawaan Indonesia | 15 Okt 2026 | Pilihan bahasa di `sessionStorage`; kunjungan baru selalu ID |
| Lapisan Foto mulai mati | 15 Okt 2026 | Tidak diingat di `localStorage` |
| Lapisan Angin mulai nyala | 14 Okt 2026 | Dipulihkan sesudah sempat dimatikan |
| Data dummy di tiap website | aturan global | Dua ikon, Super Admin saja, isinya ditentukan halaman yang sedang dibuka (`~/.claude/DUMMY.md`) |
| Armada agent sejak hari pertama | aturan global | Roster, model tertulis, ilmu per agent, `AGENTS.md` (`~/.claude/AGEN.md`) |

### Belum diputus

| Pertanyaan | Usulan | Rujukan |
| --- | --- | --- |
| Keputusan arsitektur multi-bencana yang menunggu | Daftarnya di akhir `ARSITEKTUR.md` | `docs/multi-bencana/ARSITEKTUR.md` |
| Routine pembaru buku ini | Didaftarkan di Mac mini, tiap hari 21.00 WIB | [Cara halaman ini diperbarui](#cara-halaman-ini-diperbarui) |

## Stack & peta repo

| Lapis | Isinya |
| --- | --- |
| Layar | Vanilla JS tanpa build step di `public/`, MapLibre 4.7.1 dari cdnjs, satu `.js` + satu `.css` per modul; `public/index.html` memuat inti peta |
| Worker | Cloudflare Worker + D1 + R2 (`src/**`, `migrations/**`): laporan warga, foto, moderasi admin, `/api/titik` FIRMS 3-jam, statistik, OG meta |
| Pipeline | Python 3.12 stdlib di GitHub Actions; JSON di-commit ke `public/data/` |
| Jadwal | `data.yml` harian, `titik.yml` 3-jam, `statis.yml`, `banjir.yml` harian, `terbit.yml`; cron Worker `15 */3 * * *` FIRMS ke D1 dan `17 * * * *` bersih-bersih |
| Terbit | Cloudflare static assets (`assets.directory ./public`); seluruh isi `public/` ikut terbit, jadi tidak ada data bernama perusahaan, kunci, atau berkas kerja di sana |

Peta modul dan pengerjanya ada di `AGENTS.md` §2.

## Selera tampilan

### Kartu Insight

- Pil kategori (`Insight.LABEL`) + judul SATU kalimat temuan dengan angka merah (`Insight.hl`) + kontrol segmen, pemilih provinsi di kanan judul.
- Kaki kartu: legenda di tengah + `Sumber: …` miring (`Insight.ex`).
- **Dilarang**: subjudul atau baris satuan, paragraf catatan, kotak KPI berkepala navy. Angkanya dilebur ke judul kartu.
- Angka di ujung batang dan kolom tabel jadi pil (sering berikon); tiap bar chart menampilkan total di atas batang; garis rata-rata berpil navy "rata-rata".

### Tooltip

- Pita judul + kolom label/nilai (`rapikanTip`).
- Naik ▲ merah, turun ▼ hijau. Tidak ada tanggal ISO mentah.

### Tabel

- Nol sel dua baris; info sekunder jadi kolom sendiri, huruf lebih kecil.
- Kolom teks rata kiri. Daftar panjang dipaginasi (`paginasi()`), bukan tombol "Tampilkan N".
- Judul artikel di tabel = tautan. `<select>` bawaan diganti `PilihCantik`.

### Peta

- Panel Overlay = ubin ikon ala Windy, satu baris per kategori, latar putih.
- Nama provinsi di rounded rectangle, cukup besar untuk terbaca.
- `peta.setStyle` selalu `{diff: false}`; `Peta.init` menunggu `style.load`.
- Cetak biru peta untuk bencana lain: `docs/multi-bencana/PETA.md`.

### Foto lapangan

- Kategori dan waktu relatif di dalam foto; label putih di atas latar sorot; tanpa nomor.
- Pop-up lebar, koordinat GPS tampil, Upvote, tombol tutup merah berikon putih di kanan atas.

### Interaksi

- Klik tidak boleh membekukan layar. Chrome kontrol (pil aktif, `aria-pressed`) di-set langsung, kerja berat lewat `nanti()`. Membungkus seluruh setState dalam transisi bukan obatnya (`~/.claude/INP.md`).

## Angka & copy

- `fmt` id-ID: titik ribuan, koma desimal, paling banyak 1 desimal; "–" bila kosong. `toFixed` mentah dilarang di teks tampil.
- Satuan selalu tertulis. "rb"/"jt" cuma di label sempit; kalimat memakai "ribu/juta".
- Tiap angka punya sumber dan waktu; "hari ini/kemarin" menurut hari WIB data.
- Probabilitas dibulatkan kasar atau jadi kelas; angka kinerja model dibaca dari JSON uji, tidak diketik tangan.
- Sapaan "kamu". Em dash dilarang di teks tampil; en dash untuk rentang. Ikon SVG garis.
- Suara: polos, faktual, satu baris satu temuan, angka di depan, tanpa emoji. Pola lengkap tiap permukaan dan kosakata padanan per bencana: `docs/multi-bencana/COPYWRITING.md`.
- Frasa wilayah: "provinsi yang sering mengalami karhutla", tidak pernah "9 provinsi prioritas".

**Sisa pelanggaran yang diketahui** (dibereskan sebelum disalin ke bencana lain): "provinsi prioritas" di `ringkasan.js` dan `index.html`; merek lama "Posko Karhutla" di `privasi.html`, `warga/index.html`, `src/admin_halaman.js`, `public/admin/pesan.js`; "titik api" vs "titik panas"; teks pengembang bocor ke layar di `dampak.js`; `toFixed` mentah di beberapa baris `index.html`.

## Fitur yang disembunyikan

Aturannya: **disembunyikan, tidak dihapus.** Caranya atribut `hidden`, `display:none`, flag (`SPANDUK = false`, `if (false && …)`, `TAB_SEMBUNYI`), `splice` dikomentari, `"sembunyi": true` di `data/tim.json`. Fungsinya tetap ada supaya bisa dipulihkan, dan fungsi yang dipulihkan wajib diuji (kasus `$q` di `rekamVideo`).

Daftar lengkap berikut cara memulihkannya hidup di memori `fitur-disembunyikan`. Ringkasannya:

| Wilayah | Yang tersembunyi |
| --- | --- |
| Tab | Posko (Ajuan), Ringkasan, Informasi, Kompleks (dilebur ke dasar Insight), Metode (masih bisa dibuka lewat URL) |
| Insight | Model sebaran "Coming soon", sebDorong, sebUji, sebGalat, sebLolos, kartu Penanganan; tombol gambar kartu Musim (tombol video dipulihkan 15 Okt) |
| Cerita | bab Model sebaran, bab Uji model, keterangan bab Pendorong |
| Bagikan | tab Ekspor, subjudul, teks ukuran, watermark logo, blok Rekomendasi di templat provinsi dan kompleks |
| Laci kompleks | nama provinsi di kepala, "Teruskan ke", caption langganan api; "Kenapa status ini" diganti visual |
| Pop-up situasi | kartu jarak Daops, baris waktu data |
| Tentang | Layanan, Sumber data, Cara kerja data, Cara mengutip, kotak angka hidup, landasan hukum, beberapa FAQ, tombol WhatsApp, label bagian |
| Lain | spanduk privasi, spanduk data basi `#basi`, pil statistik di kepala, catatan privasi dialog pesan, kolom Peta batas dan tabel Status lahan konsesi, Unduh CSV Tren, judul dan hitungan galeri Foto, toggle Galeri/Peta, pilihan bencana dan tombol tema di HP |

## Model & data

- Model sebaran: GBDT tulisan tangan, dibagi waktu (latih/validasi/uji per tahun), kalibrasi Platt, uji balik POD/FAR/CSI/ETS dengan block bootstrap, prospektif append-only, kesetaraan Python ↔ JS.
- **Bug yang dibetulkan dulu sebelum kerangka disalin**: strata sabana di `sebaran_model.js` tidak sama dengan `latih.py`; pilihan McArthur tidak dipakai di peramban; prospektif masih nol. Rinciannya `docs/multi-bencana/PELATIHAN-MODEL.md`.
- Layar tidak menghitung ulang angka pipeline; skema JSON adalah kontrak dengan `pipa-data` dan `model-sebaran`.
- Data BNPB bertipe campur selalu lewat `angkaID()`.
- Status resmi lembaga didahulukan; indeks buatan sendiri tidak pernah menimpa status resmi.

## Gerbang penjaga

| Gerbang | Menjaga | Jalankan |
| --- | --- | --- |
| `tests/agen/gerbang-ilmu-agent.test.mjs` | katalog dan definisi agent segar, tiap agent punya ilmu, tiap berkas kode tepat satu pemilik, jejak melewati yang tak berubah | `npm run uji:agen` |
| `tests/agen/gerbang-model-agent.test.mjs` | tiap agent punya `model:`; agent bawaan turun ke Sonnet lewat `CLAUDE_CODE_SUBAGENT_MODEL` | `npm run uji:agen` |
| `tests/agen/gerbang-wrangler.test.mjs` | konfigurasi worker | `npm run uji:agen` |
| `tests/warga/*.test.mjs` | gerbang route, skema D1, API, tepi, statistik, klien, foto, OG, dijalankan di Miniflare sungguhan | `npm run uji:warga` |
| `npm run agents:check` | definisi agent sinkron dengan `roster.json` | |
| `scripts/i18n/kumpul.mjs` | teks yang belum diterjemahkan atau bercampur | `node scripts/i18n/kumpul.mjs` |
| `scripts/terbit/versi.py uji` | pemberi versi aset | |
| `.gitignore` | salinan nyasar `* 2` dan `* 2.*` | |

**Batas mati** (`AGENTS.md` §9): tidak ada `wrangler deploy` atau push produksi dari subagent; gerbang, plafon, dan uji haram dilemahkan; subagent tidak commit; berkas `* 2.*` tidak disunting; secret tidak pernah masuk berkas yang dilacak git. Commit dengan path spesifik, tidak pernah `git add -A`.

**Gerbang yang direncanakan** (lihat rencana multi-bencana): `gerbang-copy`, `gerbang-tanpa-salin`, `gerbang-model`, gerbang peta, dan uji integrasi registry.

## Armada agent

14 agent, generate dari `scripts/agents/roster.json` (`.claude/ilmu-agent/KATALOG.md`):

| Kelas | Agent |
| --- | --- |
| Pengerja domain (Sonnet) | `pipa-data`, `model-sebaran`, `banjir`, `warga-api`, `layar-peta` |
| Pengerja platform (Sonnet) | `mekanik-mesin`, `penulis-gerbang` |
| Pemeriksa | `validasi-model`, `security-reviewer`, `inp-reviewer` (Sonnet); `guard-api`, `migrasi-idempoten`, `higiene-repo`, `selera-angka` (Haiku) |

Aturannya: Opus merencanakan, model murah mengerjakan; penulis kode bukan pengulasnya; fan-out yang menulis memakai worktree. Tiap bencana baru mendapat pengerja Sonnet sendiri dengan ilmu dan wilayah berkasnya.

## Rencana multi-bencana

Rencana lengkap ada di `docs/multi-bencana/` dan diterbitkan sebagai artifact "Rencana Multi-Bencana". Urutannya: fondasi bersama (FASE-0), banjir naik kelas, gempa dan tsunami, cuaca ekstrem, kualitas udara, gunung api, kekeringan, lalu beranda semua bencana.

| Berkas | Isinya |
| --- | --- |
| `ARSITEKTUR.md` | registry, rute, data, pipeline, worker, D1, layar, i18n, OG, agent |
| `PAKET-FITUR.md` | 113 komponen karhutla dan padanannya |
| `FASE-0.md` | fondasi bersama sebelum bencana ketiga |
| `ALUR.md` | 12 tahap per bencana dengan gerbang tiap tahap |
| `SUMBER-DATA.md` | sumber data terbuka terverifikasi |
| `PETA.md` | cetak biru peta |
| `PELATIHAN-MODEL.md` | kerangka latih bersama |
| `COPYWRITING.md` | suara, pola, kosakata padanan |
| `MODUL-PLUG-AND-PLAY.md` | katalog 35 modul dan medan registry |
| `bencana/*.md` | spesifikasi per bencana |

## Buku pegangan rujukan

Lima buku pemilik dari proyek lain, disalin ke `docs/buku-pegangan/rujukan/` dan diterbitkan ulang sebagai artifact. Yang ditiru dari sana: bentuk buku ini (riwayat bertanggal, keputusan diputus dan belum, gerbang, armada), protokol tiga lapis (perbaiki, catat, gerbang), dan aturan bahwa halaman diterbitkan ulang ke URL yang SAMA. Alamatnya di `docs/buku-pegangan/ARTIFACT.json`.

## Cara halaman ini diperbarui

1. Keputusan baru pemilik masuk ke **Riwayat** (bertanggal, kutipan miring) lalu ke bagian aturannya, di `docs/buku-pegangan/pantau-bencana.md`.
2. Bangun ulang: `python3 docs/buku-pegangan/bangun.py pantau-bencana`.
3. Terbitkan ulang ke URL yang tersimpan di `docs/buku-pegangan/ARTIFACT.json`. **Jangan pernah menerbitkan sebagai artifact baru**: itu tidak gagal, ia cuma melahirkan halaman kedua dan yang lama berhenti diperbarui tanpa ada yang tahu.
4. Routine harian yang menyapu sisanya dirumuskan di `docs/buku-pegangan/ROUTINE.md`.
