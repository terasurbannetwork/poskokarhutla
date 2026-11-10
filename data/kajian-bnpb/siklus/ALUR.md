# ALUR: Siklus Bencana

Dokumen ketiga dalam urutan otoritas. Kalah dari `KEPUTUSAN-AWAL.md` (KA) dan `PRD.md`; menang atas dokumen di bawahnya. Versi 1.0, 10 Nov 2026.

Notasi: `[peran]` pelaku (WG warga, BP BPBD, PD pusdalops, KO koordalops, PM pimpinan, SA Super Admin, SIS sistem/pipeline). `->` langkah. `X` titik tolak dengan pesan baku. `*` jejak tercatat (siapa, kapan, dari, ke). Status ditulis `monospace`. Tiap tulis D1 menulis baris jejak. Tanpa registri pengungsi per orang dan tanpa NIK di alur mana pun.

## 1. Aturan data hilang dan sumber gagal (berlaku semua alur)

| Keadaan | Perilaku | Tampilan |
| --- | --- | --- |
| Sumber gagal diambil (HTTP, timeout, 429) | pipeline mencoba ulang dengan jeda 2 detik, paling banyak tiga kali; sesudah itu mempertahankan lapis `saji` terakhir | angka lama tetap tampil dengan waktu ambilnya dan pil `menunggu` pada bagian yang baru; tidak pernah dihapus atau diisi nol |
| Sumber kosong untuk Indonesia (contoh Copernicus EMS) | dicatat "kosong" di registri | "tidak ada aktivasi", bukan nol |
| Angka ada di satu sumber saja | ditampilkan dengan nama sumbernya | tanpa kolom "total" |
| Dua sumber berbeda | berdampingan, selisih tertulis (KA 7) | "DIBI 12, Logbook 15, selisih 3" |
| Wilayah tidak terpetakan ke BPS 4 digit | kejadian tetap tersimpan | "wilayah belum terpetakan", masuk antrean pilih manual PD |
| Provinsi tanpa grid bangunan | `terliput:false` | "tidak terliput", bukan 0 bangunan |
| Tanggal logbook kosong atau mustahil | baris dibuang dari lapis `bersih`, dihitung | laporan `laporan_bersih.json` menyebut jumlah dan alasan |
| Model belum lolos uji balik | tetap tampil (KA 11) | pil `hipotesis` atau `estimasi-model` |
| Sesi staf habis | API menolak | Muat ulang masuk; JS statis staf tidak terbuka karena `run_worker_first` |

## 2. Status dan transisi objek

### 2.1 Kejadian (`sk_kejadian.fase`)

`terdeteksi` -> `terverifikasi` -> `tanggap` -> `transisi` -> `pemulihan` -> `selesai`

| Dari | Ke | Pemicu | Pelaku | Syarat |
| --- | --- | --- | --- | --- |
| (baru) | `terdeteksi` | sumber otomatis dipasang (peringatan, `_awal.json`, USGS, DIBI, gempa) atau PD membuat manual | SIS atau PD | pasangan tidak ambigu |
| `terdeteksi` | `terverifikasi` | laporan dua sumber atau verifikasi staf | PD | jenis, kabupaten BPS, tanggal mulai terisi |
| `terverifikasi` | `tanggap` | status darurat ditetapkan atau staf menetapkan | KO | tercatat tanggal mulai tanggap |
| `tanggap` | `transisi` | tanggap darurat berakhir; PDNA diaktifkan | KO | tanggal berakhir terisi |
| `transisi` | `pemulihan` | Jitupasna selesai dan draf R3P berstatus `diusulkan` atau lebih | KO | F4 tertaut; syarat R3P `diusulkan` baru DITEGAKKAN server sejak G3 (tabel `sk_r3p` ada); sebelum G3 KO memindahkan fase dengan alasan tertulis |
| `pemulihan` | `selesai` | semua kegiatan R3P `selesai` atau KO menutup dengan alasan | KO | alasan wajib |
| `terdeteksi` | `dibatalkan` | salah deteksi | PD | alasan wajib; tidak dihapus |
| (fase mana pun yang hidup) | `digabung` | KO menggabung dua `KJ-` (3.2) | KO | fase kedua kejadian sama; kolom `ke` = penyintas; tidak dihidupkan kembali |

Mundur satu langkah boleh oleh KO dengan alasan. Rute yang menurunkan fase ke `terdeteksi` atau `dibatalkan` juga menurunkan `publik` ke 0 dalam batch yang sama; `publik` tidak pernah tertinggal 1 pada fase yang melarangnya. Kejadian `digabung` tidak tampil di daftar. Kejadian yang berhenti di `terdeteksi` lebih dari ambang basi (BASI_HARI 3 di `kejadian.js` untuk tampilan) tampil sebagai basi tetapi tidak berubah status otomatis.

### 2.2 Kaji cepat otomatis (F3, `sk_kaji.status`)

`menunggu_data` -> `dihitung` -> `diperiksa` -> `dipakai` | `ditarik`

- `menunggu_data`: kejadian ada, masukan (grid ShakeMap, poligon banjir) belum ada.
- `dihitung`: SIS menulis rentang berlabel `estimasi-model`.
- `diperiksa`: PD membandingkan dengan isian petugas (meja `kaji_cepat`).
- `dipakai`: PD/KO menandai sebagai rujukan dalam laporan.
- `ditarik`: ditarik dengan alasan bila masukan salah; versi lama tetap tersimpan.

Meja `kaji_cepat` (alur lama): `dilaporkan` -> `diverifikasi` -> `masuk_jitupasna`. Tidak diubah.

### 2.3 Jitupasna (F4, `sk_jitupasna.status`)

`dibuka` -> `pengumpulan` -> `dihitung` -> `ditinjau` -> `final`

- `dibuka`: tim kerja PDNA ditetapkan (Deputi Rehabilitasi dan Rekonstruksi BNPB atau Kepala BPBD, Formulir 02); dicatat nomor SK sebagai teks.
- `pengumpulan`: BP/PD mengisi unit rusak per sektor dan tingkat.
- `dihitung`: nilai kerusakan, kerugian, dan kebutuhan; pemeriksaan hitung ganda.
- `ditinjau`: KO memeriksa; PM bisa membaca.
- `final`: dikunci; perubahan lewat versi baru.

### 2.4 R3P (F4, `sk_r3p.status`)

`draf` -> `diusulkan` -> `disetujui_pm` -> `ditetapkan_resmi` -> `berjalan` -> `selesai`

- `disetujui_pm`: tanda setuju peran pimpinan; tidak menggantikan dokumen resmi (U7). Label di layar: "tanda setuju internal".
- `ditetapkan_resmi`: staf mengisi nomor dan tanggal keputusan penandatangan (Kepala BNPB, gubernur, atau bupati/wali kota; Perban 5/2017 Pasal 6) sebagai teks; sistem tidak menerbitkan dokumen resmi.
- `berjalan`: kegiatan diukur lewat `pemulihan`, `pemulihan_progres`, dan alur rehab meja.
- Batas penyusunan 90 hari sejak tanggap darurat (Pasal 2): sistem menghitung hari tersisa sebagai pengingat, bukan penolakan.

Kegiatan R3P mengikuti progres yang ada: `pemulihan` (target, realisasi, status) dan rehab `jitupasna` -> `usulan` -> `disetujui`/`ditolak` -> `cair` -> `dibangun` -> `selesai`. Nilai yang dicairkan tidak melebihi tahap sebelumnya (aturan `cek` meja).

### 2.5 Renkon (F5, `sk_renkon.status`)

`persiapan` -> `pelaksanaan` -> `finalisasi` -> `ditetapkan` -> `berlaku` -> `kedaluwarsa` | `dimutakhirkan`

- Tiga tahap pertama mengikuti Perban 2/2023 Pasal 4. `ditetapkan` oleh Kepala BNPB atau kepala daerah (Pasal 17); nomor dan tanggal dicatat teks.
- `berlaku` memakai masa 3 tahun sejak tanggal sah; `kedaluwarsa` otomatis ditandai saat dibaca (bukan lewat kueri pindai di cron).
- `dimutakhirkan`: faktor risiko berubah atau ada kejadian; membuka versi baru dari versi lama.

### 2.6 Gladi (F5, `sk_gladi.status`)

`dirancang` -> `siap` -> `berjalan` -> `dievaluasi` -> `selesai`

- Jenis: `ruang`, `posko`, `lapang` (Juklak 4/2026; posko tanpa juklak sendiri).
- `dirancang`: pilih kejadian F1 (sudah dipromosikan ke D1) sebagai skenario dan renkon yang diuji.
- `berjalan`: skenario diputar ulang sebagai rangkaian injeksi data (bukan genangan).
- `dievaluasi`: matriks masalah dan rekomendasi; `selesai` bila rekomendasi tertaut ke renkon.

## 3. Alur per fitur dan peran

### 3.1 G0: gudang data

1. [SIS] `siklus.yml` jalan menurut jadwal registri -> tiap sumber diambil dengan jeda minimal 2 detik, tanpa memecahkan CAPTCHA -> simpan ke `siklus/mentah/` bertanggal.
2. [SIS] normalisasi ke `siklus/bersih/` (kunci BPS 4 digit, label keyakinan, buang baris rusak dan hitung) -> agregat ke `siklus/saji/`.
3. [SIS] periksa anggaran ukuran; X melampaui anggaran -> unggah ditolak dan dicatat di laporan.
4. [SA] membaca registri dan laporan di tampilan staf. Sumber baru hanya masuk lewat penyuntingan registri (gerbang `gerbang-peta-data` menolak tanpa pemakai dan jadwal).
5. Sumber gagal: lihat bagian 1. Tidak ada cron Worker baru dan tidak ada kueri pindai D1.

Riwayat DIBI: [pemilik] mengunggah DIBI harian 2011-2026 dari mesinnya ke `siklus/mentah/` (langkah belum ada di CI). Sebelum diunggah, F1 historis tidak bisa dibangun di CI; ditulis "menunggu".

### 3.2 F1: Buku Besar Kejadian

**Pemasangan otomatis.**
1. [SIS] sumber baru muncul -> `kunci_kejadian.pasangkan` mencari kejadian dengan jenis kanonik, kab BPS, dan tanggal mulai dalam jendela 3 hari.
2. Satu cocok -> tambah baris di `sk_kejadian_sumber`. Nol -> `sk_kejadian` baru (`KJ-` baru) dan fase `terdeteksi`. Lebih dari satu -> X "ambigu", masuk antrean PD, tidak ditebak.
3. Karhutla: [SIS] sel atau kompleks sebagai kunci sumber; kode `K####` hanya disimpan sebagai pengenal hari itu, sehingga satu kompleks yang kodenya berganti tetap satu `KJ-`.

**Antrean ambigu.** [PD] membuka antrean -> pilih kejadian yang benar atau "buat baru" -> * . X pilihan menggabungkan dua `KJ-` yang sudah punya fase berbeda -> ditolak dengan pesan baku; gabung manual oleh KO. Tidak ada pecah: [KO] membetulkan gabung yang salah dengan memindahkan satu baris sumber ke `KJ-` lain (koreksi manual, tercatat di jejak).

**Arsip.** Kejadian lama di R2 tampil di daftar arsip. [PD/KO] mempromosikan satu baris ke D1 dengan `{tahun, kab4}` dari baris daftar itu; baris tanpa wilayah BPS tidak bisa dipromosikan dan layar menulis demikian ("wilayah belum terpetakan, belum bisa dipromosikan").

**Verifikasi dan fase.** [PD] membuka `/siklus/kejadian/:id` -> memverifikasi (`terverifikasi`) -> [KO] mengubah fase menurut tabel 2.1. Tiap perubahan * .

**Membaca.**
- [BP] daftar kejadian wilayahnya, kartu dampak per sumber berdampingan.
- [PM] semua, baca saja.
- [WG] halaman publik: ringkasan resmi saja (U3 bawaan); tanpa nama korban dan tanpa paparan rinci.

**Dampak tidak ada.** Sumber belum melapor: kolom "belum ada laporan", bukan 0. Sumber dua melapor lebih rendah dari sumber satu: kedua ditampilkan, selisih tertulis, tidak dikoreksi otomatis.

### 3.3 F2: Peta Paparan per Bangunan

1. [SIS] `bangunan.yml` bulanan melengkapi grid; harian menghitung ulang paparan terhadap bahaya yang terbit. Cache kosong -> hanya peringatan; provinsi `terliput:false`.
2. [PD/BP] `/siklus/paparan` -> pilih wilayah (BPS 4 digit), bahaya, kelas -> layar membaca agregat `siklus/saji/paparan/*`.
3. Rincian per bangunan: hanya setelah masuk sesi dan lewat rute berkunci (`private, no-store`); tidak pernah di `public/`. X tanpa sesi -> 401.
4. Dari halaman kejadian F1, [PD] membuka "Paparan kejadian ini" -> sistem menyilang poligon atau MMI kejadian dengan grid; keluaran jumlah bangunan, fasilitas vital, dan jiwa (tiga sumber berdampingan).
5. Sumber fasilitas gagal (SIRS, Overpass): bagian itu "cakupan terbatas" dengan sumber pengganti; Sekolah Kita tidak dipakai sampai izin Pusdatin diperoleh.
6. Tombol dummy [SA]: isi data untuk halaman terbuka, hapus semua; baris dummy tidak terlihat oleh staf nyata.

### 3.4 F3: Kaji Cepat Otomatis

**Gempa.**
1. [SIS] gempa M tertentu atau lebih terdeteksi di USGS/`gempa_kejadian` -> `KJ-` dibuat atau dipasang (F1).
2. [SIS] ambil `cont_mmi.json` atau `coverage_mmi_low_res` (hindari `grid.xml` 32,9 MB bila cukup) -> silang dengan penduduk F2 -> rentang korban dari batas PAGER dan ITB; rumah rusak "menunggu" (tidak ada kurva resmi). Status `dihitung`.
3. X grid belum terbit -> `menunggu_data`; tampil MMI dari mesin lokal `guncangan.py` bila ada, berlabel `estimasi-model` dengan galat kalibrasi.
4. [PD] membandingkan dengan laporan lapangan -> `diperiksa` -> `dipakai`.

**Banjir.**
1. [SIS] kejadian banjir aktif (`kejadian_aktif_geo.json`) -> silang poligon dengan grid F2 dan `dampak.json` -> jam pertama kecamatan Siaga/Awas x penduduk, sekolah, faskes, jalan berisiko terputus (batas atas).
2. Kedalaman tidak ada -> kurva JRC tidak dijalankan; tertulis "kedalaman belum tersedia".
3. [PD] memeriksa -> `dipakai`.

**Tanpa keluaran.** Jenis bencana lain (tsunami, longsor, gunung api) belum punya mesin F3: halaman kejadian menampilkan "belum ada perkiraan otomatis".

### 3.5 F4: Jitupasna ke R3P

1. [KO] membuka Jitupasna dari kejadian di fase `tanggap` atau `transisi`; tim kerja dicatat (SK sebagai teks). PDNA diaktifkan BNPB paling lambat dua minggu sebelum tanggap darurat berakhir, BPBD satu minggu: sistem mengingatkan, tidak memaksa.
2. [BP/PD] mengisi unit rusak per sektor dan tingkat (RB, RS, RR; hancur total dipisah). Rumah rusak per rumah lewat `rumah_rusak` yang ada. Luring: antrean IndexedDB, kirim idempoten.
3. [PD] memasukkan harga satuan dari dokumen HSBGN/Perka yang tersedia, berlabel `asumsi-kebijakan`; selisih tahun diindeks IHPB; antardaerah dalam tahun sama diindeks IKK. X harga kosong -> nilai "menunggu", bukan nol.
4. [SIS] menghitung nilai kerusakan (unit x harga), kerugian, dan pemeriksaan hitung ganda; status `dihitung` -> [KO] `ditinjau` -> `final`.
5. [KO] membuat draf R3P dari Jitupasna final: lima sektor R3P dipetakan dari sektor Jitupasna (peta baku menunggu keputusan pemilik; U10). Status `draf`.
6. [KO] mengusulkan -> [PM] tanda setuju internal -> staf memasukkan nomor keputusan resmi bila sudah terbit di luar sistem -> `ditetapkan_resmi`.
7. Pelaksanaan: kegiatan dipantau lewat `pemulihan`/rehab meja; rekap ke halaman `/siklus/pulih/:id`. Kegiatan `macet` (asumsi di meja) memunculkan pengingat.
8. Hibah RR (Perban 4/2024): sistem menyusun daftar dokumen usulan (Pasal 9) sebagai daftar periksa; pengajuan tetap oleh kepala daerah di luar sistem.
9. Daerah percontohan belum ada (U5): alur diuji dengan dummy dan satu kejadian arsip.

### 3.6 F5: Renkon Hidup dan Gladi

**Renkon.**
1. [PD] membuat renkon baru untuk bencana dan wilayah -> tahap persiapan: ancaman dari kajian risiko (F2, F1), pihak terkait.
2. [SIS] mengisi asumsi dampak lima aspek dari riwayat F1, paparan F2, dan kebutuhan `logbook_kebutuhan.json` sebagai usulan. [PD] menerima atau mengubah; tidak ada penimpaan otomatis.
3. [SIS] menghitung kesenjangan: kebutuhan (Perka 7/2008) dikurangi stok LogPal dan personel `/petugas`. X stok tidak ada di LogPal -> "stok belum tercatat", bukan 0.
4. [KO] finalisasi -> penetapan (nomor dan tanggal teks) -> `berlaku` 3 tahun.
5. Pemutakhiran: kejadian baru di wilayah yang sama (F1) atau perubahan paparan memunculkan usulan "tinjau renkon"; [KO] memutuskan.
6. Pengingat kedaluwarsa dibaca saat halaman dibuka dan lewat `pengingat.js`; tidak ada kueri pindai baru di cron.

**Gladi.**
1. [KO] `/siklus/gladi` -> pilih jenis (ruang, posko, lapang) -> pilih renkon dan kejadian F1 yang sudah dipromosikan ke D1 -> sistem menyusun skenario dari garis waktu kejadian itu. X kejadian masih di arsip R2 -> ditolak, promosikan dulu.
2. Dokumen Juklak 4/2026 (Direktif, RGB, ROL, matriks masalah) disediakan sebagai kerangka isian; bukan dokumen resmi.
3. [PD] menjalankan; catatan injeksi dan masalah.
4. [KO] menutup dengan rekomendasi yang tertaut ke renkon; renkon yang direvisi masuk `dimutakhirkan`.
5. Replay Maret 2025 hanya tersedia untuk kejadian itu dan berlabel model sederhana.

### 3.7 F6: Risiko Masa Depan

1. [SIS] di lab, potongan bbox NEX-GDDP dibaca di tempat -> agregat per kabupaten ke `siklus/saji/masa_depan/`. Sebelum potongan teruji: "menunggu".
2. [PD/BP/PM] `/siklus/masa-depan` -> pilih wilayah, horizon (2030, 2050), skenario SSP -> kartu selisih terhadap dasar (historical model, CHIRPS pembanding bias; ALG F6.2) dengan rentang antar model, semua berpil `hipotesis`.
3. Bangunan tumbuh: GHSL epoch disilang dengan zona bahaya F2 -> "pertumbuhan paparan" per kabupaten. GHSL belum diunduh -> bagian itu tidak tampil.
4. Tata ruang: PIPPIB dan konsesi bila ada; RTRW "tidak ada sumber otomatis".
5. [WG] hanya ringkasan berpil `hipotesis`; peta rinci tidak ada.

### 3.8 F7: Pintu Tunggal

1. [semua peran] membuka `/siklus` -> kartu per fase (pengurangan risiko, kesiapsiagaan, tanggap darurat, pascabencana) menuju F1 sampai F6 dan modul yang ada; kartu muncul menurut peran.
2. Tanya jawab: [staf] bertanya ke asisten (`src/ai.js`) -> alat publik MCP -> angka hanya dari hasil alat dengan label keyakinan.
3. Tautan `/siklus` di menu utama menunggu U2; sebelum itu hanya diketahui lewat tautan.

## 4. Serah terima antarfitur

| Dari -> ke | Isi | Bentuk | Bila kosong |
| --- | --- | --- | --- |
| F1 -> F3 | `KJ-`, jenis, kab BPS, tanggal, pusat atau poligon | baris `sk_kejadian` + JSON saji | F3 tidak jalan; kejadian tanpa kab BPS ditandai |
| F1 -> F4 | `KJ-`, fase `tanggap`/`transisi`, dampak per sumber | kolom teks penaut (tanpa FK) | Jitupasna tidak dibuka |
| F2 -> F3 | jiwa dan bangunan per sel dan desa, fasilitas vital | agregat R2 per provinsi | provinsi `terliput:false` -> F3 menulis "paparan tidak terliput" |
| F2 -> F5 | paparan sebagai dasar asumsi dampak | agregat per kabupaten | asumsi dampak diisi manual, berlabel `menunggu` |
| F3 -> F4 | rentang kerusakan dan korban | JSON saji `kaji/<KJ>.json` | Jitupasna berjalan dari isian lapangan saja |
| F4 -> F5 | kebutuhan pemulihan dan realisasi | ringkasan `pemulihan` | renkon memakai logbook sebagai dasar empiris |
| F1 -> F5 (gladi) | garis waktu kejadian yang sudah dipromosikan ke D1 | baris `sk_kejadian` + `sk_kejadian_sumber` | gladi tidak bisa dibuat tanpa kejadian terpromosi |
| F5, F6 -> F7 | status renkon, kedaluwarsa, sinyal iklim | kartu pintu | kartu tidak tampil (tidak ada kartu kosong) |
| F2 -> F6 | zona bahaya dan paparan dasar | agregat | F6 tanpa bagian bangunan tumbuh |

Aturan serah terima: satu arah per baris; penerima tidak menulis balik ke pengirim; semua tertaut lewat ID teks (`KJ-`), bukan lewat FK ke tabel milik sesi lain.

## 5. Siapa memicu apa (ringkas)

| Pemicu | Pelaku | Akibat |
| --- | --- | --- |
| Jadwal `siklus.yml` | SIS | G0 ambil, bersihkan, sajikan |
| Sumber baru muncul | SIS | F1 pasang atau buat `KJ-` |
| Gempa terbit grid | SIS | F3 hitung rentang |
| Ubah fase kejadian | KO | pengingat PDNA, pintu F7 |
| Isian lapangan | BP/PD | F4 Jitupasna |
| Tanda setuju | PM | R3P `disetujui_pm` |
| Tombol dummy | SA | data contoh, hapus semua |
