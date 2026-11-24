# RENCANA-UJI: Insiden Kaya

Aturan AGENTS global butir 3: perilaku yang tinggal di luar TypeScript wajib punya uji yang benar-benar menjalankannya. Di sini perilaku itu Python (pipeline) dan berkas JSON; ujinya menjalankan kode asli di data kecil buatan sendiri, bukan mock.

## 1. Perintah bukti

| Perintah | Membuktikan |
| -------- | ----------- |
| `python3 -I scripts/data/arsip_insiden.py --uji` | self-check arsip (sudah ada dan hijau; IK-01 menambah kasus pemangkasan, tutup ukuran, petak melebihi 20.000) |
| `python3 -I scripts/data/progresi.py --uji` | self-check fungsi murni A1 sampai A9 |
| `python3 -I scripts/umum/paparan_insiden.py --uji` | self-check fungsi murni B1 sampai B4 |
| `python3 -I scripts/data/progresi.py uji-tahan` | uji tahan A10 pada insiden arsip (butuh `data/raw/firms` lokal, tidak di CI) |
| `node --test tests/insiden/*.test.mjs` | kartu dan fungsi murni layar (format angka, keadaan kosong, `resolved:false`) |
| `node --test tests/agen/gerbang-insiden-kaya.test.mjs` | gerbang berkas publik |
| `npm run uji:insiden` | menjalankan ketiganya (dipasang di IK-00, masuk `npm run uji`) |
| `npm run uji:agen` | gerbang ilmu agent dan paket modul tetap hijau |

## 2. Uji tahan perkembangan api (F-7, A10)

Kriteria dikunci tertulis di berkas ini **sebelum** angka dihitung. Bawaan [SEMENTARA, Q2]:

| Ukuran | Lulus bila |
| ------ | ---------- |
| dalam ±24 jam, gabungan 10 insiden | ≥ 0,60 |
| MAE gabungan | tidak lebih buruk dari tetangga terdekat |
| dalam ±12 jam | dicatat, tidak jadi syarat (pembanding mereka 0,54) |

Prosedur:

1. Pilih 10 insiden: 5 dari 2019 dan 5 dari 2023, terbesar menurut petak unik (≥ 200 petak), ditetapkan dan dicatat di `tests/insiden/hasil_uji.json` sebelum hasil dilihat.
2. Benih tetap `20261124`; 20% petak ditahan; tiga metode dibandingkan: tetangga terdekat, median 5, median 9.
3. Catat komposisi sensor tiap insiden (S-NPP, NOAA-20, NOAA-21).
4. Catat MAE, median galat, dalam12, dalam24, bias, per insiden dan gabungan; kegagalan ditulis jujur (hasil gagal tidak disembunyikan).
5. Vonis `lulus|gagal` ditulis ke `metode.uji.vonis` pada keluaran. `belum` selama uji belum jalan. Layar: lulus = tanpa pil hipotesis; gagal = pil hipotesis (Q10).
6. [SEMENTARA, Q11] Ulangi A10 pada 3 insiden musim ini dari arsip `titik_hari` (masukan produksi, D18 butir a) dan catat hasilnya berdampingan dengan 10 insiden FIRMS lengkap; pil hipotesis dilepas hanya bila kedua kelompok melewati ambang di atas. Tanpa langkah ini vonis historis tidak boleh dipakai untuk angka produksi.

Peringatan baca: uji ini mengukur seberapa baik sel yang ditahan ditebak dari tetangga, bukan akurasi terhadap perimeter independen (dokumen pembanding mengakui hal yang sama). Hasil ditulis dengan keterangan itu.

## 3. Uji bangunan dekat api

### 3.1 Uji murni (`paparan_insiden.py --uji`)

| Kasus | Harapan |
| ----- | ------- |
| satu petak, sel halus pada 0,45 km, 0,55 km | hanya yang 0,45 km dihitung |
| dua petak bersebelahan berbagi sel | sel dihitung sekali, bukan dua kali (D11) |
| radius tepat 0,500 km | termasuk (≤) |
| provinsi tanpa `halus_<prov>.json` | `terliput:false`, semua angka `null`, alasan terisi, bukan 0 |
| tidak ada petak segar | `kini = null`, `kumulatif` terisi |
| `n = 3` | `tampil = "kurang dari 5"`; `n = 87` | `"sekitar 85"`; luas 12.449 | `12400` |
| ambang bangunan | `AMBANG_BANGUNAN == bangunan.AMBANG_KEYAKINAN == 0.70` |
| tidak ada kunci `sel`, `lat`, `lon` di keluaran publik | benar |
| `halus_<prov>.json` bentuk nyata (`cells: [[i, j, n, luas_m2]]`, `lat0 = -12`, `lon0 = 94`) | fixture uji memakai bentuk ini, bukan `"i,j": [n, luas]` |
| titik di sel yang sama dari dua petak | `bangunan_di` menghitung sel sekali (cocok D11) |

### 3.2 Periksa manual pada citra (kriteria terima PKH-07)

Pilih **3 insiden** di provinsi bergrid (Kalimantan Selatan prioritas karena gambut; satu insiden di provinsi lain bila tidak ada) sebelum melihat angka. Untuk tiap insiden dari rincian terkunci:

- 30 bangunan hitungan diambil acak lewat sel halus dan diperiksa pada citra satelit: ≥ 80% sel berisi bangunan nyata [SEMENTARA].
- 5 sampel tempat yang tampak berbangunan dalam 500 m tetapi tidak terhitung dicatat (omisi).
- Selisih angka dengan hitungan visual ditulis (tanpa dikoreksi di kode).
Hasil ditulis di `tests/insiden/hasil_bangunan_manual.md` oleh pemeriksa bersih, bukan pengerja.

### 3.3 Ketahanan

- Hitung ulang dengan radius 500 m dan petak yang sama pada dua hari berturut-turut menghasilkan angka yang sama (penentu).
- Menambah satu petak di tepi 501 m tidak menaikkan angka.

## 4. Uji progresi (`progresi.py --uji`)

| Kasus | Harapan |
| ----- | ------- |
| petak tunggal dengan epoch sebelumnya 6 jam sebelum t_pertama | `t_tiba = t_pertama - 3`, `galat = 3` |
| tanpa epoch sebelumnya | jeda bawaan 12, `t_tiba = t_pertama - 6` |
| epoch berjarak 1 jam digabung | satu epoch |
| 25 petak garis lurus bertambah 1 sel per hari | langkah harian, `p90 ≈ 0,38`, `resolved:true` bila ≥ satu sel; setengah sel per hari → `resolved:false`, `laju = null` |
| petak baru 3 km dari yang sudah ada | tercatat lompatan 3 km, tidak masuk `sebar` laju |
| petak baru 12 km dari yang sudah ada | bukan lompatan |
| `ignition` | rata berbobot FRP, `mulai_lebih_awal:true` bila ≥ 5 petak |
| median 5 terdekat | sel kosong di antara petak bernilai median kelima tetangga terdekat; petak terdeteksi tidak lebih lambat dari `t_pertama` |
| < 20 petak unik | `tersedia:false`, alasan "terlalu kecil untuk dilacak" |
| dua kali jalan, arsip sama | keluaran identik (determinisme) |
| tolok ukur | 20.000 petak sintetis selesai < 60 detik |
| sel yang sama `isokron` 31 langkah | dipangkas ke 30 |
| berkas arsip rusak | mulai ulang tanpa crash, `hitung_sejak` baru |

## 5. Gerbang berkas publik (`gerbang-insiden-kaya.test.mjs`)

Menjalankan dengan berkas contoh nyata hasil pipeline (atau fixture dari keluaran asli `--uji`) dan menolak:

1. Kunci `sel`, `sel_halus`, `kec`, `desa`, `lat`, `lon`, `i`, `j` di `insiden_bangunan.json`.
2. `radius_m != 500` atau `ambang_keyakinan != 0.7`.
3. `bangunan` atau `kumulatif` bernilai 0 di insiden `terliput:false` (harus `null`).
4. `p90_km: 0` atau `laju` 0 pada `terukur:false` (harus `null`).
5. Kata "padam", "aman", "penyebab", "pelaku", "sumber api" di teks kartu (`public/**` berkas kartu) di luar daftar pengecualian.
6. Berkas `progresi/<id>.json` > 150 KB atau isokron > 30 (hanya berkas langsung di `public/data/progresi/`, bukan subfolder `arsip/` dan `petak/`).
6a. `public/.assetsignore` memuat `data/progresi/arsip/` (sekarang gagal; baris ini yang membuktikan IK-01 sisa nomor 2 selesai).
7. `data/terkunci/` menyusup ke `public/` (grep `sel_halus`).
7a. `data/terkunci/insiden/` berada di luar glob unggah R2 `data/terkunci/bangunan/*.json` di `bangunan.yml`.
8. Ambang bangunan dua nilai berbeda di repo (grep `0.70` dan `AMBANG_BANGUNAN` konsisten).

Gerbang harus merah pada contoh pelanggaran (uji gerbang menyuntik pelanggaran sendiri).

## 6. Uji layar dan INP

- Pil hari mengubah satu filter lapisan; tidak ada render ulang tabel; `inp-reviewer` memeriksa handler pil dan pembuka pop-up.
- `selera-angka`: format Indonesia (titik ribuan, koma desimal), satuan, "sekitar", tanpa presisi palsu, tanpa kaki "Sumber".
- `gerbang-tanpa-kesimpulan` dan `gerbang-kartu-std`: layar pop-up masuk daftar `LAYAR` dan `WAJIB_BERSIH`.
- Tinjau pemilik di `http://localhost:8800/` (AGENTS §3.8); tautan halaman ditutup di laporan tiket layar.
- Lebar 375 dan 1440: tabel muat tanpa geser horizontal halaman.

## 7. Uji ketahanan pipeline

- `insiden.json` hilang: `progresi.py` keluar tanpa crash, tanpa menghapus berkas lama.
- `progresi.py` gagal: `titik.yml` tetap hijau, `::warning`.
- `halus_<prov>.json` tidak ada: `terliput:false`, bukan error.

## 8. Urutan bukti per tiket

Lihat kolom "Bukti siap" di `TIKET.md`. Tiket layar tidak ditutup sebelum pemilik meninjau di lokal.
