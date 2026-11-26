# KEPUTUSAN-KABAR-ALUN: Alun-alun sebagai satu tempat kabar bencana per kejadian

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Kabar satu kejadian bencana sekarang tersebar di empat tempat yang tidak saling kenal:

| Kabar | Tempat sekarang | Siapa melihat |
| --- | --- | --- |
| Laporan Kejadian Bencana Harian BNPB (27 kejadian pada laporan 24-25 Nov 2026) | deck PPTX dan `data/laporan-bnpb/harian/<bulan>/<hari>/kerja-DDMMYY/data.json`, dibuat `data/laporan-bnpb/generator/harian.py` dari teks WA Dit. Koordalops | pimpinan, lewat PDF/PPTX |
| Laporan warga Lapor Bencana | tab Alun-alun `/lapor` (`GET /api/lapor/alun`, hanya status ditindaklanjuti atau selesai) | publik |
| Berita | `public/banjir/data/berita*.json` dan `public/*/data/berita.json` dari `scripts/umum/berita.py` (Google News RSS, harian di `lintas.yml`) | publik, tapi tidak per kejadian |
| Media sosial | belum ada; hanya `scripts/umum/tiktok.mjs` manual, tidak terjadwal | tidak ada |

Pemilik (25 Nov 2026): "Gw juga mau masukkan berita-berita bencana dari medsos gitu juga masuk. Jadi kalo ada berita bencana all in disitu ada medsosnya ada beritanya ada laporannya gitu."

## Keputusan pemilik (25 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Laporan Kejadian Bencana Harian ditampilkan interaktif di peta (pemilik: "ini yang laporan harian ditampilkan dalam bentuk yang interaktif. Dalam peta"). |
| K2 | Tempatnya Alun-alun `/lapor`, bukan menu baru. Claude menyarankan Alun-alun jadi satu tempat semua kabar per kejadian; pemilik menjawab "Yes, start package" atas usulan itu. |
| K3 | Satu kejadian memuat semua kabarnya sekaligus: laporan resmi, laporan warga, berita, dan media sosial ("all in disitu"). |
| K4 | Paket dokumen lengkap dulu, baru kode (AGENTS.md 3.7). |
| K5 | (26 Nov 2026, jawaban Q2) Angka Laporan Kejadian Bencana Harian boleh tampil publik: pemilik memilih "Yes, publish". `public/data/alun/kabar.json` di-commit dan terbit. Daftar izin kolom D4 tetap berlaku. |

### Keputusan lama yang digantikan

| Keputusan lama | Bunyinya | Diganti oleh |
| --- | --- | --- |
| `lapor-kejadian` D5 | Alun-alun tidak berubah | K2, K3 |
| `lapor-kejadian` Q15 | kartu publik tidak menautkan ringkasan kejadian resmi karena "angka kedua sumber tidak boleh tampak setara" | K3, dengan pagar D3 di bawah: angka tidak pernah dijumlah dan tidak pernah tampak setara, tiap angka berlabel sumber |
| `alun-terpadu` K6 | pemilik tidak memilih "feed publik terkurasi" untuk forum `/alun` | hanya untuk tab Alun-alun `/lapor`; forum `/alun` (`alun_utas`) tidak berubah |

Aturan lama yang tetap berlaku: laporan warga yang belum ditindaklanjuti tidak pernah publik (`lapor-ai` K30, Q14); laporan warga tidak pernah membuat kejadian resmi (`lapor-kejadian`, `alun-terpadu` D3); label berita tidak pernah menutup kejadian (`cek-kabar` D1); berita hanya judul, cuplikan RSS, dan tautan (`scripts/data/berita.py:10`).

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satuan tampilan adalah **kejadian**: satu jenis bencana di satu kab/kota dengan tanggal mulai yang sama. Kunci kejadian resmi = `jenis + kab_kode + mulai`. Laporan warga, berita, dan medsos menempel pada kejadian itu; yang tidak menempel tampil sebagai kejadian berlabel "belum ada laporan resmi". | Laporan harian ditulis per kab/kota per jenis (`data.json`: `jenis`, `prov`, `lokasi`, `mulai`). |
| D2 | Empat pita sumber, selalu dengan nama sumbernya: **Resmi BNPB** (laporan harian), **Laporan warga** (Lapor Bencana, sudah ditindaklanjuti), **Berita** (media daring), **Media sosial**. Urutan tetap: Resmi dulu. | Pembaca harus tahu dari mana tiap kabar. |
| D3 | **Angka antarsumber tidak pernah dijumlah, dirata-rata, atau diletakkan dalam satu kolom.** Angka resmi tampil sebagai angka; angka warga tetap rentang berlabel "laporan warga" (`lapor-kejadian` Q6); berita dan medsos tidak menampilkan angka. | Pagar pengganti Q15. |
| D4 | Data resmi diambil dari `data.json` hari itu, hanya kolom daftar izin: `jenis`, `prov`, `lokasi`, `status`, `baru`, `angka.kk`, `angka.mengungsi`, `angka.rumah_dampak`, `mulai`, tanggal dan jam cut-off laporan. Kolom `teks.*`, `tangani`, `perhatian`, `label` tidak diterbitkan. | Teks bebas Koordalops bisa memuat nama orang atau kalimat internal. |
| D5 | Kode kab/kota dipasang dari nama `lokasi` + kode `prov` lewat pencari wilayah yang sudah ada (`public/geo/kecamatan`, cara `scripts/umum/berita.py`). Nama yang tidak cocok persis tidak ditebak: kejadian itu tampil tanpa titik peta, di daftar saja, berlabel "lokasi belum terpetakan". | Titik salah lebih buruk daripada tanpa titik. |
| D6 | Titik peta = titik tengah kab/kota. Tidak ada titik lebih halus dari kab/kota untuk data resmi. | `data.json` tidak memuat koordinat. |
| D7 | Berita menempel pada kejadian dengan aturan pencocok yang sudah ada (`scripts/data/dalops_kabar.py` `cocok()`: kab sama, tanggal dalam jendela, kata jenis cocok). Satu pencocok; tidak disalin. | Satu mesin per kemampuan (AGENTS 2.48 D). |
| D8 | Berita tampil: judul, nama media, jam terbit, tautan keluar. Tanpa cuplikan panjang, tanpa gambar dari media. Paling banyak 5 berita per kejadian, terbaru dulu. | Hak cipta; sama dengan `cek-kabar` D3. |
| D9 | Media sosial tidak diambil sebelum Q1 dijawab. Sampai itu, pita Media sosial menampilkan "Belum tersambung" dan tidak ada angka atau unggahan. | Belum ada sumber, biaya, atau izin yang diputuskan. |
| D10 | Bila medsos sudah tersambung: hanya jumlah unggahan per kejadian dan tautan ke pencarian platform; tidak ada nama akun, isi unggahan, atau foto warga (UU 27/2022, `pemantauan-medsos/naskah/04-pembahasan.md:15-17`). `public/data/medsos_tiktok.json` yang memuat "@akun" tidak dipakai. | PDP. |
| D11 | Tanpa tabel D1 dan rute Worker baru untuk data resmi, berita, dan medsos: pipeline menulis satu berkas publik `public/data/alun/kabar.json`. Laporan warga tetap dari `GET /api/lapor/alun`, digabung di peramban. | Data resmi dan berita sudah publik atau statis; laporan warga sudah punya rute berpagar. |
| D12 | Kesegaran ditulis di layar dari nilai `cutoff` di `data.json` apa adanya (25 Nov 2026 tertulis `2026-11-25T07:00+07:00`, bukan 12.00 WIB seperti README generator), misalnya "Laporan harian BNPB, cut-off 25 Nov 2026 07.00 WIB"; jam tidak pernah diketik tangan. Bila laporan resmi terakhir lebih tua dari 48 jam, kartu menulis "Laporan resmi terakhir <tanggal>", bukan "selesai" atau "aman". | Tidak pernah menulis "aman"; kosong bukan nol. |
| D13 | Status kejadian hanya dari laporan resmi (`status` di `data.json`: berjalan, selesai, belum). Berita, warga, dan medsos tidak pernah mengubah status. | `cek-kabar` D1. |
| D14 | Angka karhutla mengikuti `data.json` apa adanya (generator sudah memakai sistem satelit kita, README generator baris 45-48). Paket ini tidak menghitung ulang. | Satu sumber angka karhutla. |
| D15 | Pengerja: `pipa-data` untuk pengekspor `scripts/data/alun_kabar.py`; `layar-peta` untuk layar Alun-alun di `public/lapor/**`; `penulis-gerbang` untuk uji `tests/alun-kabar/**`. Tidak ada agent baru. | Pemilik berkas sudah ada (`ilmu.mjs pemilik`). |

## Pertanyaan terbuka

| No | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q1 | Media sosial dari platform mana dan lewat jalur apa (Threads dan Instagram lewat API Meta gratis, X berbayar per unggahan, TikTok tanpa API resmi untuk lembaga)? Berapa anggaran per bulan? Kajian `pemantauan-medsos` menghitung Paket Mulai sekitar Rp8,8 juta per bulan. | **[BAWAAN SEMENTARA]** belum tersambung (D9). |
| Q2 | **Terjawab K5: boleh publik.** Apakah angka Laporan Kejadian Bencana Harian boleh tampil publik? Laporan itu sekarang untuk pimpinan. | **[BAWAAN SEMENTARA]** kabar resmi hanya tampil di localhost sampai pemilik menjawab; `public/data/alun/kabar.json` dibangun tetapi tidak di-commit (`.gitignore`) dan tidak terbit (`public/.assetsignore`). Catatan: `data.json` harian dan deck harian sudah ter-commit di repo publik sejak Oktober 2026. |
| Q3 | Siapa yang menerbitkan data resmi tiap hari? Generator jalan di Mac pemilik dari teks WA, bukan di GitHub Actions. | **[BAWAAN SEMENTARA]** langkah ekspor ikut `jalan.py` hari itu dan berkasnya ikut commit laporan harian. |
| Q4 | Nama tab tetap "Alun-alun" atau diganti, misalnya "Kabar Bencana"? | **[BAWAAN SEMENTARA]** tetap "Alun-alun". |
| Q5 | Berita dari Google News RSS saja, atau ditambah portal resmi (BMKG, PVMBG, BPBD)? | **[BAWAAN SEMENTARA]** Google News RSS lewat `scripts/umum/berita.py` yang sudah ada. |
| Q6 | Berapa lama kejadian tetap tampil sesudah laporan resmi terakhir menyebut selesai? | **[BAWAAN SEMENTARA]** 7 hari, lalu hanya tampil lewat saringan "Selesai". |
| Q7 | Peringatan dini dan status gunung api di halaman 1 dan 4 deck ikut tampil? | **[BAWAAN SEMENTARA]** tidak di fase pertama; sudah ada di `/prediksi` dan `/gunungapi`. |
