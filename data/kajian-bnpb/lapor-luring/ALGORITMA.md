# ALGORITMA: Lapor tanpa sinyal

## 1. Pemilihan jalur kirim

```
saat warga mengetuk Kirim di chat atau membuka Lapor:
  bila navigator.onLine === false: buka formulir luring
  bila tidak: coba kirim biasa (kirim() di lapor.js)
    bila fetch gagal dengan TypeError atau timeout: tawarkan "Simpan sebagai laporan tanpa sinyal"
```

`navigator.onLine === true` tidak membuktikan ada internet (RISET 2), jadi kegagalan fetch ikut memicu tawaran. Percakapan online yang sedang berjalan tidak dipindah ke butir: warga memulai formulir luring dari awal; isian chat yang sudah terisi (misalnya jenis) boleh dipakai sebagai isi awal.

## 2. Isi butir (kontrak klien ke Worker)

`data` memuat, dengan urutan kunci ini (antre.js menampilkan tiga nilai teks pertama di pita, jadi nilai pertama harus tidak sensitif):

```
label        "Banjir, 14.32"   // jenis dan jam; ini yang tampil di pita
jenis        id jenis dari JENIS_PILIH
waktu        sedang_berlangsung | kurang_1_jam | hari_ini | kemarin
korban       ya | tidak | belum_tahu
ringkasan    teks atau kosong (maks 500 huruf)
lokasi       {lat, lon, akurasi, waktu, sumber: "gps" | "pilih"} atau {kab: kode, sumber: "pilih"}
foto         [klien_id butir foto]; maksimal 3. Tiap butir foto membawa exif dan gps sendiri
wa           nomor yang sudah dikenal perangkat
bahasa       kode bahasa
spek         versi spek luring
jam_selisih  {ms, diukur} selisih jam server minus jam HP terakhir diukur, atau null
```

Kunci `klien_id`, `waktu_klien` (= saat Simpan) ditambah antre.js. Tidak ada token, kode akses, atau kuki di butir (aturan `DILARANG`).

## 3. Kesegaran foto luring (inti masalah K75)

Di HP saat memotret (sama dengan `bukanKamera` yang ada):

1. EXIF harus punya Make dan Model kamera; kalau tidak, ditolak ("Foto harus diambil langsung dengan kamera").
2. `|jamHP - waktuEXIF| <= 5 menit` dan `jamHP - lastModified <= 5 menit`.
3. GPS perangkat dibaca pada saat yang sama (`waktu` dicatat).

Di Worker (`bentukLuring`), memakai `W = waktu_klien`:

```
W harus <= terima + 5 menit dan >= terima - 14 hari
bila jam_selisih ada dan |ms| <= 10 menit: W' = W + ms, jam_terverifikasi = benar
bila jam_selisih ada dan |ms| > 10 menit: W' = W + ms, tanda "jam HP jauh bergeser"
bila null: W' = W, tanda "jam HP belum diverifikasi"
foto sah bila
   exif.kamera !== false dan
   |waktuEXIF - W'| <= 5 menit (+ 2 menit toleransi) dan
   GPS perangkat: |gps.waktu - W'| <= 10 menit dan akurasi <= 1000 m dan
   bila ada GPS dan EXIF lokasi: jarak <= 5 km
```

Foto sah mendapat lencana "GPS perangkat, luring" dan, bila ada tanda jam, tanda tambahan. Foto tidak sah ditolak sendiri (laporan tetap diterima tanpa foto itu; alasan ditulis di jawaban dan di tiket). Ini Q1: aturan K75 diterapkan terhadap waktu simpan, bukan waktu kirim. Foto yang EXIF waktunya mundur lebih dari 48 jam dari W' ditolak (aturan lama).

## 4. Penerbitan laporan di Worker

`bentukLuring(butir, kini, ctx)` adalah fungsi murni di `src/lapor_mesin.js` yang menerima butir tervalidasi dan mengembalikan sesi seperti darurat (`sesi.darurat = {korban}`) pada status terkirim. Langkah:

1. Validasi dengan spek luring bersama (jenis dikenal, waktu dalam daftar, korban dalam daftar, ringkasan paling 500 huruf, lokasi sah dan di wilayah Indonesia).
2. Lokasi dari GPS dipetakan ke provinsi, kab/kota, kecamatan, desa lewat `lapor_wilayah.js` (K12), tanpa RT/RW. Lokasi `pilih` hanya sampai kab/kota dan diberi lencana.
3. Waktu kejadian: pilihan diubah menjadi teks dan rentang terhadap W' (misalnya "kurang dari 1 jam sebelum 14.32"). `waktu_kejadian` tidak pernah lebih akhir dari W'.
4. Ringkasan disamarkan (`samarkan`) dan disimpan sebagai uraian bebas. Tidak ada angka diurai dari teks bebas; semua isian angka tetap kosong dan masuk daftar susulan.
5. Hak: tingkat sumber `warga`.
6. Pita darurat hanya bila `waktu = sedang_berlangsung` dan `terima - W' <= 2 jam` (Q3, HIPOTESIS). Selebihnya laporan biasa berlabel "dikirim terlambat".
7. Kuota: `MAKS_TERKIRIM_HARI` dan batas per nomor dan IP berlaku; di atas batas, 429 dan butir tetap menunggu (antre.js mundur).

## 5. Idempotensi

```
INSERT lapor_luring(klien_id, wa_hash, ...) pada kunci klien_id
bila sudah ada: jawab 200 dengan hasil tersimpan (nomor, lacak) tanpa membuat laporan baru
bila ada baris tanpa nomor (proses putus): lanjutkan dari langkah yang belum selesai
```

Foto: kunci `lapor_foto_luring` = `klien_id` butir foto; unggah ulang butir foto yang sama menimpa berkas R2 yang sama dan tidak menambah baris.

## 6. Batas antrean dan kuota HP

Sebelum menyimpan: `jumlah butir < 5`, `foto per butir <= 3`, total blob `<= 20 MB`, dan `navigator.storage.estimate()` sisa cukup (bila tersedia). Gagal: simpan ditolak dengan pesan jelas; tidak ada penyimpanan sebagian. Bila antre.js jatuh ke cadangan localStorage (`cadangan === true`), foto tidak bisa disimpan tetap: formulir menyatakan "Foto tidak bisa disimpan di perangkat ini" dan menawarkan simpan tanpa foto.

## 7. Pembersihan

Terkirim: hapus butir dan blob. Ditahan: umur 14 hari (Q4), `bersihkan()` antre.js. "Hapus semua data luring": `hapusBanyak` semua butir saluran, hapus simpanan cangkang API tertentu, hapus selisih jam.

## 8. Mundur dan pemicu

Ditetapkan antre.js: jeda = min(30 menit, 60 detik x 2^(n-1)) plus minus 20 persen; kejadian `online` menembus jeda; tidak ada Background Sync pada v1 (DL9).
