# Pendataan Satu Data BNPB, Fase 1

Keputusan pemilik 26 Okt 2026, dari rapat pendataan dengan tim internal BNPB (Koordalops, Pusdatin, Logpal, Sosek).

## Tujuan

Mengumpulkan semua informasi data, dokumen, laporan, dan aplikasi yang dimiliki tiap direktorat BNPB,
supaya:

1. data dasbor Centurisk97 lebih lengkap dan terintegrasi;
2. laporan harian bencana alam dan karhutla memakai data yang selaras;
3. tren bisa dianalisis lewat perbandingan data antarwaktu untuk evaluasi dan keputusan pimpinan.

Fase 1 hanya PENGUMPULAN INFORMASI dan MONITORING siapa yang sudah mengisi. Katalog data, hak akses per data,
dan input rutin adalah Fase 2 dan 3, belum dibangun.

## Keputusan yang mengikat

- Sasaran monitoring hanya 10 unit BNPB di `UNIT_SASARAN` (`public/bnpb/pendataan_spek.js`): Pusdatin, Direktorat Dalops,
  Direktorat Wilayah 1, 2, 3, Direktorat RRP, RRI, RRS, Direktorat Pengelolaan Logistik, Direktorat Optimasi Jaringan Logistik.
- Tiap pilihan selalu punya "Lainnya" dengan isian manual.
- Satu akun boleh mengisi banyak isian data dan banyak isian aplikasi. Isian "Kebutuhan dan kendala" satu per akun.
- Responden membuat akun sendiri di `/pendataan`. Akun baru berstatus `menunggu` sampai Super Admin menyetujui
  (supaya orang luar tidak bisa mengisi data internal BNPB).
- Dibangun di website, di server Cloudflare (D1 + R2), bukan di server BNPB. Pindah server = Fase berikutnya.

## Hak akses Fase 1

| Siapa | Boleh |
| --- | --- |
| Pengunjung | membuka `/pendataan`, mendaftar (Turnstile bila aktif, batas laju per IP) |
| Akun `menunggu`, `ditolak`, `dicabut` | tidak bisa masuk (pesan sesuai status) |
| Akun `aktif` | membuat, mengubah, mengirim, menghapus isian MILIKNYA; mengunggah dan menghapus berkas isiannya; MEMBACA isian terkirim rekan satu unit (bukan draf mereka, tanpa WA/email rekan) |
| Super Admin (`superOK`) | monitoring, semua isian dan berkas, setujui/tolak/cabut/reset akun, ekspor CSV, dummy |

## Skema D1: `migrations/0060_pendataan.sql`

Semua `CREATE TABLE IF NOT EXISTS`, CHECK di tiap enum, id 16 hex, waktu ms epoch, kolom `dummy`.

- `pdt_akun`: id, username UNIQUE (`^[a-z0-9]{5,30}$`), nama, nip (boleh kosong), jabatan, unit (CHECK = kunci `UNIT`),
  unit_lain (wajib bila unit = lainnya), email, wa, garam, sandi_hash (PBKDF2-SHA256 100.000 iterasi, sandi pilihan sendiri ≥ 10 huruf),
  wajib_ganti (1 sesudah reset Super Admin), status (CHECK `STATUS_AKUN`), dibuat, diputus, diputus_oleh, dummy.
- `pdt_sesi`: token_sha PK, akun_id, dibuat, kedaluwarsa. Cookie `sesi_pendataan`, HttpOnly, Secure, SameSite=Lax, Path=/, 30 hari.
  POST lewat sesi wajib header `x-pb: 1` (pola `src/staf.js`).
- `pdt_isian`: id, akun_id, unit (salinan unit akun saat dibuat), jenis (CHECK `JENIS`), isi (JSON hasil `periksaIsian`), status (CHECK `STATUS_ISIAN`),
  dibuat, diubah, dikirim, dummy. Unik sebagian: satu `umum` per akun.
- `pdt_berkas`: id, isian_id, nama (≤ 160), mime (CHECK = kunci `BERKAS.tipe`), ukuran (≤ `BERKAS.maks`), dibuat, dummy. Objek R2 `MEDIA` di `pendataan/<isian_id>/<id>`.

## Rute (`src/pendataan.js`, `RUTE_PENDATAAN`)

| Rute | Gerbang | Isi |
| --- | --- | --- |
| `GET /pendataan` | publik, `halamanBnpbPublik(..., "pendataan", {pribadi: true, turnstile: true})` | layar responden |
| `GET /api/pendataan/konfig` | publik | `{turnstile}` sitekey atau null |
| `POST /api/pendataan/daftar` | publik, laju IP 5/jam 20/hari, Turnstile | akun `menunggu` |
| `POST /api/pendataan/masuk` | publik, pola gagal-laju `src/staf.js` | cookie sesi |
| `POST /api/pendataan/keluar` | sesi | hapus sesi |
| `GET /api/pendataan/saya` | sesi | akun + isian miliknya + isian terkirim rekan unit (nama pengisi saja) + berkas per isian |
| `POST /api/pendataan/gantisandi` | sesi | sandi baru pilihan sendiri |
| `POST /api/pendataan/isian` | sesi aktif | `{id?, jenis, isi, kirim}`; `kirim: true` memvalidasi wajib dan menandai terkirim |
| `POST /api/pendataan/hapus/:id` | pemilik | hapus isian + berkasnya |
| `POST /api/pendataan/berkas/:id` | pemilik isian `:id` | unggah satu berkas (badan mentah, header `x-nama`, `content-type`), magic bytes dicek |
| `GET /api/pendataan/berkas/:id` | pemilik, rekan unit (isian terkirim), Super Admin | unduh, `content-disposition: attachment`, nosniff |
| `POST /api/pendataan/berkas-hapus/:id` | pemilik | hapus berkas |
| `GET /api/pendataan/admin/ringkas` | Super Admin | monitoring per unit, akun, semua isian |
| `POST /api/pendataan/admin/akun/:id` | Super Admin | `{aksi: setujui, tolak, cabut, reset}` |
| `GET /api/pendataan/admin/ekspor` | Super Admin | CSV `?jenis=data|aplikasi|umum` |
| `POST /api/pendataan/dummy` | Super Admin | `{aksi: isi|hapus}` |
| `GET /admin/pendataan` | Super Admin | layar monitoring |

## Monitoring per unit

Status unit, berurutan: **Belum ada akun** (tidak ada akun aktif atau menunggu), **Akun menunggu**, **Belum mengisi**
(akun aktif, nol isian), **Draf** (ada isian, belum satu pun terkirim), **Sudah kirim** (minimal satu isian terkirim).
Kolom: akun aktif, akun menunggu, data terkirim, aplikasi terkirim, kebutuhan terkirim, draf, terakhir kirim.
Tagih = tautan `wa.me` ke WA akun aktif unit itu, ditekan manusia. Unit tanpa akun: tombol bagikan tautan `/pendataan` lewat WA.

## Yang sengaja belum ada

Tenggat dan status terlambat (pemilik belum menetapkan tenggat), katalog data, hak akses per data, verifikasi isian,
input rutin harian. Tambahkan di Fase 2.
