# Standar uji — berlaku di SEMUA proyek

Aturan pemilik, 23 Agustus 2026. Berlaku untuk proyek yang sudah ada maupun
yang baru dibangun.

## Aturannya

**Tiap perilaku yang tinggal di luar TypeScript wajib punya uji integrasi yang
benar-benar menjalankannya.** Trigger database, constraint, RLS, fungsi SQL,
route handler, dan alur lintas-tabel tidak boleh cuma diuji lewat unit test
bermock. Mock mengembalikan apa pun yang kita suruh kembalikan, jadi ia
meloloskan persis kelas bug yang paling mahal: angka salah tanpa satu pun
error.

**Yang menentukan lapisannya adalah letak logikanya, bukan selera:**

| Logikanya di                     | Diuji dengan                                     |
| -------------------------------- | ------------------------------------------------ |
| fungsi murni (format, hitungan)  | unit test biasa, murah, banyak boleh              |
| trigger / constraint / RLS / RPC | SQL langsung ke Postgres, transaksi + ROLLBACK    |
| route handler / guard peran      | panggil handler-nya, bukan mock kliennya          |
| alur lintas-tabel (uang, stok)   | satu uji end-to-end yang melewati semua tahapnya  |

**Aturan tanpa gerbang mekanis dianggap belum jadi.** Standar ini sendiri harus
punya gerbang di tiap repo yang memakainya: sebuah test biasa (tanpa database)
yang menolak logika baru di lapisan itu kalau ujinya belum ada atau alasannya
belum ditulis.

## Cara memasangnya di repo baru

Rujukannya `mbg-kdmp`: `tests/e2e/*.sql`, `scripts/e2e-db.mjs`,
`tests/e2e/cakupan.json`, `tests/unit/gerbang-test-integrasi.test.ts`,
`.github/workflows/e2e-db.yml`. Salin polanya, jangan rancang ulang.

Empat hal yang tidak boleh hilang saat menyalin:

1. **Runner yang membungkus transaksi**, bukan berkas ujinya. Berkas yang lupa
   me-ROLLBACK tetap tidak boleh bisa menetapkan apa pun.
2. **Berhenti di error pertama** (`ON_ERROR_STOP`, `set -e`, apa pun
   padanannya). Uji yang gagal tapi melapor lolos lebih buruk daripada tidak
   ada uji sama sekali.
3. **Registri cakupan** dengan tiga daftar: `diuji`, `dikecualikan` (berikut
   alasannya), `antre`. Yang baru wajib masuk salah satu dari dua yang pertama;
   `antre` adalah utang eksplisit yang cuma boleh menyusut.
4. **Jangan dijalankan tiap push.** Suite yang menyentuh database sungguhan
   jalan saat yang diuji berubah, sekali sehari, atau saat diminta manual.
   Menit CI habis lebih cepat daripada yang diperkirakan siapa pun.

## Cara menulis asersinya

**Invarian, bukan potret data.** "Tiap tabel punya RLS" tetap benar selamanya;
"jumlah cabang harus 22" membusuk sendiri begitu datanya tumbuh, lalu merah
diam-diam karena tak ada yang menjalankannya. Di mbg-kdmp empat asersi potret
merah bertahun-tahun tanpa ada yang tahu.

**Uji bahwa yang salah DITOLAK**, bukan cuma bahwa yang benar tersimpan.
Penjaga yang lepas selalu gagal diam.

**Pesan gagalnya menyebut angkanya dan sebab teknisnya**, supaya bisa dibaca
sekali jalan oleh orang yang sedang berdiri di depan pipeline merah.

## Yang TIDAK berubah

Unit test tetap dipakai untuk fungsi murni, dan tetap yang paling murah. Yang
dilarang cuma satu: memakai unit test bermock sebagai BUKTI bahwa alur yang
sebenarnya bekerja.
