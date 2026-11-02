# DESAIN-TEKNIS: Pegawai dan Relawan Lapangan

Stack repo: Cloudflare Worker + D1 + R2, layar vanilla JS tanpa build step, gateway WA Baileys di Mac mini.
Konvensi diambil dari `riset/R3-KODE-REPO.md`.

## 1. Berkas

| Berkas | Isi | Pemilik |
|---|---|---|
| `src/lapangan.js` | rute petugas: konst, saya, persetujuan, wajah, nonce, absen, logbook, riwayat | `warga-api` |
| `src/lapangan_panel.js` | rute pimpinan: panel, tinjauan, tugas, impor induk, panggilan, ekspor, dummy | `warga-api` |
| `src/lapangan_konst.js` | semua konstanta ALGORITMA + fungsi murni (kosinus, haversine, putus status) | `warga-api` |
| `src/lapangan_wa.js` | antrean kirim WA (tarik oleh gateway), balasan SIAP/TIDAK | `warga-api` |
| `migrations/0095_lapangan_orang.sql` | `orang`, `orang_wajah`, `orang_setuju`, `wa_antre` | `warga-api` |
| `migrations/0096_lapangan_tugas.sql` | `lp_tugas`, `lp_anggota`, `lp_nonce` | `warga-api` |
| `migrations/0097_lapangan_absen.sql` | `lp_absen`, `lp_logbook`, `lp_logbook_foto`, `lapangan_label` | `warga-api` |
| `migrations/0098_lapangan_panggil.sql` | `lp_panggil`, `lp_panggil_penerima` | `warga-api` |
| `public/petugas/index.html`, `app.js`, `lapangan.css` | layar petugas L1 sampai L6 | `lapangan` |
| `public/petugas/wajah.js` | pembungkus Human: muat model, sudut, mutu, tantangan, vektor | `lapangan` |
| `public/petugas/stempel.js` | cetak stempel ke kanvas | `lapangan` |
| `public/petugas/antre.js` | antrean luring IndexedDB | `lapangan` |
| `public/petugas/sw.js` | Service Worker: cache cangkang + model | `lapangan` |
| `public/petugas/model/**` | berkas Human dan model (dipatok versinya) | `lapangan` |
| `public/petugas/panel.html`, `panel.js` | panel pimpinan | `lapangan` |
| `scripts/wa/lapangan_tarik.mjs` | gateway menarik `wa_antre`, kirim lewat limiter, lapor hasil | `wa-bot` |
| `scripts/lapangan/ekspor_label.py` | ekspor `lapangan_label` harian ke `public/data/lapangan/label.json` untuk model | `pipa-data` |
| `tests/warga/lapangan*.test.mjs` | uji rute, guard, status, tolak | `warga-api` |
| `tests/lapangan/*.test.mjs` | uji fungsi murni klien (sudut, stempel, antre) | `lapangan` |

Pakai ulang (tidak disalin): `nilaiGps` (`src/gps.js`), `bersihMedia` (`src/media_bersih.js`), `jenisBerkas`,
`ATURAN_MEDIA` (`src/foto.js`), `kodeBaru`, `pemegangKode`, `laju`, `lajuIP` (`src/bnpb.js`), `stafOK` (`src/staf.js`),
`modOK`, `superOK` (`src/posko.js`), `bacaExif` (`public/inti/exif.js`), modul relawan (`src/relawan.js`).

## 2. Akses

| Rute | Penjaga |
|---|---|
| `/api/petugas/*` petugas | header `x-kode` → `pemegangKode` atas `orang.kode_sha` (relawan: kode relawan yang ada) |
| `/api/petugas/panel/*` | `stafOK(env, req, ["pimpinan","koordalops"])` atau `modOK`; ketua regu hanya tugasnya |
| impor induk, hapus wajah, dummy | `superOK` |
| `/api/petugas/wa/*` gateway | header `x-wa-kunci` (sama dengan `/api/wa/gateway`) |

Semua POST lewat `tolakOrigin` dan wajib header `x-pb: 1`. Laju per orang: absen 10/jam, logbook 30/jam, wajah 5/hari,
nonce 30/jam; per IP untuk tebakan kode memakai `lajuIP` yang ada.

## 3. Skema D1 (ringkas; DDL lengkap ditulis di tiket)

```
orang(id TEXT PK, jenis CHECK pegawai|relawan, staf_id, relawan_id, nama, nip UNIQUE, unit, jabatan, wa, email,
      prov, kab, status CHECK aktif|nonaktif, kode_sha UNIQUE, wajah_status CHECK belum|terdaftar|dihapus,
      wajah_versi, dibuat, diubah, dummy)
orang_setuju(id PK, orang_id, versi_teks, setuju 0|1, waktu, ip_hash)
orang_wajah(orang_id, arah CHECK depan|kiri|kanan|atas|bawah, vektor TEXT base64 Float32, versi, mutu, dibuat,
            PK(orang_id, arah))
lp_tugas(id PK, judul, bencana, lat, lon, radius_m, wilayah_teks, renlap_url, mulai, selesai, ketua_id, dibuat_oleh, dummy)
lp_anggota(tugas_id, orang_id, peran CHECK ketua|anggota, PK(tugas_id, orang_id))
lp_nonce(nonce_sha PK, orang_id, tantangan, kedaluwarsa, dipakai 0|1)
lp_absen(id PK, orang_id, tugas_id, jenis CHECK masuk|pulang, waktu, waktu_hp, selisih_detik, luring 0|1,
         lat, lon, akurasi, sampel TEXT, jarak_m, dalam_radius, gps_curiga, skor_wajah, tantangan, tantangan_lolos,
         skor_hidup, versi_model, foto_key, foto_sha256 UNIQUE, status CHECK lolos|tinjau|sah|tolak, alasan TEXT JSON,
         peninjau, waktu_tinjau, catatan, ip_hash, dummy)
lp_logbook(id PK, orang_id, tugas_id, tanggal, kegiatan, uraian, hasil, kendala JSON, kebutuhan JSON, kondisi JSON,
           waktu, diubah, terkunci 0|1, dummy, UNIQUE(orang_id, tugas_id, tanggal))
lp_logbook_foto(id PK, logbook_id, foto_key, sha256 UNIQUE, lat, lon, akurasi, waktu, exif_jarak, dummy)
lapangan_label(id PK, sumber_id, jenis CHECK api|banjir, nilai JSON, lat, lon, waktu, dummy)
lp_panggil(id PK, tugas_id, keahlian JSON, prov, kab, kuota, batas, pesan, status CHECK buka|penuh|tutup, dibuat_oleh, dummy)
lp_panggil_penerima(panggil_id, relawan_id, kode_balas, status CHECK antre|terkirim|gagal|siap|tidak|penuh, waktu,
                    PK(panggil_id, relawan_id))
wa_antre(id PK, tujuan, pesan, jenis, rujukan, status CHECK antre|dikirim|gagal, percobaan, dibuat, dikirim)
```

Indeks: `lp_absen(orang_id, waktu)`, `lp_absen(tugas_id, waktu)`, `lp_absen(status) WHERE status='tinjau'`,
`lp_logbook(tugas_id, tanggal)`, `wa_antre(status, dibuat)`. Enum dijaga CHECK dan disamakan dengan konstanta JS lewat uji.
Migrasi idempoten (`IF NOT EXISTS`), sha256 dicatat di `tests/warga/migrasi_beku.json`. Diterapkan ke produksi oleh
pemilik (U8).

## 4. Rute

| Metode dan jalur | Fungsi |
|---|---|
| GET `/api/petugas/konst` | konstanta ALGORITMA (cache tepi 1 jam) |
| GET `/api/petugas/saya` | profil, tugas hari ini, status absen dan logbook, wajah_status |
| POST `/api/petugas/setuju` | simpan persetujuan |
| POST `/api/petugas/wajah` | lima vektor + foto depan; validasi §2 ALGORITMA |
| DELETE `/api/petugas/wajah` | hapus vektor dan foto acuan diri sendiri |
| POST `/api/petugas/nonce` | `{jumlah:1}` daring atau `{jumlah:6}` simpanan luring; berisi tantangan |
| POST `/api/petugas/absen` | multipart: data JSON + foto; putus status §5 |
| POST `/api/petugas/logbook` | buat atau ubah logbook hari ini + foto |
| GET `/api/petugas/riwayat` | 14 hari milik sendiri |
| GET `/api/petugas/panel/ringkas` | strip angka + titik peta hari ini (cache tepi 60 detik) |
| GET `/api/petugas/panel/tinjau` | antrean tinjauan (halaman 50) |
| POST `/api/petugas/panel/tinjau/:id` | sah atau tolak + catatan |
| POST `/api/petugas/panel/tugas` | buat atau ubah tugas, anggota |
| POST `/api/petugas/panel/impor` | CSV induk pegawai: `pratinjau` lalu `simpan` |
| POST `/api/petugas/panel/tautan/:id` | masukkan pesan tautan ke `wa_antre` |
| POST `/api/petugas/panel/panggil` | buat panggilan relawan |
| GET `/api/petugas/panel/ekspor.csv` | rekap per tugas tanpa vektor dan tanpa foto acuan |
| GET `/api/petugas/foto/:id` | foto absen/logbook untuk peninjau dan pemiliknya |
| GET `/api/petugas/wa/antre` | gateway menarik sampai 20 pesan |
| POST `/api/petugas/wa/hasil` | gateway melapor terkirim atau gagal |
| POST `/api/petugas/dummy`, DELETE `/api/petugas/dummy` | isi dan hapus dummy halaman yang dibuka |

Balasan WA `SIAP <kode>` / `TIDAK <kode>` masuk lewat rute `/api/wa/gateway` yang sudah ada; `src/wa.js` meneruskan ke
`lapangan_wa.balas()`.

## 5. Penyimpanan R2 (binding `MEDIA`)

`lapangan/absen/<id>.jpg`, `lapangan/logbook/<id>.jpg`, `lapangan/acuan/<orang_id>.jpg` (foto depan, hanya peninjau dan
Super Admin). Semua melalui `bersihMedia`; ukuran ≤ `ATURAN_MEDIA` foto. Vektor wajah tidak di R2, hanya di D1.

## 6. Pipeline

- `scripts/lapangan/ekspor_label.py` dijalankan di `data.yml` harian: membaca `GET /api/petugas/label.json` (admin
  token), menulis `public/data/lapangan/label.json`. Model karhutla dan banjir membaca berkas itu.
- Tidak menambah cron Worker. Pembersihan nonce kedaluwarsa dan antrean WA lama ikut dispatcher yang ada (menit 17).

## 7. Kuota dan beban

- Absen: 1 baca nonce + 1 baca vektor (5 baris) + 1 baca absen terakhir (lompatan) + 1 tulis; sekitar 8 baca per absen.
  1.000 orang × 2 absen = 16.000 baca per hari (0,3% kuota 5 juta).
- Panel: ringkasan dari satu kueri agregat per hari + cache tepi 60 detik.
- Model wajah sekitar 10 MB diunduh sekali per HP lalu di-cache Service Worker.

## 8. Uji (rincian di RENCANA-UJI)

Fungsi murni di `src/lapangan_konst.js` diuji langsung; rute diuji dengan memanggil handler terhadap D1 lokal Miniflare
seperti `tests/warga/*`; tiap rute, tabel, dan trigger terdaftar di `tests/warga/cakupan.json`.
