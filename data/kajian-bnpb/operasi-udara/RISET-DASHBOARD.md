# RISET-DASHBOARD: benchmark pengembangan /operasi (11 Nov 2026)

Tiga riset paralel: (A) lembaga kebakaran dan aviasi, (B) produk dashboard operasi, (C) kajian akademik dan UX.
Tingkat bukti ditandai: **dibaca** = halaman diambil dan dibaca; **cuplikan** = hanya dari potongan hasil pencarian; **belum** = belum terverifikasi.
Angka dari vendor (mis. jumlah pesawat TracPlus, klaim hemat 30% SITA) adalah klaim vendor, bukan temuan independen.

## Usulan pengembangan berurut, dengan benchmark

| No | Usulan | Benchmark | Bukti |
| -- | ------ | --------- | ----- |
| 1 | **Tingkat siaga nasional 1-5 sebagai judul halaman**, terhubung ke aturan (mis. tingkat 4 = semua armada siaga, renlap dua kali sehari) | NIFC Preparedness Level 1-5 di IMSR harian; ASMC Alert Level 0-3; CIFFC | cuplikan (nifc.gov, asmc.asean.org) |
| 2 | **Akui lalu tuntaskan (acknowledge, resolve)** untuk Perlu tindakan, dengan batas waktu akui yang memunculkan ulang butir; jejak waktu per butir | PagerDuty triggered/acknowledged/resolved + ack timeout + timeline | dibaca (docs.pagerduty.com) |
| 3 | **Batas jumlah peringatan**: target sekitar 6 per jam per konsol, maksimal 12; lebih dari 10 dalam 10 menit = banjir, rancang ulang | EEMUA 191 / ISA-18.2 manajemen alarm; kajian kelelahan peringatan kesehatan (override 46-96%) | cuplikan (chemengonline, IChemE, JMIR) |
| 4 | **Ambang waspada dan kritis + ambang pulih**, supaya status tidak berkedip | Datadog monitors (warning, alert, recovery) | dibaca (docs.datadoghq.com) |
| 5 | **Keadaan "tidak ada data" eksplisit** per sumber dengan jam data terakhir (sudah sebagian: Pembaruan data) | Datadog no-data; Statuspage per komponen; CAL FIRE (angka basi tanpa cap waktu); BC Wildfire segar tiap 5 menit | dibaca (Datadog), cuplikan (lainnya) |
| 6 | **Tautan yang menyimpan tampilan**: seksi, tanggal, periode, base terpilih di URL untuk dibagikan lewat WA | Grafana URL variables, from/to, time window | dibaca (grafana.com) |
| 7 | **Catatan di grafik (anotasi)**: "SMB II grounded 3-7 Nov", "OMC Riau mulai" tampil di tren dan histori | Grafana annotations dengan tag dan rentang | dibaca (grafana.com) |
| 8 | **Strip kesiapan 90 hari per armada dan per base** | Statuspage uptime bar 90 hari | cuplikan (support.atlassian.com) |
| 9 | **Mode TV/kiosk `?tv=1`** dengan rotasi halaman dan segar otomatis; ukuran huruf menurut jarak pandang (minimal sekitar 16 menit busur) | Grafana kiosk + playlist; panduan font dinding layar | cuplikan |
| 10 | **Ekspor terjadwal** (CSV/XLSX/PDF) dengan kolom sama dengan tabel layar, dikirim harian | Samsara scheduled reports | cuplikan (kb.samsara.com) |
| 11 | **Satu pemilih memfilter semua**: pilih provinsi/base menyaring peta, tabel, dan angka sekaligus | ArcGIS Dashboards selectors + actions | cuplikan (doc.arcgis.com) |
| 12 | **KPI efektivitas sortie**: Interaction Percentage dan Probability of Success per tujuan jatuhan, dipisah water bombing dan retardan | USFS AFUE (272 kebakaran, lebih dari 5.000 jatuhan) | cuplikan (fs.usda.gov) |
| 13 | **Pelacakan wajib dan mutu data pelacak**: armada tanpa transponder, ID ganda, celah cakupan ADS-B | NAFC/ARENA (event logging nasional, kesalahan IMEI); Watch Duty (celah ADS-B) | cuplikan |
| 14 | **Tandai "kebakaran utama"** dengan ikon khusus | BC Wildfire "fire of note" | cuplikan |
| 15 | **Label jujur**: titik panas bukan api; hanya keyakinan tinggi yang memicu peringatan | SiPongi+, ASMC | cuplikan |
| 16 | **Musim ini lawan rata-rata 14 tahun atau tahun pilihan** | EFFIS Current Situation Viewer | cuplikan |
| 17 | **Zona pantau pribadi + notifikasi** (pimpinan memilih provinsi yang diikuti) | NSW Hazards Near Me | cuplikan |
| 18 | **Kerangka muat (skeleton) untuk halaman, spinner untuk satu kartu, bilah kemajuan di atas 10 detik** | NN/g response time dan skeleton screens | dibaca (nngroup.com) |
| 19 | **Status tidak hanya warna**; teks 4,5:1, grafik 3:1 | WCAG 1.4.1, 1.4.3 | dibaca (w3.org) |
| 20 | **Prakiraan dengan ketidakpastian** (rentang, bukan satu angka) untuk cuaca terbang 3-6 jam | Kale, Kay, Hullman (quantile dotplot); kajian eye-tracking Copernicus | cuplikan |

## Yang sudah diterapkan dan sejalan dengan riset

Pengecualian dulu (Perlu tindakan), angka dengan pembanding, satu layar ringkasan, kesegaran data per sumber, empty state jujur,
peta + daftar terhubung, legenda jadi saklar lapisan dengan sortie mati bawaan, rata-rata 7 hari di tren, bilah x/n, urutan terburuk dulu.

## Tidak ada pembanding langsung

Panel kontrak, renlap, dan cuaca terbang per base tidak ditemukan padanannya di dashboard lembaga yang diperiksa; rancangannya tetap dari kebutuhan pemilik.

## Sumber utama

- PagerDuty incidents: https://docs.pagerduty.com/incident-management/incidents/overview
- Datadog monitors: https://docs.datadoghq.com/monitors/configuration/
- Grafana URL variables: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard-url-variables/
- Grafana annotations: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/annotate-visualizations/
- NIFC IMSR: https://www.nifc.gov/fire-information
- USFS AFUE: https://www.fs.usda.gov/sites/default/files/2020-08/08192020_afue_final_report_0.pdf
- NAFC tracking: https://www.nafc.org.au/wp-content/uploads/2017/01/NAFC-Aircraft-Tracking-and-Event-Logging.pdf
- Watch Duty flight tracking: https://support.watchduty.org/hc/en-us/articles/18709003342861-How-does-flight-tracking-work
- BC Wildfire dashboard: https://blog.gov.bc.ca/bcwildfire/?p=15127
- EFFIS: https://forest-fire.emergency.copernicus.eu/applications
- ASMC alerts: https://asmc.asean.org/asmc-alerts/
- SiPongi panduan: https://sipongi.menlhk.go.id/assets/file/Panduan-Sipongi-Mobile.pdf
- NN/g: https://www.nngroup.com/articles/response-times-3-important-limits/ , https://www.nngroup.com/articles/skeleton-screens/ , https://www.nngroup.com/articles/dashboards-preattentive/
- WCAG: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- EEMUA/ISA alarm: https://www.chemengonline.com/alarm-management-numbers/
- Lufthansa NetLine/Ops: https://lhsystems.com/product-brands/netline/netlineops
