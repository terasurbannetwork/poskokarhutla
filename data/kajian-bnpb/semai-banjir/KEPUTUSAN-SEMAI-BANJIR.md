# KEPUTUSAN-SEMAI-BANJIR: Semai Redistribusi Banjir dan Penguji Efektivitas (`/operasi`, seksi Peluang semai, mode Banjir)

Dokumen ini menang atas semua dokumen lain di folder ini. Untuk hal yang juga diatur paket induk
`data/kajian-bnpb/semai-awan/KEPUTUSAN-SEMAI.md` (S1 sampai S11, D1 sampai D10, prinsip 1 sampai 7) dan
`data/kajian-bnpb/operasi-udara/KEPUTUSAN-UDARA.md`, keputusan di sana tetap berlaku kecuali ditimpa di sini dengan tanggal.
Mode karhutla tidak boleh berubah perilakunya karena paket ini (uji golden, RENCANA-UJI §2).

Pertanyaan yang belum dijawab pemilik ditulis sebagai **Q**, dengan bawaan sementara bertanda **[SEMENTARA]**. Bawaan sementara
boleh dipakai untuk membangun; angka yang bergantung padanya tampil berlabel "hipotesis" sampai Q dijawab.

## Asal

Pemilik, 25 Nov 2026, minta seksi Peluang semai juga melayani OMC untuk mitigasi banjir: awan hujan dibuat menurunkan hujannya di
hulu angin atau di laut **sebelum** sampai ke kab/kota rawan banjir (praktik BMKG, mis. OMC Jabodetabek), kebalikan tujuan OMC
karhutla yang ingin hujan jatuh **di** area api. Ditambah penguji efektivitas yang dihitung sistem sendiri.

## Keputusan pemilik

| No | Tanggal | Keputusan | Kalimat atau pilihan pemilik |
| -- | ------- | --------- | ---------------------------- |
| K1 | 25 Nov 2026 | Seksi Peluang semai di `/operasi` mendapat saklar tujuan **Karhutla / Banjir**. Satu mesin (`scripts/operasi/semai.py` diperluas dengan parameter tujuan), satu halaman renlap `/renlap-omc` (zona membawa tujuannya). Tidak ada layar baru, tidak ada salinan mesin `semai_banjir.py`. | "Mode di Peluang semai" |
| K2 | 25 Nov 2026 | Sasaran kab/kota diusulkan otomatis dari prakiraan banjir kita (`/prediksi`, tenggang 24 sampai 48 jam) dan pernyataan BMKG hujan lebat; Pusdalops boleh menambah sasaran sendiri (mis. Jabodetabek). | "Otomatis + pilih manual" |
| K3 | 25 Nov 2026 | Penguji efektivitas tidak bergantung pada form sortie manual. Catatan perlakuan hanya dari yang sudah dimiliki sistem: baris `op_semai_target` (zona yang dijadikan target renlap oleh Pusdalops, bertanggal dan bertujuan) dan halaman resmi OMC BMKG (`public/udara/data/omc_bmkg.json`: periode, jenis kegiatan, provinsi; tanpa sortie dan kg). Penguji bekerja jujur di tingkat itu (provinsi-hari dan sasaran-hari) dan menulis apa yang tidak bisa dijawabnya. | "Lu yang hitung sendiri gimana dia efektivitasnya" |
| K4 | 25 Nov 2026 | Paket dokumen dulu (AGENTS §3.7); kode sesudah pemilik meninjau paket ini. | aturan AGENTS §3.7 |
| K5 | 27 Nov 2026 | Kuota zona per provinsi ber-OMC aktif. Provinsi yang punya baris OMC resmi `Pengurangan CH - Bencana` aktif hari `d` di `public/udara/data/omc_bmkg.json` (`aktif_hari_ini`) mendapat sampai 3 zona untuk sasaran di provinsi itu, di luar 5 zona nasional yang sudah ada. Pemicu: peta 27 Nov hanya menampilkan 5 zona di Kalimantan dan Jawa, padahal OMC banjir berjalan di Aceh dan 30-an kab Aceh, Sumut, Sumbar, dan Riau sudah masuk sasaran. | "Kuota per provinsi OMC aktif" |
| K6 | 27 Nov 2026 | Sasaran baru asal `kejadian`: kab/kota dengan kejadian banjir atau banjir bandang berstatus berjalan di laporan harian (`public/data/alun/kabar.json`) masuk `S(d)` dan didahulukan saat memilih zona. | "Sasaran dari kejadian banjir aktif" |
| K7 | 27 Nov 2026 | Base rute zona di provinsi ber-OMC berangkat dari posko OMC yang tercatat di laporan OMC posko (mis. Bandar Udara Sultan Iskandar Muda, Lanud Soewondo), bukan bandara terdekat. Tanpa catatan posko, bawaan tetap bandara terdekat. | "Base dari posko OMC" |
| K8 | 27 Nov 2026 | Laporan OMC posko (armada, sorti, jam mesin hidup dan mati, wilayah semai, ketinggian, bahan dan kg) yang dikirim lewat WA diurai bot dan disimpan sistem sebagai catatan perlakuan. Ini melonggarkan K3: form sortie manual tetap tidak ada, tetapi pesan laporan resmi yang sudah beredar boleh dibaca. Nama orang di pesan tidak disimpan. | "Ya, lewat bot WA" |

## Keputusan rancangan (dibuat penyusun paket dari riset dan kode repo, boleh dibatalkan pemilik)

| No | Keputusan | Alasan (bukti) |
| -- | --------- | -------------- |
| D1 | Nama parameter baru `tujuan` (`karhutla` atau `banjir`), **bukan** `mode`. | `semai.py`, `semai_murni.py`, dan `semai.json` sudah memakai `mode` untuk `bawaan` lawan `nimbus` (cara skor). Dua sumbu yang sama namanya akan tertukar di kode dan di Tinjau BMKG. |
| D2 | Satu unduhan IFS dan satu workflow `semai.yml`: `semai.py` dijalankan dua kali atas `data/raw/semai/<putaran>` yang sama (`--tujuan karhutla`, lalu `--tujuan banjir`). Keluaran banjir berkas sendiri `operasi/semai/semai_banjir.json`; `semai.json` karhutla tidak disentuh. | Unduhan 840 MB per putaran tidak digandakan. Berkas karhutla yang tidak berubah membuat uji golden cukup membandingkan byte (selain `dibuat`). |
| D3 | Gerbang awan G1 sampai G9 dan faktor Q dipakai ulang tanpa diubah nilainya; faktor D (hanyut ke api) diganti **H, lepas sebelum sasaran**, dan faktor T (jarak kota) diganti **P, paparan zona**. Skor tetap rerata geometris berbobot (D4 induk). Mode skor `nimbus` tidak berlaku untuk tujuan banjir (Nimbus tidak punya tujuan banjir). | Awan yang layak disemai sama untuk dua tujuan; yang berbeda adalah ke mana hujannya diinginkan jatuh. |
| D4 | Zona hanya di hulu angin sasaran, menurut lintasan mundur dari `scripts/udara/lintasan.py` (fungsi `angin_di`, `geser` dengan angin dibalik), 30 sampai 150 km dari tepi sasaran, dengan tenggang tiba ke sasaran 1 sampai 4 jam. Tidak ada mesin angin kedua. | D6 induk: mesin lintasan satu. Angin pengarah 850 sampai 700 hPa sama dengan karhutla. |
| D5 | Sel zona dan titik hujannya tidak boleh berada di daratan kab sasaran atau kab yang sendiri berpeluang banjir di hari yang sama (aturan "jangan memindah banjir ke tetangga"); laut dan daratan berpaparan rendah didahulukan. | Tujuan mitigasi gagal bila hujan dipindah ke kab rawan lain. |
| D6 | Zona banjir berkode `<putaran>-B<huruf>` (mis. `2026112500-BA`). Rute target menerima `^\d{10}-B?[A-E]$`; awalan `B` membaca arsip `arsip/<putaran>_banjir.json`. Tujuan target diturunkan dari `zona_id`, jadi `op_semai_target` (migrasi 0129) tidak diubah. | Tanpa `ALTER TABLE` di D1 (tidak idempoten); baris lama tetap sah. Kab sasaran disimpan di `alasan_json` yang sudah diambil server dari arsip. |
| D7 | Sasaran manual Pusdalops disimpan di tabel baru `op_semai_sasaran` (migrasi baru, nomor diperiksa saat tiket), dibaca pipeline putaran berikutnya. Sasaran yang sudah ada di `kandidat_sasaran` putaran itu langsung dihitung di peramban. | K2. Ini jalur auth baru: `scripts/omc/nilai.py` membaca `/api/omc/sortie` yang publik (`src/omc.js`), jadi belum ada pola token pipeline di repo. `SEMAI_TOKEN` dirinci di DESAIN-TEKNIS §4.1 dan diperiksa `security-reviewer`. |
| D8 | Penguji efektivitas dua lapis: **Lapis A retrospektif** provinsi-hari dari `omc_bmkg.json` jenis `Pengurangan CH - Bencana` (104 baris berjenis persis `Pengurangan CH - Bencana` (jenis `Pengurangan CH - Acara` dan `- Infrastruktur`, masing-masing 5 baris, tidak dihitung); 103 baris bertanggal sah memberi 888 provinsi-hari unik di 14 provinsi; DKI, Jabar, Banten 319 provinsi-hari; per tahun 2023: 8, 2024: 13, 2025: 48, 2026: 35 baris. Satu baris Jawa Timur (BRIN, NaCl) bertanggal terbalik "1 Januari 2024 - 15 Januari 2023": tidak dijadikan perlakuan, dan Jawa Timur 1 sampai 15 Jan 2023 serta 1 sampai 15 Jan 2024 dibuang dari panel (status perlakuan tak diketahui, aturan 25 Okt PRAREG karhutla). Dihitung ulang 25 Nov 2026), dan **Lapis B prospektif** sasaran-hari dari `op_semai_target` bertujuan banjir. Estimator TWFE dengan kovariat prakiraan IFS dan uji permutasi, pola `scripts/omc/efek.py`. Vonis memakai empat kategori `scripts/omc/nilai.py`. | K3. Desain dan penulisan yang sama dengan uji karhutla Okt 2026 (`data/laporan-bnpb/omc/riset/PRAREG-EFEK-OMC.md`), yang sudah lolos plasebo ruang (galat tipe I 6,7%). |
| D9 | Hasil penguji hanya untuk staf (kartu Rapor di seksi, bukan `public/`) dan selalu berbunyi "kesesuaian, bukan sebab-akibat". | Seleksi: OMC banjir digelar justru saat hujan lebat diprakirakan; tanpa randomisasi sebab tidak bisa dipisahkan dari seleksi. |
| D11 | Kovariat IFS Lapis A dari Open-Meteo historical-forecast `ecmwf_ifs025` hanya tersedia sejak 3 Feb 2024 (diperiksa 25 Nov 2026 di titik Jakarta: 1 Feb 2024 kosong, 3 Feb 2024 berisi; 2022 dan 2023 kosong). Provinsi-hari sebelum itu dibuang: tersisa 795 provinsi-hari, 86 provinsi-periode, 13 provinsi, 325 hari kalender. Seluruh baris 2023 hilang. | Kovariat wajib di spesifikasi primer; tanpa IFS tidak ada kontrafaktual yang sebanding. Cakupan dikunci di RENCANA-UJI §6.2. |
| D10 | Kalimat baku tujuan banjir: "awan layak semai di hulu sasaran", "hujan dilepas sebelum sasaran (usulan)", "konfirmasi BMKG". Terlarang: "mencegah banjir", "aman", "akan hujan", "hujan berkurang x%", "memindah banjir". | BMKG sendiri menyebut OMC "langkah mitigasi, bukan solusi banjir" (RISET §1). D8 induk. |

## Prinsip yang mengikat semua tiket

1. Semua prinsip induk (`KEPUTUSAN-SEMAI.md` 1 sampai 7) berlaku: tanpa data dummy, usulan bukan perintah, tiap angka bersumber,
   satu sumber per angka, klik tidak membekukan layar, selera Operasi Udara, koordinat penuh hanya di balik sesi.
2. **Karhutla tidak mundur.** Tiap tiket yang menyentuh berkas bersama membuktikan `semai.json` karhutla sama dengan rujukan beku.
3. **Prakiraan banjir kita belum teruji.** Rapor `/prediksi` untuk kode `BNJ` masih "belum teruji" (24 Nov 2026); sasaran otomatis
   berlabel "usulan dari prakiraan yang belum teruji" sampai rapornya berubah.
4. **Tidak memindah banjir.** Zona yang daratannya kab berpeluang banjir hari itu dibuang, bukan diturunkan skornya.
5. **Penguji tidak mengubah aturan sesudah melihat hasil.** Kriteria vonis dikunci di `RENCANA-UJI.md` §6 dan disidik sebelum data hasil
   ditarik; penyimpangan ditulis bertanggal.

## Pertanyaan terbuka untuk pemilik

| Q | Pertanyaan | Bawaan sementara |
| - | ---------- | ---------------- |
| Q1 | Produk hujan untuk penguji: CHIRPS harian (tanpa akun, sudah dipakai `efek.py`), IMERG Late harian (`scripts/cuaca/imerg.py`, butuh `EARTHDATA_TOKEN`, arsip repo hanya menyimpan kab dengan maks >= 10 mm), atau GSMaP jam-an (butuh akun JAXA)? | [SEMENTARA] CHIRPS harian primer untuk Lapis A dan B; IMERG Late sekunder bila token ada; GSMaP tidak dipakai sampai akun ada |
| Q2 | Tenggang sasaran otomatis: 24 jam saja, atau 24 sampai 48 jam? Putaran IFS semai hanya sampai langkah 36. | [SEMENTARA] sasaran dari tenggang 1 dan 2 `/prediksi`; zona hanya dihitung untuk hari yang tercakup langkah putaran, sasaran tenggang 2 tampil "pantau, zona di putaran berikutnya" |
| Q3 | Jarak zona ke tepi sasaran: 30 sampai 150 km? | [SEMENTARA] 30 sampai 150 km, tenggang tiba 1 sampai 4 jam pada angin pengarah |
| Q4 | Hasil penguji boleh tampil di luar staf (publik, Laporan Berkala, pimpinan)? | [SEMENTARA] tidak; kartu Rapor di seksi untuk pembaca `/operasi` saja |
| Q5 | Sasaran di luar Jabodetabek boleh diusulkan otomatis? | [SEMENTARA] ya, semua kab/kota yang lolos aturan sasaran; Jabodetabek (13 kab/kota daratan, tanpa Kepulauan Seribu) ada di daftar tetap `sasaran_tetap` |
| Q6 | Ambang sasaran otomatis dari `/prediksi`. | [SEMENTARA] `BNJ` level >= 2 atau `waspada` beraturan `banjir` pada tenggang 1 atau 2, atau `HJN` p50 (peluang >= 50 mm) >= 0,3; ditambah prakiraan harian BMKG per kab (`public/banjir/data/cuaca_bmkg_kab10.json`) berkondisi `Hujan Lebat` atau `Hujan Petir` pada hari sasaran |
| Q7 | Kab mana yang dianggap "rawan banjir" untuk aturan jangan memindah (D5): hanya yang berpeluang banjir hari itu, atau juga kab dengan riwayat banjir tinggi (DIBI)? | [SEMENTARA] hanya yang hari itu lolos aturan sasaran Q6; riwayat DIBI menjadi tanda "riwayat banjir" tanpa membuang zona |
| Q8 | Satuan perlakuan Lapis A: seluruh provinsi selama periode BMKG, atau hanya kab yang ada di daftar sasaran kita hari itu? | [SEMENTARA] seluruh provinsi (itu yang ditulis sumber); kab-hari tidak diklaim |
| Q9 | Bahan: NaCl saja, atau juga CaO? Pemberitaan OMC Jabodetabek menyebut NaCl dan CaO. | [SEMENTARA] layar menulis "bahan dari BMKG" tanpa usulan mesin; aturan bahan karhutla (dry ice saat inversi berasap) tidak berlaku di tujuan banjir |
| Q10 | OMC banjir BMKG berjalan 24 jam (posko Halim, Jul 2025). Jendela terbang 07.00 sampai 16.00 (G9 induk) tetap? | [SEMENTARA] tetap 07.00 sampai 16.00; operasi malam di luar paket ini |
| Q11 | Bolehkah Pusdalops menandai satu hari "sengaja tidak disemai" walau layak, supaya penguji punya pembanding acak (RISET §4)? Ini keputusan kebijakan. | [SEMENTARA] tidak; penguji tetap observasional |
| Q12 | Siapa boleh menambah sasaran manual? | [SEMENTARA] sama dengan S7 induk: `pusdalops`, `tmc`, moderator `ADMIN_TOKEN` |
