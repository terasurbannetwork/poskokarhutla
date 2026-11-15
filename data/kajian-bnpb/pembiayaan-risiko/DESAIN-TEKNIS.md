# DESAIN-TEKNIS: Pembiayaan risiko

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `src/pembiayaan.js` | Rute baca pembiayaan per kejadian, tulis saldo dan catatan skema; pembanding murni | warga-api |
| `src/hak.js` bagian Pembiayaan | SQL baca realisasi DSP per kejadian dari `meja_catatan` dan tulis saldo + riwayat dalam satu batch | warga-api |
| `public/siklus/pembiayaan.js` | Kartu dan laci di halaman kejadian | siklus |
| `scripts/pembiayaan/ujibalik.py` | Uji balik model kerugian (PR-06), stdlib Python 3.12, self-check assert | pipa-data |
| `public/bnpb/dalops*.js` | Ringkasan staf | ruang-bnpb |

## D1

Nomor migrasi diambil saat tiket (cek `migrations/` dan reservasi di `data/kajian-bnpb/*`); jangan memakai nomor tanpa pengecekan.

| Tabel | Kolom |
| --- | --- |
| `pb_saldo` | append-only: `id`, `kejadian_id` FK `sk_kejadian` NULL (saldo umum bukan per kejadian), `lapis` CHECK (dsp, pfb), `nilai` bilangan bulat rupiah, `tanggal_data`, `sumber` NOT NULL, `catatan`, `oleh`, `dibuat`; indeks (lapis, tanggal_data DESC) |
| `pb_skema` | `id`, `nama`, `penerbit`, `jenis` CHECK (parametrik, indemnitas), `indeks`, `ambang`, `wilayah` JSON, `bayaran`, `berlaku_dari`, `berlaku_sampai`, `oleh`, `dibuat`; pembaruan = baris baru (riwayat) |
| `pb_model` | catatan pra-registrasi model: `id`, `rumus`, `hash`, `didaftar`, `status` CHECK (hipotesis, lulus, gagal) |

Sumber realisasi DSP ada di `meja_catatan` meja `dsp` (`src/meja_spek.js:156`), dibaca langsung; tidak disalin. Kolom `kejadian` di meja itu teks bebas: PR-02b menambah tautan ke `sk_kejadian` (kolom FK atau tabel tautan `pb_dsp_kejadian`) sebelum rute baca. Pastikan indeks (meja, prov, kab, diubah) dari migrasi 0142 dipakai (EXPLAIN, T9).

## Rute

| Rute | Hak |
| --- | --- |
| `GET /api/siklus/kejadian/:id/pembiayaan` | staf pembiayaan, pimpinan baca |
| `POST /api/siklus/kejadian/:id/pembiayaan/saldo` | staf pembiayaan |
| `POST /api/siklus/pembiayaan/skema` | staf pembiayaan |

Rute di bawah awalan `/api/siklus` agar ikut `RUTE_SIKLUS` dan pola hak yang ada. Tanpa peran baru (Q9): baca pimpinan, Pusdalops, Koordalops; tulis Super Admin. Tidak ada cron: perhitungan sesuai permintaan, dibatasi satu kejadian per panggilan.
