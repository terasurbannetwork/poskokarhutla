# RISET: Alun-alun Terpadu

Diukur 15 Nov 2026 dari kode repo. Rujukan baris dicek ulang sebelum dipakai.

## 1. Yang sudah ada dan dipakai ulang

| Kebutuhan | Yang sudah ada | Tempat |
| --- | --- | --- |
| Buku Besar Kejadian | `sk_kejadian` (`jenis`, `prov`, `kab4`, `mulai`, `akhir`, `fase`, `publik`), `sk_kejadian_sumber` (`sumber`, `kode`, `kejadian_id`, `status`: terpasang, ambigu, tanpa_wilayah, ditolak) | `migrations/0120_sk_kejadian.sql:5`, `:58` |
| Rute ingest modul | `GET /api/siklus/ingest/modul` (izin sistem, paling lama 120 hari, kursor `lanjut`) | `src/kejadian_tautan.js:44`, `:88` |
| Daftar sumber modul | `KT`: `tugas_api`, `logbook_d1`, `sippa`, `lapangan`, `gempa_d1`, `lapsus` | `src/hak.js:487` |
| Pencocok | jendela 3 hari, jenis dan kab4, `SUMBER_MODUL`, `tarik_modul` | `scripts/siklus/pasang.py:19`, `:345`, `:348` |
| Keputusan pencocok dikirim balik | `POST /api/siklus/ingest/kejadian` | `src/siklus_kejadian.js:474` |
| Baca tautan untuk layar | `GET /api/siklus/kejadian/tautan` (staf dan BPBD) | `src/kejadian_tautan.js:58` |
| Peta id registri bencana ke jenis Buku Besar | `PETA` | `src/kejadian_tautan.js:13` |
| Kode kabupaten dari nama | `kab4Dari(prov, kab)`: cocok nama polos persis; null bila ganda atau tidak dikenal | `src/siklus_kab.js` |
| Lingkup wilayah akun instansi | `lingkupSql`, `dalamLingkup`, `lingkupKab4` | `src/instansi.js:250`, `src/siklus_kab.js:49` |
| Sesi instansi | `akunAktif`, `sesiDari`; kolom `tingkat`, `cakupan`, `prov`, `kab` | `src/instansi.js:108`, `:120` |
| Rute instansi yang dipakai modul lain | pola `/api/instansi/siklus/*` | `src/siklus.js:47` |
| Identitas penulis alun-alun | `penulis()`, `alun_penulis (pos_id, mk_id, label)`, `mkAkunSaya` | `src/alun.js:143`, `migrations/0133_masuk.sql:95`, `src/hak.js:786` |
| Pemberitahuan push dan email per wilayah | `kabarkan()`, penghapus ganda `kabar_terkirim`, paling banyak 40 penerima per kejadian | `src/kabar.js:47`, `:15` |
| Pengingat bantuan terbuka | jenis `bantuan_terbuka` dari `alun_utas` | `src/pengingat.js:76` |
| Kartu alun-alun di Layar Pimpinan | dua angka dan dua judul dari `/api/alun/admin` | `public/admin/pimpinan.js:112` |
| Angka operasi di dasbor pimpinan | `operasi()` mengembalikan `{nilai, sumber, waktu}` | `src/pb_ringkas.js:66` |
| Rekap di luar D1 | `scripts/umum/pb_ringkas.py` menulis berkas ringkas dari berkas | `scripts/umum/pb_ringkas.py` |
| Daftar kabupaten per provinsi di layar | `/data/wilayah/indeks.json`, dipakai `/masuk` | `public/masuk.js` |

## 2. Batas yang ditemukan

| Batas | Akibat untuk rancangan |
| --- | --- |
| Alun-alun tidak ada di `KT`, `SUMBER_MODUL`, maupun inventaris input (`INVENTARIS-INPUT.md:36` menulis "tidak") | Ditambahkan sebagai sumber ketujuh (D1) |
| `alun_utas.kab` teks bebas 2 sampai 60 huruf; `bencana` id registri termasuk `umum`, `pesisir`, `udara` yang tidak ada di jenis Buku Besar | Kab4 dihitung saat ingest; jenis yang tidak terpetakan tidak dikirim (D2, D4) |
| Koordinat utas dibulatkan dua desimal (sekitar 1 km) | Cukup untuk menentukan kabupaten, tidak untuk titik |
| Cookie `sesi_instansi` hanya berpath `/instansi` dan `/api/instansi` | Rute kotak masuk dan balasan lembaga ada di bawah `/api/instansi/alun` (D5) |
| `push_langganan` hanya untuk akun instansi; staf hanya email | Pemberitahuan utas ke BPBD lewat push; email mengikuti status domain pengirim |
| Indeks `alun_utas` hanya `(moderasi, dibuat)`, `(jenis, dibuat)`, `(bencana, prov)`; statistik admin memindai | Indeks baru untuk kotak masuk; rekap dipindah ke pipeline (D8) |
| Plafon gerbang D1 untuk `src/alun.js`: 9 pindai, 187 akses | SQL baru di `src/hak.js`; tidak menambah pindai |
| Baca D1 produksi 3,14 juta baris per hari dari 5 juta | Rekap tidak dihitung saat layar dibuka |
| Laporan Berkala belum punya kode | Hanya berkas angka yang disiapkan (D11) |
| KEPUTUSAN-CEK-KABAR Q3: laporan warga tidak dipakai di fase 1 | Tidak diubah oleh paket ini (Q5) |
| Dasbor pimpinan tidak punya registri kartu umum; baris operasi di larik `OPERASI` | Angka alun-alun masuk sebagai baris operasi baru |

### 2.1 Koreksi dari pemeriksa bersih (15 Nov 2026)

| Yang semula ditulis | Kenyataan di kode | Akibat untuk rancangan |
| --- | --- | --- |
| Pencocok dipakai apa adanya | `pasang.py` hanya menerima satu entri per sumber per kejadian, dan tanpa kandidat berarti membuat kejadian baru | aturan khusus sumber `alun` (ALGORITMA 3) |
| Rute ingest Worker aman dari kiriman warga | `POST /api/siklus/ingest/kejadian` menerima aksi `baru` dari sumber mana pun, dan kejadian baru berkeyakinan terverifikasi | Worker menolak aksi `baru` untuk sumber `alun` |
| Kode kabupaten dihitung dari teks saat ingest | `kab4Dari` cocok nama polos persis; daftar di `public/data/wilayah/indeks.json` berbentuk "Kab. X"; pipeline memetakan sendiri lewat `KN.kab4`; kotak masuk membandingkan teks | kabupaten baku berkode disimpan saat tulis (D4) |
| Koordinat dipakai bila ejaan tidak dikenal | rute ingest membuang koordinat bila ada `kab`, dan mengirim 0,0 bila keduanya kosong | koordinat tidak dipakai untuk wilayah |
| Tautan bisa dibuang pipeline | ingest hanya menyisipkan; tidak ada aksi lepas; hapus utas tidak menyentuh `sk_kejadian_sumber` | tautan dicabut di Worker saat moderasi (D12) |
| Riwayat meniru trigger `dl_tindak` | `migrations/0128_dl_tindak.sql` tidak memakai trigger | tanpa trigger; dijaga kode dan gerbang (D11) |
| Label lembaga lewat `alun_penulis` | `alun_penulis.mk_id` wajib terisi; balasan dari sesi instansi tidak punya `mk_id` | tabel samping `alun_lembaga` |
| Rekap ditulis ke `alun/rekap/` | gudang Siklus menolak kunci di luar `siklus/{mentah,bersih,saji}/` | kunci di bawah `siklus/saji/alun/` |
| Angka masuk dasbor pimpinan lewat `pb_ringkas` | rute itu juga dibuka untuk pemirsa; `/admin/pimpinan` hanya admin | dasbor pimpinan di luar paket (Q11) |
| `kabarkan()` memuat judul | kepala `src/kabar.js` menyatakan isi tanpa teks bebas; `semuaAkun` dibatasi 500 akun | isi tanpa judul; pencarian akun wilayah berindeks sendiri |
| Label lembaga hanya pada balasan lembaga | sekarang label menempel pada semua kiriman pemilik nomor akun (`src/alun.js`) | D7 mengubah perilaku itu |

## 3. Praktik yang ditiru

| Praktik | Sumber | Dipakai di |
| --- | --- | --- |
| Laporan warga menempel ke insiden resmi, tidak membuat insiden | sistem 311 dan pusat kendali darurat yang memisahkan "permintaan layanan" dari "insiden" | D3 |
| Satu nomor kejadian lintas modul | IRWIN, GLIDE (sudah dipakai paket Keterpaduan) | D1 |
| Waktu respons pertama dan permintaan terbuka sebagai ukuran layanan | ukuran lazim meja layanan publik | ALGORITMA 4 |
| Balasan lembaga bertanda dan dibatasi wilayah | praktik akun resmi berlencana | D6 |
| Angka agregat untuk pimpinan, rincian untuk pelaksana | OCHA 3W dan dasbor situasi | D9 |

## 4. Paket lain yang bersinggungan

| Paket | Singgungan | Batas yang dijaga |
| --- | --- | --- |
| `keterpaduan/` | mesin tautan kejadian | paket ini hanya menambah satu sumber |
| `pintu-masuk/` | `sesi_masuk`, `alun_penulis`, anggota akun | dipakai apa adanya |
| `paritas-bencana/` | dasbor pimpinan | hanya menambah baris angka |
| `laporan-berkala/` | perakit angka | hanya menyediakan berkas |
| `cek-kabar/` | kabar luar lawan laporan resmi | tidak menambah sumber di sana |
| `juklak/` | meja `pengaduan` | pengaduan bukan alun-alun; identitas pelapor tidak disentuh |
| `tiga-w/` | tawaran bantuan organisasi | tidak digabung; tautan dua arah menunggu keputusan |
| `tindak-langkah/` | log tindak lanjut | pola riwayat append-only ditiru untuk status bantuan |

## 5. Yang sengaja tidak dibuat

- Pengelompokan teks atau deteksi hoaks otomatis.
- Feed publik, hub tukar data, daftar warga rentan (K6).
- Pembacaan WA masuk (K5).
- Kotak masuk umum lintas modul; yang dibuat hanya kotak masuk alun-alun.
- Pembuatan kejadian dari kiriman warga (D3).
