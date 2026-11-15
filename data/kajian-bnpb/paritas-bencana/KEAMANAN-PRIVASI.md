# KEAMANAN-PRIVASI: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md` (D8: operasi non-karhutla memakai pola privasi Operasi Udara) dan `DESAIN-TEKNIS.md`. Pola yang ditiru: `data/kajian-bnpb/operasi-udara/KEAMANAN-PRIVASI.md`. Rute dan tabel yang dimaksud didefinisikan di `DESAIN-TEKNIS.md` bagian 3 dan 5; dokumen ini tidak mengulang skemanya.

## 1. Kelas data

| Data | Kelas | Tempat | Siapa boleh baca |
| --- | --- | --- | --- |
| Sarana dan fasilitas sasaran (`pb_titik`) | operasional internal | D1 | peran baca bagian 2 |
| Renlap generik: target, rute, koordinat (`pb_renlap`, R2 `operasi/renlap/<bencana>/...`) | operasional internal | D1 metadata, R2 isi | peran baca bagian 2; tidak publik |
| Hasil tindakan dan kepatuhan (`pb_renlap_hasil`) | operasional internal | D1 | peran baca bagian 2 |
| Dokumen beku: sitrep, renops, laporan per KIB (`pb_dokumen`, R2 `dokumen/...`) | internal; sebagian dapat dibagikan pimpinan secara manual | D1 metadata, R2 isi | peran baca bagian 2 |
| Pelaksanaan butir tangga tindakan (`pb_tindakan`) | operasional internal | D1 | peran baca bagian 2 |
| Riwayat tulis (`pb_log`) | jejak audit | D1 | peran baca (hanya `oleh`, aksi, sebelum, sesudah); tulis hanya Worker |
| Papan status darurat (turunan `logbook_sk`) | internal | hitung saat baca dari D1 | peran baca bagian 2 |
| Angka ringkas dan prospektif per bencana (`public/data/ringkas/<id>.json`) | publik (data dari sumber publik dan hitungan sistem) | aset statis | siapa pun; tanpa data operasi dan tanpa lokasi regu |
| Ekonomi, pencegahan, prioritas wilayah (`public/data/ekonomi|pencegahan|prioritas/<id>.json`) | publik, tanpa data operasi | aset statis | siapa pun; angka rupiah hanya bila koefisien bersumber (Q6) |
| Daftar butir tindakan per tingkat peringatan (`public/ews_tindakan.js`) | publik | aset statis | siapa pun (sudah publik) |
| Peringatan terpadu dan CAP (`src/peringatan.js`) | publik, label sumber jujur | rute yang sudah ada | siapa pun (tidak berubah) |
| Angka biaya kontrak, harga satuan | harga publik (IHPB, IKK, PIHPS) boleh; harga kontrak dan anggaran satuan kerja TIDAK | tidak ada di paket ini | koefisien harga hanya dari sumber BPS dan Panel Harga Pangan; kontrak tidak dibawa (D8) |

## 2. Matriks hak per rute dan peran

Peran: **staf** = `staf` bertoken sesi (`src/staf.js`, peran `pusdalops`, `koordalops`, `pimpinan`, `udara`, `tmc`, dan lainnya); **moderator** = pemegang `ADMIN_TOKEN` (`modOK`, `src/posko.js`); **akun gerbang** = `AKUN_SITUS*` (`adminOK`: dipakai pimpinan sebagai pembaca); **instansi** = akun instansi pemda aktif (`akunAktif`, `src/instansi.js:118`: pemprov, pemkab, pemkot); **pemirsa** = `pemirsaLihat` (`src/staf.js:61`, sesi pemirsa bertab pusdalops, hanya GET); **mesin** = pemanggil dengan kunci rahasia; **publik** = tanpa sesi.

Lambang: T = boleh tulis; B = boleh baca; W = hanya wilayahnya; - = ditolak (403, atau 401 bila tanpa sesi); M = rute mesin.

| Rute | pusdalops | koordalops | pimpinan | moderator | akun gerbang | instansi (pemda) | udara/tmc | pemirsa | mesin | publik |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/pb/titik` | B | B | B | B | B | B,W | B hanya karhutla dan udara | B | - | - |
| `POST /api/pb/titik`, `/hapus` | T | - | - | T | - | T,W | - | - | - | - |
| `GET /api/pb/renlap`, `/kepatuhan` | B | B | B | B | B | B,W | B hanya karhutla dan udara | B | - | - |
| `GET /api/pb/renlap/berkas` | B | B | B | B | B | B,W | B hanya karhutla dan udara | - | - | - |
| `POST /api/pb/renlap` (minta) | T | - | - | T | - | T,W | - | - | - | - |
| `POST /api/pb/renlap/terbit`, `/selesai-tandai` | T | T | - | T | - | T,W | - | - | - | - |
| `POST /api/pb/renlap/selesai` (callback) | - | - | - | - | - | - | - | - | M (HMAC) | - |
| `POST /api/pb/hasil` | T | - | - | T | - | T,W | - | - | - | - |
| `POST /api/pb/dokumen/rakit` | T | T | - | T | - | - | - | - | - | - |
| `POST /api/pb/dokumen/bekukan` | T | T | T | T | - | - | - | - | - | - |
| `GET /api/pb/dokumen`, `/berkas` | B | B | B | B | B | - | - | - | - | - |
| `GET /api/pb/tindakan` | B | B | B | B | B | B,W | - | B | - | - |
| `POST /api/pb/tindakan` | T | - | - | T | - | T,W | - | - | - | - |
| `GET /api/pb/ringkas`, `/papan-sk` | B | B | B | B | B | B,W | - | B | - | - |
| Aset statis `public/data/ringkas/*`, dll | B | B | B | B | B | B | B | B | B | B |

Aturan di balik matriks:

1. **Tulis memakai `modOK` atau peran tulis, TIDAK pernah `adminOK`.** `adminOK` juga meloloskan akun gerbang `AKUN_SITUS*` yang dipakai pimpinan sebagai pembaca; dalam paket ini mereka tidak pernah menulis (uji 403, bagian 8). Ini aturan yang sama dengan `src/operasi_isian.js` (alasan terdokumentasi di kepala berkasnya).
2. **Peran dicek ulang tiap permintaan** dari sesi (`stafPeran`), tidak di-cache dalam isolate: peran dicabut = 403 pada permintaan berikutnya.
3. **Wilayah (W):** staf berwilayah disaring `dalamWilayahStaf` (`src/staf.js:95`, larik provinsi, kosong = nasional); akun instansi dibatasi `prov` akunnya dan, untuk tingkat kab, `kunci_wilayah` (Q30 di DESAIN-TEKNIS.md). Kode wilayah dalam badan permintaan TIDAK dipercaya; Worker membandingkannya dengan wilayah sesi pada tiap rute dan pada tiap baris saat baca. Peran `pimpinan` dan akun gerbang dibatasi sama seperti `staf` menurut `wilayah`-nya; moderator nasional.
4. **Jenis bencana per peran:** `udara` dan `tmc` hanya membaca `bencana` karhutla dan udara (domain mereka di Operasi Udara); permintaan jenis lain dijawab 403.
5. **Pemirsa** hanya GET dan hanya data yang pola jalurnya ditambahkan ke `IZIN_PEMIRSA_PUSDALOPS` (`src/staf.js:50`): `/api/pb/titik`, `/renlap`, `/kepatuhan`, `/tindakan`, `/ringkas`, `/papan-sk`. Berkas renlap dan dokumen (`/berkas`) TIDAK masuk daftar pemirsa [BAWAAN SEMENTARA, mengikuti Operasi Udara yang menutup PDF renlap bagi pemirsa; Q31 di bagian 10].
6. **Rute mesin** tidak menerima sesi; kunci rahasia saja. Callback `renlap/selesai` memakai HMAC dengan anti-replay (bagian 4).
7. **Publik** tidak punya rute `/api/pb/*`. Data publik hanya berkas statis (bagian 7), yang tidak memuat data operasi.
8. Pemeriksaan hak berada di Worker, bukan di layar. Layar menyembunyikan tombol bila peran tidak cukup, tetapi itu kenyamanan, bukan pengaman (tiap rute tulis tetap memeriksa ulang).

## 3. Data pribadi (UU PDP) dan privasi operasi

Prinsip: yang tidak perlu disimpan tidak disimpan. Operasi dan renlap membutuhkan tempat, jenis sarana, jumlah, dan waktu; tidak membutuhkan siapa orangnya.

| Larangan atau aturan | Penjaga |
| --- | --- |
| **Tanpa nama kru, regu, relawan, pelapor, atau korban** di data operasi (`pb_titik`, `pb_renlap`, `pb_renlap_hasil`, `pb_dokumen`, `pb_tindakan`, `pb_log`, berkas R2). `nama` pada `pb_titik` adalah nama tempat atau unit ("Gudang BPBD Kab X", "Regu SAR 2"), bukan nama orang. | tidak ada kolom orang di skema; panjang kolom bebas dibatasi (`nama` 80, `catatan` 200, `alasan` 300); formulir menampilkan peringatan "tanpa nama orang" di kolom bebas; gerbang `tests/agen/gerbang-paritas.test.mjs` (baru) memindai skema `pb_*` dan menolak kolom bernama `nama_kru`, `pelapor`, `korban`, `no_hp`, `wa`, `nik`, `email` |
| **Tanpa nomor telepon, NIK, alamat rumah, atau akun WA** di kolom mana pun. Kontak lapangan tetap di tempat yang sudah ada (`staf`, `instansi_akun`, buku kontak) dan tidak disalin ke `pb_*` atau ke dokumen beku. | uji dokumen: JSON dokumen hasil rakitan dipindai pola nomor telepon (`\+?62\d{8,12}`, `08\d{8,12}`) dan NIK 16 digit; ada yang cocok = rakit gagal 422 |
| **Pengisi dicatat `staf:<id>`, `admin:<hash12>`, atau `instansi:<id>`**, bukan nama atau nomor HP. Nama staf diambil saat tampil dari tabel staf yang sudah ada, hanya untuk peran baca yang berhak melihat riwayat. | `oleh` diisi Worker dari sesi, tidak pernah dari badan permintaan |
| **Teks bebas dibersihkan**: karakter kontrol dibuang, spasi dilipat, dipangkas ke batas; keluaran ke HTML selalu lewat `esc()` dan ke KML/GPX/XML lewat `xml()`. | fungsi `teks()` (`src/operasi_isian.js`) dipakai ulang; uji XSS pada `nama`, `catatan`, `alasan` |
| **Data korban dan terdampak sebagai angka agregat saja** (jiwa terdampak, pengungsi per kab), tidak per orang. Pengungsi terpilah (jenis kelamin, umur, rentan) mengikuti `docs/bnpb/` meja pengungsi yang sudah ada dan tidak ditarik ke paket ini. | dokumen beku hanya memuat kunci angka bernama (daftar tetap di `scripts/umum/pb_ringkas.py`) |
| **Koordinat target renlap dan fasilitas** dapat membuka lokasi sensitif (gudang logistik, posko). Hanya peran baca bagian 2; tidak ada di `public/`. | bagian 7 |
| **EXIF foto**: paket ini TIDAK menerima unggahan foto. Foto lapangan tetap di modul yang sudah ada (`src/foto*.js`, `src/foto_lapangan.js`). | tidak ada rute foto di `src/pb_*.js` |
| **Retensi**: versi beku, `pb_log`, dan hasil tidak dihapus oleh kode (`pb_renlap` tidak pernah di-DELETE). Penghapusan manual pemilik. Hapus lunak untuk `pb_titik` menyimpan `dihapus` dan riwayat. | tidak ada fungsi hapus keras di `src/hak.js` untuk `pb_*` |
| **Tujuan terbatas**: data `pb_*` dipakai untuk koordinasi operasi dan pelaporan resmi; tidak dipakai untuk profil orang, penilaian kinerja individu, atau analitik pihak ketiga. | tidak ada kolom orang; `oleh` tidak dipakai di kartu yang menilai kinerja individu (kepatuhan dilaporkan per bencana, wilayah, dan jenis alasan, bukan per pengisi) |
| **Ekspor dan berbagi**: dokumen beku yang dibagikan pimpinan keluar sistem adalah keputusan manusia; sistem tidak membuat tautan publik atau tautan berbagi. | tidak ada rute publik untuk dokumen; tidak ada token berbagi |

Laporan hasil rakitan (sitrep, renops) memuat angka dan nama tempat saja. Kalimat staf (`kalimat_staf`) adalah teks bebas; ia dibersihkan seperti kolom bebas lain, dan formulirnya menampilkan peringatan yang sama.

## 4. Secret dan mesin

| Secret | Dipakai untuk | Aturan |
| --- | --- | --- |
| `GITHUB_TOKEN` (sudah ada, `src/jaga_jadwal.js`) | memicu `renlap-pb.yml` lewat `workflow_dispatch` | fine-grained, Actions read and write, repo ini saja (catatan di `src/jaga_pipa.js:6`); tanpa token = rute `POST /api/pb/renlap` menjawab 503 "pemicu renlap belum dipasang", baris tidak dibuat; nilai tidak pernah dicatat atau dikembalikan |
| `RENLAP_KUNCI` (sudah ada, `src/sippa.js:1876`) | HMAC callback `POST /api/pb/renlap/selesai` | `x-renlap-kunci` = HMAC-SHA256(`RENLAP_KUNCI`, `id|waktu|status|ringkas`, ringkas = `fmt:sha256` isi tiap berkas urut abjad, jadi badan yang diganti ditolak) dengan `x-renlap-waktu` detik epoch UTC; selisih ≤ 300 detik; pembandingan waktu konstan (`samaTetap`); HMAC dihitung selalu, juga bila `id` tak dikenal (tidak membocorkan keberadaan id); `status` hanya `draf` atau `gagal`; isi berkas dipindai nomor HP dan NIK 16 digit (422) sebelum ke R2; 20 percobaan salah per jam per IP lalu 429 |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (sudah ada di GitHub Secrets untuk `renlap.yml`) | workflow menulis R2 | diteruskan hanya sebagai env langkah yang membutuhkannya; tidak dicetak; token berskop R2 saja |
| `ADMIN_TOKEN`, `IP_SALT`, `AKUN_SITUS*` | moderator, hash IP, akun gerbang | tidak disentuh; rute tulis menjawab 503 bila `IP_SALT` tidak ada (pola `masuk()` di `src/operasi_isian.js`) |

Tidak ada secret baru. Tidak ada secret yang masuk berkas terlacak git (AGENTS.md bagian 9; `higiene-repo` memeriksanya). Masukan workflow (`bencana`, `prov`, `kab`, `tanggal`, `renlap_id`) divalidasi ulang di langkah pertama dengan regex tegas dan tidak pernah disisipkan ke perintah shell mentah: dilewatkan sebagai variabel lingkungan dan dibaca Python lewat `os.environ` (lihat pola injeksi di `.github/workflows/renlap.yml`: `env:` bukan interpolasi `${{ }}` di dalam skrip `run`). Tinjau lokal (`localhost:8800`) meneruskan cookie sesi produksi: hanya mendengar di loopback; login diketik pemilik sendiri, Claude tidak mengetik sandi produksi (AGENTS.md 3.8).

## 5. Batas laju dan kuota

| Batas | Nilai | Cara |
| --- | --- | --- |
| Tulis per pengisi | 60 per 10 menit | hitung `pb_log` (`SELECT count(*) FROM pb_log WHERE oleh = ? AND waktu > ?`, indeks `pb_log_oleh`), pola `opLajuIsian`; 429 pesan Indonesia |
| Minta renlap per pengisi | 6 per jam | sama; mencegah pembakaran menit CI |
| Renlap `diminta` bersamaan per wilayah | 1; yang kedua menjawab 409 "sudah ada permintaan berjalan" | `pb_renlap` status `diminta` kurang dari 30 menit untuk (bencana, prov, kab, tanggal) |
| Callback mesin | tidak dibatasi pengisi; cek waktu ≤ 300 detik, status hanya naik dari `diminta` (uji transisi) | HMAC |
| Badan tulis | JSON ≤ 32 KB; unggahan mesin ≤ 15 MB | `bacaBody(req, batas)`; 411/413 sebelum membaca isi |
| Baca | rentang tanggal ≤ 31 hari; `LIMIT` ≤ 500; tanpa kueri terjadwal baru | gerbang `gerbang-d1-pindai` dan uji rentang |
| Kuota D1 Free | 5 juta baris dibaca per hari (memori `d1-kuota-baca`) | indeks wajib SEARCH; cache isolate 5 menit untuk `ringkas` dan `papan-sk`; tanpa cron baru (DESAIN-TEKNIS.md bagian 9) |
| Login | tidak berubah | batas yang ada di `src/staf.js` dan `src/instansi.js` |

## 6. Validasi masukan (di Worker, bukan di layar)

| Masukan | Aturan |
| --- | --- |
| `bencana` | anggota registri DAN `kemampuan.operasi = true`; selain itu 404 (bukan 400, agar jenis tak aktif tidak terbaca sebagai salah ketik) |
| `prov` | 2 digit anggota `PROV`; `kab` kosong atau 4 digit anggota daftar kab (dibangkitkan dari `scripts/umum/nama_wilayah.py`); harus dalam wilayah sesi |
| `tanggal` | `YYYY-MM-DD` sah (`tglSah`); hari ini WIB sampai 7 hari ke belakang untuk isian; tidak di depan hari ini |
| `jenis`, `golongan`, `status`, `alasan`, `hasil`, `pelaksana` | anggota daftar tetap (yang sama dengan CHECK tabel dan `KEMAMPUAN[bencana]`); selain itu 400 dengan daftar sah |
| `lat`, `lon` | `dalamBbox` (lat -11,5 sampai 6,5; lon 94,5 sampai 141,5), bilangan berhingga |
| angka (`kapasitas`, `jml_target`, `versi`) | bilangan bulat dalam rentang CHECK; bukan string |
| teks bebas | dipangkas dan dibersihkan (`teks()`), batas panjang kolom |
| `id` | 16 heks (`^[0-9a-f]{16}$`) dihasilkan server; `id` dari klien hanya untuk ubah baris yang sudah ada dan harus ada di wilayah pemanggil (IDOR dicegah: kepemilikan wilayah dicek pada baris, bukan pada permintaan) |
| `fmt` berkas | anggota `json, pdf, kml, gpx, txt`; kunci R2 disusun server dari nilai tervalidasi, bukan dari masukan |
| Badan | `Content-Type` `application/json` untuk tulis; `application/pdf` dengan tanda tangan `%PDF-` untuk unggahan PDF mesin |
| Unggahan mesin | ukuran ≤ 15 MB; `sha` 64 heks dicocokkan dengan hitungan Worker bila berkas dibaca ulang; `put` R2 `onlyIf etagDoesNotMatch "*"` (tidak menimpa) |
| Transisi status | tabel transisi sah tetap (`diminta` ke `draf` atau `gagal`; `draf` ke `terbit`; `terbit` ke `selesai`; `dibatalkan` dari `draf` atau `terbit`); loncatan = 409 |
| CSRF | dijaga terpusat di `src/worker.js` (POST bercookie `sesi_staf` atau `sesi_admin` wajib Origin sama-situs); rute baru tidak dikecualikan, dan tulis hanya menerima `application/json` |
| Respons galat | pesan Indonesia tanpa jejak tumpukan, tanpa isi SQL, tanpa nilai secret |

## 7. Larangan menulis `public/` untuk data operasi

1. Tidak ada kode paket ini (Worker, workflow, skrip) yang menulis `renlap`, `hasil`, `tindakan`, `dokumen`, `titik`, atau papan SK ke `public/`. Data operasi hidup di D1 dan R2 di balik sesi. Alasan: `public/` dilayani sebagai aset statis tanpa autentikasi (`wrangler.jsonc` `assets.directory = ./public`) dan repo ini publik; yang masuk `public/` atau commit menjadi publik.
2. Yang boleh ke `public/data/` hanya keluaran dari sumber publik dan hitungan sistem: `ringkas/<id>.json`, `ekonomi/<id>.json`, `pencegahan/<id>.json`, `prioritas/<id>.json`, dan `tugas_<id>.json` (kontrak lama). Berkas itu tidak memuat: koordinat regu atau target renlap, jumlah dan lokasi sarana yang ditugaskan, status SK per wilayah dengan nomor, persen kepatuhan per wilayah, atau nama orang. Tugas `tugas_longsor.json` dan `tugas_pesisir.json` mengikuti kontrak `tugas_<id>.json` yang sudah ada (berisi kejadian dari data publik).
3. Gerbang baru `tests/agen/gerbang-paritas.test.mjs` (pemilik `penulis-gerbang`): (a) memindai `src/pb_*.js`, `scripts/umum/renlap*.py`, `scripts/umum/pb_*.py`, `.github/workflows/renlap-pb.yml` dan menolak jalur tulis ke `public/` selain daftar putih `public/data/{ringkas,ekonomi,pencegahan,prioritas}/`; (b) menolak kunci JSON bernama `nama_kru`, `pelapor`, `no_hp`, `nik`, `plafon`, `harga_kontrak`, `tarif` di berkas daftar putih; (c) menolak berkas `public/data/ringkas/*.json` di atas 100 KB dan berkas lain di atas 1 MB (Q29). Mirip penjaga biaya di RENCANA-UJI paket operasi udara.
4. Workflow tidak meng-commit data operasi: `renlap-pb.yml` memakai `permissions: contents: read` (pola `renlap.yml`), tidak ada langkah `git commit` atau `git push`.
5. Cache: respons rute baca memakai `cache-control: private, no-store` (daftar, berkas, ringkas internal, papan SK) dan `vary: cookie`; tidak lewat `cacheTepi` (`src/worker.js:805`, untuk GET publik tanpa data per pengguna saja). Cache isolate 5 menit untuk `ringkas` dan `papan-sk` kuncinya memuat hak dan wilayah pemanggil, sehingga satu pengguna tidak menerima isi pengguna lain.

## 8. Ancaman dan penangkal

| Ancaman | Penangkal | Bukti uji |
| --- | --- | --- |
| Akun gerbang pimpinan (pembaca) mengubah data | tulis memakai `modOK` atau peran tulis; `adminOK` tidak dipakai | `tests/warga/pb_hak.test.mjs`: 403 untuk akun gerbang di tiap rute T |
| Akun instansi satu provinsi menulis untuk provinsi lain (IDOR) | wilayah sesi dibandingkan dengan baris dan permintaan | uji lintas wilayah: 403 dan baris tidak berubah |
| Peran dicabut tetapi sesi masih jalan | `stafPeran` dicek ulang tiap permintaan | uji: cabut peran lalu tulis, 403 |
| Callback palsu menandai renlap `draf` | HMAC `RENLAP_KUNCI` + waktu ≤ 300 detik + transisi status | uji: HMAC salah, waktu basi, status `terbit`, id tak dikenal |
| Masukan workflow disisipkan ke shell | divalidasi ulang, dilewatkan sebagai variabel lingkungan | uji workflow statis: tidak ada `${{ inputs.* }}` di dalam `run:` |
| PDF atau JSON renlap dibaca tamu atau pemirsa | rute baca berkas berhak, `private, no-store`, pemirsa tidak masuk daftar | uji 401 tamu, 403 pemirsa |
| XSS lewat `nama`, `catatan`, `alasan`, `kalimat_staf` | `teks()` + `esc()`/`xml()` di tiap keluaran HTML, KML, GPX | uji dengan `<script>` dan `]]>` di kolom bebas |
| Penamaan berkas memecah jalur R2 (`../`) | kunci disusun server dari nilai tervalidasi | uji `prov` dan `kab` berisi `../` ditolak 400 |
| Versi terbit ditimpa | R2 `onlyIf`, `UNIQUE`, status tidak mundur | uji `put` kedua gagal |
| Isian massal merusak data | batas laju, riwayat sebelum-sesudah, hapus lunak | uji batas laju: tulis ke-61 dalam 10 menit = 429 |
| Kuota D1 habis (situs 500) | indeks wajib, tanpa cron baru, cache isolate, `LIMIT` | `gerbang-d1-pindai`; ukur dengan `wrangler d1 insights` sebelum F2 |
| Nama orang atau nomor telepon masuk lewat kolom bebas atau dokumen | skema tanpa kolom orang, batas panjang, pemindai pola di rakit dokumen | uji rakit: nomor `0812...` dan NIK 16 digit ditolak |
| Data operasi bocor ke `public/` atau commit | gerbang `gerbang-paritas`, workflow `contents: read` | gerbang |
| Angka palsu presisi atau klaim "aman" | `null` untuk tak diketahui; tidak pernah menulis "aman" tanpa pernyataan resmi; antarsumber tidak dijumlah | uji bentuk berkas ringkas dan `selera-angka` |
| Penurunan karhutla karena refaktor | uji golden dan `operasi_lapangan.test.mjs` tanpa disunting | `pb_karhutla_tetap.test.mjs` |
| Tautan luar membocorkan konteks | `rel="noopener noreferrer"`; koordinat tidak dimasukkan ke parameter yang membawa data pribadi | tinjau `selera-angka` dan `security-reviewer` |

## 9. Pengulas wajib

| Permukaan | Pengulas |
| --- | --- |
| Rute Worker baru (`src/pb_*.js`), unggahan mesin, callback HMAC, perubahan `src/hak.js`, `src/staf.js` `IZIN_PEMIRSA_PUSDALOPS` | `guard-api` dan `security-reviewer` |
| Migrasi 0130 dan 0131 | `migrasi-idempoten`; juga `tests/warga/migrasi_beku.test.mjs` |
| Layar (dashboard, papan SK, renlap, tindakan) | `selera-angka` dan `inp-reviewer` |
| Workflow baru dan langkah data | `mekanik-mesin` menulis; `higiene-repo` memeriksa; tanpa secret di berkas |
| Angka model yang tampil (longsor, cuaca, kekeringan) | `validasi-model` |
| Commit besar | `higiene-repo` |

Pengulas melapor, tidak auto-fix; pengerja pemilik berkas yang membetulkan (AGENTS.md bagian 6). Pengulas bukan pengerja yang menulis berkasnya (AGENTS.md 3.2). Subagent tidak commit dan tidak push.

## 10. Pertanyaan untuk KEPUTUSAN

> Catatan orkestrator 15 Nov 2026: pertanyaan di bagian ini sudah dipindah ke KEPUTUSAN-PARITAS.md (Q1 sampai Q37) dan dinomori ulang di sana. Bila isi atau bawaan berbeda, KEPUTUSAN yang berlaku. Untuk rute layar baru berlaku Q13 (papan status darurat dilebur ke `siaga.html`, pembuat dokumen di `/bnpb/sitrep`, dashboard pimpinan `/bnpb/pimpinan`); panel kiri berlaku D12.


Hal yang BELUM dirancang dan tidak diklaim ada: pemeriksa nama orang otomatis di kolom bebas (Operasi Udara juga belum punya); pembuangan EXIF (tidak relevan di sini karena tanpa unggahan foto); penarikan SK dari JDIH daerah (Q5); pencatatan akses baca (siapa membaca berkas renlap), karena kuota D1 menolak tulis per baca; bila pemilik memintanya, itu keputusan terpisah.
