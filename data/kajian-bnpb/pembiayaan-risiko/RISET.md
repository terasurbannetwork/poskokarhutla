# RISET: Pembiayaan risiko per kejadian

## 1. Konteks luar (rujukan, bukan data sistem)

| Hal | Isi | Sumber |
| --- | --- | --- |
| Pooling Fund Bencana (PFB) | Dikelola BPDLH; didukung proyek investasi Bank Dunia sekitar USD 500 juta dan hibah Global Shield sekitar USD 14 juta. | https://fiskal.kemenkeu.go.id/parb/en/pfb-2/ dan cerita Global Shield di financialprotectionforum.org (URL lengkap dan tanggal akses belum dicatat: belum diverifikasi, diakses 15 Nov 2026 hanya lewat ringkasan riset) |
| Asuransi BMN dengan skema PFB | Diluncurkan Februari 2026. | finansial.bisnis.com, 20 Sep 2025 (URL lengkap belum dicatat, belum diverifikasi) |
| Asuransi parametrik gempa dan banjir | Masih dijajaki menurut sumber luar; belum ada skema berlaku yang ditemukan riset ini. Apakah pemilik mengenal satu skema adalah Q4 (bawaan: tidak diketahui). | belum ada polis publik yang ditemukan; belum diverifikasi |
| Cadangan fiskal bencana | OJK Juni 2025: cadangan sekitar Rp4 triliun lawan kebutuhan sekitar Rp22 triliun. | finansial.bisnis.com, 12 Jun 2025, artikel OJK (URL lengkap belum dicatat, belum diverifikasi) |

Angka luar di atas tidak masuk sistem sebagai data. Tiap angka resmi yang dipakai layar harus dimasukkan staf berwenang dengan sumber (D4).

## 2. Yang sudah ada di repo (diukur 15 Nov 2026)

| Hal | Berkas | Keterangan |
| --- | --- | --- |
| Korban jiwa gempa, bukan rupiah | `scripts/gempa/pager.py:1`, `public/gempa/pager.js` | Keluaran `jiwa`, `bawah`, `atas`, `kelas` dari koefisien empiris USGS; tidak ada model kerugian ekonomi. |
| Nilai kerusakan Jitupasna | `src/siklus_hitung.js:95` `nilaiKerusakan` | unit x harga `sk_harga`; null berstatus "menunggu" bila harga tidak ada, tidak pernah 0. |
| Nilai kerugian Jitupasna | `src/siklus_hitung.js:119` `nilaiKerugian` | arus rupiah x bulan; baris tanpa angka dibuang dan menandai menunggu. |
| Harga satuan | `migrations/0123_sk_pulih.sql:5` `sk_harga` | kolom `yakin`: `asumsi-kebijakan` atau `resmi`. |
| Dana Siap Pakai per permohonan | `src/meja_spek.js:156-175` | nilai diajukan, disetujui, cair, realisasi; tanggal; status diajukan, disetujui, cair, spj, selesai, ditolak; tanda lapor dan SPJ terlambat (Perban 4/2020 Pasal 21). |
| Paparan per bangunan | `public/siklus/paparan.js` | bahan calon model exposure x vulnerability (Q3). |

Yang tidak ada: saldo DSP, saldo PFB, pagu APBN atau DIPA bencana, polis atau pemicu parametrik, model kerugian ekonomi. Perancangan ini tidak mengisi kekosongan itu dengan angka karangan.

## 3. Praktik yang ditiru

| Praktik | Pelajaran untuk sistem ini |
| --- | --- |
| Kerangka pembiayaan risiko bencana (tingkat risiko, sumber dana berlapis: cadangan, kontinjensi, transfer risiko) | Tampilkan dana per lapis, bukan satu total. |
| Pemicu parametrik (indeks fisik, misalnya magnitudo dan jarak, atau curah hujan) | Pemicu hanya sah bila tertulis di polis; sistem hanya membaca dan membandingkan, tidak menetapkan. |
| Estimasi kerugian awal (PAGER ekonomi, katalog kerugian historis) | Model awal selalu rentang lebar dan wajib uji balik terhadap kejadian lalu. |

Koefisien kerugian ekonomi USGS PAGER: belum diverifikasi apakah dipublikasikan untuk Indonesia; di repo hanya ada model jiwa.
