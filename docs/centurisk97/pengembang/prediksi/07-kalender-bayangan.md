# Kalender risiko dan model bayangan

Halaman ini menjelaskan kalender risiko, bulan rawan, dan model bayangan.

## Model bayangan (`scripts/prediksi/bayangan/model.py`)

Empat model dari lab adu model (2 November 2026) dipasang berdampingan: BNJ_B (banjir, logit 7 faktor), LSR_B (longsor, logit 32 fitur), CEX_B (cuaca ekstrem, logit dengan koefisien kab dan kejadian berjeda), KRH_B (karhutla, 5 titik VIIRS S-NPP atau lebih per kab-hari, logit ramping). Statusnya HIPOTESIS: dibekukan dan dinilai dengan label serta aturan yang sama dengan model lama; tidak tampil di tab Besok, tidak mengganti model lama, tidak ikut kalibrasi, dan peluangnya belum dikalibrasi. Selisih dengan lab sengaja ditulis di kepala berkas: sumber hujan beda (Open-Meteo titik pusat lawan CHIRPS rerata kab; persentil memakai kuantil CHIRPS), maks sel diganti proksi, KRH_B dilatih ulang tanpa fitur 90 hari. Model lama diganti hanya bila bayangan menang pada data baru.

## Kalender risiko dan bulan rawan

- **Kalender risiko** (`kalender.py`, dari logbook Pusdalops, dibangun di `data.yml`): peluang bulanan = jumlah tahun penuh yang bulannya punya sedikitnya satu kejadian dibagi jumlah tahun penuh; kab dengan kurang dari 5 kejadian ditandai sampel kecil. Referensi kedua; belum diuji terhadap prakiraan.
- **Bulan rawan** (`musim_rawan.py`, dari DIBI 2008 sampai 2025): bulan m menjadi puncak bila `a[m] >= 3` dan `a[m]/A >= 2/12`, dengan `a[m]` jumlah tahun yang bulan m-nya punya sedikitnya satu kejadian dan `A` jumlah semua `a[m]`; satuan layak bila `A >= 10`. Aturan ini ditetapkan sebelum uji balik dijalankan. Uji balik 2019 sampai 2025 tanpa kebocoran dengan aturan lulus L1 sampai L4: Brier model lebih kecil dari klimatologi dan dua persistensi; angkat dalam-satuan >= 1,5; menang di sedikitnya 5 dari 7 tahun; sedikitnya 30 satuan-bulan puncak teruji. Vonis 23 November 2026 (`musim_rawan.json`): banjir, karhutla, dan cuaca ekstrem lulus (BSS klimatologi sekitar 4 sampai 7%); longsor dan kekeringan tidak lulus. Yang lulus pun hanya berarti pola bulan berulang, bukan peluang kejadian. Pola dihitung dari DIBI versi hari ini sehingga uji cenderung terlalu menguntungkan. Skrip ini tidak berada dalam workflow terjadwal mana pun; dijalankan manual.
