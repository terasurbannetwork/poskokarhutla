# KEAMANAN-PRIVASI: Siklus Bencana

Dokumen kedelapan; kalah dari KA, PRD, ALUR, ALGORITMA, DESIGN-SYSTEM, DESAIN-TEKNIS (DT). Pengulas: `security-reviewer`, `guard-api`, `migrasi-idempoten`, `selera-angka`.

## 1. Matriks peran x rute x data

B baca, T tulis, L hanya lingkup wilayah akun (`dalamLingkup`), R ringkasan resmi, `-` tidak ada. WG tamu; BP akun instansi (`/api/instansi/siklus/*`); PD `pusdalops`; KO `koordalops`; PM `pimpinan`; SA Super Admin; SIS pipeline ber-Bearer. Tiap baris = satu uji "peran salah DITOLAK"; 403 untuk peran, 404 seragam untuk tidak ada atau di luar lingkup.

| Data atau rute | WG | BP | PD | KO | PM | SA | SIS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ringkasan publik kejadian (`publik/kejadian/:id`), `masa_depan_ringkas.json`, `atribusi.json` | R | R | R | R | R | R | - |
| Daftar, detail, arsip kejadian | - | B L | T | T | B | T | - |
| Fase, gabung, publikasi; antrean ambigu | - | - | antrean, fase awal, batal | T | - | T | - |
| Paparan agregat provinsi dan kabupaten | - | B L (kab) | B | B | B | B | - |
| Fasilitas vital berkoordinat | - | B L | B | B | B | B | - |
| Paparan rinci sel 110 m | - | B L | B | B | - | B | - |
| Kaji cepat: baca; status | - | B L | T | T | B | T | T (ingest) |
| Jitupasna: isi baris; hitung dan harga | - | baris (L) | T | T | B | T | - |
| Jitupasna: tinjau, final | - | - | - | T | B | T | - |
| R3P: buat, usul, tetapkan; tanda setuju internal | - | B L | B | T; setuju: tidak | B; setuju: T | T | - |
| Renkon (isi, asumsi); gladi | - | B L (renkon) | T; gladi catatan | T | B | T | - |
| Masa depan penuh | - | B L | B | B | B | B | - |
| Registri sumber | - | - | B | B | B | T | - |
| Dummy; `ingest/*` | - | - | - | - | - | dummy | ingest |

Rantai per KIB dan `meja_dampak` dirujuk baca saja (KA U21); Siklus tidak membuka data pelapor atau lampiran mereka. Aturan tetap: gerbang peran PERTAMA sebelum validasi atau R2 (pola `src/bangunan.js`); tidak ada peran baru (KA 27a); staf nyata tidak melihat `dummy = 1`; data lapangan dan draf F4/F5 hanya staf dan BP berlingkup (KA 15); PM hanya menulis tanda setuju.

## 2. Data pribadi (UU 27/2022 PDP)

1. **Minimum.** Tanpa NIK, KK, KTP, tanggal lahir, alamat rumah, atau registri pengungsi per orang (KA 12-13); F3 dan F4 hanya memperkirakan jumlah jiwa.
2. **Rumah rusak.** `rumah_rusak` menyimpan koordinat 4 desimal (sekitar 11 m), setara lokasi rumah tangga. Siklus hanya membaca REKAP per tingkat per kabupaten atau desa (`bacaRekap`); koordinat, foto, nama pelapor tidak disalin ke `sk_*`, R2, atau `public/`.
3. **Korban.** Hanya hitungan dari `korbanHari`; nama korban tidak masuk Siklus. Ringkasan publik ditolak server bila memuat nomor telepon atau surel (`teks()`); KO bertanggung jawab atas isinya.
4. **Logbook.** Lapis `bersih` hanya kolom terstruktur; teks bebas (`kendala`, `kebutuhan`, narasi) dibuang di `bersih_logbook.py`; baris per kejadian tidak masuk `public/`.
5. **Pegawai.** Identitas di `sk_*` hanya `oleh` (id) dan nama penandatangan dokumen resmi sebagai teks (pejabat publik).
6. **k-anonim.** Angka korban atau terdampak publik dengan nilai di bawah 5 ditulis "di bawah 5"; ringkasan publik tanpa angka per desa.
7. **Koreksi dan penarikan.** KO menarik ringkasan publik (`publik = 0`; hilang dari tembolok tepi paling lama 5 menit). Kaji yang salah `ditarik` dengan alasan; versi lama tetap sebagai jejak.
8. **Repo publik.** Tanpa data pribadi, token, isi R2 privat, atau paparan rinci di git. Gerbang `siklus_publik` memindai `public/siklus/**` untuk surel, telepon, dan koordinat berdesimal lebih dari 3 angka.

## 3. Data terkunci paparan (KA 14)

1. Paparan bangunan tinggal di R2 `bangunan/` dan `siklus/saji/paparan/`; tidak di `public/` (kontrak: `src/bangunan.js`, `private, no-store`, `nosniff`).
2. Satuan terkecil dari R2 adalah sel 110 m (DT 5.2.4); koordinat bangunan satuan, poligon jejak, dan atribut pemilik tidak ada di berkas saji.
3. Pembacaan rinci dibatasi peran (PD, KO, SA, BP berlingkup), 300 per jam per akun, dicatat di `sk_jejak` (`baca_rinci`); tanpa rute ekspor massal.
4. `terpapar.json` dan `kec.json` tidak diubah (PRD F2-07). Provinsi tanpa grid `terliput:false`; kelas bahaya `estimasi-model` dengan catatan batas kelas bersumber repo, bukan peraturan.
5. Tiga sumber jiwa (WorldPop, Dukcapil, GHSL) tampil berdampingan, tidak dirata-rata (KA 7).

## 4. Draf Jitupasna dan R3P

1. Hanya staf dan BP berlingkup (KA 15). Tidak ada rute publik, tidak ada berkas draf di `public/` atau tembolok tepi.
2. Draf tidak tampil seolah dokumen resmi. Unduhan berkop bertanda "DRAF, bukan dokumen resmi" sampai `ditetapkan_resmi`, lalu "salinan data, dokumen resmi di luar sistem" karena nomor keputusan hanyalah teks ketikan staf (Perban 5/2017 Pasal 5-6).
3. Tanda setuju PM disebut "tanda setuju internal" dan tidak menggantikan pengesahan (U7). Hanya PM dapat menulis `disetujui_*` (CHECK + trigger + uji); KO tidak dapat menyetujui sendiri drafnya.
4. Jitupasna `final` dikunci (trigger); ubah = versi baru. R3P `ditetapkan_resmi` ke atas tak bisa diubah nilainya.
5. Tarif stimulan dan harga satuan berpil `asumsi-kebijakan` (U4, U8); angka tanpa pil gagal di uji layar. Nilai kosong "menunggu", bukan 0; nilai disetujui tidak melebihi usulan (pola `cek` meja).

## 5. Unggahan foto

Siklus tidak menambah jalur unggah (tanpa `sk_foto`, tanpa multipart). Foto rumah rusak tetap lewat `src/rumah_rusak.js`; `image_url` PetaBencana dan foto sumber luar tidak diambil. Bila tiket kelak menambah unggahan: cek magic byte dan ukuran, nama objek R2 dari server (`siklus/foto/<id>.<ext>`), EXIF GPS dibuang, `attachment` dan `nosniff`, rute berkunci peran, tinjauan `security-reviewer`.

## 6. XSS dari data luar

Teks yang bisa dikuasai pihak ketiga: nama kejadian (DIBI, logbook, `place` USGS, GDACS), nama fasilitas (OSM, Overture, Wikidata), label GLIDE.

1. **Pipeline menyaring** ke `bersih/`: NFKC, buang karakter kontrol dan bidi (U+200B-200F, U+202A-202E, U+FEFF), buang `<` dan `>`, potong ke batas kolom. Menghapus, bukan menolak (nama OSM bernomor telepon tak boleh menggagalkan batch).
2. **Worker memvalidasi ulang** teks ingest (batas sama); masukan staf lewat `teks()`.
3. **Layar** memasang nilai lewat `esc()` atau `textContent`; tanpa `innerHTML` berisi data mentah, tanpa atribut `on*`; CSP `script-src 'self'` tanpa `unsafe-inline`.
4. **Tautan** keluar dibangun klien dari ID dengan templat host tetap (usgs.gov, gdacs.org, glidenumber.net); URL dari data tidak diikuti; `rel="noopener noreferrer"`.
5. **Ekspor** Excel/CSV: sel berawal `=`, `+`, `-`, `@` diberi awalan `'`. Gerbang `siklus_xss`: nama berisi `<img onerror>`, `javascript:`, bidi, 5.000 huruf tampil sebagai teks terpotong.

## 7. CSRF

1. Semua POST/PATCH/DELETE bersesi membawa `x-pb: 1` (pola `src/instansi.js:1712`); tanpa itu 403.
2. `tolakOrigin` (`src/worker.js:657`) tetap berlaku: POST ber-`sesi_staf` atau `sesi_admin` wajib Origin sama-situs; Origin kosong atau "null" hanya dengan `Sec-Fetch-Site: same-origin`.
3. `ingest/*` memakai Bearer `PIPA_TOKEN` (token pipeline yang sudah ada, tidak ada rahasia baru) di header, bukan cookie atau URL; permintaan ingest ber-cookie sesi ditolak 400; perbandingan waktu-tetap; rotasi = ganti secret di Worker dan GitHub bersamaan (juga memutar token pipeline lain). Karena tokennya bersama, rute ingest Siklus hanya di `/api/siklus/ingest/*`, dibatasi ukuran batch (200) dan laju, dan tidak pernah menulis selain `sk_kejadian*`, `sk_kaji`, `sk_jejak`.
4. `GET` tidak mengubah keadaan (DT ADR-09), tanpa `x-pb`.

## 8. Batas laju

Tulis staf: `laju(env, "sk:"+oleh, aksi, ...)` (`src/bnpb.js`); angka per rute di DT bagian 4 (lewat batas = 429 `retry-after`). `laju()` menulis satu baris D1 per panggilan, jadi TIDAK dipasang di GET. `publik/kejadian/:id` dilindungi tembolok tepi dan 404 seragam; penebakan id memicu satu baca terindeks per id (ID `KJ-` dari hash, bukan rahasia; yang menahan adalah 404 seragam dan `publik = 1`). Sisa risiko: WAF per-IP jalur itu tindakan pemilik. Percobaan masuk: mekanisme staf yang ada.

## 9. Audit

Tiap tulis D1 = satu baris `sk_jejak` dalam batch yang sama; tulis tanpa jejak gagal di uji. Dicatat: siapa (`staf:<id>`, `instansi:<id>`, `sistem:ingest`), kapan, obyek, dari, ke, alasan, termasuk pembacaan rinci, tanda setuju PM, penarikan kaji, gabung kejadian. Jejak tanpa rute ubah atau hapus kecuali `hapus dummy`.

## 10. Retensi

| Data | Disimpan | Dasar |
| --- | --- | --- |
| `sk_kejadian`, `sk_kaji`, `sk_jitupasna*`, `sk_r3p*`, `sk_renkon`, `sk_gladi` | tanpa batas, tidak dihapus; salah = ditarik atau versi baru | bahan pertanggungjawaban; asumsi-kebijakan, aturan kearsipan belum ditemukan |
| `sk_jejak` | paling sedikit 5 tahun | asumsi-kebijakan, pemilik menetapkan |
| R2 `mentah/` harian | 90 hari; riwayat DIBI dan logbook permanen | asal data bersih |
| R2 `bersih/`, `saji/` | dibangun ulang; arsip beku tetap; tembolok tepi publik 5 menit | DT bagian 8 |
| Baris dummy | sampai dihapus SA | DUMMY.md |

## 11. Lisensi dan atribusi per sumber

Teks lisensi beberapa sumber belum dibaca (R2 "belum teruji"); tiket G0 menyalinnya ke `sumber.json` sebelum tampil publik. Atribusi lewat `atribusi.json` di panel "Lisensi dan atribusi", bukan kaki sumber kartu (KA 24).

| Sumber | Lisensi (R2) | Perlakuan |
| --- | --- | --- |
| USGS; CHIRPS v3, PSMSL, NEX-GDDP, Wikidata | domain publik; domain publik, gratis-sitasi, CC0; CC0 | sitasi USGS, CHC, PSMSL, NASA NEX; agregat saja |
| GDACS | bebas dengan atribusi | atribusi; kunci silang |
| GLIDE, DesInventar | tidak dinyatakan | kunci silang atau uji silang; tidak ditampilkan |
| PetaBencana.id | data tidak dinyatakan, kode GPL-3.0 | tidak tampil publik; teks dan foto tidak disimpan |
| Copernicus EMS, Charter | terbuka | atribusi bila ada aktivasi |
| Overture bangunan; OSM | ODbL-1.0 | lihat ODbL; "© OpenStreetMap contributors" |
| Overture places | Apache-2.0, CDLA | atribusi Overture |
| Open Buildings v3 | CC BY 4.0 (ODbL menurut dokumentasi) | atribusi Google; bila ODbL, seperti Overture |
| GHSL, WorldPop, AR6 | CC BY 4.0 | atribusi JRC, WorldPop, IPCC; epoch 2025 dan 2030 ditandai model |
| Dukcapil ArcGIS, InaRISK | tidak dinyatakan | agregat saja; atribusi BNPB; raster tidak disimpan |
| Sekolah Kita | tidak dinyatakan (API internal) | tidak dipakai sampai izin Pusdatin |
| BPS (IKK, IHPB) | kunci, atribusi | atribusi BPS; kunci hanya di secret |
| FABDEM (replay); UNOSAT | CC BY-NC-SA 4.0; umumnya CC BY-SA | non-komersial; share-alike bila turunan dipublikasikan |

**ODbL (Overture bangunan, OSM, bagian Open Buildings).** Hitungan agregat per desa atau kabupaten adalah Produced Work: boleh dipublikasikan dengan atribusi dan pemberitahuan lisensi. `fasilitas/<kab4>.json` (titik dan nama OSM/Overture, Derivative Database) hanya untuk staf dan BP berlingkup, tidak diedarkan atau diekspor; bila dipublikasikan harus ODbL share-alike beserta atribusi, dan tidak dicampur dengan sumber berlisensi tertutup. 

## 12. Risiko membuka lokasi fasilitas vital

Fasilitas berkoordinat yang dipadankan dengan zona bahaya = peta sasaran bila bocor.

1. Kategori berkoordinat hanya `sekolah`, `madrasah`, `kesehatan`, `ibadah`, `kantor_pemerintah_sipil`. Objek vital nasional, bandara, pelabuhan, pembangkit, instalasi militer dan polisi, lapas, bendungan hanya dihitung per kabupaten (`hitung_tanpa_titik`); `fasilitas.py uji` gagal bila ada.
2. Berkoordinat hanya untuk staf dan BP berlingkup, per kabupaten (bukan satu berkas nasional), `private, no-store`, tanpa ekspor massal; jumlah siswa per titik tidak keluar dari staf. Tidak ada peta publik fasilitas berkelas bahaya.
3. Label `estimasi-model` (OSM, Overture, Wikidata): bukan daftar resmi.
4. Lonjakan bacaan (lebih dari 20 kabupaten per jam per akun) ditinjau SA lewat `sk_jejak`.

## 13. Header dan CSP

Halaman staf: `halamanBnpbPublik(... {pribadi:true})` (CSP ketat, `frame-ancestors 'none'`, `no-store`, `no-referrer`, `noindex`). API: `nosniff`, `private, no-store`, kecuali `publik/kejadian/:id` (`s-maxage=300`) dan aset `/siklus/*` (`private, max-age=600`, lewat `run_worker_first`; daftar putih tanpa sesi seperti DT 7.1).

## 14. Diuji sebelum tiket ditutup

Satu uji per baris matriks 1; `x-pb` hilang; Origin lain; cookie pada ingest; id tidak ada dan `publik = 0` 404 seragam; rinci tanpa sesi 403 sebelum R2; fixture XSS; koordinat kategori terlarang; dummy tak bocor; `disetujui_*` hanya PM; tulis tanpa jejak ditolak.
