# Glosarium EN / ID — Centurisk97

Satu istilah, satu padanan, di semua tab, PDF, dan gambar bagikan. Kamus: `public/i18n/en.json`.
Menambah entri: jalankan `node scripts/i18n/kumpul.mjs --dump`, lihat `scripts/i18n/laporan.json` → `hilang` (kunci kamus yang belum ada),
`en_berisi_id` (EN masih memuat kata Indonesia), `id_berisi_en` (ID memuat kata Inggris) dan `campur` (satu kalimat dua bahasa), lalu tulis
padanan memakai glosarium ini. `node scripts/i18n/skor.mjs keluaran.json --contoh 50` menilai ulang hasil `--dump` tanpa crawl ulang;
pengelompok katanya di `scripts/i18n/kelas.mjs`. Sasaran: kebocoran tiap arah ≤ 1% teks terlihat per tab (nama diri tidak dihitung).
Angka di kunci ditulis `{0}`, `{1}`, … (penerjemah mengganti angka otomatis), jadi satu entri melayani semua nilai.

## Istilah inti

| Indonesia | English | Catatan |
|---|---|---|
| karhutla (kebakaran hutan dan lahan) | forest and land fires | judul/lead; "fire" cukup bila konteks jelas |
| titik panas | hotspot | jamak: hotspots; jangan "hot spot" |
| kompleks api / kompleks kebakaran | fire complex | jamak: fire complexes |
| posko | command post | "Posko (Ajuan)" = Command posts (proposed) |
| Daops (Manggala Agni) | Daops (Manggala Agni operations base) | nama tetap; uraian sekali di Metode |
| Manggala Agni | Manggala Agni | nama lembaga, jangan diterjemahkan |
| MPA (Masyarakat Peduli Api) | MPA (community fire brigade) | |
| gambut / lahan gambut | peat / peatland | |
| kawasan hutan | forest estate | |
| konsesi (sawit, HTI, HPH, tambang) | concession (oil palm, HTI, HPH, mining) | singkatan HTI/HPH dipakai di kedua bahasa |
| sawit / konsesi sawit | oil palm / oil palm concession | jangan "palm oil" untuk lahan; jangan campur "Konsesi oil palm" |
| HTI (hutan tanaman industri) | HTI (industrial timber plantation) | bukan "kayu pulp" / "pulpwood" / "wood pulp" |
| HPH (hutan alam) | HPH (natural-forest logging concession) | PBPH = nama izin baru, tetap |
| areal konsesi / di luar areal konsesi | concession area / outside concession areas | |
| status lahan titik panas | hotspot land status | nama perusahaan TIDAK ditampilkan |
| Hari ini / Kemarin / Tanggal lain (pemilih hari titik panas) | Today / Yesterday / Other date | satu hari kalender WIB per pilihan, tidak ada jendela 72 jam atau 7 hari; "Rentang tren" = Trend range (jendela tren, bukan penyaring titik) |
| regu | crew | |
| personel | personnel | |
| pemadaman | suppression | pemadaman awal = initial attack |
| mop-up / pendinginan | mop-up | |
| sekat bakar | firebreak | |
| water bombing | water bombing | |
| patroli | patrol | |
| ground-check | ground-check | |
| sebaran / penjalaran api | fire spread | |
| simulasi | simulation | |
| wilayah kerja | area of operations | |
| kabupaten / kota | regency / city | kab. = regency |
| kecamatan | district | |
| provinsi | province | |
| desa | village | |
| BNPB / BPBD | BNPB / BPBD | nama lembaga; BPBD = regional disaster agency bila perlu diuraikan |
| BMKG | BMKG | |
| status siaga darurat (status hukum) | emergency alert status | penetapan kepala daerah; "saat siaga" = during the alert status |
| pos siaga | standby post | siagakan = put on standby |
| Dana Siap Pakai (DSP) BNPB | BNPB on-call funds | bukan "ready-use funds" |
| dasbor (Ringkasan) | dashboard | label menu "Dashboard" & "Insight" = nama bagian pilihan pemilik, tetap di kedua bahasa |
| tanggap darurat | emergency response | |

## Tingkat status (urutan naik)

| Indonesia | English |
|---|---|
| Normal / Pantau | Normal / Monitor |
| Waspada | Alert |
| Siaga | Watch |
| Awas | Warning |
| Prioritas | Priority |

Tingkat dipakai seperti di peringatan bencana: Alert < Watch < Warning (level 2–4 BNPB). Jangan dicampur dengan "high/low".
Tingkat kompleks api: Prioritas = Priority, Siaga = Watch ("kompleks siaga" = Watch-level fire complexes), Patroli = Patrol, Pencegahan = Prevention.
Siaga sebagai TINGKAT selalu Watch; "siaga" sebagai status hukum (siaga darurat) = emergency alert. Musim/periode siaga = watch period.

## Cuaca & bahaya

| Indonesia | English |
|---|---|
| FWI (Fire Weather Index) | FWI — tetap |
| FFMC, DMC, DC, ISI, BUI | tetap |
| bahaya cuaca kebakaran | fire weather danger |
| Rendah / Sedang / Tinggi / Sangat tinggi | Low / Moderate / High / Very high |
| kelembapan | humidity |
| curah hujan | rainfall |
| angin | wind |
| asap / kualitas udara | smoke / air quality |
| ISPU | ISPU (air pollution index) |
| musim kemarau | dry season |
| El Niño | El Niño |

## Data & satuan

| Indonesia | English |
|---|---|
| rb (ribu) | k (angka) / thousand (rupiah) |
| jt (juta) | M / million |
| M (miliar, rupiah) | billion |
| T (triliun, rupiah) | trillion |
| Rp 1,2 T | IDR 1.2 trillion |
| ha | ha |
| WIB | WIB (UTC+7) — tetap "WIB" |
| piksel | pixel |
| keyakinan (FIRMS) | confidence |
| pembaruan / diperbarui | update / updated |

## Banjir

| Indonesia | English |
|---|---|
| banjir | flood |
| longsor | landslide |
| rob | coastal (tidal) flooding |
| debit sungai | river discharge |
| prakiraan | forecast |
| wilayah siaga | areas on alert |
| sarana | facilities |
| keputusan | decisions |

## Gaya

- Kalimat pendek, kata kerja aktif, sentence case untuk judul ("Hotspots by province", bukan "Hotspots By Province").
- Angka dan tanggal diformat otomatis (ID: 1.234,5 · 14 Okt 21.20 WIB; EN en-GB: 1,234.5 · 14 Oct 21:20 WIB). Desimal yang diketik di teks
  sumber ("1,5 km") diubah ke "1.5 km" saat EN; ribuan ketikan ("2.156") belum — tulis angka lewat fmt(), jangan diketik.
- Nama bulan/hari mengikuti bahasa: Okt/Agu/Des/Mei ↔ Oct/Aug/Dec/May; "Agu awal/tengah/akhir" ↔ "Early/Mid/Late Aug".
- Nama provinsi dalam kalimat EN memakai nama Inggris (Central Kalimantan, South Papua); nama kabupaten/kecamatan/desa tetap.
- Kontrol peta MapLibre ditulis Indonesia (Perbesar, Perkecil, Peta) dan diterjemahkan kamus saat EN.
- Teks yang dipotong (…) diterjemahkan dulu baru dipotong; kalimat bagikan dirakit dari bagian yang masing-masing lewat T().
- Judul berita, isi laporan warga, nama tempat, nama perusahaan, isi pesan, rumus (`.rumus`), judul publikasi dan jabatan tim TIDAK diterjemahkan.
- ID: pakai padanan baku (dasbor, wawasan, prakiraan, area terbakar); istilah teknis Inggris hanya sebagai keterangan dalam kurung.

## Cari, Banding, Timelapse, lapisan ubin (18 Okt 2026)

| Indonesia | English | Catatan |
|---|---|---|
| pabrik sawit | oil palm mill | kapasitas "ton TBS/jam" = t FFB/hour (TBS = tandan buah segar = fresh fruit bunches) |
| buffer / radius | buffer / radius | kartu pabrik: 10/25/50 km |
| Hapus buffer | Clear buffer | |
| Banding (peta dibelah dua) | Compare | geser pembatas; "Tutup banding" = Close comparison |
| Timelapse citra harian | Daily imagery timelapse | GIF; SWIR (api aktif) = SWIR (active fire); Warna asli = True colour |
| hutan hilang s.d. tahun | forest loss up to year | kumulatif sejak 2001; "akibat api/kebakaran" = from fires |
| Hutan tanaman & kebun (semua jenis) | Planted forests & plantations (all types) | SDPT v2 (WRI/GFW): ubin tidak membedakan jenis |
| Kemenhut | Ministry of Forestry | "Penutupan lahan Kemenhut" = Land cover, Ministry of Forestry |
| hutan produksi terbatas / konversi | limited / convertible production forest | |
| hutan primer / sekunder | primary / secondary forest | |
| semak/belukar | shrubland | |
| sawah | rice paddy | |
| latar (laporan) | baseline | "Percepatan api 2 hari" = 2-day fire acceleration |

## Peta provinsi interaktif (/laporan, 21 Okt 2026)

| Indonesia | English | Catatan |
|---|---|---|
| Hotspot (titik) | Hotspots (count) | ukuran 1 di peta; sama dengan "titik panas" |
| Luas terbakar (ha) | Burned area (ha) | ukuran 2; perkiraan, ditulis dengan ± |
| Belum padam (ha) | Not extinguished (ha) | ukuran 3; persediaan pada hari terakhir periode ("per <tanggal>" = "as of <date>"), tidak pernah dijumlah |
| Hari / Minggu / Bulan / Rentang / 12 Bulan | Day / Week / Month / Range / 12 months | jenis periode; 12 Bulan = satu tahun kalender |
| pada / selama / sepanjang <periode> | on / during / throughout <period> | hari / minggu-bulan-rentang / tahun |
| Data satelit tidak lengkap pada ... | Satellite data incomplete on ... | catatan hari "celah" (mis. lintasan S-NPP hilang) |
| Luas terbakar / Belum padam (perkiraan satelit) | Burned area / Not extinguished (satellite estimate) | luas dan belum padam adalah hitungan dari deteksi, bukan cek regu darat; "Jumlah luas harian" = Sum of daily burned area (periode > 1 hari, area sama bisa terhitung berulang) |
| Tanpa deteksi; deteksi satelit yang bertahan | No detections; persisting satellite detections | tiadanya deteksi bukan bukti padam; jangan tulis "tidak ada api" |
| naik / turun dari hari (periode) sebelumnya | up / down from the previous day (period) | legenda warna oranye / biru seperti slide deck BNPB |
| Perubahan tidak ditampilkan: data satelit ... tidak lengkap | Change not shown: satellite data ... is incomplete | lencana perubahan disembunyikan bila periode atau pembandingnya memuat hari celah |
| 1–20 Okt 2026; 1 Jan – 20 Okt 2026 | 1–20 Oct 2026; 1 Jan – 20 Oct 2026 | bulan/tahun yang belum tercakup penuh diberi nama rentang tercakup, bukan "Oktober 2026" / "2026" |

## Overlay kabupaten di peta utama (index.html, 22 Okt 2026)

| Indonesia | English | Catatan |
|---|---|---|
| Luas terbakar / Belum padam (ubin Overlay) | Burned area / Not extinguished | grup "Api & respons"; nama lengkap di tooltip ubin: "... per kabupaten (perkiraan satelit)" = "... by regency (satellite estimate)" |
| Perkiraan satelit, bukan luas resmi. | Satellite estimate, not the official area. | kaki popup kabupaten; legenda: "Perkiraan satelit · selama 1–20 Okt 2026" |

## Kartu "Satelit berikutnya" (panel wilayah karhutla, 27 Okt 2026)

| Indonesia | English | Catatan |
|---|---|---|
| Satelit berikutnya di <wilayah> | Next satellite over <area> | kartu di panel provinsi/kabupaten; nama wilayah dan satelit translate=no |
| <Satelit> lewat <jam> WIB, data biasanya siap <jam> WIB. | <Satellite> passes <time> WIB, data usually ready <time> WIB. | lewat pola di en.json; jam WIB "00.20", penanda hari "besok"/"lusa" = tomorrow / day after tomorrow |
| Lewat (WIB) / Satelit / Cakupan / Data siap (WIB) | Pass (WIB) / Satellite / Coverage / Data ready (WIB) | kepala tabel 5 lintasan; satu istilah "Data siap" = "Data ready" di seluruh kartu (bukan "data masuk"/"data ada"); "Lewat" jam satelit paling dekat ke tengah kotak batas wilayah |
| seluruh / sebagian (cakupan) | entire / partial | seluruh = semua simpul batas wilayah di dalam jalur sapuan; sebagian = hanya sebagian wilayah tersapu (lintasan tanpa satu pun simpul di jalur tidak ditampilkan) |
| jeda aman VIIRS 3 jam | safe delay VIIRS 3 h | jeda dibaca dari data/tle.json, tanpa "±"; pola "VIIRS\|MODIS N jam" -> "N h"; kaki: "(diukur 27 Okt 2026); bisa lebih lama bila satelit telat." |
| waktu sampai data tampil di aplikasi, median 14 hari terakhir (14 Okt sampai 27 Okt 2026; aplikasi mengambil data tiap 3 jam): VIIRS 3,5 jam, MODIS 2,5 jam. Bisa lebih lama bila satelit telat. | time until data appears in the app, median of the last 14 days (14 Oct until 27 Oct 2026; the app fetches data every 3 h): VIIRS 3.5 h, MODIS 2.5 h. May take longer if a satellite is late. | kaki kartu dan popover bila jeda_sumber = terukur (tle.json, median riwayat di Worker): angkanya waktu sampai data TAMPIL DI APLIKASI (latensi FIRMS + tunggu putaran ambil ±3 jam), BUKAN latensi satelit atau "jeda data"; "jeda aman" = nilai bawaan (latensi FIRMS, diukur 27 Okt 2026), besaran lain. Contoh memakai tanggal lampau (bukan tanggal depan); hari dari jeda.hari ("median {N} hari terakhir"; tak sah: "median riwayat terakhir" = median of recent records), rentang dari jeda.dari/sampai ("sampai" = until seperti rentang epoch; dibuang bila tak sah atau lebih dari 1 hari sesudah hari ini). Satu sensor dengan dua satelit beda nilai: "VIIRS 3,2 sampai 3,4 jam" = "VIIRS 3.2 to 3.4 h" (pola); rentang Terra/Aqua hanya teoretis (berbagi kode M, nilainya sama). Satu sensor bercampur (NOAA-20 terukur, NOAA-21 bawaan): per satelit, "NOAA-20 3,5 jam" dan "Jeda aman NOAA-21 3 jam", bukan dua kalimat "VIIRS". Campuran: kalimat terukur, lalu "Jeda aman MODIS 2 jam (diukur 27 Okt 2026); bisa lebih lama bila satelit telat." Klausa "(diukur <tgl>)" dari jeda.bawaan_diukur lewat pola bulan-bebas = "(measured <date>); may take longer if a satellite is late."; tak sah: dibuang ("Jeda aman MODIS 2 jam. Bisa lebih lama bila satelit telat."); tanggal 27 Okt 2026 hanya untuk tle.json lama tanpa blok jeda. |
| (jam lewat + jeda aman) / (jam lewat + median) / (jam lewat + jeda tiap satelit, lihat keterangan di bawah) | (pass time + safe delay) / (pass time + median) / (pass time + delay of each satellite, see the note below) | tooltip kolom "Data siap": "jeda aman" bila tak ada yang terukur (kalimat lama), "Perkiraan data tampil di aplikasi (jam lewat + median)" = Estimated time the data appears in the app (pass time + median) bila semua terukur, per satelit bila campuran. Kalimat utama kartu "data biasanya siap HH.MM WIB" TIDAK berubah. Legenda "Menunggu masuk": "jeda aman belum lewat" bila bawaan; terukur dan campuran "batas tunggu belum lewat, atau data FIRMS belum diambil lagi sesudah batas itu" = the wait limit has not yet passed (batas tunggu = lintasan + p90 bila ada, kalau tidak jeda aman; bukan median) |

## Hotspot mundur (panel Real Time, indikator Hotspot, 28 Okt 2026)

| Indonesia | English | Catatan |
|---|---|---|
| Data terakhir, <tanggal> s.d. <jam> WIB | Latest data, <date> to <time> WIB | judul tabel Hotspot bila belum ada satu titik pun bertanggal hari ini; lewat pola di en.json; jam = deteksi terbaru hari itu |
| Belum ada data titik panas NASA FIRMS untuk hari ini. | No NASA FIRMS hotspot data for today yet. | catatan amber di bawah judul tabel Hotspot mundur dan caption grafik 7 hari kartu kawasan; keputusan pemilik 28 Okt 2026 (berhenti di situ); bukan "data satelit" karena Himawari-9 juga satelit dan datanya ada hari ini; tidak menyebut "FIRMS gangguan" dan tidak menulis "tidak ada api": nol berarti belum ada data |
| firespot hari ini / kemarin / <tanggal> | today's / yesterday's firespots / firespots <date> | label statistik di kartu hover wilayah, pasangan "titik hari ini / kemarin / <tanggal>" |
| Belum ada data titik panas NASA FIRMS untuk hari ini. Data terakhir <tanggal>: N titik panas terdeteksi | No NASA FIRMS hotspot data for today yet. Latest data <date>: N hotspots detected | judul pop-up Situasi bila hari mundur = sehari sebelum hari laporan; tanpa panah banding. Lebih lama: "Belum ada data titik panas NASA FIRMS sejak <tanggal> <jam> WIB" / "No NASA FIRMS hotspot data since ..." (tanpa angka) |
| Titik panas <tanggal> / Titik <tgl> / s.d. <jam> WIB / data terakhir s.d. <jam> WIB | Hotspots <date> / Hotspots <date> / up to <time> WIB / latest data up to <time> WIB | label gambar bagikan, tabel provinsi pop-up, kartu asap saat Hotspot mundur |
| Titik panas <tanggal> (data terakhir) / Umur deteksi | Hotspots <date> (latest data) / Detection age | judul legenda titik saat Hotspot mundur (lewat pola di en.json); "Umur deteksi" = baris popup titik, jam sejak SEKARANG (bukan sejak lintasan terakhir) |
| Api baru · Himawari-9, <tanggal> <jam awal>–<jam acuan> WIB | New fire · Himawari-9, <date> <start>–<reference time> WIB | keterangan legenda Api baru (jendela /api/himawari, 3 jam); dua tanggal bila melewati tengah malam |

## Popover "Lintasan satelit di atas Indonesia" (pil jam data di header karhutla, 28 Okt 2026)

| Indonesia | English | Catatan |
|---|---|---|
| Lintasan satelit di atas Indonesia | Satellite passes over Indonesia | judul popover; garis waktu 24 jam ke belakang + 12 jam ke depan (jam WIB) |
| Lintasan terakhir yang datanya sudah masuk: <hari> HH.MM WIB (<satelit>). Lintasan tertunda: N. | Latest pass whose data has been received: <day> HH.MM WIB (<satellite>). Delayed passes: N. | kalimat ringkas di atas grafik; <hari> = hari ini / kemarin |
| Data masuk / Data masuk, tanpa deteksi | Data received / Data received, no detections | satu istilah kedatangan: "masuk" = received (bukan "tiba/arrived"). "Tanpa deteksi" BUKAN "tidak ada api" (tiadanya deteksi bukan bukti padam); tooltip: ada deteksi sesudah lintasan itu tetapi tak satu pun di jendelanya |
| Tertunda | Delayed | label status lintasan yang belum punya deteksi masuk padahal batas tunggu (p90 bila terukur, kalau tidak jeda aman) lewat DAN data FIRMS sudah diambil lagi sesudah batas itu (sistem hanya mengambil tiap +-3 jam). Kunci ini juga label filter penerbangan di dampak.js (EN dulu "Pending", kini "Delayed", memang benar untuk penerbangan). Kode hanya tahu ada/tidaknya deteksi: rumusan netral "Belum ada deteksi yang masuk sesudah lintasan ini, padahal biasanya sudah siap." = No detections have come in since this pass, although the data is usually ready by now. JANGAN menulis "data belum masuk/dikirim" |
| Menunggu masuk | Awaiting receipt | belum ada deteksi masuk, jeda aman belum lewat ATAU belum ada pengambilan data sesudah jeda itu (bukan "menunggu kiriman"); di daftar Berikutnya ditandai "sudah lewat" = already passed |
| Perkiraan lintasan | Forecast pass | lintasan depan dari elemen orbit; S-NPP "tanpa perkiraan" = no forecast |
| Satelit / Lewat (WIB) / Data siap (WIB) / Batas tunggu (WIB) / Telat | Satellite / Pass (WIB) / Data ready (WIB) / Wait limit (WIB) / Late | kepala daftar Tertunda (Satelit, Lewat, Batas tunggu, Telat) dan Berikutnya (Satelit, Lewat, Data siap); "Data siap" tanpa "±". Batas tunggu = jam lintasan + ambang status (jeda_p90_menit bila ada, kalau tidak jeda_data_menit: untuk bawaan sama dengan jam siap lama); Telat = sekarang - batas tunggu, dibulatkan ke 0,5 jam, maksimal satu desimal ("sekitar 1 jam", "sekitar 1,5 jam", "kurang dari 0,5 jam") |
| telat sekitar 1,5 jam / telat kurang dari 0,5 jam | about 1.5 h late / less than 0.5 h late | telat dibulatkan ke 0,5 jam, tanpa lantai menit; jam siap tetap menit seperti kartu wilayah |
| Belum diambil lagi sejak <jam> WIB. / Data FIRMS terakhir diambil <jam> WIB. | Not fetched again since <time> WIB. / FIRMS data last fetched <time> WIB. | "diambil" = fetched (pengambilan FIRMS oleh sistem kita, bukan jam lintasan satelit); keterangan di bawah lintasan yang menunggu di daftar Berikutnya, di tooltip ("... Menunggu masuk. Belum diambil lagi sejak <jam> WIB." = "... Awaiting receipt. Not fetched again since <time> WIB.") dan di kaki popover |
| Lintasan satelit terakhir; diolah <tgl jam> WIB[ · N titik baru dari FIRMS NRT] | Latest satellite pass; processed <date time> WIB[ · N new hotspots from FIRMS NRT] | tooltip pil jam data (titik_live.js); N=1 "1 new hotspot"; bulan apa pun lewat pola (bukan kunci Oct saja); "titik" = hotspot |
| <satelit> lewat <jam> WIB, data biasanya siap <jam> WIB. | <satellite> passes <time> WIB, data usually ready <time> WIB. | kalimat kartu wilayah dipakai juga di tooltip lintasan perkiraan; sudah lewat dan belum masuk: "... Menunggu masuk." = "<satellite> passed ... Awaiting receipt." |
| <satelit> <jam> WIB: N deteksi / 1 deteksi | <satellite> <time> WIB: N detections / 1 detection | tooltip penanda; "deteksi" = baris FIRMS berkeyakinan sedang dan tinggi (S.kmin, sama dengan halaman metode), bukan lokasi unik; keyakinan rendah tidak dihitung tetapi tetap bukti data masuk |
| <satelit>, jam deteksi <jam> WIB: N deteksi | <satellite>, detection time <time> WIB: N detections | tooltip lintasan tanpa TLE (S-NPP): jam = median jam deteksi, BUKAN jam lintas |
| Sumber: elemen orbit CelesTrak, epoch <tanggal jam> sampai <jam> WIB. Dihitung di peramban. | Source: CelesTrak orbital elements, epoch <date time> until <time> WIB. Computed in your browser. | kaki; rentang epoch dari tle.json; kalimat lain: Status dari deteksi terakhir tiap satelit di NASA FIRMS; Jam lintasan = saat satelit paling dekat ke tengah Indonesia (perkiraan); Baris tanpa perkiraan memakai jam deteksi (median); Deteksi = baris FIRMS berkeyakinan sedang dan tinggi, bukan lokasi unik; Jeda aman VIIRS 3 jam, MODIS 2 jam (dari tle.json) |
