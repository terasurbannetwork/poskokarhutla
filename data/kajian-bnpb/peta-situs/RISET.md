# RISET: Peta Situs

## Inventaris 25 Nov 2026

Inventaris dibuat dengan menyapu `public/**/*.html`, rute halaman di `src/*.js`, dan semua `href` di `public/**/*.{html,js}` serta `src/*.js`.

- Sekitar 150 rute halaman: 114 bukan admin dan 36 `/admin*`. Tidak ada `public/_redirects`.
- 24 halaman yatim, yaitu tidak ditautkan dari halaman mana pun:
  - `/semua`, `/gunungapi/simulasi.html`
  - tiga halaman `/design-system/**`
  - `/laporan-konsesi`, `/presiden`, `/uji-lapangan`, `/kabar`, `/dokumen`
  - `/petugas/panel`, `/prediksi/ringkas`, `/lapor/hari-ini`
  - `/bnpb`, `/bnpb/katalog-dokumen`, `/bnpb/operasi-lapangan`, `/bnpb/data-bencana`, `/bnpb/inarisk`, `/bnpb/pimpinan`
  - `/rumah-rusak`, `/kemitraan/sertifikat/:id`, `/desa-waspada` (sekarang ada di menu karhutla lewat DW-08), `/warga`, `/kejadian.html`
- Sembilan halaman hanya dapat dibuka dari `/bnpb`, padahal `/bnpb` sendiri yatim: `/risiko`, `/kebutuhan`, `/risiko-kebakaran`, `/kinerja-bnpb`, `/sitrep`, `/riset`, `/meja`, `/bnpb/rapor-sumber`, `/bnpb/silang`.
- Delapan rute bertoken memang sengaja tidak masuk menu (D7).
- Halaman publik tidak menautkan `/lapor`.
- Semua `/admin/*` sudah tercakup salah satu menu admin.

## Mekanisme navigasi yang ada

| Berkas | Isi |
| --- | --- |
| `public/inti/kepala.js` | Menu bencana dari `/bencana.json`, tombol Prediksi, tautan Kemitraan, Desa Waspada |
| `public/bencana.json`, `src/bencana.js` | Registri bencana: rute, tab, sitemap |
| `public/kaki.js` | Kaki: `/tentang` |
| `public/bnpb/pintu.js` | Kartu pintu `/bnpb` |
| `public/bnpb/menu_pusdalops.js` | Menu staf enam grup, panel kiri model A |
| `src/admin_halaman.js` | `GRUP_ADMIN`, `SUB`, `GRUP_STAF`, `RUANG_LAPORAN`, `HALAMAN_STAF` |
| `public/inti/dasbor_admin.js` | Kartu beranda `/admin` |
| `src/masuk.js` | Pemilih akun dan arah sesudah masuk |
| `public/instansi.js` | Menu `/instansi` |
| `public/inti/alarm.js`, `public/inti/sapa.js` | Tautan dari peringatan dan sapaan |

## Pola yang ditiru

Registri yang sudah terbukti di repo ini adalah `public/bencana.json`. Dari satu berkas itu lahir menu bencana, rute, dan sitemap. Peta situs memakai pola yang sama untuk semua halaman: sumber di Worker, bagian publik dihasilkan generator (D1, D3). Panel kiri model A (`menu_pusdalops.js`, `data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md`) sudah menjadi pola menu staf yang disetujui pemilik pada 11 dan 20 Nov 2026.
