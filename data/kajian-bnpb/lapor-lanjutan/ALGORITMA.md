# ALGORITMA: Data lanjutan BPBD

Semua fungsi di sini murni (masukan data, keluaran data) dan diuji tanpa DB, kecuali yang ditandai rute.

## 1. Pembukaan berkas

```
buka(tiket, izin):
  syarat: tiket.tingkat == 'bpbd' dan tiket terkirim
          dan kab(kode wilayah laporan) == izin.kab          (D1, hak wilayah D95 induk)
  induk  = lapor_kelompok.induk(tiket.nomor) bila ada, selain itu tiket.nomor
  kunci  = (induk, kab)
  berkas = ambil(kunci) atau buat(kunci, ketua = tiket.wa)
  berkas.kejadian_id, kab4 = tautan Buku Besar tiket induk bila sudah ditempel pasang.py, selain itu kosong
```

Laporan kedua dari kab yang sama dalam kelompok yang sama tidak membuat berkas baru; pelapornya ditawari bergabung sebagai anggota (ketua yang memutuskan).

## 2. Spek per jenis objek

`W` wajib, `O` opsional, `P` = isian pribadi (kolom `pribadi`, diurai kode, tidak pernah ke AI, D19). Tiap pilihan punya nilai `tidak_tahu` bila relevan; kosong tetap `null`.

| Jenis | Isian | Foto (Q12) |
| --- | --- | --- |
| `rumah` | W: kepala keluarga penghuni (P), desa, kecamatan, alamat atau RT/RW, tingkat (`rb`, `rs`, `rr`, `tidak_rusak`), terendam (ya/tidak), status huni (`dihuni`, `mengungsi`, `rata`), jumlah jiwa. O: pemilik (P, atau "sama"), NIK KK (P), keterangan | 2 wajib, video O |
| `prasarana` | W: jenis (`jembatan`, `jalan`, `sekolah`, `faskes`, `ibadah`, `kantor`, `pasar`, `listrik`, `air`, `sinyal`, `irigasi`, `transportasi`, `spbu`, `lainnya`; sama dengan kolom prasarana dan pelayanan dasar meja `dampak`, sinyal = `telekom`), nama, desa, tingkat (`rb`, `rs`, `rr`), fungsi (`putus`, `terbatas`, `berfungsi`). Jalan dan jembatan W: panjang rusak (m), kendaraan yang bisa lewat (`tidak_ada`, `motor`, `mobil`, `truk`). O: jalur alternatif | 2 wajib, video O |
| `titik` | W: nama, desa, jenis dan tipe tempat (nilai meja `pengungsi`), tanggal buka, enam sektor meja `pengungsi` (`keb_air`, `keb_pangan`, `keb_sandang`, `keb_kesehatan`, `keb_hunian`, `keb_pendidikan`: `ada/tidak`). O: MCK, dapur umum, listrik (`ada/tidak`), kapasitas jiwa | 1 wajib |
| `jiwa` | W: titik (`TP-`), nama (P), umur (tahun) atau kelompok umur, L/P, desa asal, tanggal masuk, kepala keluarga (diri sendiri atau rujukan jiwa lain di berkas). W untuk kepala keluarga: nomor HP (P) atau "tidak ada". O: NIK (P), rentan (P: `balita`, `hamil_t1..t3`, `menyusui`, `lansia`, `disabilitas_*`, `sakit`), kebutuhan khusus (P), tanggal keluar | Wajah (P) W untuk umur 18 tahun ke atas kecuali "menolak difoto" (Q10, Q13); di bawah 18 tidak diminta |
| `korban` | W: status (`meninggal`, `hilang`, `luka_berat`, `luka_ringan`), nama (P), umur, L/P, desa, kontak keluarga (P: nama dan HP atau "tidak ada"). Hilang W: lokasi dan waktu terakhir terlihat, status pencarian (`dicari`, `ditemukan_hidup`, `ditemukan_meninggal`). Luka O: dirawat di. Meninggal O: tempat, sumber konfirmasi (`rs`, `keluarga`, `aparat`). O: ciri (P) | Tidak wajib; hilang O foto semasa hidup (P, Q8) |
| `usaha` | W: jenis (`sawah`, `kebun`, `tambak`, `ternak`, `kios`, `lainnya`), desa, besaran dan satuan (`ha`, `ekor`, `unit`) | 1 wajib |
| `kebutuhan` | W: titik atau desa, butir (logistik, air, obat, tenda, alat berat, lainnya), jumlah dan satuan, mendesak (ya/tidak). O: bantuan masuk (dari siapa, apa, jumlah) | O |

Isian berkas (bukan objek): status darurat (`siaga`, `tanggap_darurat`, `transisi`, `belum_ditetapkan`), nomor dan tanggal SK, posko (nama, titik, nomor), upaya, personel, dan tanda nihil per metrik (D15).

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
| `nik_ganda` | NIK sama di dua objek **sejenis** di berkas yang sama: jiwa dengan jiwa, atau korban dengan korban. Tidak pernah jiwa dengan korban, tidak pernah antarberkas (D16) |
| `luar_kab` | titik_objek di luar poligon kab berkas |

Ambang 500 m, 72 jam, dan 10 m adalah **HIPOTESIS** rancangan, dicatat di uji dan bisa diubah tanpa migrasi.

## 4. Rekap (dihitung ulang tiap simpan, objek `batal` tidak ikut)

Tiap metrik `m` punya himpunan objek `S(m)`:

```
nilai(m) = |S(m)|   bila |S(m)| > 0
         = 0        bila m ditandai nihil di isian berkas
         = null     selain itu ("belum didata")

S(rumah_rb)  = rumah tingkat='rb'           (rs, rr serupa)
S(rumah_terendam) = rumah terendam=ya
S(meninggal) = korban status='meninggal' atau status_pencarian='ditemukan_meninggal'
S(hilang)    = korban status='hilang' dan status_pencarian='dicari'
S(luka)      = korban status in (luka_berat, luka_ringan)
S(mengungsi, t) = jiwa dengan masuk <= t dan (keluar null atau keluar > t)
S(jembatan_rb) = prasarana jenis='jembatan', tingkat='rb'   (rs, rr serupa)
jalan_km     = jumlah panjang rusak prasarana jenis='jalan' / 1000
S(<vital>_unit) = prasarana jenis=<vital>  (listrik, air, sinyal->telekom, irigasi, transportasi, spbu)
S(<layanan>_<tingkat>) = prasarana jenis in (sekolah, faskes, ibadah, kantor, pasar)
rincian umur dan L/P = pemilahan S(m) per kelompok umur meja dampak
titik_hari(tp, t) = per kelompok umur meja pengungsi x L/P dari S(mengungsi, t) di tp
```

Mengisi objek untuk metrik yang ditandai nihil mencabut tanda nihilnya dan dicatat di jejak.

Tiga metrik kondisi akhir juga bernilai 0 dari data: `hilang` bila ada korban hilang tetapi semua sudah ditemukan, `mengungsi` bila ada jiwa tetapi tidak ada yang aktif pada `t`, `prasarana_putus` bila ada prasarana tetapi tidak ada yang putus. `mengungsi` wajib dihitung dengan tanggal; tanpa tanggal nilainya kosong. Nama nihil di luar daftar metrik diabaikan. Objek tanpa umur atau jenis kelamin dihitung di total, tidak di rincian.

Rekap ke meja `dampak` (D5): kolom bersumber `daftar`; nilai `null` tidak ditulis. Bila kolom ketikan untuk metrik sama berisi nilai lain, keduanya disimpan dan meja menandai `beda_sumber`; mesin tidak memilih. Catatan berstatus `diverifikasi` atau `masuk_logbook` mendapat penanda `rekap_baru`, isinya tidak berubah sampai petugas menerima.

## 5. Kondisi akhir dan status penutupan

```
sisa_hilang  = nilai(hilang)
sisa_ungsi   = nilai(mengungsi, hari penutupan)
sisa_putus   = nilai(prasarana fungsi='putus')
belum_didata = metrik bernilai null
status = 'selesai'          bila sisa_hilang = sisa_ungsi = sisa_putus = 0  (ketiganya bukan null)
       = 'selesai_catatan'  selain itu, dengan alasan per butir (lebih dari nol, atau belum didata)
```

Tiga metrik itu bernilai 0 hanya bila ada objeknya dengan status akhir, atau ditandai nihil. Metrik lain yang belum didata ditampilkan sebagai daftar kekurangan, tidak mengubah status (Q7).

## 6. Pertanyaan harian

```
cron menit yang ada: jalankan hanya bila jam WIB == jam kirim (Q3) dan menit == 0
  satu kueri berindeks: berkas status='terbuka' tanpa baris lj_tanya untuk tanggal WIB hari ini
  kelompokkan per ketua; ketua yang ada di daftar boleh kirim fase (F0: nomor uji, PEMILIK)
  tulis satu baris lj_kabar per ketua (daftar bernomor bila beberapa berkas) dan satu baris lj_tanya per berkas
```

Isi pesan hanya jumlah per bagian, tanpa nama, HP, atau NIK.

## 7. Versi beku

```
isi = JSON kanonik {berkas (tanpa ketua dan token), rekap, kondisi_akhir, penutupan,
                    objek: [{id, jenis, urut, sidik: sha256(data + pribadi)}] terurut id}
sidik_versi = sha256(isi)
versi = versi_terakhir + 1
```

Versi tidak memuat data pribadi (D14). Membuka kembali berkas yang tertutup mengubah status ke `terbuka` dan mencatat alasan di jejak.
