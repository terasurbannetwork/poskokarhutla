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

Isi pintu Publik bergantung host. Di host terkunci (`centurisk97.id`), halaman pintu Publik ber-`akses: "sesi"` tetap meminta masuk. Itu kebijakan Worker yang sudah ada (`halamanTerkunci`); registri hanya mencatatnya.

## Penyaring menu (di Worker)

```text
menuUntuk(sesi):
  pintu_boleh = pintu milik akun (staf → staf; instansi → instansi; petugas → petugas; kemitraan → kampus) + publik
  butir = registri ∩ pintu_boleh, tanpa akses token
  untuk pintu staf: simpan butir bila hak kosong atau bolehStaf(hak, sesi.peran); admin menyimpan semua
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
