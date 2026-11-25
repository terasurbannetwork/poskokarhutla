# Operasi generik semua bencana

Halaman ini menjelaskan operasi generik untuk semua bencana: penilai target, tindakan lapangan, tangga peringatan dini, dan dokumen.

## Operasi generik semua bencana (Paritas): penilai target renlap

Mesin: `scripts/umum/renlap.py` (dipicu `.github/workflows/renlap-pb.yml`, `workflow_dispatch`). Karhutla tidak berubah dan tetap dinilai `scripts/operasi/renlap.py`. Satu penilai per bencana (`SKOR`, `scripts/umum/renlap.py:173`):

```
skor_generik = sum( bobot[bencana][fitur] x fitur )   atas fitur yang ada
fitur = tingkat, baru, terdampak, fasilitas, belum_ditangani, nilai 0..1
fitur kosong (null) tidak dihitung dan dicatat di alasan.tanpa_data, tidak dianggap 0
```

Seluruh bobot jenis tanpa uji balik adalah 1,0 sama rata dan berlabel HIPOTESIS (`per_bencana` di `bobot_renlap.json`, keputusan D6). Sumber target per bencana (semua dari berkas di `public/`, tidak karangan):

| Bencana | Sumber target | Saringan | Fitur |
| --- | --- | --- | --- |
| Banjir | kecamatan yang dilaporkan banjir belum surut (Koordalops, logbook Pusdalops, status banjir sistem) | tanpa ambang skor; semua kecamatan itu jadi target, dibagi ke base bandara terdekat | `tingkat` = tingkat prakiraan tertinggi 0 sampai 3, bukan penyaring (`skor_banjir`, `:167`) |
| Pesisir | `public/pesisir/data/abrasi.json` transek berkelas abrasi | keyakinan bukan rendah, tanpa gangguan atau tinjau, tanpa ambang kritis | `tingkat` = |laju| dibagi |laju| terbesar |
| Udara | `public/data/asap.json` (CAMS, 1 derajat) dan pusat kecamatan | kecamatan dengan PM2,5 rata-rata 24 jam di atas 55,4 µg/m³ (sama dengan `scripts/udara/dampak_udara.py`); tanggal harus ada di prakiraan | `tingkat` = PM2,5 sel dibagi sel terburuk |
| Kekeringan | `public/data/kekeringan_wilayah.json` | kabupaten bertingkat 2 atau 3 (Siaga dan Awas) | `tingkat` = tingkat / 3 (ambang spi3 belum lolos uji balik) |
| Cuaca | `public/banjir/data/cuaca_kec.json` | kecamatan bertingkat 2 atau lebih pada tanggal itu | `tingkat` = tingkat / 3 (ambang hujan 50/100/150 mm dan embusan 54/72/90 km/jam adalah hipotesis) |
| Gempa | `public/gempa/data/riwayat_m5.json` (USGS) | magnitudo 5 atau lebih dalam 30 hari katalog terakhir | `tingkat` = magnitudo dibagi magnitudo terbesar |
| Gunung api | `public/banjir/data/gunungapi_status.json` (PVMBG lewat MAGMA) | level resmi 2 atau lebih, radius rekomendasi terisi, penduduk dalam radius lebih dari 0 | `terdampak` = penduduk dalam radius dibagi yang terbanyak; level resmi hanya menyaring |
| Longsor | `public/longsor/data/nowcast.json` dan `kerentanan.json` | bahaya tinggi (t >= 1 dan S >= 0,50) | `tingkat` = S x t dibagi yang terbesar; model gagal uji balik (AUC 0,70 lawan klimatologi 0,78) sehingga hipotesis |

Bila sumber target sebuah bencana kosong, renlap hanya memuat base dari titik sarana dan menulis `alasan_kosong`, tidak mengarang target. Pemilihan per base memakai fungsi `pilih_cakupan` dan `urut_tetangga` yang sama dengan karhutla; kandidat dibagi ke base terdekat; patroli maksimal 8 per base dan radius pandang 6 km.

## Tindakan lapangan dan persen logbook

Skrip `scripts/data/logbook_tindakan.py` membaca arsip logbook Pusdalops 2011 sampai 2026 (di luar git) dan menulis `public/data/bnpb/logbook_tindakan.json`, hanya hitungan tanpa teks asli. Per kejadian (id_kejadian) dengan teks gabungan `upaya`, `kondisi`, `peralatan` sepanjang 5 huruf atau lebih, tiap kode tindakan dicocokkan dengan pola kata kunci (tanpa membedakan huruf besar). Contoh pola: evakuasi `evakuasi`; sar `pencarian|operasi sar|basarnas|korban hilang`; dapur umum `dapur umum`; omc `\bomc\b|\btmc\b|modifikasi cuaca`.

```
persen[bencana][kode] = 100 x |kejadian ber-kode| / |kejadian berisi bencana itu|, satu desimal
masuk kemampuan.tindakan bila persen >= 2 (AMBANG)
atau ada sumber kedua tercatat (PENGECUALIAN)
```

Pengecualian tercatat: OMC banjir (24 dari 120 kejadian OMC bertujuan hujan dan banjir) serta masker dan imbauan kualitas udara (bawaan sementara Q2). Logbook yang ditarik 17 November 2026 memuat 14.805 kejadian banjir, 12.167 cuaca, 10.294 longsor, 2.242 gempa, 815 kekeringan, 304 pesisir, dan 209 gunung api. Batas 2 persen dipilih karena di bawahnya hampir semuanya salah tangkap kata kunci. Satu teks boleh masuk beberapa tindakan, dan angka persen bisa kurang atau lebih dari kenyataan (pencocokan kata, bukan baca makna).

Status uji balik: tidak berlaku (hitungan deskriptif). Skrip `uji` memeriksa daftar registri sama dengan aturan ini.

## Tangga tindakan peringatan dini

Rute `/api/pb/tindakan` mencatat pelaksanaan butir tangga tindakan per peringatan aktif. Butir harus nomor dari daftar `tindakanUntuk(jenis, tingkat)` (`public/ews_tindakan.js`), tidak teks bebas. Pelaksana adalah peran (warga, pusdalops, bpbd, regu), bukan nama orang. Batas waktu bawaan bila tidak diisi, **bawaan sementara (Q20), bukan ketentuan hukum**: Awas 2 jam, Siaga 12 jam, Waspada 48 jam sejak butir pertama dicatat (`src/pb_isian.js:381`). Batas yang diisi sendiri boleh sampai 30 hari ke depan.

## Dokumen sitrep, renops, laporan per KIB, renkon

Rute `/api/pb/dokumen` merakit draf JSON dari berkas ringkas bencana (`public/data/ringkas/<bencana>.json`) dan hitungan operasi dari D1 (renlap terbit, target, target didatangi), menyimpannya sebagai draf di R2, lalu staf menulis dua kalimat ("ringkasan" dan "kebijakan", maksimal 1.500 karakter) sebelum membekukannya. Versi beku ditulis sekali dan tidak pernah ditimpa; perbaikan berarti rakit ulang dengan versi berikutnya. Nilai yang tidak diketahui ditulis null, tidak 0. Isi dokumen yang memuat nomor telepon atau NIK ditolak (422). Bagian butir Perka BNPB 24/2010 untuk renops belum diisi mesin ("belum diisi [perlu cek]"). Untuk saat ini jenis dokumen tidak aktif di registri (`kemampuan.dokumen` kosong untuk semua bencana), sehingga rute ini menjawab 404.
