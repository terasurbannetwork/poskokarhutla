# RENCANA UJI: Pegawai dan Relawan Lapangan

Aturan: perilaku di luar fungsi murni (D1, rute, guard) diuji dengan memanggil handler sungguhan (TEST.md). Tiap uji
wajib memuat kasus yang DITOLAK. Perintah bukti: `npm run uji:warga` dan `npm run uji:agen`.

## Kriteria terima

| Kode | Kriteria | Uji |
|---|---|---|
| U-01 | Fungsi murni: kosinus, haversine, putus status §5 untuk tiap kombinasi alasan | `tests/lapangan/konst.test.mjs` |
| U-02 | Enum CHECK D1 sama dengan konstanta JS | `tests/warga/lapangan_skema.test.mjs` |
| U-03 | Rute petugas menolak tanpa kode, kode salah, kode orang lain | `tests/warga/lapangan.test.mjs` |
| U-04 | Rute panel menolak petugas biasa; ketua regu hanya melihat tugasnya | sama |
| U-05 | Nonce dipakai dua kali ditolak; kedaluwarsa ditolak; milik orang lain ditolak | sama |
| U-06 | Foto dengan sha256 sama ditolak; foto bukan JPEG ditolak; foto > batas ditolak | sama |
| U-07 | Tanda yaw dan pitch benar di HP Android dan iPhone nyata (toleh kiri menghasilkan arah "kiri") | uji perangkat manual, hasil dicatat di KEPUTUSAN |
| U-08 | Pendaftaran: vektor arah yang tidak cocok dengan depan ditolak dengan nama arahnya | `lapangan.test.mjs` |
| U-09 | Absen skor rendah atau GPS curiga atau luar radius masuk `tinjau`, tidak pernah `tolak` | sama |
| U-10 | Absen luring dengan nonce simpanan sah diterima dan bertanda `luring` | sama |
| U-11 | Vektor tidak muncul di balasan rute mana pun maupun di ekspor CSV | sama (pindai semua balasan) |
| U-12 | Absen relawan sah membuka dan menutup `relawan_jam`; menit dihitung | sama |
| U-13 | Logbook terkunci sesudah 23.59 WIB; ubah sesudahnya ditolak | sama |
| U-14 | Balasan WA `SIAP <kode>` sampai kuota jadi anggota; sesudah kuota berstatus `penuh` | `tests/warga/lapangan_wa.test.mjs` |
| U-15 | Hapus wajah menghapus vektor dan foto acuan R2 | `lapangan.test.mjs` |
| U-16 | Dummy mengisi tiap ember status (lolos, tinjau, sah, tolak, luring) dan tiap kartu panel bukan nol | `tests/warga/lapangan_dummy.test.mjs` |
| U-17 | Tiap rute, tabel, trigger terdaftar di `tests/warga/cakupan.json` | gerbang yang ada |
| U-18 | Migrasi 0095 sampai 0098 idempoten dan tercatat di `migrasi_beku.json` | gerbang yang ada |
| U-19 | Layar 390 px tanpa gulir menyamping; target sentuh ≥ 48 px; tidak ada interaksi > 200 ms | tangkapan layar + `inp-reviewer` |
| U-20 | Kalibrasi ambang dari 200 pasang sah (sesudah tayang) | skrip `scripts/lapangan/kalibrasi.py`, hasil ke KEPUTUSAN |

## Pengulas wajib

`guard-api` + `security-reviewer` (rute, foto, data wajah), `migrasi-idempoten` (0095 sampai 0098), `inp-reviewer`
(kamera dan tombol), `selera-angka` (panel).
