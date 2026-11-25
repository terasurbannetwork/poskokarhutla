# ALGORITMA: Peta Situs

## Bentuk entri registri (`src/peta_situs.js`)

```js
{rute: "/bnpb/dalops", nama: "Pantau kejadian", ikon: "banjir", pintu: "staf", grup: "pantau",
 akses: "sesi", hak: null, induk: null}
```

- `pintu` diisi salah satu dari `publik`, `staf`, `instansi`, `petugas`, `kampus`.
- `akses` diisi salah satu dari empat nilai:
  - `tamu`: terbuka tanpa sesi, sama dengan `PUBLIK_TANPA_SESI`.
  - `sesi`: butuh sesi di host terkunci.
  - `token`: tautan bertoken.
  - `kode`: masuk dengan kode WA.
- `hak` diisi kunci `HALAMAN_STAF` bila halaman itu punya kunci. Kosong berarti semua staf.
- `induk` diisi rute induk bila halaman itu anak, misalnya laporan di bawah bencananya.
- Rute dinamis ditulis dengan pola, misalnya `/kemitraan/sertifikat/:id`.
- `token: true` menyembunyikan entri dari menu. Dipakai untuk rute bertoken yang juga ada di `PUBLIK_TANPA_SESI` (akses tetap `tamu`, supaya kesetaraan dengan `PUBLIK_TANPA_SESI` terjaga).
- `admin: true` berarti halaman hanya untuk admin, sesuai gerbang Worker (`halamanAdmin` tanpa daftar peran, `HALAMAN_ADMIN`). Butir ini tidak pernah tampil untuk sesi lain.
- `peran: [...]` dipakai untuk halaman yang menjaga dirinya sendiri dengan daftar peran di luar `HALAMAN_STAF`, misalnya `/admin/segel` (`PERAN_BACA` di `src/segel.js`). Bila ada, `peran` dipakai sebelum `hak`.
- `juga: ["instansi"]` menampilkan satu entri juga di menu pintu lain tanpa entri kedua, misalnya `/lapor/meja` untuk BPBD.

Isi pintu Publik bergantung host. Di host terkunci (`centurisk97.id`), halaman pintu Publik ber-`akses: "sesi"` tetap meminta masuk. Itu kebijakan Worker yang sudah ada (`halamanTerkunci`); registri hanya mencatatnya.

## Penyaring menu (di Worker)

```text
menuUntuk(sesi):
  pintu_boleh = pintu milik akun (staf → staf; instansi → instansi; petugas → petugas; kemitraan → kampus) + publik
  butir = registri ∩ (pintu_boleh ∪ juga), tanpa akses token dan tanpa token: true; buang admin: true bila bukan admin
  untuk pintu staf: bila ada peran, simpan bila irisan dengan sesi.peran; bila ada hak, simpan bila bolehStaf(hak, sesi.peran); selain itu simpan untuk semua staf; admin menyimpan semua
  kelompokkan per grup menurut urutan grup registri
```

## Arah sesudah masuk

1. Bila ada `?ke=` dan lolos `tujuan()` (`src/statistik.js`, jalur relatif sesama asal), pakai itu.
2. Bila tidak, arahkan menurut jenis akun:
   - staf ke `/bnpb`
   - akun direktori saja ke `/direktori`
   - `operator_cc` ke `/command-center`
   - instansi ke `/instansi`
   - petugas ke `/petugas`
   - kemitraan ke `/kemitraan`
   - pemirsa ke `/`

## Pemeriksaan gerbang

```text
halaman_nyata = rute HTML_RUTE ∪ kunci tabelRute() yang menyajikan HTML ∪ rute dari public/**/*.html yang bukan sasaran HTML_RUTE
                (kecuali * 2.*, inti/, og/, 404, 500, berkas uji)
yatim      = halaman_nyata − rute_registri
hantu      = rute_registri − halaman_nyata
tanpa_menu = {e | e.akses ≠ token ∧ e tidak dihasilkan menuUntuk(sesi uji pintunya)}
tamu_beda  = {e | e.akses = tamu} △ kunci PUBLIK_TANPA_SESI
basi       = peta_situs_publik.json ≠ keluaran generator
lulus ⇔ semua himpunan di atas kosong
```
