# Glosarium EN / ID — Pantau Bencana

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
