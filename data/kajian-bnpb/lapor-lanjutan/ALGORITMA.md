# ALGORITMA: Data lanjutan BPBD

Semua fungsi di sini murni (masukan data, keluaran data) dan diuji tanpa DB, kecuali yang ditandai rute.

## 1. Pembukaan berkas

```
buka(tiket):
  syarat: tiket.tingkat == 'bpbd' dan tiket terkirim
  induk  = lapor_kelompok.induk(tiket.nomor) bila ada, selain itu tiket.nomor
  kunci  = (induk, tiket.kab)
  berkas = ambil(kunci) atau buat(kunci, ketua = tiket.wa)
```

Laporan kedua dari kab yang sama dalam kelompok yang sama tidak membuat berkas baru; pelapornya ditawari bergabung sebagai anggota (ketua yang memutuskan).

## 2. Spek per jenis objek

`W` wajib, `O` opsional. Tiap pilihan punya nilai `nihil`/`tidak_tahu` bila relevan; kosong tetap `null`.

| Jenis | Isian | Foto |
| --- | --- | --- |
| `rumah` | W: kepala keluarga penghuni, desa, kecamatan, alamat atau RT/RW, tingkat (`rb`, `rs`, `rr`, `terendam`), status huni (`dihuni`, `mengungsi`, `rata`), jumlah jiwa. O: pemilik (atau "sama"), NIK KK, keterangan | 2 wajib, video O |
| `prasarana` | W: jenis (`jembatan`, `jalan`, `sekolah`, `faskes`, `ibadah`, `kantor`, `irigasi`, `listrik`, `air`, `sinyal`, `spbu`, `lainnya`), nama, desa, tingkat, fungsi (`putus`, `terbatas`, `berfungsi`). Jalan dan jembatan W: panjang rusak (m), kendaraan yang bisa lewat (`tidak_ada`, `motor`, `mobil`, `truk`). O: jalur alternatif | 2 wajib, video O |
| `titik` | W: nama, desa, jenis tempat (nilai meja `pengungsi`), air bersih, MCK, dapur umum, listrik (`ada`, `kurang`, `tidak`). O: kapasitas jiwa | 1 wajib |
| `jiwa` | W: titik (`TP-`), nama, umur (tahun) atau kelompok umur, L/P, desa asal, tanggal masuk, kepala keluarga (diri sendiri atau rujukan jiwa lain di berkas). W untuk kepala keluarga: nomor HP atau "tidak ada". O: NIK, rentan (`balita`, `hamil_t1..t3`, `menyusui`, `lansia`, `disabilitas_*`, `sakit`), kebutuhan khusus, tanggal keluar | Wajah W untuk umur 18 tahun ke atas kecuali "menolak difoto" (Q10); umur di bawah 18 tidak diminta |
| `korban` | W: status (`meninggal`, `hilang`, `luka_berat`, `luka_ringan`), nama, umur, L/P, desa, kontak keluarga (nama dan HP atau "tidak ada"). Hilang W: lokasi dan waktu terakhir terlihat, status pencarian (`dicari`, `ditemukan_hidup`, `ditemukan_meninggal`). Luka O: dirawat di. Meninggal O: tempat, sumber konfirmasi (`rs`, `keluarga`, `aparat`). O: ciri | Tidak wajib; hilang O foto semasa hidup (Q8) |
| `usaha` | W: jenis (`sawah`, `kebun`, `tambak`, `ternak`, `kios`, `lainnya`), desa, besaran dan satuan (`ha`, `ekor`, `unit`) | 1 wajib |
| `kebutuhan` | W: titik atau desa, butir (logistik, air, obat, tenda, alat berat, lainnya), jumlah dan satuan, mendesak (ya/tidak). O: bantuan masuk (dari siapa, apa, jumlah) | O |

Isian berkas (bukan objek): status darurat (`siaga`, `tanggap_darurat`, `transisi`, `belum_ditetapkan`), nomor dan tanggal SK, posko (nama, titik, nomor), upaya, personel.

## 3. Titik dan penanda

```
titik_objek = titik isian manual
            ?? titik foto pertama berlencana gps
            ?? titik foto pertama berlencana exif
            ?? null  (objek tetap tersimpan, penanda 'tanpa_titik')
```

Penanda (ditampilkan, tidak menolak simpan):

| Penanda | Aturan |
| --- | --- |
| `tanpa_titik` | titik_objek null |
| `foto_jauh` | ada foto bertitik lebih dari 500 m dari titik_objek (haversine) |
| `foto_lama` | waktu ambil foto lebih dari 72 jam sebelum waktu kejadian tiket |
| `dobel_titik` | objek sejenis lain di berkas dalam radius 10 m (rumah, prasarana) |
| `nik_ganda` | NIK sama muncul di dua objek `jiwa` atau `korban` di **berkas yang sama** (D16) |
| `luar_kab` | titik_objek di luar poligon kab berkas |

Ambang 500 m, 72 jam, dan 10 m adalah **HIPOTESIS** rancangan, dicatat di uji dan bisa diubah tanpa migrasi.

## 4. Rekap (dihitung ulang tiap simpan, objek `batal` tidak ikut)

```
rumah_rb = count(rumah, tingkat='rb'); rumah_rs, rumah_rr, rumah_terendam serupa
meninggal = count(korban, status='meninggal') + count(korban, status_pencarian='ditemukan_meninggal')
hilang    = count(korban, status='hilang', status_pencarian='dicari')
luka      = count(korban, status in (luka_berat, luka_ringan))
mengungsi(t) = count(jiwa, masuk <= t and (keluar null or keluar > t))
titik_hari(tp, t) = per kelompok umur meja pengungsi x L/P dari jiwa aktif di tp pada t
```

Bagian yang tidak punya objek dan tidak ditandai "nihil" bernilai `null` ("belum didata"), tidak 0. Bagian bertanda nihil bernilai 0.

Rekap ke meja `dampak` ditulis sebagai kolom bersumber `daftar`. Bila kolom ketikan untuk metrik yang sama sudah berisi nilai lain, keduanya disimpan dan meja menandai `beda_sumber`; mesin tidak memilih.

## 5. Kondisi akhir dan status penutupan

```
sisa_hilang    = hilang
sisa_ungsi     = mengungsi(hari penutupan)
sisa_putus     = count(prasarana, fungsi='putus')
belum_didata   = bagian bernilai null
status = 'selesai' bila sisa_hilang = sisa_ungsi = sisa_putus = 0, selain itu 'selesai_catatan'
```

`belum_didata` ditampilkan tetapi tidak mengubah status (Q7).

## 6. Pertanyaan harian

```
kirim ke ketua(berkas) bila berkas.status == 'terbuka'
  dan belum ada pertanyaan untuk berkas itu pada tanggal WIB hari ini
  dan nomor ketua ada di daftar boleh kirim fase (F0: nomor uji, PEMILIK)
```

Satu pesan per berkas per hari; ketua dengan beberapa berkas menerima satu pesan berisi daftar bernomor.

## 7. Versi beku

```
isi = JSON kanonik {berkas, objek tidak batal terurut id, rekap, kondisi_akhir, penutupan}
sidik = sha256(isi)
versi = versi_terakhir + 1
```

Versi tidak pernah ditimpa. Membuka kembali berkas yang tertutup mengubah status berkas ke `terbuka` dan mencatat alasan di jejak.
