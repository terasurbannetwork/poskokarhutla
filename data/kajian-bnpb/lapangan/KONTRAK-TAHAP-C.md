# Kontrak tahap C (2 Nov 2026)

Satu sumber bentuk API untuk pengerja backend (`warga-api`), layar (`lapangan`), dan gateway (`wa-bot`).
Migrasi tahap C: `migrations/0101_lapangan_panggil.sql` (0098 dipakai Pusdalops, 0099-0100 command center; dinomori ulang 2 Nov 2026).

## Tabel baru (0101)

| Tabel | Kolom |
|---|---|
| `lp_panggil` | id PK, tugas_id, keahlian JSON, prov, kab, kuota, batas (ms), pesan, status CHECK buka/penuh/tutup, dibuat_oleh, dibuat, dummy |
| `lp_panggil_penerima` | panggil_id, relawan_id, kode_balas UNIQUE, status CHECK antre/terkirim/gagal/siap/tidak/penuh, waktu, PK(panggil_id, relawan_id) |
| `orang_keahlian` | orang_id, keahlian (mis. `drone`, `pompa`, `medis`), bukti, dibuat, PK(orang_id, keahlian) |
| `lp_logbook_kit` | logbook_id, kit_id (sippa_kit.id) atau nama, jumlah, PK(logbook_id, kit_id) |

## Rute baru

| Rute | Penjaga | Masuk | Keluar |
|---|---|---|---|
| GET `/api/petugas/wa/antre` | `x-wa-kunci` | — | `{ok, pesan:[{id, tujuan, pesan, jenis}]}` paling banyak 20; baris yang ditarik `percobaan+1`, tidak ditarik ulang 10 menit |
| POST `/api/petugas/wa/hasil` | `x-wa-kunci` | `{hasil:[{id, ok, galat?}]}` | `{ok, n}`; ok = `dikirim`, gagal 3 kali = `gagal` |
| POST `/api/petugas/panel/panggil` | staf/mod | `{tugas_id, keahlian:[], prov, kab?, kuota, batas_jam, pesan}` | `{ok, id, penerima:n}`; penerima = relawan terverifikasi sesuai keahlian, wilayah, pelatihan; tiap penerima satu `wa_antre` jenis `panggil` berisi kode balas 6 huruf |
| GET `/api/petugas/panel/panggil?tugas_id=` | staf/mod | — | `{ok, panggil:[{id, kuota, status, siap, tidak, antre, batas}]}` |
| (balasan WA) `API MENYALA\|BARA\|PADAM\|BUKAN <kode>` / `GENANGAN <cm> <kode>` | lewat `/api/wa/gateway` → `lapangan_wa.balas()` jatuh ke `balasKondisi` | — | kondisi masuk logbook hari itu (dibuat minimal bila belum ada, tanpa foto) + `lapangan_label` `terverifikasi = 0`; kode 6 huruf per orang per tugas per hari, diturunkan dari `IP_SALT` (tidak disimpan), sah hanya untuk nomor pemilik; ditolak: kode/nomor salah, jenis tak sesuai bencana tugas, nilai di luar 0-500 cm, dummy, sudah diverifikasi |
| (cron 16.05 WIB, menit 5 dan 35 jam 09 UTC, tanpa jadwal baru) | `tanyaKondisi` di `src/worker.js` scheduled | — | satu `wa_antre` jenis `tanya_kondisi` (rujukan = orang.id) per anggota tugas aktif ber-WA yang belum isi logbook hari itu; dedup per orang per hari; dummy dan bencana selain karhutla/banjir dilewati |
| (balasan WA) `SIAP <kode>` / `TIDAK <kode>` | lewat `/api/wa/gateway` yang ada → `lapangan_wa.balas()` | — | siap sampai kuota jadi `lp_anggota` + `relawan_penugasan`; sesudah kuota `penuh` |
| POST `/api/petugas/panel/tugas` (ada) | — | anggota baru | tiap anggota baru dapat `wa_antre` jenis `penugasan` berisi judul, periode, titik, tautan Renlap (bila `renlap_url`) dan tautan `/petugas` |
| GET `/api/petugas/panel/ekspor.csv?tugas_id=` | staf/mod | — | rekap per orang: nama, peran, hari hadir, menit layanan, logbook terisi, absen tinjau; tanpa vektor, tanpa foto acuan, tanpa kode; sel diawali `= + - @` dinetralkan |
| GET `/api/petugas/panel/orang?keahlian=drone` | staf/mod | — | `{ok, orang:[{id, nama, jenis, prov, kab, keahlian:[]}]}` |
| POST `/api/petugas/panel/keahlian` | superOK | `{orang_id, keahlian, bukti?}` / DELETE | `{ok}` |
| GET `/api/petugas/label.json` | Super Admin (`superOK`) + laju 60/jam per IP | `?sejak=` | `{ok, label:[{id, jenis, nilai, lat, lon, waktu}]}` HANYA `terverifikasi = 1` dan bukan dummy; ekspor ke `public/` membulatkan lat/lon 2 desimal |
| GET `/api/petugas/panel/label?halaman=` | seperti antrean tinjau (pimpinan/koordalops/mod, ketua regu hanya lihat) | — | `{ok, total, baris:[{id, jenis, nilai, waktu, nama, tugas, foto_url}]}` label belum ditandai, bukan dummy |
| POST `/api/petugas/panel/label/:id` | pimpinan/koordalops/mod, bukan pemilik logbook | — | label jadi `terverifikasi = 1`; genangan banjir terverifikasi masuk `prediksi_konfirmasi` bila kab orang tercantum di wilayah tugas |
| GET `/api/petugas/saya` (ada) | kode | — | tambah `pelatihan:[{nama, tanggal}]` (relawan), `keahlian:[]`, `kit_tugas:[{id, nama}]` |
| POST `/api/petugas/logbook` (ada) | kode | tambah `kit:[{kit_id|nama, jumlah}]` | sama |

## Kait ke modul lain

- Pengingat (`src/pengingat.js`): jenis baru `lapangan_absen` (anggota tugas aktif belum absen masuk sampai 10.00 WIB) dan `lapangan_logbook` (belum isi sampai 20.00 WIB).
- Sitrep (`src/sitrep.js`): ringkasan logbook petugas tanggal sitrep (kegiatan, kendala) per tugas.
- Prediksi (`src/prediksi.js`): logbook banjir dengan `kondisi.genangan_cm` jadi `prediksi_konfirmasi` (sumber `lapangan`) untuk kab tugas.
- Regu Posko lama: header `x-kode-regu` yang sah diterima rute petugas sebagai orang berjenis `pegawai` tertaut regu (LP-030), tanpa mengubah perilaku `/lapangan` lama.
- Retensi (LP-049): cron menit 17 menghapus foto R2 absen/logbook > 2 tahun, `foto_key` jadi NULL, baris tetap.
