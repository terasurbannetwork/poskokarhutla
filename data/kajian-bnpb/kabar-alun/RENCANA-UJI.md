# RENCANA-UJI: Kabar Alun-alun

Uji `--cek` murni tanpa jaringan; fixture dibuat di dalam uji. Uji Node memakai `node:test` dan hanya mengimpor fungsi murni `gabung` dan `teksKartu` dari `public/lapor/alun_kabar.js` (tanpa DOM).

## Uji murni Python (`python3 -I scripts/data/alun_kabar.py --cek`)

| No | Kasus | Harapan |
| --- | --- | --- |
| P1 | `data.json` contoh, satu berlokasi `Kota Subulussalam` prov `11` | `kab_kode = "11|Kota Subulussalam"`, `titik` terisi |
| P2 | Nama lokasi tidak ada di `Geo.pusat["kab"]` | `kab_kode = null`, `titik = null`, `titik_ket = "lokasi belum terpetakan"`, tanpa berita |
| P3 | `angin` dan `cuaca` di kab sama, mulai sama | dua baris `id` berbeda, keduanya `jenis = "cuaca"` |
| P4 | Dua entri berkunci sama dalam sehari | satu baris, pencacah duplikat naik |
| P5 | Artikel `kab` sama, tanggal di jendela, kata jenis cocok; 7 cocok | 5 baris terbaru dulu, `n_berita = 7`; `media` berisi nilai `sumber` artikel |
| P6 | Artikel hanya `prov` sama | tidak menempel |
| P7 | Berita tidak terjangkau | `berita = []`, `catatan = "berita tidak terjangkau"` |
| P8 | `angka.kk = 2659.0`; `2659.5`; tidak ada; `0.0` | `2659` (int), `null` plus satu baris log, `null`, `0` |
| P9 | Kejadian `selesai`, `lap_terakhir` 9 hari sebelum `hari` | TETAP ada di berkas dengan `selesai_lama = true`; 5 hari lalu `false`; non-selesai selalu `false` |
| P10 | Daftar izin | tidak ada kunci `teks`, `tangani`, `perhatian`, `label`, `kondisi_pil` di mana pun, juga bersarang |
| P11 | Pindai HANYA string buatan kita (`status`, `titik_ket`, `catatan`, `medsos.status`, `jenis`), bukan judul atau media berita | tidak ada kecocokan `\baman\b` dan tidak ada pola `@\w` |
| P12 | Berita punya `ringkas` panjang | hanya `judul, media, tgl, url` yang keluar |
| P13 | `medsos` | selalu `{"status": "belum_tersambung"}` selama Q1 terbuka |
| P14 | Jalankan dua kali dengan `--kini 2026-11-25T14:10+07:00` dan masukan sama | byte sama; `dibuat` sama dengan argumen |
| P15 | Hari berbeda memuat kunci sama dengan `cutoff` berbeda | `lap_terakhir` dan `cutoff_terakhir` dari tanggal terbaru |
| P16 | Telusur 9 tanggal dengan 2026-11-24 tidak punya folder | dilewati tanpa galat; `kerja-251126` ditemukan untuk `hari` 2026-11-25 lewat glob |

## Uji Node (`node --test tests/alun-kabar/*.test.mjs`)

| No | Kasus | Harapan |
| --- | --- | --- |
| N1 | `gabung`: klaster kab, jenis, tanggal cocok | menempel; angka warga tetap di pita warga |
| N2 | Klaster sama, kab beda | tidak menempel, jadi kejadian "belum ada laporan resmi" |
| N3 | `waktu` bukan berawalan `YYYY-MM-DD` atau `null` | tidak menempel |
| N4 | Klaster cocok dengan dua kejadian | menempel pada `mulai` terdekat; seri, terbaru |
| N5 | Angka resmi 2659 KK dan klaster warga `dampak.mengungsi = 40` | `teksKartu` menulis keduanya terpisah dengan label sumber; tidak ada angka hasil jumlah |
| N6 | Dua kejadian: satu `cutoff_terakhir` 10 jam lalu, satu 50 jam lalu | yang pertama "cut-off ...", yang kedua "Laporan resmi terakhir <tanggal>" (per kejadian, bukan `cutoff` berkas) |
| N7 | `kabar.json` tidak ada | Alun-alun tampil seperti sekarang, tanpa galat |
| N8 | Tautan `javascript:` pada berita | tampil sebagai teks, bukan `<a>` |
| N9 | Pita kosong; `dampak` warga semua 0 | "Belum ada ..." dan tidak ada angka 0 |
| N10 | Sesudah K5: `public/.assetsignore` dan `.gitignore` tidak menahan `data/alun/` | gagal bila salah satu baris muncul lagi |
| N11 | Pindai keluaran `teksKartu` | tanpa titik tengah sebagai pemisah, tanpa `\baman\b`, tanpa literal warna baru |
| N12 | `gabung` dengan `selesai_lama = true` | tersembunyi di tampilan bawaan, muncul di saringan Selesai |

## Uji integrasi nyata

`python3 -I scripts/data/alun_kabar.py --hari 2026-11-25` di mesin pemilik terhadap `data.json` 25 Nov 2026 (27 kejadian): jumlah kejadian keluaran sama dengan 27 dikurangi duplikat, tiap kejadian berkode kab punya titik, jumlah "lokasi belum terpetakan" dicatat di laporan KA-02. Tinjau `http://localhost:8800/lapor/` tab Alun-alun.

## Gerbang yang wajib hijau sebelum push

`python3 -I scripts/data/alun_kabar.py --cek`, `node --test tests/alun-kabar/*.test.mjs`, `npm run uji:agen`, `node --test tests/agen/gerbang-token-warna.test.mjs`.
