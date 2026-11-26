# ALGORITMA: Dampak peringatan dini dan status prakiraan

Fungsi murni diuji `--cek` tanpa jaringan. Semua angka di bagian 5 (status) adalah **hipotesis** yang dikunci sebelum uji balik dijalankan (D11, D12); mengubahnya berarti membuat sidik baru dan tidak boleh dilakukan sesudah uji dibuka (`scripts/umum/sidik.py`).

## 1. Masukan dan kesegaran

| Masukan | Sumber | Segar bila | Bila tidak segar |
| --- | --- | --- | --- |
| P: prakiraan kita | `public/prediksi/data/prediksi.json` (`dibuat`), fungsi `levelKode` (`public/prediksi/besok_inti.js:29`); untuk hari ini `lalu.json` (prakiraan H+1 beku kemarin) | `dibuat` paling lama 36 jam (sama dengan `SEGAR_JAM` di `src/pw_inti.js:12`) | P = null |
| R: peringatan BMKG | `GET /api/cuaca/nowcast` (`dibuat`, `terbit`), peringatan dengan `selesai` lebih besar dari sekarang | umpan paling lama 3 jam; peringatan CAP hidup 2 sampai 3 jam (`peringatan.py` kepala berkas) | R = null |
| K: kelas bahaya kab | tabel nasional statis `public/data/kelas_bahaya_kab.json` (DP-02b, dibangun bulanan dari `bahaya_kelas.sampel`) untuk banjir dan longsor | tabel ada dan kab itu terliput | K = null |
| Paparan penduduk dan fasilitas | `paparan.py`, `fasilitas.py` | grid provinsi ada | `terliput: false`, nilai null |

Prakiraan tanpa data untuk satu hari: hari itu dilewati; semua hari kosong: P = null. Nol hanya bila dihitung nol.

## 2. Pemetaan jenis peringatan ke bahaya

Pencocokan pada nama peristiwa CAP (`event`), huruf kecil, tanpa tanda baca, memuat kata kunci.

**Terbukti (DP-01, 26 Nov 2026, baca-saja).** `GET /api/cuaca/nowcast`: 5 peringatan aktif, kunci `dibuat`, `terbit`, `nowcast[]` (`id, event, severity, urgency, certainty, mulai, selesai, wilayah, headline, deskripsi, polygon`). Arsip D1 lewat `GET /api/cuaca/arsip` (`id, event, tingkat, mulai, selesai, bbox, poligon, wilayah, prov`): 1.987 baris terbaca (27 Sep sampai 26 Nov 2026; tiap jendela 30 hari terpotong di 1.000; sebelum 27 Sep kosong). Umpan RSS BMKG langsung (`bmkg.go.id/alerts/nowcast/id`, perlu UA peramban) memuat judul yang sama, "Hujan Lebat disertai Petir di <provinsi>".

| `event` terbukti | `severity` terbukti | `urgency` / `certainty` |
| --- | --- | --- |
| Hujan Lebat dan Petir | Moderate (semua 1.992 baris) | Immediate / Observed |

Hanya satu nama peristiwa dan satu tingkat yang pernah teramati. Minor, Severe, Extreme, angin kencang, dan puting beliung TIDAK terbukti ada di umpan; baris pemetaannya tetap dipakai sebagai kata kunci berjaga, berlabel "belum teramati". Nama baru jatuh ke `tak_dipetakan` dan terhitung, tidak pernah dibuang diam-diam.

| Kata kunci | Bahaya | Kode prakiraan | Status bukti |
| --- | --- | --- | --- |
| hujan lebat, hujan sangat lebat | banjir dan longsor (dua keluaran terpisah) | BNJ, LSR | terbukti |
| angin kencang, puting beliung | cuaca ekstrem | CEX | belum teramati |
| petir (tanpa kata hujan lebat) | tidak dipetakan | tak_dipetakan | belum teramati |
| lainnya | tidak dipetakan | tak_dipetakan | |

Peringatan tak dipetakan dihitung di `tak_dipetakan` (jumlah dan nama peristiwa), tidak membuat paparan.

**Catatan Q11 (ArcGIS `datacuaca.bmkg.go.id`, tidak dipakai).** `.../nowcasting_public/MapServer/2?f=json` menjawab 404 "Service not found"; `rest/services/nowcasting_public?f=json` menjawab 499 "Token Required"; daftar akar hanya folder `gptools, production, Utilities`. Tanpa token layanan tidak bisa dibaca, jadi bidang dan kesegarannya tidak teruji. Q11 tetap: hanya CAP.

Tingkat peringatan BMKG R per bahaya: `severity` Minor, Moderate, Severe atau Extreme menjadi 1, 2, 3 (sama dengan `tangga/ALGORITMA.md` bagian 3, baris nowcast). Kab tersentuh peringatan bila poligon peringatan yang bahayanya cocok berpotongan dengan geometri batas kab (`public/geo/kabupaten/`; uji kotak pembatas dulu, lalu irisan), sehingga poligon kecil di antara titik pusat desa tidak terlewat (D35); R kab = maksimum R dari peringatan yang menyentuhnya, 0 bila umpan segar dan tidak ada yang menyentuh, null bila umpan basi.

## 3. Keterpaparan per poligon

### 3.0 Pembaca poligon

Poligon datang dari `GET /api/cuaca/nowcast` (sudah terurai; `scripts/banjir/peringatan.py` tidak dipakai, D2). Cincin dengan kurang dari 4 titik atau tidak menutup dibuang dan dihitung di `catatan`.

### 3.1 Zona

Tiap poligon (`[[lon,lat],...]`) menjadi GeoJSON Polygon; himpunan poligon sebuah bahaya menjadi satu zona dengan `paparan.zona_dari_bagian(daftar, bahaya, kunci)` (`scripts/siklus/paparan.py:40`). Galat tepi 0,08 km (`GALAT_HALUS_KM`). Poligon sebagai disimpan di arsip (disederhanakan) tidak dipakai untuk hitung.

### 3.2 Penduduk (satu mesin, K7)

`paparan.hitung_kab(sel, [zona], desa, wp, ghsl, kelas_h)` (`paparan.py:134`) dipanggil sekali per kab tersentuh. Keluaran per kab, per kecamatan, per desa:

- `jiwa.worldpop` per kecamatan: WorldPop kecamatan dikali porsi bangunan di zona. Angka utama kecamatan ke atas.
- `jiwa.dukcapil` per desa: jiwa desa dikali porsi bangunan desa di zona. Angka utama per desa, berlabel estimasi. Titik pusat desa Dukcapil (x, y) membagi bangunan ke desa (`paparan.desa_dukcapil`); nama desa dari `public/data/desa_cari.json` lewat kode `kd`.
- `jiwa_jk` per desa (D29): laki-laki dan perempuan terpapar = jiwa Dukcapil terpapar desa dikali `pria` per `pria + wanita` desa (dan `wanita`), berlabel perkiraan; kolom kosong atau jumlah nol: null.
- `jiwa.ghsl`: berdampingan bila ada; bila belum ada null.
- `jiwa_selisih`: jarak antar sumber; bila lebih dari 25 persen terhadap yang terkecil, layar staf menulis "sumber berbeda".

Tiga sumber tidak dijumlah dan tidak dirata-rata. Angka kab dari desa dan angka kab dari WorldPop berbeda dan ditampilkan sebagai dua angka berlabel; jumlah dari satu sumber saja.

Kelompok rentan per desa: balita (u0) dan lansia (u60 sampai u75) dari Dukcapil, dengan porsi yang sama, tanpa sumber lain.

Penduduk ini berlabel "penduduk di area peringatan BMKG" dan tidak pernah dijumlah dengan, atau menggantikan, `jiwa` total kab dan "jiwa terpapar" aturan dampak di tab Besok (D31).

Perluasan `paparan.py` (DP-03) menambah keluaran per desa tanpa mengubah keluaran yang ada; uji emas membandingkan keluaran lama sebelum dan sesudah pada fixture yang sama.

Penduduk antarbahaya tidak dijumlah (satu orang bisa terpapar banjir dan longsor). Total "penduduk di dalam poligon aktif" dihitung dari gabungan zona semua bahaya (satu kali per sel), tidak dari jumlah per bahaya.

### 3.3 Kelas bahaya

Untuk banjir dan longsor: `kelas_inarisk` memberi bangunan per kelas (rendah, sedang, tinggi, tak_terliput) di dalam zona; `bahaya_kelas.kelas` dengan batas 0,33 dan 0,66 (`scripts/siklus/konst.py:12`). Penduduk per kelas = jiwa zona dikali porsi bangunan kelas itu (anggapan merata, berlabel). Tak terliput berdiri sendiri, tidak pernah masuk rendah. Kelas kab K untuk matriks status berasal dari tabel nasional `kelas_bahaya_kab.json` (DP-02b): kelas tertinggi yang memuat paling sedikit 10 persen sampel bangunan kab yang terliput (**[BAWAAN SEMENTARA]**, terkunci di sidik); bila tak terliput lebih dari 50 persen sampel, K = null. Tabel dibangun bulanan, ukuran sampel per kab tertulis di berkasnya, dan tidak berubah mengikuti poligon aktif.

Cuaca ekstrem tidak punya raster; penduduk per kelas tidak dihitung dan K tidak dipakai (Q6).

### 3.4 Fasilitas

`fasilitas.py` (F2.4) dipanggil dengan zona yang sama. Keluaran: jumlah per kategori per sumber per kab (contoh `sekolah_dapodik`, `faskes_osm`, `ibadah_osm`, `kantor_osm`); untuk staf, daftar nama dan titik per desa. Sumber tidak pernah dijumlah atau dihapus gandanya. Kategori obvit hanya hitungan. Sumber tanpa data untuk kab itu: null. Faskes OSM nasional mengikuti DP-26 (K12); sebelum itu null di luar 9 provinsi prioritas.

## 4. Pembulatan dan format

Aturan satu fungsi `bulat(n)` di keluaran (bukan hanya di layar), berlaku untuk penduduk dan fasilitas yang berupa estimasi:

| Nilai n | Hasil | Contoh |
| --- | --- | --- |
| null | null, tampil "belum terukur" | |
| 0 yang dihitung penuh | 0, tampil "0" bersama label cakupan | |
| 1 sampai 9 | "kurang dari 10" | 7 menjadi kurang dari 10 |
| 10 sampai 99 | puluhan terdekat, setengah naik | 54 menjadi 50, 55 menjadi 60 |
| 100 ke atas | dua angka penting | 1.083.781 menjadi 1.100.000; 54.308 menjadi 54.000; 995 menjadi 1.000 |

Penulisan di layar memakai pemisah titik ribuan dan kata "sekitar" untuk 100 ke atas. Jumlah fasilitas dihitung tunggal dan tidak dibulatkan bila di bawah 100 (itu cacahan, bukan estimasi); label "yang terpeta".

## 5. Status prakiraan (terkunci sebelum uji)

Status dihitung ulang selalu tiap jalan (D3). Untuk tiap (kab, bahaya, tanggal sasaran d dari 0 sampai 3) dengan bahaya banjir (BNJ), longsor (LSR), cuaca ekstrem (CEX):

1. `P_d` = `levelKode(kab, KOL, d, kode)` untuk d = 1 sampai 3 (`prediksi.json`); d dipetakan lewat tanggal sasaran (`prediksi.kode[kode].hari` lawan tanggal WIB hari ini + d), bukan indeks baris, sehingga terbitan berumur 30 jam tidak bergeser sehari dan sasaran yang tak tercakup null; untuk d = 0 dari `lalu.json`: `hari[hari ini]` (prakiraan H+1 beku kemarin) bila ada, bila tidak `hari0[kode]` (kunci baru `terbit.py`, DP-06b: terbitan terakhir yang salah satu sasarannya hari ini, tenggang berapa pun, dipakai hanya bila `lalu.dibuat` = hari ini). Sebabnya: arsip 25 Nov 2026 tidak pernah terbit (celah data, bukan galat `terbit.py`), sehingga `lalu.hari` hanya memuat sasaran sampai 25 Nov dan Normal tak pernah tercapai. Null bila tidak ada data. Tingkat 0 sampai 3 sesuai `LEVEL` Normal, Waspada, Siaga, Awas (`besok_inti.js:10`).
2. `R` dari bagian 2, hanya untuk d = 0 (peringatan BMKG hidup 2 sampai 3 jam); untuk d = 1 sampai 3, R tidak dipakai.
3. `E_d` = maksimum dari `P_d` dan (untuk d = 0) `R` yang bukan null; semuanya null: tidak terukur. Status kab = maksimum `S_d` atas d = 0 sampai 3; rincian per hari tampil di kartu.
4. Tabel:

| Syarat | S (status) |
| --- | --- |
| bahaya CEX, atau K = sedang, atau K = tinggi | S = E |
| K = rendah dan R tidak sama dengan 3 | S = paling kecil dari E dan 2 (Siaga) |
| K = rendah dan R = 3 | S = E |
| K = null untuk banjir atau longsor | tidak terukur bila E = 0; bila E lebih dari 0 tampil min(E, 2) (plafon Siaga, `K_null_plafon`) dengan tanda "kelas bahaya belum terukur". Amandemen 1, 26 Nov 2026, sebelum ada uji balik: sebelumnya K null dengan E > 0 bisa Awas padahal K rendah dipagari Siaga (bias ke atas). Sidik lama di `status_prakiraan.sidik.v1`, sidik baru `status_prakiraan.sidik` |

5. Kelengkapan sumber: S = 0 (hijau Normal) hanya bila untuk semua d P bukan null, R bukan null (umpan segar), dan (K bukan null atau bahaya CEX). Bila ada sumber null dan E = 0: abu "belum terukur". Bila ada sumber null dan E lebih dari 0: tampil tingkat E dengan tanda "sebagian sumber". Tanda dan pil hipotesis tampil berdampingan.
6. Tiap status membawa `pemicu`: `prakiraan`, `bmkg`, atau `keduanya`, supaya pembaca melihat dari mana tingkat itu.
7. Teks hijau (tooltip): "Normal: tidak ada pemicu di atas ambang dalam 3 hari ke depan menurut prakiraan Centurisk97 dan BMKG. Ini bukan jaminan keselamatan." Teks abu: "Belum terukur: sebagian sumber belum masuk atau sudah basi."

### 5.1 Pemicu per bahaya dan halaman peta (K11, D26, D27)

| Halaman | Kode | Pemicu status | Poligon BMKG | Kelas bahaya K | Uji balik |
| --- | --- | --- | --- | --- | --- |
| karhutla (`public/index.html`) | KHT | status taktis 4 tingkat `scripts/data/aturan.py`: kelas FWI BMKG dan keparahan satelit, maksimum tingkat kluster aktif 72 jam per kab (protokol `scripts/data/ujibalik_status.py`) | tidak ada (BMKG tidak menerbitkan nowcast karhutla; skala provinsi ada di Tangga) | tidak dipakai | vonis `public/data/ujibalik_status.json` (KI-27), tidak diulang; per 26 Nov 2026 semua tingkat "tidak lulus" |
| `/banjir`, peta utama | BNJ | E = maksimum P dan R | hujan lebat | banjir (tabel nasional) | gerbang baru bagian 6 |
| `/banjir`, tab Longsor (`public/banjir/longsor.js`; `/longsor` bukan halaman, registri `longsor.layar`) | LSR | E = maksimum P dan R | hujan lebat | longsor (tabel nasional) | gerbang baru bagian 6 |
| `/cuaca` | CEX | E = maksimum P dan R | angin kencang, puting beliung | tidak dipakai (Q6) | gerbang baru bagian 6 |
| pesisir, kekeringan, udara, gempa, gunung api | | tidak menyala | | | Q15 |

Karhutla: status per kab = maksimum tingkat status taktis kluster di kab itu pada hari ini (0 sampai 3), dibaca dari `public/data/kluster.json` (keluaran `scripts/data/harian.py`, properti `level` 0 sampai 3 per kompleks, `prov` dan `kab`; hanya kompleks aktif 72 jam, gambut 168 jam; tidak ada berkas baru, ditetapkan DP-06). Kesegaran: `public/data/meta.json` `dibuat` paling lama 36 jam (angka `segar_jam.prakiraan` di berkas kriteria, tidak ada kunci baru sehingga sidik DP-05 tetap). Kab dicocokkan lewat `dasar.pencari`. Vonis per tingkat dibaca dari `public/data/ujibalik_status.json` (`tingkat.<Waspada|Siaga|Awas>.vonis`); tingkat 0 selalu hipotesis. Kode: `status_kht` di `scripts/prediksi/status_prakiraan.py`. Nama tingkat dari registri: Pencegahan rutin, Patroli terpadu, Siaga pemadaman awal, Prioritas pemadaman; warna hijau untuk tingkat 0 mengikuti D33. Kab tanpa kluster aktif = tingkat 0 hanya bila keluaran pipeline karhutla segar (36 jam); basi atau hilang: abu "belum terukur". Tidak ada kelas matriks dan tidak ada R. Pil hipotesis tetap sampai `ujibalik_status.json` memberi vonis "lulus" (bukan gerbang baru). Pembanding dan alarm uji karhutla tetap yang ada di `ujibalik_status.py`.

Berkas kriteria `scripts/prediksi/status_prakiraan_kriteria.json` memuat tabel di atas, ambang 10 dan 50 persen, jendela kesegaran (36 jam, 3 jam), pemetaan severity, dan definisi alarm uji; sidiknya ditulis di DP-05 sebelum DP-06 membuka uji.

## 6. Uji balik lewat gerbang bersama

- Unit: (kab, bahaya, tanggal sasaran d dari 0 sampai 3), satu baris per tanggal sasaran, bukan satu baris per kab. Alarm A = S paling sedikit 2 (Siaga). Hasil untuk S paling sedikit 1 (Waspada) dilaporkan terpisah (D17).
- Kejadian y = 1 bila ada kejadian jenis itu di kab itu dengan tanggal mulai dalam jendela satu hari sebelum sampai satu hari sesudah tanggal sasaran (`prediksi-kejadian` K3, D5 bagian DIBI dan logbook saja; laporan warga tidak dipakai). Jenis: banjir menjadi BNJ, longsor menjadi LSR, cuaca (puting beliung, cuaca ekstrem) menjadi CEX.
- Dua label dinilai terpisah dan tidak dirata-rata: DIBI (`scripts/umum/dibi_kejadian.py`) dan logbook Pusdalops (`prediksi-kejadian` D8).
- Pembanding: persistensi (status kemarin untuk hari sasaran) dan klimatologi per (kab, bulan) dari data latih saja, `scripts/umum/pembanding.py`, pada jumlah alarm yang sama dengan model (AGENTS 2.48). Metrik: kejadian tertangkap pada jumlah alarm sama. Selang 95 persen bootstrap (`scripts/umum/selang.py`). Entri ditulis ke `public/data/gerbang/status_prakiraan.json`; `boleh_tampil` menurut aturan `scripts/umum/gerbang.py`: selisih positif, batas bawah selang di atas nol, vonis prospektif "lolos".
- Syarat n: kurang dari 30 pasangan kejadian: "belum teruji".
- Prospektif: arsip harian status `public/prediksi/data/status_arsip/YYYY-MM.jsonl` append-only, baris tak pernah diubah (pola `tangga_arsip`), diambil dari putaran pertama pada atau sesudah 07.00 WIB (D36). Uji retrospektif hanya komponen P dari `lalu.json`, tidak menentukan `boleh_tampil`. Komponen R untuk retrospektif memakai poligon arsip yang disederhanakan (`src/nowcast.js:56`), jadi hanya perkiraan kasar dan dilabeli.
- Selama `boleh_tampil` salah: pil "hipotesis" di setiap status, termasuk kartu Alun-alun, Dalops, Layar Pimpinan, dan teks push ("prakiraan belum teruji").

## 7. Skema keluaran

`ringkas.json` (R2, publik lewat Worker, kab ke atas):

```json
{"versi": 1, "dibuat": "2026-11-26T14:20+07:00", "umpan_cap": "2026-11-26T14:10+07:00",
 "peringatan": [{"id": "...", "bahaya": "banjir", "tingkat_bmkg": 2, "berlaku_sampai": "...", "wilayah": "...", "web": "https://www.bmkg.go.id/..."}],
 "tak_dipetakan": {"n": 0, "nama": []},
 "kab": {"1101": {"nama": "Kab. Aceh Selatan", "status": {"BNJ": {"s": 2, "pemicu": "keduanya", "sebagian": false, "hari": [2, 1, 1, 0]}},
   "penduduk_area_peringatan": {"worldpop": 54000, "dukcapil": 51000, "ghsl": null}, "jiwa_kelas": {"tinggi": 8800, "sedang": 20000, "rendah": 15000, "tak_terliput": 1000},
   "fasilitas": {"sekolah_dapodik": 37, "faskes_osm": null}, "terliput": true, "catatan": null}},
 "nasional": {"jiwa_worldpop": 1100000, "kab_siaga_awas": 12}}
```

`desa/<kab4>.json` (R2, staf): per desa `kd`, `nama` (dari `desa_cari.json`), `jiwa.dukcapil`, `jiwa_kelas`, `jiwa_jk` (laki-laki, perempuan, perkiraan), `rentan` (balita, lansia), `fasilitas` per sumber dengan `nama` dan titik. `status.json` (publik): hanya status per kab per bahaya (kode BNJ, LSR, CEX, KHT), `pemicu`, `sebagian`, `boleh_tampil`. Kunci kab memakai kode empat digit Kepmendagri seperti `prediksi.json`; layar menampilkan nama, tidak kode (K6). Contoh angka hanya ilustrasi bentuk.
