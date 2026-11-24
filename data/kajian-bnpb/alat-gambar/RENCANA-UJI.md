# RENCANA-UJI: Alat gambar wilayah

Aturan AGENTS global butir 3: perilaku di luar TypeScript wajib punya uji yang menjalankannya. Di sini perilaku itu JavaScript klien; ujinya menjalankan fungsi geometri asli pada data kecil buatan sendiri (bukan data dummy di produk) dan menjalankan halaman lokal.

## 1. Perintah bukti

| Perintah | Membuktikan |
| -------- | ----------- |
| `node --test tests/gambar/*.test.mjs` | geometri, titik unik, siang lawan malam, penolakan masukan |
| `node --test tests/agen/gerbang-alat-gambar.test.mjs` | kata terlarang, tanpa penyimpanan, tanpa pihak ketiga |
| `npm run uji:gambar` | dua di atas (dipasang di AG-00, masuk `npm run uji`) |
| `npm run uji:agen` | gerbang paket modul, ilmu agent, token warna, kartu standar tetap hijau |
| tinjau `http://localhost:8800/` dengan `?perf` | INP < 200 ms di tiga lebar |

## 2. Uji geometri (kriteria terima)

| ID | Kasus | Hasil yang diharapkan |
| -- | ----- | --------------------- |
| T1 | kotak 1° × 1° di ekuator | luas ≈ 12.364 km2 (selisih < 0,5% dari bola) |
| T2 | lingkaran r = 10 km di lintang -2° | luas dalam 0,5% dari π r2 |
| T3 | titik tepat di tepi | dianggap di dalam |
| T4 | 5 baris sama (petak dan tanggal) | titik unik 1 |
| T5 | dua tanggal WIB berbeda, petak sama | titik unik 2, sel 1 |
| T6 | `acuan` 12:00 UTC, `jam` 0 | jam WIB 19, malam |
| T7 | baris tanpa FRP | tidak masuk jumlah FRP, dihitung terpisah |
| T8 | poligon 201 simpul | ditolak |
| T9 | garis menyilang diri | ditolak atau dibersihkan dengan pesan |
| T10 | 13 kab beririsan | tanpa daftar desa, titik tetap dihitung |
| T11 | data titik belum dimuat | kartu "menunggu data", bukan 0 |
| T12 | gambar di laut | desa dan penduduk "tak terukur" |

## 3. Uji kata (gerbang)

Gerbang gagal bila di `public/alat_gambar*.js`, `.css`, atau teks yang dipakainya ada: "luas terbakar" atau "luas bakar" berdekatan dengan peubah luas gambar; kata "aman", "bebas api", "padam", "pelaku"; `localStorage`, `sessionStorage`, `indexedDB`; `fetch(` ke domain di luar situs; `innerHTML` dengan data; peubah `luasTerbakar`.

## 4. Periksa manual

Tiga gambar di tiga wilayah (Kalimantan Tengah gambut, Papua Selatan savana, satu kota tanpa titik), ditulis pemeriksa bersih ke `tests/gambar/hasil_manual.md`: angka tampil dibandingkan hitungan terpisah dari `hotspot.json`; hasil tidak boleh berbeda.

## 5. Gerbang (AG-08)

`tests/agen/gerbang-alat-gambar.test.mjs` memeriksa §3, ditambah: tidak ada berkas publik baru selain tiga berkas D10; daftar `LAYAR` kartu standar memuat layar ini.
