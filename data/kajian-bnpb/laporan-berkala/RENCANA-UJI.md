# RENCANA-UJI: Laporan Berkala

Prinsip pemilik (TEST.md): perilaku yang tinggal di luar TypeScript (rumus Python, trigger D1, rute) diuji dengan menjalankannya, bukan dengan mock.

## 1. Uji murni Python (`python3 -I scripts/berkala/hitung.py uji`)

Tanpa jaringan; fixture di `tests/berkala/fixtures/`.

| No | Kasus | Harapan |
| --- | --- | --- |
| H1 | DIBI campur karhutla, banjir, kebakaran permukiman | permukiman tidak masuk angka bencana alam; `bukan_alam` per nama sama dengan jumlah kolom `kejadian` baris permukiman |
| H2 | dua kab, tanggal dan jenis sama, dampak identik dan lebih dari 0 | dampak sekali, kejadian 2, `duplikat_dampak = 1`; dua baris karhutla tanpa dampak tidak kena aturan |
| H3 | baris DIBI 31 Okt dan 1 Nov; deret `peta_karhutla` yang melewati 31 Desember (potongan dua tahun) | yang pertama masuk Oktober; laporan Desember dirakit utuh dari potongan |
| H3b | baris dengan `kejadian: 3` | dihitung 3, bukan 1 |
| H3c | nama jenis mentah baru yang tidak ada di peta jenis | `rakit.py` gagal dengan nama itu |
| H3d | Konflik Sosial dan Kebakaran Gedung dan Permukiman | tidak masuk angka bencana alam; masuk Bab 1.4 per jenis dengan dampaknya |
| H4 | jumlah per kelompok | kering + basah + geologi = jumlah bencana alam |
| H5 | tahun lalu 0, kini 3; keduanya 0 | "baru" tanpa persen; "tetap 0" |
| H6 | tahun lalu 386, kini 324; nilai tepat di setengah (0,05) | "turun 16,1%"; setengah dibulatkan ke atas |
| H7 | puncak hotspot dan hari terakhir | penurunan = (puncak - akhir) / puncak, satu desimal |
| H8 | status surut: `surut: true`, "berangsur surut", tanpa baris dalops; kode kab dalops berbeda bentuk dengan DIBI | Sudah surut, Belum surut, Belum dilaporkan; kode dinormalkan dan cocok; tiga angka berjumlah sama dengan kab banjir |
| H9 | dua baris DIBI gempa satu hari, dua kab, satu kejadian di data gempa | Bab 5 satu peristiwa; Bab 1 tetap dua laporan |
| H10 | gunung api 0/3/24/42 per level | angka dan nama Level III cocok |
| H11 | usulan temuan: provinsi hotspot teratas dengan DIBI karhutla 0 | T2 muncul dengan angka dan sumber |
| H12 | "Banjir dan Tanah Longsor" | masuk banjir, dan jumlahnya tercatat sendiri untuk Bab 3.2 (K5) |
| H13 | periode berjalan (hari ini, minggu ini, bulan ini, tahun ini) | `rakit.py` keluar dengan galat |
| H15 | validasi kode: `2026-W54`, `2026-13`, `2026-02-30`, `2025-W53` (2025 hanya punya 52 minggu ISO), `2026-W53` (2026 punya 53) | empat pertama ditolak, yang terakhir diterima; `hitung.py` dan modul JS memberi hasil sama untuk fixture `tests/berkala/fixtures/kode_periode.json` |
| H16 | rentang minggu ISO melintasi tahun: `2026-W01` dan `2026-W53` | `2026-W01` = 29 Des 2025 sampai 4 Jan 2026; `2026-W53` = 28 Des 2026 sampai 3 Jan 2027; baris DIBI 31 Des 2025 masuk `2026-W01` |
| H17 | harian: `prediksi.json` tenggang +1 dengan nilai tertentu | angka dan label masuk berkas angka apa adanya, tanpa dihitung ulang, tanpa kata "aman" |
| H18 | mingguan: `tangga.json` tidak ada | bagian prakiraan sepekan berstatus `belum_tersedia`, rakit tidak gagal |
| H19 | tahunan: versi beku bulanan Oktober 324, tarikan tahunan Oktober 331 | `lampiran.selisih_bulanan` Oktober = 7, angka tahunan memakai 331 (D13) |
| H20 | tahunan: riwayat 10 tahun dari `dibi_kab_tahun.json` ditambah tahun berjalan | 11 titik, tahun lapor dari tarikan tahunan, bukan dari berkas tahunan lama |
| H21 | harian: pembanding kemarin dan rerata 7 hari | rerata memakai 7 hari sebelum kode, tidak termasuk hari itu |
| H14 | peluang tinggi: kab dengan kejadian banjir November di 5 dari 9 tahun penuh, dan di 4 dari 9 | yang pertama masuk, yang kedua tidak |

## 2. Uji layar murni (`node --test tests/berkala/hitung.test.mjs`)

| No | Kasus | Harapan |
| --- | --- | --- |
| L1 | format 183316, 68.5, 854069.4 | "183.316", "68,5%", "854.069" |
| L2 | kelengkapan: kalimat pembuka kosong | Bekukan ditolak, pesan menyebut "Ringkasan Eksekutif" |
| L3 | foto media tanpa centang izin | ditolak |
| L4 | bab tanpa kejadian di periode itu, action plan kosong | tidak menahan Bekukan |
| L4b | kelengkapan per periode: harian tanpa dukungan yang dimohon | tidak menahan (Q27); bulanan tanpa dukungan yang dimohon menahan |
| L5 | teks isian berisi `<img onerror>` | tampil sebagai teks di pratinjau |
| L6 | tautan `javascript:` di lampiran | tampil sebagai teks |
| L7 | gelar Kepala BNPB | sama persis dengan "Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)" (K3) di sampul dan tanda tangan |
| L8 | tidak ada `text-transform: uppercase` di `laporan_berkala_cetak.css` dan tidak ada string kapital selain daftar singkatan | lolos (Q5) |
| L9 | kepala tabel cetak | semua `th` rata tengah |
| L10 | perata jalur dan beda versi | hanya jalur yang berubah, urut perubahan relatif |
| L11 | cetak draf | tanda air "Draf, belum dibekukan" ada; cetak versi beku tanpa tanda air |
| L12 | jenis berkala, empat periode | tidak ada tulisan ke localStorage |
| L13 | pemilih periode | tiap periode menampilkan masukan yang cocok (tanggal, minggu, bulan, angka tahun); periode berjalan nonaktif |

## 3. Uji kontrak berkas angka (`node --test tests/berkala/kontrak.test.mjs`)

Satu fixture per periode; berkas angka memuat `periode`, `kode`, `rentang`, dan semua kunci wajib per bab untuk periode itu; tiap sumber punya `tarik` dan `status`; angka bilangan bukan string. Fixture dihasilkan `rakit.py --lokal` dari fixture sumber supaya Python dan layar diuji lawan bentuk yang sama.

## 4. Uji integrasi nyata (`npm run uji:berkala`, D1 dan R2 lokal Miniflare)

| No | Kasus | Harapan |
| --- | --- | --- |
| I1 | migrasi dijalankan dua kali | idempoten, tanpa galat |
| I1b | INSERT langsung ke D1 dengan `periode='bulanan', kode='2026-13'`, `periode='harian', kode='2026-02-30'`, `angka_kunci` milik periode atau kode lain | ketiganya ditolak CHECK |
| I2b | UPDATE yang mengganti `periode` atau `kode` baris draf | gagal (trigger) |
| I2 | `UPDATE laporan_berkala SET isian='x' WHERE versi = 1` langsung ke D1 | gagal "versi beku tidak bisa diubah" |
| I3 | `DELETE` versi beku langsung ke D1 | gagal |
| I4 | POST draf tanpa admin | 403 |
| I5 | staf peran apa pun GET; pemirsa bertab pusdalops GET; tanpa masuk GET | staf dan pemirsa 200 tanpa kolom `oleh`, POST 403; tanpa masuk 403 (K4, Q22) |
| I6 | dua POST draf dengan `diubah` sama | yang kedua 409 |
| I7 | dua Bekukan bersamaan | tepat satu versi baru |
| I8 | Bekukan dengan isian belum lengkap | 422 dengan daftar kekurangan |
| I9 | GET angka dengan `tarik=../../dalops/banjir`, `periode=semesteran`, `periode=bulanan&kode=2026-1x`, `periode=mingguan&kode=2026-W54`, `id` bukan 64 heksa | 400; tidak ada objek di luar `berkala/<periode>/<kode>/` yang terbaca |
| I9b | UPDATE draf yang mengganti `versi` 0 menjadi 5 langsung ke D1 | gagal |
| I9c | objek `beku/v1.json` diubah di R2 lokal | baca versi 1 gagal dengan pesan sidik |
| I9d | rute dipanggil dengan host selain Centurisk97 dan localhost | 404 |
| I9e | jawaban rute | `cache-control: private, no-store` |
| I10 | unggah berkas teks bernama `.jpg`; JPEG dengan segmen APP1 Exif; PNG | ketiganya ditolak |
| I12 | buka, simpan, bekukan, cetak | tiap aksi satu baris `laporan_berkala_jejak` |
| I11 | sesudah Bekukan, berkas angka harian dihapus dari R2 lokal | versi beku tetap terbuka (salinan `beku/vN.json`) |

## 5. Uji dengan data nyata

`python3 -I scripts/berkala/rakit.py --periode bulanan --kode 2026-10 --lokal <folder>` di mesin pemilik dengan berkas produksi. Hasil dibandingkan dengan contoh Oktober 2026 per angka di tabel ringkas di laporan tiket LB-03: kejadian 324, karhutla 222, banjir 55, provinsi 27, kab 139, hotspot 469.010, puncak 25.539 pada 6 Oktober, luas 854.069 ha, belum padam 3.865 ha, gunung api 0/3/24/42. Selisih tidak ditutupi: tiap selisih dijelaskan sebabnya (tanggal tarik, definisi) sebelum LB-03 dinyatakan selesai. Periode lain diuji dengan data nyata yang sama: harian 11 Nov 2026, mingguan `2026-W45`, tahunan 2025 (LB-11, LB-12); angka harian dan mingguan dicocokkan dengan jumlah dari berkas angka bulanan Oktober untuk hari dan minggu di dalamnya.

## 6. Uji tampilan

Pratinjau dan cetak dibuka di `http://localhost:8800/laporan-bnpb?jenis=berkala&periode=bulanan&kode=2026-10` (dan satu kode untuk tiap periode lain) (AGENTS.md 3.8). Dicek: jumlah halaman, daftar isi cocok dengan nomor halaman, tidak ada tabel terpotong di tengah baris, foto tidak melewati margin, mode gelap layar tidak ikut ke cetak. `inp-reviewer` memeriksa ketik di isian tidak membekukan layar.

## 7. Gerbang wajib hijau sebelum push

`npm run uji:agen`, `npm run uji:berkala` (Python uji dan `tests/berkala/*.test.mjs`), `npm run uji:warga` (rute lama `laporan_bnpb` tidak rusak).
