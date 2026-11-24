# RISET: Desa Waspada

Bahan untuk PKH-18. Tidak ada angka di sini yang tampil di layar; yang tampil hanya yang diukur ulang di data kita (KEPUTUSAN D8).

## 1. Apa yang kita punya (kode dan data kita, dibaca 24 Nov 2026)

| Bahan | Berkas | Keadaan | Dipakai di paket ini |
| ----- | ------ | ------- | -------------------- |
| Batas desa | `public/geo/desa/<kode kab>.json` (513 berkas, 258 desa untuk `11.01`), fitur `{properties:{kd}}`, geometri MultiPolygon | disederhanakan, bukan SK batas | ya, titik-dalam-poligon (D4) |
| Nama desa dan kecamatan | `public/data/desa_cari.json`: `{dibuat, sumber, kab:{"11.01":"Aceh Selatan"}, baris:[[kd, desa, kecamatan]]}` | ada | ya |
| Pencari titik ke desa | `scripts/data/insiden.py` kelas `Desa` (indeks sel 0,05 derajat, `cari(lat, lon, kode_kab)`), kode kab dari `kode_kab(prov, nama)` | jalan di `titik.yml` | ya, dipakai ulang (D2) |
| Riwayat petak 2012 sampai 2025 | `data/riwayat_petak.bin` (2,0 MB; 1.509.562 petak, 131.360 di antaranya ≥ 3 tahun), bitmask tahun, `scripts/data/riwayat_petak.py` | VIIRS S-NPP, nominal dan tinggi, `type=0`, petak 0,0034 derajat; tidak disajikan ke publik | ya (D6) |
| Titik panas 7 hari | `public/data/hotspot.json`: `kolom:[lat, lon, jam, sensor, frp, keyakinan, wilayah, tgl_wib]`, `sensor_utama:[M,N,N20]`, 217.042 baris, `acuan` | angka utama memakai semua sensor dan semua keyakinan | ya, disaring VIIRS n/h (D5) |
| Arsip titik per hari | `public/data/titik_hari/<tgl>.json`, `indeks.json` | sejak Jan 2026 | tidak (bukan 2023); hindcast memakai arsip lokal |
| Arsip FIRMS 2023 | `data/raw/firms/viirs_2023.csv` (lokal, tidak ada di CI; dipakai `uji_ambang_prioritas.py`) | tidak dijamin ada | ya, hanya lokal untuk hindcast |
| Peluang prakiraan | `public/prediksi/data/prediksi.json`: `kab[514]` dengan `API:[[p, d] x 3]` (peluang titik panas per kab per hari tenggang 1 sampai 3), `id` 4 digit; skor di `skor.json` | `skor.json` `kode.API.status`: `dinilai` atau `menunggu` | ya (D9) |
| Peluang FWI per sel | `public/data/fwi_ansambel.json` (sel 0,5 derajat, `pt` = P(FWI ≥ 7), `ps` = P(FWI ≥ 14)); `scripts/data/peluang_karhutla.py` per provinsi | ada | tidak dipakai langsung (cadangan, DW-06 opsional) |
| Gambut | `public/data/lahan/gambut.geojson` (1,7 MB, BBSDLP 1:250.000 lewat PRIMS, poligon persegi umum), `khg.geojson` (854 KB, KHG PRIMS, tidak boleh diubah) | ada | gambut.geojson (D10) |
| Rencana per kecamatan | `scripts/data/preventif.py` → `public/data/preventif.json` (`kec` berkunci `"PP|kab|kec"` nama, 554 entri; berisi `petak` ≥ 3 tahun MODIS 1 km, `desa`, `desa_sasaran`, `gambut`, `ulang`, biaya) | punya hitungan desa berulang per kecamatan tanpa daftar desa | tidak diubah, hanya tautan lewat kunci nama (D3) |
| Prioritas KHG | `scripts/data/khg_prioritas.py` → `khg_prioritas.json` | titik per KHG | tidak diubah |
| Status provinsi | `public/prioritas.js` (masuk 60, keluar 30) | ada | tidak diubah |
| Laju terukur pola | `scripts/data/peluang_laju.json` dibekukan lokal oleh `peluang_karhutla.py laju` | ada | pola ditiru (D8) |
| Ekspor pembanding | `~/Downloads/desa-waspada-api.csv` (1.824 desa; kolom di §2) | berkas lokal, tidak masuk repo | hanya pembanding kolom dan jumlah |

Catatan yang memengaruhi rancangan:

- Tidak ada skrip `desa_waspada*` dan tidak ada folder `public/desa-waspada` maupun `tests/desa*` sekarang. `ilmu.mjs pemilik` menunjuk `pipa-data` untuk `scripts/data/desa_waspada*.py` dan tidak menunjuk siapa pun untuk `public/desa-waspada/**` dan `tests/desa-waspada/**` (DW-00).
- `hotspot.json` menyimpan `jam` relatif ke `acuan` (mis. -165,33), jadi jendela 7 hari adalah `jam >= -168`; kolom `keyakinan` berisi kelas 0, 1, 2 (`kelas_yakin`: rendah, nominal, tinggi) dan kolom `wilayah` indeks ke daftar teks `"PP|kab|kec"`. Salinan lokal yang dibaca saat riset ber-`acuan` 12 Okt 2026 (basi); salinan produksi segar, jadi jumlah desa nyata baru diketahui di DW-05. Bentuk nyata baris (dibaca 24 Nov): `[lat, lon, jam, sensor, frp, keyakinan, wilayah(int), tgl_wib]`, mis. `[-8.958, 140.9793, -165.33, "N20", 2.7, 1, 2762, "10-05"]`; `sensor` berisi `M`, `N`, `N20`, `N21` (daftar `sensor_utama` hanya `M,N,N20`, jadi N21 dipilih eksplisit); `tgl_wib` berbentuk `MM-DD` tanpa tahun; kolom `hitung` yang disebut komentar `harian.py` tidak ada di berkas ini.
- `hotspot.json` (`lebar` di `harian.py` sekitar baris 641 sampai 655) sudah dibersihkan dari sel sumber panas tetap oleh `titik_palsu.sel_industri()` (smelter, tambang, kilang, PLTU), **tetapi titik gunung api (kawah) tetap dihitung**. Akibatnya desa di kawah bisa masuk daftar A; riwayat petak sebaliknya membuang gunung api dan sumber tetap lewat `type = 0`.
- `prediksi.json`: `kab[].API` berisi tiga pasangan `[p, d]` dengan `p` pecahan 0 sampai 1 (mis. `[0.03, 0]`), `id` 4 digit ("1101"), `dibuat` ISO WIB; `skor.json` `kode.API.status` ber-nilai `dinilai` atau `menunggu`. `prediksi.json` ditulis `prediksi.yml` (cron harian 01.50 UTC) dan di-commit, jadi `titik.yml` (cron `40 */3`) membacanya dari repo.
- `statis.yml` (cron `0 19 2 * *`) menyimpan cache `graf-`, `air-`, `lintas-`, bukan `data-`; `data/riwayat_petak.bin` dilacak git.
- Peluang `API` dari `prediksi.json` ada per **kabupaten/kota**, bukan per desa. Itu satu-satunya "model peluang" harian yang sudah dibekukan dan dinilai; model peluang FWI di `peluang.json` per provinsi lebih kasar lagi.

## 2. Rujukan pembanding (MIT, Pantau Karhutla, dibaca 24 Nov 2026)

Berkas: `src/pipeline/src/haze/desa.py` (184 baris), `scripts/build_desa.py` (91), `scripts/desa_hindcast.py` (63), `docs/research/prevention.md` §7.5, ekspor `desa-waspada-api.csv`.

**Metode mereka:**

1. Desa = 81.912 poligon COD-AB ADM4 (OCHA/BPS, CC BY-IGO) dirasterkan ke grid 0,01 derajat (sel milik desa yang memuat pusat sel). Desa lebih kecil dari satu sel tidak punya sel. Ketepatan menurut mereka: 93% titik masuk desa benar, 98% kecamatan benar (poligon tepat sebagai kebenaran).
2. Daftar `fire_now`: desa dengan ≥ 1 titik VIIRS publik dalam 7 hari. Daftar `watch`: 0 titik dalam 7 hari dan `fire_years ≥ 3` (WATCH_MIN_YEARS), dibatasi 500 desa per provinsi, diurut `danger_pct` lalu `fire_years` lalu `peat_share`.
3. `fire_years` = jumlah tahun terbanyak pada satu petak 375 m mana pun di desa (`bit_count(m)` maksimum).
4. Risiko: nilai maksimum probabilitas model bahaya mereka (`danger.json`, sel 0,25 derajat) atas sel desa, untuk 3 hari.
5. `peat_share` = pecahan sel desa di dalam gabungan poligon KHG 2017.
6. Hindcast (`desa_hindcast.py`): musim kering 2023 (Juli sampai Oktober), VIIRS S-NPP nominal dan tinggi, mingguan; riwayat hanya 2012 sampai 2022; laju = persen desa-minggu pada kelompok yang punya titik minggu berikutnya.

**Angka mereka (bukan angka kita):** `fire_now` → 39% minggu berikutnya; `watch` → 11,6%; semua lainnya 2,2%; tak pernah terbakar 0,1%. Mereka menyebut 5 kali laju dasar untuk `watch`.

**Kolom ekspor mereka** (`desa-waspada-api.csv`, 15 kolom, BOM UTF-8): kode desa (BPS, `ID...`), desa/kelurahan, kecamatan, kabupaten/kota, provinsi, titik panas 7 hari, titik panas 24 jam, terakhir terdeteksi (WIB), tahun terbakar 2012-2025, bagian di gambut, peluang api hari ke-1 (%), hari ke-2, hari ke-3, bujur, lintang. Dua daftar bercampur di satu berkas, urut titik 7 hari turun.

**Yang kita ubah dan alasannya:**

| Pembanding | Kita | Alasan |
| ---------- | ---- | ------ |
| raster 0,01 derajat | titik-dalam-poligon `public/geo/desa` | poligon sudah ada; desa kecil tidak hilang |
| risiko max sel desa | peluang kab/kota `API.p` | model bahaya mereka tidak kita punya; prediksi kita per kab dan sudah dinilai prospektif |
| KHG union | `gambut.geojson` | lisensi PRIMS KHG; porsi diberi pil perkiraan |
| laju disalin dari mereka | laju diukur ulang | data, sensor, dan batas desa berbeda |
| semua sensor untuk 7 hari di hindcast, S-NPP untuk laju | VIIRS n/h dipakai di kedua sisi | definisi sama (D5) |
| watch 500 per provinsi | 300 per provinsi [SEMENTARA, Q5] | ukuran berkas |

**Lisensi:** MIT, `Copyright (c) 2026 Pantau Karhutla`; pemberitahuan lisensi masuk kepala `desa_waspada.py` dan `desa_waspada_laju.py` bila kodenya meminjam struktur mereka (pola `insiden-kaya` ADR-4).

## 3. Temuan riset yang memengaruhi rancangan

Dari `prevention.md` pembanding (tinjauan literatur, dibaca sebagai bahan, bukan sebagai bukti kita):

- Api di Sabangau dan eks-Mega Rice: 68 sampai 71% mulai di lahan non-hutan, 6 sampai 9% dalam 5 km permukiman (Cattau dkk. 2016). Jarak ke permukiman tidak monoton. Dampak desain: **tidak ada kalimat yang menyalahkan desa** (D14), dan daftar B tidak ditulis "rawan dibakar".
- Pembakaran berulang: gambut terbakar 2,8% per tahun lawan 0,6% di non-gambut; terkonsentrasi di sekitar 25% lahan (Vetrita dan Cochrane 2019). Dampak: riwayat berulang adalah prediktor "di mana" yang wajar, tetapi laju harus diukur di data kita.
- Program desa (APRIL FFVP): dampak belum dinilai peer-review. Dampak: daftar ini membantu **mengarahkan dukungan**, bukan mengklaim efek.
- Pembanding sendiri menganggap `prevention.md` 7.5 sebagai "L (besar)" dan mengakui model kerentanan penuh butuh data kanal, jalan, tutupan, populasi. Itu D15, di luar cakupan.

## 4. Risiko yang ditemukan

1. **Definisi titik tidak sama dengan hindcast** bila daftar memakai angka utama (semua sensor, semua keyakinan, `titik_unik.py`). Ditutup di D5.
2. **S-NPP berhenti 1 Nov 2026**; hindcast 2023 bersensor S-NPP, produksi bersensor N20 dan N21. Ditutup lewat Q4 dan DW-03.
3. **Peluang bukan per desa.** Dua desa sekabupaten tampil peluang sama; ranking dalam kabupaten tidak berisi informasi prakiraan. Ditutup di D9 dan DESIGN-SYSTEM (tidak diurut menurut peluang dalam satu kab).
4. **Poligon gambut kasar** (persegi umum) membuat porsi gambut salah di batas; pil perkiraan (D10).
5. **Batas desa disederhanakan**: titik dekat batas bisa jatuh di desa tetangga. Ukuran galat belum diukur di data kita; DW-03 mencatat persen titik dekat batas (< 200 m) sebagai batas galat.
6. **Jeda satelit dan awan**: tidak ada titik berarti tidak terlihat, bukan padam (prinsip 2).
7. **Asimetri penyaring**: daftar A memakai titik yang sudah bebas sumber tetap tetapi masih memuat kawah, sedangkan tahun terbakar (daftar B) berasal dari riwayat petak yang membuang gunung api dan sumber tetap lewat `type = 0` tanpa `titik_palsu`. Satu desa bisa tampil di A karena kawah dan tidak punya riwayat, atau sebaliknya. Ditutup dengan `batasan` di berkas publik; Pertanyaan Q9 (bawaan sementara: dibiarkan sama dengan angka utama, tertulis di `batasan`).
8. **Dua hitungan desa berulang**: `preventif.json` `desa_sasaran` (MODIS 1 km sejak 2002, titik desa OSM, radius 3 km) dan daftar B (VIIRS 375 m sejak 2012, poligon desa) bisa berbeda untuk kecamatan yang sama. Ditutup di D3 (label definisi, tanpa penjumlahan).
9. **Ukuran berkas**: 1.824 desa pembanding. Kita tidak tahu jumlah kita; DW-05 mengukur dan memotong lewat `terpotong` (D13).

## 5. Sumber

- KEPUTUSAN pembanding: `data/kajian-bnpb/pembanding-pantaukarhutla/TIKET.md` (baris PKH-18) dan `RISET.md`.
- Pembanding: repositori MIT Pantau Karhutla (berkas di §2), ekspor `~/Downloads/desa-waspada-api.csv`.
- Kode kita: lihat §1.
- Pola paket: `data/kajian-bnpb/insiden-kaya/`.
