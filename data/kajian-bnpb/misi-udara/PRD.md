# PRD: Misi Udara (renlap flight semua bencana)

Otoritas: `KEPUTUSAN-MISI.md` menang atas dokumen ini.

## 1. Tujuan

Staf Pusdalops memilih bencana dan jenis misi, mengisi base dan titik tujuan, lalu mendapat flight plan helikopter siap kirim
ke pilot: peta rute, tabel leg (haluan, jarak, waktu), pemeriksaan zona sesuai bencananya, dan daftar periksa misi. Berlaku
untuk semua bencana (K2), dengan aturan berbeda per bencana (K4).

## 2. Pemakai

| Pemakai | Kebutuhan |
| ------- | --------- |
| Staf Pusdalops | menyusun flight plan dalam beberapa menit dari titik hasil koordinasi lapangan |
| Pilot dan operator | tabel leg, koordinat DMS, KML dan GPX untuk GPS, catatan zona |
| Komando (BNPB, BPBD, posko) | ringkasan satu halaman: ke mana, berapa lama, apa yang perlu diputuskan |
| Tim darat di titik tujuan | daftar periksa lapangan pendaratan atau zona dropping |

## 3. Jenis misi (D3)

| Kode | Misi | Isi khas | Bencana |
| ---- | ---- | -------- | ------- |
| `dropping` | Dropping bantuan | titik darat atau titik jatuh, cara serah (mendarat, lempar rendah), berat muatan, daftar periksa lapangan | semua |
| `pantau` | Pantau kondisi | titik atau kecamatan yang dilihat, waktu orbit per titik, apa yang diamati | semua |
| `evakuasi` | Evakuasi korban dan medis | titik jemput, tujuan (fasilitas kesehatan atau tempat evakuasi), jumlah orang tanpa nama | semua |
| `angkut` | Angkut personel dan alat | titik darat, jumlah orang dan berat alat, bolak-balik | semua |
| `cari` | Pencarian (SAR) | titik acuan, pola (kotak melebar, lintasan sejajar), jarak lintasan | banjir, longsor, gempa dan tsunami, pesisir |
| `kunjungan` | Kunjungan lapangan | titik darat, lama di darat; tidak disimpan di repo dan tanpa nama pejabat | semua |

Di luar lingkup (Q1): muatan gantung, pemetaan drone, relai komunikasi. Water bombing, patroli api, dan semai awan tetap di
paket Operasi Udara dan Semai Awan (D2).

## 4. Fitur

| ID | Fitur | Tahap | Keluaran |
| -- | ----- | ----- | -------- |
| F-1 | Rute urut tetap: base, titik berurutan, kembali ke base atau berakhir di base lain | 1 | leg, haluan sejati, km, NM, menit |
| F-2 | Titik dari koordinat desimal, DMS, tautan Google Maps, plus code (D8) | 1 | titik tervalidasi di dalam wilayah Indonesia |
| F-3 | Titik "menyusul": titik sementara ditandai dan flight plan bisa dibuat ulang saat titik pasti masuk | 1 | label "titik menyusul"; versi bertambah |
| F-4 | Templat per jenis misi: bidang isian, waktu di darat atau orbit, daftar periksa | 1 | halaman misi di PDF |
| F-5 | Pemeriksaan zona per bencana, dua tingkat: larangan dan perhatian (D4) | 1 | tabel pemeriksaan dengan sumber dan jam data |
| F-6 | Belokan otomatis mengitari zona larang berbentuk lingkaran; titik darat di dalam zona larang ditolak | 1 | leg tambahan bertanda "belokan" |
| F-7 | Zona manual per kejadian (lingkaran atau poligon) dengan alasan dan sumber wajib (Q14) | 1 | ikut diperiksa seperti zona data |
| F-8 | Pemeriksaan daya tahan: waktu terbang ditambah cadangan lawan daya tahan tipe; saran titik isi ulang bila kurang | 1 | baris "cukup" atau "perlu isi ulang di ..." berlabel sumber angka |
| F-9 | Cuaca di base dan titik: kelayakan terbang dari METAR terdekat, satu rumus dengan Operasi Udara | 1 | layak, terbatas, tidak layak, atau "tidak ada data" |
| F-10 | Keluaran: PDF, KML, GPX, teks WA, JSON | 1 | berkas di luar `public/` |
| F-11 | Pola pencarian: kotak melebar dan lintasan sejajar dari titik acuan dan jarak lintasan | 1 | titik lintasan bernomor |
| F-12 | Bot WA: permintaan flight plan lewat pesan berformat, balasan PDF | 2 | PDF di grup yang berhak |
| F-13 | Simpan dan versi lewat `pb_misi`; berkas di R2 `operasi/misi/` tulis sekali | 2 | daftar flight plan per bencana |
| F-14 | Layar isian di `/operasi`: formulir, pratinjau peta, unduh | 3 | seksi Misi udara |
| F-15 | Catat hasil: terlaksana, batal dan alasannya, muatan terkirim, orang terangkut | 3 | baris hasil di `pb_misi_hasil` |

## 5. Aturan per bencana (ringkas; rinci di ALGORITMA bagian 3)

| Bencana | Larangan (mengubah rute atau menolak titik) | Perhatian (dicetak) |
| ------- | ------------------------------------------- | ------------------- |
| Gunung api | lingkaran radius PVMBG per gunung ditambah penyangga; zona manual sektor; jejak abu model | gunung Level I di dekat rute; VONA; arah angin |
| Gempa dan tsunami | titik darat di kabupaten berperingatan tsunami aktif (Q8); zona hening manual | gempa susulan; debu di reruntuhan |
| Karhutla dan kualitas udara | – | jarak pandang dan asap di base dan titik |
| Cuaca ekstrem | – | rute memotong poligon peringatan dini cuaca BMKG; siklon aktif; badai guntur di METAR |
| Banjir | – | titik darat di kecamatan berstatus Siaga atau Awas: periksa permukaan lapangan |
| Longsor | – | titik darat di kecamatan berpeluang longsor tinggi: jangan mendarat di kaki atau mahkota longsor |
| Kekeringan, pesisir | – | daftar periksa umum saja (debu, angin laut); tanpa pemeriksaan data |

## 6. Larangan

1. Tidak menulis "aman", "layak terbang", atau "bebas" untuk rute. Kalimat yang dipakai: "tidak memotong zona yang diketahui per <jam data>".
2. Tidak menyimpan atau mencetak nama kru, penumpang, korban, atau pejabat.
3. Tidak menulis keluaran ke `public/`. Jenis `kunjungan` tidak di-commit.
4. Tidak membuat angka batas tanpa sumber di `batas_terbang.json`.
5. Tidak mengubah renlap karhutla, tabel `op_renlap`, atau `op_target`.
6. Tidak membuat mesin per bencana.

## 7. Ukuran berhasil

1. Flight plan tiga titik selesai dalam 60 detik di perintah baris (peta sudah di-cache).
2. Rute yang memotong radius gunung api di data uji selalu dibelokkan atau ditolak, tidak pernah lolos diam-diam.
3. Tiap baris pemeriksaan zona punya sumber dan jam data.
4. Flight plan Aceh dan Sumatera Utara 15 Nov 2026 bisa dibuat ulang dengan mesin baru dan angkanya sama (haluan, km, menit).
