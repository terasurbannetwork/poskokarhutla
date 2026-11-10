# GLOSARIUM: Siklus Bencana

Istilah dan singkatan program. Kalah dari `KEPUTUSAN-AWAL.md` (KA). Versi 1.0, 10 Nov 2026.

## Program dan fitur

| Istilah | Arti |
| --- | --- |
| Siklus Bencana | program yang menyatukan pengurangan risiko, kesiapsiagaan, tanggap darurat, dan pascabencana dalam satu pintu, halaman `/siklus` |
| G0 | lapis gudang data: registri sumber, tiga lapis R2, anggaran, pembersihan riwayat |
| G1 sampai G4 | gelombang kerja: G1 = G0 + F1 + F2, G2 = F3, G3 = F4, G4 = F5 + F6 + F7 |
| F1 | Buku Besar Kejadian: satu ID dan satu halaman tiap kejadian |
| F2 | Peta Paparan per Bangunan: bangunan, fasilitas vital, dan jiwa di zona bahaya |
| F3 | Kaji Cepat Otomatis: perkiraan dampak dalam hitungan jam |
| F4 | Jitupasna ke R3P Digital |
| F5 | Renkon Hidup dan Gladi |
| F6 | Risiko Masa Depan dan Tata Ruang |
| F7 | Pintu Tunggal: satu pintu per fase dan per peran |
| SK-NNN | kode tiket kerja; `UJ-*` kode uji di `RENCANA-UJI.md`; `INV-*` invarian lintas fitur |

## Data dan identitas

| Istilah | Arti |
| --- | --- |
| `KJ-` | ID kejadian: `KJ-<tahun>-<8 Crockford base32>` (panjang 16) dari SHA-256 kunci pendiri; tabrakan: hash ulang `kunci\|n`; tidak pernah dipakai ulang |
| Alias | pasangan (ID lama, ID penyintas) hasil gabung kejadian; ID lama (fase `digabung`, kolom `ke`) tetap terbuka; tidak ada pecah, salah gabung dibetulkan lewat koreksi manual |
| Pendiri | rekaman pertama yang membentuk `KJ-` |
| Penyintas | `KJ-` yang bertahan setelah gabung (tanggal mulai paling awal) |
| `K####` | kode kluster karhutla yang diberi ulang tiap hari, bukan kunci |
| Kunci wilayah | kode Kemendagri 4 digit (kab4, sama dengan IRBI dan `scripts/udara/kota.json`; BUKAN BPS, yang berbeda di 164 kabupaten) tunggal; jembatan lewat nama dan provinsi: `kab_kunci` dan `hvc_dasar.kab_kode`; `id_kab_bps` DIBI tidak pernah dipakai sebagai kode |
| Pemasangan | mencocokkan rekaman sumber ke `KJ-`: satu cocok menambah, nol membuat baru, lebih dari satu masuk antrean |
| Ambigu | rekaman dengan lebih dari satu kandidat; tidak ditebak, diputus staf |
| Jendela hari | selisih hari paling besar untuk pemasangan, 3 hari |
| Arsip | kejadian lama (DIBI dan Logbook sekitar 113 ribu baris) di R2, dipromosikan ke D1 saat dibutuhkan |
| Promosi | menyalin satu baris arsip R2 ke D1 dengan ID sama, dari body `{tahun, kab4}`; baris tanpa wilayah tidak bisa dipromosikan |
| Sumber | asal angka: DIBI, Logbook Pusdalops, sistem kita; ditampilkan berdampingan, tidak dijumlah |
| Selisih | maks dikurangi min antarsumber untuk satu metrik; bukan total |
| Registri sumber | `scripts/siklus/sumber.json`: pemilik, lisensi, jadwal, pemakai tiap sumber |
| Mentah, bersih, saji | tiga lapis R2: salinan apa adanya, dinormalkan, agregat siap layar |
| Sidik | SHA-256 isi berkas (JSON kanonik) untuk melewati unggah yang tak berubah |
| Anggaran | batas ukuran per lapis; awalan `siklus/` paling besar 4 GB |
| Lab | tahap baca data raksasa di tempat dengan DuckDB; hanya agregat disimpan |

## Label keyakinan (KA 8)

| Label | Arti |
| --- | --- |
| `resmi` | angka dari dokumen atau sumber resmi |
| `terverifikasi` | sudah diperiksa staf atau sumber terpercaya |
| `estimasi-model` | keluaran model, selalu rentang dan bisa meleset |
| `asumsi-kebijakan` | nilai yang dipilih program karena sumbernya belum ada |
| `hipotesis` | dugaan yang belum lolos uji historis |
| `menunggu` | data atau parameter belum tersedia; tampil "menunggu", bukan 0 |

## Kebencanaan dan peraturan

| Istilah | Arti |
| --- | --- |
| BNPB, BPBD | kita; tidak ditulis mitra strategis |
| DIBI | Data Informasi Bencana Indonesia |
| Pusdalops, Koordalops | pusat pengendali operasi; koordinator operasi |
| Jitupasna | pengkajian kebutuhan pascabencana, Perka 15/2011 |
| PDNA | penilaian kebutuhan pascabencana; tenggat BNPB dua minggu, BPBD satu minggu sebelum darurat berakhir |
| R3P | rencana rehabilitasi dan rekonstruksi pascabencana, Perban 5/2017; batas 90 hari sejak tanggap darurat |
| RB, RS, RR | rusak berat (lebih dari 70 persen), sedang (30 sampai 70), ringan (kurang dari 30) |
| Kerusakan, kerugian | nilai aset rusak; arus ekonomi yang hilang selama pemulihan |
| Stimulan | bantuan perbaikan rumah; tarif `asumsi-kebijakan` sampai U8 diputus |
| DTH | dana tunggu hunian |
| HSBGN, IKK, IHPB | harga satuan bangunan gedung negara; indeks kemahalan konstruksi; indeks harga perdagangan besar |
| Renkon | rencana kontinjensi, Perban 2/2023; berlaku 3 tahun |
| Gladi | latihan: ruang, posko, lapang, Juklak 4/2026 |
| Perka 7/2008 | standar kebutuhan dasar: 3 m2, 2.100 kkal, 0,4 kg beras per orang |
| Sphere | standar kemanusiaan pembanding (3,5 m2); `hipotesis` |
| LogPal | inventori logistik dan peralatan `/logpal` |
| MMI | skala intensitas guncangan |
| PAGER, ITB | model korban gempa global dan Indonesia; tampil berdampingan |
| ShakeMap | peta guncangan USGS |
| JRC | kurva kerusakan banjir menurut kedalaman |
| InaRISK | portal risiko BNPB; kelas bahaya rendah, sedang, tinggi |
| KRB | kawasan rawan bencana gunung api |
| ETCCDI | indeks iklim ekstrem: Rx1day, Rx5day, CDD |
| NEX-GDDP-CMIP6, CHIRPS | proyeksi iklim; curah hujan historis |
| SSP | skenario jalur sosial ekonomi (ssp245, ssp585) |
| GHSL | peta terbangun dan penduduk global; epoch 2025 dan 2030 hasil model |
| ODbL | lisensi basis data OSM dan Overture; atribusi dan share-alike |

## Peran dan teknis

| Istilah | Arti |
| --- | --- |
| WG, BP, PD, KO, PM, SA | tamu; akun instansi BPBD; pusdalops; koordalops; pimpinan; Super Admin |
| SIS | pipeline ber-Bearer `PIPA_TOKEN` (token pipeline yang sudah ada) |
| Tanda setuju internal | persetujuan PM di sistem; tidak menggantikan dokumen resmi |
| Dummy | data uji berkolom `dummy = 1`, tombol dua ikon, SA saja |
| `run_worker_first` | pengaturan aset Cloudflare agar JS dan CSS `/siklus/*` lewat Worker dan butuh sesi |
| `layaniSk` | pintu tunggal Worker untuk `/siklus`, `/api/siklus/*`, `/api/instansi/siklus/*` |
| Kartu standar | `.ex.ex-std` dari `public/inti/kartu.css`, tanpa kaki sumber |
| Paritas | hasil Python dan JS sama pada `acuan.json` |
| ADR | catatan keputusan teknis di `DESAIN-TEKNIS.md` |
| U1 sampai U20, UA-1 sampai UA-6 | pertanyaan terbuka untuk pemilik (KA bagian H, ALG 10) |
