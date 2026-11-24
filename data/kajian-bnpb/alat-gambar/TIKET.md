# TIKET: Alat gambar wilayah (`AG-*`)

Kerjakan berurutan. Ambil satu tiket, kerjakan hanya cakupannya, buktikan dengan perintah di `RENCANA-UJI.md`, minta pemilik meninjau tiket layar di `http://localhost:8800/`, baru tiket berikutnya. Tiket yang menunggu Q tidak dikerjakan sebelum Q dijawab (bawaan sementara boleh dipakai bila tertulis).
Subagen tidak commit dan tidak push; sesi induk yang melakukannya (AGENTS §9). Pengerja pemilik berkas lewat `node scripts/agents/ilmu.mjs pemilik <berkas>`.

| Tiket | Fitur | Cakupan | Pengerja → pemeriksa | Bukti siap | Menunggu |
| ----- | ----- | ------- | -------------------- | ---------- | -------- |
| AG-00 | Mesin dan pemilik | bagian baru di `AGENTS.md` (§2.46, terpasang 24 Nov 2026) dan peta modul; entri roster untuk `tests/gambar/**` (tanpa pemilik menurut `ilmu.mjs pemilik`); skrip `uji:gambar` | `mekanik-mesin` → `penulis-gerbang` | `npm run agents:build`, `npm run uji:agen` hijau | – |
| AG-01 | Periksa peta dan data | nama peubah data titik di `index.html` yang bisa dipakai ulang; ada tidaknya alat ukur jarak; keberadaan `luas_citra.json` atau sumber luas dNBR; titik pasang tombol dan penangan klik | `layar-peta` | catatan temuan di `tests/gambar/CATATAN.md` | – |
| AG-02 | F-1, F-2 gambar dan luas | `alat_gambar_geo.js` (luas, buffer, penolakan masukan) dengan uji T1 sampai T3, T8, T9; mode gambar dan lapisan `gambar-*`; sebelum menulis: `modern-web-guidance` dan `bahasa-indonesia-plain` | `layar-peta` → `inp-reviewer`, `selera-angka` | `node --test tests/gambar/*.test.mjs`, tinjau lokal | AG-01, Q3 (bawaan dipakai) |
| AG-03 | F-3, F-4, F-5 titik | titik unik, FRP, siang lawan malam, sel dan jejak; ukur waktu; Web Worker bila > 100 ms | `layar-peta` → `inp-reviewer`, `selera-angka` | T4 sampai T7, T11, `?perf` INP < 200 ms | AG-02, Q1 (bawaan dipakai) |
| AG-04 | F-6 luas dNBR | insiden dalam gambar, per insiden, tanpa penjumlahan | `layar-peta` → `selera-angka` | tinjau lokal pada insiden yang punya luas | AG-03, Q7 (bawaan dipakai) |
| AG-05 | F-7 desa dan kecamatan | muat malas desa dan kecamatan, irisan, penduduk kecamatan berpil perkiraan kasar, batas `MAKS_KAB` | `layar-peta` → `inp-reviewer`, `selera-angka` | T10, T12 | AG-03, Q4 (bawaan dipakai) |
| AG-06 | F-8 kartu hasil | kartu standar, deretan pilihan, keadaan kosong, tiga lebar | `layar-peta` → `selera-angka`, `inp-reviewer` | tinjau di `http://localhost:8800/`, tiga lebar | AG-05, Q8 (bawaan dipakai) |
| AG-07 | Gerbang | `tests/agen/gerbang-alat-gambar.test.mjs` sesuai RENCANA-UJI §3 dan §5; daftar `LAYAR` kartu standar dan tanpa-kesimpulan | `penulis-gerbang` | merah pada pelanggar contoh, hijau pada keluaran asli | AG-02 |
| AG-08 | Periksa manual | tiga gambar, hasil ditulis pemeriksa bersih | `validasi-model` (konteks bersih) | `tests/gambar/hasil_manual.md` | AG-06 |
| AG-09 | Terbit dan pemantauan | tunggu `terbit.yml` sukses, cek berkas langsung, ukuran terbit `index.html` tidak melonjak | `mekanik-mesin` + `layar-peta` | berkas tayang | semua |

## Urutan usulan

1. AG-00, AG-01 (paralel).
2. AG-02, lalu AG-03; AG-07 dimulai sesudah AG-02.
3. AG-04 dan AG-05 (berkas tidak beririsan).
4. AG-06, AG-08, AG-09.

## Pelajaran yang dibawa

- Jangan menyebut luas gambar sebagai luas terbakar, di kode, kartu, atau teks.
- Jangan menulis 0 untuk yang tak terukur (data belum termuat, kab tanpa berkas).
- Jangan menyebut penduduk kecamatan sebagai penduduk di dalam gambar.
- Jangan menyimpan atau membagikan koordinat gambar tanpa keputusan pemilik.
- Jangan menyentuh `ukurAktif`, `S.ukur`, atau lapisan api 3D.
