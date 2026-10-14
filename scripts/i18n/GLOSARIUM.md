# Glosarium EN / ID — Pantau Bencana

Satu istilah, satu padanan, di semua tab, PDF, dan gambar bagikan. Kamus: `public/i18n/en.json`.
Menambah entri: jalankan `node scripts/i18n/kumpul.mjs`, lihat `scripts/i18n/laporan.json` → `hilang`, tulis padanan memakai glosarium ini.
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
| konsesi (sawit, HTI, HPH, tambang) | concession (oil palm, pulpwood/HTI, logging/HPH, mining) | |
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
| status siaga darurat | emergency alert status | penetapan pemerintah daerah |
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
- Angka dan tanggal diformat otomatis (en-GB: 1,234.5 · 14 Oct 21:20 WIB).
- Judul berita, isi laporan warga, nama tempat, nama perusahaan, dan isi pesan TIDAK diterjemahkan.
