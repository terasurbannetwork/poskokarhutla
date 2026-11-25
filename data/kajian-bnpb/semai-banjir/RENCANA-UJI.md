# RENCANA-UJI: Semai Redistribusi Banjir dan Penguji Efektivitas

Tiap tiket selesai hanya bila perintah buktinya hijau dan layar ditinjau pemilik di `http://localhost:8800/operasi#semai/banjir`.
Tanpa data dummy: fixture potongan data nyata (`fixture_semai_banjir.json`) dan kasus sintetis untuk fungsi murni.

## 1. Fungsi murni (`python3 scripts/operasi/semai.py uji`)

| Kasus | Harapan |
| ----- | ------- |
| `faktor_h` tiba 0,5 / 1 / 2 / 3 / 3,5 / 4 / 5 jam | 0 / 1 / 1 / 1 / 0,5 / 0 / 0 |
| Contoh ALGORITMA §6 (Q 0,566, tiba 3,5 j, laut) | H 0,5, P 1, skor 0,59 |
| Skor dengan H = 0 | 0 |
| P titik hujan di laut | 1 |
| P di darat 5 / 30 / 80 km dari kota | 0 / 0,5 / 1 (fungsi `faktor_t` induk) |
| GB1 titik hujan di dalam sasaran, 5 km dari tepi luar, 15 km dari tepi luar | gagal / gagal / lolos |
| GB2 titik hujan di daratan kab sasaran `prakiraan` / sel zona di daratan kab sasaran / sel zona di daratan kab terancam `bmkg` / sel dan titik hujan di laut | gagal / gagal / gagal / lolos |
| GB3 lintasan maju masuk sasaran di 0,5 / 2 / 5 jam | gagal / lolos / gagal |
| Angin pengarah 1,5 m/s di pusat sasaran | langkah tanpa kandidat; semua langkah begitu: `angin_lemah` |
| Koridor: sel 20 km dan 200 km dari tepi | keduanya bukan kandidat |
| `pilih_sasaran` membaca tanggal dari `kode.BNJ.hari`; butir `tangga.json` ber-`s: "kita"` | dipakai benar; butir `kita` tidak pernah berasal `bmkg` |
| `pilih_sasaran`: BNJ lv 2 tenggang 1; HJN p50 0,29; waspada banjir tenggang 2; kab tetap tanpa sinyal; manual | masuk / tidak / masuk ("pantau" bila hari tak tercakup) / masuk asal `tetap` / masuk asal `manual` |
| BMKG kab10 `Hujan Petir` pada `d`, kunci `"31.72"` | masuk asal `bmkg`, kode `3172` |
| Prakiraan berumur 40 jam | asal `prakiraan` dilewati, `sumber` mencatat basi |
| Zona id | `<putaran>-B<huruf>` |
| Empat keadaan kosong | `alasan_kosong` benar |
| Lintasan mundur lalu maju dengan angin seragam 5 m/s selama 2 jam | kembali ke titik awal dalam 0,5 km (`lintasan.py uji`) |

## 2. Karhutla tidak mundur (golden)

```
python3 scripts/operasi/semai.py uji golden
python3 scripts/udara/lintasan.py uji
```

`semai.json` tujuan karhutla dari fixture induk sama byte dengan `fixture_semai_golden.json` (kecuali `dibuat`); tanpa `--tujuan`
sama dengan `--tujuan karhutla`; `lintasan.json` mode bawaan dan mode semai tidak berubah. Uji induk (`semai-awan/RENCANA-UJI.md`
§1, §3, §4) tetap hijau.

## 3. Uji silang Python lawan JS (`node --test tests/operasi/semai_banjir_silang.test.mjs`)

Fixture banjir, 3 set bobot (bawaan, 1/0/0, 0,2/0,6/0,2): skor dan zona dari `public/operasi_semai_murni.js` sama dengan `semai.py`
(selisih skor <= 0,005, huruf dan sel zona sama).

## 4. Rute dan D1 (`npm run uji:warga`, `tests/warga/operasi_semai.test.mjs`)

Worker sungguhan dengan D1 lokal, bukan mock:

| Kasus | Harapan |
| ----- | ------- |
| Migrasi sasaran dijalankan dua kali | tanpa galat |
| Target `2026112512-BA` sah, arsip `_banjir` ada | 201, `alasan_json` memuat `sasaran` dari arsip |
| Target `-BA` tetapi hanya arsip karhutla ada | 404 |
| Target `-A` (karhutla) | perilaku induk tidak berubah, semua kasus induk §4 hijau |
| `zona_id` `2026112512-BF`, `-XA`, `-BAA` | 400 |
| Sasaran: tanpa sesi / peran pembaca | 401 / 403 |
| Sasaran `pusdalops` kab sah hari ini | 201 |
| Sasaran kab `9999`, kab teks bebas | 400 |
| Sasaran tanggal kemarin | 400 |
| Sasaran ganda kab+tanggal aktif | 409; sesudah hapus lunak boleh lagi (201) |
| Sasaran ke-31 sehari (terhapus ikut dihitung) | 429 |
| `GET sasaran` dan `GET target` dengan `SEMAI_TOKEN` | 200; `POST` apa pun atau rute lain dengan token itu: 403 |
| Token salah satu byte, token kosong, secret Worker kosong | 401 |
| Target `-B` dengan `tanggal` klien berbeda dari `hari_sasaran` arsip | `alasan_json.hari_sasaran` tetap dari arsip |
| Berkas `semai_banjir.json`, `arsip/2026112512_banjir.json`, `rapor_banjir.json` | dilayani; `arsip/../x`, `semai_banjir.json.bak` 404 |
| CHECK `kab` panjang 5 (sisip langsung) | ditolak D1 |

## 5. Penguji: uji luring (`python3 scripts/omc/efek_banjir.py uji`)

| Kasus | Harapan |
| ----- | ------- |
| Panel sintetis tanpa efek (hujan acak, seleksi pada IFS) | taksiran mendekati 0, permutasi p > 0,05 di >= 90% dari 200 ulangan |
| Panel sintetis efek -40% dengan n besar | `sejalan` |
| Panel sintetis efek +40% | `berlawanan` |
| n perlakuan di bawah ambang | `data_kurang` |
| MDE > 30% dan efek tidak bermakna | `data_kurang` berlabel "tidak informatif" |
| Baris BMKG bertanggal terbalik | bukan perlakuan; provinsi itu dibuang pada kedua rentang |
| Galat baku | klaster per provinsi-periode |
| Plasebo waktu p < 0,10 pada data sintetis yang sengaja bermusim | vonis turun ke `tak_terbedakan` dengan catatan "plasebo tidak bersih" |
| Hari `Pengisian Waduk` di provinsi kontrol | dibuang |
| Provinsi tetangga provinsi perlakuan hari itu | tidak masuk kontrol |
| Permutasi blok: periode yang dipindah tidak beririsan periode OMC mana pun | benar di semua ulangan |
| Benih tetap | dua kali jalan, angka sama |
| `efek.resid` dan `ols` dipanggil dari `efek.py`, tidak disalin | `grep` tidak menemukan definisi `def resid` di `efek_banjir.py` |

## 6. Kriteria vonis penguji (DIKUNCI sebelum lab)

Bagian ini adalah pra-registrasi. Tiket SB-11 menyalin §6 ke `riset/PRAREG-A.md`, menghitung `sha256` atas teksnya ke `PRAREG-A.sidik`,
dan meng-commit keduanya **sebelum** `efek_banjir.py lapis-a tarik` dijalankan. Perubahan sesudah itu hanya sebagai "penyimpangan dari
PRAREG" bertanggal di HASIL.

### 6.1 Hasil dan arah

- Hasil primer kedua lapis: hujan harian kab CHIRPS (mm), rata-rata sel dalam poligon, hari UTC (Q1).
- Efek `b` dalam mm diubah ke persen terhadap rata-rata kontrafaktual kelompok perlakuan (`rata-rata y perlakuan - b`).
- Arah yang diduga: **negatif** di sasaran (hujan lebih rendah dari kontrafaktual). Lapis B sekunder zona: **positif**.

### 6.2 Ambang n

| Lapis | Vonis boleh dihitung bila |
| ----- | ------------------------- |
| A | cakupan dikunci: hanya tanggal >= 3 Feb 2024 (awal `ecmwf_ifs025` di Open-Meteo historical-forecast, KEPUTUSAN D11) sampai hari CHIRPS terakhir saat tarik; jenis persis `Pengurangan CH - Bencana`; baris bertanggal terbalik dibuang. Ambang: >= 300 provinsi-hari perlakuan sesudah pembuangan, >= 30 provinsi-periode (klaster), >= 5 provinsi. Perkiraan dari daftar periode saja: 795 provinsi-hari, 86 provinsi-periode, 13 provinsi |
| B | >= 250 sasaran-hari perlakuan, >= 30 hari kalender berbeda |

Di bawah ambang: `data_kurang (n = x)`.

### 6.3 Vonis

Dihitung dari spesifikasi primer (TWFE + kovariat IFS), inferensi permutasi (ALGORITMA §9.1 dan §9.2), alfa 0,05 dua sisi.

| Vonis | Syarat (semua harus terpenuhi) |
| ----- | ------------------------------ |
| `data_kurang` | ambang n §6.2 tidak tercapai, ATAU hasil tidak memenuhi `sejalan`/`berlawanan` dan MDE > 30% (efek sasaran yang ingin dilihat), berlabel "tidak informatif (MDE x%)" |
| `sejalan` | efek < 0; p permutasi < 0,05; plasebo waktu p >= 0,10; plasebo ruang galat tipe I <= 10%; Lapis B saja: efek sekunder zona > 0 (arah, tanpa syarat signifikan) atau sekunder `data_kurang` dicatat |
| `berlawanan` | efek > 0; p permutasi < 0,05; plasebo waktu p >= 0,10; plasebo ruang galat tipe I <= 10% |
| `tak_terbedakan` | MDE <= 30% dan bukan `sejalan`/`berlawanan`, termasuk efek bermakna dengan plasebo tidak bersih (dicatat "plasebo tidak bersih") |

### 6.4 Aturan melapor

- Selalu: efek persen, selang 90% dan 95%, p permutasi, MDE, n perlakuan dan kontrol, n hari, n provinsi, plasebo.
- Semua spesifikasi sekunder dan rincian eksploratori dilaporkan, termasuk yang nol; rincian dikoreksi Holm.
- `sejalan` ditulis "kesesuaian: hujan sasaran lebih rendah dari pembanding setara; bukan bukti sebab". `tak_terbedakan` ditulis
  "tidak terdeteksi", bukan "tidak ada efek". Tanpa kata "berhasil" atau "gagal".

### 6.5 Harapan sebelum melihat data

MDE Lapis A diperkirakan 40 sampai 100%, jadi label "tidak informatif" paling mungkin; Lapis B membutuhkan sekitar 250 sampai 3.000 sasaran-hari untuk mendeteksi pengurangan
20 sampai 30% (RISET §4). Hasil `data_kurang` atau `tak_terbedakan` adalah hasil yang paling mungkin dan tetap dilaporkan.

### 6.6 Yang tidak dinilai

Sortie, jam semai, koordinat semai, kg bahan, genangan, kejadian banjir, dan sebab-akibat (ALGORITMA §9.4).

## 7. Gerbang teks dan layar

- `tests/agen/gerbang-semai-klaim.test.mjs` (induk SA-16) memindai juga `semai_banjir.json` contoh, `scripts/omc/efek_banjir.py`, dan
  teks tujuan banjir di `public/operasi_semai*.js`, `public/renlap_omc.js` untuk frasa KEAMANAN-PRIVASI §6 (batas kata, supaya
  "keamanan" tidak terkena).
- Layar (tinjau lokal + `inp-reviewer`): klik saklar tujuan p75 INP < 200 ms (Playwright 20 kali); tambah sasaran yang sudah punya
  kandidat menghitung ulang tanpa memanggil server; tujuan banjir tidak menampilkan titik api atau asap; kembali ke Karhutla menampilkan
  DOM kolom kanan sama dengan sebelum paket ini; lebar 390 px tanpa geser mendatar; dua tema kontras >= 4,5.

## 8. Pemeriksa

| Tiket | Pemeriksa | Sinyal |
| ----- | --------- | ------ |
| SB-02 sampai SB-05 | `validasi-model` | §1 dan §2 hijau, ambang dari `semai_bobot.json` |
| SB-06, SB-07 | `migrasi-idempoten`, `guard-api`, `security-reviewer` | §4 hijau |
| SB-08 sampai SB-10 | `inp-reviewer`, `selera-angka` | §3 dan §7 |
| SB-11 sampai SB-13 | `validasi-model` (konteks bersih, AGENTS §3.2) | sidik PRAREG cocok, kode mengikuti §6 tanpa penyimpangan tak tercatat |
