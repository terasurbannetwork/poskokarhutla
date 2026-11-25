# DESAIN-TEKNIS: Peta Situs

## Berkas

Pemilik tiap berkas dicek dengan `node scripts/agents/ilmu.mjs pemilik <berkas>`. Berkas baru didaftarkan di `scripts/agents/roster.json` pada PS-01.

| Berkas | Pemilik | Ubahan |
| --- | --- | --- |
| `src/peta_situs.js` (baru) | `warga-api` | Registri lengkap (D1), `menuUntuk(sesi)`, dan rute `GET /api/peta-situs`. |
| `scripts/agents/peta_situs_publik.mjs` (baru, generator) | `mekanik-mesin` | Menulis `public/inti/peta_situs_publik.json` dari entri pintu Publik dan Kampus. Pola sama dengan generator `bencana.generated.js`. |
| `public/inti/peta_situs_publik.json` (hasil) | `inti-layar` | Jangan disunting tangan. |
| `public/inti/kepala.js` | `inti-layar` | Menampilkan tombol Lapor dan Masuk. Butir Semua bencana, Desa Waspada, Laporan konsesi, dan anak bencana diambil dari JSON publik. |
| `public/kaki.js` | `layar-peta` | Kaki publik dari JSON publik. |
| `public/bnpb/menu_pusdalops.js` | `ruang-bnpb` | `GRUP` diganti dengan hasil `/api/peta-situs`. Menu dipasang di `/bnpb` dan semua halaman `/bnpb/*`. Panel kiri dan menu sempit yang ada tetap dipakai. |
| `public/bnpb/pintu.js` | `ruang-bnpb` | Kartu `/bnpb` dari `/api/peta-situs`. Angka hidup tetap. |
| `src/admin_halaman.js` | `warga-api` | `GRUP_ADMIN`, `GRUP_STAF`, `SUB`, dan `RUANG_LAPORAN` diturunkan dari `src/peta_situs.js` (impor modul JS biasa). `HAL`, `HALAMAN_STAF`, dan `bolehStaf` tetap. |
| `public/inti/dasbor_admin.js` | cek pemilik | Kartu `/admin` dari nav admin hasil Worker. |
| `public/instansi.js`, `public/masuk.js` | `warga-api` | `instansi.js` memakai menu dari `/api/peta-situs`. `masuk.js` menampung form sandi. |
| `public/petugas/**` | `lapangan` | Menu petugas dari `/api/peta-situs`. |
| `public/kemitraan/inti.js` | `kampus` | Menu kampus dari JSON publik atau `/api/peta-situs` sesudah masuk. |
| `src/masuk.js`, `src/worker.js` | `warga-api` | Form sandi ditampung di `/masuk`. Pengalihan diubah dari `/admin/masuk` ke `/masuk`, untuk GET, POST, dan semua 303 yang ada: `worker.js:589-590`, `:797-798`, `:932`, `:981`, `:987`. Arah sesudah masuk mengikuti ALGORITMA. `HTML_RUTE` dan `PUBLIK_TANPA_SESI` sudah diekspor. |
| `tests/agen/gerbang-peta-situs.test.mjs` (baru) | `penulis-gerbang` | Gerbang D10. |
| `tests/warga/peta_situs.test.mjs` (baru) | `warga-api` | Uji `menuUntuk` untuk tiap peran di `SEMUA_PERAN` beserta admin, instansi, petugas, dan kemitraan. |
| `tests/agen/fixtures/pintu_masuk.json`, `tests/warga/masuk_satu_pintu.test.mjs` | `warga-api` | Disesuaikan dengan K21. |

## Urutan pemasangan

Pemasangan berurutan supaya situs tidak pernah setengah jadi.

1. Registri, generator, dan gerbang dalam mode laporan.
2. Rute `/api/peta-situs` dan nav admin Worker.
3. Menu publik dan kaki.
4. Menu staf dan `/bnpb`.
5. Menu BPBD, Petugas, dan Kampus.
6. `/masuk` satu pintu.
7. Daftar menu lama dihapus dan gerbang dikunci.
