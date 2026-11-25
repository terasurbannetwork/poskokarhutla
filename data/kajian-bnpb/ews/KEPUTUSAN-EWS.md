# KEPUTUSAN-EWS: Panel peringatan dini sensor dan CCTV untuk banjir dan gunung api

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Pemilik menunjukkan tiga dasbor EWS (23 Nov 2026): EWS banjir geodashboard.io, EWS banjir Kota Banda Aceh (`ews.bandaacehkota.go.id`), dan MHEWS Gunung Ibu BNPB (`mhews.bnpb.go.id/gunung/ibu/`). Ketiganya memperlihatkan hal yang belum ada di sistem kita dalam satu layar: nilai sensor terkini per pos (tinggi muka air, curah hujan, getaran), status alat (baterai, suhu, terputus), CCTV langsung, grafik seri waktu, dan pemberitahuan saat sensor tidak mengirim data.

Bahan yang sudah ada di repo tetapi belum tampil sebagai panel EWS:

- Rute sensor milik sendiri `POST /api/sensor/baca`, `POST /api/sensor/lapor`, `GET /api/sensor/status` (`src/sensor.js`, migrasi `0089_sensor.sql`), firmware dan gateway di `sensor/`. Status hanya untuk staf; ambang terlewati masuk antrean `pengingat`, tidak menjadi peringatan publik.
- Pos tinggi air SIHKA Kementerian PU di peta `/banjir` (`public/banjir/pos_air.js`, `public/banjir/data/pos_sungai.json`).
- Level resmi dan kegempaan 24 jam MAGMA PVMBG (`scripts/gunungapi/magma.py`, `public/gunungapi/data/kegempaan.json`).

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 23 Nov 2026: "EWS untuk banjir dan gunung api saja". Panel EWS dipasang di halaman bencananya (`/banjir`, `/gunungapi`), tidak ada halaman `/ews` tersendiri dan tidak untuk bencana lain. |
| K2 | 23 Nov 2026: tiru isi tiga dasbor rujukan di atas ("Sama kaya gini bisa ditiru ga?"). Yang ditiru isi dan fungsinya, bukan merek, warna, atau tata letak gelapnya; tampilan mengikuti sistem desain repo. |
| K3 | 11 Nov 2026 (berlaku semua proyek): tidak ada data dummy. Panel tanpa sumber asli tidak tampil; tidak ada sensor contoh. |
| K4 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu mesin panel (`public/inti/pantau_alat.js` + `pantau_alat.css`) dipakai dua halaman, dinyalakan lewat kunci registri baru `kemampuan.alat` di `public/bencana.json`. Nama `ews` TIDAK dipakai: `kemampuan.ews`, `src/ews.js`, dan `public/ews_tindakan.js` sudah milik langganan peringatan email dan tangga tindakan (paket Paritas F-14, F-15). Tanpa salinan per bencana. | Aturan Paritas Bencana: dibangun sekali di inti; nama tidak bentrok. |
| D2 | Satu bentuk data pos untuk semua sumber: `{id, sumber, jenis, nama, lat, lon, kab, nilai:{...}, satuan, waktu, ambang, tingkat, alat:{baterai, suhu}, basi}`. Adapter per sumber mengisi bentuk ini. | Layar tidak peduli asal data; sumber baru cukup menambah adapter. |
| D3 | Tingkat dari ambang kita ditulis "Normal", "Waspada", "Siaga", "Awas"; pos basi "Tidak ada data terkini". Status resmi sumber luar (SIHKA "Siaga 3/2/1", level PVMBG I-IV) ditulis apa adanya dengan nama pengelolanya, tidak dipetakan ulang (lihat Q7). Kata "Aman" tidak pernah dipakai (dasbor rujukan memakainya). | Aturan repo: tidak pernah menulis "aman"; status resmi bukan milik kita untuk diterjemahkan. |
| D4 | Sensor yang lewat batas basi tampil abu dengan label "Tidak ada data terkini" dan waktu terakhirnya; nilainya tidak dihapus, tidak dijadikan 0. | Dasbor Gunung Ibu menampilkan 0 untuk sensor putus; itu menyesatkan. Kosong tidak pernah jadi nol. |
| D5 | Ambang hanya dari sumber yang tercatat: ambang alat di `sensor_alat.ambang`, ambang resmi pengelola SIHKA, level resmi PVMBG. Tanpa ambang tercatat, pos hanya menampilkan nilai tanpa warna tingkat. | Ambang karangan adalah klaim palsu. |
| D6 | Bacaan sensor belum diverifikasi manusia, jadi ambang terlewati tetap masuk antrean `pengingat` (perilaku `src/sensor.js` sekarang). Panel tidak memicu peringatan publik atau notifikasi PWA sendiri. | Sama dengan keputusan kontrak sensor L1. |
| D7 | CCTV hanya ditanam dari aliran yang izinnya tertulis. Pemutar HLS memakai elemen `<video>` bawaan bila peramban mendukung HLS (Safari, Chrome Android); selain itu `hls.js` disalin ke `public/vendor/hls/` (bukan CDN) dan dimuat hanya saat panel CCTV dibuka. | Aliran milik pihak lain; biaya muat halaman dijaga; tanpa ketergantungan CDN luar. |
| D8 | Grafik seri waktu berupa SVG tulisan tangan dengan pola `polyline` yang sudah dipakai `public/inti/profil_wilayah.js` (repo belum punya komponen grafik bersama), interaktif dengan tooltip. | Selera pemilik: tiap grafik interaktif; tanpa pustaka grafik baru. |
| D9 | Tidak ada tabel kejadian baru. Bacaan sensor tetap di `sensor_baca`. Seri sumber luar di-cache di prefiks `ews/` pada binding R2 `MEDIA` (bucket `poskokarhutla-foto`) oleh Worker, tidak di D1. | Kuota baca D1 Free 5 juta per hari pernah menjatuhkan situs. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Data sensor dan CCTV dari dasbor vendor (geodashboard.io, Banda Aceh) dan MHEWS BNPB boleh diambil? Ketiganya memakai backend Directus (`/panel/items/*`) dan aliran HLS `restream2.blitztechnology.tech`. Pengambilan langsung tanpa izin tidak dilakukan. | **[BAWAAN SEMENTARA]** tidak diambil. Usulan langkah (belum dilakukan): pemilik meminta akses resmi MHEWS ke Pusdatinkom BNPB, Banda Aceh ke BPBD Kota Banda Aceh, geodashboard ke vendornya. | EW-06, EW-07, EW-08 |
| Q2 | Panel tampil untuk publik atau hanya staf? Akun BPBD boleh melihat sensor sendiri di wilayahnya? (`src/sensor.js` sekarang hanya mengizinkan pusdalops, koordalops, pimpinan.) | **[BAWAAN SEMENTARA]** pos SIHKA dan level PVMBG tetap publik seperti sekarang; sensor milik sendiri dan sumber berizin hanya untuk tiga peran staf itu sampai pemilik memutuskan, karena bacaannya belum diverifikasi; BPBD belum. | EW-04 |
| Q3 | Sensor gunung api milik sendiri: jenis apa? Tabel `sensor_alat.jenis` sekarang hanya tma, hujan, longsor, gambut, gas, gateway. | **[BAWAAN SEMENTARA]** tambah `geofon` (kecepatan getaran mm/s, frekuensi Hz) lewat migrasi baru; tinggi muka air lahar memakai `tma`. Belum ada alat terpasang. | EW-03 |
| Q4 | Batas basi per jenis sensor? | **[BAWAAN SEMENTARA]** tma dan hujan 30 menit, geofon 10 menit, sumber luar mengikuti jadwal sumbernya (SIHKA sesuai aturan "lama" di `pos_air.js`). Catatan sadar: `GET /api/sensor/status` lama tetap memakai `BASI` 1 jam (`src/sensor.js`) dan tidak diubah; panel memakai batas per jenis ini. | tidak menahan |
| Q7 | Status resmi SIHKA "Siaga 3/2/1" perlu disejajarkan dengan Waspada/Siaga/Awas? (`public/ews_tindakan.js` memetakan 1=Waspada, 2=Siaga, 3=Awas, sedangkan Siaga 1 PU adalah yang tertinggi.) | **[BAWAAN SEMENTARA]** tidak dipetakan; ditulis apa adanya dengan nama pengelola, warna mengikuti `pos_air.js` yang sudah tayang. | tidak menahan |
| Q8 | Interval kirim alat sendiri per jenis? Belum tertulis di firmware atau README sensor (hanya batas laju `LAJU_ALAT`). | **[BAWAAN SEMENTARA, HIPOTESIS]** 5 menit untuk tma dan hujan, 1 menit ringkasan geofon; dipakai untuk jumlah titik grafik dan deteksi celah. | tidak menahan |
| Q5 | Kotak "Langkah cepat" (pemantauan, peringatan, keadaan siaga) seperti dasbor rujukan ikut? | **[BAWAAN SEMENTARA]** ya, isinya diambil dari tangga tindakan yang sudah ada (`public/ews_tindakan.js`, entri banjir dan gunung api), tanpa teks baru karangan. | EW-09 |
| Q6 | Grafik getaran geofon perlu seri penuh (puluhan ribu titik) atau ringkasan per menit? | **[BAWAAN SEMENTARA]** ringkasan per menit (maks, rata-rata) 24 jam terakhir. | EW-08 |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

- Q2: bacaan sensor sendiri **boleh tampil publik** (bukan hanya tiga peran staf).
